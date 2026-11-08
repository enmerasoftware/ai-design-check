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

### No arrow on every call to action

`no-arrow-suffix` · note · checked

**Rule:** Buttons and links do not end in an arrow (→, ›, » or an arrow icon) as a habit; one such link is fine.

**Why:** The label already says where it goes; an arrow on every action is a generated-page habit.

**How to fix:** Remove the arrows; keep one only where it marks moving on, such as the next step.

### No lists strung on middle dots

`no-middle-dot-lists` · note · checked

**Rule:** Short lines do not string three or more items on · or • ("Fast · Private · Free"); a footer line and a dated byline are fine.

**Why:** Three words on dots say less than a sentence would; the shape is a generated-page habit.

**How to fix:** Write it as one sentence, or keep the one item that matters.

### No full stop on buttons and labels

`no-trailing-period-labels` · note · checked

**Rule:** Buttons, tabs, menu items and short labels end without a full stop; sentences in help text keep theirs.

**Why:** A full stop turns a command into a sentence and makes a row of buttons uneven.

**How to fix:** Remove the final full stop.

### Short placeholders

`short-placeholders` · note · checked

**Rule:** No "Search anything...", "Type here..." or "Enter your email here"; a placeholder is one or two words or an example value.

**Why:** Wordy placeholders repeat the label, disappear when typing and read as filler.

**How to fix:** "Search", or an example such as "name@company.com".

### Text is not cut off

`text-not-clipped` · warning · checked

**Rule:** Labels, buttons and table cells show their whole text at 320 px. Truncation with an ellipsis is allowed only where the full text is one tap away (title, tooltip, detail view).

**Why:** A cut-off label can change meaning ("Delete all…" of what?), and translations are often 30–40 % longer than English.

**How to fix:** Let the text wrap; if it truly must be one line, keep the full text in a title and in the detail view.

### No eyebrow label above a heading

`no-eyebrow-label` · warning · checked

**Rule:** A tiny tracked or capitalised label does not sit on its own line right above a heading.

**Why:** The heading carries its own weight; the label is scaffolding left in place.

**How to fix:** Delete it, or work its information into the sentence below.

### No wall of em dashes

`no-em-dash-saturation` · note · checked

**Rule:** Eight or more em dashes at about one per 500 characters are rewritten.

**Why:** One is punctuation; a page of them is a generated cadence.

**How to fix:** Use full stops and commas.

### No slogan cadence

`no-aphorism-cadence` · note · checked

**Rule:** Sections do not keep landing on "X. No Y." or "Not a feature. A platform."; once is fine, three times is a tic.

**Why:** A manufactured contrast says nothing the reader can check.

**How to fix:** Say what the product does, with a number or a fact.

### No "theater" framing

`no-theater-copy` · note · checked

**Rule:** Do not dismiss something as "security theater" or "productivity theater".

**Why:** It is a recurring generated tic, and it skips the argument.

**How to fix:** Say plainly what the thing does or does not do.

### One card says a thing once

`no-repeated-label` · note · checked

**Rule:** The same text does not appear three or more times inside one card.

**Why:** A status wired into every slot of a template is noise.

**How to fix:** Say it once, where it counts.

## Type scale

### Font sizes from the scale only

`type-scale` · error · checked

**Rule:** Use the theme scale: text-2xs (11 px, the smallest), text-xs, text-sm, text-base and up. No arbitrary text-[10px] or text-[13px].

**Why:** One-off sizes pile up into screens that are almost, but not quite, the same. Text under 11 px is a legibility failure.

**How to fix:** Add --text-2xs: 0.6875rem (line height 1rem) to the theme and map 9–11 px to it, 12 px to text-xs, 13 px to text-sm. Display sizes on marketing pages go in the allow list.

### Headings at regular to semibold weight

`no-heavy-headings` · warning · checked

**Rule:** No font-extrabold or font-black (weight 800–900) in interface headings and numbers; hierarchy comes from size and position.

**Why:** Generated screens make every heading as heavy as possible, so nothing reads as more important.

**How to fix:** Use 400–600 and a step up in size. A display face that is designed heavy can be allowed in config.

### Emphasis with weight or colour, not italic

`no-italic-emphasis` · note · checked

**Rule:** Interface text is not set in italic for emphasis; quotes and titles of works may be italic.

**Why:** Italic is harder to read at interface sizes and looks like a placeholder.

**How to fix:** Use font-medium or the secondary text colour.

### Small text keeps normal tracking

`no-tight-small-text` · warning · checked

**Rule:** tracking-tight and negative letter spacing belong to large display text (40 px and up), never to text-base and smaller.

**Why:** Small letters squeezed together lose their shapes and become hard to read.

**How to fix:** Leave tracking at 0 for small text; slightly positive is fine for muted captions.

### Line height survives the class merge

`leading-survives-merge` · warning · checked

**Rule:** In cn() or twMerge() a leading-* class does not come before a text-<size> class: write the size with its line height (text-xl/snug) or put leading after it.

**Why:** tailwind-merge treats a font size as also setting line height, so cn('leading-snug', 'text-xl') silently drops leading-snug and the heading renders at 1.2 instead of 1.375.

**How to fix:** text-xl/snug, or move leading-* after the size class.

### Text is not shrunk to fit

`no-shrunk-text` · warning · checked

**Rule:** Body text and labels keep their size on phones (never below 12 px, never smaller than on desktop); only large headlines may scale down.

**Why:** Phones are read at arm's length and in sunlight; shrinking text to make a layout fit moves the problem to the reader.

**How to fix:** Keep the size and let the layout give: wrap, stack, or move secondary content below.

### Giant type once a page

`one-display-size` · warning · review

**Rule:** One element on a page may be far bigger than the rest, and it is a figure or a short phrase. Section headings stay on a shared scale, about 32–48 px on a landing page.

**Why:** Scale makes an event only by contrast. When every section shouts, the page reads as absurd and the words get harder to read.

**How to fix:** Write the heading sizes as variables, list the rendered sizes, and bring everything but the one chosen element back onto the scale.

### A font chosen, not defaulted

`no-overused-font` · note · checked

**Rule:** The main font is not one of the faces every generated page reaches for (Inter, Roboto, Geist, Fraunces, Space Grotesk and the like), unless the brand owns it.

**Why:** A default face tells the visitor nobody decided.

**How to fix:** Pick one with `system --character`, or allow it in the config when it is the brand font.

### Headings stand above the text

`flat-type-scale` · warning · checked

**Rule:** The largest heading is at least 1.25 times the body size.

**Why:** With no size step the eye has nowhere to start.

**How to fix:** Add one stronger step at the top of the page.

### No full sentence at display size

`no-giant-sentence` · warning · checked

**Rule:** A headline of eight words or more stays under 64 px and under 60% of the first screen.

**Why:** It fills the first screen and leaves no room for what the page offers.

**How to fix:** Shorten the headline or lower its size.

### No italic serif hero

`no-italic-serif-hero` · warning · checked

**Rule:** The main headline is not set in a large italic serif, whole or with one italic word as an accent.

**Why:** It reads as taste on one page and has become the uniform of generated landing pages.

**How to fix:** Set it roman; carry the emphasis with weight, position or the words.

### No crushed letter spacing

`no-crushed-tracking` · warning · checked

**Rule:** Letter spacing stays above -0.05em.

**Why:** Past that point letters lose their shapes.

**How to fix:** Tighten display type by a little, not by a lot.

### No wide tracking on running text

`no-wide-tracking-body` · warning · checked

**Rule:** Running text in small letters keeps letter spacing at or under 0.05em; wide tracking is for short capitalised labels.

**Why:** It breaks up word shapes and slows reading.

**How to fix:** Remove the tracking from running text.

### Lines have room

`no-tight-leading` · warning · checked

**Rule:** Multi-line text under 32 px has a line height of at least 1.3.

**Why:** Tight lines make the eye lose its place.

**How to fix:** Use 1.5 to 1.7 for running text.

### No justified text without hyphens

`no-justified-text` · warning · checked

**Rule:** Text is not justified unless hyphenation is on.

**Why:** Rivers of white run down a narrow column.

**How to fix:** Align left, or use hyphens: auto with the right lang.

### No single word on the last line

`no-straggler` · note · checked

**Rule:** A paragraph does not end with one word alone on its last line.

**Why:** It leaves a hole under the block.

**How to fix:** Set text-wrap: pretty.

### Headings wrap evenly

`balanced-headings` · note · checked

**Rule:** A heading on two or more lines does not end on a much shorter line.

**Why:** A lone word under a heading looks like an accident.

**How to fix:** Set text-wrap: balance, or rewrite it to fit.

### No tiny text

`no-tiny-text` · warning · checked

**Rule:** Text is at least 12 px; links, buttons and table cells at least 11 px.

**Why:** Under that it is a legibility failure, whatever the screen.

**How to fix:** Raise it to the smallest step of the scale.

### No sentences in capitals

`no-all-caps-sentences` · warning · checked

**Rule:** A run of eight words or more is not set in capitals.

**Why:** We read words by their shape, and capitals remove it.

**How to fix:** Keep capitals for short labels.

## Corners and surfaces

### Corner radii from the scale only

`radius-scale` · error · checked

**Rule:** Use rounded-md … rounded-3xl and rounded-full; large marketing surfaces get one shared token (rounded-panel). Arbitrary radii only for micro elements up to 5 px and for drawn device or icon shapes. In CSS a px radius is 6, 8, 12, 16, 20, 24 or 32, up to 5, or 999 and more.

**Why:** 28, 30 and 32 px side by side read as noise, not as a system.

**How to fix:** Pick the nearest scale step or add one named token.

### No cards inside cards

`no-nested-cards` · warning · checked

**Rule:** Group inside a card with spacing, type and dividers, not another bordered card.

**Why:** Nested frames add depth without meaning.

**How to fix:** Flatten: a divider or a muted background block instead of a second border and shadow.

### Inner corners follow the outer ones

`nested-radius` · warning · review

**Rule:** An element inside a rounded container uses radius = outer radius − padding (never below 4 px); not every element is a full pill.

**Why:** Equal radii inside and out make the gap look uneven at the corners; pills everywhere erase the difference between controls and containers.

**How to fix:** A 16 px card with 8 px padding holds 8 px items; keep full pills for chips and avatars.

### Cards rest on surface steps, not heavy shadows

`no-heavy-card-shadow` · warning · checked

**Rule:** Cards and panels in the page flow use a hairline border or a surface one step lighter than the page; shadow-lg and larger are for things that float (menus, dialogs, popovers).

**Why:** Every high-rated dashboard we studied separated cards with a light page background and white or raised cards, with almost no shadow; heavy shadows make a grid of cards look like floating stickers.

**How to fix:** Drop the shadow to shadow-sm or none and step the surface (page gray-50, card white; dark: page #0b0d14, card #11141c).

### One radius for surfaces of one level

`one-surface-radius` · warning · review

**Rule:** Cards and images at the same level share one radius. 9, 12, 12 and 10 px on one screen is noise; what sits inside follows nested-radius.

**Why:** Each value passes on its own, so no scale check catches it, but the eye reads the mix as parts from different places.

**How to fix:** List the corner radii of the surfaces on the rendered screen as numbers. Choose one for each level and set it through a token.

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

### Few, quiet badges

`no-badge-spam` · warning · review

**Rule:** PRO, New and Beta badges are rare, text-only and have a reason; counts and shortcuts are plain text or a keycap, not glowing pills.

**Why:** Badges on every row stop meaning anything and add noise to the menu.

**How to fix:** Keep one badge where it changes a decision; remove the rest.

### One status system

`status-system` · warning · review

**Rule:** Statuses are a small tinted pill with a dot and a word, from one shared map (success, pending, failed, draft); the same status has the same colour on every screen.

**Why:** Status colour is learned once; when "Pending" is amber in one table and blue in another, people stop trusting colour at all.

**How to fix:** Create one StatusBadge with a status → tone map and use it in every table and card.

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

`readable-measure` · warning · checked

**Rule:** Running text stays under about 80 characters per line (max-w-prose / max-w-3xl) with line height of at least 1.3; headings have more space above than below.

**Why:** Long lines lose the reader on the way back.

**How to fix:** Cap the paragraph width, not the card: max-w-prose (65ch) or about 60ch.

### Spacing with rhythm

`spacing-rhythm` · note · checked

**Rule:** Related items sit tight, sections breathe, and gaps of the same level are one value. 16, 20, 17 and 21 px between sections is noise, not rhythm.

**Why:** Grouping is read from spacing before anything else, and uneven gaps at one level are what makes generated screens feel unplanned even when nobody can say why.

**How to fix:** Use two or three steps: inside a group, between groups, between sections. Measure the rendered screen, list the gaps between its blocks as numbers, and make each level one value.

### Spacing on the project's scale

`spacing-scale` · warning · checked

**Rule:** Arbitrary spacing and sizes in px (mt-[13px], h-[31px], gap-[7px]; margin, padding, gap and offsets in CSS) sit on the project's scale: the one in ai-design-check.json, else the one read from Tailwind, Bootstrap's $spacer and $spacers, or CSS variables, else the 4 px grid. App code (SwiftUI, Compose, Flutter, React Native) uses the config file or 4 pt/dp. Prefer the theme steps.

**Why:** Off-grid values are what a model types when it guesses; rows and gaps drift apart by a pixel or two and the screen looks uneven.

**How to fix:** Round to the nearest theme step (mt-3, h-8, gap-2). If the value is deliberate and the report names the wrong scale, set "spacing" in ai-design-check.json.

### One primary action in a hero

`hero-one-action` · warning · review

**Rule:** A hero keeps to a main action and, if needed, one quieter one; no third button, and no chips or avatar rows piled under them.

**Why:** Each extra action splits attention at the moment the visitor decides whether to stay.

**How to fix:** Keep the main action and one alternative; move the rest further down the page.

### One card header pattern

`card-header-pattern` · warning · review

**Rule:** Every card header is the same: title on the left, at most one control on the right (period selector, "See all" or a ⋯ menu), on one baseline.

**Why:** Repeating one header across cards is what makes a dense dashboard calm; mixed headers make every card a new reading task.

**How to fix:** Extract a CardHeader component with title and an optional action slot and use it everywhere.

### One primary action per page

`one-primary-action` · warning · review

**Rule:** A page header has one filled primary button (usually top right); other actions are secondary, ghost or in a menu.

**Why:** Two filled buttons side by side ask the user to choose before they know what the page is for.

**How to fix:** Keep the action that moves the page's job forward filled; demote the rest.

### No sideways scrolling on phones

`no-horizontal-overflow` · error · checked

**Rule:** At 320 px the page is no wider than the screen. Wide content (a table, a code block) scrolls inside its own box, never the page.

**Why:** A page that scrolls sideways hides its right edge and makes every vertical scroll wobble.

**How to fix:** Let rows wrap (flex-wrap), allow long words to break (hyphens: auto with the right lang, overflow-wrap), wrap wide tables in overflow-x-auto.

### Content stays in its column

`cell-holds-content` · warning · checked

**Rule:** Nothing inside a grid or flex cell paints over the next cell. A flex or grid item that holds a truncated line has min-w-0 (min-width: 0) or overflow hidden, so the line is cut, not the layout.

**Why:** A flex item never shrinks below its content by default, so one long name in a truncate line widens the card past its column and over its neighbour, while the column itself looks fine.

**How to fix:** Add min-w-0 to every flex or grid item between the cell and the truncated text (or overflow-hidden on the cell).

### A scroll box holds its absolute children

`scroller-holds-absolute` · warning · checked

**Rule:** A box that scrolls sideways (overflow-x-auto, overflow-auto, overflow-x-scroll) and holds an absolute or sr-only element is itself positioned: relative, or absolute, fixed or sticky.

**Why:** An absolute element is clipped only by a scroll box that is its containing block. Inside a static scroller it escapes the scroll and widens the whole page: an sr-only table caption made a 390 px page 610 px wide.

**How to fix:** Add relative to the scroller.

### A snap row has scroll padding

`snap-scroll-padding` · warning · checked

**Rule:** A scroller with snap points (snap-x, or snap-mandatory or snap-proximity with overflow-x-auto) and side padding (px-*, ps-*, pl-*) also has the same scroll padding (scroll-px-*, scroll-ps-*, scroll-pl-*).

**Why:** The padding shows at rest, but a snap aligns the card to the scroller's edge, not to the padding: after the first swipe every card sits flush against the screen.

**How to fix:** Add scroll-px-* matching the px-* (scroll-px-4 beside px-4).

### Phones get the same content

`no-hidden-content-narrow` · note · checked

**Rule:** Text shown on desktop is not hidden on phones (hidden sm:block). A collapsed menu is fine when the items stay one tap away.

**Why:** Hiding content to make a small layout work removes information from the majority of visitors.

**How to fix:** Show it, shorten it for everyone, or move it lower on the page instead of hiding it.

### Room for each cell on a phone

`phone-row-room` · warning · review

**Rule:** A row on a phone holds as many cells as can show their label and value at normal size, usually two. Five tiny stat tiles across wrap into a grid; none of them is dropped.

**Why:** Squeezing a desktop row into 390 px is how labels end up at 9 px and nobody can compare the numbers.

**How to fix:** Use a 2×2 or 2×3 grid and give each cell its label, value and one meter if it needs one.

### A screen header does one job

`trim-screen-header` · note · review

**Rule:** A phone header has one line of identity and at most two controls. A centred app name, a subtitle, a menu, an account button and a greeting sentence above the content are four headers.

**Why:** Stacked chrome pushes the first useful thing below the middle of the screen and repeats what the person already knows.

**How to fix:** Keep the greeting or the name, not both; a sentence that tells people what the screen is for goes. Move the controls that are left into the same line.

### Things side by side share a line

`measure-alignment` · warning · review

**Rule:** Text, numbers and buttons on one row share a centre line or a baseline. Check it with numbers on the rendered screen, since a large number beside a button can look wrong by only a few pixels.

**Why:** Misalignment looks like a mistake, and a label stacked above one item is what usually causes it.

**How to fix:** Align the value with the button, not the value and its label as one block, then measure both centres.

### Sibling cards end the same way

`card-footer-pattern` · warning · review

**Rule:** Cards side by side put their tags and actions in the same place: tags directly under the text, the action at the bottom edge on the same side. Longer content does not move them.

**Why:** Wrapping tags push actions to different places in each card, and the row stops reading as a set.

**How to fix:** Make the card a column, pin the action row to the bottom, and let the tags wrap above it.

### Columns end together

`balance-columns` · note · review

**Rule:** Two columns side by side end at about the same height, and a list with more behind it links to all of it.

**Why:** A list running past its neighbour looks unfinished, and a shortened list without a link hides the rest.

**How to fix:** Show as many items as fit beside the lead item, and add a link to the full list below.

### Full height follows the phone's bars

`dynamic-viewport-height` · warning · checked

**Rule:** A fixed height of 100vh has a dvh or svh partner. On phones vh counts the space under the browser bars. A min-height is fine: the page just scrolls a little further.

**Why:** The bottom of the screen ends up under the address bar: often the main button of a hero or the input of a chat.

**How to fix:** h-dvh or min-h-svh; in CSS write height: 100vh; height: 100dvh; so old browsers keep a value.

### Cards do not touch the scroller edge

`no-flush-cards` · warning · checked

**Rule:** Cards in a horizontal scroller keep a gutter at rest.

**Why:** Their edges and corners get cut off.

**How to fix:** Pad the scroller, with scroll-padding to match.

### Columns in the first screen stay close

`no-lopsided-fold` · note · checked

**Rule:** A column beside the headline does not run far past the fold while its neighbour fits one screen.

**Why:** The short column floats in empty space.

**How to fix:** Balance them, or stack them.

### Room inside a box

`no-cramped-padding` · warning · checked

**Rule:** Text in a filled or bordered box keeps at least 3 px from its edge.

**Why:** Text touching its box looks like a mistake and is harder to read.

**How to fix:** Add padding from the scale.

### Text keeps off the screen edge

`text-off-viewport-edge` · warning · checked

**Rule:** Paragraphs stay 16 px from the screen edge, 12 px on phones.

**Why:** Flush text is hard to find and looks unfinished.

**How to fix:** Put it in a container with side padding.

### A heading sits with what it introduces

`heading-spacing` · note · checked

**Rule:** The space above a heading is larger than the space below it.

**Why:** Otherwise it seems to belong to the block before it.

**How to fix:** Move space from below the heading to above it.

### Not the default hero template

`no-centred-hero-cards` · note · checked

**Rule:** The first screen is not a centred headline with no visual beside it, followed straight away by a row of three or four equal cards.

**Why:** It is the shape every generator and template starts from, so it says nothing about this product.

**How to fix:** Choose the layout from what the first screen shows: a split with the product, a real photo, a place, an editorial column. Let the cards differ when their content does.

### A clipping box does not cut what it holds

`no-clipped-popover` · note · checked

**Rule:** A box with overflow hidden does not cut off a positioned child such as a menu or tooltip.

**Why:** Menus and tooltips need to escape their box.

**How to fix:** Let the overflow show, or move the layer out.

## Navigation

### Menu grouped by job, place decided first

`menu-by-job` · warning · review

**Rule:** Before building a feature decide its place: which menu section, its own row or a tab of an existing page, which URL prefix. Pages of the same job are one menu row with tabs. Sections collapse; the current one stays open.

**Why:** Without it a menu grows into a flat list of fifty rows where related work sits in four places.

**How to fix:** A moved address answers with 301 (path and query kept); callback URLs registered with outside services never move. Help texts name the same path as the menu.

### The main action is not a tab

`main-action-apart-from-tabs` · note · review

**Rule:** The main action sits apart from the tabs instead of bulging out of the middle of them. A bar that floats over content leaves room for it: the last row can always scroll clear.

**Why:** A raised centre button in five labelled tabs is the default of every generated app, and a floating bar with no clearance hides the last item.

**How to fix:** Put the action in its own button beside the bar or in the screen, and add bottom padding the height of a floating bar. Keep tap targets and labels on the tabs people need.

## Visual language

### Line icons, not emoji

`icons-not-emoji` · warning · checked

**Rule:** Interface marks are line icons from one set (lucide). Emoji and text glyphs such as ✓ ★ are not used as UI decoration; emoji that are content (an emoji picker) stay.

**Why:** Emoji render differently on every platform and read as generated.

**How to fix:** Replace with the matching icon at the text size.

### No gradient text or purple gradients

`no-ai-gradients` · warning · checked

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

`legible-contrast` · warning · checked

**Rule:** Text meets WCAG AA (4.5:1, large text 3:1); no grey text on coloured backgrounds.

**Why:** Grey on colour looks washed out and fails readers in sunlight.

**How to fix:** Use a darker shade of the background colour or near-white.

### Links have a colour for each ground

`link-token-per-surface` · warning · checked

**Rule:** A link colour used on both light and dark grounds passes 4.5:1 on each; when one value cannot, light and dark grounds get their own link value.

**Why:** A brand orange that reads on the dark band is 2.5:1 on white: one token stretched across both grounds always fails one of them.

**How to fix:** A darker step (700) for links on light grounds and a lighter one (400) on dark sections, through a token per ground or a dark-section helper.

### No icon tile above every heading

`no-icon-tile-stack` · warning · checked

**Rule:** A grid of identical cards each with a rounded icon tile, a heading and two lines of text is a template, not a layout. Use the icon inline or not at all, and vary what leads.

**Why:** It is the default output of every generator and says nothing about the product.

**How to fix:** Lead with the real content (a number, a screenshot, an example) instead of an icon.

### No announcement pill above the headline

`no-announcement-pill` · warning · checked

**Rule:** No small pill or badge ("✨ Introducing X 2.0", "Now in beta") above a hero headline unless it links to real, recent news; then it is a quiet text link.

**Why:** It is the most copied hero template; the eye lands on it before the headline and finds nothing.

**How to fix:** Remove it, or turn it into a plain link with a date.

### No accent word in the headline

`no-accent-word` · note · checked

**Rule:** The main headline is one colour: no word or short run is picked out in an accent colour or in gradient text.

**Why:** It is the most repeated hero recipe of generated pages: 8 of the 12 generated pages we measured had it, 1 of the 12 designed ones.

**How to fix:** Set the headline in one colour and let the words carry the emphasis.

### No coloured shadows

`no-colored-shadow` · note · checked

**Rule:** Cards, buttons and pictures cast a neutral shadow; it is not tinted with the brand or accent colour.

**Why:** 8 of the 12 generated pages we measured had a coloured shadow and none of the 12 designed ones; it reads as glow, not depth.

**How to fix:** Use a neutral shadow (black at low opacity) or a border, and keep the colour for the fill.

### No sparkle icon for anything AI

`no-sparkle-for-ai` · note · checked

**Rule:** A sparkle does not mark every AI feature; use an icon that says what the action does (write, summarise, translate), or none.

**Why:** Sparkles are on every AI product, so they tell the user nothing about the button.

**How to fix:** Replace with a verb icon (PenLine, ListChecks, Languages) or text only.

### No blurred colour blobs behind content

`no-blur-blobs` · warning · checked

**Rule:** No large blurred shapes (blur-2xl, blur-3xl) or radial colour washes as decoration behind text and cards.

**Why:** Blobs are the default backdrop of generated pages; they lower contrast and say nothing about the product.

**How to fix:** Use one plain surface, or a real product view as the visual.

### One accent, used where it means something

`one-accent` · warning · review

**Rule:** The accent colour stays rare: it marks the main action, the current selection and one key figure. Surfaces, borders and labels stay neutral.

**Why:** When everything is highlighted nothing stands out, and the screen loses the one place the eye should land.

**How to fix:** Count the accent on a screenshot; move it off chrome and onto the one thing that matters.

### Show the product, not a generic visual

`show-the-product` · warning · review

**Rule:** The main visual shows the product or something real from its line of work; no glossy blobs, orbs, robots, glowing brains or stock circuits.

**Why:** A generic visual could sit on any product page, so it explains nothing and makes the page look like a template.

**How to fix:** Use a real screen with real data, or an object that says what the product does.

### Solid buttons, no gradient fills

`no-gradient-buttons` · warning · checked

**Rule:** Buttons and button links use one solid fill from the theme; no gradient backgrounds, including the "Ask AI" button.

**Why:** In the dashboards we studied the strongest work used flat primary buttons; gradient buttons appeared on the AI features of weaker shots and read as decoration, not as the main action.

**How to fix:** Use the primary colour as a flat fill; mark an AI action with a verb, not a gradient.

### Let photos carry a feed

`content-is-the-surface` · note · review

**Rule:** In a feed of photos the photo is the surface: no box around each post, no small image inside a card, no pastel badge on every row.

**Why:** Cards around every post spend the width on frames and make all content look equally unimportant.

**How to fix:** Remove the card, let the image take the width, and separate posts with spacing.

### Text on the brand colour keeps its colour

`keep-text-on-brand` · warning · review

**Rule:** Text on a brand-coloured band or button stays as the brand has it, usually white. A contrast number does not turn it black; report the ratio and let the owner decide.

**Why:** People read the change of colour as a different brand long before they notice the ratio.

**How to fix:** Keep the text colour. If small text is too faint, make it larger or heavier, or propose a deeper shade of the band.

### Keep what already works

`keep-what-works` · warning · review

**Rule:** List the details the current site gets right before changing them: dividers, icons, background motion, menus. Removing one needs a reason you can state.

**Why:** A redesign that wipes small familiar details feels worse even when each new part is better, and owners notice these first.

**How to fix:** Compare the old and new screens side by side, also the menus and open states, and restore anything lost without a reason.

### A background chosen, not defaulted

`no-default-cream` · warning · checked

**Rule:** The page ground is not the warm cream or beige that generated pages reach for by reflex. Small cream areas are fine; the whole page needs a reason.

**Why:** It has become the new safe default, so it says as little as white used to.

**How to fix:** Take the ground from the brand, or keep it if the brand really is that colour.

### No neon cyan on dark

`no-neon-on-dark` · warning · checked

**Rule:** Saturated cyan text on a near-black ground is used at most once.

**Why:** Next to purple gradients it is the most recognisable generated palette.

**How to fix:** Use the brand accent, or a light neutral for text.

### No numbered section labels

`no-section-numbers` · note · checked

**Rule:** Small 01, 02, 03 labels do not ride next to section headings unless the order is the point.

**Why:** The page is numbering its own chapters instead of earning its structure.

**How to fix:** Remove them; keep numbers for real steps.

### Not a whole row of hairline and wide shadow

`no-border-and-wide-shadow` · note · checked

**Rule:** A row of cards does not all wear a hairline border and a wide diffuse shadow. One floating panel may.

**Why:** On a whole row it is a default, not a decision.

**How to fix:** Keep the border or the shadow, not both.

### No radial glow behind content

`no-radial-halo` · note · checked

**Rule:** A saturated radial gradient fading to transparent is not used as a background spotlight or cloud.

**Why:** It is the gradient version of a glow shadow, and floats over the copy.

**How to fix:** Remove it; give the section a plain ground from the palette.

### No decorative stripes

`no-stripe-surface` · note · checked

**Rule:** Repeating-gradient stripes do not decorate a surface.

**Why:** A recurring generated signature.

**How to fix:** Leave the surface plain or use a deliberate texture.

### No grid-line wallpaper

`no-grid-wallpaper` · note · checked

**Rule:** A grid of hairlines tiled from two gradients is not a background, unless the product is a canvas, map or blueprint.

**Why:** It borrows technical credibility and adds nothing.

**How to fix:** Remove it.

### No torn edges drawn with clip-path

`no-blob-clip-path` · note · checked

**Rule:** A clip-path with a dozen vertices or a curved path does not stand in for a blob, torn edge or silhouette.

**Why:** It reads as the cheap version of the effect.

**How to fix:** Use a real asset, or a clean edge.

### No picture buried under a wash

`no-buried-image` · warning · checked

**Rule:** A background picture is not under a near-opaque gradient, and an image is not at near-zero opacity.

**Why:** It never reaches the screen, yet ships and costs loading time.

**How to fix:** Show it properly or remove it.

### A hard offset shadow is a decision

`no-hard-offset-shadow` · note · checked

**Rule:** A visible unblurred shadow moved by 4 px or more fits a deliberate neobrutalist direction only.

**Why:** Without that direction it looks borrowed.

**How to fix:** Check it fits the design; otherwise soften or remove it.

### No clip art built from shapes

`no-clipart-svg` · note · checked

**Rule:** A large inline SVG does not build a scene from a pile of primitive shapes. Diagrams, data and drawings of how the product works are fine.

**Why:** It reads as placeholder art, not illustration.

**How to fix:** Show something real, or draw what the product does and label it.

### No broken images

`image-not-broken` · error · checked

**Rule:** Every image loads, and none has an empty or placeholder source.

**Why:** A broken box undoes the rest of the page.

**How to fix:** Use a real image or remove the tag.

### Content is visible at rest

`no-invisible-content` · error · checked

**Rule:** More than a fifth of the text is not at zero opacity once every reveal has had its chance.

**Why:** That is a reveal that failed: the content shipped and nobody can see it.

**How to fix:** Make the visible state the default and animate towards it.

### Nothing covers the text

`text-not-covered` · error · checked

**Rule:** No opaque element is painted over text.

**Why:** Words under a box cannot be read.

**How to fix:** Move the layer beside the text, or fix its stacking.

### No gray text on colour

`no-gray-on-color` · warning · checked

**Rule:** Text on a coloured ground is not a neutral gray.

**Why:** It looks washed out even when the ratio passes.

**How to fix:** Use white, or a tint of the ground.

### The page uses its design system

`design-system-drift` · note · checked

**Rule:** With "designSystem" in the config (fonts, sizes, radii, colors), the page uses nothing outside those lists.

**Why:** Small drifts are how a system stops being one.

**How to fix:** Use a listed value, or add the new one on purpose.

## Accessibility

### Text styles that follow Dynamic Type

`dynamic-type` · warning · checked

**Rule:** In SwiftUI, set text with text styles (.body, .headline, .caption) or a custom font with relativeTo, not a fixed .system(size:). Icons may use a fixed size.

**Why:** A fixed size ignores the reader's text size setting, so people who need larger text cannot read the screen, and every screen ends up with its own ad hoc sizes.

**How to fix:** Map each size to the nearest text style (11 caption2, 12 caption, 13 footnote, 15 subheadline, 17 body, 20 title3, 22 title2, 28 title, 34 largeTitle) and keep the weight with .fontWeight.

### Tap targets big enough for a finger

`tap-target` · warning · checked

**Rule:** Anything that can be tapped is at least 44×44 pt on iOS, 48×48 dp on Android and 24×24 px on the web (44 px where you can). A small icon keeps its size; the area around it grows.

**Why:** A small target is missed and hits its neighbour, most of all for people with larger fingers, a tremor or one hand on a moving bus. Apple, Material and WCAG 2.2 (2.5.8) all set a minimum.

**How to fix:** SwiftUI: keep the icon's frame and add .frame(minWidth: 44, minHeight: 44) or padding, then .contentShape(Rectangle()). Compose: use IconButton (48 dp) or Modifier.minimumInteractiveComponentSize(); put .size() after the padding, not on the clickable. Web: size-11/h-11 on icon buttons, or padding around the icon.

### Never remove the focus ring without a replacement

`focus-ring-removed` · error · checked

**Rule:** outline-none / outline-hidden only together with a visible focus-visible style (ring, outline or border) on the same element. In CSS, outline: none needs a box-shadow, border or outline in the same rule or a :focus-visible rule; Bootstrap's shadow-none on a .btn or .form-control needs focus-ring.

**Why:** Keyboard users lose their place. WCAG 2.4.7 (focus visible), 2.4.11 (focus not obscured).

**How to fix:** Add focus-visible:ring-2 (or the component's focus style); prefer outline-hidden over outline-none in Tailwind 4 so forced-colours mode keeps an outline. Dialog and popover containers receive focus programmatically and are exempt.

### Icon-only buttons have a name

`icon-button-name` · error · checked

**Rule:** A button or link that shows only an icon carries aria-label (or title, or visually hidden text).

**Why:** Screen readers announce "button" with no purpose; WCAG 4.1.2 name, role, value.

**How to fix:** Add aria-label with the action in sentence case ("Delete keyword").

### Pinch zoom stays on

`no-zoom-lock` · error · checked

**Rule:** The viewport never sets user-scalable=no or a maximum-scale below 2.

**Why:** People with low vision zoom to read; a locked page leaves them with nothing. WCAG 1.4.4.

**How to fix:** Use width=device-width, initial-scale=1 and nothing more. If a field zooms on focus, fix the field (input-text-16).

### Fields use 16 px text on phones

`input-text-16` · warning · checked

**Rule:** Inputs, text areas and selects use text of at least 16 px at phone width; a smaller size may start at a larger breakpoint.

**Why:** iOS Safari zooms the whole page when a smaller field gets focus, and leaves it zoomed.

**How to fix:** text-base sm:text-sm, or font-size: 16px with the smaller size inside @media (min-width: …). Never lock zoom instead.

### Nothing is hidden until hover

`no-hover-only-content` · warning · checked

**Rule:** Actions and information that appear on hover are visible by default on touch screens.

**Why:** A finger has no hover, so the button does not exist for that person.

**How to fix:** Hide only from a larger breakpoint: opacity-100 md:opacity-0 md:group-hover:opacity-100, with focus-within for the keyboard.

### Heading levels do not skip

`heading-order` · warning · checked

**Rule:** Headings go down one level at a time: no h1 then h3.

**Why:** Screen readers navigate by this outline.

**How to fix:** Fix the level, and style it with CSS.

## Motion

### Pulse only for live data

`pulse-for-live-only` · note · checked

**Rule:** A pulsing dot means something is running right now; it never decorates.

**Why:** Fake liveness teaches people to ignore real alerts.

**How to fix:** Bind the animation to the running state; show a static dot otherwise.

### No auto-scrolling strips

`no-marquee` · note · checked

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

### No growing on hover

`no-hover-scale` · warning · checked

**Rule:** Cards and buttons do not scale up on hover; hover changes colour or surface, press may scale down slightly (0.97–0.98).

**Why:** Growing elements push their neighbours visually, blur text and read as a template effect.

**How to fix:** Replace hover:scale-105 with a background or border step; use active:scale-[0.98] for press feedback.

### Animate transform and opacity, not position

`no-layout-animation` · warning · checked

**Rule:** Transitions do not animate top, left, right, bottom, margin or padding; movement uses transform. Width on a progress meter is fine.

**Why:** Position and spacing changes re-run layout every frame and stutter on slower devices.

**How to fix:** Use translate and opacity (transition-transform, transition-opacity).

### Interface responds within 300 ms

`interface-speed` · note · checked

**Rule:** Hover, press, open and close transitions take 300 ms at most. Entrances on a landing page and stages may take longer.

**Why:** People repeat these actions; a slow answer feels like a slow product, however good it looks the first time.

**How to fix:** duration-150 for colour and press, duration-200 to 300 for panels. Ignore the finding with a reason on a real entrance.

### Nothing loops forever without a reason

`no-endless-loop` · note · checked

**Rule:** A permanent element does not animate forever. A loader may while loading; a live dot follows pulse-for-live-only; a product stage is judged on screen.

**Why:** Endless motion pulls the eye from what people are reading, and the eye soon learns to ignore it.

**How to fix:** Play it once on entry, or tie it to a real state; pause it off screen and under reduced motion.

### No decorative blinking cursor

`no-blinking-cursor` · note · checked

**Rule:** A blinking caret is not animated into a page where there is nothing to type.

**Why:** It borrows the look of a terminal to simulate activity.

**How to fix:** Remove it. Real fields draw their own caret.

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

### Plausible sample data

`no-placeholder-data` · warning · checked

**Rule:** No Lorem ipsum, John Doe, $123,456 or [X] in screens, demos and screenshots; sample data looks like real data from the product's world.

**Why:** Filler data makes a finished screen look like a mock-up and hides layout problems that real lengths would show.

**How to fix:** Use realistic names, amounts with uneven digits and real lengths.

### Stat cards read label, value, change

`stat-card-anatomy` · warning · review

**Rule:** A stat card has three lines in this order: a short muted label, the value large and tabular, then the change with its period ("+1.5% vs last month"). No icon tiles, sparklines or emoji competing with the number.

**Why:** This was the most consistent pattern across the professional dashboards we studied: the eye reads down one column, and the change is meaningless without its period.

**How to fix:** Reorder to label → value → change; put the period next to every change.

### Charts highlight one thing

`chart-highlight-one` · warning · review

**Rule:** Bars and series are neutral; the accent goes on the one that matters (the current period, the selected point), with its value labelled on the chart. Category charts use one hue in steps, not a rainbow.

**Why:** The professional work we studied kept inactive bars light grey and lit one; the weaker shots used five or six hues, which turns a chart into a legend lookup.

**How to fix:** Grey out every series but one; label it directly; collapse small categories into "Other".

### Label series on the chart

`direct-labels` · note · review

**Rule:** With three series or fewer, put the name or value at the end of the line or on the bar instead of a separate legend.

**Why:** A legend makes the reader match colours back and forth; a direct label is read once.

**How to fix:** Move the legend text next to its series; keep a legend only for many series.

### Dim the digits that matter less

`dim-secondary-digits` · note · review

**Rule:** In a headline figure the cents, decimals or unit are set in the secondary text colour ($422,525.82 with .82 muted), so the significant part reads first.

**Why:** The strongest hero numbers we studied used this one detail instead of any decoration.

**How to fix:** Wrap the fraction in a span with the secondary colour; keep the same size.

### Designed for the worst data, not the demo

`worst-case-data` · note · review

**Rule:** The screen holds with one item ("1 member"), none, a very large number and the longest name a customer really has.

**Why:** Sample data has tidy lengths. Real accounts have one member, no orders and a company name of 40 letters.

**How to fix:** Run narrow --stress for the layout, then open the screen with one item and with none: grammar and empty states only show with real data.

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

### Hover styles only where hover exists

`hover-media-query` · note · checked

**Rule:** In hand-written CSS, :hover sits inside @media (hover: hover). Tailwind 4 does this by itself.

**Why:** After a tap the hover look stays on until the next tap elsewhere, so the button seems stuck.

**How to fix:** Wrap the hover rules in @media (hover: hover) and give touch an :active state.

### No script errors on load

`no-script-errors` · error · checked

**Rule:** No script throws an uncaught error while the page loads.

**Why:** Broken JavaScript silently kills reveals and controls, and can leave a page blank.

**How to fix:** Fix the error named in the report.

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

### No exclamation marks in interface copy

`no-exclamation-copy` · warning · checked

**Rule:** Labels, numbers, toasts and headings state things plainly: no "!" or "!!", including after a change such as "+12%!!".

**Why:** Exclamations make every message sound equally urgent and are a strong tell of generated copy.

**How to fix:** Drop the mark; give a change its comparison ("+12% vs last month").

### The title names the page, not the user

`no-greeting-headline` · warning · checked

**Rule:** No "Welcome back, Name" or "Good morning" as the page title of a working screen; the title says what the page shows.

**Why:** A greeting takes the most valuable line on the screen and tells nothing on the hundredth visit.

**How to fix:** Use the page or the period as the title ("Overview · this week").

### Social proof with a source

`no-unsourced-proof` · warning · checked

**Rule:** No "Trusted by 10,000+ teams", rows of five stars or avatar stacks without a source; name the customers or the review site, or leave it out.

**Why:** Round, unsourced numbers are the first thing a visitor stops believing, and they make the rest of the page look invented.

**How to fix:** Show the real number with its source ("4.8 on the App Store, 312 ratings") or a named customer.
