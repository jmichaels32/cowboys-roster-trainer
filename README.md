# Cowboys Roster Trainer

A dependency-free, mobile-first flashcard trainer for learning the Dallas Cowboys roster. It is ready to host on GitHub Pages and stores learning progress locally in each browser.

**Live site:** <https://jmichaels32.github.io/cowboys-roster-trainer/>

## What it teaches

- Six progressive decks: starter pack, game-day core, offense, defense, bench/newcomers, and the whole roster
- One-tap recommended lessons that advance from recognition to recall and mastery as you improve
- Three training levels: multiple-choice recognition, typed recall, and a typed mastery check
- Practice for faces and names, jersey numbers, positions, and colleges
- Four-part mastery: a player only counts as learned after all four answers are typed correctly in the same mastery check
- Adaptive practice that tracks misses, accuracy, streaks, and recency by player and fact
- Device-local daily reports with answer totals, accuracy, players verified, and a Wordle-style share summary
- Searchable roster browser with position/status filters, learning labels, and sorting by practice priority, name, number, position, or progress

The checked-in data was generated from the [official Cowboys roster](https://www.dallascowboys.com/team/players-roster/). Headshots remain hosted by the official NFL/Cowboys image CDN.

## Run locally

No build step or package installation is required.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

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

The script fetches the official roster, validates that it found a plausible player count, and regenerates `data/roster.js`. The small hand-curated starter/core groupings live at the top of the script and can be adjusted as the depth chart changes.

## Notes

- This is an unofficial, fan-made study project and is not affiliated with the Dallas Cowboys or NFL.
- Progress and daily reports use `localStorage`, so they remain on the device and browser where you trained unless you share a summary.
- During training camp, duplicate jersey numbers are possible. The quiz avoids ambiguous number-to-name questions when two players in the selected deck share a number.
