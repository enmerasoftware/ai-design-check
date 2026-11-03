import { loadRules } from './check.js';
import { scanPage } from './scan-page.js';
import { findChrome, launch } from './story.js';

/**
 * Checks a running page: what only the browser knows (real contrast, real sizes, what covers what, whether the scripts
 * ran). Dependency-free, like the rest: it drives the installed Chrome. No model and no API key.
 */

/** One page at one width. browser: from launch(). */
export async function scanWith(browser, url, { width = 1440, config = {} } = {}) {
    const mobile = width < 768;
    const errors = [];
    await browser.send('Runtime.enable');
    const stop = browser.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text));
    try {
        await browser.open(url, { width, height: mobile ? 844 : 900, mobile, settle: 300 });
        // Lazy images and on-scroll reveals get their chance before anything counts as hidden.
        await browser.evaluate('(async () => { document.documentElement.style.scrollBehavior = "auto"; for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); await document.fonts.ready; await new Promise((r) => setTimeout(r, 200)); })()');
        const hits = await browser.evaluate(`(${scanPage.toString()})(${JSON.stringify(config.designSystem ?? null)})`);
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

/** A page at desktop and phone width; the same finding at both widths is reported once. */
export async function scan(url, { widths = [1440, 390], config = {} } = {}) {
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH');
    const browser = await launch(chrome);
    try {
        const seen = new Set();
        const findings = [];
        for (const width of widths) {
            for (const item of await scanWith(browser, url, { width, config })) {
                const key = `${item.rule}\u0000${item.value}`;
                if (seen.has(key)) continue;
                seen.add(key);
                findings.push(item);
            }
        }

        return findings;
    } finally {
        await browser.close();
    }
}
