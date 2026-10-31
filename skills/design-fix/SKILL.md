---
name: ai-design-fix
description: Fixes AI-generated, "vibecoded" UI so it reads as designed: audits the screen with the ai-design-check rules and checker, proposes a direction taken from the product, then fixes spacing, surfaces and colour, icons, copy, type, layout, components and motion in that order, and proves the result by re-running the checker. Use when the user asks to fix, clean up, polish, de-slop or redesign a screen, dashboard, landing page or component that looks generated (purple gradients, glows, emoji labels, tracked uppercase, heavy headings, uneven spacing, shouty copy). Works on React, Vue, Svelte, Tailwind, Blade and plain HTML/CSS. Can render a before/after video.
---

# Fix a generated-looking screen

The checker finds what can be measured; this skill fixes it and the things only a look at the screen can find. Keep
the product: features, data, content and the order of sections stay. Change how every size, colour, word and
effect is chosen. A screen that is clean but could belong to any product is not done.

## 1. Measure first

1. Copy the file(s) you will change to `*.before.*` next to them (or note the git commit), so a before/after can be
   rendered at the end.
2. Run the checker on exactly those files and keep the numbers:

   ```bash
   npx @enmera/ai-design-check path/to/screen.tsx --json
   ```

3. Look at the screen at desktop and phone width (a browser tool, Playwright, or the user's screenshot). The rules
   marked *review* need eyes: `one-accent`, `nested-radius`, `hero-one-action`, `show-the-product`,
   `no-badge-spam`, `selector-language`, `empty-states`, `legible-contrast`, `readable-measure`, `spacing-rhythm`.
4. Write the audit in one short list: each problem, where it is, which rule. Group by area, worst first.

If the screen is already good, say so and suggest two or three small refinements instead of redesigning it.

## 2. Pick a direction (4 lines, before any edit)

- **Who and what**: the user and the job of this screen in one sentence.
- **World**: one place the product belongs to (a ledger, a newsroom, a harbour, a workshop). It picks the neutral
  ramp (warm, graphite or ink) and the accent.
- **Accent**: one colour, used on the primary action, the selection and one key figure. Keep a real brand colour;
  a purple-to-blue glow is not a brand.
- **One moment**: the single place that carries richness (the main chart, a product view, the headline number).
  Everything else stays quiet.

For a large change, show the audit and the direction and let the user steer before editing. For a small screen or
when the user said "just do it", continue.

## 3. Fix in passes, across the whole screen

Do one layer at a time over every element, not one element at a time. Reuse the project's components and tokens;
see [scales.md](references/scales.md) for starting values when the project has none.

1. **Spacing**: every arbitrary value onto the 4 px grid (`spacing-scale`), one gap inside groups and a larger one
   between them, one padding for sibling cards, one row height per list.
2. **Surfaces and colour**: one neutral surface ramp, hairline borders at 6–10 % of the text colour, depth from
   surface steps. Remove gradients on surfaces and text (`no-ai-gradients`), glows outside charts
   (`glow-in-charts-only`), blurred blobs (`no-blur-blobs`), side stripes. The accent appears two or three times.
3. **Icons**: one line icon set at one size and stroke; emoji and sparkles out (`icons-not-emoji`,
   `no-sparkle-for-ai`); same icon box width in every row.
4. **Data**: stat cards read label → value → change with its period (`stat-card-anatomy`); charts keep every series
   neutral but one and label it on the chart (`chart-highlight-one`, `direct-labels`); dim cents and decimals in the
   headline figure (`dim-secondary-digits`).
5. **Copy**: the title names the page, not the user (`no-greeting-headline`); no exclamation marks
   (`no-exclamation-copy`), no buzzwords, every change says what it is compared with (`numbers-with-context`),
   buttons say what they do, sentence case, no full stop on labels, short placeholders, plausible sample data.
6. **Type**: sizes from the scale (`type-scale`), weights 400–600 (`no-heavy-headings`), no tracked uppercase
   labels, negative tracking only on large display text, tabular figures for numbers, one format per number.
7. **Layout**: one primary action per page header (`one-primary-action`), one card header pattern (title left, one
   control right; `card-header-pattern`), one main element leads (the main chart spans most of the width; stat cards are compact and equal
   height); wide tables span the page; a hero has one primary and at most one secondary action; readable line
   length.
8. **Components**: flat buttons (`no-gradient-buttons`), cards on surface steps instead of heavy shadows
   (`no-heavy-card-shadow`), one status system (`status-system`); buttons, inputs, badges and cards from the shared components (`use-shared-components`,
   `use-shared-looks`, `no-style-overrides`); radius by size and nested radius; few, quiet badges.
9. **Motion**: named transitions only, no hover growth, no bounce, pulse only for live data, transform and opacity
   instead of position; respect reduced motion.
10. **Visual**: where the screen needs a picture, show the product with real-looking data instead of a generic
   visual (`show-the-product`).

## 4. Prove it

1. Run the checker again on the same files and report before → after per area (for example
   `221 → 0 findings; spacing 76 → 0, type 57 → 0`). Anything left gets a fix or an inline ignore with a reason.
2. Look at the screen again at desktop and phone width. The checker cannot see contrast, rhythm or hierarchy.
3. Optional, for sharing: render a square before/after video (Chrome and ffmpeg on the machine, no other
   dependencies):

   ```bash
   npx @enmera/ai-design-check story screen.before.html screen.html --out story.mp4
   ```

   It takes files or URLs, marks every finding on the before screen, wipes to the after screen and counts down.

## Rules for this skill

- Never remove features, data or content to make the count go down.
- Never silence a finding without a reason in the ignore comment.
- When a fix is a general lesson (it would apply to the next project too), propose it as a rule for `rules.json`.
