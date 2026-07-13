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
    if (el) {
      el.classList.add('active');
      // Move focus to the new screen's heading so keyboard / screen-reader users
      // get an anchor and an announcement on every navigation.
      const h = el.querySelector('h1, h2, [data-screen-focus]');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
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

  // ---------- custom confirm dialog ----------
  // A promise-based, on-brand replacement for window.confirm(): a centered modal
  // card matching the app's native-mobile look. Resolves true when the user
  // confirms, and false when they cancel, tap the backdrop, or press Escape.
  // opts: { titleKey, messageKey?, confirmKey, cancelKey='cancel', icon?, tone? }
  const dialogEl = $('#dialog');
  let dialogResolve = null;

  function closeDialog(result) {
    if (!dialogResolve) return;
    const done = dialogResolve;
    dialogResolve = null;
    dialogEl.hidden = true;
    document.removeEventListener('keydown', onDialogKey, true);
    done(result);
  }

  function onDialogKey(e) {
    if (!dialogResolve) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(false); return; }
    if (e.key === 'Tab') {
      // simple focus trap: keep Tab within the dialog's two buttons
      const first = $('#dialog-confirm');
      const last = $('#dialog-cancel');
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function confirmDialog(opts) {
    const o = opts || {};
    const danger = o.tone === 'danger';
    if (dialogResolve) closeDialog(false); // one dialog at a time
    return new Promise((resolve) => {
      dialogResolve = resolve;
      dialogEl.classList.toggle('danger', danger);
      $('#dialog-icon').innerHTML = Icons.svg(o.icon || (danger ? 'trash' : 'help'), 'icon-l');
      $('#dialog-title').innerHTML = biBr(o.titleKey);
      $('#dialog-message').innerHTML = o.messageKey ? biBr(o.messageKey) : '';

      const confirmBtn = $('#dialog-confirm');
      confirmBtn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
      confirmBtn.innerHTML = `<span class="btn-label">${biSpan(o.confirmKey)}</span>`;
      $('#dialog-cancel').innerHTML = `<span class="btn-label">${biSpan(o.cancelKey || 'cancel')}</span>`;

      dialogEl.hidden = false;
      document.addEventListener('keydown', onDialogKey, true);
      if (navigator.vibrate) navigator.vibrate(10);
      // focus the safe (cancel) action so a stray Enter never confirms
      requestAnimationFrame(() => $('#dialog-cancel').focus());
    });
  }

  $('#dialog-confirm').addEventListener('click', () => closeDialog(true));
  $('#dialog-cancel').addEventListener('click', () => closeDialog(false));
  dialogEl.addEventListener('click', (e) => { if (e.target === dialogEl) closeDialog(false); });

  // ---------- randomness ----------
  // Prefer the platform CSPRNG (crypto.getRandomValues) over Math.random(),
  // whose short sequences can feel patterned. randInt returns an unbiased
  // integer in [0, n): a plain "value % n" skews toward small values when n
  // doesn't divide 2^32 evenly, so we reject the tail that would cause the bias.
  const cryptoObj = window.crypto || window.msCrypto || null;
  function randInt(n) {
    n = Math.floor(n);
    if (n <= 1) return 0;
    if (cryptoObj && cryptoObj.getRandomValues) {
      const limit = Math.floor(0x100000000 / n) * n; // largest multiple of n ≤ 2^32
      const buf = new Uint32Array(1);
      let x;
      do { cryptoObj.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return x % n;
    }
    return Math.floor(Math.random() * n); // legacy fallback
  }

  // Fisher-Yates, drawing each swap index from the CSPRNG above.
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
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
    mode: 'classic', // 'classic' = shuffled seating; 'linear' = fixed setup order
    names: [],
  };
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;

  // ---------- language (primary + secondary, via I18n) ----------
  // Any registered language can fill the primary slot and any (or none) the
  // secondary slot. I18n renders the static [data-i18n*] markup; the helpers
  // here rebuild the pieces assembled in JS.
  //   biSpan(key) -> "primary<span class=en>secondary</span>"  (inline secondary)
  //   biBr(key)   -> same but secondary on its own line
  //   secEl(el,key) -> fill a dedicated secondary element / hide it when none
  function biSpan(key) { const sv = I18n.s(key); return I18n.t(key) + (sv ? ' ' + I18n.secSpan(sv) : ''); }
  function biBr(key) { const sv = I18n.s(key); return I18n.t(key) + (sv ? '<br/>' + I18n.secSpan(sv) : ''); }
  function secEl(el, key) {
    const sv = I18n.s(key);
    if (sv) { el.textContent = sv; el.hidden = false; } else { el.hidden = true; }
  }
  function pairOf(obj) { return I18n.secondary ? `${I18n.of(obj)} (${I18n.ofs(obj)})` : I18n.of(obj); }

  // The picker is a pill button that opens a sheet with a Primary list and a
  // Secondary list (None + every language). Both are rebuilt from I18n.LANGS,
  // so any registered language appears; scrolling handles a long list.
  function renderLangButton() {
    const langs = I18n.LANGS;
    const label = I18n.secondary
      ? `${langs[I18n.primary]} · ${langs[I18n.secondary]}`
      : langs[I18n.primary];
    $('#lang-btn-label').textContent = label || I18n.primary;
  }

  function langRow(slot, code, label, selected) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang-row' + (selected ? ' selected' : '');
    b.dataset.code = code;
    b.setAttribute('aria-pressed', selected ? 'true' : 'false');
    b.innerHTML = `<span class="lang-row-name">${label}</span>` + (selected ? Icons.svg('check', 'icon-s') : '');
    b.addEventListener('click', () => chooseLang(slot, code));
    return b;
  }

  function buildLangSheet() {
    const langs = I18n.LANGS;
    $('#lang-sheet-title').textContent = I18n.t('language_title');
    $('#lang-primary-label').textContent = I18n.t('primary_label');
    $('#lang-secondary-label').textContent = I18n.t('secondary_label');

    const pri = $('#lang-list-primary');
    pri.innerHTML = '';
    Object.keys(langs).forEach((code) => {
      pri.appendChild(langRow('primary', code, langs[code], I18n.primary === code));
    });

    const sec = $('#lang-list-secondary');
    sec.innerHTML = '';
    sec.appendChild(langRow('secondary', '', I18n.t('none'), !I18n.secondary));
    Object.keys(langs).forEach((code) => {
      if (code === I18n.primary) return; // can't be both slots
      sec.appendChild(langRow('secondary', code, langs[code], I18n.secondary === code));
    });
  }

  function chooseLang(slot, code) {
    if (slot === 'primary') {
      // picking the current secondary as primary swaps the two, rather than
      // dropping the secondary
      const newS = code === I18n.secondary ? I18n.primary : I18n.secondary;
      I18n.set(code, newS);
    } else {
      I18n.set(I18n.primary, code);
    }
    applyLang(); // live-updates the app + refreshes the open sheet's checkmarks
  }

  function openLangSheet() { buildLangSheet(); $('#lang-sheet').hidden = false; }
  function closeLangSheet() { $('#lang-sheet').hidden = true; }

  function applyLang() {
    I18n.apply(document);   // static [data-i18n*] markup
    renderLangButton();
    if (!$('#lang-sheet').hidden) buildLangSheet(); // refresh sheet if open
    buildCategorySelect();  // <option> text can't use data-i18n
    refreshPresetSelect();
    renderSetup();          // imposter hint + name placeholders
    $('#preset-name').placeholder = I18n.tt('preset_name_ph');
    if (mp) mpApplyLang();  // re-render the live multiplayer screen in the new language
  }

  // ---------- current game state ----------
  let game = null; // { word, category, roles[], names[], index }

  // ================= NAVIGATION =================
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const dest = nav.getAttribute('data-nav');
      if (dest === 'history') renderHistory();
      if (dest === 'home' && mp) mpTeardown(); // leaving a room via a Back/Home link
      showScreen(dest);
      return;
    }
    const quit = e.target.closest('[data-quit]');
    if (quit) {
      const leave = () => { stopTimer(); game = null; showScreen('home'); };
      if (!game) { leave(); return; }
      confirmDialog({
        titleKey: 'quit_confirm',
        messageKey: 'quit_message',
        confirmKey: 'quit_action',
        icon: 'x',
        tone: 'danger',
      }).then((ok) => { if (ok) leave(); });
    }
  });

  // ================= SETUP SCREEN =================
  // Imposters are always a strict minority, so no game is decided before it starts
  // (a majority or parity of imposters would win no matter who is removed). Cap at
  // floor((players-1)/2): 3-4 players -> 1, 5-6 -> 2, 7-8 -> 3, and so on.
  function maxImposters(n) { return Math.max(1, Math.floor((n - 1) / 2)); }

  function clampImposters() {
    const maxImp = maxImposters(config.players);
    if (config.imposters > maxImp) config.imposters = maxImp;
    if (config.imposters < 1) config.imposters = 1;
  }

  function renderSetup() {
    $('#val-players').textContent = config.players;
    $('#val-imposters').textContent = config.imposters;
    const maxImp = maxImposters(config.players);
    const fill = (str) => str.replace('{max}', maxImp).replace('{p}', config.players);
    $('#imposter-hint').innerHTML = fill(I18n.t('imp_hint')) + I18n.secSpan(fill(I18n.s('imp_hint')));
    renderModeToggle();
    renderNameInputs();
  }

  // Segmented Classic / Linear control: highlight the active mode and describe it.
  function renderModeToggle() {
    $$('#mode-toggle .mode-opt').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === config.mode);
      b.setAttribute('aria-pressed', b.dataset.mode === config.mode ? 'true' : 'false');
    });
    const key = config.mode === 'linear' ? 'mode_linear_hint' : 'mode_classic_hint';
    $('#mode-hint').innerHTML = I18n.t(key) + I18n.secSpan(I18n.s(key));
  }

  function renderNameInputs() {
    const wrap = $('#name-inputs');
    wrap.innerHTML = '';
    for (let i = 0; i < config.players; i++) {
      const inp = document.createElement('input');
      inp.className = 'input';
      inp.type = 'text';
      inp.placeholder = I18n.secondary
        ? `${I18n.t('player')} ${i + 1} (${I18n.s('player')} ${i + 1})`
        : `${I18n.t('player')} ${i + 1}`;
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
    optAll.textContent = I18n.tt('all_categories');
    sel.appendChild(optAll);
    Object.keys(CATEGORIES).forEach((key) => {
      const c = CATEGORIES[key];
      const o = document.createElement('option');
      o.value = key;
      o.textContent = pairOf(c);
      sel.appendChild(o);
    });
    sel.value = config.category;
  }

  // steppers
  $$('[data-stepper]').forEach((stepper) => {
    stepper.addEventListener('click', (e) => {
      const b = e.target.closest('[data-delta]');
      if (!b) return;
      const delta = parseInt(b.getAttribute('data-delta'), 10);
      const kind = stepper.getAttribute('data-stepper');
      if (kind !== 'players' && kind !== 'imposters') return; // multiplayer steppers are wired separately
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
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = I18n.tt('load_preset_ph');
    sel.appendChild(ph);
    presets.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.name} — ${p.players} ${I18n.t('players_count')} · ${p.imposters} ${I18n.t('imposters_count')}`;
      sel.appendChild(o);
    });
    sel._presets = presets;
  }

  $('#btn-save-preset').addEventListener('click', async () => {
    const name = $('#preset-name').value.trim();
    if (!name) { toast(I18n.tt('enter_name')); return; }
    await DB.addPreset({
      name,
      players: config.players,
      imposters: config.imposters,
      category: config.category,
      mode: config.mode,
      names: config.names.slice(0, config.players),
    });
    $('#preset-name').value = '';
    await refreshPresetSelect();
    toast(I18n.tt('preset_saved'));
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
    config.mode = p.mode || 'classic';
    config.names = (p.names || []).slice();
    config.names.length = config.players;
    clampImposters();
    $('#sel-category').value = config.category;
    renderSetup();
    toast(I18n.tt('preset_loaded'));
  });

  // ================= START GAME =================
  // gu -> the curated cluster it belongs to (see CLUSTERS in vocab.js).
  const CLUSTER_BY_GU = (() => {
    const m = new Map();
    (window.CLUSTERS || []).forEach((cluster) => cluster.forEach((gu) => m.set(gu, cluster)));
    return m;
  })();
  // gu -> the full {gu,en,cat} entry, so a decoy always resolves to a real word.
  const VOCAB_BY_GU = (() => {
    const m = new Map();
    VOCAB.forEach((w) => { if (!m.has(w.gu)) m.set(w.gu, w); });
    return m;
  })();

  // The imposter's bluffing aid: a DIFFERENT but genuinely confusable word, shared
  // by every imposter so their clues stay consistent. First choice is another
  // member of the secret word's curated cluster (a close look-alike); if the word
  // isn't clustered we fall back to a random other word in the same category, then
  // any other word, then null (the blind-bluff card, only if the vocab is one word).
  function pickDecoy(word) {
    const cluster = CLUSTER_BY_GU.get(word.gu);
    if (cluster) {
      const mates = cluster
        .filter((gu) => gu !== word.gu)
        .map((gu) => VOCAB_BY_GU.get(gu))
        .filter(Boolean); // ignore any cluster entry not present in VOCAB
      if (mates.length) return mates[randInt(mates.length)];
    }
    const sameCat = VOCAB.filter((w) => w.cat === word.cat && w !== word);
    const pool = sameCat.length ? sameCat : VOCAB.filter((w) => w !== word);
    return pool.length ? pool[randInt(pool.length)] : null;
  }

  $('#btn-start').addEventListener('click', () => {
    // pick vocab pool
    let pool = VOCAB;
    if (config.category !== 'all') {
      pool = VOCAB.filter((w) => w.cat === config.category);
    }
    if (!pool.length) { toast(I18n.tt('no_words')); return; }

    const word = pool[randInt(pool.length)];
    const decoy = pickDecoy(word); // related word handed to the imposter(s)

    // Build the roster in setup order. In Classic mode the seating is shuffled so
    // the phone doesn't always start with player 1 — reveal, turn order and
    // removal all follow that randomized order. In Linear mode the seating stays
    // exactly as set up, so play runs in a fixed, predictable order.
    const baseNames = [];
    for (let i = 0; i < config.players; i++) {
      baseNames.push((config.names[i] && config.names[i].trim()) || `${I18n.t('player')} ${i + 1}`);
    }
    const names = config.mode === 'linear' ? baseNames : shuffle(baseNames);

    // Roles are always assigned at random (independent of mode), so the imposter
    // is never predictable from the seating order.
    const roles = new Array(config.players).fill(false);
    const idxs = shuffle([...Array(config.players).keys()]).slice(0, config.imposters);
    idxs.forEach((i) => { roles[i] = true; });

    game = { word, decoy, category: config.category, mode: config.mode, roles, names, index: 0 };
    startRevealFor(0);
    showScreen('reveal');
  });

  // ================= REVEAL (pass the phone) =================
  function startRevealFor(i) {
    game.index = i;
    $('#pass-instruction').textContent = I18n.tt(i === 0 ? 'pass_to_first' : 'pass_to_next');
    $('#pass-player').textContent = game.names[i];
    $('#turn-count').textContent = `${i + 1} / ${game.names.length}`;
    renderRevealDots();
    populatePeekContent();
    resetPeekCover();
    $('#cover-seen').hidden = true;

    const next = $('#btn-next-player');
    next.disabled = true;
    const last = i >= game.names.length - 1;
    $('#btn-next-label').innerHTML = biSpan(last ? 'start_discussion' : 'next_player');
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

  // The visible word block (category chip + word + optional secondary line),
  // shared by the civilian's secret word and the imposter's related hint word.
  function wordBlock(w) {
    const c = CATEGORIES[w.cat];
    return `
      <span class="word-cat">${c ? I18n.of(c) + I18n.secSpan(' · ' + I18n.ofs(c)) : ''}</span>
      <p class="word-gu">${I18n.of(w)}</p>
      ${I18n.secondary ? `<p class="word-en">(${I18n.ofs(w)})</p>` : ''}`;
  }

  function populatePeekContent() {
    const i = game.index;
    const content = $('#peek-content');
    if (game.roles[i]) {
      // Imposters learn their role AND get a related word (same category, never
      // the real one) to bluff with. If no decoy exists (single-word pool) we
      // fall back to the classic blind-bluff card.
      content.innerHTML = game.decoy
        ? `
        <div class="imposter-card">
          <div class="impo-mark">${Icons.svg('mask', 'icon-l')}</div>
          <p class="impo-title">${biSpan('imposter_title')}</p>
          <div class="impo-hint">
            <span class="impo-hint-label">${biSpan('imposter_hint_label')}</span>
            ${wordBlock(game.decoy)}
          </div>
          <p class="impo-sub">${biBr('imposter_hint_sub')}</p>
        </div>`
        : `
        <div class="imposter-card">
          <div class="impo-mark">${Icons.svg('mask', 'icon-l')}</div>
          <p class="impo-title">${biSpan('imposter_title')}</p>
          <p class="impo-sub">${biBr('imposter_sub')}</p>
        </div>`;
    } else {
      content.innerHTML = `<div>${wordBlock(game.word)}</div>`;
    }
  }

  $('#btn-next-player').addEventListener('click', () => {
    if (!game) return;
    if (game.index >= game.names.length - 1) {
      startRounds();
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

  // ================= ROUNDS / REMOVAL =================
  // After the reveal, the game runs in rounds. Round 1 opens straight into a
  // discussion; every later round opens with a suggesting phase, then a
  // discussion. Each discussion ends in a choice: pick a player to remove, or
  // Skip the round. Removing a player reveals their role and checks the win
  // conditions; a skip just moves on. Civilians win when no imposters remain;
  // imposters win once they equal or outnumber the surviving civilians.

  // Removal selection state (the group's single choice), or null when idle:
  //   { choice: '<idx>' | null }
  let pick = null;

  function startRounds() {
    game.alive = new Array(game.names.length).fill(true);
    game.round = 1;
    game.eliminations = [];
    game.saved = false;
    game.starter = null;
    pickDiscussionStarter();
    showScreen('round');
    renderRound();
    // The discussion opens right after the last player's card — start the clock
    // automatically. It is reset to a full duration at the start of every round.
    setTimer(timerDuration);
    startTimer();
  }

  // Nominate one living player to open the discussion, so nobody has to decide
  // who speaks first. Classic mode picks at random; Linear mode picks the first
  // living player in setup order, keeping the turn order predictable. Re-picked
  // each time a discussion phase begins.
  function pickDiscussionStarter() {
    const alive = [];
    for (let i = 0; i < game.names.length; i++) if (game.alive[i]) alive.push(i);
    if (!alive.length) { game.starter = null; return; }
    game.starter = game.mode === 'linear' ? alive[0] : alive[randInt(alive.length)];
  }

  function aliveCounts() {
    let imp = 0, civ = 0;
    for (let i = 0; i < game.names.length; i++) {
      if (!game.alive[i]) continue;
      if (game.roles[i]) imp++; else civ++;
    }
    return { imp, civ, total: imp + civ };
  }

  // Returns 'civilians' | 'imposters' | null (game continues).
  // Evaluated only after an ejection, so a game always gets played.
  function checkWinner() {
    const { imp, civ } = aliveCounts();
    if (imp === 0) return 'civilians';
    if (imp >= civ) return 'imposters';
    return null;
  }

  function renderAlive(wrap) {
    wrap.innerHTML = '';
    game.names.forEach((n, i) => {
      const chip = document.createElement('span');
      if (game.alive[i]) {
        chip.className = 'p-chip';
        chip.textContent = n;
      } else {
        // role was already revealed when this player was ejected
        chip.className = 'p-chip out' + (game.roles[i] ? ' was-imp' : '');
        chip.innerHTML = `<span class="p-name">${n}</span>` +
          (game.roles[i] ? Icons.svg('mask', 'icon-s') : '');
      }
      wrap.appendChild(chip);
    });
    const left = game.alive.filter(Boolean).length;
    const sum = document.createElement('p');
    sum.className = 'alive-sum';
    sum.innerHTML = `${left} ${I18n.t('players_left')}` + I18n.secSpan(`${left} ${I18n.s('players_left')}`);
    wrap.appendChild(sum);
  }

  function renderRound() {
    $('#round-chip').textContent = `${I18n.t('round_word')} ${game.round}`;
    $('#round-title').textContent = I18n.t('round_discuss_title');
    secEl($('#round-title-en'), 'round_discuss_title');
    $('#round-desc').innerHTML = biBr('discuss_desc');

    const starterEl = $('#round-starter');
    if (game.starter != null && game.alive[game.starter]) {
      const fill = (str) => str.replace('{name}', game.names[game.starter]);
      starterEl.innerHTML = fill(I18n.t('discuss_starter')) +
        I18n.secSpan(fill(I18n.s('discuss_starter')));
      starterEl.hidden = false;
    } else {
      starterEl.hidden = true;
    }

    renderAlive($('#alive-chips'));

    // Every round is a discussion round; reveal its two actions (both start hidden
    // in the HTML). The discussion clock is (re)started per round in start/nextRound.
    $('#btn-to-vote').hidden = false;
    $('#btn-skip-round').hidden = false;
  }

  function nextRound() {
    game.round += 1;
    pickDiscussionStarter();
    showScreen('round');
    renderRound();
    // Give every round a fair clock: stop the carried-over interval, reset to the
    // configured duration (honouring a preset changed mid-game) and restart. The
    // leading stopTimer() matters — the interval is still ticking from the previous
    // discussion, and setTimer() alone wouldn't clear it.
    stopTimer();
    setTimer(timerDuration);
    startTimer();
  }

  // discussion -> selection (the group picks one player to remove)
  $('#btn-to-vote').addEventListener('click', () => {
    if (!game) return;
    startSelection();
  });

  // discussion -> skip round (no ejection, no win check)
  $('#btn-skip-round').addEventListener('click', () => {
    if (!game) return;
    toast(I18n.tt('round_skipped'));
    nextRound();
  });

  // ---- removal selection (the group picks one player) ----
  // No more per-player secret ballot: the group discusses openly, then together
  // selects a single living player to remove. Picking one and confirming ejects
  // them, reveals their role and checks the win conditions. Backing out returns
  // to the discussion, where the round can instead be skipped (removing no one).
  function startSelection() {
    pick = { choice: null };
    showScreen('vote');
    renderSelection();
  }

  function pickOption(value, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vote-option';
    b.dataset.idx = value;
    b.innerHTML = `<span class="vote-name">${label}</span><span class="vote-radio"></span>`;
    return b;
  }

  function renderSelection() {
    const list = $('#vote-list');
    list.innerHTML = '';
    game.names.forEach((n, i) => {
      if (!game.alive[i]) return; // any living player can be removed
      list.appendChild(pickOption(String(i), n));
    });
    $('#btn-confirm-vote-label').innerHTML = biSpan('remove_confirm');
    $('#btn-confirm-vote').disabled = true;
  }

  $('#vote-list').addEventListener('click', (e) => {
    const opt = e.target.closest('.vote-option');
    if (!opt || !pick) return;
    pick.choice = opt.dataset.idx; // a stringified player index
    $$('.vote-option', $('#vote-list')).forEach((o) => o.classList.toggle('selected', o === opt));
    $('#btn-confirm-vote').disabled = false;
  });

  // Back cancels the selection and returns to the discussion.
  $('#btn-vote-back').addEventListener('click', () => {
    if (!game) return;
    pick = null;
    showScreen('round');
    renderRound();
  });

  $('#btn-confirm-vote').addEventListener('click', () => {
    if (!pick || pick.choice == null) return;
    const idx = parseInt(pick.choice, 10);
    if (!game.alive[idx]) return;
    pick = null;
    eliminate(idx);
  });

  function eliminate(idx) {
    game.alive[idx] = false;
    const wasImp = game.roles[idx];
    game.eliminations.push({ name: game.names[idx], imposter: wasImp, round: game.round });
    if (navigator.vibrate) navigator.vibrate(wasImp ? [30, 60, 30] : 30);
    const winner = checkWinner();
    // Removal committed — the round's discussion is over, so stop the clock. Without
    // this it keeps ticking under the outcome/win screen and fires a spurious "time
    // up" toast + vibration; nextRound() restarts a fresh clock if the game
    // continues, or it stays stopped on game over. (Mirrors MP's mpStopTimer().)
    stopTimer();
    showScreen('outcome');
    renderOutcome(idx, wasImp, winner);
  }

  // ---- outcome screen (ejection reveal / game over) ----
  function renderOutcome(idx, wasImp, winner) {
    const body = $('#outcome-body');
    const actions = $('#outcome-actions');
    actions.innerHTML = '';

    if (winner) {
      const civWin = winner === 'civilians';
      const key = civWin ? 'civilians_win' : 'imposters_win';
      $('#outcome-title').textContent = I18n.t(key) + '!';
      secEl($('#outcome-title-en'), key);
      body.innerHTML = gameOverBody(winner);
      if (!game.saved) {
        game.saved = true;
        saveResult(winner);
        toast(I18n.tt(key));
      }
      const again = mkBtn('btn btn-primary btn-lg', 'rotate', 'new_game');
      again.addEventListener('click', () => { resetGame(); showScreen('setup'); });
      const home = mkBtn('btn btn-ghost', 'back', 'home');
      home.addEventListener('click', () => { resetGame(); showScreen('home'); });
      actions.appendChild(again);
      actions.appendChild(home);
    } else {
      $('#outcome-title').textContent = I18n.t('voted_out');
      secEl($('#outcome-title-en'), 'voted_out');
      body.innerHTML = ejectBody(idx, wasImp);
      const cont = mkBtn('btn btn-primary btn-lg', 'arrow-right', 'next_round');
      cont.addEventListener('click', () => nextRound());
      actions.appendChild(cont);
    }
  }

  function ejectBody(idx, wasImp) {
    const left = game.alive.filter(Boolean).length;
    const notePri = `${left} ${I18n.t('players_left')} · ${I18n.t('game_continues')}`;
    const noteSec = `${left} ${I18n.s('players_left')} · ${I18n.s('game_continues')}`;
    return `
      <div class="outcome-card ${wasImp ? 'good' : 'bad'}">
        <div class="outcome-mark">${Icons.svg(wasImp ? 'mask' : 'users', 'icon-l')}</div>
        <p class="outcome-name">${game.names[idx]}</p>
        <p class="outcome-role">${biSpan(wasImp ? 'was_imposter' : 'was_innocent')}</p>
      </div>
      <p class="outcome-note">${notePri}${I18n.secondary ? '<br/>' + I18n.secSpan(noteSec) : ''}</p>`;
  }

  function gameOverBody(winner) {
    const c = CATEGORIES[game.word.cat];
    const civWin = winner === 'civilians';
    const roster = game.names.map((n, i) => `
      <div class="roster-row">
        <span class="roster-name">${n}</span>
        <span class="roster-tags">
          <span class="chip ${game.roles[i] ? 'chip-danger' : 'chip-civ'}">${I18n.t(game.roles[i] ? 'imposter_role' : 'civilian_role')}</span>
          <span class="roster-state ${game.alive[i] ? 'in' : 'out'}">${I18n.t(game.alive[i] ? 'in_play' : 'out_play')}${I18n.secSpan(' · ' + I18n.s(game.alive[i] ? 'in_play' : 'out_play'))}</span>
        </span>
      </div>`).join('');
    return `
      <div class="outcome-card ${civWin ? 'good' : 'bad'}">
        <div class="outcome-mark">${Icons.svg(civWin ? 'users' : 'mask', 'icon-l')}</div>
        <p class="outcome-role big">${biSpan(civWin ? 'all_imposters_caught' : 'imposters_parity')}</p>
      </div>
      <div class="word-reveal">
        <span class="word-cat">${c ? I18n.of(c) + I18n.secSpan(' · ' + I18n.ofs(c)) : ''}</span>
        <p class="word-gu">${I18n.of(game.word)}${I18n.secondary ? ' <span class="word-en">(' + I18n.ofs(game.word) + ')</span>' : ''}</p>
      </div>
      <div class="roster">${roster}</div>`;
  }

  function mkBtn(cls, icon, key) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = `${Icons.svg(icon)}<span class="btn-label">${biSpan(key)}</span>`;
    return b;
  }

  function saveResult(winner) {
    return DB.addHistory({
      date: new Date().toISOString(),
      wordGu: game.word.gu,
      wordEn: game.word.en,
      cat: game.word.cat,
      players: game.names.length,
      imposters: game.roles.filter(Boolean).length,
      imposterNames: game.names.filter((_, i) => game.roles[i]),
      playerNames: game.names.slice(),
      winner,
      rounds: game.round,
      eliminations: game.eliminations.slice(),
    });
  }

  function resetGame() {
    stopTimer();
    game = null;
  }

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
      ? Icons.svg('pause', 'icon-s') + `<span>${I18n.t('timer_pause')}</span>`
      : Icons.svg('play', 'icon-s') + `<span>${I18n.t('timer_start')}</span>`;
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
      toast(I18n.tt('time_up'));
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
      list.innerHTML = `<p class="empty">${biBr('no_games')}</p>`;
      return;
    }
    list.innerHTML = '';
    items.forEach((it) => {
      const d = new Date(it.date);
      const dateStr = d.toLocaleDateString('en-GB') + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      // history stored the word as gu/en; show it in the current languages
      const wordByLang = { gu: it.wordGu, en: it.wordEn };
      const wordP = wordByLang[I18n.primary] || it.wordGu;
      const wordS = I18n.secondary ? (wordByLang[I18n.secondary] || '') : '';
      const badge = it.winner === 'civilians'
        ? `<span class="badge civ">${I18n.t('civilians_win')}</span>`
        : `<span class="badge imp">${I18n.t('imposters_win')}</span>`;
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="h-top">
          <span class="h-word">${wordP}${wordS ? ' ' + I18n.secSpan('(' + wordS + ')') : ''}</span>
          <span class="h-date">${dateStr}</span>
        </div>
        <div class="h-meta">
          <span class="meta-pill">${it.players} ${I18n.t('players_count')}</span>
          <span class="meta-pill">${it.imposters} ${I18n.t('imposters_count')}</span>
          ${it.rounds ? `<span class="meta-pill">${it.rounds} ${I18n.t('rounds_count')}</span>` : ''}
          ${badge}
        </div>
        <div class="h-imp">${I18n.t('imposters_label')}: ${(it.imposterNames || []).join(', ') || '—'}</div>`;
      list.appendChild(el);
    });
  }

  $('#btn-clear-history').addEventListener('click', async () => {
    const ok = await confirmDialog({
      titleKey: 'clear_history_confirm',
      messageKey: 'clear_history_message',
      confirmKey: 'clear_history_action',
      icon: 'trash',
      tone: 'danger',
    });
    if (!ok) return;
    await DB.clearHistory();
    renderHistory();
    toast(I18n.tt('history_cleared'));
  });

  // ================= MULTIPLAYER ("Host a game") =================
  // A host-authoritative star over WebRTC (transport in js/net.js). The HOST
  // owns the entire game and broadcasts a PUBLIC snapshot to everyone; each
  // player's PRIVATE card (their real word, or the imposter's decoy) is sent
  // ONLY to that player, so no device ever learns another player's role. Clients
  // send intents (hello / ready / vote); the host resolves them and re-broadcasts.
  // The host is also a player and renders itself through the very same path a
  // client uses — the only difference is that host-only controls are shown and
  // the host drives every state transition.

  const MP_MIN_PLAYERS = 3;
  const MP_MAX_PLAYERS = 12;         // a sane cap for a phone star topology
  const MP_DISCUSS_DEFAULT = 180;    // seconds
  const MP_NAME_KEY = 'imposter-mp-name';

  // The whole multiplayer session, or null when we're not in a room.
  let mp = null;
  let mpTimerId = null;              // host: authoritative countdown; client: interpolation
  let mpRevealSeen = false;          // have I peeked my own card yet this reveal?
  let mpQrUrl = null;                // last URL rendered as a QR (avoids re-rendering)

  // ---- small utilities ----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mpCleanName(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 24); }
  function mpStoredName() { try { return localStorage.getItem(MP_NAME_KEY) || ''; } catch (e) { return ''; } }
  function mpStoreName(n) { try { localStorage.setItem(MP_NAME_KEY, n); } catch (e) { /* ignore */ } }
  function netReady() {
    if (window.Net && Net.supported()) return true;
    toast(I18n.tt('webrtc_unsupported'));
    return false;
  }
  function mpEmptyPub() {
    return {
      phase: 'lobby', round: 0, players: [], config: { imposters: 1, category: 'all' },
      starterId: null,
      timer: { running: false, remaining: MP_DISCUSS_DEFAULT, duration: MP_DISCUSS_DEFAULT },
      votes: {}, voteClosed: false, lastElim: null, skipped: false, skipReason: null,
      winner: null, reveal: null, revealed: {},
    };
  }
  function mpPlayerPub(id) {
    const a = mp.pub.players;
    for (let i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }
  function mpMe() { return mp ? mpPlayerPub(mp.myId) : null; }
  function hostPlayer(id) {
    const a = mp.host.players;
    for (let i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }
  function hostAliveConnected() { return mp.host.players.filter((p) => p.alive && p.connected); }

  // ---- entry points ----
  function mpEnterHost() {
    if (!netReady()) return;
    mpStartHost();
  }
  function mpEnterJoin() {
    showScreen('mp-join');
    mpSetJoinBusy(false); // reset in case a previous attempt left the form disabled
    const nameEl = $('#mp-join-name');
    if (!nameEl.value) nameEl.value = mpStoredName();
    setTimeout(() => { $('#mp-join-code').focus(); }, 60);
  }

  function mpStartHost() {
    const name = mpCleanName(mpStoredName()) || I18n.t('host_name_default');
    mp = {
      amHost: true, code: null, status: 'connecting', myId: null, myName: name,
      pub: mpEmptyPub(), myCard: null, _qrDone: false, _ph: null,
      host: { players: [], secret: null, cardById: {}, config: { imposters: 1, category: 'all' } },
    };
    mpQrUrl = null;
    showScreen('mp-lobby');
    mpApplyRoleVis();
    $('#mp-host-name').value = name;
    mpBuildCategorySelect();
    mpRenderConnecting();
    Net.host({
      onReady(code) {
        mp.code = code;
        mp.myId = Net.myId;
        // onReady re-fires whenever the host's broker link reconnects, so add the
        // host player exactly ONCE — otherwise a brief network blip would create a
        // second "host" in the room.
        const self = hostPlayer(mp.myId);
        if (self) {
          self.isHost = true; self.connected = true; self.name = mp.myName;
        } else {
          mp.host.players.push({ id: mp.myId, name: mp.myName, isHost: true, connected: true, alive: true, ready: false });
        }
        mpSetStatus('ok');
        hostSyncPub();
        renderMP();
      },
      onMessage: hostOnMessage,
      onLeave: hostOnLeave,
      onError: mpOnNetError,
    });
  }

  function mpStartJoin(code, name) {
    mp = {
      amHost: false, code: code, status: 'connecting', joined: false, myId: null, myName: name,
      pub: mpEmptyPub(), myCard: null, _qrDone: false, _ph: null, _joinTimer: null,
    };
    mpQrUrl = null;
    // Stay on the Join screen showing a "connecting" state — we only move to the
    // room once the host has actually accepted us (first state received).
    mpSetJoinBusy(true);
    mp._joinTimer = setTimeout(() => { if (mp && !mp.joined) mpJoinTimedOut(); }, 20000);
    Net.join(code, {
      onOpen() {
        mp.myId = Net.myId;
        Net.sendHost({ t: 'hello', name: mp.myName });
        mpSetStatus('ok');
      },
      onMessage: clientOnMessage,
      onReconnecting() { mpSetStatus('reconnecting'); },
      onLost() { mpSetStatus('lost'); mpHandleLost(); },
      onError: mpOnNetError,
    });
  }

  // The Join button's connecting/disabled state (we linger on the Join screen).
  function mpSetJoinBusy(busy) {
    const btn = $('#mp-join-btn');
    const label = $('#mp-join-btn-label');
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    $('#mp-join-code').disabled = busy;
    $('#mp-join-name').disabled = busy;
    $('#mp-scan-btn').disabled = busy;
    if (busy) label.textContent = I18n.t('connecting');
    else label.innerHTML = biSpan('join_action');
  }

  // We're in the room: stop the connecting state; renderMP (called next) shows
  // the lobby (or, on a mid-game reconnect, whatever screen the phase maps to).
  function mpEnterRoom() {
    mp.joined = true;
    if (mp._joinTimer) { clearTimeout(mp._joinTimer); mp._joinTimer = null; }
    mpSetJoinBusy(false);
    mpApplyRoleVis();
  }

  // Joining failed before we made it into the room — stay on the Join screen.
  function mpJoinFailed(msgKey) {
    mpTeardown();
    showScreen('mp-join');
    mpSetJoinBusy(false);
    if (msgKey) toast(I18n.tt(msgKey));
  }

  // On timeout, report WHY based on how far the transport got: never reached the
  // matchmaking server vs. reached it but couldn't open a direct link to the host
  // (typically Wi-Fi AP/client isolation). No TURN relay is bundled, so the fix is
  // a phone hotspot — see the in-app tip — or a custom relay via window.MP_ICE_SERVERS.
  function mpJoinTimedOut() {
    const st = (window.Net && Net.stage) || '';
    mpJoinFailed(st === 'broker' ? 'join_no_server' : 'join_no_host');
  }

  // ---------------- HOST: authority ----------------
  function hostOnMessage(peerId, msg) {
    if (!mp || !mp.amHost || !msg) return;
    switch (msg.t) {
      case 'hello': hostHandleHello(peerId, msg); break;
      case 'ready': hostSetReady(peerId, true); break;
      case 'vote': hostRecordVote(peerId, msg.target); break;
      case 'leave': hostOnLeave(peerId); break;
    }
  }

  function hostHandleHello(peerId, msg) {
    const name = mpCleanName(msg.name) || I18n.t('player');
    const existing = hostPlayer(peerId);
    const started = mp.pub.phase !== 'lobby';
    if (!existing) {
      if (started) { Net.send(peerId, { t: 'reject', reason: 'in-progress' }); return; }
      if (mp.host.players.length >= MP_MAX_PLAYERS) { Net.send(peerId, { t: 'reject', reason: 'full' }); return; }
      mp.host.players.push({ id: peerId, name, isHost: false, connected: true, alive: true, ready: false });
      toast(name + ' · ' + I18n.t('online'));
    } else {
      existing.name = name;
      existing.connected = true; // a returning player (reconnect / refresh)
    }
    Net.send(peerId, { t: 'welcome' });
    if (started && mp.host.cardById[peerId]) Net.send(peerId, { t: 'card', card: mp.host.cardById[peerId] });
    hostSyncPub();
    hostBroadcast();
    if (started) Net.send(peerId, { t: 'timer', timer: mp.pub.timer });
    hostMaybeAutoAdvance();
  }

  function hostOnLeave(peerId) {
    if (!mp || !mp.amHost) return;
    const p = hostPlayer(peerId);
    if (!p || p.isHost) return;
    if (mp.pub.phase === 'lobby') {
      mp.host.players = mp.host.players.filter((x) => x.id !== peerId);
    } else {
      p.connected = false; // keep their seat + role so they can rejoin
    }
    hostSyncPub();
    hostBroadcast();
    hostMaybeAutoAdvance();
  }

  function hostSyncPub() {
    // Belt-and-suspenders: never let a duplicate player id survive into the
    // public roster (e.g. a reconnect race), and keep exactly one host.
    const seen = {};
    mp.host.players = mp.host.players.filter((p) => (seen[p.id] ? false : (seen[p.id] = true)));
    mp.pub.players = mp.host.players.map((p) => ({
      id: p.id, name: p.name, isHost: p.isHost, connected: p.connected, alive: p.alive, ready: p.ready,
    }));
    mp.pub.config = { imposters: mp.host.config.imposters, category: mp.host.config.category };
  }

  function hostBroadcast() {
    if (!mp || !mp.amHost) return;
    Net.broadcast({ t: 'state', pub: mp.pub });
    renderMP();
  }

  function hostStartGame() {
    const connected = mp.host.players.filter((p) => p.connected);
    if (connected.length < MP_MIN_PLAYERS) {
      toast(I18n.tt('need_players_mp').replace(/\{min\}/g, MP_MIN_PLAYERS));
      return;
    }
    const imposters = Math.min(mp.host.config.imposters, maxImposters(connected.length));
    let pool = VOCAB;
    if (mp.host.config.category !== 'all') pool = VOCAB.filter((w) => w.cat === mp.host.config.category);
    if (!pool.length) pool = VOCAB;
    const word = pool[randInt(pool.length)];
    const decoy = pickDecoy(word);

    const ids = connected.map((p) => p.id);
    const impIds = shuffle(ids).slice(0, imposters);
    const roleById = {};
    impIds.forEach((id) => { roleById[id] = true; });
    mp.host.secret = { word, decoy, roleById };
    mp.host.cardById = {};

    mp.host.players.forEach((p) => {
      if (!p.connected) { p.alive = false; p.ready = false; return; } // spectate if offline at start
      p.alive = true;
      p.ready = false;
      const isImp = !!roleById[p.id];
      mp.host.cardById[p.id] = isImp ? { imposter: true, word: decoy } : { imposter: false, word };
    });

    mp.pub.phase = 'reveal';
    mp.pub.round = 1;
    mp.pub.starterId = null;
    mp.pub.votes = {};
    mp.pub.voteClosed = false;
    mp.pub.lastElim = null;
    mp.pub.skipped = false;
    mp.pub.winner = null;
    mp.pub.reveal = null;
    mp.pub.revealed = {};
    mpResetTimer(MP_DISCUSS_DEFAULT);
    hostSyncPub();

    mp.host.players.forEach((p) => {
      const card = mp.host.cardById[p.id];
      if (!card) return;
      if (p.id === mp.myId) mp.myCard = card;
      else Net.send(p.id, { t: 'card', card });
    });
    hostBroadcast();
  }

  function hostSetReady(peerId, val) {
    const p = hostPlayer(peerId);
    if (!p || mp.pub.phase !== 'reveal') return;
    p.ready = val;
    hostSyncPub();
    hostBroadcast();
    hostMaybeAutoAdvance();
  }

  function hostMaybeAutoAdvance() {
    if (!mp || !mp.amHost) return;
    if (mp.pub.phase === 'reveal') {
      const alive = mp.host.players.filter((p) => p.alive && p.connected);
      if (alive.length >= 1 && alive.every((p) => p.ready)) hostBeginDiscuss();
    } else if (mp.pub.phase === 'vote') {
      hostMaybeResolveVote();
    }
  }

  function hostBeginDiscuss() {
    mp.pub.phase = 'discuss';
    mp.pub.votes = {};
    mp.pub.voteClosed = false;
    hostPickStarter();
    hostSyncPub();
    hostBroadcast();
    mpStartTimer(); // the shared discussion clock starts automatically
  }

  function hostPickStarter() {
    const a = hostAliveConnected();
    mp.pub.starterId = a.length ? a[randInt(a.length)].id : null;
  }

  function hostOpenVoting() {
    mp.pub.phase = 'vote';
    mp.pub.votes = {};
    mp.pub.voteClosed = false;
    hostSyncPub();
    hostBroadcast();
  }

  function hostRecordVote(peerId, target) {
    if (mp.pub.phase !== 'vote' || mp.pub.voteClosed) return;
    const voter = hostPlayer(peerId);
    if (!voter || !voter.alive || !voter.connected) return;
    if (target !== 'skip') {
      const tp = hostPlayer(target);
      if (!tp || !tp.alive) return;
      if (target === peerId) return; // no voting for yourself
    }
    mp.pub.votes[peerId] = target;
    hostSyncPub();
    hostBroadcast();
    hostMaybeResolveVote();
  }

  function hostMaybeResolveVote() {
    const voters = hostAliveConnected();
    if (voters.length && voters.every((p) => Object.prototype.hasOwnProperty.call(mp.pub.votes, p.id))) {
      hostResolveVote();
    }
  }

  function hostResolveVote() {
    if (mp.pub.phase !== 'vote') return;
    mp.pub.voteClosed = true;

    const counts = {};
    Object.keys(mp.pub.votes).forEach((voterId) => {
      const t = mp.pub.votes[voterId];
      if (t && t !== 'skip') counts[t] = (counts[t] || 0) + 1;
    });
    let top = null, topN = 0, tie = false;
    Object.keys(counts).forEach((id) => {
      if (counts[id] > topN) { top = id; topN = counts[id]; tie = false; }
      else if (counts[id] === topN) { tie = true; }
    });

    if (!top || tie || topN === 0) {
      mp.pub.lastElim = null;
      mp.pub.skipped = true;
      mp.pub.skipReason = Object.keys(counts).length ? 'tie' : 'none';
    } else {
      const victim = hostPlayer(top);
      victim.alive = false;
      const wasImp = !!mp.host.secret.roleById[victim.id];
      mp.pub.lastElim = { id: victim.id, name: victim.name, wasImp };
      mp.pub.skipped = false;
      mp.pub.revealed[victim.id] = wasImp;
    }

    mp.pub.winner = hostCheckWinner();
    if (mp.pub.winner) {
      mp.pub.phase = 'gameover';
      mp.pub.reveal = hostBuildReveal();
      mpStopTimer();
      hostSaveHistory();
    } else {
      mp.pub.phase = 'outcome';
    }
    hostSyncPub();
    hostBroadcast();
    if (navigator.vibrate) navigator.vibrate(mp.pub.lastElim && mp.pub.lastElim.wasImp ? [30, 60, 30] : 30);
  }

  function hostCheckWinner() {
    let imp = 0, civ = 0;
    mp.host.players.forEach((p) => {
      if (!p.alive) return;
      if (mp.host.secret.roleById[p.id]) imp++; else civ++;
    });
    if (imp === 0) return 'civilians';
    if (imp >= civ) return 'imposters';
    return null;
  }

  function hostBuildReveal() {
    const w = mp.host.secret.word;
    return {
      word: { gu: w.gu, en: w.en, cat: w.cat },
      roster: mp.host.players.map((p) => ({
        id: p.id, name: p.name, imposter: !!mp.host.secret.roleById[p.id], alive: p.alive,
      })),
    };
  }

  function hostSaveHistory() {
    const w = mp.host.secret.word;
    return DB.addHistory({
      date: new Date().toISOString(),
      wordGu: w.gu, wordEn: w.en, cat: w.cat,
      players: mp.host.players.length,
      imposters: Object.keys(mp.host.secret.roleById).length,
      imposterNames: mp.host.players.filter((p) => mp.host.secret.roleById[p.id]).map((p) => p.name),
      playerNames: mp.host.players.map((p) => p.name),
      winner: mp.pub.winner,
      rounds: mp.pub.round,
      mode: 'host',
    });
  }

  function hostNextRound() {
    mp.pub.round += 1;
    mp.pub.phase = 'discuss';
    mp.pub.votes = {};
    mp.pub.voteClosed = false;
    hostPickStarter();
    // Each round gets a fresh shared clock (mirrors hostBeginDiscuss): reset to full
    // BEFORE broadcasting so clients never render the previous round's spent timer,
    // then start it after the state goes out.
    mpResetTimer(mp.pub.timer.duration);
    hostSyncPub();
    hostBroadcast();
    mpStartTimer();
  }

  function hostPlayAgain() {
    mp.pub.phase = 'lobby';
    mp.pub.round = 0;
    mp.pub.votes = {};
    mp.pub.voteClosed = false;
    mp.pub.lastElim = null;
    mp.pub.skipped = false;
    mp.pub.winner = null;
    mp.pub.reveal = null;
    mp.pub.revealed = {};
    mp.pub.starterId = null;
    mp.host.secret = null;
    mp.host.cardById = {};
    mp.myCard = null;
    mp.host.players.forEach((p) => { p.alive = true; p.ready = false; });
    mpResetTimer(MP_DISCUSS_DEFAULT);
    hostSyncPub();
    hostBroadcast();
  }

  function hostKick(id, name) {
    confirmDialog({
      titleKey: 'remove_player_confirm', confirmKey: 'remove_action',
      icon: 'log-out', tone: 'danger',
    }).then((ok) => {
      if (!ok || !mp || !mp.amHost) return;
      Net.kick(id);
      hostOnLeave(id);
    });
  }

  // ---------------- CLIENT ----------------
  function clientOnMessage(msg) {
    if (!mp || mp.amHost || !msg) return;
    switch (msg.t) {
      case 'welcome': mpSetStatus('ok'); break;
      case 'state':
        mp.pub = msg.pub;
        if (mp.pub.phase === 'lobby') mp.myCard = null;
        mpApplyRemoteTimer(mp.pub.timer);
        if (!mp.joined) mpEnterRoom(); // first state from the host = we're in the room
        renderMP();
        break;
      case 'card': mp.myCard = msg.card; if (mp.joined) renderMP(); break;
      case 'timer': mpApplyRemoteTimer(msg.timer); break;
      case 'reject': mpHandleReject(msg.reason); break;
      case 'kicked': mpHandleKicked(); break;
      case 'host-left': mpHandleHostLeft(); break;
    }
  }

  function mpHandleReject(reason) {
    mpJoinFailed(reason === 'full' ? 'room_full' : 'game_in_progress');
  }
  function mpHandleKicked() { toast(I18n.tt('kicked_msg')); mpTeardown(); showScreen('home'); }
  function mpHandleHostLeft() { toast(I18n.tt('host_left')); mpTeardown(); showScreen('home'); }
  function mpHandleLost() {
    confirmDialog({
      titleKey: 'connection_lost', confirmKey: 'home', cancelKey: 'cancel', icon: 'wifi-off', tone: 'danger',
    }).then(() => { mpTeardown(); showScreen('home'); });
  }

  function mpOnNetError(e) {
    if (!mp) return;
    const t = e && e.type;
    if (!mp.amHost && !mp.joined) {
      // any error before we've made it into the room keeps us on the Join screen
      mpJoinFailed(t === 'no-room' ? 'no_room_found' : 'net_error');
      return;
    }
    if (t === 'no-room') { toast(I18n.tt('no_room_found')); mpBackToJoin(); return; }
    toast(I18n.tt('net_error'));
    if (mp.status === 'connecting') mpBackToJoin();
  }

  function mpBackToJoin() {
    const wasHost = mp && mp.amHost;
    mpTeardown();
    showScreen(wasHost ? 'home' : 'mp-join');
    if (!wasHost) mpSetJoinBusy(false);
  }

  // ---------------- shared: status + teardown ----------------
  function mpSetStatus(s) {
    if (!mp) return;
    const prev = mp.status;
    mp.status = s;
    if (prev !== s) {
      if (s === 'reconnecting') toast(I18n.tt('reconnecting'));
      else if (s === 'ok' && prev === 'reconnecting') toast(I18n.tt('reconnected'));
    }
    mpUpdateConnChip();
  }

  function mpTeardown() {
    mpClearTimerInterval();
    if (mp) {
      if (mp._joinTimer) { clearTimeout(mp._joinTimer); mp._joinTimer = null; }
      try { if (mp.amHost) Net.close(); else Net.leave(); } catch (e) { /* ignore */ }
    }
    mp = null;
    mpRevealSeen = false;
    mpQrUrl = null;
  }

  function mpLeave() {
    const host = mp && mp.amHost;
    confirmDialog({
      titleKey: host ? 'close_room_confirm' : 'leave_room_confirm',
      messageKey: host ? 'close_room_message' : 'leave_room_message',
      confirmKey: 'leave_action', icon: 'log-out', tone: 'danger',
    }).then((ok) => {
      if (!ok) return;
      mpTeardown();
      showScreen('home');
    });
  }

  // ---------------- shared: timer ----------------
  function mpClearTimerInterval() { if (mpTimerId) { clearInterval(mpTimerId); mpTimerId = null; } }
  function mpResetTimer(sec) {
    mp.pub.timer = { running: false, remaining: sec, duration: sec };
    mpClearTimerInterval();
    mpTimerRender();
  }
  function mpStartTimer() {
    if (!mp || !mp.amHost) return;
    const t = mp.pub.timer;
    if (t.remaining <= 0) t.remaining = t.duration;
    t.running = true;
    mpClearTimerInterval();
    mpTimerId = setInterval(mpHostTick, 1000);
    mpBroadcastTimer();
    mpTimerRender();
    mpTimerControlsRender();
  }
  function mpStopTimer() {
    if (!mp) return;
    if (!mp.amHost) { mpClearTimerInterval(); return; }
    mp.pub.timer.running = false;
    mpClearTimerInterval();
    mpBroadcastTimer();
    mpTimerRender();
    mpTimerControlsRender();
  }
  function mpHostTick() {
    const t = mp.pub.timer;
    t.remaining--;
    if (t.remaining <= 0) {
      t.remaining = 0;
      t.running = false;
      mpClearTimerInterval();
      toast(I18n.tt('time_up'));
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    mpBroadcastTimer();
    mpTimerRender();
    if (!t.running) mpTimerControlsRender();
  }
  function mpSetTimerPreset(sec) {
    if (!mp || !mp.amHost) return;
    mp.pub.timer = { running: false, remaining: sec, duration: sec };
    mpClearTimerInterval();
    mpBroadcastTimer();
    mpTimerRender();
    mpTimerControlsRender();
  }
  function mpBroadcastTimer() { if (mp && mp.amHost) Net.broadcast({ t: 'timer', timer: mp.pub.timer }); }
  function mpApplyRemoteTimer(timer) {
    if (!mp || mp.amHost || !timer) return;
    mp.pub.timer = timer;
    mpClearTimerInterval();
    if (timer.running && timer.remaining > 0) {
      mpTimerId = setInterval(() => {
        const t = mp.pub.timer;
        if (t.remaining > 0) { t.remaining--; mpTimerRender(); }
        if (t.remaining <= 0) mpClearTimerInterval();
      }, 1000);
    }
    mpTimerRender();
  }
  function mpTimerRender() {
    if (!mp) return;
    const t = mp.pub.timer || { remaining: 0, duration: MP_DISCUSS_DEFAULT };
    const d = $('#mp-timer-display');
    if (d) { d.textContent = fmt(Math.max(0, t.remaining)); d.classList.toggle('warn', t.remaining <= 10); }
    const bar = $('#mp-timer-bar-fill');
    if (bar) bar.style.width = (t.duration ? (Math.max(0, t.remaining) / t.duration) * 100 : 0) + '%';
  }
  function mpTimerControlsRender() {
    const tog = $('#mp-timer-toggle');
    if (!tog || !mp) return;
    const running = mp.pub.timer && mp.pub.timer.running;
    tog.innerHTML = running
      ? Icons.svg('pause', 'icon-s') + '<span>' + I18n.t('timer_pause') + '</span>'
      : Icons.svg('play', 'icon-s') + '<span>' + I18n.t('timer_start') + '</span>';
    const dur = mp.pub.timer && mp.pub.timer.duration;
    $$('[data-mp-timer-set]').forEach((b) => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-mp-timer-set'), 10) === dur);
    });
  }

  // ---------------- render dispatch ----------------
  function mpApplyRoleVis() {
    const host = !!(mp && mp.amHost);
    $$('.host-only').forEach((el) => { el.hidden = !host; });
    $$('.client-only').forEach((el) => { el.hidden = host; });
  }

  function mpShow(name) {
    const el = document.getElementById('screen-' + name);
    if (el && !el.classList.contains('active')) showScreen(name);
  }

  function renderMP() {
    if (!mp) return;
    const ph = mp.pub.phase;
    const entering = mp._ph !== ph;
    mp._ph = ph;

    let screen = 'mp-lobby';
    if (ph === 'reveal') screen = 'mp-reveal';
    else if (ph === 'discuss') screen = 'mp-round';
    else if (ph === 'vote') screen = 'mp-vote';
    else if (ph === 'outcome' || ph === 'gameover') screen = 'mp-outcome';

    if (ph === 'reveal' && entering) {
      mpRevealSeen = false;
      const cover = $('#mp-peek-cover');
      if (cover) cover.style.transform = 'translateY(0)';
    }

    mpShow(screen);
    mpApplyRoleVis();
    mpUpdateConnChip();

    if (ph === 'lobby') mpRenderLobby();
    else if (ph === 'reveal') mpRenderReveal();
    else if (ph === 'discuss') mpRenderRound();
    else if (ph === 'vote') mpRenderVote();
    else mpRenderOutcome();
  }

  function mpUpdateConnChip() {
    const active = $('.screen.active');
    if (!active) return;
    const chip = active.querySelector('.conn-chip');
    if (!chip) return;
    const s = mp ? mp.status : 'lost';
    let cls = 'ok', txt = I18n.t('online');
    if (s === 'connecting') { cls = 'warn'; txt = I18n.t('connecting'); }
    else if (s === 'reconnecting') { cls = 'warn'; txt = I18n.t('reconnecting'); }
    else if (s === 'lost') { cls = 'bad'; txt = I18n.t('connection_lost'); }
    chip.className = 'conn-chip ' + cls;
    chip.textContent = txt;
    chip.hidden = false;
  }

  function mpRenderConnecting() {
    $('#mp-room-code').textContent = '····';
    $('#mp-roster').innerHTML = '';
    $('#mp-player-count').textContent = '0';
    const wait = $('#mp-lobby-wait');
    wait.hidden = false;
    wait.textContent = I18n.tt(mp && mp.amHost ? 'creating_room' : 'connecting');
    $('#mp-qr').hidden = true;
    mpUpdateConnChip();
  }

  // ---------------- render: lobby ----------------
  function mpRenderLobby() {
    $('#mp-lobby-title').textContent = I18n.t(mp.amHost ? 'lobby_host_title' : 'lobby_title');
    secEl($('#mp-lobby-sub'), mp.amHost ? 'lobby_host_title' : 'lobby_title');
    $('#mp-room-label').textContent = I18n.tt(mp.amHost ? 'share_code' : 'lobby_title');
    $('#mp-room-code').textContent = mp.code || '····';

    if (mp.code && !mp._qrDone) { mpEnsureQR(mpJoinUrl()); mp._qrDone = true; }

    mpRenderRoster($('#mp-roster'));
    $('#mp-player-count').textContent = mp.pub.players.length;

    if (mp.amHost) {
      mpUpdateImpHint();
      const conn = mp.pub.players.filter((p) => p.connected).length;
      $('#mp-start-btn').disabled = conn < MP_MIN_PLAYERS;
      const wait = $('#mp-lobby-wait');
      if (conn < MP_MIN_PLAYERS) {
        wait.hidden = false;
        wait.textContent = I18n.t('need_players_mp').replace(/\{min\}/g, MP_MIN_PLAYERS);
      } else {
        wait.hidden = true;
      }
    } else {
      const wait = $('#mp-lobby-wait');
      wait.hidden = false;
      const catKey = mp.pub.config.category;
      const cat = catKey === 'all'
        ? I18n.t('all_categories')
        : (CATEGORIES[catKey] ? I18n.of(CATEGORIES[catKey]) : '');
      wait.textContent = mp.pub.config.imposters + ' ' + I18n.t('imposters_count') + ' · ' + cat + ' — ' + I18n.t('waiting_host');
    }
  }

  function mpRenderRoster(wrap) {
    wrap.innerHTML = '';
    mp.pub.players.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'roster-item' + (p.connected ? '' : ' is-off');

      const av = document.createElement('div');
      av.className = 'r-avatar';
      av.textContent = (p.name || '?').trim().charAt(0) || '?';

      const nm = document.createElement('div');
      nm.className = 'r-name';
      nm.textContent = p.name;

      const tags = document.createElement('div');
      tags.className = 'r-tags';
      if (p.id === mp.myId) {
        const y = document.createElement('span');
        y.className = 'r-badge you';
        y.textContent = I18n.t('you_label');
        tags.appendChild(y);
      }
      if (p.isHost) {
        const h = document.createElement('span');
        h.className = 'r-badge host';
        h.innerHTML = Icons.svg('crown', 'icon-s') + I18n.t('host_label');
        tags.appendChild(h);
      }
      if (mp.pub.phase === 'reveal' && p.ready) {
        const r = document.createElement('span');
        r.className = 'r-badge ready';
        r.innerHTML = Icons.svg('check', 'icon-s');
        tags.appendChild(r);
      }

      const dot = document.createElement('span');
      dot.className = 'r-dot' + (p.connected ? '' : ' off');

      item.appendChild(av);
      item.appendChild(nm);
      item.appendChild(tags);
      item.appendChild(dot);

      if (mp.amHost && !p.isHost && mp.pub.phase === 'lobby') {
        const k = document.createElement('button');
        k.className = 'r-kick';
        k.setAttribute('aria-label', 'Remove');
        k.innerHTML = Icons.svg('x', 'icon-s');
        k.addEventListener('click', () => hostKick(p.id, p.name));
        item.appendChild(k);
      }
      wrap.appendChild(item);
    });
  }

  function mpUpdateImpHint() {
    const players = mp.host.players.filter((p) => p.connected).length;
    const maxImp = maxImposters(players);
    if (mp.host.config.imposters > maxImp) mp.host.config.imposters = maxImp;
    const fill = (str) => str.replace('{max}', maxImp).replace('{p}', players);
    $('#mp-imp-hint').innerHTML = fill(I18n.t('imp_hint')) + I18n.secSpan(fill(I18n.s('imp_hint')));
    $('#mp-val-imposters').textContent = mp.host.config.imposters;
  }

  function mpJoinUrl() {
    return location.origin + location.pathname + '?join=' + (mp.code || '');
  }

  // ---------------- render: reveal ----------------
  function mpCardHTML(card) {
    if (!card) return '<p class="pass-instruction">' + I18n.t('connecting') + '</p>';
    if (card.imposter) {
      return card.word
        ? '<div class="imposter-card">' +
            '<div class="impo-mark">' + Icons.svg('mask', 'icon-l') + '</div>' +
            '<p class="impo-title">' + biSpan('imposter_title') + '</p>' +
            '<div class="impo-hint">' +
              '<span class="impo-hint-label">' + biSpan('imposter_hint_label') + '</span>' +
              wordBlock(card.word) +
            '</div>' +
            '<p class="impo-sub">' + biBr('imposter_hint_sub') + '</p>' +
          '</div>'
        : '<div class="imposter-card">' +
            '<div class="impo-mark">' + Icons.svg('mask', 'icon-l') + '</div>' +
            '<p class="impo-title">' + biSpan('imposter_title') + '</p>' +
            '<p class="impo-sub">' + biBr('imposter_sub') + '</p>' +
          '</div>';
    }
    return '<div>' + wordBlock(card.word) + '</div>';
  }

  function mpRenderReveal() {
    const me = mpMe();
    $('#mp-reveal-name').textContent = me ? me.name : mp.myName;
    $('#mp-peek-content').innerHTML = mpCardHTML(mp.myCard);

    const ready = !!(me && me.ready);
    const btn = $('#mp-ready-btn');
    const label = $('#mp-ready-label');
    if (ready) { btn.disabled = true; label.innerHTML = biSpan('youre_ready'); }
    else { btn.disabled = !mpRevealSeen; label.innerHTML = biSpan('im_ready'); }

    const alive = mp.pub.players.filter((p) => p.alive);
    const readyN = alive.filter((p) => p.ready).length;
    const rc = $('#mp-ready-count');
    rc.textContent = (readyN >= alive.length && alive.length > 0)
      ? I18n.t('everyone_ready')
      : readyN + ' / ' + alive.length + ' ' + I18n.t('ready_word');
  }

  function mpDoReady() {
    const me = mpMe();
    if (!me || me.ready) return;
    if (mp.amHost) { hostSetReady(mp.myId, true); return; }
    Net.sendHost({ t: 'ready' });
    $('#mp-ready-btn').disabled = true;
    $('#mp-ready-label').innerHTML = biSpan('youre_ready');
  }

  // ---------------- render: discussion ----------------
  function mpRenderRound() {
    $('#mp-round-chip').textContent = I18n.t('round_word') + ' ' + mp.pub.round;
    const st = $('#mp-round-starter');
    const starter = mp.pub.starterId ? mpPlayerPub(mp.pub.starterId) : null;
    if (starter) {
      const fill = (s) => s.replace('{name}', esc(starter.name));
      st.innerHTML = fill(I18n.t('discuss_starter')) + I18n.secSpan(fill(I18n.s('discuss_starter')));
      st.hidden = false;
    } else {
      st.hidden = true;
    }
    mpRenderAlive($('#mp-alive-chips'));
    mpTimerRender();
    mpTimerControlsRender();
  }

  function mpRenderAlive(wrap) {
    wrap.innerHTML = '';
    mp.pub.players.forEach((p) => {
      const chip = document.createElement('span');
      if (p.alive) {
        chip.className = 'p-chip' + (p.connected ? '' : ' is-off');
        chip.textContent = p.name;
      } else {
        const wasImp = mp.pub.revealed && mp.pub.revealed[p.id];
        chip.className = 'p-chip out' + (wasImp ? ' was-imp' : '');
        chip.innerHTML = '<span class="p-name">' + esc(p.name) + '</span>' + (wasImp ? Icons.svg('mask', 'icon-s') : '');
      }
      wrap.appendChild(chip);
    });
    const left = mp.pub.players.filter((p) => p.alive).length;
    const sum = document.createElement('p');
    sum.className = 'alive-sum';
    sum.innerHTML = left + ' ' + I18n.t('players_left') + I18n.secSpan(left + ' ' + I18n.s('players_left'));
    wrap.appendChild(sum);
  }

  // ---------------- render: voting (open ballots) ----------------
  function mpRenderVote() {
    const list = $('#mp-vote-list');
    list.innerHTML = '';
    const me = mpMe();
    const alive = mp.pub.players.filter((p) => p.alive);
    const voters = alive.filter((p) => p.connected);
    const iCanVote = !!(me && me.alive && me.connected && !mp.pub.voteClosed);
    const myVote = me ? mp.pub.votes[me.id] : undefined;

    const byTarget = {};
    Object.keys(mp.pub.votes).forEach((vid) => {
      const t = mp.pub.votes[vid];
      if (t === 'skip') return;
      (byTarget[t] = byTarget[t] || []).push(mpPlayerPub(vid));
    });

    const votedCount = voters.filter((p) => Object.prototype.hasOwnProperty.call(mp.pub.votes, p.id)).length;
    $('#mp-vote-count').textContent = votedCount + ' / ' + voters.length + ' ' + I18n.t('voted_count');

    alive.forEach((cand) => {
      const voted = byTarget[cand.id] || [];
      const isMe = me && cand.id === me.id;
      const clickable = iCanVote && !isMe;
      const el = document.createElement(clickable ? 'button' : 'div');
      el.className = 'cand' + (myVote === cand.id ? ' mine' : '') + (clickable ? '' : ' locked');
      const pct = voters.length ? Math.round((voted.length / voters.length) * 100) : 0;
      const voterChips = voted.length
        ? '<div class="cand-voters">' + voted.map((v) =>
            '<span class="voter-chip' + (me && v && v.id === me.id ? ' mark' : '') + '">' + esc(v ? v.name : '?') + '</span>').join('') + '</div>'
        : '';
      el.innerHTML =
        '<div class="cand-top">' +
          '<span class="cand-name">' + esc(cand.name) + (isMe ? ' <span class="cand-you">' + I18n.t('you_label') + '</span>' : '') + '</span>' +
          '<span class="cand-count"><b>' + voted.length + '</b> ' + I18n.t('votes_word') + '</span>' +
        '</div>' +
        '<div class="cand-bar"><i style="width:' + pct + '%"></i></div>' +
        voterChips;
      if (clickable) el.addEventListener('click', () => mpCastVote(cand.id));
      list.appendChild(el);
    });

    const skipBtn = $('#mp-vote-skip');
    skipBtn.classList.toggle('mine', myVote === 'skip');
    skipBtn.disabled = !iCanVote;

    // who hasn't voted yet
    let vwait = document.getElementById('mp-vote-wait');
    if (!vwait) {
      vwait = document.createElement('p');
      vwait.id = 'mp-vote-wait';
      vwait.className = 'wait-note';
      $('#screen-mp-vote .play-wrap').appendChild(vwait);
    }
    const pending = voters.filter((p) => !Object.prototype.hasOwnProperty.call(mp.pub.votes, p.id)).map((p) => p.name);
    vwait.hidden = pending.length === 0;
    if (pending.length) vwait.textContent = I18n.t('waiting_votes') + ' ' + pending.join(', ');
  }

  function mpCastVote(target) {
    const me = mpMe();
    if (!me || !me.alive || mp.pub.voteClosed) return;
    if (mp.amHost) hostRecordVote(mp.myId, target);
    else Net.sendHost({ t: 'vote', target });
  }

  // ---------------- render: outcome / game over ----------------
  function mpRenderOutcome() {
    const over = mp.pub.phase === 'gameover';
    const titleEl = $('#mp-outcome-title');
    const titleEn = $('#mp-outcome-title-en');
    const body = $('#mp-outcome-body');
    const actions = $('#mp-outcome-actions');
    const wait = $('#mp-outcome-wait');
    actions.innerHTML = '';
    wait.hidden = true;

    if (over) {
      const civWin = mp.pub.winner === 'civilians';
      const key = civWin ? 'civilians_win' : 'imposters_win';
      titleEl.textContent = I18n.t(key) + '!';
      secEl(titleEn, key);
      body.innerHTML = mpGameOverBody();
      if (mp.amHost) {
        const again = mkBtn('btn btn-primary btn-lg', 'rotate', 'play_again');
        again.addEventListener('click', hostPlayAgain);
        actions.appendChild(again);
      } else {
        wait.hidden = false;
        wait.textContent = I18n.t('waiting_host_action');
      }
      const home = mkBtn('btn btn-ghost', 'log-out', 'home');
      home.addEventListener('click', () => { mpTeardown(); showScreen('home'); });
      actions.appendChild(home);
    } else if (mp.pub.skipped) {
      titleEl.textContent = I18n.t('round_skipped_mp');
      secEl(titleEn, 'round_skipped_mp');
      body.innerHTML = mpSkipBody();
      mpOutcomeContinue(actions, wait);
    } else {
      titleEl.textContent = I18n.t('voted_out');
      secEl(titleEn, 'voted_out');
      body.innerHTML = mpEjectBody();
      mpOutcomeContinue(actions, wait);
    }
  }

  function mpOutcomeContinue(actions, wait) {
    if (mp.amHost) {
      const cont = mkBtn('btn btn-primary btn-lg', 'arrow-right', 'next_round');
      cont.addEventListener('click', hostNextRound);
      actions.appendChild(cont);
    } else {
      wait.hidden = false;
      wait.textContent = I18n.t('waiting_host_action');
    }
  }

  function mpSkipBody() {
    const msg = mp.pub.skipReason === 'none' ? I18n.t('no_votes_removal') : I18n.t('tie_no_removal');
    return '<div class="outcome-card">' +
      '<div class="outcome-mark">' + Icons.svg('users', 'icon-l') + '</div>' +
      '<p class="outcome-role">' + esc(msg) + '</p></div>';
  }

  function mpEjectBody() {
    const e = mp.pub.lastElim;
    if (!e) return mpSkipBody();
    const left = mp.pub.players.filter((p) => p.alive).length;
    return '<div class="outcome-card ' + (e.wasImp ? 'good' : 'bad') + '">' +
        '<div class="outcome-mark">' + Icons.svg(e.wasImp ? 'mask' : 'users', 'icon-l') + '</div>' +
        '<p class="outcome-name">' + esc(e.name) + '</p>' +
        '<p class="outcome-role">' + biSpan(e.wasImp ? 'was_imposter' : 'was_innocent') + '</p>' +
      '</div>' +
      '<p class="outcome-note">' + left + ' ' + I18n.t('players_left') +
        (I18n.secondary ? '<br/>' + I18n.secSpan(left + ' ' + I18n.s('players_left')) : '') + '</p>';
  }

  function mpGameOverBody() {
    const r = mp.pub.reveal;
    const civWin = mp.pub.winner === 'civilians';
    const c = CATEGORIES[r.word.cat];
    const roster = r.roster.map((p) =>
      '<div class="roster-row">' +
        '<span class="roster-name">' + esc(p.name) + '</span>' +
        '<span class="roster-tags">' +
          '<span class="chip ' + (p.imposter ? 'chip-danger' : 'chip-civ') + '">' + I18n.t(p.imposter ? 'imposter_role' : 'civilian_role') + '</span>' +
          '<span class="roster-state ' + (p.alive ? 'in' : 'out') + '">' + I18n.t(p.alive ? 'in_play' : 'out_play') + I18n.secSpan(' · ' + I18n.s(p.alive ? 'in_play' : 'out_play')) + '</span>' +
        '</span>' +
      '</div>').join('');
    return '<div class="outcome-card ' + (civWin ? 'good' : 'bad') + '">' +
        '<div class="outcome-mark">' + Icons.svg(civWin ? 'users' : 'mask', 'icon-l') + '</div>' +
        '<p class="outcome-role big">' + biSpan(civWin ? 'all_imposters_caught' : 'imposters_parity') + '</p>' +
      '</div>' +
      '<div class="word-reveal">' +
        '<span class="word-cat">' + (c ? I18n.of(c) + I18n.secSpan(' · ' + I18n.ofs(c)) : '') + '</span>' +
        '<p class="word-gu">' + I18n.of(r.word) + (I18n.secondary ? ' <span class="word-en">(' + I18n.ofs(r.word) + ')</span>' : '') + '</p>' +
      '</div>' +
      '<div class="roster">' + roster + '</div>';
  }

  // ---------------- QR / share ----------------
  function mpEnsureQR(url) {
    if (mpQrUrl === url) return;
    const box = $('#mp-qr');
    const canvas = $('#mp-qr-canvas');
    if (!box || !canvas) return;
    function draw() {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        canvas.innerHTML = qr.createImgTag(6, 2);
        box.hidden = false;
        mpQrUrl = url;
      } catch (e) { box.hidden = true; }
    }
    if (window.qrcode) { draw(); return; }
    const s = document.createElement('script');
    s.src = 'js/vendor/qrcode.js?v=19';
    s.onload = draw;
    s.onerror = () => { box.hidden = true; };
    document.head.appendChild(s);
  }

  function mpShareRoom() {
    if (!mp || !mp.code) return;
    const url = mpJoinUrl();
    const text = I18n.t('share_text') + ' ' + mp.code;
    if (navigator.share) {
      navigator.share({ title: I18n.t('app_name'), text, url }).catch(() => {});
    } else {
      mpCopy(url, 'link_copied');
    }
  }
  function mpCopy(str, toastKey) {
    const done = () => toast(I18n.tt(toastKey));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(done, () => mpCopyFallback(str, done));
    } else {
      mpCopyFallback(str, done);
    }
  }
  function mpCopyFallback(str, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) { /* ignore */ }
  }

  // ---------------- in-app QR scanner (Join) ----------------
  // Opens the camera and reads the host's QR to fill the room code. Uses the
  // native BarcodeDetector where available (Android Chrome) and falls back to
  // the vendored jsQR decoder (iOS Safari, Firefox). The camera stream is always
  // released on close / success / when the tab is hidden.
  let mpScan = null;

  function mpOpenScanner() {
    if (mpScan) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast(I18n.tt('camera_unsupported'));
      return;
    }
    const video = $('#scanner-video');
    $('#scanner').hidden = false;
    mpScan = { stream: null, video, raf: null, timer: null, detector: null, canvas: null, ctx: null, useNative: false, done: false };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (!mpScan) { stream.getTracks().forEach((t) => t.stop()); return; }
        mpScan.stream = stream;
        video.srcObject = stream;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
        mpStartDecode();
      })
      .catch((err) => {
        const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        toast(I18n.tt(denied ? 'camera_denied' : 'camera_error'));
        mpCloseScanner();
      });
  }

  function mpStartDecode() {
    if ('BarcodeDetector' in window) {
      try {
        mpScan.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        mpScan.useNative = true;
        mpScanLoop();
        return;
      } catch (e) { /* fall through to jsQR */ }
    }
    mpScan.canvas = document.createElement('canvas');
    mpScan.ctx = mpScan.canvas.getContext('2d', { willReadFrequently: true });
    if (window.jsQR) { mpScanLoop(); return; }
    const s = document.createElement('script');
    s.src = 'js/vendor/jsqr.min.js?v=19';
    s.onload = () => { if (mpScan) mpScanLoop(); };
    s.onerror = () => { toast(I18n.tt('camera_unsupported')); mpCloseScanner(); };
    document.head.appendChild(s);
  }

  function mpScanLoop() {
    if (!mpScan || mpScan.done) return;
    const video = mpScan.video;
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        if (mpScan.useNative) {
          mpScan.detector.detect(video)
            .then((codes) => { if (codes && codes.length) mpScanHit(codes[0].rawValue); })
            .catch(() => {});
        } else if (window.jsQR) {
          const w = video.videoWidth, h = video.videoHeight;
          const scale = Math.min(1, 640 / Math.max(w, h)); // downscale big frames for speed
          const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
          mpScan.canvas.width = cw; mpScan.canvas.height = ch;
          mpScan.ctx.drawImage(video, 0, 0, cw, ch);
          const img = mpScan.ctx.getImageData(0, 0, cw, ch);
          const res = window.jsQR(img.data, cw, ch, { inversionAttempts: 'dontInvert' });
          if (res && res.data) mpScanHit(res.data);
        }
      } catch (e) { /* skip a bad frame */ }
    }
    if (mpScan && !mpScan.done) {
      mpScan.timer = setTimeout(() => { if (mpScan && !mpScan.done) mpScan.raf = requestAnimationFrame(mpScanLoop); }, 140);
    }
  }

  function mpScanHit(rawValue) {
    if (!mpScan || mpScan.done) return;
    const code = mpCodeFromScan(rawValue);
    if (code.length < 4) return; // not one of our room QRs — keep scanning
    mpScan.done = true;
    if (navigator.vibrate) navigator.vibrate(30);
    mpCloseScanner();
    $('#mp-join-code').value = code;
    toast(I18n.tt('scan_found'));
    const name = mpCleanName($('#mp-join-name').value);
    if (name) {
      if (!netReady()) return;
      mpStoreName(name);
      mpStartJoin(code, name); // name already set — connect straight away
    } else {
      $('#mp-join-name').focus();
    }
  }

  // Our QR encodes the join URL (…?join=CODE); accept that, or a bare 4-char code.
  function mpCodeFromScan(value) {
    const v = String(value || '').trim();
    try {
      const j = new URL(v).searchParams.get('join');
      return j ? j.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : '';
    } catch (e) { /* not a URL */ }
    const bare = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return bare.length === 4 ? bare : '';
  }

  function mpCloseScanner() {
    const overlay = $('#scanner');
    if (!mpScan) { if (overlay) overlay.hidden = true; return; }
    mpScan.done = true;
    if (mpScan.timer) clearTimeout(mpScan.timer);
    if (mpScan.raf) cancelAnimationFrame(mpScan.raf);
    if (mpScan.stream) { try { mpScan.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ } }
    const video = $('#scanner-video');
    try { video.pause(); video.srcObject = null; } catch (e) { /* ignore */ }
    if (overlay) overlay.hidden = true;
    mpScan = null;
  }

  // ---------------- language refresh ----------------
  function mpApplyLang() {
    if (!mp) return;
    mpBuildCategorySelect();
    renderMP();
  }
  function mpBuildCategorySelect() {
    const sel = $('#mp-sel-category');
    if (!sel) return;
    sel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = I18n.tt('all_categories');
    sel.appendChild(optAll);
    Object.keys(CATEGORIES).forEach((key) => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = pairOf(CATEGORIES[key]);
      sel.appendChild(o);
    });
    sel.value = (mp && mp.amHost) ? mp.host.config.category : 'all';
  }

  // ---------------- wiring ----------------
  function mpWirePeek() {
    const cover = $('#mp-peek-cover');
    const stack = $('#mp-peek-stack');
    if (!cover || !stack) return;
    const show = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      cover.style.transform = 'translateY(88%)';
      if (!mpRevealSeen) {
        mpRevealSeen = true;
        const btn = $('#mp-ready-btn');
        const me = mpMe();
        if (btn && !(me && me.ready)) btn.disabled = false;
        if (navigator.vibrate) navigator.vibrate(12);
      }
    };
    const hide = () => { cover.style.transform = 'translateY(0)'; };
    if (window.PointerEvent) {
      cover.addEventListener('pointerdown', (e) => {
        show(e);
        try { cover.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      });
      cover.addEventListener('pointerup', hide);
      cover.addEventListener('pointercancel', hide);
      cover.addEventListener('lostpointercapture', hide);
    } else {
      cover.addEventListener('touchstart', show, { passive: false });
      cover.addEventListener('touchend', hide);
      cover.addEventListener('touchcancel', hide);
    }
    stack.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function mpInit() {
    // home entry points
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mp]');
      if (!b) return;
      const kind = b.getAttribute('data-mp');
      if (kind === 'host') mpEnterHost();
      else if (kind === 'join') mpEnterJoin();
    });

    // join screen
    $('#mp-join-code').addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    });
    $('#mp-join-btn').addEventListener('click', () => {
      const code = $('#mp-join-code').value.trim().toUpperCase();
      const name = mpCleanName($('#mp-join-name').value);
      if (code.length < 4 || !name) { toast(I18n.tt('enter_code_name')); return; }
      if (!netReady()) return;
      mpStoreName(name);
      mpStartJoin(code, name);
    });

    // in-app QR scanner
    $('#mp-scan-btn').addEventListener('click', mpOpenScanner);
    $('#scanner-close').addEventListener('click', mpCloseScanner);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#scanner').hidden) mpCloseScanner(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && mpScan) mpCloseScanner(); });

    // lobby
    $('#mp-share-btn').addEventListener('click', mpShareRoom);
    $('#mp-copy-btn').addEventListener('click', () => { if (mp && mp.code) mpCopy(mp.code, 'code_copied'); });
    $('#mp-start-btn').addEventListener('click', () => { if (mp && mp.amHost) hostStartGame(); });
    $('#mp-lobby-leave').addEventListener('click', mpLeave);
    $('#mp-host-name').addEventListener('input', function () {
      if (!mp || !mp.amHost) return;
      const n = mpCleanName(this.value) || I18n.t('host_name_default');
      mp.myName = n;
      const self = hostPlayer(mp.myId);
      if (self) self.name = n;
      mpStoreName(n);
      hostSyncPub();
      hostBroadcast();
    });
    $('#mp-sel-category').addEventListener('change', function () {
      if (!mp || !mp.amHost) return;
      mp.host.config.category = this.value;
      hostSyncPub();
      hostBroadcast();
    });
    // multiplayer imposter stepper
    const impStepper = document.querySelector('[data-stepper="mp-imposters"]');
    if (impStepper) {
      impStepper.addEventListener('click', (e) => {
        const b = e.target.closest('[data-delta]');
        if (!b || !mp || !mp.amHost) return;
        const delta = parseInt(b.getAttribute('data-delta'), 10);
        const players = mp.host.players.filter((p) => p.connected).length;
        const maxImp = maxImposters(players);
        mp.host.config.imposters = Math.min(maxImp, Math.max(1, mp.host.config.imposters + delta));
        hostSyncPub();
        hostBroadcast();
      });
    }

    // reveal
    mpWirePeek();
    $('#mp-ready-btn').addEventListener('click', mpDoReady);
    $('#mp-force-discuss').addEventListener('click', () => { if (mp && mp.amHost) hostBeginDiscuss(); });
    $('#mp-reveal-leave').addEventListener('click', mpLeave);

    // discussion
    $('#mp-open-voting').addEventListener('click', () => { if (mp && mp.amHost) hostOpenVoting(); });
    $('#mp-round-leave').addEventListener('click', mpLeave);
    $('#mp-timer-toggle').addEventListener('click', () => {
      if (!mp || !mp.amHost) return;
      if (mp.pub.timer.running) mpStopTimer(); else mpStartTimer();
    });
    $('#mp-timer-reset').addEventListener('click', () => { if (mp && mp.amHost) mpSetTimerPreset(mp.pub.timer.duration); });
    $$('[data-mp-timer-set]').forEach((b) => {
      b.addEventListener('click', () => { if (mp && mp.amHost) mpSetTimerPreset(parseInt(b.getAttribute('data-mp-timer-set'), 10)); });
    });

    // voting
    $('#mp-vote-skip').addEventListener('click', () => mpCastVote('skip'));
    $('#mp-close-voting').addEventListener('click', () => { if (mp && mp.amHost) hostResolveVote(); });
    $('#mp-vote-leave').addEventListener('click', mpLeave);

    // outcome
    $('#mp-outcome-leave').addEventListener('click', mpLeave);

    // deep-link: ?join=CODE opens the join screen prefilled
    try {
      const code = new URLSearchParams(location.search).get('join');
      if (code) {
        mpEnterJoin();
        $('#mp-join-code').value = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        setTimeout(() => { $('#mp-join-name').focus(); }, 60);
      }
    } catch (e) { /* ignore */ }
  }

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
    Icons.hydrate(document); // swap static [data-icon] placeholders for inline SVGs
    I18n.load();
    // one-time listeners (kept out of the rebuildable render fns so they don't stack)
    $('#sel-category').addEventListener('change', () => { config.category = $('#sel-category').value; });
    $('#mode-toggle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      config.mode = b.dataset.mode;
      renderModeToggle();
    });
    $('#lang-btn').addEventListener('click', openLangSheet);
    $('#lang-sheet-close').addEventListener('click', closeLangSheet);
    $('#lang-sheet').addEventListener('click', (e) => { if (e.target === $('#lang-sheet')) closeLangSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#lang-sheet').hidden) closeLangSheet(); });
    clampImposters();
    applyLang(); // renders static i18n, builds selects, renders setup for the current languages
    setTimer(timerDuration);
    mpBuildCategorySelect(); // populate the multiplayer category <select> (no data-i18n)
    mpInit();                // wire up the "Host a game" multiplayer mode

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  init();
})();
