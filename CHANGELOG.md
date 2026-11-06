# Changelog

## 0.15.0

- **Decoration is not content, and thrown-away work stays in reach.** A good hero pass (a terminal panel of five real
  commands in place of a decorative "code rain" of forty) was thrown away as "Kept 44.7% of the words". The word check
  now counts only reading text: text under `aria-hidden="true"`, or in a positioned layer that takes no clicks
  (`pointer-events: none`), is decoration a pass may replace. A card whose idea replaces, removes or rewrites visible
  text and lists no `addsText` or `replacesText` is sent back to the study. `redesign apply <patch>` applies a saved
  pass to the working tree (3-way when it does not fit as it is, nothing changed when it does not apply cleanly) and
  prints the files and the undo. Every run writes `compare.html` in the `--out` folder: before and after of each pass
  side by side, its verdict and, for a pass thrown away, the apply command.
- **The agent looks at its own work.** New command `shot <url|file.html> [--width 1440] [--out shot.png] [--full]`: one
  screenshot as Chrome draws it, read-only, with `--cookie`, `--header`, `--scope` and `--ignore` as for `scan`. The
  craft and pass prompts give the exact `shot` command for the page (the served address with `--serve`) and say to look
  before reporting; with `--build` or `--render` they give the command that draws the page again and say a saved
  snapshot is stale until it runs. A test that forbids what a card asks for is changed to the new behaviour and named;
  tests a pass changed are listed apart in the log, the summary and `result.json` (`testsChanged`).
- **`redesign` starts from what you know, and asks before it applies.** A study that only saw one page with fallback
  copy did not know the product. It now reads `PRODUCT.md` and `DESIGN.md` from the project root (or `--product`,
  `--design`) into the study and craft prompts as quoted notes, and without a `PRODUCT.md` writes a draft to the `--out`
  folder and says to review it and move it to the root. `--intent "<text>"` leads both prompts and is kept in
  `brief.json`; every field of `product` (`context`, `audience`, `voice`, `competitors`, `avoid` and any of your own) now
  reaches both prompts instead of only job, claim and proof. Before applying, the degree, direction, intent and cards
  are printed; at a terminal it asks `Apply these passes? [y/N]` and stops with nothing changed unless the answer is
  yes, printing the command that goes on with `--brief … --yes`. `--yes` skips the question; agents and CI go on as before.
- **Layouts chosen from the content.** Each card that changes the look names a `layout` (`split`, `product`, `photo`,
  `place`, `editorial`, `statement`, `collage`, `centred`) and a `layoutWhy`. A first-screen card may be `centred` only
  when the hero has no visual and at most two lines of copy, and two changing sections side by side with one layout are
  sent back as one recipe. `BRIEF.md` and the plan show the layout. New scan rule `no-centred-hero-cards` (info): a centred
  headline with no visual beside it followed straight away by three or four equal cards, the default template.
- **Part of a page, and new text on purpose.** `"only": ["exact heading"]` in `brief.json` limits validation, the craft
  prompt and the visual check to those sections. A card may carry `addsText` and `replacesText` (`from` must be on the
  page); the craft pass may make exactly those text changes, and any other new word throws it away.
- **Pages drawn by a command.** `--serve <dir>` serves a folder on 127.0.0.1 and the page is a path in it;
  `--render "<command>"` draws it before the first measurement and after every pass, and a failed render throws the pass
  away like a failed build. `--build-minutes <n>` sets the limit for build and render (default 10).
- **`redesign` decides how much to change, and says whether the page will look different.** In a field test the cards
  only closed rule findings, and after applying them the hero looked almost the same. The study now starts with a degree
  (`heavy`, `polish`: at most two visible changes, each on a measured tell, bigger ideas as suggestions; `none`: nothing
  is built) and a direction from the product (one-sentence product, a concrete character that is not clean, modern,
  sleek, minimal or premium, its world, the one or two moments that carry the richness, one signature detail). Each card
  says `changesLook` and, when true, what a visitor will see; the first screen's card has to change the look and name the
  proof it shows. `--plan` and `BRIEF.md` show the degree and direction, label each card "changes the look" or "fixes
  only", and say in one line when nothing changes the look. The craft prompt gets the direction, each visible change as
  what "done" means, and a rival's-name check; after the pass the visual check asks per card whether the change is in
  the after screenshot, and one that is not gets one more try, then the pass is thrown away. Old `brief.json` files still
  load with `--brief`, as `heavy` with no direction.
- **`--scope` and `--ignore`: check one part of a page.** A test page that renders one CMS module inside the app's own
  shell (nav, breadcrumb, a "Test" badge) got its findings and its redesign plan from the shell. `--scope "<css selector>"`
  checks and measures only what is inside a match (repeatable; several are one area), `--ignore "<css selector>"` leaves
  a part out (repeatable), for `scan`, `narrow` and `redesign`. The redesign's inventory, headings, metrics, palette and
  section cards come from the scoped part, before and after every pass, and the prompts name it. A scope that matches
  nothing, or a selector Chrome cannot read, stops the run with exit 2 instead of passing as clean. Sideways scrolling
  counts when the scoped part runs past the edge; script errors stay page-wide.
- **Decoration under `aria-hidden="true"` is not reading text.** A faded "code rain" layer (aria-hidden, no pointer
  events, 18 % opacity) gave 31 contrast and tiny-text warnings. `scan`, `narrow` and the redesign measure now leave text
  under `aria-hidden="true"` out of the reading rules (contrast, size, capitals, tracking, leading, measure, stragglers,
  cut-off, covered and cramped text, heading order); the visual tells (gradients, halos, glows, neon, endless loops) still
  look at it, since decoration is where they live.
- **`redesign` shares a working copy.** `--in-place` makes no branch and no commits and runs on a tree with uncommitted
  work: a thrown-away pass goes back to exactly its snapshot, the person's edits included, and a kept pass stays
  uncommitted with its patch saved (`git apply -R` undoes it); the run ends with the changed files and the undo commands,
  newest first. A change the agent did not make is still left alone as someone else's. `--files "a,b/**"` limits every
  pass to those paths or globs and throws away a pass that changes anything else. `--out <dir>` moves the plan,
  screenshots, logs and patches (default `.ai-design-check/redesign`, git-ignored; a folder outside the project works),
  and `--plan` now says the folder is git-ignored.
- **`redesign` on a saved page.** For a page behind a sign-in without handing over a cookie: `redesign ./page.html` (or
  `--html page.html`) measures the file. With `--build` the passes edit the sources (found by the page's headings) and the
  build writes the file again; without, they edit the file itself, and a file git does not keep is put back byte for
  byte from a copy when a pass is thrown away.

- **`--fix --nearest-type` moves font sizes too, when you ask.** Every `text-[Npx]` (or rem) on a flagged line moves to the
  nearest theme size with its variant kept: `text-[40px] sm:text-[52px] lg:text-[64px]` becomes
  `text-4xl sm:text-5xl lg:text-6xl`; a tie goes up, as spacing does. A `leading-[Npx]` with the same variant in the same
  class string keeps its ratio to the size, on the 4 px grid (`leading-[44px]` at 40 px becomes `leading-[40px]` at
  36 px); a `tracking-[Npx]` is named for a look instead, since a fixed letter spacing does not scale. Each side of a
  Blade `{{ $a ? '…' : '…' }}` is paired on its own. Without the flag `--fix` leaves sizes alone, as before, and says
  the flag exists when type-scale findings are left.

## 0.14.2

A layout bug a person found by eye on a real page, now found by the checker.

- **New rule `cell-holds-content`: content stays in its column.** A card in a two-column grid grew past its column and
  painted over its neighbour: a long app name sat in a `truncate` line inside a flex item without `min-w-0`, so the item
  could not shrink below the name's full width. The text was not cut, the box grew instead, so `text-not-clipped` stayed
  quiet. Two checks now cover it:
  - `scan` reports a grid or flex item whose content runs past its cell onto the next one (positioned badges, clipped
    cells and overflow with no neighbour beside it are left alone);
  - the code check (JSX, HTML, Blade, Vue, Svelte) walks up from each `truncate` and names the flex or grid item that has
    no `min-w-0`, at the line where it goes. A fixed width or `max-w-*` on the way caps the line, and a grid built from
    `grid-cols-N` or `minmax(11rem, 1fr)` tracks cannot grow, so neither is reported.
- **Blade classes inside `{{ }}` are read.** `class="{{ $hero ? 'text-4xl' : 'text-[40px] leading-[44px]' }}"` used to
  lose everything between the braces, so a theme view whose sizes all sat in a ternary came back clean. The strings inside
  `{{ }}` and `{!! !!}`, Blade's `@class([...])` and Alpine or Vue `:class="{ 'a': on }"` now go through the class rules.
- **`--fix` moves rem spacing too.** `padding-top: 0.45rem` was reported as 7.2 px off the scale but left alone; it now
  becomes `0.5rem`, read at the root size the report used (a project with `html { font-size: 10px }` gets steps of 10 px
  rems). em values still stay: their px depend on the element's own font size.
- **`--fix` says what it left.** "Nothing to fix" over a full report read as a tool that does nothing. It now counts the
  findings that take a decision, by rule, and points to the ai-design-fix skill; "Nothing to fix" is kept for an empty report.

## 0.14.1

Four gaps left open by 0.14.0, closed.

- **`--header` stays on the page's own origin.** It used to go with every request the page made, so a token could reach a
  font host or an analytics script. Cookies already stayed on the host. An API on another subdomain no longer receives it.
- **A sign-in form drawn in place.** An app that answers 200 at the address asked for and draws its own sign-in screen used to
  pass as a clean page. A short page with a password field, or with an email field and a sign-in heading, title or button, now
  stops the run with exit 2. Asking for `/login` or `/signup` itself is still fine, and `--allow-redirect` checks the form.
- **`redesign` with Codex** now reads Codex's JSON events, so it can tell the agent's changes from yours, as it does with Claude
  Code. Codex can also write from a shell command, which names no file; after such a command the run says nothing either way,
  as before.
- **`bootstrap.css` replaces all of Bootstrap's compiled blue**: field focus, checks, radios, switches, ranges, outline buttons,
  menus, nav pills, accordions, pagination, progress bars, list groups, the close button and `.table-primary`, in both themes.
  No build from source needed for it.

## 0.14.0

Bootstrap and plain CSS are read as well as Tailwind, the browser checker sees modern colours and five more habits of
generated pages, and a public benchmark shows how often each rule fires on AI pages and on sites people designed.

**Benchmark**
- [BENCHMARK.md](BENCHMARK.md): 48 pages generated by Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 (six briefs, each in
  Tailwind and in Bootstrap) against 34 human-designed sites chosen before the first run. Per rule: how often it fires on
  each. The pages, prompts, site list and harness are in `bench/` (not in the npm package); `node bench/run.js` reruns it.

**Bootstrap, plain CSS and SCSS**
- The checker reads plain CSS, SCSS and `style=""` attributes in HTML, Blade, Vue and Svelte, declaration by declaration. A
  page written in plain CSS or Bootstrap no longer passes unseen.
- Spacing and corner values in CSS are judged against the project's scale, every number of a shorthand on its own; `--fix`
  moves them to the nearest step.
- Purple gradients are found by hue in any colour notation, so the classic `#667eea → #764ba2` is caught; so are gradient
  text, gradient buttons, hover rules that scale up, removed focus outlines without a replacement, and tracked uppercase.
- Bootstrap 5.3 classes: `shadow-none` that removes a focus ring, `btn` with `bg-gradient`, `fw-bolder` headings, the
  `text-uppercase small fw-bold` eyebrow.
- `icon-button-name` reads HTML, Blade, Vue and Svelte: Bootstrap Icons, Font Awesome, Material icon spans, svg; a
  `.btn-close` without `aria-label`.
- Bootstrap's `$spacer` and `$spacers` in your SCSS are read (as text, never compiled) as a source of the spacing scale.
- A framework's own stylesheet copied into the project (Bootstrap, Tailwind output and others, known by their licence
  banner) is skipped.

**The running page**
- `scan` reads every colour Chrome computes (`oklch()`, `oklab()`, `lab()`, `lch()`, `color()`, `color-mix()`), so purple
  gradients, halos, glows and shadows on Tailwind 4 pages are no longer missed.
- New rules: `no-accent-word` (a word in the headline set apart by colour), `no-colored-shadow`, `no-arrow-suffix` (an
  arrow on every call to action) and `no-middle-dot-lists`. `no-announcement-pill` is also checked in the page: a badge pill
  just above the headline, whatever it says. 141 rules; 60 read the running page.
- A redirect is named, and a sign-in page in place of the page asked for stops with exit 2. `--cookie`, `--header` and the
  environment variables `AI_DESIGN_CHECK_COOKIE` and `AI_DESIGN_CHECK_HEADERS` reach signed-in pages; values are never
  printed. `--allow-redirect` checks the landing page anyway.
- `scan <url> <url> …` checks every URL, with a summary per page.
- `designSystem` in the config reaches `scan` (it used to be dropped).

**redesign keeps your work**
- It refuses to start with uncommitted changes to tracked files ("commit or stash your changes first"); `--plan` still runs.
- Ctrl-C or SIGTERM puts back the pass in progress (saved as a `.stopped.patch`), keeps passes already kept, and says how
  to go back.
- With Claude, a file changed that the agent did not report stops the run with nothing put back or committed.
- Changes the agent made to files git ignores are listed, since git cannot put them back.
- Page text reaches the agent only inside delimited, size-capped data blocks, never as instructions.

**Severity, from the benchmark**
- `no-ai-gradients` is a warning, no longer an error: in the benchmark it fired on no AI page and on a quarter of the
  human-designed sites (Stripe, Raycast, Shopify, Bootstrap's own site). The source check still finds purple gradients.
- `no-radial-halo`, `no-marquee`, `no-accent-word` and `no-colored-shadow` are notes: each fired as often or more on human
  sites. `no-default-cream` is a warning: a third of the AI pages, one human site.
- `no-horizontal-overflow` names what sticks out. On phones it caught 18 of the 24 Bootstrap AI pages: a `.row` with
  gutters (`g-4`, `g-5`) wider than its container's padding scrolls the page sideways by 12 px.
- Well-known library stylesheets are skipped by name too (Swagger UI, Select2, Font Awesome and others), not only by
  their licence banner.

**system**
- Every text colour now reaches 4.5:1 on each ground it sits on, in light and dark, for every character, kind and brand:
  status pills, badges, the primary hover and warning and info ink were below it.
- New `bootstrap.css` (Bootstrap 5.3 variables for light and dark, `.btn-primary`) and `_variables.scss`.

## 0.13.0

An end-to-end audit, tried against real projects. The theme: a green result now means something was checked.

**A pass has to be earned**
- A run that read no interface file exits 2 with "Nothing checked": a wrong path, an empty folder, a config file on its own.
  SCSS, Less, MDX and Pug files are named as unread.
- `scan`, `narrow` and `redesign` stop on a page that did not load, answered HTTP 400 or above, or is not HTML. `scan` also stops
  on an empty page. `--allow-status 404` checks an error page you designed.
- An unknown option, a mistyped one, or `--dry-run=true` stops the run with exit 2 instead of being dropped.
- A wrong severity or a wrong type in the config, or a broken baseline, is reported in one line with exit 2. Before, it could turn
  errors off and pass CI.
- `init` includes the whole project. It used to write `resources/js` and `src`, which hid most other layouts.

**Security**
- Chrome no longer runs with `--allow-file-access-from-files`, which let a local HTML page read any file you can read.
- A page's title can no longer break out of `story`'s stage script.
- `--format github` escapes file names and messages, so they cannot start a workflow command.
- Baseline, `init` and `system` refuse to write through a symbolic link. `system` no longer overwrites other files without `--force`.
- The hook bounds each finding to one short line of repository text.
- The release job runs the full Node matrix first, with no publishing rights in reach of the tests.

**Your work stays safe**
- `--fix` leaves files that are not UTF-8 alone. It used to destroy their non-ASCII letters.
- `--fix` lowers the baseline, so what it fixed cannot become an allowance for new findings.
- `--fix` writes only steps Tailwind 3 also has; other values stay in brackets.
- `redesign` stops if git cannot record the working tree, instead of taking HEAD for it and wiping uncommitted work. It handles
  repository subfolders and non-ASCII file names, and a failed commit is no longer reported as a kept pass.

**Fewer false results**
- `.gitignore` is respected, and `.next`, `.nuxt`, `.output`, `.svelte-kit`, `.turbo`, `out`, `coverage` and similar are skipped.
- JSX in `.js` files is read.
- `icon-button-name` knows icons imported from lucide, Heroicons, react-icons, Phosphor, Tabler, Radix and Feather.
- `focus-ring-removed` no longer accepts `focus:outline-none` as its own replacement.
- Commented-out markup is not read as markup.
- `ai-design-check-ignore-next-line` covers one line, or one unfinished tag. It used to reach up to 11 lines in code.
- An `allow` entry can hold a value with a colon, such as `hover:mt-[13px]`.
- Two slow patterns are linear now. An inlined font or image could stall a run for many minutes.

**Smaller**
- `-h` and `--version` work, and a value may hold an equals sign.
- From a subfolder, the project's config and baseline apply.
- The hook applies the baseline and the config's `ignore`, and finds files reached through a symlink.
- `narrow` honours `--strict`, `--quiet`, `--format github` and the config's rules.
- A hung page ends the run after 2 minutes, `alert()` no longer blocks it, and Chrome's own reason is shown when it will not start.
- Microsoft Edge is found as a browser.
- The generated `theme.css` compiles in Tailwind 4, and the generated `DesignSystem.kt` passes the checker.

## 0.12.0

- Every rule `scan` runs now has at least four shapes it must flag and five close ones it must leave alone. Writing them found
  real errors, now fixed: a gradient fading to transparent over a picture counted as a solid wash, a clipped popover wider than
  it is tall was missed, pale beige grounds were missed, and lines were counted by height instead of being measured.
- A page is measured once its styles have landed, not after a fixed wait. On a slow machine `narrow` and `scan` could read a page
  before its CDN stylesheet applied and report text that "shrinks". The same wait now also covers `redesign` and `story`.
- See-through text counts as what it looks like, and smooth scrolling no longer misplaces the contrast measure.
- `no-justified-text`, `no-crushed-tracking`, `no-overused-font`, `no-tiny-text`, `image-not-broken`, `no-theater-copy`,
  `no-all-caps-sentences`, `no-radial-halo` and `no-hard-offset-shadow` also read app code, where the platform has an equivalent.
  33 rules now reach SwiftUI, Compose, Flutter or React Native.
- CI runs on Windows too. `redesign` is not yet tested there.

## 0.11.0

- `scan <url>`: checks the running page at desktop and phone width in your Chrome, with no model and no API key. Real
  contrast, sizes, what covers what, broken images, script errors, content that never appears and the tells only a browser
  sees.
- 42 new rules, 137 in all: fonts and grounds taken by default, flat type, giant sentences, italic serif heroes, eyebrow
  labels, section numbers, em-dash walls, slogan cadence, radial halos, stripes, grid wallpaper, buried pictures, hard
  shadows, tiny text, tight lines, justified text, stragglers, heading order and rhythm, and more. Several run on source too.
  `legible-contrast`, `no-nested-cards`, `spacing-rhythm`, `readable-measure` and `no-icon-tile-stack` are now measured
  instead of left for review. Many are adapted from [Impeccable](https://github.com/pbakaus/impeccable); see NOTICE.md.
- `redesign <url>`: your agent studies the page, its code and its subject and writes one card per section, checked against
  the measured page; the numbered fixes and the cards are applied pass by pass on a new git branch, and a pass that loses
  content, adds rule errors or looks worse is thrown away. `--plan` stops at the cards, `--brief` builds them. Claude Code
  and Codex.
- Plugin packages for Claude and Codex.

- Flutter and React Native are read. `.dart` files, and style objects and StyleSheets in files that import `react-native`,
  go through the same rules as SwiftUI and Compose: spacing, corners, type size, heavy weights and shadows, blur, purple
  gradients, bounce, loops, tap size, unnamed icon buttons, fixed text scale and copy. A touchable is measured through its
  StyleSheet entry.
- `--fix` changes what has one mechanical answer, with no agent: spacing and corners to the nearest step of the scale (a tie
  goes up), very heavy type to bold, on the web and in every app language. `--fix --dry-run` lists the changes and writes
  nothing. Widths and heights, tap sizes, colours, emoji, words and hierarchy stay in the report. A project that renames its
  Tailwind radius steps keeps its bracket radii.
- A project the rules cannot read is no longer reported as clean. Interface code with no rules (`.php`, `.astro`, `.erb`,
  `.twig`, Android layout XML and others) is named in the report and in `--json` as `unread`; when nothing else was read the
  run says "Nothing checked" and exits 2.
- SwiftUI and Compose gain `error-copy`, `ellipsis-character`, `no-buzzwords`, `no-unsourced-proof`,
  `no-decorative-uppercase`, `specific-action-labels` and `icon-button-name`.
- `radius-scale` in SwiftUI and Compose no longer reports a pill (100 or more) or a circle (half the box's size).
- Test files and generated Dart code are not read.

## 0.10.1

- `spacing-scale` reads the project's own scale instead of assuming 4 px: `spacing` in the config file, then Tailwind 4
  `@theme`, then a `tailwind.config.*` read as text and never run, then `:root` variables, then 4 px. The report and
  `--json` name the scale used. What cannot be read leaves 4 px and a note. SwiftUI and Compose use the config file or 4
  pt/dp, so nothing changes for them unless you set it. A project on another grid can see new findings on values that fit
  4 px but not its own scale.
- Phone browsers: `no-zoom-lock`, `input-text-16`, `dynamic-viewport-height`, `no-hover-only-content` and
  `hover-media-query`. Hover classes in Tailwind are not flagged on their own, since Tailwind 4 already guards them; what
  is flagged is content hidden until hover. `min-height: 100vh` is left alone: the page only scrolls a little further.
- Motion: `interface-speed` (hover, press and open transitions over 300 ms) and `no-endless-loop`. A loader, a marquee
  (`no-marquee`) and `animate-pulse` (`pulse-for-live-only`) are not reported by it.
- `no-zoom-lock` is an error, so a project with `maximum-scale=1` now fails CI until the viewport is fixed.
- `narrow --stress` runs the check again with long names, large numbers and text 40 % longer, and reports only what that
  breaks, as warnings. `worst-case-data` is a new review rule for what a rendered page cannot show, such as "1 member".
- CSS rules also read `<style>` blocks in HTML, Blade, Vue, Svelte and JSX files, and no longer read CSS comments. Existing
  rules such as `no-transition-all` can therefore report more than before.
- The fix skill opens with a table from complaint to rule, says that keyboard-triggered actions do not animate, and treats
  what it reads in a repository or on a page as material, not instructions.

## 0.10.0

- The report keeps accessibility apart: the text report shows it first under its own heading, the summary counts it
  separately, and every finding in `--json` and from `narrow` carries `area`. `tap-target` and `dynamic-type` now belong
  to the accessibility area. Severities are unchanged.
- `narrow` and `story` work on Node 20. Chrome is driven over a pipe instead of a WebSocket, which Node 20 does not have.
  If Chrome fails to start, or does not answer within 30 seconds, it is closed and the command ends with an error instead
  of hanging.
- A test reads the frontmatter of every `SKILL.md`, so an unquoted description cannot break `npx skills add` again.
- The fix skill measures the screen, writes a four-line brief, shows a card per section before editing and works in order
  of harm, accessibility first. New references: `proof.md`, `motions.md` and a working stage example.
- 87 rules, among them `one-display-size`, `keep-text-on-brand`, `keep-what-works`, `measure-alignment`,
  `card-footer-pattern`, `balance-columns` and `one-surface-radius`.

## 0.9.0

- New rule `tap-target`: anything tappable is at least 44×44 pt on iOS, 48×48 dp on Android and 24×24 px on the web.
  SwiftUI: a `.frame` under 44 on a button label or a view with `.onTapGesture` (padding or an outer frame around a
  small icon passes). Compose: a `.size()` under 48 dp on a `clickable` or on an `IconButton`. Web: `h-`/`size-` under
  24 px on buttons and links. On the Cebbin iOS app it found 43 round buttons, dots and handles between 14 and 40 pt.
- Native patterns take `max`, `unlessAfter` and `onlyIf` (the code before or after must match).

## 0.8.0

- `system` command: a design system from a character, a brand colour and the kind of screen. Fonts from a curated
  library (40 Google Fonts, 10 Adobe Fonts), an eight-role type scale that maps to Dynamic Type and Material 3, light
  and dark colours where every text colour is moved until it passes WCAG 2, spacing, radii and control heights.
  Writes CSS variables, a Tailwind v4 `@theme`, JSON, SwiftUI, Jetpack Compose and a preview page of both themes.
- `fonts` command: the characters, their pairings and the font library.
- The fix skill generates tokens with `system` when a project has none.

## 0.7.1

- Example: "Redesigning a SwiftUI app" (`examples/redesign-cebbin-swiftui.mp4`), the Cebbin iOS home screen through 16
  fixes one at a time, with the SwiftUI line behind each change.
- The package and both READMEs say it reads SwiftUI and Jetpack Compose apps; the Turkish README has the mobile section.

## 0.7.0

- Mobile apps: the checker reads SwiftUI (`.swift`) and Jetpack Compose (`.kt`). Sixteen rules have native patterns
  (spacing and radius scale, type scale, heavy weights, purple gradients and gradient text, `sparkles` for AI, emoji
  and exclamation marks in strings, greeting titles, Title Case labels, heavy shadows, big blurs, bouncy and looping
  motion, placeholder data).
- New rule `dynamic-type`: SwiftUI text with a fixed `.system(size:)` instead of a text style (icons are left alone).
- Pods, DerivedData, `.build`, `.gradle` and generated folders are skipped by default.
- Example: the Cebbin iOS home screen, 23 findings to 0 in four passes (`examples/story-cebbin-swiftui.mp4`).
- CI: the Chrome test has a 90 s timeout and jobs stop after 15 minutes.

## 0.6.1

- Chrome cleanup no longer fails a run when its helper processes outlive it (Linux CI); 0.6.0 was tagged but not
  published because of this.

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
