#!/usr/bin/env bash
#
# Build the Android TWA (Trusted Web Activity) with Bubblewrap and wire up
# Digital Asset Links so domain verification passes.
#
# Prereqs: Node 18+, JDK 17+, Android SDK (Bubblewrap can fetch its own),
#          and the site already deployed over HTTPS on your Coolify host.
#
# Usage:
#   ./scripts/build-twa.sh yourdomain.com
#
# What it does:
#   1. Points twa-manifest.json at your host.
#   2. Runs `bubblewrap build` (generates keystore on first run if missing).
#   3. Extracts the signing SHA-256 and writes .well-known/assetlinks.json.
#   4. Reminds you to re-deploy so the updated assetlinks.json goes live.
set -euo pipefail

HOST="${1:-}"
if [[ -z "$HOST" ]]; then
  echo "Usage: $0 <your-domain.com>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PKG="$(node -pe "require('./twa-manifest.json').packageId" 2>/dev/null || echo com.imposter.gujarati)"
KEYSTORE="./android.keystore"
ALIAS="android"

echo "==> Pointing twa-manifest.json at https://${HOST}"
# Rewrite every occurrence of the placeholder host with the real one.
node - "$HOST" <<'NODE'
const fs = require('fs');
const host = process.argv[2];
const f = 'twa-manifest.json';
const m = JSON.parse(fs.readFileSync(f, 'utf8'));
const placeholder = 'imposter.example.com';
const swap = (s) => typeof s === 'string' ? s.split(placeholder).join(host) : s;
m.host = host;
for (const k of ['iconUrl','maskableIconUrl','webManifestUrl','fullScopeUrl']) {
  if (m[k]) m[k] = swap(m[k]);
}
fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n');
console.log('    updated host + URLs');
NODE

echo "==> Building the TWA with Bubblewrap (this may prompt for keystore details on first run)"
npx --yes @bubblewrap/cli@latest build

echo "==> Extracting signing SHA-256 fingerprint"
if [[ ! -f "$KEYSTORE" ]]; then
  echo "ERROR: expected keystore at $KEYSTORE — check twa-manifest.json signingKey.path" >&2
  exit 1
fi

FP="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" 2>/dev/null \
      | grep -Ei 'SHA256:' | head -1 | sed -E 's/.*SHA256:\s*//' | tr -d '[:space:]')"

if [[ -z "$FP" ]]; then
  echo "ERROR: could not read SHA-256 from keystore. Run:" >&2
  echo "  keytool -list -v -keystore $KEYSTORE -alias $ALIAS" >&2
  exit 1
fi

echo "    fingerprint: $FP"

echo "==> Writing .well-known/assetlinks.json"
mkdir -p .well-known
node - "$PKG" "$FP" <<'NODE'
const fs = require('fs');
const [pkg, fp] = process.argv.slice(2);
const links = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: pkg,
    sha256_cert_fingerprints: [fp]
  }
}];
fs.writeFileSync('.well-known/assetlinks.json', JSON.stringify(links, null, 2) + '\n');
console.log('    wrote package_name=' + pkg);
NODE

cat <<EOF

Done. Artifacts:
  - app-release-signed.apk  (sideload / testing)
  - app-release-bundle.aab  (upload to Google Play)

Next: commit the updated .well-known/assetlinks.json and re-deploy on Coolify,
so https://${HOST}/.well-known/assetlinks.json serves your real fingerprint.
Domain verification (and the TWA's URL-bar-free launch) works after that deploy.
EOF
