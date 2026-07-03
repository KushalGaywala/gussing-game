# ઈમ્પોસ્ટર — Gujarati Imposter Game

A pass-the-phone **Imposter** party game (like the famous "undercover / imposter" word game).
Fully bilingual (Gujarati + English out of the box) with a per-slot language picker — choose
any registered language as primary and any (or none) as secondary. Runs fully offline as an
installable **PWA** — no accounts, no server, no network required.

## How to play

1. **ગોઠવણ / Setup** — choose the number of **players** and **imposters**, and a **game mode** (**Classic** shuffles the seating each game; **Linear** keeps the exact setup order). Optionally name players and pick a word category. Save the setup as a **preset** for next time.
2. **જુઓ / Reveal** — pass the phone around. Each player **holds the card and pulls it down** to peek at their secret word; **releasing snaps the card back** and hides it again. Only then does **Next** unlock — so nobody can see the previous player's word, and peeking again is a visible gesture everyone would notice.
3. Everyone gets the **same secret word** — except the **imposter(s)**, who instead receive a **similar word from the same category** (never the real one). That related hint lets an imposter blend in and bluff intelligently instead of guessing blind.
4. **ચર્ચા / Discuss** — each player gives one clue about the word (without saying it). Use the built-in timer.
5. **પસંદ / Remove or Skip** — at the end of each discussion the group together **picks one player to remove** or **skips the round**. Removing a player reveals whether they were an imposter or innocent.
6. **રાઉન્ડ / Rounds** — if the game isn't over, a **suggesting round** is followed by another **discussion round**, then remove or skip again. This repeats until someone wins.
7. **જીત / Win** — **civilians win** once every imposter has been removed; **imposters win** the moment they equal or outnumber the surviving civilians. The result (with round count) is saved to **History**.

## Features

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

Vanilla HTML/CSS/JS — no build step, no dependencies.

| File | Purpose |
|------|---------|
| `index.html` | App shell / all screens |
| `css/style.css` | Mobile-first dark theme |
| `js/vocab.js` | Per-language word list + categories (`{ gu, en, … }`) |
| `js/db.js` | IndexedDB wrapper (presets + history) |
| `js/icons.js` | Inline SVG icon set (self-contained, no sprite/`<use>`) |
| `js/i18n.js` | Language registry + UI string catalog + primary/secondary rendering |
| `js/app.js` | Router, game logic, hold-to-peek card, timer |
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
