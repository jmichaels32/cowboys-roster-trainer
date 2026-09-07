#!/bin/zsh

set -euo pipefail

script_directory="${0:A:h}"
project_directory="${script_directory:h}"
device_list="$(mktemp)"
derived_data="${TMPDIR:-/tmp}/cowboys-roster-trainer-device"
device_selector="${1:-}"

trap 'find "$device_list" -delete 2>/dev/null || true' EXIT

if [[ -z "$device_selector" ]]; then
  echo "Choose a device: npm run ios:run:mine or npm run ios:run:dad" >&2
  exit 2
fi

xcrun devicectl list devices --json-output "$device_list" >/dev/null
device_info="$(node - "$device_list" "$device_selector" <<'NODE'
const fs = require("node:fs");

const devices = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).result.devices;
const selector = process.argv[3].toLowerCase();
const eligibleDevices = devices.filter(
  (candidate) =>
    candidate.hardwareProperties?.reality === "physical" &&
    candidate.connectionProperties?.pairingState === "paired" &&
    candidate.deviceProperties?.developerModeStatus === "enabled",
);
const device = eligibleDevices.find((candidate) =>
  [
    candidate.identifier,
    candidate.hardwareProperties?.udid,
    candidate.deviceProperties?.name,
  ].some((value) => value?.toLowerCase() === selector),
);

if (!device) {
  console.error(`No eligible paired iPhone matches "${process.argv[3]}".`);
  if (eligibleDevices.length) {
    console.error("Available devices:");
    for (const candidate of eligibleDevices) {
      console.error(
        `- ${candidate.deviceProperties.name} (${candidate.hardwareProperties.udid})`,
      );
    }
  }
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
