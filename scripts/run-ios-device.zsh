#!/bin/zsh

set -euo pipefail

script_directory="${0:A:h}"
project_directory="${script_directory:h}"
device_list="$(mktemp)"
derived_data="${TMPDIR:-/tmp}/cowboys-roster-trainer-device"

trap 'rm -f "$device_list"' EXIT

xcrun devicectl list devices --json-output "$device_list" >/dev/null
device_info="$(node - "$device_list" <<'NODE'
const fs = require("node:fs");

const devices = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).result.devices;
const device = devices.find(
  (candidate) =>
    candidate.hardwareProperties?.reality === "physical" &&
    candidate.connectionProperties?.pairingState === "paired" &&
    candidate.deviceProperties?.developerModeStatus === "enabled",
);

if (!device) {
  console.error("No paired physical iPhone with Developer Mode enabled is available.");
  process.exit(1);
}

process.stdout.write(
  [device.identifier, device.hardwareProperties.udid, device.deviceProperties.name].join("|"),
);
NODE
)"

IFS='|' read -r core_device_id device_udid device_name <<< "$device_info"

echo "Building for $device_name"
xcodebuild -quiet \
  -workspace "$project_directory/ios/App/App.xcworkspace" \
  -scheme App \
  -configuration Debug \
  -destination "id=$device_udid" \
  -derivedDataPath "$derived_data" \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  build

app_path="$derived_data/Build/Products/Debug-iphoneos/App.app"
xcrun devicectl device install app --device "$core_device_id" "$app_path"
xcrun devicectl device process launch --device "$core_device_id" \
  com.jmichaels.cowboysrostertrainer
