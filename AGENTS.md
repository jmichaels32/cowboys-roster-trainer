# UI Design Workflow

## Cost constraint

Do not use any tool, service, hosted generation system, credit system, or subscription that can incur additional charges unless the user explicitly authorizes it.

Installed does not imply free.

By default, use only:

* Codex
* the existing repository and local development environment
* Frontend Design Premium / frontend-design skills that are already available within the current Codex environment

Do not use Superdesign, Mobbin, 12ui hosted generation, or another external design service unless explicitly requested.

## Significant UI work

When asked to redesign, rethink, or substantially improve a screen or flow:

1. Inspect the existing app, neighboring screens, components, and design conventions.
2. Use Frontend Design Premium / frontend-design for design reasoning and quality.
3. Create **4 materially different interactive implementations directly in the app**.
4. Keep them isolated from production using temporary development-only routes, preferably:

   * `/design/<feature>/a`
   * `/design/<feature>/b`
   * `/design/<feature>/c`
   * `/design/<feature>/d`
5. Use the real app shell, realistic data, and important interactions where practical.
6. Make the variants meaningfully different in hierarchy, layout, information architecture, interaction model, or product direction — not merely styling.
7. Run and verify all four.
8. Give the user the four routes and one short sentence explaining each.
9. **STOP and wait for the user to choose. Do not modify production yet.**

## After selection

When the user selects a direction:

1. Preserve what made that direction distinctive.
2. Promote it to the production implementation.
3. Test the real interactions and relevant screen sizes.
4. Fix meaningful visual, UX, responsive, and accessibility problems.
5. Remove abandoned experimental routes and code.

## Small changes

For small, clearly specified UI changes, skip branching and implement directly.

## User interaction

The user should normally only need to say things like:

> "Redesign the workout screen."

Handle design reasoning, variant creation, implementation, testing, and cleanup automatically.
