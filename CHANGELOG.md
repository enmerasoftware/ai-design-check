# Changelog

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
