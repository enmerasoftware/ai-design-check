---
name: design-check
description: Design rules for product interfaces (dashboards, admin panels, SaaS screens) with a checker. Use before building or changing any UI screen, component, label, menu item, table or chart, and before reviewing UI changes: sentence case, one type and radius scale, one selector language, layouts without dead space, no generated-UI tells.
---

# Enmera design rules

Apply these rules whenever you build, change or review interface code.

## Before you write UI

1. Read `RULES.md` from this package (Turkish: `RULES.tr.md`), or run `npx @enmera/design-check rules`.
2. Decide the place first: which menu section, its own row or a tab of an existing page, which URL prefix
   (`menu-by-job`). State the decision in one line before writing code.
3. Reuse the project's components for the selector language: segmented control for the primary choice, plain
   sub-tabs on the same row, pill chips only for filters (`selector-language`).

## While you write

- Sentence case for every label you add, in the source language and in each translation; keep proper names.
- Font sizes and radii only from the theme scale; never `text-[Npx]` or a one-off `rounded-[..]`.
- No tracked uppercase labels, emoji as decoration, gradient text, purple gradients, side stripes, decorative glow,
  fake pulses or marquees.
- Wide tables take the full width with the last column absorbing spare width; uneven cards go into a grid masonry.
- Headline numbers say what they are compared with; empty data shows an empty state.

## After you write

Run the checker and fix what it reports, or add a justified entry to the project's config `allow` list:

```bash
npx @enmera/design-check
```

For the rules marked *review* (layout, selectors, empty states, contrast), look at the screen itself (screenshot
at desktop and phone width) before calling the work done.

## Adding to the rules

When the user corrects a design decision that is general, propose adding it to `rules.json` of this package
(with `why` and `fix` in English and Turkish) so the next project gets it too.
