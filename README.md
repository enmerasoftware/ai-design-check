# ai-design-check

**Find what makes an AI-built interface look generated, fix it, and keep it from coming back.**

[![npm version](https://img.shields.io/npm/v/@enmera/ai-design-check)](https://www.npmjs.com/package/@enmera/ai-design-check)
[![license: MIT](https://img.shields.io/npm/l/@enmera/ai-design-check)](LICENSE)
[Türkçe](README.tr.md)

For anyone building with Claude Code, Cursor or Codex: 95 design rules, a checker with no dependencies and no API key, and
an agent skill that repairs the screen. It reads web projects and SwiftUI and Jetpack Compose apps.

## Start in two steps

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

**2. Let your agent fix it.**

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
| **`inventory`** | How many different buttons, inputs, headings and cards do we have? | `npx @enmera/ai-design-check inventory` |
| **`narrow`** | What breaks on a phone or in a long language? | `npx @enmera/ai-design-check narrow page.html` |
| **`system`** | What fonts, type and colours should a new product start with? | `npx @enmera/ai-design-check system --brand "#1E5A63"` |
| **`story`** | Can I share the change as a video? | `npx @enmera/ai-design-check story before.html after.html` |

## What it catches

The checker tests 57 rules automatically. The other 38 need eyes on the screen, so they are marked *review* and left to you
and the fix skill. Each rule says what to do, why and how to fix it, in English and Turkish: [RULES.md](RULES.md).

| Area | Examples |
|---|---|
| Accessibility | Focus rings never removed without a replacement, icon-only buttons have a name, tap targets |
| Phone browsers | Pinch zoom stays on, 16 px text in fields, `dvh` beside fixed `100vh`, nothing hidden until hover |
| Type and shape | One type scale with 11 px as the floor, one radius per level, no cards inside cards |
| Writing and copy | Sentence case, no tracked uppercase labels, no buzzwords, buttons that say what they do, errors that say what to do |
| Components | Buttons and inputs from shared components, no outside styling, repeated markup becomes a component |
| Layout | Spacing on a 4 px grid with one gap per level, wide tables span the page, room for each cell on a phone |
| Visual language | Line icons instead of emoji, no gradient text or purple gradients, no side stripes, glow only in charts |
| Motion | No `transition-all`, no bounce, reduced motion respected, pulse only for live data, answers within 300 ms, no endless loops |
| Data | Numbers carry their comparison, tabular numerals, empty states |
| Localisation | Locale-aware case changes (Turkish i/İ), numbers through the formatter, real plurals |
| Selectors and navigation | One selector language, menu grouped by job, moved URLs redirect |

The rules come from screens we shipped at [Enmera](https://enmera.com.tr) and [Searvia](https://searvia.com): what read as
generated, what broke at narrow widths, what people did not understand. We then compared them with 16 highly rated
dashboard designs. Method and findings: [RESEARCH.md](RESEARCH.md).

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

It exits 1 on errors, and on warnings too with `--strict`. `--json` prints for machines, and `--format github` writes pull
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
| Colours | Light and dark, with every text colour moved until it passes WCAG 2 |
| Shape | A 4 px spacing scale, radii that nest, control heights, card padding |
| Files | `tokens.css`, Tailwind `theme.css`, `tokens.json`, `DesignSystem.swift`, `DesignSystem.kt`, `preview.html` |

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
4. `:root` variables: `--spacing` is the grid, `--space-*` and `--spacing-*` add steps to the 4 px grid and never remove any.
5. The 4 px grid.

A source that exists but cannot be read (`calc()`, `clamp()`, two files that disagree, a root font size that is not one
number) leaves the 4 px grid and a note in the report. It is not guessed, and later sources are not tried. Set `spacing` to
decide it yourself. With a list and no `base`, margins, paddings and gaps must be on the list; widths, heights and offsets
only have to fit the list's common divisor.

SwiftUI and Compose use `spacing` from the config file (`native` when it differs from the web) or 4 pt/dp. They read
nothing else: Swift and Kotlin constants have no shared place to look, and a web theme next to an app says nothing about the app.

</details>

<details>
<summary><strong>What the checker reads</strong></summary>

`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, Blade, CSS, i18n JSON, SwiftUI (`.swift`) and Jetpack Compose (`.kt`). It runs on
plain Node 20+. Class rules read class strings only (`class`, `className`, `cn()`, `clsx()`, `cva()`, `twMerge()`), so comments
and copy do not match.

</details>

<details>
<summary><strong>Adding a rule</strong></summary>

Rules live in [`rules.json`](rules.json): `id`, `area`, `severity`, and `title`, `rule`, `why` and `fix` in `en` and `tr`, plus an
optional `check`:

- `class`: a pattern on class strings, with `unless`, `exceptElements`, `unlessBefore` and `css`
- `native`: one pattern per platform under `swift` and `kt`, with `notMultipleOf`, `min`, `max`, `unlessBefore`, `unlessAfter`
  and `onlyIf`
- `regex`: a pattern on code with comments excluded, with `flags` and `files`
- or a structural check

Run `npm run docs` to regenerate RULES.md and RULES.tr.md, and `npm test` before opening a pull request.

</details>

## License

MIT
