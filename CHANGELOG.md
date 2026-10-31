# Changelog

## 0.6.0

- `narrow` command: renders a page at phone width (320 px by default) and at desktop width in Chrome and reports
  sideways scrolling with the elements that cause it, cut-off text, text shrunk to fit and content hidden on phones.
  Four new rules (74 in all): `no-horizontal-overflow`, `text-not-clipped`, `no-shrunk-text`,
  `no-hidden-content-narrow`.
- Example `examples/narrow-de.html`: a German settings screen that breaks at 320 px, and a fixed version that keeps every
  word and every size. Suggested on X by Maximilian (x.com/Max9105134).
- The fix skill renders the page at phone width with the longest locale and never counts shrinking or cutting text as a
  fix.

## 0.5.0

- Rules compared with 16 high-rated dashboard designs on Dribbble and Behance ([RESEARCH.md](RESEARCH.md)). 9 new rules
  (70 in all): `no-gradient-buttons` and `no-heavy-card-shadow` (checked), `stat-card-anatomy`, `card-header-pattern`,
  `chart-highlight-one`, `direct-labels`, `dim-secondary-digits`, `status-system`, `one-primary-action` (review).
- Class rules can be limited to elements (`onlyElements`).
- The fix skill has a data pass (stat cards, charts, headline figures).

## 0.4.2

- `story`: marks stay on the before screen only, so the wipe leaves a clean after screen behind it; every occurrence of
  a matched text is marked (the same emoji in each row), not only the first; blurred or hidden decorations are not
  boxed; marks appear in reading order and are clamped to the screen.

## 0.4.1

- `story`: 12 seconds instead of 8 (findings appear over 4 s, a slower wipe), `--music track.mp3` lays a track under
  the video, cut to length and faded out; up to 160 findings are marked on screen.
- The example dashboard has a reviews table, so the screen fills the frame; its music was made with ElevenLabs Music.

## 0.4.0

- Fix skill `ai-design-fix`: measure with the checker, pick a direction from the product, fix spacing, surfaces,
  icons, copy, type, layout, components and motion in passes, then check again and report before → after.
- `story` command: a square before/after video with every finding marked (files or URLs; Chrome over the DevTools
  protocol and ffmpeg, no npm dependencies). Example screens in `examples/`.
- 20 new rules (61 in all). Checked: `no-heavy-headings`, `no-hover-scale`, `spacing-scale` (4 px grid),
  `no-exclamation-copy`, `no-greeting-headline`, `no-unsourced-proof`, `no-layout-animation`, `no-announcement-pill`,
  `no-italic-emphasis`, `no-tight-small-text`, `no-trailing-period-labels`, `short-placeholders`, `no-sparkle-for-ai`,
  `no-placeholder-data`, `no-blur-blobs`. Review: `one-accent`, `nested-radius`, `hero-one-action`,
  `show-the-product`, `no-badge-spam`.
- `icons-not-emoji` also reads HTML and Blade and knows ⭐ ⚡ ❤; `no-decorative-uppercase` also catches labels typed in
  capitals and arbitrary tracking such as `tracking-[0.14em]`.

## 0.3.0

- New rule `use-shared-looks`: a span styled as a badge, a div styled as a card, a heading with its own size classes
  or a link styled as a button is flagged; `config.looks` names the component that owns each look.
- Container components (`config.containers`: Card, SectionCard, Tile, Panel, row and list components) may take padding,
  gap, height and text classes from the caller; only colour, radius, border, ring, shadow and outline count as overrides.
- `inventory` counts a component's look as its props plus outside look classes, so inner layout no longer inflates the
  number of looks; Heading, Tile and Panel are counted as shared.
- Paths given as `./src/a.tsx` or absolute paths are checked (they were silently skipped).

## 0.2.1

- Fewer false positives found while applying the rules to two production panels: dialog/popover containers and
  inputs whose wrapper draws the focus ring (`focus-within:`, `has-[…:focus-visible]`) are exempt from
  `focus-ring-removed`; react-aria `slot` buttons are labelled by their parent; components inside the component folder
  may compose each other; `no-naive-plural` needs a real singular/plural pair; `" " + t('…')` is not a glued sentence;
  `t('OK')` as a status label is no longer a button label.
- `ai-design-check-ignore-next-line` covers a tag spread over several lines.

## 0.2.0

- 17 new rules (40 in total): shared components with one look per element (`use-shared-components`,
  `no-style-overrides`, `repeated-markup`), accessibility (`focus-ring-removed`, `icon-button-name`), localisation
  (`locale-aware-case`, `locale-number-format`, `no-naive-plural`, `no-concatenated-translation`), motion
  (`no-transition-all`, `no-bounce-easing`, `reduced-motion`), copy (`specific-action-labels`, `error-copy`,
  `ellipsis-character`), `tabular-numbers`, `no-icon-tile-stack`.
- Class rules read class strings only (`class`, `className`, `cn()`, `clsx()`, `cva()`, `twMerge()`), code rules skip
  comments: far fewer false positives.
- `inventory`: how many different looks each kind of element has.
- `hook`: post-edit agent hook (Claude Code `PostToolUse`), exit 2 hands findings back to the agent.
- Baseline (`--write-baseline`), inline ignores with a required reason, `--format github`, summary of review-only rules.
- Large `--json` output is no longer cut when piped.

## 0.1.1

- Published from GitHub Actions with npm trusted publishing and provenance; no rule changes.

## 0.1.0 (@enmera/ai-design-check)

- Renamed from `@enmera/design`: the name says what it is for, checking interfaces built with AI coding agents.
  Config file `ai-design-check.json`; `.design-rules.json` and `enmera-design.json` are still read.

## 0.1.0 (@enmera/design, deprecated)

- First release: 23 rules in English and Turkish (`rules.json`), generated RULES.md / RULES.tr.md.
- Zero-dependency checker (`npx @enmera/ai-design-check`): type and radius scale, sentence case in JSX labels and i18n
  dictionaries, tracked uppercase, emoji, gradient text and purple gradients, side stripes, glow, pulse, marquee,
  CSS columns, buzzwords. Config in `enmera-design.json` or `.design-rules.json`.
- Agent skill (`npx skills add enmerasoftware/ai-design-check`).
