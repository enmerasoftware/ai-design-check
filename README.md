# @enmera/ai-design-check

[Türkçe](README.tr.md)

![A generated dashboard checked, fixed and checked again: 200 findings to 0](examples/story-dashboard.webp)

Finds and fixes what makes interfaces built with AI coding agents (Claude Code, Cursor, Codex) look generated:
61 design rules, a zero-dependency checker that marks every finding, and an agent skill that fixes the screen and
proves it by checking again. For dashboards, admin panels, SaaS screens and landing pages.

```bash
npx @enmera/ai-design-check                    # check the project (or: ai-design-check src lang)
npx skills add enmerasoftware/ai-design-check  # the rules and the fix skill for your agent
```

Then ask your agent to "fix the design of this screen". It measures, proposes a direction from your product, fixes
spacing, colour, icons, copy, type, layout, components and motion in passes, and shows the count before and after.
Fixing is what most tools stop at; the checker keeps the next agent edit from bringing the slop back.

The rules come from real screens shipped by [Enmera](https://enmera.com.tr) and [Searvia](https://searvia.com):
what read as "generated", what broke at narrow widths, what people did not understand. Each rule says **what**,
**why** and **how to fix it**, in English and Turkish.

```bash
npx @enmera/ai-design-check inventory  # how many different buttons, inputs, headings, badges, cards you have
npx @enmera/ai-design-check rules      # list the rules (--tr for Turkish)
npx @enmera/ai-design-check init       # write a config with the defaults
npx @enmera/ai-design-check story before.html after.html  # a square before/after video, like the one above
```

No LLM, no API key, no dependencies: it catches measurable defects (a focus ring removed, an icon button with no
name, a font size off the scale, spacing off the 4 px grid, a raw `<button>` next to your `Button`, emoji as icons,
"Welcome back, Alex!", a Turkish `toUpperCase()`), and leaves taste to you and the fix skill.

## What it covers

| Area | Examples |
|---|---|
| Writing | Sentence case for interface text (Turkish and English), no tracked uppercase labels, labels that fit |
| Type and shape | One type scale (`text-2xs` = 11 px is the floor), one radius scale, no cards inside cards |
| Components | Buttons, inputs and selects from shared components, no outside styling of them, repeated markup becomes a component |
| Accessibility | Focus ring never removed without a replacement, icon-only buttons have a name |
| Localisation | Locale-aware case changes (Turkish i/İ), numbers through the locale formatter, real plurals, no glued sentences |
| Selectors | Segmented control for the primary choice, plain sub-tabs on the same row, pill chips only for filters |
| Layout | Wide tables span the page, uneven cards in a grid masonry, readable line length, spacing rhythm |
| Navigation | Menu grouped by job, place and URL decided before the feature, moved URLs redirect |
| Visual language | Line icons instead of emoji, no gradient text or purple gradients, no side stripes, glow only in charts |
| Motion | No transition-all, no bounce easing, reduced motion, pulse only for live data, no auto-scrolling strips |
| Data and copy | Numbers carry their comparison, tabular numerals, empty states, buttons that say what they do, errors that say what to do, no buzzwords |

The full list with reasons: [RULES.md](RULES.md).

## The checker

Plain Node (20+), no dependencies. It reads `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, Blade, CSS and i18n JSON and
reports rule ids with file and line. Rules that need judgement (layout, selectors, empty states) are marked *review*
and are left to people and agents.

```
src/pages/dashboard.tsx
     42  error  Font sizes from the scale only: text-[10px]  type-scale
     88  warn   No tracked uppercase labels: tracking-wide uppercase  no-decorative-uppercase
lang/tr.json
    812  error  Translation in Title Case: "Sıra Takibi" (Rank tracking)  sentence-case

2 errors, 1 warning, 0 notes.
```

Exit code 1 on errors (`--strict`: also on warnings). `--json` for machines, `--format github` for pull request
annotations. Class rules read class strings only (`class`, `className`, `cn()`, `clsx()`, `cva()`, `twMerge()`), so
comments and copy do not match.

### One look per element: `inventory`

```
Buttons  726 uses · 149 different looks · 147 without a shared component
   115×  <Button variant=outline size=sm>                       src/pages/projects/show.tsx:212
     9×  <button> bg-brand-400 font-semibold px-4 py-2 rounded-full text-on-brand text-sm   src/pages/home.tsx:91
Headings  229 uses · 69 different looks · 229 without a shared component
```

Layout classes (width, margin, position) are ignored, so two copies that differ only in where they sit count as one
look. Use it before a cleanup to see the drift and after to see it gone. `repeated-markup` reports the same long class
list repeated three or more times, with every place, so it can become one component.

### Existing projects: baseline and ignores

```bash
npx @enmera/ai-design-check --write-baseline   # record today's findings in .ai-design-check-baseline.json
npx @enmera/ai-design-check                    # from now on only new findings are reported
```

Ignore one place, always with a reason after `--` (an ignore without a reason is not honoured):

```tsx
{/* ai-design-check-ignore-next-line type-scale -- hero display size, see DESIGN.md */}
// ai-design-check-ignore-file use-shared-components -- this file is the Button component
```

### Configuration

`ai-design-check.json` (or the dotfile `.design-rules.json`) in the project root:

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
    "allow": {
        "type-scale": ["src/marketing/hero.tsx:text-[44px]"],
        "glow-in-charts-only": ["src/components/charts/**"]
    }
}
```

- `i18n.files`: JSON dictionaries. With `keysAreSource` the keys are the English source text and are checked too.
  `framework` lists keys owned by a framework that you cannot rename.
- `properNouns`: names that keep their capitals ("Google Business Profile" is recognised from the brand list).
- `allow`: per rule, `"glob"` or `"glob:exact match"`.
- `rules`: `"off"`, `"info"`, `"warn"` or `"error"` per rule id.
- `componentDirs`: where raw `<button>`/`<input>` are allowed (the components themselves).
- `components`: raw element → the shared component to use instead. `sharedComponents`: components whose look comes
  from props; `className` on them may only place them (width, margin, grid position).
- `looks`: the component that owns each hand-written look found by `use-shared-looks` (a span styled as a badge, a
  div styled as a card, a heading with size classes, a link styled as a button). `false` turns one kind off.

### In CI

```yaml
- run: npx @enmera/ai-design-check
```

## For AI coding agents

The package ships two skills:

- **ai-design-check** tells an agent to read the rules before touching UI and to run the checker after.
- **ai-design-fix** fixes a screen that already looks generated: measure, pick a direction from the product (who,
  world, one accent, one moment), fix in passes across the whole screen, then check again and report before → after.
  It keeps features, data and content; it never silences a finding without a reason.

```bash
npx skills add enmerasoftware/ai-design-check
```

### Before/after video: `story`

```bash
npx @enmera/ai-design-check story screen.before.html screen.html --out story.mp4 --still frame.png
```

A square 8 second video for sharing: the before screen with every finding marked one by one, a wipe to the after
screen while the count falls, and an end card. Files or URLs. It drives your installed Chrome over the DevTools
protocol and encodes with ffmpeg; nothing to install from npm. Try it on [examples/dashboard.html](examples/dashboard.html)
and [examples/dashboard.fixed.html](examples/dashboard.fixed.html).

Make the agent see findings right after each edit with a hook. Claude Code, in `.claude/settings.json`:

```json
{
    "hooks": {
        "PostToolUse": [
            { "matcher": "Edit|Write|MultiEdit", "hooks": [{ "type": "command", "command": "npx -y @enmera/ai-design-check hook" }] }
        ]
    }
}
```

`hook` reads the edited file from the hook input, checks only that file and exits 2 with the findings on stderr, which
Claude Code hands back to the agent; a clean file exits 0 silently. The same command works for any agent hook that
passes `tool_input.file_path` or `file_path` as JSON on stdin.

Or point your agent's instructions (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`) at
`node_modules/@enmera/ai-design-check/RULES.md`.

## Adding a rule

Rules live in [`rules.json`](rules.json): `id`, `area`, `severity`, and `title` / `rule` / `why` / `fix` in `en` and
`tr`, plus an optional `check`: `class` (pattern on class strings, with `unless`, `exceptElements`, `unlessBefore`,
`css`), `regex` (pattern on code, comments excluded, with `flags` and `files`) or a structural check. Run `npm run docs` to regenerate
RULES.md and RULES.tr.md and `npm test` before opening a pull request.

Inspired in part by [Impeccable](https://github.com/pbakaus/impeccable), [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky and Anthropic's frontend-design skill.

## License

MIT
