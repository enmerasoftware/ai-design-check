# @enmera/design-check

[Türkçe](README.tr.md)

Design rules for product interfaces (dashboards, admin panels, SaaS screens), written down once and used everywhere:
by people, by AI coding agents, and by a zero-dependency checker in CI.

The rules come from real screens shipped by [Enmera](https://enmera.com.tr) and [Searvia](https://searvia.com):
what read as "generated", what broke at narrow widths, what people did not understand. Each rule says **what**,
**why** and **how to fix it**, in English and Turkish.

```bash
npx @enmera/design-check            # check the project (or: design-check src lang)
npx @enmera/design-check rules      # list the rules (--tr for Turkish)
npx @enmera/design-check init       # write a config with the defaults
```

## What it covers

| Area | Examples |
|---|---|
| Writing | Sentence case for interface text (Turkish and English), no tracked uppercase labels, labels that fit |
| Type and shape | One type scale (`text-2xs` = 11 px is the floor), one radius scale, no cards inside cards |
| Selectors | Segmented control for the primary choice, plain sub-tabs on the same row, pill chips only for filters |
| Layout | Wide tables span the page, uneven cards in a grid masonry, readable line length, spacing rhythm |
| Navigation | Menu grouped by job, place and URL decided before the feature, moved URLs redirect |
| Visual language | Line icons instead of emoji, no gradient text or purple gradients, no side stripes, glow only in charts |
| Motion | Pulse only for live data, no auto-scrolling strips |
| Data and copy | Numbers carry their comparison, empty states, no marketing buzzwords |

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

Exit code 1 on errors (`--strict`: also on warnings), `--json` for machines.

### Configuration

`design-check.json` (or the dotfile `.design-rules.json`) in the project root:

```json
{
    "include": ["resources/js", "lang"],
    "ignore": ["resources/js/vendor/**"],
    "i18n": { "files": ["lang/*.json"], "keysAreSource": true, "framework": ["Reset Password"] },
    "properNouns": ["Brand Studio", "Core Web Vitals", "Privacy Policy"],
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

### In CI

```yaml
- run: npx @enmera/design-check
```

## For AI coding agents

The package ships a skill that tells an agent to read the rules before touching UI and to run the checker after:

```bash
npx skills add enmerasoftware/design-check
```

Or point your agent's instructions (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`) at
`node_modules/@enmera/design-check/RULES.md`.

## Adding a rule

Rules live in [`rules.json`](rules.json): `id`, `area`, `severity`, and `title` / `rule` / `why` / `fix` in `en` and
`tr`, plus an optional `check` (`regex` with `pattern`, `flags`, `files`). Run `npm run docs` to regenerate
RULES.md and RULES.tr.md and `npm test` before opening a pull request.

Inspired in part by [Impeccable](https://github.com/pbakaus/impeccable) and Anthropic's frontend-design skill.

## License

MIT
