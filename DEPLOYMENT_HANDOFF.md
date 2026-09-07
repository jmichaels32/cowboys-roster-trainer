# iPhone Deployment Handoff

## Goal

Install the current Player Decks app directly on Dr. Michaels' iPhone 17 Pro.
Do not launch or use an iOS Simulator.

## Current state

- Repository: `https://github.com/jmichaels32/cowboys-roster-trainer.git`
- Bundle ID: `com.jmichaels.cowboysrostertrainer`
- Apple team: `4W7P2FHV84` (paid individual team)
- Dad's hardware UDID: `00008150-000C70221AD2401C`
- Dad's CoreDevice ID: `ADEA60E8-F368-5E48-A5E2-9B5C77147232`
- Dad's phone is paired and Developer Mode is enabled.
- Xcode 16.3 can build the app, but cannot mount its developer image on the
  iPhone 17 Pro (`kAMDMobileImageMounterPersonalizedBundleMissingVariantError`).
- macOS is updated to Tahoe 26.6.2.
- The App Store offers Xcode 26.6; installation is the remaining toolchain step.

## Resume after the macOS/Xcode update

1. Confirm the active toolchain with `xcodebuild -version` and `xcode-select -p`.
2. If needed, select the new Xcode and complete its first-launch setup.
3. Keep the intended phone unlocked and connected.
4. Run `npm run ios:run:dad` for Dr. Michaels' phone or
   `npm run ios:run:mine` for Jack's phone. Each command syncs, builds, installs,
   and launches only on that explicitly configured device.
5. Do not open a simulator.

## TestFlight detour

No Xcode Cloud workflow or TestFlight build was created, and nothing was
published. Commits `1888a67`, `e2dbb69`, and `bfa0d89` only added cloud build
preparation. They can be reverted after direct deployment is working. The
temporary Xcode-managed clone is at
`/Users/jackmichaels/Documents/cowboys-roster-trainer`.
