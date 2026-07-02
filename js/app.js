/*
 * Imposter game — main application logic.
 * Screen router + game state machine + hold-to-peek card + timer + persistence.
 */
(function () {
  'use strict';

  // ---------- small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function showScreen(name) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // ---------- setup config state ----------
  const config = {
    players: 4,
    imposters: 1,
    category: 'all',
    names: [],
  };
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;

  // ---------- current game state ----------
  let game = null; // { word, category, roles[], names[], index }

  // ================= NAVIGATION =================
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const dest = nav.getAttribute('data-nav');
      if (dest === 'history') renderHistory();
      showScreen(dest);
      return;
    }
    const quit = e.target.closest('[data-quit]');
    if (quit) {
      if (!game || confirm('રમત છોડવી છે? (Quit this game?)')) {
        stopTimer();
        game = null;
        showScreen('home');
      }
    }
  });

  // ================= SETUP SCREEN =================
  function clampImposters() {
    const maxImp = Math.max(1, config.players - 1);
    if (config.imposters > maxImp) config.imposters = maxImp;
    if (config.imposters < 1) config.imposters = 1;
  }

  function renderSetup() {
    $('#val-players').textContent = config.players;
    $('#val-imposters').textContent = config.imposters;
    const maxImp = Math.max(1, config.players - 1);
    $('#imposter-hint').textContent =
      `૧ થી ${maxImp} સુધી (${config.players} ખેલાડીઓ માટે) · 1–${maxImp} allowed`;
    renderNameInputs();
  }

  function renderNameInputs() {
    const wrap = $('#name-inputs');
    wrap.innerHTML = '';
    for (let i = 0; i < config.players; i++) {
      const inp = document.createElement('input');
      inp.className = 'input';
      inp.type = 'text';
      inp.placeholder = `ખેલાડી ${i + 1} (Player ${i + 1})`;
      inp.value = config.names[i] || '';
      inp.dataset.idx = i;
      inp.addEventListener('input', () => { config.names[i] = inp.value.trim(); });
      wrap.appendChild(inp);
    }
  }

  function buildCategorySelect() {
    const sel = $('#sel-category');
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'બધી શ્રેણી (All categories)';
    sel.appendChild(optAll);
    Object.keys(CATEGORIES).forEach((key) => {
      const c = CATEGORIES[key];
      const o = document.createElement('option');
      o.value = key;
      o.textContent = `${c.gu} (${c.en})`;
      sel.appendChild(o);
    });
    sel.value = config.category;
    sel.addEventListener('change', () => { config.category = sel.value; });
  }

  // steppers
  $$('[data-stepper]').forEach((stepper) => {
    stepper.addEventListener('click', (e) => {
      const b = e.target.closest('[data-delta]');
      if (!b) return;
      const delta = parseInt(b.getAttribute('data-delta'), 10);
      const kind = stepper.getAttribute('data-stepper');
      if (kind === 'players') {
        config.players = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, config.players + delta));
        config.names.length = config.players; // trim extra names
        clampImposters();
      } else {
        config.imposters += delta;
        clampImposters();
      }
      renderSetup();
    });
  });

  // ================= PRESETS =================
  async function refreshPresetSelect() {
    const sel = $('#sel-preset');
    const presets = await DB.getPresets();
    sel.innerHTML = '<option value="">પ્રીસેટ પસંદ કરો… (Load preset)</option>';
    presets.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.name} — ${p.players} ખેલાડી · ${p.imposters} ઈમ્પોસ્ટર`;
      sel.appendChild(o);
    });
    sel._presets = presets;
  }

  $('#btn-save-preset').addEventListener('click', async () => {
    const name = $('#preset-name').value.trim();
    if (!name) { toast('પ્રીસેટનું નામ લખો (Enter a name)'); return; }
    await DB.addPreset({
      name,
      players: config.players,
      imposters: config.imposters,
      category: config.category,
      names: config.names.slice(0, config.players),
    });
    $('#preset-name').value = '';
    await refreshPresetSelect();
    toast('પ્રીસેટ સાચવ્યું (Preset saved)');
  });

  $('#btn-load-preset').addEventListener('click', () => {
    const sel = $('#sel-preset');
    const id = parseInt(sel.value, 10);
    if (!id || !sel._presets) return;
    const p = sel._presets.find((x) => x.id === id);
    if (!p) return;
    config.players = p.players;
    config.imposters = p.imposters;
    config.category = p.category || 'all';
    config.names = (p.names || []).slice();
    config.names.length = config.players;
    clampImposters();
    $('#sel-category').value = config.category;
    renderSetup();
    toast('પ્રીસેટ લોડ થયું (Preset loaded)');
  });

  // ================= START GAME =================
  $('#btn-start').addEventListener('click', () => {
    // pick vocab pool
    let pool = VOCAB;
    if (config.category !== 'all') {
      pool = VOCAB.filter((w) => w.cat === config.category);
    }
    if (!pool.length) { toast('આ શ્રેણીમાં શબ્દ નથી'); return; }

    const word = pool[Math.floor(Math.random() * pool.length)];

    // assign roles: true = imposter
    const roles = new Array(config.players).fill(false);
    const idxs = shuffle([...Array(config.players).keys()]).slice(0, config.imposters);
    idxs.forEach((i) => { roles[i] = true; });

    const names = [];
    for (let i = 0; i < config.players; i++) {
      names.push((config.names[i] && config.names[i].trim()) || `ખેલાડી ${i + 1}`);
    }

    game = { word, category: config.category, roles, names, index: 0 };
    startRevealFor(0);
    showScreen('reveal');
  });

  // ================= REVEAL (pass the phone) =================
  function startRevealFor(i) {
    game.index = i;
    $('#pass-instruction').textContent = i === 0
      ? 'ફોન આ ખેલાડીને આપો (Pass the phone to)'
      : 'હવે ફોન આગળ આપો (Pass the phone to)';
    $('#pass-player').textContent = game.names[i];
    $('#turn-count').textContent = `${i + 1} / ${game.names.length}`;
    renderRevealDots();
    populatePeekContent();
    resetPeekCover();
    $('#cover-seen').hidden = true;

    const next = $('#btn-next-player');
    next.disabled = true;
    const last = i >= game.names.length - 1;
    $('#btn-next-label').innerHTML = last
      ? 'ચર્ચા શરૂ કરો<span class="en">Start discussion</span>'
      : 'આગળ આપો<span class="en">Next player</span>';
  }

  function renderRevealDots() {
    const wrap = $('#reveal-dots');
    wrap.innerHTML = '';
    for (let k = 0; k < game.names.length; k++) {
      const d = document.createElement('span');
      d.className = 'dot-i' + (k < game.index ? ' done' : k === game.index ? ' cur' : '');
      wrap.appendChild(d);
    }
  }

  function populatePeekContent() {
    const i = game.index;
    const content = $('#peek-content');
    if (game.roles[i]) {
      content.innerHTML = `
        <div class="imposter-card">
          <div class="impo-mark"><svg class="icon icon-l"><use href="#i-mask"/></svg></div>
          <p class="impo-title">તમે ઈમ્પોસ્ટર છો</p>
          <p class="impo-sub">શબ્દ જાણ્યા વગર બહાનું બનાવો!<br/><span class="en">You are the imposter — bluff it!</span></p>
        </div>`;
    } else {
      const c = CATEGORIES[game.word.cat];
      content.innerHTML = `
        <div>
          <span class="word-cat">${c ? c.gu + ' · ' + c.en : ''}</span>
          <p class="word-gu">${game.word.gu}</p>
          <p class="word-en">(${game.word.en})</p>
        </div>`;
    }
  }

  $('#btn-next-player').addEventListener('click', () => {
    if (!game) return;
    if (game.index >= game.names.length - 1) {
      showScreen('play');
      prepPlayScreen();
    } else {
      startRevealFor(game.index + 1);
    }
  });

  // ---- hold-to-peek card ----
  // The secret sits under an opaque cover. Holding the cover and pulling it
  // down slides it aside; releasing snaps it back over the word. The word is
  // therefore only ever visible mid-gesture — anyone nearby can see when a
  // player peeks, so the phone can be passed around safely.
  const stack = $('#peek-stack');
  const cover = $('#peek-cover');
  const PEEK_SEEN_AT = 0.5; // progress needed to count as "seen"

  const peek = { active: false, pointerId: null, startY: 0, grabY: 0, seen: false };

  function peekMax() { return stack.clientHeight * 0.85; }

  function coverCurrentY() {
    const t = getComputedStyle(cover).transform;
    if (t && t !== 'none') {
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) return parseFloat(m[1].split(',')[5]) || 0;
    }
    return 0;
  }

  function resetPeekCover() {
    peek.active = false;
    peek.seen = false;
    cover.classList.add('no-anim');
    cover.classList.remove('dragging');
    cover.style.transform = 'translateY(0px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => cover.classList.remove('no-anim'));
    });
  }

  function onPeekDown(e) {
    if (!game || peek.active) return;
    peek.active = true;
    peek.pointerId = e.pointerId;
    peek.startY = e.clientY;
    peek.grabY = coverCurrentY();
    cover.classList.add('dragging');
    // freeze the cover where it was caught (it may be mid-snap-back)
    cover.style.transform = `translateY(${peek.grabY}px)`;
    if (cover.setPointerCapture) {
      try { cover.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    e.preventDefault();
  }

  function onPeekMove(e) {
    if (!peek.active || e.pointerId !== peek.pointerId) return;
    const max = peekMax();
    let dy = peek.grabY + (e.clientY - peek.startY);
    if (dy < 0) dy = 0;
    if (dy > max) dy = max + (dy - max) * 0.12; // rubber-band past the end
    cover.style.transform = `translateY(${dy}px)`;
    if (!peek.seen && Math.min(dy, max) / max >= PEEK_SEEN_AT) {
      peek.seen = true;
      $('#cover-seen').hidden = false;
      $('#btn-next-player').disabled = false;
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }

  function onPeekUp(e) {
    if (!peek.active || (e.pointerId != null && e.pointerId !== peek.pointerId)) return;
    peek.active = false;
    cover.classList.remove('dragging');
    cover.style.transform = 'translateY(0px)'; // snap back — hides the word
  }

  if (window.PointerEvent) {
    cover.addEventListener('pointerdown', onPeekDown);
    cover.addEventListener('pointermove', onPeekMove);
    cover.addEventListener('pointerup', onPeekUp);
    cover.addEventListener('pointercancel', onPeekUp);
    cover.addEventListener('lostpointercapture', onPeekUp);
  } else {
    // touch fallback for old WebKit without Pointer Events
    const asPointer = (handler, prevent) => (e) => {
      if (prevent) e.preventDefault();
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      handler({ pointerId: 1, clientY: t ? t.clientY : 0, preventDefault: () => {} });
    };
    cover.addEventListener('touchstart', asPointer(onPeekDown, true), { passive: false });
    cover.addEventListener('touchmove', asPointer(onPeekMove, true), { passive: false });
    cover.addEventListener('touchend', asPointer(onPeekUp, false));
    cover.addEventListener('touchcancel', asPointer(onPeekUp, false));
  }
  stack.addEventListener('contextmenu', (e) => e.preventDefault());

  // ================= PLAY / DISCUSSION =================
  function prepPlayScreen() {
    stopTimer();
    setTimer(timerDuration);
    $('#reveal-answer').hidden = true;
    $('#reveal-answer').innerHTML = '';
    $('#btn-show-word').hidden = false;
  }

  $('#btn-show-word').addEventListener('click', () => {
    if (!game) return;
    const c = CATEGORIES[game.word.cat];
    const impNames = game.names.filter((_, i) => game.roles[i]);
    $('#reveal-answer').innerHTML = `
      <p class="word-gu">${game.word.gu} <span class="word-en">(${game.word.en})</span></p>
      <span class="word-cat">${c ? c.gu + ' · ' + c.en : ''}</span>
      <div class="impo-list">
        <span class="impo-label">ઈમ્પોસ્ટર:</span>
        ${impNames.map((n) => `<span class="chip chip-danger">${n}</span>`).join('')}
      </div>`;
    $('#reveal-answer').hidden = false;
    $('#btn-show-word').hidden = true;
  });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-winner]');
    if (!b || !game) return;
    const winner = b.getAttribute('data-winner');
    if (winner !== 'skip') {
      await DB.addHistory({
        date: new Date().toISOString(),
        wordGu: game.word.gu,
        wordEn: game.word.en,
        cat: game.word.cat,
        players: game.names.length,
        imposters: game.roles.filter(Boolean).length,
        imposterNames: game.names.filter((_, i) => game.roles[i]),
        playerNames: game.names.slice(),
        winner,
      });
      toast(winner === 'civilians' ? 'ખેલાડીઓ જીત્યા! (Civilians win)' : 'ઈમ્પોસ્ટર જીત્યા! (Imposters win)');
    }
    stopTimer();
    game = null;
    showScreen('setup');
  });

  // ================= TIMER =================
  let timerDuration = 180; // seconds
  let timerRemaining = 180;
  let timerId = null;

  function fmt(s) { return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); }

  function updateTimerUI() {
    const d = $('#timer-display');
    d.textContent = fmt(Math.max(0, timerRemaining));
    d.classList.toggle('warn', timerRemaining <= 10);
    $('#timer-bar-fill').style.width =
      (timerDuration ? (Math.max(0, timerRemaining) / timerDuration) * 100 : 0) + '%';
  }

  function setToggleUI(running) {
    $('#timer-toggle').innerHTML = running
      ? '<svg class="icon icon-s"><use href="#i-pause"/></svg><span>થોભો</span>'
      : '<svg class="icon icon-s"><use href="#i-play"/></svg><span>શરૂ</span>';
  }

  function setTimer(sec) {
    timerDuration = sec;
    timerRemaining = sec;
    updateTimerUI();
    setToggleUI(false);
    $$('[data-timer-set]').forEach((b) => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-timer-set'), 10) === sec);
    });
  }

  function tick() {
    timerRemaining--;
    updateTimerUI();
    if (timerRemaining <= 0) {
      stopTimer();
      toast('સમય પૂરો! (Time up)');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  function startTimer() {
    if (timerId) return;
    if (timerRemaining <= 0) timerRemaining = timerDuration;
    timerId = setInterval(tick, 1000);
    setToggleUI(true);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    setToggleUI(false);
  }

  $('#timer-toggle').addEventListener('click', () => {
    if (timerId) stopTimer(); else startTimer();
  });
  $('#timer-reset').addEventListener('click', () => { stopTimer(); setTimer(timerDuration); });
  $$('[data-timer-set]').forEach((b) => {
    b.addEventListener('click', () => { stopTimer(); setTimer(parseInt(b.getAttribute('data-timer-set'), 10)); });
  });

  // ================= HISTORY =================
  async function renderHistory() {
    const list = $('#history-list');
    const items = await DB.getHistory();
    if (!items.length) {
      list.innerHTML = '<p class="empty">હજી કોઈ રમત નથી.<br/><span class="en">No games yet.</span></p>';
      return;
    }
    list.innerHTML = '';
    items.forEach((it) => {
      const d = new Date(it.date);
      const dateStr = d.toLocaleDateString('en-GB') + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      const badge = it.winner === 'civilians'
        ? '<span class="badge civ">ખેલાડીઓ જીત્યા</span>'
        : '<span class="badge imp">ઈમ્પોસ્ટર જીત્યા</span>';
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="h-top">
          <span class="h-word">${it.wordGu} <span class="en">(${it.wordEn})</span></span>
          <span class="h-date">${dateStr}</span>
        </div>
        <div class="h-meta">
          <span class="meta-pill">${it.players} ખેલાડી</span>
          <span class="meta-pill">${it.imposters} ઈમ્પોસ્ટર</span>
          ${badge}
        </div>
        <div class="h-imp">ઈમ્પોસ્ટર: ${(it.imposterNames || []).join(', ') || '—'}</div>`;
      list.appendChild(el);
    });
  }

  $('#btn-clear-history').addEventListener('click', async () => {
    if (!confirm('બધો ઇતિહાસ કાઢી નાખવો છે? (Clear all history?)')) return;
    await DB.clearHistory();
    renderHistory();
    toast('ઇતિહાસ સાફ થયો (History cleared)');
  });

  // ================= PWA INSTALL =================
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('#install-hint').hidden = false;
  });
  $('#install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#install-hint').hidden = true;
  });

  // ================= INIT =================
  function init() {
    buildCategorySelect();
    clampImposters();
    renderSetup();
    refreshPresetSelect();
    setTimer(timerDuration);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  init();
})();
