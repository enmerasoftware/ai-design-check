import { loadRules } from './check.js';
import { scanPage } from './scan-page.js';
import { assertLanded, assertPage, assertScope, findChrome, launch, signIn } from './story.js';

/**
 * Checks a running page: what only the browser knows (real contrast, real sizes, what covers what, whether the scripts
 * ran). Dependency-free, like the rest: it drives the installed Chrome. No model and no API key.
 */

/**
 * One page at one width. browser: from launch(). onLanded: told the address measured when a redirect led elsewhere;
 * a sign-in page in its place stops the scan unless allowRedirect. scope, ignore: CSS selectors; only what is inside a
 * scope match and outside every ignore match is checked (a scope that matches nothing stops the scan, exit 2).
 */
export async function scanWith(browser, url, { width = 1440, config = {}, quick = false, allowStatus = [], requireContent = false, allowRedirect = false, onLanded, scope = [], ignore = [] } = {}) {
    const mobile = width < 768;
    const errors = [];
    await browser.send('Runtime.enable');
    const stop = browser.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text));
    try {
        assertPage(await browser.open(url, { width, height: mobile ? 844 : 900, mobile, settle: quick ? 0 : 300, steady: !quick }), url, allowStatus);
        const landed = await assertLanded(browser, url, { allowRedirect });
        if (landed) onLanded?.(landed);
        await assertScope(browser, url, { scope, ignore });
        // Lazy images and on-scroll reveals get their chance before anything counts as hidden.
        await browser.evaluate('(async () => { const root = () => document.documentElement; if (root()) root().style.scrollBehavior = "auto"; for (let y = 0; y < Math.min(root()?.scrollHeight ?? 0, 40000); y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); await document.fonts.ready; await new Promise((r) => setTimeout(r, ' + (quick ? 0 : 200) + ')); })()');
        // A page with nothing on it has no findings, and that is not good news (an empty #root whose bundle failed).
        if (requireContent && await browser.evaluate('!document.body || (!document.body.innerText.trim() && !document.querySelector("img,svg,canvas,video,iframe"))')) throw new Error(`${url} rendered an empty page${errors[0] ? `: ${errors[0]}` : ''}`);
        const hits = await browser.evaluate(`(${scanPage.toString()})(${JSON.stringify(config.designSystem ?? null)}, ${JSON.stringify({ scope, ignore })})`);
        await new Promise((done) => setTimeout(done, 50));
        for (const error of errors) hits.push({ rule: 'no-script-errors', value: error, message: `Script error on load: ${error}` });
        const catalogue = loadRules().rules;

        return hits.flatMap((hit) => {
            const rule = catalogue.find((item) => item.id === hit.rule);
            const severity = config.rules?.[rule.id] ?? rule.severity;

            return severity === 'off' ? [] : [{ rule: rule.id, area: rule.area, severity, path: url, line: 0, value: hit.value, message: hit.message ?? `${rule.title.en}: ${hit.value}`, width }];
        });
    } finally {
        stop();
    }
}

/**
 * Pages at desktop and phone width, all in one browser. Each page's findings keep its address as their path; the same
 * finding at both widths is reported once. A page that cannot be checked carries the reason in `error`, and the rest
 * are still checked.
 * @param {string[]} urls
 * @param {{widths?: number[], config?: object, allowStatus?: number[], allowRedirect?: boolean, auth?: {cookies?: {name: string, value: string}[], headers?: Record<string, string>}, scope?: string[], ignore?: string[]}} options
 * @returns {Promise<{url: string, measured?: string, findings: object[], error?: Error}[]>}
 */
export async function scanPages(urls, { widths = [1440, 390], config = {}, allowStatus = [], allowRedirect = false, auth = {}, scope = [], ignore = [] } = {}) {
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH');
    const browser = await launch(chrome);
    try {
        const pages = [];
        for (const url of urls) {
            const page = { url, findings: [] };
            pages.push(page);
            try {
                await signIn(browser, url, auth);
                const seen = new Set();
                for (const width of widths) {
                    for (const item of await scanWith(browser, url, { width, config, allowStatus, allowRedirect, scope, ignore, requireContent: true, onLanded: (landed) => { page.measured = landed; } })) {
                        const key = `${item.rule}\u0000${item.value}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        page.findings.push(item);
                    }
                }
            } catch (error) {
                // Half a page's findings would read as a page checked.
                page.findings = [];
                page.error = error;
            }
        }

        return pages;
    } finally {
        await browser.close();
    }
}

/** One page at desktop and phone width; throws when it cannot be checked. */
export async function scan(url, options = {}) {
    const [page] = await scanPages([url], options);
    if (page.error) throw page.error;

    return page.findings;
}
