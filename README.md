# ઈમ્પોસ્ટર — Gujarati Imposter Game

An **Imposter** party game (like the famous "undercover / imposter" word game), playable two ways:

- **Play** — the classic **pass-the-phone** mode on a single device, fully offline.
- **Host a game** — a new **online multiplayer** mode where a host opens a room and friends
  **join from their own phones**: everyone sees their own card, shares one synchronised timer,
  and votes from their device with **who-voted-for-whom visible to all**. It's **peer-to-peer
  over WebRTC** — there is **no server to deploy or run** (see [Online multiplayer](#online-multiplayer-host-a-game)).

Fully bilingual (Gujarati + English out of the box) with a per-slot language picker — choose
any registered language as primary and any (or none) as secondary. Installable **PWA**; the
single-device game runs fully offline.

## How to play

1. **ગોઠવણ / Setup** — choose the number of **players** and **imposters**, and a **game mode** (**Classic** shuffles the seating each game; **Linear** keeps the exact setup order). Optionally name players and pick a word category. Save the setup as a **preset** for next time.
2. **જુઓ / Reveal** — pass the phone around. Each player **holds the card and pulls it down** to peek at their secret word; **releasing snaps the card back** and hides it again. Only then does **Next** unlock — so nobody can see the previous player's word, and peeking again is a visible gesture everyone would notice.
3. Everyone gets the **same secret word** — except the **imposter(s)**, who instead receive a **similar word from the same category** (never the real one). That related hint lets an imposter blend in and bluff intelligently instead of guessing blind.
4. **ચર્ચા / Discuss** — each player gives one clue about the word (without saying it). Use the built-in timer.
5. **પસંદ / Remove or Skip** — at the end of each discussion the group together **picks one player to remove** or **skips the round**. Removing a player reveals whether they were an imposter or innocent.
6. **રાઉન્ડ / Rounds** — if the game isn't over, a **suggesting round** is followed by another **discussion round**, then remove or skip again. This repeats until someone wins.
7. **જીત / Win** — **civilians win** once every imposter has been removed; **imposters win** the moment they equal or outnumber the surviving civilians. The result (with round count) is saved to **History**.

## Online multiplayer (Host a game)

The **Host a game** mode lets everyone play from **their own phone** instead of passing one device around.

1. **Host** taps **Host a game** → a room opens with a short **room code** and a **QR code**. Share either (there's a **Share** and **Copy** button, plus a `?join=CODE` deep link).
2. **Players** tap **Join a game** and either type the code, tap **Scan QR code** to read the host's QR with their camera **inside the app**, or open the shared link. The in-app scanner uses the native `BarcodeDetector` where available and falls back to a vendored **jsQR** decoder (so it works on iOS Safari / Firefox too); the camera is released as soon as a code is found or the scanner is closed.
3. The host sets imposters + category and taps **Start**. Now:
   - **everyone sees their own card** on their own screen (press-and-hold to reveal, so a neighbour can't peek);
   - the **discussion timer is shared** — the host starts/pauses it and it counts down in sync on every device;
   - when the host opens voting, **everyone votes from their phone** and the tally is **open** — you can see **who voted for whom**, live;
   - the player with the most votes is removed and their role is revealed to all (a tie removes no one). Win conditions are the same as the local game.
4. **Play again** returns the whole group to the lobby to run another round with the same players.

### How it works (protocol) — no server to deploy

- **Transport: WebRTC data channels, peer-to-peer.** Game data flows **directly between phones**; it never passes through a server we run.
- **Topology: host-authoritative star.** The host device is the single source of truth: it assigns roles, owns the timer, tallies votes and broadcasts a public snapshot to everyone. Each player's **private card is sent only to that player**, so no other device ever learns your role.
- **Signaling: the free public [PeerJS](https://peerjs.com) cloud broker.** WebRTC needs a brief rendezvous to exchange connection info — that (and only that) uses PeerJS's free hosted broker. **You don't deploy, run, pay for, or configure anything.** (The library is vendored locally in `js/vendor/`; no CDN, no build step.)
- **NAT traversal: public STUN.** Google's public STUN discovers each phone's public address so they can connect **directly** — which works across different networks. It does **not** help when a Wi‑Fi enables **"AP/client isolation"** (or blocks mDNS/multicast), which stops phones from reaching each other on the *same* network; that needs a TURN relay, and there's no reliable free no‑signup TURN to bundle. Simplest fix in that case: **use a phone hotspot** (the app tips you to), since hotspots don't isolate clients. To make it work on any network, set `window.MP_ICE_SERVERS` to your own relay (e.g. free TURN credentials from metered.ca — you run no server, just get a key).
- **Reconnection.** A stable per-tab id lets a dropped phone — or a page refresh — rejoin its seat; the host restores the player's card and state. If the id is briefly still held by the broker, the client transparently retries with a fresh one, so joining can't get stuck.

### Limitations (the honest bits)

- **Connectivity.** Direct peer-to-peer works across different networks, but some Wi‑Fi networks (client isolation, blocked mDNS, symmetric NAT, strict firewalls) block same‑network phone‑to‑phone traffic — the counter‑intuitive case where *different* networks connect but the *same* Wi‑Fi doesn't. There's no pure‑P2P fix for that; either **use a phone hotspot** (the in‑app tip; hotspots don't isolate clients), turn off "AP/client isolation" on the router, or add your own TURN relay via `window.MP_ICE_SERVERS`. On failure, joining times out with a clear, stage‑aware message instead of hanging.
- **The host must stay in the app.** As the authority, if the host leaves, the room closes for everyone. (Backgrounding a phone can also pause its timers.)
- **Trust model.** Because there's no neutral server, the **host device technically holds every role** in memory. The UI never shows them, but a determined host could inspect them — fine for a friendly party game; a neutral server (which the no-infra requirement rules out) would be needed to prevent it.
- **Party-sized rooms.** Capped at 12 players (a sane limit for a phone star topology).

## Features

- **Online multiplayer ("Host a game")** — play from your own phones over **peer-to-peer WebRTC** with **no server to deploy**: room code + QR to join, private per-device cards, a **synchronised timer**, and **open voting** where everyone sees who voted for whom. See **[Online multiplayer](#online-multiplayer-host-a-game)**.
- **250+ Gujarati words** across 16 categories (animals, food, places, festivals, and more) — Gujarati with English in brackets.
- **Imposter gets a related word** — the classic "undercover" twist: instead of nothing, each imposter secretly receives a *different* word from the **same category** as the real one (shared across imposters), so they can make a convincing, intelligent bluff.
- **Manual setup** — any number of players (3–20) and imposters (1 to players−1).
- **Game modes** — **Classic** shuffles the seating each game; **Linear** keeps the exact setup order (reveal, turns and removal all follow player 1, 2, 3…). Imposter roles are always assigned at random in both modes. The chosen mode is saved with presets.
- **Presets** — save/load game configurations (IndexedDB).
- **Score history** — every finished game (word, players, imposters, winner) stored locally (IndexedDB).
- **Hold-to-peek card** pass-the-phone flow — the word is only visible while the card is held down, so passing the phone is cheat-proof.
- **Round-based removal** — each round the group together selects one player to remove or skips; the removed player's role is revealed and win conditions (all imposters out ⇒ civilians win; imposters reach parity ⇒ imposters win) are checked automatically. Suggesting and discussion rounds alternate until someone wins.
- **Per-slot language selection** — two dropdowns in the top-right pick a **primary** language and an optional **secondary** language, independently, from every registered language. Any language can fill either slot: secondary **None** shows one language only; e.g. English-primary + Gujarati-secondary, or Gujarati-only. The choice is saved and applied everywhere (UI, words and categories), with no flash of secondary text on load. Ships with Gujarati + English; see **[Adding a language](#adding-a-language)**.
- Discussion **timer** with quick presets, progress bar and vibration on time-up.
- **Offline-first PWA** — service worker caches the whole app shell.
- **Installable** on Android/desktop; foundations included for **TWA** (Trusted Web Activity).

## Tech

Vanilla HTML/CSS/JS — **no build step**. The single-device game has **zero dependencies**; the
online mode uses three small **vendored** (committed, self-hosted — no CDN) libraries, all
lazy-loaded/precached: PeerJS (WebRTC, MIT), qrcode-generator (the join QR, MIT), and jsQR
(the in-app QR scanner fallback, Apache-2.0).

| File | Purpose |
|------|---------|
| `index.html` | App shell / all screens |
| `css/style.css` | Mobile-first dark theme |
| `js/vocab.js` | Per-language word list + categories (`{ gu, en, … }`) |
| `js/db.js` | IndexedDB wrapper (presets + history) |
| `js/icons.js` | Inline SVG icon set (self-contained, no sprite/`<use>`) |
| `js/i18n.js` | Language registry + UI string catalog + primary/secondary rendering |
| `js/net.js` | WebRTC transport for multiplayer — host-authoritative star over PeerJS (signaling only) |
| `js/vendor/peerjs.min.js` | Vendored [PeerJS](https://peerjs.com) (MIT) — WebRTC peer connections + free signaling broker |
| `js/vendor/qrcode.js` | Vendored [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT) — lazy-loaded "scan to join" QR (host) |
| `js/vendor/jsqr.min.js` | Vendored [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0) — lazy-loaded in-app QR **scanner** fallback (joiner) |
| `js/app.js` | Router, local + multiplayer game logic, hold-to-peek card, timers |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker (offline cache) |
| `icons/` | App icons — SVG + raster PNG (192/512, incl. maskable) |
| `.well-known/assetlinks.json` | TWA Digital Asset Links template |
| `Dockerfile` / `nginx.conf` | One-click Coolify deploy (static site on nginx) |
| `twa-manifest.json` | Bubblewrap TWA config (set your host) |
| `scripts/build-twa.sh` | One-command Android TWA build + assetlinks wiring |

## Adding a language

Languages are data — no engine changes needed. To add one (say Hindi, `hi`):

1. **Register it** in [`js/i18n.js`](js/i18n.js) → `LANGS`:
   ```js
   const LANGS = { gu: 'ગુજરાતી', en: 'English', hi: 'हिन्दी' };
   ```
2. **Translate the UI** — add the `hi` variant to every entry in the `STRINGS`
   catalog in the same file (each entry is `{ gu: '…', en: '…', hi: '…' }`).
3. **Translate the words** — add `hi` to every word and category in
   [`js/vocab.js`](js/vocab.js) (e.g. `{ gu: 'સિંહ', en: 'Lion', hi: 'शेर', cat: 'animals' }`).

That's it — the language then appears in both the primary and secondary
dropdowns and can be chosen for either slot. Missing translations fall back to
English, then Gujarati, so a partially-translated language still works.

## Running locally

A service worker requires an HTTP origin (not `file://`). Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or run the exact production image locally:

```bash
docker build -t imposter .
docker run --rm -p 8080:8080 imposter
# then open http://localhost:8080
```

## Deploying on Coolify

> For the full, step-by-step walkthrough (Coolify + Bubblewrap, verification,
> troubleshooting) see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

The repo ships a `Dockerfile` (nginx serving the static shell), so Coolify
deploys it with **one click, no configuration**:

1. In Coolify, **+ New → Resource → Public/Private Repository** and point it at
   this repo.
2. Coolify auto-detects the `Dockerfile` build pack. Leave the defaults — the
   container listens on **port 8080** (already `EXPOSE`d).
3. Set your domain and let Coolify provision HTTPS (Let's Encrypt). That's the
   single deploy — the same container serves the PWA, the web manifest, and the
   Digital Asset Links needed for the Android wrapper.

The bundled [`nginx.conf`](nginx.conf) handles the PWA-specific details Coolify's
generic static server would miss:

- `manifest.webmanifest` → `application/manifest+json`
- `.well-known/assetlinks.json` → `application/json`, CORS-open (TWA verification)
- `sw.js` / manifest → `no-cache` so a redeploy never leaves clients on a stale shell
- long-lived caching + gzip for `css/js/png/svg`

## Packaging as a TWA (Android) — one command

The PWA is TWA-ready: it ships raster icons (`icons/icon-512.png`,
`icons/icon-maskable-512.png`, referenced from the manifest) that
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) requires, plus a
pre-filled [`twa-manifest.json`](twa-manifest.json).

After the site is deployed over HTTPS, build the Android app in one step:

```bash
./scripts/build-twa.sh yourdomain.com
```

The script:

1. Rewrites `twa-manifest.json` to your host.
2. Runs `bubblewrap build` (generating `android.keystore` on first run) to
   produce the signed `.apk` (sideload) and `.aab` (Google Play).
3. Reads the signing **SHA-256** from the keystore and writes the real
   `.well-known/assetlinks.json`.

Commit the updated `assetlinks.json` and **redeploy** so
`https://yourdomain.com/.well-known/assetlinks.json` serves your fingerprint —
domain verification (URL-bar-free launch) is live from that deploy on.

Prereqs for the build step: Node 18+, JDK 17+, and the Android SDK (Bubblewrap
can fetch its own on first run).
