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
    game_mode: { gu: 'રમતની રીત', en: 'Game mode' },
    mode_classic: { gu: 'ક્લાસિક', en: 'Classic' },
    mode_linear: { gu: 'ક્રમિક', en: 'Linear' },
    mode_classic_hint: { gu: 'ખેલાડીઓનો ક્રમ અવ્યવસ્થિત — બેઠક દર વખતે બદલાય.', en: 'Players are shuffled — seating changes each game.' },
    mode_linear_hint: { gu: 'ખેલાડીઓનો ક્રમ યથાવત — બધું ગોઠવણ પ્રમાણે જ ચાલે.', en: 'Fixed order — reveal, turns & removal follow the setup order.' },

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
    imposter_hint_label: { gu: 'તમારો મળતો-આવતો શબ્દ', en: 'Your related word' },
    imposter_hint_sub: { gu: 'આનાથી હોશિયારીથી બહાનું બનાવો — ભળી જાઓ, પકડાશો નહીં!', en: 'Bluff with it — blend in, avoid getting caught' },
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
    discuss_starter: { gu: '{name} ચર્ચા શરૂ કરે', en: '{name} starts the discussion' },
    round_word: { gu: 'રાઉન્ડ', en: 'Round' },
    players_left: { gu: 'ખેલાડી બાકી', en: 'still in play' },
    vote_someone_out: { gu: 'કોને કાઢવો પસંદ કરો', en: 'Choose who to remove' },
    skip_round: { gu: 'રાઉન્ડ છોડો — કોઈને નહીં', en: 'Skip round — remove no one' },
    round_skipped: { gu: 'રાઉન્ડ છોડ્યો', en: 'Round skipped' },

    // ---- select (group picks one player to remove) ----
    select_title: { gu: 'કોને બહાર કાઢવો?', en: 'Who to remove?' },
    select_desc: { gu: 'બધા સાથે મળીને એક ખેલાડીને પસંદ કરો.', en: 'Together, pick one player to remove.' },
    remove_confirm: { gu: 'બહાર કાઢો', en: 'Remove player' },

    // ---- outcome ----
    result: { gu: 'પરિણામ', en: 'Result' },
    voted_out: { gu: 'બહાર કાઢ્યો', en: 'Removed' },
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
    clear_history_message: { gu: 'સાચવેલી બધી રમતો કાયમ માટે કાઢી નાખવામાં આવશે.', en: 'All saved games will be permanently deleted.' },
    clear_history_action: { gu: 'કાઢી નાખો', en: 'Delete all' },
    history_cleared: { gu: 'ઇતિહાસ સાફ થયો', en: 'History cleared' },
    players_count: { gu: 'ખેલાડી', en: 'players' },
    imposters_count: { gu: 'ઈમ્પોસ્ટર', en: 'imposters' },
    rounds_count: { gu: 'રાઉન્ડ', en: 'rounds' },
    imposters_label: { gu: 'ઈમ્પોસ્ટર', en: 'Imposters' },

    // ---- misc ----
    quit_confirm: { gu: 'રમત છોડવી છે?', en: 'Quit this game?' },
    quit_message: { gu: 'તમારી ચાલુ રમત ખોવાઈ જશે.', en: 'Your current game will be lost.' },
    quit_action: { gu: 'છોડો', en: 'Quit' },
    cancel: { gu: 'રદ કરો', en: 'Cancel' },
    language_title: { gu: 'ભાષા', en: 'Language' },
    primary_label: { gu: 'મુખ્ય ભાષા', en: 'Primary language' },
    secondary_label: { gu: 'બીજી ભાષા', en: 'Secondary language' },
    none: { gu: 'કોઈ નહીં', en: 'None' },

    // ---- multiplayer: home entry points ----
    play_local: { gu: 'રમો', en: 'Play' },
    play_local_sub: { gu: 'એક ફોન — વારાફરતી', en: 'One phone — pass around' },
    mp_host: { gu: 'રમત હોસ્ટ કરો', en: 'Host a game' },
    mp_host_sub: { gu: 'બધા પોતાના ફોનથી', en: 'Everyone on their own phone' },
    mp_join: { gu: 'રમતમાં જોડાઓ', en: 'Join a game' },
    mp_join_sub: { gu: 'રૂમ કોડથી જોડાઓ', en: 'Enter a room code' },

    // ---- multiplayer: join ----
    join_title: { gu: 'રમતમાં જોડાઓ', en: 'Join a game' },
    room_code: { gu: 'રૂમ કોડ', en: 'Room code' },
    room_code_ph: { gu: 'કોડ દાખલ કરો', en: 'Enter code' },
    your_name: { gu: 'તમારું નામ', en: 'Your name' },
    your_name_ph: { gu: 'તમારું નામ', en: 'Your name' },
    join_action: { gu: 'જોડાઓ', en: 'Join' },
    join_hint: { gu: 'હોસ્ટ પાસેથી કોડ મેળવો.', en: 'Ask the host for the room code.' },
    connecting: { gu: 'જોડાઈ રહ્યું છે…', en: 'Connecting…' },
    join_timeout: { gu: 'રૂમ સુધી પહોંચી શકાયું નહીં — કોડ તપાસો અને હોસ્ટ ઑનલાઇન છે કે નહીં તે જુઓ', en: "Couldn't reach the room — check the code and that the host is online" },
    or_label: { gu: 'અથવા', en: 'or' },
    scan_qr: { gu: 'QR સ્કેન કરો', en: 'Scan QR code' },
    scan_title: { gu: 'QR સ્કેન કરો', en: 'Scan QR' },
    scan_hint: { gu: 'હોસ્ટનો QR કોડ ફ્રેમમાં રાખો', en: "Point at the host's QR code" },
    camera_denied: { gu: 'કૅમેરાની પરવાનગી ના મળી', en: 'Camera permission denied' },
    camera_error: { gu: 'કૅમેરા શરૂ ન થઈ શક્યો', en: "Couldn't start the camera" },
    camera_unsupported: { gu: 'આ ડિવાઇસ સ્કૅન સપોર્ટ કરતું નથી — કોડ ટાઈપ કરો', en: "Scanning isn't supported here — type the code" },
    scan_found: { gu: 'કોડ મળ્યો', en: 'Code found' },
    enter_code_name: { gu: 'કોડ અને નામ દાખલ કરો', en: 'Enter a code and your name' },

    // ---- multiplayer: lobby ----
    lobby_host_title: { gu: 'તમારો રૂમ', en: 'Your room' },
    lobby_title: { gu: 'રૂમ', en: 'Room' },
    creating_room: { gu: 'રૂમ બની રહ્યો છે…', en: 'Creating room…' },
    share_code: { gu: 'આ કોડ મિત્રો સાથે શેર કરો', en: 'Share this code with friends' },
    scan_to_join: { gu: 'જોડાવા સ્કેન કરો', en: 'Scan to join' },
    share_room: { gu: 'શેર', en: 'Share' },
    copy_code: { gu: 'કૉપિ', en: 'Copy' },
    code_copied: { gu: 'કોડ કૉપિ થયો', en: 'Code copied' },
    link_copied: { gu: 'લિંક કૉપિ થઈ', en: 'Link copied' },
    share_text: { gu: 'મારી ઈમ્પોસ્ટર રમતમાં જોડાઓ! કોડ', en: 'Join my Imposter game! Code' },
    players_joined: { gu: 'ખેલાડીઓ', en: 'Players' },
    waiting_host: { gu: 'હોસ્ટ રમત શરૂ કરે તેની રાહ જુઓ…', en: 'Waiting for the host to start…' },
    waiting_players: { gu: 'ખેલાડીઓ જોડાય તેની રાહ જુઓ…', en: 'Waiting for players to join…' },
    you_label: { gu: 'તમે', en: 'You' },
    host_label: { gu: 'હોસ્ટ', en: 'Host' },
    host_name_default: { gu: 'હોસ્ટ', en: 'Host' },
    need_players_mp: { gu: 'શરૂ કરવા ઓછામાં ઓછા {min} ખેલાડી જોઈએ', en: 'Need at least {min} players to start' },

    // ---- multiplayer: connection status ----
    host_left: { gu: 'હોસ્ટે રમત છોડી દીધી', en: 'The host left the game' },
    connection_lost: { gu: 'જોડાણ તૂટી ગયું', en: 'Connection lost' },
    reconnecting: { gu: 'ફરી જોડાઈ રહ્યું છે…', en: 'Reconnecting…' },
    reconnected: { gu: 'ફરી જોડાયું', en: 'Reconnected' },
    left_room: { gu: 'રૂમ છોડ્યો', en: 'Left the room' },
    online: { gu: 'ઑનલાઇન', en: 'Online' },
    offline_dot: { gu: 'ઑફલાઇન', en: 'Offline' },
    kicked_msg: { gu: 'હોસ્ટે તમને દૂર કર્યા', en: 'The host removed you' },
    game_in_progress: { gu: 'રમત ચાલુ છે — હમણાં જોડાઈ શકાતું નથી', en: 'A game is in progress — cannot join now' },
    room_full: { gu: 'રૂમ ભરાઈ ગયો છે', en: 'The room is full' },
    no_room_found: { gu: 'આ કોડનો રૂમ મળ્યો નથી', en: 'No room found for that code' },
    net_error: { gu: 'નેટવર્ક ભૂલ — ફરી પ્રયાસ કરો', en: 'Network error — please try again' },
    webrtc_unsupported: { gu: 'આ બ્રાઉઝર મલ્ટિપ્લેયર સપોર્ટ કરતું નથી', en: "This browser doesn't support multiplayer" },
    leave_room_confirm: { gu: 'રૂમ છોડવો છે?', en: 'Leave this room?' },
    close_room_confirm: { gu: 'રૂમ બંધ કરવો છે?', en: 'Close this room?' },
    close_room_message: { gu: 'રૂમ બંધ થશે અને બધા ખેલાડીઓ બહાર નીકળી જશે.', en: 'The room will close and all players will be removed.' },
    leave_room_message: { gu: 'તમે રમતમાંથી બહાર નીકળી જશો.', en: 'You will leave the game.' },
    leave_action: { gu: 'છોડો', en: 'Leave' },
    remove_player_confirm: { gu: 'આ ખેલાડીને દૂર કરવો છે?', en: 'Remove this player?' },
    remove_action: { gu: 'દૂર કરો', en: 'Remove' },

    // ---- multiplayer: reveal (own card on own device) ----
    mp_reveal_title: { gu: 'તમારું કાર્ડ', en: 'Your card' },
    hold_to_see: { gu: 'જોવા માટે દબાવી રાખો', en: 'Press & hold to see' },
    release_hides_mp: { gu: 'છોડતાં જ છુપાઈ જશે — બાજુવાળા ન જુએ', en: 'Release to hide — keep it from neighbours' },
    im_ready: { gu: 'હું તૈયાર છું', en: "I'm ready" },
    youre_ready: { gu: 'તમે તૈયાર છો', en: "You're ready" },
    ready_word: { gu: 'તૈયાર', en: 'ready' },
    waiting_others: { gu: 'બીજા ખેલાડીઓની રાહ જુઓ…', en: 'Waiting for others…' },
    everyone_ready: { gu: 'બધા તૈયાર છે!', en: 'Everyone is ready!' },

    // ---- multiplayer: discussion / host controls ----
    open_voting: { gu: 'મતદાન શરૂ કરો', en: 'Open voting' },
    waiting_host_action: { gu: 'હોસ્ટ આગળ વધારે તેની રાહ જુઓ…', en: 'Waiting for the host…' },
    timer_host_only: { gu: 'ટાઈમર હોસ્ટ ચલાવે છે', en: 'The host controls the timer' },

    // ---- multiplayer: voting (everyone votes; open ballots) ----
    mp_vote_title: { gu: 'મત આપો', en: 'Vote' },
    mp_vote_desc: { gu: 'કોને બહાર કાઢવો? બધા પોતાના ફોનથી મત આપો — કોણે કોને મત આપ્યો તે દેખાશે.', en: 'Who to remove? Everyone votes from their own phone — you can see who voted for whom.' },
    skip_vote: { gu: 'છોડો — કોઈને નહીં', en: 'Skip — no one' },
    votes_word: { gu: 'મત', en: 'votes' },
    not_voted_yet: { gu: 'હજી મત નથી આપ્યો', en: 'not voted yet' },
    voted_skip: { gu: 'છોડ્યું', en: 'skipped' },
    waiting_votes: { gu: 'બીજા ખેલાડીઓના મતની રાહ…', en: 'Waiting for votes…' },
    close_voting: { gu: 'મતદાન બંધ કરો ને પરિણામ જુઓ', en: 'Close voting & reveal' },
    all_voted: { gu: 'બધાએ મત આપ્યો', en: 'Everyone has voted' },
    voted_count: { gu: 'મત આપ્યા', en: 'voted' },
    tie_no_removal: { gu: 'મત બરાબરી — કોઈને બહાર કાઢ્યા નહીં', en: 'Tie — no one removed' },
    no_votes_removal: { gu: 'કોઈ મત નહીં — કોઈને બહાર કાઢ્યા નહીં', en: 'No votes — no one removed' },
    your_turn_vote: { gu: 'તમારો મત આપો', en: 'Cast your vote' },

    // ---- multiplayer: outcome ----
    play_again: { gu: 'ફરી રમો', en: 'Play again' },
    back_to_lobby: { gu: 'લોબીમાં પાછા', en: 'Back to lobby' },
    round_skipped_mp: { gu: 'રાઉન્ડ છોડ્યો', en: 'Round skipped' },

    // ---- how to play (values may contain <b> markup) ----
    how_title: { gu: 'કેવી રીતે રમવું', en: 'How to play' },
    how_mp: {
      gu: '<b>ઓનલાઇન (હોસ્ટ કરો કે જોડાઓ):</b> એક જણ રૂમ બનાવે, બીજા કોડ કે QR થી જોડાય. દરેક પોતાના ફોન પર પોતાનું કાર્ડ જુએ, ટાઈમર બધા માટે એકસાથે ચાલે, અને બધા પોતાના ફોનથી મત આપે — કોણે કોને મત આપ્યો તે બધાને દેખાય.',
      en: '<b>Online (host or join):</b> one person creates a room, others join by code or QR. Everyone sees their own card on their own phone, the timer runs in sync for all, and everyone votes from their device — with who-voted-for-whom visible to all.',
    },
    how_1: {
      gu: '<b>ગોઠવણ:</b> ખેલાડીઓ અને ઈમ્પોસ્ટરની સંખ્યા પસંદ કરો.',
      en: '<b>Setup:</b> Pick the number of players &amp; imposters.',
    },
    how_2: {
      gu: '<b>જુઓ:</b> ફોન એક-એક કરીને દરેક ખેલાડીને આપો. કાર્ડ પકડીને નીચે ખેંચો એટલે શબ્દ દેખાય; છોડી દેતાં જ છુપાઈ જાય.',
      en: '<b>Reveal:</b> Pass the phone around. Hold &amp; pull the card down to peek at your word — releasing hides it again.',
    },
    how_3: {
      gu: '<b>ઈમ્પોસ્ટર</b>ને મળતો-આવતો શબ્દ મળે છે (સાચો નહીં) — તેનાથી હોશિયારીથી બહાનું બનાવે!',
      en: '<b>Imposters</b> get a related word (not the real one) — just enough to bluff cleverly.',
    },
    how_4: {
      gu: '<b>ચર્ચા:</b> દરેક ખેલાડી શબ્દ વિશે એક સંકેત આપે — શબ્દ બોલ્યા વગર.',
      en: '<b>Discuss:</b> Each player gives one clue without saying the word.',
    },
    how_5: {
      gu: '<b>પસંદ કરો કે છોડો:</b> બધા સાથે મળીને એક ખેલાડીને બહાર કાઢવા પસંદ કરો, અથવા રાઉન્ડ <b>છોડો</b>. બહાર નીકળેલાનું પાત્ર ખૂલે.',
      en: '<b>Remove or skip:</b> Together, pick one player to remove — or <b>skip</b> the round. The removed player’s role is revealed.',
    },
    how_6: {
      gu: '<b>આગળના રાઉન્ડ:</b> જો રમત ચાલુ રહે તો ફરી એ જ ચર્ચા સ્ક્રીન આવે — ટાઈમર ચાલુ જ રહે — મતદાન સુધી.',
      en: '<b>Next rounds:</b> If the game continues, you return to the same discussion screen — the timer keeps running — then vote again.',
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
