# Player Decks

A dependency-free, mobile-first flashcard trainer for learning football players from selectable decks. It is ready for GitHub Pages and iOS through Capacitor; progress is stored locally on each device.

**Live site:** <https://jmichaels32.github.io/cowboys-roster-trainer/>

## Decks

- Cowboys roster: available now, using the official roster data
- NFL Top 100: product skeleton added; player data is not installed yet

## Training

- Three Cowboys study types: Players, Lineup, and Trivia
- Eight player groups: most famous, starters, second string, third string, offense, defense, practice squad, and the complete roster
- One-tap recommended lessons that advance from recognition to recall and mastery as you improve
- Three training levels: multiple-choice recognition, typed recall, and a typed mastery check
- Practice for faces and names, jersey numbers, positions, and colleges
- Lineup questions generated from the bundled roster and depth chart, including offense, defense, special teams, and depth order
- Curated offline trivia covering Super Bowls, history, legends, and traditions
- Four-part mastery: a player only counts as learned after all four answers are typed correctly in the same mastery check
- Adaptive practice that tracks misses, accuracy, streaks, and recency by player and fact
- Device-local daily reports with answer totals, accuracy, players verified, and a Wordle-style share summary
- Searchable roster browser with group and position filters plus factual sorting by name, number, position, college, height, weight, or depth chart

The Cowboys data was generated from the [official Cowboys roster](https://www.dallascowboys.com/team/players-roster/). Headshots remain hosted by the official NFL/Cowboys image CDN.

## Run locally

No build step or package installation is required.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Run on iOS

The iOS app uses Capacitor to bundle the existing web interface in a native Xcode project. It does not require a separate web build framework.

```bash
npm install
npm run ios:open
```

Select an Apple development team in Xcode, choose a simulator or connected iPhone, and run the `App` scheme. Run `npm run ios:sync` after changing the web files so the native project receives the latest copy. Always open `ios/App/App.xcworkspace`, not the `.xcodeproj` file, so CocoaPods dependencies are included.

For the configured development team and a paired iPhone, `npm run ios:run` builds, installs, and launches the app directly from the terminal.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

GitHub will show the public URL after deployment. All asset paths are relative, so project pages such as `username.github.io/dad_cowboys/` work without changes.

## Refresh the roster

Requires Node.js 18 or newer:

```bash
node scripts/update-roster.mjs
```

The script fetches the Cowboys' official roster sections plus ESPN's published depth chart, validates both sources, and regenerates `data/roster.js`. Active, designated-return, injured-reserve, and practice-squad players are included; waived and cut players are excluded. Roster status and string position remain separate fields, and players absent from the published depth chart do not receive an inferred rank. The eight-player `Most famous` group is the only hand-curated player list in the updater.

## Notes

- This is an unofficial, fan-made study project and is not affiliated with the Dallas Cowboys or NFL.
- Progress and daily reports use `localStorage`, so they remain on the device and browser where you trained unless you share a summary.
- During training camp, duplicate jersey numbers are possible. The quiz avoids ambiguous number-to-name questions when two players in the selected deck share a number.
