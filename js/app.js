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

  function buildLangPickers() {
    const langs = I18n.LANGS;
    const pri = $('#sel-primary');
    const sec = $('#sel-secondary');
    if (!pri || !sec) return;
    pri.innerHTML = '';
    Object.keys(langs).forEach((code) => {
      const o = document.createElement('option');
      o.value = code; o.textContent = langs[code];
      pri.appendChild(o);
    });
    pri.value = I18n.primary;
    // secondary = "none" + every language except the current primary
    sec.innerHTML = '';
    const none = document.createElement('option');
    none.value = ''; none.textContent = '—';
    sec.appendChild(none);
    Object.keys(langs).forEach((code) => {
      if (code === I18n.primary) return;
      const o = document.createElement('option');
      o.value = code; o.textContent = langs[code];
      sec.appendChild(o);
    });
    sec.value = I18n.secondary || '';
  }

  function applyLang() {
    I18n.apply(document);   // static [data-i18n*] markup
    buildLangPickers();     // reflect current selection + valid secondary set
    buildCategorySelect();  // <option> text can't use data-i18n
    refreshPresetSelect();
    renderSetup();          // imposter hint + name placeholders
    $('#preset-name').placeholder = I18n.tt('preset_name_ph');
  }

  function onPrimaryChange() {
    const newP = $('#sel-primary').value;
    // choosing the current secondary as primary swaps the two (old primary
    // becomes the secondary) rather than dropping the secondary
    const newS = newP === I18n.secondary ? I18n.primary : I18n.secondary;
    I18n.set(newP, newS);
    applyLang();
  }
  function onSecondaryChange() {
    I18n.set(I18n.primary, $('#sel-secondary').value);
    applyLang();
  }

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
      if (!game || confirm(I18n.tt('quit_confirm'))) {
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
    const fill = (str) => str.replace('{max}', maxImp).replace('{p}', config.players);
    $('#imposter-hint').innerHTML = fill(I18n.t('imp_hint')) + I18n.secSpan(fill(I18n.s('imp_hint')));
    renderNameInputs();
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
    config.names = (p.names || []).slice();
    config.names.length = config.players;
    clampImposters();
    $('#sel-category').value = config.category;
    renderSetup();
    toast(I18n.tt('preset_loaded'));
  });

  // ================= START GAME =================
  $('#btn-start').addEventListener('click', () => {
    // pick vocab pool
    let pool = VOCAB;
    if (config.category !== 'all') {
      pool = VOCAB.filter((w) => w.cat === config.category);
    }
    if (!pool.length) { toast(I18n.tt('no_words')); return; }

    const word = pool[Math.floor(Math.random() * pool.length)];

    // assign roles: true = imposter
    const roles = new Array(config.players).fill(false);
    const idxs = shuffle([...Array(config.players).keys()]).slice(0, config.imposters);
    idxs.forEach((i) => { roles[i] = true; });

    const names = [];
    for (let i = 0; i < config.players; i++) {
      names.push((config.names[i] && config.names[i].trim()) || `${I18n.t('player')} ${i + 1}`);
    }

    game = { word, category: config.category, roles, names, index: 0 };
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

  function populatePeekContent() {
    const i = game.index;
    const content = $('#peek-content');
    if (game.roles[i]) {
      content.innerHTML = `
        <div class="imposter-card">
          <div class="impo-mark">${Icons.svg('mask', 'icon-l')}</div>
          <p class="impo-title">${biSpan('imposter_title')}</p>
          <p class="impo-sub">${biBr('imposter_sub')}</p>
        </div>`;
    } else {
      const c = CATEGORIES[game.word.cat];
      content.innerHTML = `
        <div>
          <span class="word-cat">${c ? I18n.of(c) + I18n.secSpan(' · ' + I18n.ofs(c)) : ''}</span>
          <p class="word-gu">${I18n.of(game.word)}</p>
          ${I18n.secondary ? `<p class="word-en">(${I18n.ofs(game.word)})</p>` : ''}
        </div>`;
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

  // ================= ROUNDS / VOTING =================
  // After the reveal, the game runs in rounds. Round 1 opens straight into a
  // discussion; every later round opens with a suggesting phase, then a
  // discussion. Each discussion ends in a choice: Vote someone out, or Skip
  // the round. A vote ejects a player, reveals their role, and checks the win
  // conditions; a skip just moves on. Civilians win when no imposters remain;
  // imposters win once they equal or outnumber the surviving civilians.

  let voteSelection = null; // index chosen on the vote screen

  function startRounds() {
    game.alive = new Array(game.names.length).fill(true);
    game.round = 1;
    game.phase = 'discuss'; // 'suggest' | 'discuss'
    game.eliminations = [];
    game.saved = false;
    showScreen('round');
    renderRound();
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
    const suggest = game.phase === 'suggest';
    const titleKey = suggest ? 'round_suggest_title' : 'round_discuss_title';
    $('#round-chip').textContent = `${I18n.t('round_word')} ${game.round}`;
    $('#round-title').textContent = I18n.t(titleKey);
    secEl($('#round-title-en'), titleKey);
    $('#round-desc').innerHTML = biBr(suggest ? 'suggest_desc' : 'discuss_desc');

    renderAlive($('#alive-chips'));

    stopTimer();
    setTimer(timerDuration);

    $('#btn-to-discuss').hidden = !suggest;
    $('#btn-to-vote').hidden = suggest;
    $('#btn-skip-round').hidden = suggest;
  }

  function nextRound() {
    game.round += 1;
    game.phase = 'suggest';
    showScreen('round');
    renderRound();
  }

  // suggesting phase -> discussion phase
  $('#btn-to-discuss').addEventListener('click', () => {
    if (!game) return;
    game.phase = 'discuss';
    renderRound();
  });

  // discussion -> vote
  $('#btn-to-vote').addEventListener('click', () => {
    if (!game) return;
    stopTimer();
    showScreen('vote');
    renderVote();
  });

  // discussion -> skip round (no ejection, no win check)
  $('#btn-skip-round').addEventListener('click', () => {
    if (!game) return;
    stopTimer();
    toast(I18n.tt('round_skipped'));
    nextRound();
  });

  // ---- vote screen ----
  function renderVote() {
    voteSelection = null;
    $('#vote-chip').textContent = `${I18n.t('round_word')} ${game.round}`;
    const list = $('#vote-list');
    list.innerHTML = '';
    game.names.forEach((n, i) => {
      if (!game.alive[i]) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vote-option';
      b.dataset.idx = i;
      b.innerHTML = `<span class="vote-name">${n}</span><span class="vote-radio"></span>`;
      list.appendChild(b);
    });
    $('#btn-confirm-vote').disabled = true;
  }

  $('#vote-list').addEventListener('click', (e) => {
    const opt = e.target.closest('.vote-option');
    if (!opt) return;
    voteSelection = parseInt(opt.dataset.idx, 10);
    $$('.vote-option', $('#vote-list')).forEach((o) => o.classList.toggle('selected', o === opt));
    $('#btn-confirm-vote').disabled = false;
  });

  $('#btn-vote-back').addEventListener('click', () => {
    if (!game) return;
    game.phase = 'discuss';
    showScreen('round');
    renderRound();
  });

  $('#btn-confirm-vote').addEventListener('click', () => {
    if (!game || voteSelection == null || !game.alive[voteSelection]) return;
    eliminate(voteSelection);
  });

  function eliminate(idx) {
    game.alive[idx] = false;
    const wasImp = game.roles[idx];
    game.eliminations.push({ name: game.names[idx], imposter: wasImp, round: game.round });
    if (navigator.vibrate) navigator.vibrate(wasImp ? [30, 60, 30] : 30);
    const winner = checkWinner();
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
    if (!confirm(I18n.tt('clear_history_confirm'))) return;
    await DB.clearHistory();
    renderHistory();
    toast(I18n.tt('history_cleared'));
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
    Icons.hydrate(document); // swap static [data-icon] placeholders for inline SVGs
    I18n.load();
    // one-time listeners (kept out of the rebuildable render fns so they don't stack)
    $('#sel-category').addEventListener('change', () => { config.category = $('#sel-category').value; });
    $('#sel-primary').addEventListener('change', onPrimaryChange);
    $('#sel-secondary').addEventListener('change', onSecondaryChange);
    clampImposters();
    applyLang(); // renders static i18n, builds selects, renders setup for the current languages
    setTimer(timerDuration);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  init();
})();
