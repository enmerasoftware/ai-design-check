# Enmera design rules

[Türkçe](RULES.tr.md) · Generated from `rules.json`; edit that file, then run `npm run docs`. Rules marked **checked** are found by `npx @enmera/design check`; the others are reviewed by people and agents.

## Writing

### Sentence case for interface text

`sentence-case` · error · checked

**Rule:** Only the first word and proper names start with a capital letter: "Rank tracking", "Site health". No automatic title-casing helper; text shows as written.

**Why:** Title Case on every short label reads loud and is not Turkish (or modern English UI) style. Microsoft's Turkish style guide: only proper nouns and the first word.

**How to fix:** Keep proper names (Google Business Profile, Search Console), official category and document names, abbreviations (AI, SERP) and language-code badges as they are. After a path separator the first word stays capitalised: "Site health › Site audit".

### No tracked uppercase labels

`no-decorative-uppercase` · warning · checked

**Rule:** No small uppercase, letter-spaced labels (kickers, eyebrows, section captions such as "NAVIGATION").

**Why:** It is the most common generated-UI template and hurts reading: we recognise words by shape.

**How to fix:** Write the label in sentence case with normal tracking. Codes, language codes and initials avatars may stay uppercase.

### Labels fit their slot

`short-labels` · note · review

**Rule:** A menu item or tab label that gets truncated is shortened, using the same word for the same thing everywhere.

**Why:** A cut label hides the meaning and looks unfinished.

**How to fix:** Shorten the label; do not shrink the font.

## Type scale

### Font sizes from the scale only

`type-scale` · error · checked

**Rule:** Use the theme scale: text-2xs (11 px, the smallest), text-xs, text-sm, text-base and up. No arbitrary text-[10px] or text-[13px].

**Why:** One-off sizes pile up into screens that are almost, but not quite, the same. Text under 11 px is a legibility failure.

**How to fix:** Add --text-2xs: 0.6875rem (line height 1rem) to the theme and map 9–11 px to it, 12 px to text-xs, 13 px to text-sm. Display sizes on marketing pages go in the allow list.

## Corners and surfaces

### Corner radii from the scale only

`radius-scale` · error · checked

**Rule:** Use rounded-md … rounded-3xl and rounded-full; large marketing surfaces get one shared token (rounded-panel). Arbitrary radii only for micro elements up to 5 px and for drawn device or icon shapes.

**Why:** 28, 30 and 32 px side by side read as noise, not as a system.

**How to fix:** Pick the nearest scale step or add one named token.

### No cards inside cards

`no-nested-cards` · warning · review

**Rule:** Group inside a card with spacing, type and dividers, not another bordered card.

**Why:** Nested frames add depth without meaning.

**How to fix:** Flatten: a divider or a muted background block instead of a second border and shadow.

## Selectors

### One selector language

`selector-language` · error · review

**Rule:** A primary choice that changes the content (page tabs, topic groups, separate lists) is a segmented control. Its sub-tabs sit on the same row to its right as plain text (selected one on a light fill). Filters that narrow the same list are pill chips inside the list.

**Why:** Two stacked selector rows of similar weight hide which one is the main choice. Underlined tabs were tried and rejected.

**How to fix:** Never two selector rows on top of each other and no underline tabs. A small variant switch inside a card is a small segmented control.

## Layout

### Wide tables span the page

`full-width-tables` · warning · review

**Rule:** A data table with several columns takes the full width; the last column absorbs the spare width (w-full, cells max-w-0 truncate) so date and value never drift apart.

**Why:** Squeezed into a side column it truncates names; with few rows it leaves an empty area below.

**How to fix:** Move the side cards below the table into a two-column masonry.

### Uneven cards in a grid masonry

`masonry` · warning · checked

**Rule:** Cards of different heights go into a grid-based masonry (two columns, left-to-right order). No CSS columns, and no narrow column with empty space under it.

**Why:** CSS columns split shadows at the column top in Chrome and order cards column by column.

**How to fix:** Use a grid masonry component that places each card into the shortest column.

### Readable line length and leading

`readable-measure` · warning · review

**Rule:** Running text stays under about 80 characters per line (max-w-prose / max-w-3xl) with line height of at least 1.3; headings have more space above than below.

**Why:** Long lines lose the reader on the way back.

**How to fix:** Cap the paragraph width, not the card.

### Spacing with rhythm

`spacing-rhythm` · note · review

**Rule:** Related items sit tight, sections breathe. The same gap everywhere has no rhythm.

**Why:** Grouping is read from spacing before anything else.

**How to fix:** Use two or three steps: inside a group, between groups, between sections.

## Navigation

### Menu grouped by job, place decided first

`menu-by-job` · warning · review

**Rule:** Before building a feature decide its place: which menu section, its own row or a tab of an existing page, which URL prefix. Pages of the same job are one menu row with tabs. Sections collapse; the current one stays open.

**Why:** Without it a menu grows into a flat list of fifty rows where related work sits in four places.

**How to fix:** A moved address answers with 301 (path and query kept); callback URLs registered with outside services never move. Help texts name the same path as the menu.

## Visual language

### Line icons, not emoji

`icons-not-emoji` · warning · checked

**Rule:** Interface marks are line icons from one set (lucide). Emoji and text glyphs such as ✓ ★ are not used as UI decoration; emoji that are content (an emoji picker) stay.

**Why:** Emoji render differently on every platform and read as generated.

**How to fix:** Replace with the matching icon at the text size.

### No gradient text or purple gradients

`no-ai-gradients` · error · checked

**Rule:** Text is solid colour. No purple, violet or indigo gradients and no decorative radial halos behind sections.

**Why:** They are the most recognisable tells of generated interfaces.

**How to fix:** Use the brand colour flat; colour carries meaning (state, series, selection).

### No coloured side stripe on cards

`no-side-stripe` · warning · checked

**Rule:** No thick coloured border on one side of a card or alert.

**Why:** It is the single most common generated-UI accent and fights the rounded corner.

**How to fix:** Use a status badge, an icon or a light tinted background.

### Glow only in charts

`glow-in-charts-only` · warning · checked

**Rule:** Coloured glow shadows belong to the chart language (score rings, chart lines) only; buttons, cards and text do not glow.

**Why:** Glow everywhere is noise; glow on data draws the eye to the number.

**How to fix:** Remove it, or list the chart component in the allow list.

### Legible contrast

`legible-contrast` · warning · review

**Rule:** Text meets WCAG AA (4.5:1, large text 3:1); no grey text on coloured backgrounds.

**Why:** Grey on colour looks washed out and fails readers in sunlight.

**How to fix:** Use a darker shade of the background colour or near-white.

## Motion

### Pulse only for live data

`pulse-for-live-only` · note · checked

**Rule:** A pulsing dot means something is running right now; it never decorates.

**Why:** Fake liveness teaches people to ignore real alerts.

**How to fix:** Bind the animation to the running state; show a static dot otherwise.

### No auto-scrolling strips

`no-marquee` · warning · checked

**Rule:** Content does not scroll by itself.

**Why:** It demands attention and always hides half of its content.

**How to fix:** A static, swipeable row or a short list.

## Data and numbers

### Numbers carry their comparison

`numbers-with-context` · warning · review

**Rule:** A headline number shows what it is compared with ("−1.2 vs last week") and, if it moves over time, its recent history.

**Why:** "Average rank 13.8" alone does not say whether that is good news.

**How to fix:** Add the delta and its period under the number.

### Empty data shows an empty state

`empty-states` · warning · review

**Rule:** No data means an empty state with the next step, never an empty chart or a table of dashes.

**Why:** An empty chart looks broken.

**How to fix:** Say why it is empty and what fills it (connect, run, wait for the first check).

## Interaction

### Filters react instantly

`instant-filters` · note · review

**Rule:** A filter's value updates in local state at once; the list does not fade while reloading; tabs are prefetched.

**Why:** Waiting for the server before the control moves feels broken.

**How to fix:** Optimistic local value, background reload without a progress bar, prefetch on tabs.

## Copy

### No marketing buzzwords

`no-buzzwords` · warning · checked

**Rule:** No streamline, empower, supercharge, seamless, cutting-edge, next-generation, world-class, revolutionize. Say what it does, with a number if there is one.

**Why:** These words are instant tells of generated copy and promise nothing measurable.

**How to fix:** Replace the claim with the measured fact.
