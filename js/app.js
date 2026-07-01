/*
 * Imposter game — main application logic.
 * Screen router + game state machine + slide-to-reveal + timer + persistence.
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
      o.textContent = `${p.name} — ${p.players}👥 / ${p.imposters}🕵️`;
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
    toast('પ્રીસેટ સાચવ્યું ✓ (Preset saved)');
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
    $('#pass-instruction').textContent = i === 0 ? 'ફોન આપો… (Pass the phone)' : 'આગળના ખેલાડીને ફોન આપો…';
    $('#pass-player').textContent = game.names[i];
    resetSlider();
    $('#reveal-hidden').hidden = false;
    $('#reveal-shown').hidden = true;
    $('#reveal-content').innerHTML = '';
    $('#btn-next-player').hidden = true;
    $('#slider').style.display = '';
  }

  function revealCurrent() {
    const i = game.index;
    const isImposter = game.roles[i];
    const shown = $('#reveal-shown');
    const hidden = $('#reveal-hidden');
    const content = $('#reveal-content');

    if (isImposter) {
      content.innerHTML = `
        <div class="imposter-card">
          <div class="impo-emoji">🕵️</div>
          <p class="impo-title">તમે ઈમ્પોસ્ટર છો</p>
          <p class="impo-sub">You are the Imposter — બહાનું બનાવો! (bluff it)</p>
        </div>`;
    } else {
      const c = CATEGORIES[game.word.cat];
      content.innerHTML = `
        <p class="word-gu">${game.word.gu}</p>
        <p class="word-en">(${game.word.en})</p>
        <span class="word-cat">${c ? c.gu : ''}</span>`;
    }
    hidden.hidden = true;
    shown.hidden = false;
    $('#slider').style.display = 'none';

    const next = $('#btn-next-player');
    next.hidden = false;
    const last = game.index >= game.names.length - 1;
    next.innerHTML = last
      ? 'ચર્ચા શરૂ કરો <span class="en">Start discussion</span> →'
      : 'આગળ <span class="en">Next</span> →';
  }

  $('#btn-next-player').addEventListener('click', () => {
    if (game.index >= game.names.length - 1) {
      showScreen('play');
      prepPlayScreen();
    } else {
      startRevealFor(game.index + 1);
    }
  });

  // ---- slide-to-reveal control ----
  const slider = $('#slider');
  const knob = $('#slider-knob');
  const fill = $('#slider-fill');
  let dragging = false;

  function sliderGeom() {
    const rect = slider.getBoundingClientRect();
    const knobW = knob.offsetWidth;
    return { rect, knobW, max: rect.width - knobW - 8 };
  }

  function setKnob(x) {
    const { max } = sliderGeom();
    const clamped = Math.max(0, Math.min(max, x));
    knob.style.left = (clamped + 4) + 'px';
    fill.style.width = (clamped + knob.offsetWidth) + 'px';
    return clamped / max; // progress 0..1
  }

  function resetSlider() {
    dragging = false;
    slider.classList.remove('done');
    knob.style.left = '4px';
    fill.style.width = knob.offsetWidth + 'px';
  }

  function onDown(e) {
    if ($('#slider').style.display === 'none') return;
    dragging = true;
    knob.setPointerCapture && e.pointerId != null && knob.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    const { rect, knobW } = sliderGeom();
    const clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0].clientX);
    const x = clientX - rect.left - knobW / 2;
    const progress = setKnob(x);
    if (progress >= 0.9) {
      dragging = false;
      slider.classList.add('done');
      setKnob(sliderGeom().max);
      revealCurrent();
    }
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    if (!slider.classList.contains('done')) resetSlider();
  }

  knob.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  // touch fallback
  knob.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);

  // ================= PLAY / DISCUSSION =================
  function prepPlayScreen() {
    stopTimer();
    setTimer(timerDuration);
    $('#reveal-answer').hidden = true;
    $('#reveal-answer').innerHTML = '';
    $('#btn-show-word').hidden = false;
  }

  $('#btn-show-word').addEventListener('click', () => {
    const c = CATEGORIES[game.word.cat];
    const impNames = game.names.filter((_, i) => game.roles[i]);
    $('#reveal-answer').innerHTML = `
      <p class="word-gu">${game.word.gu} <span class="word-en">(${game.word.en})</span></p>
      <span class="word-cat">${c ? c.gu + ' · ' + c.en : ''}</span>
      <p class="impo-names">🕵️ ઈમ્પોસ્ટર: ${impNames.join(', ')}</p>`;
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
      toast(winner === 'civilians' ? 'ખેલાડીઓ જીત્યા! 🎉' : 'ઈમ્પોસ્ટર જીત્યા! 🕵️');
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

  function setTimer(sec) {
    timerDuration = sec;
    timerRemaining = sec;
    const d = $('#timer-display');
    d.textContent = fmt(timerRemaining);
    d.classList.remove('warn');
    $('#timer-toggle').textContent = '▶︎ શરૂ';
  }

  function tick() {
    timerRemaining--;
    const d = $('#timer-display');
    d.textContent = fmt(Math.max(0, timerRemaining));
    if (timerRemaining <= 10) d.classList.add('warn');
    if (timerRemaining <= 0) {
      stopTimer();
      toast('⏰ સમય પૂરો! (Time up)');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  function startTimer() {
    if (timerId) return;
    if (timerRemaining <= 0) timerRemaining = timerDuration;
    timerId = setInterval(tick, 1000);
    $('#timer-toggle').textContent = '⏸ થોભો';
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    $('#timer-toggle').textContent = '▶︎ શરૂ';
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
        ? '<span class="badge civ">👥 ખેલાડીઓ</span>'
        : '<span class="badge imp">🕵️ ઈમ્પોસ્ટર</span>';
      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <div class="h-top">
          <span class="h-word">${it.wordGu} <span class="en">(${it.wordEn})</span></span>
          <span class="h-date">${dateStr}</span>
        </div>
        <div class="h-meta">
          <span>👥 ${it.players}</span>
          <span>🕵️ ${it.imposters}</span>
          ${badge}
        </div>
        <div class="h-meta">ઈમ્પોસ્ટર: ${(it.imposterNames || []).join(', ') || '—'}</div>`;
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  init();
})();
