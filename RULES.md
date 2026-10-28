# Enmera design rules

[Türkçe](RULES.tr.md) · Generated from `rules.json`; edit that file, then run `npm run docs`. Rules marked **checked** are found by `npx @enmera/ai-design-check`; the others are reviewed by people and agents.

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

## Components and reuse

### Interactive elements come from shared components

`use-shared-components` · warning · checked

**Rule:** Pages use the shared Button, Input, Select, Textarea and Checkbox components, not raw <button>, <input>, <select> or <textarea>. Raw elements live only inside the component folder.

**Why:** Every raw element is a new copy of the button: one place gets a different height, focus ring or radius, and the next fix misses it.

**How to fix:** Replace it with the component; if the component lacks a variant, add the variant to the component.

### Badges, boxes, headings and button links come from shared components

`use-shared-looks` · warning · checked

**Rule:** A span styled as a badge, a div styled as a card, a heading with its own size classes or a link styled as a button is a hand-made copy of a shared component. Use the badge, box, heading and link-button components; the project names them in config.looks.

**Why:** Badges and boxes drift fastest: the same 'new' label ends up in five paddings and four greens. A heading scale only holds when headings pick a size instead of writing one.

**How to fix:** Replace the element with the component and pick a tone and size; if none fits, add a tone or size to the component, not a class at the call site.

### No visual overrides on shared components

`no-style-overrides` · warning · checked

**Rule:** className on Button, Badge, Input, Card and other shared components only places them (width, margin, alignment, grid position). Colour, radius, padding, height, font and border come from the component's variant and size props.

**Why:** An override is a hidden fork of the component: the same button looks different on two screens, which is exactly what a design system exists to stop.

**How to fix:** Move the look into a named variant or size of the component and use that.

### Repeated markup becomes a component

`repeated-markup` · warning · checked

**Rule:** The same long class list repeated in several places (a card, a badge, a stat tile, a section heading) is extracted into one shared component.

**Why:** Copies drift: one gets a new padding, another keeps the old radius. One component means one fix and less code.

**How to fix:** Extract the element into a component (or a variant of an existing one) and replace the copies.

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

### No icon tile above every heading

`no-icon-tile-stack` · warning · review

**Rule:** A grid of identical cards each with a rounded icon tile, a heading and two lines of text is a template, not a layout. Use the icon inline or not at all, and vary what leads.

**Why:** It is the default output of every generator and says nothing about the product.

**How to fix:** Lead with the real content (a number, a screenshot, an example) instead of an icon.

## Accessibility

### Never remove the focus ring without a replacement

`focus-ring-removed` · error · checked

**Rule:** outline-none / outline-hidden only together with a visible focus-visible style (ring, outline or border) on the same element.

**Why:** Keyboard users lose their place. WCAG 2.4.7 (focus visible), 2.4.11 (focus not obscured).

**How to fix:** Add focus-visible:ring-2 (or the component's focus style); prefer outline-hidden over outline-none in Tailwind 4 so forced-colours mode keeps an outline. Dialog and popover containers receive focus programmatically and are exempt.

### Icon-only buttons have a name

`icon-button-name` · error · checked

**Rule:** A button or link that shows only an icon carries aria-label (or title, or visually hidden text).

**Why:** Screen readers announce "button" with no purpose; WCAG 4.1.2 name, role, value.

**How to fix:** Add aria-label with the action in sentence case ("Delete keyword").

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

### Transition named properties, not all

`no-transition-all` · warning · checked

**Rule:** No transition-all / transition: all; animate transform and opacity, transition colours by name.

**Why:** transition: all animates layout and size changes nobody intended and costs frames.

**How to fix:** transition-colors, transition-opacity, transition-transform or transition-[width].

### No bounce or overshoot easing on interface

`no-bounce-easing` · warning · checked

**Rule:** No animate-bounce and no cubic-bezier that overshoots for controls, panels and lists.

**Why:** Bounce reads as toy-like and dated on working screens and slows repeated actions.

**How to fix:** ease-out for entering, ease-in for leaving, 150–300 ms.

### Respect reduced motion

`reduced-motion` · note · review

**Rule:** Decorative and large motion stops or shrinks under prefers-reduced-motion (motion-safe: / motion-reduce:).

**Why:** Motion triggers vestibular discomfort; WCAG 2.3.3.

**How to fix:** Prefix long or looping animations with motion-safe:.

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

### Tabular numerals in tables and KPIs

`tabular-numbers` · note · review

**Rule:** Numbers that are compared or update (table columns, KPIs, counters, timers) use tabular-nums and right alignment in tables.

**Why:** Proportional digits make columns jagged and values jump as they change.

**How to fix:** Add tabular-nums to the cell or the table; text-end for numeric columns.

## Localisation

### Case changes name the locale

`locale-aware-case` · warning · checked

**Rule:** toUpperCase()/toLowerCase() on interface text use toLocaleUpperCase(locale)/toLocaleLowerCase(locale).

**Why:** Turkish i/İ and ı/I: "istanbul".toUpperCase() is "ISTANBUL", not "İSTANBUL".

**How to fix:** Pass the interface locale; for keys and ids the plain methods are fine (allow-list them).

### Numbers, dates and money through the locale formatter

`locale-number-format` · warning · checked

**Rule:** Interface numbers go through the project's formatter (Intl with an explicit locale). No toFixed(), no toLocaleString() without a locale, no "$" + value.

**Why:** 1,255.00 vs 1.255,00: the wrong separator misreads by a factor of a thousand; server and browser render different text.

**How to fix:** Use the shared format helper; keep raw toFixed() only for machine values.

### Plurals through the plural system

`no-naive-plural` · warning · checked

**Rule:** No count === 1 ? "item" : "items" and no + "s": plurals go through the i18n plural form (trans_choice, ICU, Intl.PluralRules).

**Why:** Languages have up to six plural categories; English-only logic breaks every translation.

**How to fix:** Use the plural helper of the i18n layer with the count.

### No sentences glued from pieces

`no-concatenated-translation` · warning · checked

**Rule:** A sentence is one translation key with placeholders, never t('a') + value + t('b').

**Why:** Word order differs by language: Turkish puts the verb last.

**How to fix:** One key: t(':count keywords on page one', { count }).

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

### Buttons say what they do

`specific-action-labels` · warning · checked

**Rule:** No Submit, OK, Click here, Yes/No: the label names the action and its object ("Save changes", "Delete keyword").

**Why:** Generic labels force people to read the whole dialog and make destructive buttons easy to hit by mistake.

**How to fix:** Verb + object, sentence case.

### Errors say what happened and what to do

`error-copy` · warning · checked

**Rule:** No "Oops", "Something went wrong", "An error occurred", "Invalid input": name the problem and the next step.

**Why:** A vague error leaves people stuck and creates support tickets (GOV.UK error message guidance).

**How to fix:** "Enter a date in the past", "The file is over 5 MB: choose a smaller one".

### Ellipsis character, not three dots

`ellipsis-character` · note · checked

**Rule:** "Loading…", "Search…" use the single … character.

**Why:** Three periods break differently and read as a typo next to real typography.

**How to fix:** Replace ... with … in interface strings.
