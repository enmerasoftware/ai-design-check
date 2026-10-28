# Changelog

## 0.1.0 (@enmera/ai-design-check)

- Renamed from `@enmera/design`: the name says what it is for, checking interfaces built with AI coding agents.
  Config file `ai-design-check.json`; `.design-rules.json` and `enmera-design.json` are still read.

## 0.1.0 (@enmera/design, deprecated)

- First release: 23 rules in English and Turkish (`rules.json`), generated RULES.md / RULES.tr.md.
- Zero-dependency checker (`npx @enmera/ai-design-check`): type and radius scale, sentence case in JSX labels and i18n
  dictionaries, tracked uppercase, emoji, gradient text and purple gradients, side stripes, glow, pulse, marquee,
  CSS columns, buzzwords. Config in `enmera-design.json` or `.design-rules.json`.
- Agent skill (`npx skills add enmerasoftware/ai-design-check`).
