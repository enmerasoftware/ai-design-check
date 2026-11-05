import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { check, loadRules } from '../src/check.js';
import { scan } from '../src/scan.js';
import { findChrome } from '../src/story.js';

/**
 * The public benchmark: how often each rule fires on AI-generated pages and on sites people designed.
 *
 *   node bench/run.js [--only ai|human] [--limit n] [--time-limit seconds] [--pages folder] [--sites file]
 *   node bench/run.js --report      rewrites the results in BENCHMARK.md from bench/results.json
 *
 * AI pages get the source checker and the browser checker; human sites get the browser checker on the live page.
 * One Chrome at a time. A page or site that cannot be measured is recorded with the reason and counted nowhere.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(HERE, 'results.json');
const BENCHMARK = join(HERE, '..', 'BENCHMARK.md');
const MARKS = ['<!-- results:start -->', '<!-- results:end -->'];
const WIDTHS = [1440, 390];
/** Seconds before a scan counts as timed out. Live sites load far more than one local file. */
const LIMITS = { page: 120, site: 180 };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
/** Why a page could not be measured, read from the error the checker threw; the first match wins. */
const KINDS = [
    ['http', /\bHTTP \d{3}\b/],
    ['sign-in', /\bsign[- ]?in\b|\blog[- ]?in\b/i],
    ['blocked', /captcha|bot check|challenge|access denied/i],
    ['timeout', /\bwithin \d|\btimed? ?out\b/i],
    ['network', /net::ERR_|Could not open/],
    ['empty', /empty page/],
    ['not a page', /not a page/],
];
const FRAMEWORKS = { tailwind: 'Tailwind', bootstrap: 'Bootstrap' };
const CATEGORIES = { product: 'Product and SaaS', commerce: 'Commerce', docs: 'Docs and reference', government: 'Government', news: 'News', bootstrap: 'Built with Bootstrap', personal: 'Personal' };

const today = () => new Date().toISOString().slice(0, 10);
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
const sum = (counts) => Object.values(counts).reduce((total, n) => total + n, 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const said = (result) => (result.rules ? plural(sum(result.rules), 'finding') : `not measured (${result.failed})`) + (result.seconds === undefined ? '' : `, ${result.seconds} s`);

/** Findings as { rule: count }, sorted so that results.json diffs stay readable. */
function tally(findings) {
    const counts = {};
    for (const { rule } of findings) counts[rule] = (counts[rule] ?? 0) + 1;

    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

/** What went wrong, without local paths or ports in the message. */
function failure(error, local) {
    const first = String(error?.message ?? error).split('\n')[0];
    const message = (local ? first.replaceAll(local, '') : first).slice(0, 300);
    // An address with "login" in it is not a sign-in wall.
    const plain = message.replace(/https?:\/\/\S+/g, '');

    return { failed: KINDS.find(([, pattern]) => pattern.test(plain))?.[0] ?? 'crash', message };
}

/** The pages over http on a free local port, as a visitor would load them: file:// pages can lose fonts and scripts. */
async function serve(folder) {
    const server = createServer((request, response) => {
        let path = '';
        try {
            path = resolve(folder, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
        } catch {
            // A malformed address is answered like a missing file.
        }
        if (!path.startsWith(folder + sep) || !existsSync(path) || !statSync(path).isFile()) {
            response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
            return;
        }
        response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));

    return server;
}

/** The source checker on one page, alone in an empty folder, so no other page shapes its spacing scale. */
function checkSource(path) {
    const work = mkdtempSync(join(tmpdir(), 'ai-design-check-bench-'));
    try {
        copyFileSync(path, join(work, basename(path)));

        return { rules: tally(check(work)) };
    } catch (error) {
        return failure(error, work + sep);
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
}

/**
 * scan() on one address within a time limit. scan() closes its Chrome only when it ends, so a scan past its time is
 * still waited for before the next one starts: never two Chromes at once.
 */
async function browse(url, seconds, local) {
    const started = Date.now();
    const elapsed = () => Math.round((Date.now() - started) / 1000);
    const running = scan(url, { widths: WIDTHS }).then((findings) => ({ rules: tally(findings) }), (error) => failure(error, local));
    let timer;
    const late = new Promise((done) => { timer = setTimeout(done, seconds * 1000, null); });
    const result = await Promise.race([running, late]);
    clearTimeout(timer);
    if (result) return { ...result, seconds: elapsed() };
    console.log(`    no result within ${seconds} s; waiting for its Chrome to close`);
    await running;

    return { failed: 'timeout', message: `No result within ${seconds} seconds`, seconds: elapsed() };
}

/**
 * Where the address ends up when it sends visitors to a sign-in page, else null. Only a hint: when this request
 * fails, the browser still decides whether the site can be measured.
 */
async function signInPage(url) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        await response.body?.cancel();
        const { hostname, pathname } = new URL(response.url);

        return /^(?:login|signin|accounts?|auth|sso)\./.test(hostname) || /\/(?:log-?in|sign-?in|sign_in|auth|session|sso)(?:\/|$)/i.test(pathname) ? response.url : null;
    } catch {
        return null;
    }
}

/** "Google Chrome 142.0.7444.59"; null where Chrome prints nothing (Windows). */
function chromeVersion(chrome) {
    const run = spawnSync(chrome, ['--version'], { encoding: 'utf8', timeout: 15000 });

    return run.stdout?.trim() || null;
}

/** The last run's entries, so that a partial run replaces only what it measured. Numbers from other rules are dropped. */
function earlier(tool, rulesHash) {
    if (!existsSync(RESULTS)) return { pages: [], sites: [] };
    const previous = JSON.parse(readFileSync(RESULTS, 'utf8'));
    if (previous.tool === tool && previous.rulesHash === rulesHash) return { pages: previous.pages ?? [], sites: previous.sites ?? [] };
    console.log(`bench/results.json came from other rules (${previous.tool}); starting again.`);

    return { pages: [], sites: [] };
}

async function measurePages(folder, limit, seconds, previous) {
    const indexFile = join(folder, 'index.json');
    if (!existsSync(indexFile)) throw new Error(`No ${indexFile}: run node bench/import.js first.`);
    const pages = JSON.parse(readFileSync(indexFile, 'utf8'));
    const chosen = pages.slice(0, limit);
    const server = await serve(folder);
    const origin = `http://127.0.0.1:${server.address().port}/`;
    const measured = new Map();
    console.log(`AI pages: ${chosen.length} of ${pages.length}`);
    // A page generated again under the same name must not keep the old page's numbers.
    const hashes = new Map(pages.map((page) => [page.file, existsSync(join(folder, page.file)) ? digest(join(folder, page.file)) : null]));
    try {
        for (const [number, page] of chosen.entries()) {
            const entry = { file: page.file, model: page.model, framework: page.framework, brief: page.brief, hash: hashes.get(page.file), date: today() };
            entry.source = checkSource(join(folder, page.file));
            entry.browser = await browse(`${origin}${encodeURIComponent(page.file)}`, seconds, origin);
            measured.set(page.file, entry);
            console.log(`  [${number + 1}/${chosen.length}] ${page.file}: source ${said(entry.source)}; browser ${said(entry.browser)}`);
        }
    } finally {
        server.closeAllConnections();
        server.close();
    }

    return pages.map((page) => measured.get(page.file) ?? previous.find((item) => item.file === page.file && item.hash === hashes.get(page.file))).filter(Boolean);
}

async function measureSites(file, limit, seconds, previous) {
    const sites = JSON.parse(readFileSync(file, 'utf8'));
    for (const site of sites) {
        if (!site.name || !/^https?:\/\//.test(site.url ?? '') || !site.category) throw new Error(`${basename(file)}: every site needs a name, an http(s) url and a category: ${JSON.stringify(site)}`);
    }
    const chosen = sites.slice(0, limit);
    const measured = new Map();
    console.log(`Human sites: ${chosen.length} of ${sites.length}`);
    for (const [number, site] of chosen.entries()) {
        const { name, url, category, framework, research } = site;
        const entry = { name, url, category, ...(framework ? { framework } : {}), ...(research ? { research } : {}), date: today() };
        const wall = await signInPage(site.url);
        entry.browser = wall ? { failed: 'sign-in', message: `Sends visitors to a sign-in page: ${wall}`, seconds: 0 } : await browse(site.url, seconds);
        measured.set(site.url, entry);
        console.log(`  [${number + 1}/${chosen.length}] ${site.name}: ${said(entry.browser)}`);
    }

    return sites.map((site) => measured.get(site.url) ?? previous.find((item) => item.url === site.url)).filter(Boolean);
}

const cell = (text) => String(text).replace(/\s+/g, ' ').replace(/\|/g, '\\|');
const share = (n, total) => (total > 0 ? `${Math.round((100 * n) / total)}%` : '–');
const percent = (ratio) => (ratio === null ? '–' : `${Math.round(ratio * 100)}%`);

function median(values) {
    if (values.length === 0) return '–';
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;

    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** The results section of BENCHMARK.md. */
function report(results, catalogue) {
    const { pages = [], sites = [] } = results;
    if (pages.length + sites.length === 0) return '_No results yet._';
    const rules = new Map(catalogue.map((rule) => [rule.id, rule]));
    // legible-contrast sits in the visual area but is a contrast check; the scan report lists it with accessibility too.
    const kindOf = (id) => (rules.get(id)?.area === 'accessibility' || id === 'legible-contrast' ? 'access' : 'look');
    const ran = (entries, checker) => entries.filter((entry) => entry[checker]?.rules);
    const count = (found, kind) => Object.entries(found).reduce((total, [id, n]) => total + (kindOf(id) === kind ? n : 0), 0);
    const lines = [];

    const dates = [...new Set([...pages, ...sites].map((entry) => entry.date))].sort();
    const distinct = (key) => new Set(pages.map((page) => page[key])).size;
    lines.push(
        `Measured ${dates.length > 1 ? `between ${dates[0]} and ${dates.at(-1)}` : `on ${dates[0]}`} with ai-design-check ${results.tool}, Node ${results.node} and ${results.chrome ?? 'Chrome'}, at ${WIDTHS.join(' and ')} px. `
        + `${plural(pages.length, 'AI page')} from ${plural(distinct('model'), 'model')}, ${plural(distinct('brief'), 'brief')} and ${plural(distinct('framework'), 'framework')}; ${plural(sites.length, 'human site')}. `
        + 'Counts for every page and site are in [bench/results.json](bench/results.json).',
    );

    lines.push('', '### At a glance', '', '| Group | Checker | Measured | With a generated-look finding | Generated-look findings, median | With an accessibility finding | Accessibility findings, median |', '|---|---|---:|---:|---:|---:|---:|');
    const glance = (label, entries, checker) => {
        const done = ran(entries, checker);
        const look = done.map((entry) => count(entry[checker].rules, 'look'));
        const access = done.map((entry) => count(entry[checker].rules, 'access'));
        lines.push(`| ${label} | ${checker} | ${done.length} of ${entries.length} | ${share(look.filter(Boolean).length, done.length)} | ${median(look)} | ${share(access.filter(Boolean).length, done.length)} | ${median(access)} |`);
    };
    glance('AI pages', pages, 'browser');
    glance('Human sites', sites, 'browser');
    if (sites.some((site) => site.research)) {
        glance('Human sites, research set', sites.filter((site) => site.research), 'browser');
        glance('Human sites, new', sites.filter((site) => !site.research), 'browser');
    }
    glance('AI pages', pages, 'source');
    lines.push('', 'The browser rows compare like with like: one checker reads both groups. Human sites have no source to read, so the source row has no human counterpart.');

    const firedIn = (entries, checker) => new Set(entries.flatMap((entry) => Object.keys(entry[checker]?.rules ?? {})));
    const inBrowser = new Set([...firedIn(pages, 'browser'), ...firedIn(sites, 'browser')]);
    const inSource = firedIn(pages, 'source');
    const ratio = (entries, checker, id) => {
        const done = ran(entries, checker);

        return done.length > 0 ? done.filter((entry) => entry[checker].rules[id]).length / done.length : null;
    };
    for (const [kind, title] of [['look', 'Generated-look rules'], ['access', 'Accessibility rules']]) {
        const rows = [...new Set([...inBrowser, ...inSource])].filter((id) => kindOf(id) === kind).map((id) => {
            const rule = rules.get(id);
            const browserReads = Boolean(rule?.check?.scan) || inBrowser.has(id);
            const sourceReads = Boolean(rule?.check && rule.check.type !== 'render') || inSource.has(id);

            return { id, title: rule?.title.en ?? '', ai: browserReads ? ratio(pages, 'browser', id) : null, human: browserReads ? ratio(sites, 'browser', id) : null, source: sourceReads ? ratio(pages, 'source', id) : null };
        });
        rows.sort((a, b) => Math.max(b.ai ?? 0, b.source ?? 0) - Math.max(a.ai ?? 0, a.source ?? 0) || (b.human ?? 0) - (a.human ?? 0) || a.id.localeCompare(b.id));
        lines.push('', `### ${title}`, '', 'The share of pages each rule fired on. A dash means that checker does not read the rule; rules that fired nowhere are left out.', '', '| Rule | AI pages, browser | Human sites, browser | AI pages, source |', '|---|---:|---:|---:|');
        for (const row of rows) lines.push(`| \`${row.id}\` ${cell(row.title)} | ${percent(row.ai)} | ${percent(row.human)} | ${percent(row.source)} |`);
        if (rows.length === 0) lines.push('| None fired | | | |');
    }

    // Which generated-look rules most of these pages share, by either checker.
    const common = (entries) => {
        const done = entries.filter((entry) => entry.browser?.rules || entry.source?.rules);
        const seen = new Map();
        for (const entry of done) {
            for (const id of new Set([...Object.keys(entry.browser?.rules ?? {}), ...Object.keys(entry.source?.rules ?? {})])) {
                if (kindOf(id) === 'look') seen.set(id, (seen.get(id) ?? 0) + 1);
            }
        }

        return [...seen].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).slice(0, 3).map(([id, n]) => `\`${id}\` ${share(n, done.length)}`).join(', ') || '–';
    };
    lines.push('', 'In the tables below, as above, the measured count, the share and the first two medians come from the browser checker. The source column reads the AI pages\' HTML; the most common rules count a rule found by either checker.');
    const split = (title, label, groups, withSource) => {
        if (groups.length === 0) return;
        lines.push('', `### ${title}`, '', `| ${label} | Measured | With a generated-look finding | Generated-look findings, median | Accessibility findings, median |${withSource ? ' Source: generated-look findings, median |' : ''} Most common generated-look rules |`, `|---|---:|---:|---:|---:|${withSource ? '---:|' : ''}---|`);
        for (const [name, entries] of groups) {
            const done = ran(entries, 'browser');
            const look = done.map((entry) => count(entry.browser.rules, 'look'));
            const access = done.map((entry) => count(entry.browser.rules, 'access'));
            const source = ran(entries, 'source').map((entry) => count(entry.source.rules, 'look'));
            lines.push(`| ${name} | ${done.length} of ${entries.length} | ${share(look.filter(Boolean).length, done.length)} | ${median(look)} | ${median(access)} |${withSource ? ` ${median(source)} |` : ''} ${common(entries)} |`);
        }
    };
    const present = (key, entries) => [...new Set(entries.map((entry) => entry[key]).filter(Boolean))];
    const frameworks = [...new Set([...Object.keys(FRAMEWORKS), ...present('framework', [...pages, ...sites])])];
    split('By framework', 'Framework', frameworks.flatMap((framework) => [
        [`${FRAMEWORKS[framework] ?? framework}, AI pages`, pages.filter((page) => page.framework === framework)],
        [`${FRAMEWORKS[framework] ?? framework}, human sites`, sites.filter((site) => site.framework === framework)],
    ]).filter(([, entries]) => entries.length > 0), true);
    split('AI pages by model', 'Model', present('model', pages).map((model) => [model[0].toUpperCase() + model.slice(1), pages.filter((page) => page.model === model)]), true);
    split('Human sites by category', 'Category', present('category', sites).map((category) => [CATEGORIES[category] ?? category, sites.filter((site) => site.category === category)]), false);

    const missed = [
        ...pages.flatMap((page) => ['source', 'browser'].filter((checker) => page[checker]?.failed).map((checker) => [page.file, checker, page[checker]])),
        ...sites.filter((site) => site.browser?.failed).map((site) => [site.name, 'browser', site.browser]),
    ];
    lines.push('', '### Not measured', '');
    if (missed.length === 0) lines.push('Every page and site was measured.');
    else {
        lines.push('Left out of every number above.', '', '| Page or site | Checker | Why | Detail |', '|---|---|---|---|');
        for (const [name, checker, { failed, message }] of missed) {
            const detail = message.replace(/https?:\/\/\S+\s*/g, '').split('. ')[0].replace(/[\s:;,]+$/, '').slice(0, 140);
            lines.push(`| ${cell(name)} | ${checker} | ${failed} | ${cell(detail)} |`);
        }
    }

    return lines.join('\n');
}

function writeReport(results, catalogue) {
    const text = readFileSync(BENCHMARK, 'utf8');
    const start = text.indexOf(MARKS[0]);
    const end = text.indexOf(MARKS[1]);
    if (start < 0 || end < start) throw new Error(`BENCHMARK.md needs a ${MARKS[0]} … ${MARKS[1]} section for the results.`);
    writeFileSync(BENCHMARK, `${text.slice(0, start + MARKS[0].length)}\n${report(results, catalogue)}\n${text.slice(end)}`);
}

async function main() {
    const { values } = parseArgs({ options: { only: { type: 'string' }, limit: { type: 'string' }, 'time-limit': { type: 'string' }, pages: { type: 'string' }, sites: { type: 'string' }, report: { type: 'boolean' } } });
    const catalogue = loadRules().rules;
    if (values.report) {
        if (!existsSync(RESULTS)) throw new Error('No bench/results.json yet: run node bench/run.js first.');
        writeReport(JSON.parse(readFileSync(RESULTS, 'utf8')), catalogue);
        console.log('Rewrote the results in BENCHMARK.md from bench/results.json.');
        return;
    }
    if (values.only !== undefined && !['ai', 'human'].includes(values.only)) throw new Error(`--only takes ai or human, not ${values.only}.`);
    const limit = values.limit === undefined ? Infinity : Number(values.limit);
    if (limit !== Infinity && !(Number.isInteger(limit) && limit > 0)) throw new Error(`--limit takes a whole number above 0, not ${values.limit}.`);
    const seconds = values['time-limit'] === undefined ? null : Number(values['time-limit']);
    if (seconds !== null && !(seconds > 0)) throw new Error(`--time-limit takes a number of seconds above 0, not ${values['time-limit']}.`);
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH.');

    const tool = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8')).version;
    const rulesHash = createHash('sha256').update(readFileSync(join(HERE, '..', 'rules.json'))).digest('hex').slice(0, 12);
    const previous = earlier(tool, rulesHash);
    const results = { date: today(), tool, rulesHash, node: process.version, chrome: chromeVersion(chrome), pages: previous.pages, sites: previous.sites };
    if (values.only !== 'human') results.pages = await measurePages(resolve(values.pages ?? join(HERE, 'pages')), limit, seconds ?? LIMITS.page, previous.pages);
    if (values.only !== 'ai') results.sites = await measureSites(resolve(values.sites ?? join(HERE, 'sites.json')), limit, seconds ?? LIMITS.site, previous.sites);

    writeFileSync(RESULTS, `${JSON.stringify(results, null, 2)}\n`);
    writeReport(results, catalogue);
    console.log('Wrote bench/results.json and the results in BENCHMARK.md.');
}

try {
    await main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
