# ઈમ્પોસ્ટર — Gujarati Imposter Game 🕵️

A pass-the-phone **Imposter** party game (like the famous "undercover / imposter" word game)
built entirely in Gujarati, with English meanings in brackets. Runs fully offline as an
installable **PWA** — no accounts, no server, no network required.

## How to play

1. **ગોઠવણ / Setup** — choose the number of **players** and **imposters**. Optionally name players and pick a word category. Save the setup as a **preset** for next time.
2. **જુઓ / Reveal** — pass the phone around. Each player **slides to reveal** their secret word, then taps **Next** and hands the phone on.
3. Everyone gets the **same Gujarati word** — except the **imposter(s)**, who get no word and must bluff.
4. **ચર્ચા / Discuss** — each player gives one clue about the word (without saying it). Use the built-in timer.
5. **મત / Vote** — decide who the imposter is, then record who won. Results are saved to **History**.

## Features

- 🗂️ **250+ Gujarati words** across 16 categories (animals, food, places, festivals, and more) — Gujarati with English in brackets.
- 👥 **Manual setup** — any number of players (3–20) and imposters (1 to players−1).
- 💾 **Presets** — save/load game configurations (IndexedDB).
- 🏆 **Score history** — every finished game (word, players, imposters, winner) stored locally (IndexedDB).
- 👉 **Slide-to-reveal + click-to-next** pass-the-phone flow.
- ⏱️ Discussion **timer** with quick presets and vibration on time-up.
- 📴 **Offline-first PWA** — service worker caches the whole app shell.
- 📲 **Installable** on Android/desktop; foundations included for **TWA** (Trusted Web Activity).

## Tech

Vanilla HTML/CSS/JS — no build step, no dependencies.

| File | Purpose |
|------|---------|
| `index.html` | App shell / all screens |
| `css/style.css` | Mobile-first dark theme |
| `js/vocab.js` | Gujarati↔English word list + categories |
| `js/db.js` | IndexedDB wrapper (presets + history) |
| `js/app.js` | Router, game logic, slide-to-reveal, timer |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker (offline cache) |
| `icons/` | App icons (SVG, incl. maskable) |
| `.well-known/assetlinks.json` | TWA Digital Asset Links template |

## Running locally

A service worker requires an HTTP origin (not `file://`). Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Packaging as a TWA (Android)

The PWA is TWA-ready. To wrap it in an Android app:

1. Deploy this folder to an HTTPS host.
2. Use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap): `bubblewrap init --manifest https://your-host/manifest.webmanifest`.
3. Fill in `.well-known/assetlinks.json` with your app's package name and signing SHA-256 fingerprint so the TWA verifies the domain.
