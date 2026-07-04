#!/usr/bin/env bash
# Build, install, and launch Canto on a physical iPhone from the CLI.
#
# Signing is baked into project.yml (DEVELOPMENT_TEAM, automatic style), so no
# Xcode GUI is needed. This is NOT remote-over-internet: the phone must be
# reachable (USB, or wireless debugging on the same Wi-Fi), UNLOCKED and awake,
# and the developer profile trusted once. iOS rejects installs to a locked phone
# and there is no flag to bypass it.
#
# Usage:
#   scripts/deploy_device.sh            # auto-pick the one connected iPhone
#   scripts/deploy_device.sh <udid>     # target a specific device
set -euo pipefail

BUNDLE_ID="com.kevinmok.cantoapp"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEV="${1:-}"
if [[ -z "$DEV" ]]; then
  # A connected iOS device shows in xctrace's online section as
  #   Name (osVersion) (UDID)  — the host Mac has no (osVersion), so the
  # two-parenthetical shape is what tells a real device apart. UDIDs are the
  # newer 8-16 hex-with-dash form or the older 40-hex form. devicectl's own
  # identifier is a different UUID that xcodebuild won't accept, so parse here.
  DEVS="$(xcrun xctrace list devices 2>/dev/null \
    | awk '/^== Devices ==/{f=1;next} /^== (Devices Offline|Simulators) ==/{f=0} f' \
    | grep -oE '\([0-9]+\.[0-9.]+\) \(([0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}|[0-9A-Fa-f]{40})\)' \
    | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}|[0-9A-Fa-f]{40}' || true)"

  COUNT="$(printf '%s' "$DEVS" | grep -c . || true)"
  if [[ "$COUNT" -eq 0 ]]; then
    echo "No connected iPhone. Plug in over USB or enable wireless debugging" >&2
    echo "(Xcode > Devices and Simulators > the iPhone > Connect via network)," >&2
    echo "then UNLOCK the phone and make sure it's on the same Wi-Fi. Verify with:" >&2
    echo "  xcrun devicectl list devices   # must show 'available', not offline" >&2
    exit 1
  fi
  if [[ "$COUNT" -gt 1 ]]; then
    echo "More than one device connected — pass a UDID explicitly:" >&2
    printf '  %s\n' $DEVS >&2
    exit 1
  fi
  DEV="$DEVS"
fi

echo "==> Building for device $DEV"
xcodebuild -scheme Canto -destination "platform=iOS,id=$DEV" \
  -allowProvisioningUpdates -derivedDataPath build build

APP="build/Build/Products/Debug-iphoneos/Canto.app"
[[ -d "$APP" ]] || { echo "Build produced no app at $APP" >&2; exit 1; }

echo "==> Installing (phone must be unlocked)"
xcrun devicectl device install app --device "$DEV" "$APP"

echo "==> Launching $BUNDLE_ID"
xcrun devicectl device process launch --device "$DEV" "$BUNDLE_ID"

echo "==> Done"
