/*
 * i18n — UI string catalog + primary/secondary language rendering.
 *
 * Any registered language can be chosen for the PRIMARY slot and any (or none)
 * for the SECONDARY slot, independently. Hybrid = a secondary is set (shown as
 * small text alongside the primary); Normal = secondary is "none".
 *
 * Adding a language later is a data-only change:
 *   1. add its code + native name to LANGS,
 *   2. add its translations to each entry in STRINGS,
 *   3. add the same key to every word/category in js/vocab.js.
 * No engine changes are needed.
 *
 * Markup wiring:
 *   data-i18n="key"      — element content = primary (+ secondary span). Optional
 *                          data-i18n-sep="br|dot|space" controls the separator.
 *   data-i18n-pri="key"  — element content = primary only.
 *   data-i18n-sec="key"  — element content = secondary only; hidden when none.
 * Strings assembled in JS use I18n.t()/s()/tt() and I18n.of()/ofs() (the latter
 * for {gu,en,…} objects such as vocab words and categories).
 */
(function () {
  'use strict';

  // code -> native display name (shown in the language pickers)
  const LANGS = {
    gu: 'ગુજરાતી',
    en: 'English',
  };
  const DEFAULT_PRIMARY = 'gu';
  const DEFAULT_SECONDARY = 'en';

  const STRINGS = {
    // ---- home ----
    app_name: { gu: 'ઈમ્પોસ્ટર', en: 'Imposter' },
    subtitle: { gu: 'પાર્ટી ગેમ', en: 'Party game' },
    new_game: { gu: 'નવી રમત', en: 'New game' },
    history: { gu: 'ઇતિહાસ', en: 'History' },
    how_to_play: { gu: 'કેવી રીતે રમવું', en: 'How to play' },
    install_app: { gu: 'ઍપ ઇન્સ્ટોલ કરો', en: 'Install app' },

    // ---- setup ----
    setup_title: { gu: 'રમતની ગોઠવણ', en: 'Game setup' },
    players: { gu: 'ખેલાડીઓ', en: 'Players' },
    imposters: { gu: 'ઈમ્પોસ્ટર', en: 'Imposters' },
    category: { gu: 'શ્રેણી', en: 'Category' },
    player_names: { gu: 'ખેલાડીઓના નામ', en: 'Player names' },
    presets: { gu: 'પ્રીસેટ', en: 'Presets' },
    load: { gu: 'લોડ', en: 'Load' },
    save: { gu: 'સાચવો', en: 'Save' },
    start_game: { gu: 'રમત શરૂ કરો', en: 'Start game' },
    all_categories: { gu: 'બધી શ્રેણી', en: 'All categories' },
    load_preset_ph: { gu: 'પ્રીસેટ પસંદ કરો…', en: 'Load preset' },
    preset_name_ph: { gu: 'પ્રીસેટનું નામ', en: 'Preset name' },
    enter_name: { gu: 'પ્રીસેટનું નામ લખો', en: 'Enter a name' },
    preset_saved: { gu: 'પ્રીસેટ સાચવ્યું', en: 'Preset saved' },
    preset_loaded: { gu: 'પ્રીસેટ લોડ થયું', en: 'Preset loaded' },
    no_words: { gu: 'આ શ્રેણીમાં શબ્દ નથી', en: 'No words in this category' },
    player: { gu: 'ખેલાડી', en: 'Player' }, // default name + placeholder base
    imp_hint: { gu: '૧ થી {max} સુધી ({p} ખેલાડીઓ માટે)', en: '1 to {max} (for {p} players)' },

    // ---- reveal ----
    reveal_title: { gu: 'શબ્દ જુઓ', en: 'Secret reveal' },
    seen: { gu: 'જોયું', en: 'Seen' },
    cover_hint: { gu: 'કાર્ડ પકડીને નીચે ખેંચો', en: 'Hold & pull down to peek' },
    peek_hint: { gu: 'છોડી દેતાં જ શબ્દ પાછો છુપાઈ જશે', en: 'Releasing hides it again' },
    next_player: { gu: 'આગળ આપો', en: 'Next player' },
    start_discussion: { gu: 'ચર્ચા શરૂ કરો', en: 'Start discussion' },
    pass_to_first: { gu: 'ફોન આ ખેલાડીને આપો', en: 'Pass the phone to' },
    pass_to_next: { gu: 'હવે ફોન આગળ આપો', en: 'Pass the phone to' },
    imposter_title: { gu: 'તમે ઈમ્પોસ્ટર છો', en: 'You are the imposter' },
    imposter_sub: { gu: 'શબ્દ જાણ્યા વગર બહાનું બનાવો!', en: 'Bluff it — you have no word' },

    // ---- round ----
    players_in_play: { gu: 'ખેલાડીઓ', en: 'Players in play' },
    timer: { gu: 'ટાઈમર', en: 'Timer' },
    timer_start: { gu: 'શરૂ', en: 'Start' },
    timer_pause: { gu: 'થોભો', en: 'Pause' },
    round_suggest_title: { gu: 'સૂચન રાઉન્ડ', en: 'Suggesting round' },
    round_discuss_title: { gu: 'ચર્ચા રાઉન્ડ', en: 'Discussion round' },
    suggest_desc: { gu: 'દરેક ખેલાડી કારણ સાથે સૂચવે કે કોણ શંકાસ્પદ છે.', en: 'Each player suggests who seems suspicious — with a reason.' },
    discuss_desc: { gu: 'દરેક ખેલાડી શબ્દ વિશે એક સંકેત આપે — શબ્દ બોલ્યા વગર. પછી મત આપો કે રાઉન્ડ છોડો.', en: 'Each gives one clue about the word — then vote or skip.' },
    round_word: { gu: 'રાઉન્ડ', en: 'Round' },
    players_left: { gu: 'ખેલાડી બાકી', en: 'still in play' },
    vote_someone_out: { gu: 'મત આપો', en: 'Vote someone out' },
    skip_round: { gu: 'રાઉન્ડ છોડો — મત નહીં', en: 'Skip round — no vote' },
    round_skipped: { gu: 'રાઉન્ડ છોડ્યો', en: 'Round skipped' },

    // ---- vote ----
    vote_title: { gu: 'કોને બહાર કાઢવો?', en: 'Vote someone out' },
    vote_desc: { gu: 'જૂથે જેને સૌથી વધુ મત આપ્યા તે ખેલાડી પસંદ કરો.', en: 'Select the player the group voted out.' },
    vote_out: { gu: 'બહાર કાઢો', en: 'Vote out' },

    // ---- outcome ----
    result: { gu: 'પરિણામ', en: 'Result' },
    voted_out: { gu: 'બહાર કાઢ્યો', en: 'Voted out' },
    civilians_win: { gu: 'ખેલાડીઓ જીત્યા', en: 'Civilians win' },
    imposters_win: { gu: 'ઈમ્પોસ્ટર જીત્યા', en: 'Imposters win' },
    was_imposter: { gu: 'ઈમ્પોસ્ટર હતો!', en: 'was an imposter' },
    was_innocent: { gu: 'નિર્દોષ ખેલાડી હતો', en: 'was innocent' },
    game_continues: { gu: 'રમત ચાલુ છે', en: 'the game continues' },
    all_imposters_caught: { gu: 'બધા ઈમ્પોસ્ટર પકડાયા!', en: 'All imposters caught' },
    imposters_parity: { gu: 'ઈમ્પોસ્ટર બહુમતીમાં આવી ગયા', en: 'Imposters reached parity' },
    imposter_role: { gu: 'ઈમ્પોસ્ટર', en: 'Imposter' },
    civilian_role: { gu: 'ખેલાડી', en: 'Civilian' },
    in_play: { gu: 'બાકી', en: 'in' },
    out_play: { gu: 'બહાર', en: 'out' },
    next_round: { gu: 'આગળનો રાઉન્ડ', en: 'Next round' },
    home: { gu: 'મુખ્ય પાનું', en: 'Home' },
    time_up: { gu: 'સમય પૂરો!', en: 'Time up' },

    // ---- history ----
    history_title: { gu: 'ઇતિહાસ', en: 'Game history' },
    no_games: { gu: 'હજી કોઈ રમત નથી.', en: 'No games yet.' },
    clear_history_confirm: { gu: 'બધો ઇતિહાસ કાઢી નાખવો છે?', en: 'Clear all history?' },
    history_cleared: { gu: 'ઇતિહાસ સાફ થયો', en: 'History cleared' },
    players_count: { gu: 'ખેલાડી', en: 'players' },
    imposters_count: { gu: 'ઈમ્પોસ્ટર', en: 'imposters' },
    rounds_count: { gu: 'રાઉન્ડ', en: 'rounds' },
    imposters_label: { gu: 'ઈમ્પોસ્ટર', en: 'Imposters' },

    // ---- misc ----
    quit_confirm: { gu: 'રમત છોડવી છે?', en: 'Quit this game?' },
    language_title: { gu: 'ભાષા', en: 'Language' },
    primary_label: { gu: 'મુખ્ય ભાષા', en: 'Primary language' },
    secondary_label: { gu: 'બીજી ભાષા', en: 'Secondary language' },
    none: { gu: 'કોઈ નહીં', en: 'None' },

    // ---- how to play (values may contain <b> markup) ----
    how_title: { gu: 'કેવી રીતે રમવું', en: 'How to play' },
    how_1: {
      gu: '<b>ગોઠવણ:</b> ખેલાડીઓ અને ઈમ્પોસ્ટરની સંખ્યા પસંદ કરો.',
      en: '<b>Setup:</b> Pick the number of players &amp; imposters.',
    },
    how_2: {
      gu: '<b>જુઓ:</b> ફોન એક-એક કરીને દરેક ખેલાડીને આપો. કાર્ડ પકડીને નીચે ખેંચો એટલે શબ્દ દેખાય; છોડી દેતાં જ છુપાઈ જાય.',
      en: '<b>Reveal:</b> Pass the phone around. Hold &amp; pull the card down to peek at your word — releasing hides it again.',
    },
    how_3: {
      gu: '<b>ઈમ્પોસ્ટર</b>ને શબ્દ મળતો નથી — તેણે બહાનું બનાવવું પડે!',
      en: '<b>Imposters</b> get no word — they must bluff.',
    },
    how_4: {
      gu: '<b>ચર્ચા:</b> દરેક ખેલાડી શબ્દ વિશે એક સંકેત આપે — શબ્દ બોલ્યા વગર.',
      en: '<b>Discuss:</b> Each player gives one clue without saying the word.',
    },
    how_5: {
      gu: '<b>મત આપો કે છોડો:</b> દરેક રાઉન્ડમાં જૂથ કાં તો એક ખેલાડીને બહાર કાઢવા <b>મત આપે</b>, અથવા <b>રાઉન્ડ છોડે</b>. બહાર નીકળેલો ખેલાડી ઈમ્પોસ્ટર હતો કે નિર્દોષ તે ખૂલે.',
      en: '<b>Vote or skip:</b> Each round the group either <b>votes</b> a player out or <b>skips</b>. The ejected player\'s role is revealed.',
    },
    how_6: {
      gu: '<b>આગળના રાઉન્ડ:</b> જો રમત ચાલુ રહે તો સૂચન રાઉન્ડ પછી ફરી ચર્ચા રાઉન્ડ આવે — મતદાન સુધી.',
      en: '<b>Next rounds:</b> If the game continues, a suggesting round is followed by another discussion round — then vote again.',
    },
    how_7: {
      gu: '<b>જીત:</b> બધા ઈમ્પોસ્ટર બહાર નીકળે તો <b>ખેલાડીઓ જીતે</b>. ઈમ્પોસ્ટર બાકીના ખેલાડીઓ જેટલા કે વધુ થઈ જાય તો <b>ઈમ્પોસ્ટર જીતે</b>.',
      en: '<b>Winning:</b> Civilians win when all imposters are out. Imposters win once they equal or outnumber the civilians.',
    },
  };

  const PRI_KEY = 'imposter-lang-primary';
  const SEC_KEY = 'imposter-lang-secondary';

  let primary = DEFAULT_PRIMARY;
  let secondary = DEFAULT_SECONDARY; // '' / null means "none"

  function valid(code) { return code === '' || Object.prototype.hasOwnProperty.call(LANGS, code); }

  function load() {
    try {
      let p = localStorage.getItem(PRI_KEY);
      let s = localStorage.getItem(SEC_KEY);
      if (p === null && s === null) {
        // migrate from the earlier hybrid/normal setting
        const m = localStorage.getItem('imposter-lang-mode');
        if (m === 'normal') { p = 'gu'; s = ''; }
      }
      if (p !== null && valid(p) && p !== '') primary = p;
      if (s !== null && valid(s)) secondary = s;
    } catch (e) { /* ignore */ }
    if (secondary === primary) secondary = ''; // never duplicate
  }

  function persist() {
    try {
      localStorage.setItem(PRI_KEY, primary);
      localStorage.setItem(SEC_KEY, secondary || '');
    } catch (e) { /* ignore */ }
  }

  function set(p, s) {
    if (valid(p) && p !== '') primary = p;
    if (valid(s)) secondary = s;
    if (secondary === primary) secondary = '';
    persist();
  }

  // pick a language variant from any {gu, en, …} object, with fallbacks
  function variant(obj, code) {
    if (!obj) return '';
    return obj[code] != null ? obj[code]
      : obj.en != null ? obj.en
      : obj.gu != null ? obj.gu : '';
  }

  // catalog helpers
  function t(key) { return variant(STRINGS[key], primary); }
  function s(key) { return secondary ? variant(STRINGS[key], secondary) : ''; }
  function tt(key) { return secondary ? t(key) + ' (' + s(key) + ')' : t(key); }
  // object helpers (vocab words, categories)
  function of(obj) { return variant(obj, primary); }
  function ofs(obj) { return secondary ? variant(obj, secondary) : ''; }

  function secSpan(str) { return secondary && str ? '<span class="en">' + str + '</span>' : ''; }

  function apply(root) {
    const r = root || document;
    document.documentElement.classList.toggle('no-secondary', !secondary);

    r.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!STRINGS[key]) return;
      const sep = el.getAttribute('data-i18n-sep');
      let html = t(key);
      if (secondary) {
        const sv = s(key);
        if (sep === 'br') html += '<br/><span class="en">' + sv + '</span>';
        else if (sep === 'dot') html += '<span class="en"> · ' + sv + '</span>';
        else if (sep === 'space') html += ' <span class="en">' + sv + '</span>';
        else html += '<span class="en">' + sv + '</span>';
      }
      el.innerHTML = html;
    });
    r.querySelectorAll('[data-i18n-pri]').forEach((el) => {
      const key = el.getAttribute('data-i18n-pri');
      if (STRINGS[key]) el.innerHTML = t(key);
    });
    r.querySelectorAll('[data-i18n-sec]').forEach((el) => {
      const key = el.getAttribute('data-i18n-sec');
      if (!STRINGS[key]) return;
      if (secondary) { el.innerHTML = s(key); el.hidden = false; }
      else { el.hidden = true; }
    });
  }

  window.I18n = {
    LANGS, STRINGS,
    load, set, apply,
    t, s, tt, of, ofs, secSpan,
    get primary() { return primary; },
    get secondary() { return secondary; },
  };
})();
