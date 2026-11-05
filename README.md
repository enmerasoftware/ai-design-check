# ai-design-check

**Find what makes an AI-built interface look generated, fix it, and keep it from coming back.**

[![npm version](https://img.shields.io/npm/v/@enmera/ai-design-check)](https://www.npmjs.com/package/@enmera/ai-design-check)
[![license: MIT](https://img.shields.io/npm/l/@enmera/ai-design-check)](LICENSE)
[Türkçe](README.tr.md) · [日本語](README.ja.md)

For anyone building with Claude Code, Cursor or Codex: 141 design rules, a checker with no dependencies and no API key, and
an agent skill that repairs the screen. It reads web projects (React, Vue, Svelte, Laravel Blade, HTML; Tailwind, Bootstrap or plain
CSS) and SwiftUI, Jetpack Compose, Flutter and React Native apps. Finding needs no agent, and neither do the mechanical fixes.

## Start in three steps

**1. Check your project.**

```bash
npx @enmera/ai-design-check
```

```
Accessibility (1)
src/pages/dashboard.tsx
     31  error  Never remove the focus ring without a replacement: outline-none  focus-ring-removed

Style (3)
src/pages/dashboard.tsx
     42  error  Font sizes from the scale only: text-[10px]  type-scale
     88  warn   No tracked uppercase labels: tracking-wide uppercase  no-decorative-uppercase

lang/tr.json
    812  error  Translation in Title Case: "Sıra Takibi" (Rank tracking)  sentence-case

1 accessibility, 3 style: 3 errors, 1 warnings, 0 notes.
```

**2. Fix what has one answer, with no agent.**

```bash
npx @enmera/ai-design-check --fix --dry-run
```

This lists the changes; drop `--dry-run` to make them. Spacing and corners move to the nearest step of your scale, and very
heavy type becomes bold. Tap sizes, colours, emoji, words and hierarchy stay in the report, since they take a decision.

**3. Let your agent fix the rest.**

```bash
npx skills add enmerasoftware/ai-design-check
```

Then ask: *"fix the design of this screen"*. The agent measures the screen, writes a short brief from your product, repairs
it, and shows the count before and after. Features, data and words stay.

<p align="center">
  <img src="examples/before-after-web.webp" width="860" alt="The same dashboard before and after: 266 findings down to 0">
</p>
<p align="center"><sub>The same dashboard, before and after. Open <a href="examples/dashboard.html">before</a> and <a href="examples/dashboard.fixed.html">after</a>, or watch <a href="examples/story-dashboard.mp4">the video</a>.</sub></p>

## What's in the package

| Tool | What it answers | Run it |
|---|---|---|
| **Checker** | What is wrong, in which file and on which line? | `npx @enmera/ai-design-check` |
| **Fix skill** | Can an agent repair this screen and prove it? | `npx skills add enmerasoftware/ai-design-check` |
| **`scan`** | What does the running page really show? Contrast, sizes, what covers what, script errors | `npx @enmera/ai-design-check scan http://localhost:3000` |
| **`redesign`** | Can my agent study this page and redo it on a branch, proving each step? | `npx @enmera/ai-design-check redesign http://localhost:3000` |
| **`inventory`** | How many different buttons, inputs, headings and cards do we have? | `npx @enmera/ai-design-check inventory` |
| **`narrow`** | What breaks on a phone or in a long language? | `npx @enmera/ai-design-check narrow page.html` |
| **`system`** | What fonts, type and colours should a new product start with? | `npx @enmera/ai-design-check system --brand "#1E5A63"` |
| **`story`** | Can I share the change as a video? | `npx @enmera/ai-design-check story before.html after.html` |

## What it catches

67 rules read your code (33 of them in app code too) and 60 read the running page (`scan`), some of them both. The other 33 need eyes on the screen, so they
are marked *review* and left to you and the fix skill. Each rule says what to do, why and how to fix it, in English and Turkish: [RULES.md](RULES.md).

| Area | Examples |
|---|---|
| Accessibility | Focus rings never removed without a replacement, icon-only buttons have a name, tap targets |
| Phone browsers | Pinch zoom stays on, 16 px text in fields, `dvh` beside fixed `100vh`, nothing hidden until hover |
| Type and shape | One type scale with 11 px as the floor, one radius per level, no cards inside cards |
| Writing and copy | Sentence case, no tracked uppercase labels, no buzzwords, buttons that say what they do, errors that say what to do |
| Components | Buttons and inputs from shared components, no outside styling, repeated markup becomes a component |
| Layout | Spacing on a 4 px grid with one gap per level, wide tables span the page, room for each cell on a phone |
| Visual language | Line icons instead of emoji, no gradient text or purple gradients, no side stripes, no coloured shadows, glow only in charts |
| Motion | No `transition-all`, no bounce, reduced motion respected, pulse only for live data, answers within 300 ms, no endless loops |
| Data | Numbers carry their comparison, tabular numerals, empty states |
| Localisation | Locale-aware case changes (Turkish i/İ), numbers through the formatter, real plurals |
| Selectors and navigation | One selector language, menu grouped by job, moved URLs redirect |

The rules come from screens we shipped at [Enmera](https://enmera.com.tr) and [Searvia](https://searvia.com): what read as
generated, what broke at narrow widths, what people did not understand. We then compared them with 16 highly rated
dashboard designs. Method and findings: [RESEARCH.md](RESEARCH.md).

**How well it tells them apart.** [BENCHMARK.md](BENCHMARK.md) runs every rule on 72 pages that four Claude and two
GPT models generated, in Tailwind and in Bootstrap, and on 34 sites people designed. Some rules separate the two clearly: a
cream page ground shows on 40% of the AI pages against 3% of the sites; on phones 35% of the AI pages scroll sideways and no
human site does. GPT and Claude leave different marks: GPT pages set small text on every page and crush heading letter
spacing on 88% of them. Others no longer tell, purple gradients among them, and their severity follows that evidence.

## The running page and the redesign

`scan` opens the page in your Chrome at desktop and phone width, with no model and no API key. It reads what the source can't
show: real contrast, sizes, what covers what, broken images, script errors, content that never appears. It reads every colour
Chrome computes, Tailwind 4's `oklch()` included, and the habits of a generated page: an accent word in the headline,
coloured shadows, an arrow on every call to action, lists strung on middle dots, a badge pill above the headline.

A page that did not load, answers with an error, sends the browser to a sign-in page or draws a sign-in form in its own place
stops the scan with exit 2 instead of passing as clean. For a page behind a sign-in, pass `--cookie "name=value"` or `--header "Name: value"`, or set
`AI_DESIGN_CHECK_COOKIE` and `AI_DESIGN_CHECK_HEADERS` to keep them out of shell history and CI logs. Both go only to the
page's own origin, never to the other hosts it loads from. `--allow-redirect` and
`--allow-status 404` check such a page on purpose. Several URLs are scanned in one run. Add `--format github`
for pull requests. With `designSystem` in the config (`fonts`, `sizes`, `radii`, `colors`) it also names what drifts.

`redesign` is the one part that needs your agent (Claude Code or Codex), because deciding what a page should show takes
judgement. The agent studies the screenshots, the code and the subject, and writes one card per section: what it says, what
is wrong, the idea that comes from its own content, the colours it uses from your site. Those cards are checked against the
measured page. Then the numbered fixes and the cards are applied pass by pass on a new git branch, and a pass that loses
content, adds rule errors or looks worse is thrown away. `--plan` stops after the cards so you can read and edit them;
`--brief` builds them. It starts only on a clean working tree (commit or stash first), and Ctrl-C puts back the pass in
progress.

## Mobile apps

Point it at the app folder. It reads SwiftUI and Jetpack Compose: spacing off the scale (4 pt unless `spacing` is set; `.padding(13)`, `10.dp`), radii
off the scale, fixed text that ignores Dynamic Type, heavy headings, purple gradients, `sparkles` for AI, emoji in strings,
Title Case labels, heavy shadows, big blurs, looping animations, and tap targets under 44 pt / 48 dp.

```bash
npx @enmera/ai-design-check Cebbin/Views
```

<p align="center">
  <img src="examples/before-after-ios.webp" width="520" alt="The Cebbin iOS home screen before and after">
</p>
<p align="center"><sub>Our iOS app Cebbin, live on the App Store, on the simulator with the same data. <a href="examples/redesign-cebbin-swiftui.mp4">Watch the 16 fixes</a>, each with the SwiftUI line behind it, or <a href="examples/story-cebbin-swiftui.mp4">the first run</a> from 23 findings to 0.</sub></p>

## Use it in your project

### Give your agent the rules

The package ships two skills, both installed by `npx skills add enmerasoftware/ai-design-check`:

- **ai-design-check** has the agent read the rules before touching a screen and run the checker afterwards.
- **ai-design-fix** repairs a screen that already looks generated. It measures gaps and radii, writes a four-line brief (job,
  claim, proof, keep), works through the screen in order of harm, and reports before and after. It never removes content
  to lower the count, and never silences a finding without a reason.

In Claude Code the same skills install as a plugin: `/plugin marketplace add enmerasoftware/ai-design-check`, then
`/plugin install ai-design-check@ai-design-check`. In Codex: `codex plugin marketplace add enmerasoftware/ai-design-check`.

Without skills, point your agent's instructions (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`) at
`node_modules/@enmera/ai-design-check/RULES.md`.

### Show findings right after each edit

A hook checks the file an agent just changed and hands the findings back to it. In Claude Code's `.claude/settings.json`:

```json
{
    "hooks": {
        "PostToolUse": [
            { "matcher": "Edit|Write|MultiEdit", "hooks": [{ "type": "command", "command": "npx -y @enmera/ai-design-check hook" }] }
        ]
    }
}
```

The same command works for any agent hook that passes `tool_input.file_path` or `file_path` as JSON on stdin. A clean file
exits silently; findings exit 2 on stderr.

### Add it to CI

```yaml
- run: npx @enmera/ai-design-check
```

It exits 1 on errors, and on warnings too with `--strict`. It exits 2 when nothing could be checked or an option or the config
is wrong, so a mistyped path cannot pass. `--json` prints for machines, and `--format github` writes pull
request annotations.

### Start from an existing project

Record today's findings, and from then on only new ones are reported:

```bash
npx @enmera/ai-design-check --write-baseline
```

Ignore one place, always with a reason after `--`. An ignore without a reason does not count:

```tsx
{/* ai-design-check-ignore-next-line type-scale -- hero display size, see DESIGN.md */}
// ai-design-check-ignore-file use-shared-components -- this file is the Button component
```

## Commands

### `inventory`: one look per element

```
Buttons  726 uses · 149 different looks · 147 without a shared component
   115×  <Button variant=outline size=sm>                       src/pages/projects/show.tsx:212
     9×  <button> bg-brand-400 font-semibold px-4 py-2 rounded-full text-on-brand text-sm   src/pages/home.tsx:91
Headings  229 uses · 69 different looks · 229 without a shared component
```

Use it before a cleanup to see the drift and afterwards to see it gone. Layout classes are ignored, so two copies that differ
only in where they sit count as one look.

### `narrow`: phones and long languages

```bash
npx @enmera/ai-design-check narrow examples/narrow-de.html --width 320
```

Renders the page in your Chrome at phone and desktop width and reports what only a rendered page shows: sideways scrolling
and what causes it, text cut off, text shrunk to fit, and content hidden on phones. Run it with your longest language; German
labels are often 30–40 % longer than English. Try [the broken example](examples/narrow-de.html) and
[the fixed one](examples/narrow-de.fixed.html).

Add `--stress` to run it again with worst-case data: long names, large numbers and text 40 % longer. It tests the layout;
grammar such as "1 member" still needs a look at the screen with real data.

### `system`: a design system from your brand

```bash
npx @enmera/ai-design-check system --character calm --brand "#1E5A63" --kind app --out design-system
```

For a new product or one with no tokens. Give it a character (`calm`, `precise`, `friendly`, `warm`, `bold`, `editorial`,
`luxurious`, `playful`, `technical`, `trustworthy`), a brand colour and a kind of screen (`dashboard`, `app`, `marketing`,
`reading`).

| You get | Details |
|---|---|
| Fonts | UI, display, numbers and code, from a library of 50. `fonts --character calm` lists the options |
| Type scale | Eight roles that map to Dynamic Type and Material 3 |
| Colours | Light and dark; every text and background pair passes WCAG 2 at 4.5:1, status pills and buttons included |
| Shape | A 4 px spacing scale, radii that nest, control heights, card padding |
| Files | `tokens.css`, Tailwind `theme.css`, Bootstrap `bootstrap.css` and `_variables.scss`, `tokens.json`, `DesignSystem.swift`, `DesignSystem.kt`, `preview.html` |

With Bootstrap 5.3, link `bootstrap.css` after Bootstrap's own CSS: light is the default and dark applies under
`data-bs-theme="dark"`. It also replaces the blue Bootstrap compiles into fields, checks, menus, pagination and the rest. A
build from source imports `_variables.scss` before Bootstrap.

### `story`: a before/after video

```bash
npx @enmera/ai-design-check story screen.before.html screen.html --out story.mp4 --music track.mp3 --still frame.png
```

A square 12 second video: every finding marked one by one, a wipe to the new screen while the count falls, and an end card.
It takes files or URLs, and needs only your Chrome and ffmpeg.

### Other commands

```bash
npx @enmera/ai-design-check rules    # list the rules (--tr for Turkish)
npx @enmera/ai-design-check init     # write a config with the defaults
```

<details>
<summary><strong>Configuration</strong></summary>

`ai-design-check.json` (or `.design-rules.json`) in the project root:

```json
{
    "include": ["resources/js", "lang"],
    "ignore": ["resources/js/vendor/**"],
    "i18n": { "files": ["lang/*.json"], "keysAreSource": true, "framework": ["Reset Password"] },
    "properNouns": ["Brand Studio", "Core Web Vitals", "Privacy Policy"],
    "componentDirs": ["**/components/ui/**"],
    "components": { "button": "Button", "input": "Input" },
    "sharedComponents": ["Button", "Badge", "Input", "Card"],
    "looks": { "badge": "StatusBadge", "card": "Tile or SectionCard", "heading": "Heading", "link": "LinkButton" },
    "rules": { "pulse-for-live-only": "off" },
    "spacing": { "base": 6 },
    "allow": {
        "type-scale": ["src/marketing/hero.tsx:text-[44px]"],
        "glow-in-charts-only": ["src/components/charts/**"]
    }
}
```

| Key | Meaning |
|---|---|
| `i18n.files` | JSON dictionaries. With `keysAreSource` the keys are the English source and are checked too. `framework` lists keys you cannot rename |
| `properNouns` | Names that keep their capitals |
| `allow` | Per rule, `"glob"` or `"glob:exact match"` |
| `spacing` | The spacing scale: `6`, `[4, 6, 8, 12]` or `{ "base": 4, "values": [18], "native": { "base": 8 } }`. See below |
| `rules` | `"off"`, `"info"`, `"warn"` or `"error"` per rule id |
| `componentDirs` | Where raw `<button>` and `<input>` are allowed |
| `components` | Raw element → the shared component to use instead |
| `sharedComponents` | Components whose look comes from props; `className` may only place them |
| `looks` | The component that owns each hand-written look. `false` turns one kind off |

**Spacing scale.** `spacing-scale` judges a value against the first of these it can read, and the report names which one it
used:

1. `spacing` in the config file.
2. Tailwind 4 `@theme`: `--spacing` is the grid, `--spacing-*` add steps.
3. `tailwind.config.*`, read as text and never run: `theme.spacing` replaces the steps, `theme.extend.spacing` adds to the
   4 px grid. A function, a variable, a spread or a preset cannot be read that way.
4. Bootstrap's `$spacer` and `$spacers` in your SCSS, read as text: their steps join the 4 px grid.
5. `:root` variables: `--spacing` is the grid, `--space-*` and `--spacing-*` add steps to the 4 px grid and never remove any.
6. The 4 px grid.

A source that exists but cannot be read (`calc()`, `clamp()`, two files that disagree, a root font size that is not one
number) leaves the 4 px grid and a note in the report. It is not guessed, and later sources are not tried. Set `spacing` to
decide it yourself. With a list and no `base`, margins, paddings and gaps must be on the list; widths, heights and offsets
only have to fit the list's common divisor.

App code (SwiftUI, Compose, Flutter, React Native) uses `spacing` from the config file (`native` when it differs from the web)
or 4 pt/dp. It reads nothing else: constants in app code have no shared place to look, and a web theme next to an app says
nothing about the app.

</details>

<details>
<summary><strong>What the checker reads</strong></summary>

`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, Blade, CSS and SCSS, i18n JSON, SwiftUI (`.swift`) and Jetpack Compose (`.kt`). It
runs on plain Node 20+. Class rules read class strings only (`class`, `className`, `cn()`, `clsx()`, `cva()`, `twMerge()`), so
comments and copy do not match; they know Tailwind's classes and Bootstrap's. CSS rules read stylesheets, `<style>` blocks and
`style=""` attributes declaration by declaration. A framework's own stylesheet copied into the project (Bootstrap, Tailwind's
output and others, known by their licence banner) is skipped: its values are the framework's choices, not yours.

</details>

<details>
<summary><strong>Adding a rule</strong></summary>

Rules live in [`rules.json`](rules.json): `id`, `area`, `severity`, and `title`, `rule`, `why` and `fix` in `en` and `tr`, plus an
optional `check`:

- `class`: a pattern on class strings (or a list of them), with `unless`, `with`, `exceptElements`, `unlessBefore`, and `css`:
  a pattern on stylesheets, or entries read declaration by declaration (`property`, `value`, `scale`, `gradient` with `hue`,
  `selector`, `unless`, `unlessRule`)
- `native`: one pattern per platform under `swift` and `kt`, with `notMultipleOf`, `min`, `max`, `unlessBefore`, `unlessAfter`
  and `onlyIf`
- `regex`: a pattern on code with comments excluded, with `flags` and `files`
- or a structural check

Run `npm run docs` to regenerate RULES.md and RULES.tr.md, and `npm test` before opening a pull request.

</details>

## License

MIT
