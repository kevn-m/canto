#!/usr/bin/env bash
# Archive, export, and upload Canto to TestFlight from the CLI.
#
# Use this to get a build onto a phone that is NOT on the Mac's network (the
# on-device deploy_device.sh only works on the same Wi-Fi). Upload then wait a
# few minutes for Apple to process it; the build appears in the TestFlight app
# for the tester to install. This is send-and-wait, not instant.
#
# One-time setup (not scriptable — needs your Apple login):
#   1. App Store Connect > Users and Access > Integrations > App Store Connect
#      API > generate a key. Save the .p8 as
#      ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8, note Key ID + Issuer ID.
#   2. App Store Connect > Apps > + > New App, bound to com.kevinmok.cantoapp.
#   3. Create scripts/testflight.env (gitignored) with:
#        KEY_ID=XXXXXXXXXX
#        ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#
# Each upload gets a fresh CFBundleVersion (a UTC timestamp) because TestFlight
# rejects a build number it has already seen.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONFIG="scripts/testflight.env"
[[ -f "$CONFIG" ]] && source "$CONFIG"
: "${KEY_ID:?Set KEY_ID (see one-time setup in this script's header)}"
: "${ISSUER_ID:?Set ISSUER_ID (see one-time setup in this script's header)}"

BUILD="$(date -u +%Y%m%d%H%M)"   # monotonic, unique per minute
ARCHIVE="build/Canto.xcarchive"
EXPORT_DIR="build/export"

echo "==> Archiving (build $BUILD)"
xcodebuild -scheme Canto -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  CURRENT_PROJECT_VERSION="$BUILD" \
  -allowProvisioningUpdates archive

# Release must never carry the Google key (ADR 0019). Never delete the
# source secret to make this pass — fix the build instead.
LEAK="$(find "$ARCHIVE/Products/Applications" -name secrets.json -print -quit)"
if [[ -n "$LEAK" ]]; then
  echo "error: archive contains a bundled key: $LEAK" >&2
  exit 1
fi

echo "==> Exporting IPA"
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist scripts/ExportOptions.plist \
  -allowProvisioningUpdates

IPA="$(ls "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1 || true)"
[[ -n "$IPA" ]] || { echo "Export produced no .ipa in $EXPORT_DIR" >&2; exit 1; }

if unzip -Z1 "$IPA" | grep -E '(^|/)secrets\.json$'; then
  echo "error: IPA contains a bundled key (path above); refusing to upload" >&2
  exit 1
fi

echo "==> Uploading $IPA to App Store Connect"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

echo "==> Uploaded build $BUILD. It appears in TestFlight after Apple processes it (usually minutes)."
