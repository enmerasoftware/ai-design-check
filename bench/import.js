import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies a generated set of AI pages into bench/pages/ and writes bench/pages/index.json, which records the exact
 * prompt behind every page.
 *
 *   node bench/import.js [folder]
 *
 * The folder holds <model>/<brief>-<framework>.html: one page per model, brief and framework below.
 */

const PAGES = join(dirname(fileURLToPath(import.meta.url)), 'pages');
/** Where the generating agents wrote the 0.14.0 set. Any folder with the same layout works. */
const CORPUS = '/private/tmp/claude-501/-Users-sinanyorulmaz-Projeler-Web-ai-design-check/0c11bcb4-3041-4f6c-b1d7-5384d0fc843c/scratchpad/bench-corpus';

const MODELS = ['opus', 'sonnet', 'haiku', 'fable'];
const BRIEFS = {
    timetrack: 'A landing page for Tallyhoo, a time-tracking app for freelance designers.',
    aiwriter: 'A landing page for Brightmoss, an AI writing assistant for customer-support teams.',
    dashboard: 'The home screen of Ledgerly, an accounting web app for small businesses: revenue this month, invoices due, recent transactions and a cash-flow chart.',
    pricing: 'A pricing page for Fernhook, a developer API for sending SMS, with three plans and an FAQ.',
    bakery: 'A home page for Crumb & Co, a neighbourhood bakery: what they bake, opening hours and where to find them.',
    portfolio: 'The home page of Ada Lindqvist, a freelance product designer: selected work, about and contact.',
};
const FRAMEWORKS = {
    tailwind: 'Tailwind CSS v4, loaded with <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>; style with utility classes.',
    bootstrap: 'Bootstrap 5.3, loaded with <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"> (and its bundle script if you use components); style with Bootstrap classes.',
};
/** How a page shows it loaded the framework it was asked for. */
const LOADS = { tailwind: /@tailwindcss\/browser/, bootstrap: /bootstrap@5[\d.]*\/dist\/css\/bootstrap(?:\.min)?\.css/ };

/** What the generator saw, word for word: the same text for every page apart from the last two lines. */
const prompt = (framework, brief) => [
    'Build a single-file web page. Write complete, production-quality HTML with any extra CSS in the file and realistic English copy. Do not use images that need downloading; inline SVG or CSS is fine.',
    `Framework: ${FRAMEWORKS[framework]}`,
    `Brief: ${BRIEFS[brief]}`,
].join('\n');

const corpus = resolve(process.argv[2] ?? CORPUS);
if (!existsSync(corpus)) {
    console.error(`No generated pages at ${corpus}. Pass the folder: node bench/import.js <folder>`);
    process.exit(1);
}

// bench/pages holds only what this script copies, so pages from an earlier set never linger.
mkdirSync(PAGES, { recursive: true });
for (const name of readdirSync(PAGES)) if (name.endsWith('.html') || name === 'index.json') rmSync(join(PAGES, name));

const plan = MODELS.flatMap((model) => Object.keys(BRIEFS).flatMap((brief) => Object.keys(FRAMEWORKS).map((framework) => ({ model, brief, framework }))));
const index = [];
const missing = [];
const doubtful = [];
for (const { model, brief, framework } of plan) {
    const from = join(corpus, model, `${brief}-${framework}.html`);
    const file = `${model}-${brief}-${framework}.html`;
    if (!existsSync(from) || statSync(from).size === 0) {
        missing.push(file);
        continue;
    }
    // Kept even so: leaving out a page that went wrong would flatter the generators.
    const html = readFileSync(from, 'utf8');
    if (!/<html[\s>]/i.test(html) || !LOADS[framework].test(html)) doubtful.push(file);
    copyFileSync(from, join(PAGES, file));
    index.push({ file, model, framework, brief, prompt: prompt(framework, brief) });
}
writeFileSync(join(PAGES, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

console.log(`Copied ${index.length} of ${plan.length} pages into bench/pages and wrote bench/pages/index.json.`);
if (missing.length > 0) console.log(`Missing or empty (${missing.length}): ${missing.join(', ')}`);
if (doubtful.length > 0) console.log(`Kept, but look at them: no <html> element or not loading the framework asked for (${doubtful.length}): ${doubtful.join(', ')}`);
