# Benchmark

How often each rule fires on pages that AI models generated and on sites that people designed.

The rules are there to catch interfaces that look generated and interfaces that shut people out. A rule that fires on
most human sites as well is not telling the two apart, and a rule that never fires on AI pages is not earning its
place. The pages, the site list, the code and the numbers are all here, so anyone can check them and run them again.

## What is measured

- **AI pages.** 48 single-file pages: six briefs, each built once with Tailwind CSS and once with Bootstrap, by four
  Claude models. The pages are in [bench/pages](bench/pages); [bench/pages/index.json](bench/pages/index.json) records
  the exact prompt behind each one.
- **Human sites.** 34 public sites that people designed, each listed with the reason it is in the set in
  [bench/sites.json](bench/sites.json): product and SaaS, commerce, documentation and reference, government, news,
  sites built with Bootstrap, and personal sites.
- **Two checkers.** The browser checker (`ai-design-check scan`) opens every page and site in headless Chrome at 1440
  and 390 px and reads what is on the screen. The source checker (`ai-design-check`) reads the HTML of every AI page.
  Human sites are compared on the browser checker only: what they serve is not their source.
- **Two kinds of rule.** Accessibility rules are the rules in the accessibility area of [rules.json](rules.json), and
  `legible-contrast`, which sits in the visual area but is a contrast check (the scan report lists it with
  accessibility too). Every other rule counts as a generated-look rule.
- **The numbers.** Per rule: the share of AI pages and of human sites it fired on. Per group: the share of pages with
  at least one generated-look finding, and the median number of findings. AI pages are also split by framework and by
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

The models are Claude Opus, Sonnet, Haiku and Fable as they were in November 2026 (`opus`, `sonnet`, `haiku` and
`fable` in the file names). Each page was written by a Claude Code agent running that model, given the prompt above and
nothing else about design. Pages are kept as written: no edits, no second attempts, no picking the better of two.
[bench/import.js](bench/import.js) copies a generated set into bench/pages and copies every page there is.

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

- The generators are Claude models only. Pages from other models, or from site builders, may show other tells.
- In 2026 a human-designed site may well have had help from AI. "Human" here means a site that a team or a person made
  and maintains, not a site made without AI.
- Live sites change, and bot protection, cookie banners and regional versions change what a headless browser sees. A
  run on another day gives other numbers.
- The samples are small: 48 pages and 34 sites. A difference of a few points between two rules or two models means
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
_Not run yet. The first run comes after the 0.14.0 rules are in: `node bench/run.js`._
<!-- results:end -->
