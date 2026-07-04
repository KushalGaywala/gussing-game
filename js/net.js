/*
 * net.js — tiny WebRTC transport for the multiplayer "Host a game" mode.
 *
 * Topology: a host-authoritative STAR. The HOST opens a room and every CLIENT
 * holds exactly one WebRTC data channel to the host. The host is the single
 * source of truth for game state; clients send intents (join / ready / vote)
 * and render whatever the host broadcasts.
 *
 * No server to deploy: signaling (the initial SDP/ICE handshake only) rides the
 * free public PeerJS broker; the actual game data flows peer-to-peer over the
 * data channels. Google's public STUN helps NAT traversal. Same-Wi-Fi play is
 * the most reliable path; restrictive/symmetric NATs without a TURN relay may
 * fail to connect (an accepted limitation of a zero-infra design).
 *
 * This module knows nothing about the game — it only moves JSON objects and
 * tracks who is connected. All game logic lives in js/app.js.
 *
 * Public API (window.Net):
 *   Net.supported()                         -> boolean (WebRTC + PeerJS present)
 *   Net.host({ onReady(code), onMessage(peerId,msg), onLeave(peerId), onError(e) })
 *   Net.join(code, { onOpen(), onMessage(msg), onReconnecting(n), onLost(), onError(e) })
 *   Net.broadcast(msg)                      -> host: send to every client
 *   Net.send(peerId, msg)                   -> host: send to one client
 *   Net.kick(peerId)                        -> host: remove a client
 *   Net.sendHost(msg)                       -> client: send to the host
 *   Net.close()                             -> host: notify + tear down room
 *   Net.leave()                             -> client: leave the room
 *   Net.roomCode / Net.myId / Net.isHost
 */
(function () {
  'use strict';

  // A short namespace prefix keeps our human-friendly room codes from colliding
  // with other apps that share the same public broker id-space. Bump if the wire
  // protocol ever changes incompatibly.
  var NS = 'gujimp1-';
  // Unambiguous alphabet (no 0/O/1/I/L) so a code is easy to read aloud/type.
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var CODE_LEN = 4;

  var HEARTBEAT_MS = 4000;   // host pings each client this often
  var TIMEOUT_MS = 14000;    // ...and drops one that's been silent this long
  var MAX_RECONNECT = 6;     // client reconnect attempts before giving up

  // Public STUN only. (TURN would need infra/credentials we deliberately avoid.)
  var ICE = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  var cryptoObj = window.crypto || window.msCrypto || null;
  function randCode() {
    var s = '', i;
    if (cryptoObj && cryptoObj.getRandomValues) {
      var a = new Uint32Array(CODE_LEN);
      cryptoObj.getRandomValues(a);
      for (i = 0; i < CODE_LEN; i++) s += ALPHABET[a[i] % ALPHABET.length];
    } else {
      for (i = 0; i < CODE_LEN; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return s;
  }
  function randToken() {
    var s = '', i;
    if (cryptoObj && cryptoObj.getRandomValues) {
      var a = new Uint32Array(4);
      cryptoObj.getRandomValues(a);
      for (i = 0; i < a.length; i++) s += a[i].toString(36);
    } else {
      s = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    return s;
  }

  function makePeer(id) {
    // PeerJS ships with the free cloud broker preconfigured; we only override ICE.
    return new window.Peer(id, { debug: 1, config: { iceServers: ICE } });
  }

  function normErr(err) {
    return { type: (err && err.type) || 'unknown', message: (err && err.message) || String(err) };
  }

  // ---------------- module state ----------------
  var role = null;         // 'host' | 'client' | null
  var peer = null;
  var handlers = {};
  var roomCode = null;
  var myId = null;
  var manualLeave = false;

  // host-only
  var conns = {};          // remoteId -> { conn, lastSeen }
  var hbTimer = null, wdTimer = null;

  // client-only
  var hostId = null;
  var conn = null;         // our single connection to the host
  var reconnectTries = 0;
  var idRetries = 0;       // fresh-id retries when our peer id is already taken

  function emit(name) {
    var fn = handlers['on' + name.charAt(0).toUpperCase() + name.slice(1)];
    if (typeof fn === 'function') fn.apply(null, Array.prototype.slice.call(arguments, 1));
  }

  function safeSend(c, msg) {
    try { if (c && c.open) c.send(msg); } catch (e) { /* channel closing */ }
  }

  function reset() {
    stopHeartbeat();
    if (peer) { try { peer.destroy(); } catch (e) { /* ignore */ } }
    peer = null; conn = null; conns = {}; hostId = null;
    roomCode = null; myId = null; role = null;
    reconnectTries = 0; idRetries = 0;
  }

  // ================= HOST =================
  function host(cbs) {
    reset();
    role = 'host';
    handlers = cbs || {};
    manualLeave = false;
    tryHost(0);
    syncPublics();
  }

  function tryHost(attempt) {
    roomCode = randCode();
    peer = makePeer(NS + roomCode);
    syncPublics();

    peer.on('open', function (id) {
      myId = id;
      startHeartbeat();
      syncPublics();
      emit('ready', roomCode);
    });
    peer.on('connection', function (c) { wireHostConn(c); });
    peer.on('disconnected', function () {
      // Lost the broker link (existing channels may still work, but no new joins).
      if (!manualLeave) { try { peer.reconnect(); } catch (e) { /* ignore */ } }
    });
    peer.on('error', function (err) {
      var e = normErr(err);
      if (e.type === 'unavailable-id' && attempt < 6) {
        // room code already taken on the broker — pick another and retry
        try { peer.destroy(); } catch (x) { /* ignore */ }
        tryHost(attempt + 1);
        return;
      }
      if (e.type === 'peer-unavailable') return; // a client vanished mid-handshake
      emit('error', e);
    });
  }

  function wireHostConn(c) {
    // Register immediately so a reply sent while handling the client's very first
    // message never finds a missing entry. (A 'data' event implies the channel is
    // open, so safeSend's c.open check still gates actual sends.)
    conns[c.peer] = { conn: c, lastSeen: Date.now() };
    c.on('open', function () {
      var rec = conns[c.peer];
      if (rec) rec.lastSeen = Date.now(); else conns[c.peer] = { conn: c, lastSeen: Date.now() };
    });
    c.on('data', function (data) {
      var rec = conns[c.peer];
      if (rec) rec.lastSeen = Date.now();
      if (!data || typeof data !== 'object') return;
      if (data.t === '__ping') { safeSend(c, { t: '__pong' }); return; }
      if (data.t === '__pong') return;
      emit('message', c.peer, data);
    });
    c.on('close', function () { dropConn(c.peer); });
    c.on('error', function () { /* leave to the watchdog if it goes silent */ });
  }

  function dropConn(id) {
    var rec = conns[id];
    if (!rec) return;
    delete conns[id];
    try { rec.conn.close(); } catch (e) { /* ignore */ }
    emit('leave', id);
  }

  function startHeartbeat() {
    stopHeartbeat();
    hbTimer = setInterval(function () {
      for (var id in conns) safeSend(conns[id].conn, { t: '__ping' });
    }, HEARTBEAT_MS);
    wdTimer = setInterval(function () {
      var now = Date.now(), id;
      for (id in conns) {
        if (now - conns[id].lastSeen > TIMEOUT_MS) dropConn(id);
      }
    }, 2000);
  }
  function stopHeartbeat() {
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
    if (wdTimer) { clearInterval(wdTimer); wdTimer = null; }
  }

  function broadcast(msg) { for (var id in conns) safeSend(conns[id].conn, msg); }
  function send(id, msg) { var rec = conns[id]; if (rec) safeSend(rec.conn, msg); }
  function kick(id) {
    var rec = conns[id];
    if (!rec) return;
    safeSend(rec.conn, { t: 'kicked' });
    setTimeout(function () { dropConn(id); }, 80);
  }
  function close() {
    manualLeave = true;
    broadcast({ t: 'host-left' });
    setTimeout(reset, 100);
  }

  // ================= CLIENT =================
  function join(code, cbs) {
    reset();
    role = 'client';
    handlers = cbs || {};
    manualLeave = false;
    reconnectTries = 0;
    idRetries = 0;
    roomCode = String(code || '').trim().toUpperCase();
    hostId = NS + roomCode;
    syncPublics();

    // A stable per-tab peer id lets a refresh or a dropped channel rejoin the
    // same seat (the host recognises the returning id).
    var stored = null;
    try { stored = sessionStorage.getItem('mp-peer-id'); } catch (e) { /* ignore */ }
    makeClientPeer(stored || (NS + 'p-' + randToken()));
  }

  // Create the client's broker peer and wire its lifecycle. Extracted so we can
  // transparently recreate it with a fresh id if the chosen id is already taken.
  function makeClientPeer(id) {
    peer = makePeer(id);

    // 'open' fires on the initial broker connection AND again after every
    // peer.reconnect(), so it's the single place that (re)establishes our data
    // channel to the host — on first join and on every recovery.
    peer.on('open', function (pid) {
      myId = pid;
      try { sessionStorage.setItem('mp-peer-id', pid); } catch (e) { /* ignore */ }
      syncPublics();
      openConn();
    });
    peer.on('disconnected', function () {
      if (manualLeave) return;
      if (reconnectTries >= MAX_RECONNECT) { emit('lost'); return; }
      try { peer.reconnect(); } catch (e) { /* ignore */ } // success re-fires 'open' → openConn
    });
    peer.on('error', function (err) {
      var e = normErr(err);
      if (e.type === 'unavailable-id') {
        // Our id is already registered on the broker — usually a stale peer left
        // over from a previous join in this same tab. Drop it and retry with a
        // brand-new id so joining can't get stuck in "connecting".
        try { sessionStorage.removeItem('mp-peer-id'); } catch (x) { /* ignore */ }
        if (!manualLeave && idRetries < 3) {
          idRetries++;
          try { peer.destroy(); } catch (z) { /* ignore */ }
          makeClientPeer(NS + 'p-' + randToken());
        } else {
          emit('error', e);
        }
        return;
      }
      if (e.type === 'peer-unavailable') {
        // host code not found / host offline — only surface on the initial attempt
        if (reconnectTries === 0) emit('error', { type: 'no-room', message: e.message });
        return;
      }
      emit('error', e);
    });
  }

  function openConn() {
    if (!peer || peer.destroyed || manualLeave) return;
    if (conn && conn.open) return;                 // already connected
    if (conn) { try { conn.close(); } catch (e) { /* ignore */ } }
    conn = peer.connect(hostId, { serialization: 'json', reliable: true });
    var opened = false;
    conn.on('open', function () {
      opened = true;
      reconnectTries = 0;
      emit('open');
    });
    conn.on('data', function (data) {
      if (!data || typeof data !== 'object') return;
      if (data.t === '__ping') { safeSend(conn, { t: '__pong' }); return; }
      if (data.t === '__pong') return;
      emit('message', data);
    });
    conn.on('close', function () { if (!manualLeave) retryConn(); });
    conn.on('error', function () { if (!manualLeave && !opened) retryConn(); });
  }

  // The data channel dropped. If the broker link is also down, reconnect it
  // (which re-fires 'open' → openConn); otherwise just re-open the channel.
  function retryConn() {
    if (manualLeave) return;
    if (reconnectTries >= MAX_RECONNECT) { emit('lost'); return; }
    reconnectTries++;
    emit('reconnecting', reconnectTries);
    var delay = Math.min(1000 * reconnectTries, 4000);
    setTimeout(function () {
      if (manualLeave || !peer || peer.destroyed) return;
      if (peer.disconnected) { try { peer.reconnect(); } catch (e) { /* ignore */ } }
      else openConn();
    }, delay);
  }

  function sendHost(msg) { safeSend(conn, msg); }
  function leave() {
    manualLeave = true;
    if (role === 'client') safeSend(conn, { t: 'leave' });
    reset();
  }

  // keep the read-only public fields fresh
  function syncPublics() {
    api.roomCode = roomCode;
    api.myId = myId;
    api.isHost = role === 'host';
  }

  function supported() {
    return !!(window.Peer &&
      (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection));
  }

  var api = {
    supported: supported,
    host: host, join: join,
    broadcast: broadcast, send: send, kick: kick, close: close,
    sendHost: sendHost, leave: leave,
    roomCode: null, myId: null, isHost: false,
  };
  window.Net = api;
})();
