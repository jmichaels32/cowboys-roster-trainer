---
version: alpha
name: "Player Decks"
description: "A focused mobile learning utility for football-player decks."
colors:
  primary: "#4C55E6"
  primary-hover: "#3F46C7"
  primary-soft: "#EEF0FF"
  shell: "#1B1E28"
  shell-deep: "#11131A"
  background: "#F6F7FB"
  surface: "#FFFFFF"
  subtle: "#F0F2F7"
  border: "#E1E4EC"
  text: "#1B1E28"
  muted: "#697185"
  success: "#157A5A"
  danger: "#C33F53"
  focus: "#766CF4"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
spacing:
  control-min: "2.75rem"
  mobile-gutter: "1.25rem"
---

# Player Decks Design System

## Product model

The app teaches football players from selectable decks. The initial decks are:

1. Cowboys roster
2. Patriots roster
3. NFL Top 100

Decks own their player set, progress, and optional accent. Team deck rows lead with the team's bundled logo because team identity matters at the point of selection. The app shell remains neutral so adding another team or league-wide deck never requires a redesign.

Every team roster deck contains the same three peer study types:

1. `Players` teaches who each current player is through face/name, jersey number, position, and college recall.
2. `Lineup` teaches how the current roster fits together through roles, units, special teams, and depth-chart order.
3. `Trivia` teaches stable franchise history, legends, championships, and traditions from a curated, source-backed offline question set.

The NFL Top 100 deck contains two study types:

1. `Players` teaches face/name, current team, position, and published Top 100 rank.
2. `Trivia` teaches durable league-wide structure, divisions, and schedule basics.

NFL Top 100 has no Lineup mode. Do not show study types a deck does not support.

This contract applies to the Cowboys and Patriots now, and to every team added later. `Lineup` is generated from that team's bundled depth chart; `Trivia` is a deliberately built and verified team-specific collection. A team deck is not complete until all three modes work offline.

## First rule: remove unnecessary text

Every visible word must do at least one job:

- identify the selected deck or current player;
- communicate progress or state;
- enable or clarify an action;
- prevent a likely mistake.

Delete headings that merely describe the interface beneath them. Examples such as “Your learning library,” “Next lesson,” and explanatory welcome copy are not useful when the visible content already makes the screen obvious. Do not use uppercase eyebrow text as decoration.

Prefer the shortest label that preserves meaning: “Players,” “Change deck,” “Start 5 cards,” and “8 of 91 learned.” Instructions belong at the moment of uncertainty, not permanently above familiar controls.

## Product principles

- Put the next useful learning action in the first viewport.
- Make the selected deck obvious and easy to change.
- Preserve each deck’s progress independently.
- Default to offline use; refresh cached deck data only when requested or when connectivity is safely available.
- Avoid streaks, gems, confetti, badges, false urgency, and ornamental statistics.
- Prefer one primary action per decision area.
- Use progressive disclosure instead of explaining the whole learning model on the home screen.

## Visual direction

The product is a neutral learning utility: white surfaces, a cool-gray canvas, near-black text, and one blue-violet accent. Football identity comes from deck marks, player photography, numbers, and content—not themed chrome. Team colors may appear inside deck marks or player content, never as the global navigation or action system.

Use the accent sparingly for primary actions, selected states, interactive text, and focus. Large navigation surfaces remain white; do not use gradients, decorative color bands, or a second expressive accent. Success and danger retain separate semantic colors and always include text or icon cues.

Aim for a neutral-dominant screen: roughly 80% canvas/surface, 15% text and structural contrast, and no more than 5% expressive accent. This is a hierarchy guideline, not a decorative quota.

This direction synthesizes recurring shipped patterns found through Mobbin: content-first neutral surfaces, one clear action color, and restrained selection feedback. It deliberately avoids both team-brand imitation and the generic cream/terracotta aesthetic.

Use borders and tonal surfaces before shadows. Controls and containers use 12–24px radii; pills are limited to filters and compact status. Typography is tight and direct, with sentence case for buttons and body copy. Uppercase is reserved for genuine abbreviations such as NFL, QB, and DAL.

## Layout and interaction

Design mobile-first at 320px and above. Honor iPhone safe areas, keep important targets at least 44px, support 200% zoom, and never introduce horizontal scrolling.

Never place close or back controls directly against the status area. Add breathing room beyond the reported safe-area inset so taps cannot collide with the clock, Dynamic Island, or system gestures.

The normal hierarchy is:

1. selected deck;
2. current card or session;
3. primary study action;
4. progress or alternate deck access.

Flashcards reveal on tap and then ask for a simple recall judgment. Answer feedback always uses words in addition to color. Offline failures keep cached content visible and provide a clear retry.

Keep search visible on collection screens, but progressively disclose secondary controls. Study group, position, and factual sort choices belong in one clearly labeled sheet rather than simultaneous fields. Learning state stays internal to practice scheduling and never appears as a player-browser filter, sort, or badge. Pushed screens use an icon-only back arrow with an accessible label and support both swipe-left and the familiar iOS edge-swipe back gesture.

The roster uses the approved “single refine sheet” pattern: a full-width search field, a quiet row containing the live result count and one `Refine` action, then results. `Refine` opens one bottom sheet containing study group, position, and factual sorting as app-owned single-choice pills. Group names mirror the learning packages exactly; `Full roster` is the neutral default. Applied settings are counted beside `Refine`; search has an app-owned clear button whenever text is present. Local filtering updates immediately and a no-results state offers one reset action.

Roster rows are compact reference cards. On phones, target roughly 102px per row with a 76px headshot column and three short information levels: name/number, position with height and weight, then college mark/name. Put every roster/depth designation in one final metadata chip: `Starter · QB`, `2nd string · WR`, `Practice squad`, or a combined reserve label. Never append roster status to the physical-measurements line. College marks are cached app assets so they work offline; a compact text monogram is the fallback when no mark is available or an image fails. Never expose learning progress or infer depth from roster order or player prominence.

Roster sorting covers visible factual attributes that produce a meaningful order: name, jersey number, position, college, height, weight, and depth chart. Learning progress and practice priority are internal scheduling inputs, not player-browser controls. Directional physical sorts name their direction (`Tallest first`, `Heaviest first`) rather than leaving ascending/descending ambiguous.

Deck rows are destinations, not selectable settings. Tapping an available deck opens it immediately; there is no separate “Study [deck]” button. Unavailable decks remain visibly disabled with a concise availability state. Player browsing belongs inside roster decks, and Back/swipe returns from Players to that deck before returning to the deck list. League-wide ranked decks may omit the roster browser when their player groups already provide the useful navigation.

Use `touch-action: manipulation` on the application surface and controls to prevent accidental double-tap zoom without disabling pinch zoom or setting a restrictive viewport scale.

Session setup is one editable sentence: “Practice [level] with [content] for [length].” Each emphasized value opens a focused bottom sheet; the screen shows no setup grids, group label, deck description, progress summary, or practice explanation. Mastery fixes content to all facts. The only persistent action is “Start [length].” Mastery progress replaces the existing item count inside the package/topic sheet as `x of y mastered`; never add a persistent progress panel, badge, or roster-row status for the same information. Player groups count fully verified players. Lineup and Trivia groups count questions last answered correctly through typed recall; recognition alone never marks mastery.

Inside every team deck, a compact `Players / Lineup / Trivia` segmented control sits above the package selector. It changes the learning job in place rather than pushing another screen. Each study type remembers its own topic, level, and length during use. Players retains the full editable sentence and three levels. Lineup and Trivia omit the irrelevant content control, use `questions` rather than `cards`, and offer Recognition and Typed recall. Their topic selector reuses the same full-width sheet as the Players package selector.

Lineup questions are generated from the bundled roster and published depth fields so a roster refresh also refreshes answers. Multi-player questions accept every required player in any order unless the prompt explicitly asks for depth-chart order. Trivia facts live in a separate bundled data file. Every trivia question must resolve to an authoritative source title and URL, carry a verification date, include a short paraphrased evidence note, and reference a verified local image. The image registry records its subject, alt text, credit, source page, original file URL, and bundled WebP path. The trivia validator blocks missing citations or images, invalid image files, invalid answer aliases, duplicate distractors, and empty packs. Both modes work fully offline after installation.

Recognition choices use one shared rectangular option component across Players, Lineup, and Trivia. Its layout, spacing, borders, and correct/wrong states do not change by study type, and every choice remains visible after grading. Lineup and Trivia questions are text-first: when the prompt already communicates the role or topic, do not insert a badge, logo, position marker, category eyebrow, or filler illustration between it and the answers.

Trivia alone may add a verified historical image after the answer is revealed because the image supports recall. Center it above the answer explanation at its natural aspect ratio, constrain its height on phones, and use only the shared subtle corner radius—no added frame, border, shadow, forced subject crop, or visible caption. If a sourced file contains a baked decorative matte, flag it in the image registry and trim only that matte in presentation. Concise subject labels, provenance, relationship notes, credits, and alt text remain in the bundled data for validation and accessibility rather than becoming on-screen description. Prefer the exact person or event; if an exact event image is unavailable, use a directly related subject and record that relationship honestly in metadata. Images are downloaded once, optimized as local WebP assets, and never fetched during practice.

Team-roster player facts are face/name, jersey number, roster position, and college. NFL Top 100 player facts are face/name, current team, position, and rank. A normal session selects distinct players from the chosen package and asks one chosen fact per player; hidden accuracy, streak, recency, and completion data prioritize both players and facts. Mastery asks all four deck-specific facts for each selected player, interleaves players and fact types, and reveals only the answer to the current fact. It never exposes the player's other facts before their questions are complete. Height, weight, roster status, and depth-chart position remain roster-browser reference data unless the product model is explicitly expanded later.

NFL Top 100 packages are nested rank thresholds: Top 10, Top 25, Top 50, Top 75, and Top 100. When the league has announced the final players but not their exact order, include them in every threshold under the honest label `Top 3`; never invent interim ranks. The updater pulls the official NFL list, caches all headshots as local WebP assets, and replaces the pending label once the remaining ranks publish. NFL trivia is source-backed and bundled offline. It stays text-first when no meaningful recall image exists.

The top bar is contextual, not branded: “Decks” on the deck picker and the selected deck name on its screens. The package name is a large selector above session setup. Team-roster sheets list eight football-relevant packages and their player counts: Most famous, Starters, 2nd string, 3rd string, Offense, Defense, Practice squad, and Full roster. `Most famous` is deliberately limited to eight nationally recognizable players per team. This makes the deck → package hierarchy visible without explanatory copy.

Deck provenance in the footer is contextual. It names and links the active deck’s official source rather than implying every deck comes from Dallas. New roster decks use unique player IDs so progress cannot collide across teams. Prefer bundled local headshots for new decks to preserve offline study; remote images are legacy data to migrate rather than a precedent.

## Content rules

- Use player name, number, position, and team only when relevant to the current question.
- Do not repeat the same deck or lesson name in adjacent headings.
- Avoid generic verbs such as “Submit” when the result can be named.
- Do not add helper text to familiar search fields, deck lists, or obvious cards.
- If deleting a label leaves the action equally understandable, delete it.

## Runtime mapping

The hand-maintained variables in `styles.css` are the runtime token owner; the frontmatter above mirrors their accepted values and rationale. `index.html`, `styles.css`, and `app.js` are the production interface. Temporary comparison routes should be removed after a direction is selected and implemented.

Roster refinement and session/package choices use app-owned bottom sheets because their grouping, full-width geometry, and selection hierarchy are part of the product contract. Roster choices use native radio semantics inside app-owned pill labels; each group remains single-select and keyboard accessible.
