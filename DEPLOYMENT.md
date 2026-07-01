# Deployment Guide

This document walks through deploying the **Gujarati Imposter** PWA on
[Coolify](https://coolify.io) and packaging it as an Android app (TWA) with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

The app is a static, dependency-free PWA (vanilla HTML/CSS/JS). There is no
build step — it is served as-is by nginx inside a container.

- [Architecture at a glance](#architecture-at-a-glance)
- [Part 1 — Deploy on Coolify](#part-1--deploy-on-coolify)
- [Part 2 — Package as an Android app (TWA)](#part-2--package-as-an-android-app-twa)
- [Verifying the deployment](#verifying-the-deployment)
- [Updating the app](#updating-the-app)
- [Troubleshooting](#troubleshooting)

---

## Architecture at a glance

```
                    ┌──────────────────────────────┐
   git push  ─────► │  Coolify (Dockerfile deploy)  │
                    │  nginx :8080  +  Let's Encrypt │
                    └───────────────┬────────────────┘
                                    │ HTTPS
                 ┌──────────────────┼───────────────────┐
                 ▼                  ▼                     ▼
        Browser PWA install   manifest.webmanifest   .well-known/
        (Add to Home Screen)  (app metadata)         assetlinks.json
                                                      (verifies the TWA)
                                    ▲
                                    │ reads over HTTPS
                    ┌───────────────┴────────────────┐
                    │  Bubblewrap  → signed .apk/.aab │
                    │  (Android TWA wrapper)          │
                    └─────────────────────────────────┘
```

Files that drive the deployment:

| File | Role |
|------|------|
| `Dockerfile` | Builds the nginx image; Coolify auto-detects it. Listens on **8080**. |
| `nginx.conf` | Correct MIME types, CORS for asset links, PWA cache rules. |
| `manifest.webmanifest` | PWA metadata + icons (SVG **and** the PNGs Bubblewrap needs). |
| `sw.js` | Service worker (offline app-shell cache). |
| `.well-known/assetlinks.json` | Digital Asset Links — proves the TWA owns the domain. |
| `twa-manifest.json` | Bubblewrap TWA configuration. |
| `scripts/build-twa.sh` | One-command TWA build + asset-links wiring. |

---

## Part 1 — Deploy on Coolify

### Prerequisites

- A running Coolify instance (self-hosted or cloud).
- A domain (or subdomain) pointing at your Coolify server, e.g.
  `imposter.yourdomain.com`.
- This repository reachable from Coolify (GitHub App, deploy key, or public URL).

### Steps

1. **Create the resource.**
   In Coolify: **+ New → Resource → Public Repository** (or *Private Repository*
   if you connected the GitHub App). Paste this repo's URL and pick the branch
   you want to deploy.

2. **Let Coolify detect the build pack.**
   Because a `Dockerfile` exists at the repo root, Coolify selects the
   **Dockerfile** build pack automatically. No build command or install command
   is required — leave those fields empty.

3. **Confirm the port.**
   The container exposes and listens on **`8080`**. Coolify usually detects this
   from `EXPOSE 8080`; if it asks, set the *Ports Exposes* / application port to
   `8080`.

4. **Set the domain + HTTPS.**
   Under **Domains**, enter your FQDN (e.g. `https://imposter.yourdomain.com`).
   Coolify provisions a Let's Encrypt certificate automatically. HTTPS is
   **required** for service workers and for TWA domain verification.

5. **Deploy.**
   Click **Deploy**. Coolify builds the image and starts the container. When the
   healthcheck goes green, open your domain — the game should load and be
   installable ("Add to Home Screen").

That is the single deploy. The same container now serves the PWA, the web
manifest, and the Digital Asset Links used by the Android wrapper.

> **Auto-deploy (optional):** enable **Automatic Deployment** on the resource so
> every push to the deployed branch triggers a rebuild via webhook.

### What `nginx.conf` takes care of

A generic static host would get several PWA details wrong. The bundled config:

- serves `manifest.webmanifest` as `application/manifest+json`;
- serves `.well-known/assetlinks.json` as `application/json` with
  `Access-Control-Allow-Origin: *` (needed for TWA verification);
- sends `no-cache` for `sw.js` and the manifest so a redeploy never strands
  users on a stale app shell;
- caches `css/js/png/svg` for a week and gzips text assets;
- adds basic hardening headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`).

---

## Part 2 — Package as an Android app (TWA)

A [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
wraps the deployed PWA in a native Android shell with no browser URL bar. This
only works **after Part 1 is live over HTTPS**, because Bubblewrap reads the
manifest from your real domain and the domain must serve a matching
`assetlinks.json`.

### Prerequisites (build machine)

- **Node.js 18+**
- **JDK 17+** (`keytool` must be on your `PATH`)
- **Android SDK** — Bubblewrap can download its own on first run if you don't
  have one.

### One command

From the repo root, run:

```bash
./scripts/build-twa.sh yourdomain.com
```

The script:

1. Rewrites `twa-manifest.json` so `host`, `webManifestUrl`, `iconUrl`,
   `maskableIconUrl`, and `fullScopeUrl` point at `https://yourdomain.com`.
2. Runs `bubblewrap build`. On the **first** run it generates a signing keystore
   (`android.keystore`) — you'll be prompted for passwords and a certificate
   name. **Keep this keystore safe; you need the same key to ship updates.**
3. Reads the signing **SHA-256** fingerprint from the keystore and writes the
   real `.well-known/assetlinks.json` (package name + fingerprint).

Output artifacts:

| Artifact | Use |
|----------|-----|
| `app-release-signed.apk` | Sideload / manual testing on a device. |
| `app-release-bundle.aab` | Upload to Google Play. |

### Finish the loop: one more deploy

The generated `assetlinks.json` now contains your real fingerprint, but the
**live site still has the placeholder**. Commit and redeploy:

```bash
git add .well-known/assetlinks.json twa-manifest.json
git commit -m "Wire up TWA asset links"
git push          # Coolify auto-deploys (or click Deploy)
```

Once `https://yourdomain.com/.well-known/assetlinks.json` serves your
fingerprint, Android verifies the app and the TWA launches **without a URL bar**.

### Doing it manually (instead of the script)

If you prefer to run Bubblewrap yourself:

```bash
# Point twa-manifest.json at your host first, then:
npx @bubblewrap/cli build

# Read the fingerprint:
keytool -list -v -keystore android.keystore -alias android
```

Copy the `SHA256:` value into `.well-known/assetlinks.json` under
`sha256_cert_fingerprints`, set `package_name` to match `packageId` in
`twa-manifest.json` (`com.imposter.gujarati` by default), then commit and
redeploy.

---

## Verifying the deployment

After Part 1 (replace the host):

```bash
HOST=https://imposter.yourdomain.com

curl -sI  $HOST/                              # 200, text/html
curl -sI  $HOST/manifest.webmanifest          # 200, application/manifest+json
curl -sI  $HOST/sw.js                          # 200, Cache-Control: no-cache...
curl -sI  $HOST/icons/icon-512.png             # 200, image/png
curl -s   $HOST/.well-known/assetlinks.json    # valid JSON, application/json
```

In Chrome DevTools → **Application → Manifest**, confirm there are no icon
errors and the app is installable. **Lighthouse → PWA** should pass the
installability checks.

After Part 2, verify domain association with Google's tool:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yourdomain.com&relation=delegate_permission/common.handle_all_urls
```

It should return your package name and fingerprint.

---

## Updating the app

1. Edit the app files, commit, and push.
2. Coolify rebuilds and redeploys the container.
3. Bump the cache name in `sw.js` (e.g. `imposter-v2` → `imposter-v3`) whenever
   you change cached assets — the service worker's `activate` step deletes old
   caches, so clients pick up the new shell on next launch.

For a new **Android** release: increment `appVersionCode` (and usually
`appVersionName`) in `twa-manifest.json`, re-run the build, and upload the new
`.aab`. Sign with the **same** `android.keystore` as before.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| App loads but "Add to Home Screen" never appears | Not served over HTTPS, or a manifest icon 404s. Check DevTools → Application → Manifest. |
| Old version keeps showing after a deploy | Stale service worker. Bump the `CACHE` version in `sw.js`; `sw.js` itself is served `no-cache` so the new SW is fetched. |
| TWA opens **with** a URL bar | `assetlinks.json` isn't live yet, has the wrong fingerprint/package, or isn't served as JSON. Re-check Part 2's "one more deploy" and the `digitalassetlinks` verifier. |
| Bubblewrap complains about icons | The manifest must expose raster PNG icons (it does: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`). Confirm they return 200. |
| Coolify picks the wrong build pack | Ensure the `Dockerfile` is at the repo root and the branch is correct; set the build pack to **Dockerfile** manually if needed. |
| Container starts but domain 502s | Application port must be **8080** in Coolify to match `EXPOSE 8080`. |
| Lost the signing keystore | You cannot push Play updates under the same app without it (unless enrolled in Play App Signing). Back up `android.keystore` securely. |
