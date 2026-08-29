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
2. NFL Top 100

Decks own their player set, progress, and optional accent. The app shell remains neutral so adding another team or league-wide deck never requires a redesign.

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

Keep search visible on collection screens, but progressively disclose secondary controls. Study group, position, learning-status, and sort choices belong in one clearly labeled sheet rather than simultaneous fields. Pushed screens use an icon-only back arrow with an accessible label and support both swipe-left and the familiar iOS edge-swipe back gesture.

The roster uses the approved “single refine sheet” pattern: a full-width search field, a quiet row containing the live result count and one `Refine` action, then results. `Refine` opens one bottom sheet containing study group, position, learning status, and sort as app-owned single-choice pills. Group names mirror the learning packages exactly; `Full roster` is the neutral default. Applied settings are counted beside `Refine`; search has an app-owned clear button whenever text is present. Local filtering updates immediately and a no-results state offers one reset action.

Roster rows are compact reference cards. On phones, use a narrow headshot column and three short information levels: name/number, position with height and weight, then college mark/name. Learning status remains a small semantic chip. College marks are cached app assets so they work offline; a compact text monogram is the fallback when no mark is available or an image fails. Depth-chart status is optional structured data: render it beside learning status only when a sourced value exists, and never imply starter/second/third string from roster order or player prominence.

Roster sorting covers every visible player attribute that produces a meaningful order: practice priority, name, jersey number, position, college, height, weight, and learning progress. Directional physical sorts name their direction (`Tallest first`, `Heaviest first`) rather than leaving ascending/descending ambiguous.

Deck rows are destinations, not selectable settings. Tapping an available deck opens it immediately; there is no separate “Study [deck]” button. Unavailable decks remain visibly disabled with a concise availability state. Player browsing belongs inside the selected deck, and Back/swipe returns from Players to that deck before returning to the deck list.

Use `touch-action: manipulation` on the application surface and controls to prevent accidental double-tap zoom without disabling pinch zoom or setting a restrictive viewport scale.

Session setup is one editable sentence: “Practice [level] with [content] for [length].” Each emphasized value opens a focused bottom sheet; the screen shows no setup grids, group label, deck description, progress summary, or practice explanation. Mastery fixes content to all facts. The only persistent action is “Start [length].”

The top bar is contextual, not branded: “Decks” on the deck picker and the selected deck name on its screens. The package name is a large selector above session setup. Its sheet lists all available packages and their player counts, making the deck → package hierarchy visible without explanatory copy.

## Content rules

- Use player name, number, position, and team only when relevant to the current question.
- Do not repeat the same deck or lesson name in adjacent headings.
- Avoid generic verbs such as “Submit” when the result can be named.
- Do not add helper text to familiar search fields, deck lists, or obvious cards.
- If deleting a label leaves the action equally understandable, delete it.

## Runtime mapping

The hand-maintained variables in `styles.css` are the runtime token owner; the frontmatter above mirrors their accepted values and rationale. `index.html`, `styles.css`, and `app.js` are the production interface. Temporary comparison routes should be removed after a direction is selected and implemented.

Roster refinement and session/package choices use app-owned bottom sheets because their grouping, full-width geometry, and selection hierarchy are part of the product contract. Roster choices use native radio semantics inside app-owned pill labels; each group remains single-select and keyboard accessible.
