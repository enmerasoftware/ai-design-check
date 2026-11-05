# Benchmark

How often each rule fires on pages that AI models generated and on sites that people designed.

The rules are there to catch interfaces that look generated and interfaces that shut people out. A rule that fires on
most human sites as well is not telling the two apart, and a rule that never fires on AI pages is not earning its
place. The pages, the site list, the code and the numbers are all here, so anyone can check them and run them again.

## What it shows

From the run on 5 November 2026; the full numbers are under [Results](#results).

- **Some rules separate the two groups well.** A cream page ground: 40% of the AI pages, one human site (3%). An
  eyebrow label above a heading: 44% and 9%. On phones, 35% of the AI pages scroll sideways and no human site does; nearly
  all are Bootstrap pages, where a `.row` with `g-4` or `g-5` gutters is wider than its container's padding. Crushed
  letter spacing: 31% and 6%. An icon tile above every heading: 18% and none. A badge pill above the headline: 18% and 9%.
- **GPT and Claude leave different marks.** GPT-6.1 Sol and Terra set small text on every page they made (100%, against
  10% of the Claude pages and 47% of the human sites), crush the letter spacing of headings (88% against 2%), put an
  eyebrow over most headings (83% against 25%), use an italic serif hero (46% against none) and pick an overused font
  (50% against none). Their pages also carry far more contrast findings: a median of 27.5 per page, against 2 for Claude.
- **Some tells no longer tell.** Purple gradients and gradient text fired on no AI page and on 24% of the human sites
  (Stripe, Raycast, Shopify and Bootstrap's own site among them). Radial halos and auto-scrolling logo strips also showed
  up on human sites more often than on AI pages. Those rules are now warnings or notes, not errors, and this table is why.
- **The craft rules fire on everyone.** Line breaks, heading wrap, line length, small text and text near the screen edge
  fire on human sites as much as on AI pages, often more: human sites are longer and carry more text. They are there to
  improve any page, not to tell who made it.
- **Older tells are rare in today's pages.** The habits a spring-2026 sample of generated-looking Show HN sites showed
  (an accent word in the headline, coloured shadows, an arrow on every call to action) barely appear: none of them on more
  than 2% of the Claude pages, and 8 to 17% of the GPT pages. Rules whose evidence is that thin stay notes.
- **Accessibility depends on the model.** 69% of the Claude pages, every GPT page and 74% of the human sites have at
  least one contrast or heading-order finding.

## What is measured

- **AI pages.** 72 single-file pages: six briefs, each built once with Tailwind CSS and once with Bootstrap, by four
  Claude models and two GPT models. The pages are in [bench/pages](bench/pages); [bench/pages/index.json](bench/pages/index.json) records
  the exact prompt behind each one.
- **Human sites.** 34 public sites that people designed, each listed with the reason it is in the set in
  [bench/sites.json](bench/sites.json): product and SaaS, commerce, documentation and reference, government, news,
  sites built with Bootstrap, and personal sites.
- **Two checkers.** The browser checker (`ai-design-check scan`) opens every page and site in headless Chrome at 1440
  and 390 px and reads what is on the screen. The source checker (`ai-design-check`) reads the HTML of every AI page.
  Human sites are compared on the browser checker only: what they serve is not their source.
- **Two kinds of rule.** Accessibility rules are the rules in the accessibility area of [rules.json](rules.json), and
  `legible-contrast`, which sits in the visual area but is a contrast check (the scan report lists it with
  accessibility too). Every other rule is a style rule: the generated-look tells and the broader craft rules (line breaks,
  measure, spacing) together. Which of them actually separate AI pages from human sites is the first table of results.
- **The numbers.** Per rule: the share of AI pages and of human sites it fired on. Per group: the share of pages with
  at least one style finding, and the median number of findings. AI pages are also split by framework and by
  model, human sites by category.

## Method

### AI pages

Each page answers one prompt. The prompt was the same for every page apart from its last two lines:

```text
Build a single-file web page. Write complete, production-quality HTML with any extra CSS in the file and realistic English copy. Do not use images that need downloading; inline SVG or CSS is fine.
Framework: <framework>
Brief: <brief>
```

| Brief | Text |
|---|---|
| `timetrack` | A landing page for Tallyhoo, a time-tracking app for freelance designers. |
| `aiwriter` | A landing page for Brightmoss, an AI writing assistant for customer-support teams. |
| `dashboard` | The home screen of Ledgerly, an accounting web app for small businesses: revenue this month, invoices due, recent transactions and a cash-flow chart. |
| `pricing` | A pricing page for Fernhook, a developer API for sending SMS, with three plans and an FAQ. |
| `bakery` | A home page for Crumb & Co, a neighbourhood bakery: what they bake, opening hours and where to find them. |
| `portfolio` | The home page of Ada Lindqvist, a freelance product designer: selected work, about and contact. |

| Framework | Text |
|---|---|
| `tailwind` | Tailwind CSS v4, loaded with `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`; style with utility classes. |
| `bootstrap` | Bootstrap 5.3, loaded with `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">` (and its bundle script if you use components); style with Bootstrap classes. |

The models are Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 (`claude-opus-5-5`, `claude-sonnet-5-5`,
`claude-haiku-5-5` and `claude-fable-5-1`; `opus`, `sonnet`, `haiku` and `fable` in the file names), at medium effort,
on 5 November 2026. Each model wrote its 12 pages in one Claude Code subagent session. That session had Claude Code's
standard system prompt, the operator's general instructions (reply language, how to run heavy jobs; nothing about
design) and this request, followed by the 12 prompts, each under the path to write it to:

```text
You are a web developer taking client requests. Below are 12 separate requests. For each one, write the finished page
with the Write tool to the path in its heading (create the folder if needed). Treat each request on its own, as if a
different client sent it. Work only from the request text: do not read, list or search any files, and do not look
anything up. Return the list of files you wrote.
```

No model saw this project's rules. Pages are kept as written: no edits, no second attempts, no picking the better of
two. The Opus session was cut off by a usage limit and started again from the beginning; every page here comes from the
session that finished. [bench/import.js](bench/import.js) copies a generated set into bench/pages and copies every page
there is.

The GPT pages come from GPT-6.1 Sol and GPT-6.1 Terra (`gpt-6.1-sol` and `gpt-6.1-terra` in the file names) through the
Codex CLI 0.163, at medium reasoning effort, on 5 November 2026. [bench/generate.js](bench/generate.js) runs one fresh
`codex exec` per page in an empty folder, with the operator's own Codex settings and rules left out
(`--ignore-user-config --ignore-rules`), and sends the same prompt as above followed by one line: "Write the finished page
to page.html in the current folder and do nothing else." Gemini is not in the set: on that day Google's Gemini CLI no
longer accepted the operator's individual account.

### Human sites

The sites were chosen before the first run, and the list does not change after seeing results. Twelve of them (marked
`research` in sites.json) were in the research set the rules were checked against before this benchmark existed; the
results show them apart from the 22 sites new to it. Each site is measured live, once per run, at the address in
sites.json, which is usually its home page.

A site that cannot be measured is listed under the results with the reason, and left out of every number:

- the scan has no result within 180 seconds (120 for an AI page);
- the page answers with an HTTP error (bot protection often answers a headless browser with 403 or 503);
- the address sends visitors to a sign-in page;
- the page renders empty, or Chrome cannot open it or stops.

Such a site is not retried by hand or replaced.

### Counting

- Default settings: no config file, every rule at its own severity, notes (`info`) included.
- A finding the browser checker sees at both widths counts once. The browser checker reports at most 12 findings per
  rule and width (60 for contrast), so counts on long pages are capped.
- The source checker reads each page alone in an empty folder, so no other page shapes its spacing scale.
- The tool version, the Node and Chrome versions and the date are recorded with the results.

## Limitations

- The generators are four Claude and two GPT models. Gemini, open models and site builders are not in the set and may
  show other tells. The Claude pages were written in one agent session per model, the GPT pages in one run per page.
- In 2026 a human-designed site may well have had help from AI. "Human" here means a site that a team or a person made
  and maintains, not a site made without AI.
- Live sites change, and bot protection, cookie banners and regional versions change what a headless browser sees. A
  run on another day gives other numbers.
- The samples are small: 72 pages and 34 sites. A difference of a few points between two rules or two models means
  little.
- The thresholds in the rules were tuned on an earlier research sample, by the same people who chose these sites.
  Twelve of the sites were part of that sample; the results show them apart from the rest.
- The two groups are not the same kind of page. AI pages are single files written in one go; human sites are large
  production sites with real content, photography and years of iteration. The comparison says how often a rule fires
  on each, not that the pages are otherwise alike.
- A bot check that answers with an ordinary page is measured as if it were the site.
- How many source rules apply depends on the framework's class names, so compare frameworks on the browser columns.

## Run it again

You need Node 20 or later and Chrome (or `CHROME_PATH` pointing at Chrome or Chromium).

```sh
node bench/run.js                      # every AI page and every site, one Chrome at a time
node bench/run.js --only human         # only the live sites; the AI page results are kept
node bench/run.js --only ai --limit 4  # only the first four AI pages
node bench/run.js --report             # rewrite the results below from bench/results.json
```

A partial run replaces only the entries it measured, and results from other rules are never mixed in.
`--time-limit <seconds>` changes the time limit; `--pages <folder>` and `--sites <file>` measure another set.

To make a new set of AI pages, give each prompt in bench/pages/index.json to a model, save the answers as
`<folder>/<model>/<brief>-<framework>.html`, then:

```sh
node bench/import.js <folder>
node bench/run.js
```

The bench folder is not part of the npm package.

## Results

<!-- results:start -->
Measured on 2026-11-05 with ai-design-check 0.14.1, Node v25.4.0 and Google Chrome 156.0.8078.80, at 1440 and 390 px. 72 AI pages from 6 models, 6 briefs and 2 frameworks; 34 human sites. Counts for every page and site are in [bench/results.json](bench/results.json).

### At a glance

| Group | Checker | Measured | With a style finding | Style findings, median | With an accessibility finding | Accessibility findings, median |
|---|---|---:|---:|---:|---:|---:|
| AI pages | browser | 72 of 72 | 97% | 11 | 79% | 5 |
| Human sites | browser | 34 of 34 | 97% | 14 | 74% | 5.5 |
| Human sites, research set | browser | 12 of 12 | 92% | 15.5 | 75% | 6.5 |
| Human sites, new | browser | 22 of 22 | 100% | 13 | 73% | 4.5 |
| AI pages | source | 72 of 72 | 93% | 5 | 11% | 0 |

The browser rows compare like with like: one checker reads both groups. Human sites have no source to read, so the source row has no human counterpart. Almost every page, AI or human, has some style finding: the broad craft rules (line breaks, wrapping, measure) fire on both. What tells the groups apart is the next section.

### Which rules tell them apart

Browser checker only, so both groups are read the same way. A rule is listed when its share on AI pages is at least 10 points above its share on human sites, or when it fires on at least 10% of human sites and no less often there.

| Fires more on AI pages | AI pages | Human sites | Difference |
|---|---:|---:|---:|
| `no-default-cream` A background chosen, not defaulted | 40% | 3% | +37 |
| `no-eyebrow-label` No eyebrow label above a heading | 44% | 9% | +36 |
| `no-horizontal-overflow` No sideways scrolling on phones | 35% | 0% | +35 |
| `no-straggler` No single word on the last line | 79% | 50% | +29 |
| `no-crushed-tracking` No crushed letter spacing | 31% | 6% | +25 |
| `no-icon-tile-stack` No icon tile above every heading | 18% | 0% | +18 |
| `no-italic-serif-hero` No italic serif hero | 15% | 3% | +12 |

| Fires as often or more on human sites | AI pages | Human sites | Difference |
|---|---:|---:|---:|
| `no-tight-leading` Lines have room | 3% | 32% | -30 |
| `text-off-viewport-edge` Text keeps off the screen edge | 10% | 35% | -26 |
| `no-ai-gradients` No gradient text or purple gradients | 0% | 24% | -24 |
| `readable-measure` Readable line length and leading | 10% | 29% | -20 |
| `pulse-for-live-only` Pulse only for live data | 3% | 21% | -18 |
| `no-marquee` No auto-scrolling strips | 0% | 18% | -18 |
| `text-not-covered` Nothing covers the text | 13% | 29% | -17 |
| `no-radial-halo` No radial glow behind content | 3% | 18% | -15 |
| `text-not-clipped` Text is not cut off | 0% | 15% | -15 |
| `no-cramped-padding` Room inside a box | 1% | 15% | -13 |
| `no-repeated-label` One card says a thing once | 10% | 18% | -8 |
| `no-giant-sentence` No full sentence at display size | 4% | 12% | -8 |
| `no-tiny-text` No tiny text | 40% | 47% | -7 |
| `no-overused-font` A font chosen, not defaulted | 17% | 18% | -1 |

### Style rules

The share of pages each rule fired on. A dash means that checker does not read the rule; rules that fired nowhere are left out.

| Rule | AI pages, browser | Human sites, browser | AI pages, source |
|---|---:|---:|---:|
| `no-straggler` No single word on the last line | 79% | 50% | – |
| `no-decorative-uppercase` No tracked uppercase labels | – | – | 67% |
| `balanced-headings` Headings wrap evenly | 57% | 50% | – |
| `no-eyebrow-label` No eyebrow label above a heading | 44% | 9% | – |
| `no-tiny-text` No tiny text | 40% | 47% | – |
| `no-default-cream` A background chosen, not defaulted | 40% | 3% | – |
| `hover-media-query` Hover styles only where hover exists | – | – | 39% |
| `repeated-markup` Repeated markup becomes a component | – | – | 39% |
| `spacing-scale` Spacing on the project's scale | – | – | 39% |
| `no-horizontal-overflow` No sideways scrolling on phones | 35% | 0% | – |
| `no-crushed-tracking` No crushed letter spacing | 31% | 6% | 15% |
| `no-nested-cards` No cards inside cards | 28% | 26% | – |
| `radius-scale` Corner radii from the scale only | – | – | 26% |
| `heading-spacing` A heading sits with what it introduces | 22% | 18% | – |
| `no-greeting-headline` The title names the page, not the user | – | – | 21% |
| `no-heavy-headings` Headings at regular to semibold weight | – | – | 19% |
| `no-announcement-pill` No announcement pill above the headline | 18% | 9% | 1% |
| `no-icon-tile-stack` No icon tile above every heading | 18% | 0% | – |
| `no-overused-font` A font chosen, not defaulted | 17% | 18% | 15% |
| `no-heavy-card-shadow` Cards rest on surface steps, not heavy shadows | – | – | 17% |
| `type-scale` Font sizes from the scale only | – | – | 17% |
| `no-italic-serif-hero` No italic serif hero | 15% | 3% | 0% |
| `no-italic-emphasis` Emphasis with weight or colour, not italic | – | – | 14% |
| `text-not-covered` Nothing covers the text | 13% | 29% | – |
| `text-off-viewport-edge` Text keeps off the screen edge | 10% | 35% | – |
| `readable-measure` Readable line length and leading | 10% | 29% | – |
| `no-repeated-label` One card says a thing once | 10% | 18% | – |
| `no-all-caps-sentences` No sentences in capitals | 10% | 3% | – |
| `no-radial-halo` No radial glow behind content | 3% | 18% | 8% |
| `no-endless-loop` Nothing loops forever without a reason | – | – | 8% |
| `no-exclamation-copy` No exclamation marks in interface copy | – | – | 8% |
| `no-middle-dot-lists` No lists strung on middle dots | 8% | 0% | – |
| `no-section-numbers` No numbered section labels | 7% | 0% | – |
| `no-unsourced-proof` Social proof with a source | – | – | 7% |
| `no-ai-gradients` No gradient text or purple gradients | 0% | 24% | 6% |
| `no-arrow-suffix` No arrow on every call to action | 6% | 3% | – |
| `no-colored-shadow` No coloured shadows | 6% | 3% | – |
| `no-grid-wallpaper` No grid-line wallpaper | 6% | 3% | – |
| `no-hard-offset-shadow` A hard offset shadow is a decision | 6% | 3% | 6% |
| `no-giant-sentence` No full sentence at display size | 4% | 12% | – |
| `no-clipart-svg` No clip art built from shapes | 4% | 6% | – |
| `interface-speed` Interface responds within 300 ms | – | – | 4% |
| `no-tight-small-text` Small text keeps normal tracking | – | – | 4% |
| `no-tight-leading` Lines have room | 3% | 32% | 0% |
| `pulse-for-live-only` Pulse only for live data | 3% | 21% | 0% |
| `no-accent-word` No accent word in the headline | 3% | 6% | – |
| `no-blinking-cursor` No decorative blinking cursor | 3% | 6% | – |
| `no-neon-on-dark` No neon cyan on dark | 3% | 3% | – |
| `no-blur-blobs` No blurred colour blobs behind content | – | – | 3% |
| `no-hover-scale` No growing on hover | – | – | 3% |
| `no-cramped-padding` Room inside a box | 1% | 15% | – |
| `no-script-errors` No script errors on load | 1% | 9% | – |
| `no-side-stripe` No coloured side stripe on cards | 1% | 6% | 0% |
| `no-stripe-surface` No decorative stripes | 1% | 3% | 1% |
| `ellipsis-character` Ellipsis character, not three dots | – | – | 1% |
| `no-em-dash-saturation` No wall of em dashes | 0% | 0% | 1% |
| `no-layout-animation` Animate transform and opacity, not position | – | – | 1% |
| `no-wide-tracking-body` No wide tracking on running text | 1% | 0% | – |
| `short-placeholders` Short placeholders | – | – | 1% |
| `no-marquee` No auto-scrolling strips | 0% | 18% | 0% |
| `text-not-clipped` Text is not cut off | 0% | 15% | – |
| `no-buried-image` No picture buried under a wash | 0% | 9% | – |
| `flat-type-scale` Headings stand above the text | 0% | 6% | – |
| `no-bounce-easing` No bounce or overshoot easing on interface | 0% | 6% | 0% |
| `no-clipped-popover` A clipping box does not cut what it holds | 0% | 6% | – |
| `no-invisible-content` Content is visible at rest | 0% | 6% | – |
| `no-lopsided-fold` Columns in the first screen stay close | 0% | 6% | – |
| `glow-in-charts-only` Glow only in charts | 0% | 3% | 0% |
| `image-not-broken` No broken images | 0% | 3% | 0% |
| `no-flush-cards` Cards do not touch the scroller edge | 0% | 3% | – |
| `spacing-rhythm` Spacing with rhythm | 0% | 3% | – |

### Accessibility rules

The share of pages each rule fired on. A dash means that checker does not read the rule; rules that fired nowhere are left out.

| Rule | AI pages, browser | Human sites, browser | AI pages, source |
|---|---:|---:|---:|
| `legible-contrast` Legible contrast | 79% | 68% | – |
| `input-text-16` Fields use 16 px text on phones | – | – | 7% |
| `focus-ring-removed` Never remove the focus ring without a replacement | – | – | 6% |
| `heading-order` Heading levels do not skip | 3% | 24% | – |

In the tables below, as above, the measured count, the share and the first two medians come from the browser checker. The source column reads the AI pages' HTML; the most common rules count a rule found by either checker.

### By framework

| Framework | Measured | With a style finding | Style findings, median | Accessibility findings, median | Source: style findings, median | Most common style rules |
|---|---:|---:|---:|---:|---:|---|
| Tailwind, AI pages | 36 of 36 | 97% | 8 | 4.5 | 6 | `no-straggler` 86%, `no-decorative-uppercase` 72%, `repeated-markup` 61% |
| Tailwind, human sites | 2 of 2 | 100% | 7.5 | 10 | – | `no-ai-gradients` 50%, `no-announcement-pill` 50%, `no-colored-shadow` 50% |
| Bootstrap, AI pages | 36 of 36 | 97% | 11.5 | 8.5 | 4 | `no-straggler` 72%, `hover-media-query` 69%, `no-horizontal-overflow` 67% |
| Bootstrap, human sites | 3 of 3 | 100% | 3 | 3 | – | `no-ai-gradients` 67%, `no-overused-font` 67%, `no-announcement-pill` 33% |

### AI pages by model

| Model | Measured | With a style finding | Style findings, median | Accessibility findings, median | Source: style findings, median | Most common style rules |
|---|---:|---:|---:|---:|---:|---|
| Opus | 12 of 12 | 100% | 6 | 0.5 | 1 | `no-straggler` 92%, `balanced-headings` 75%, `no-default-cream` 50% |
| Sonnet | 12 of 12 | 83% | 5.5 | 1.5 | 3 | `no-decorative-uppercase` 67%, `balanced-headings` 58%, `no-straggler` 58% |
| Haiku | 12 of 12 | 100% | 10 | 4.5 | 4 | `no-straggler` 83%, `no-decorative-uppercase` 75%, `balanced-headings` 67% |
| Fable | 12 of 12 | 100% | 8.5 | 2 | 4 | `no-straggler` 92%, `balanced-headings` 67%, `repeated-markup` 67% |
| GPT-6.1 Sol | 12 of 12 | 100% | 28 | 29.5 | 55.5 | `no-tiny-text` 100%, `spacing-scale` 92%, `no-crushed-tracking` 83% |
| GPT-6.1 Terra | 12 of 12 | 100% | 27.5 | 26.5 | 55 | `no-decorative-uppercase` 100%, `no-tiny-text` 100%, `spacing-scale` 100% |

### Human sites by category

| Category | Measured | With a style finding | Style findings, median | Accessibility findings, median | Most common style rules |
|---|---:|---:|---:|---:|---|
| Product and SaaS | 13 of 13 | 100% | 21 | 11 | `balanced-headings` 62%, `no-tiny-text` 62%, `no-straggler` 54% |
| Commerce | 3 of 3 | 100% | 29 | 2 | `no-tight-leading` 67%, `no-tiny-text` 67%, `text-not-covered` 67% |
| Docs and reference | 6 of 6 | 100% | 10 | 0 | `no-straggler` 67%, `balanced-headings` 33%, `heading-spacing` 33% |
| Government | 3 of 3 | 100% | 23 | 1 | `no-straggler` 100%, `balanced-headings` 67%, `text-not-covered` 67% |
| News | 3 of 3 | 67% | 26 | 3 | `balanced-headings` 67%, `text-off-viewport-edge` 67%, `flat-type-scale` 33% |
| Built with Bootstrap | 3 of 3 | 100% | 3 | 3 | `no-ai-gradients` 67%, `no-overused-font` 67%, `no-announcement-pill` 33% |
| Personal | 3 of 3 | 100% | 9 | 9 | `balanced-headings` 67%, `no-tiny-text` 67%, `no-all-caps-sentences` 33% |

### Not measured

Every page and site was measured.
<!-- results:end -->
