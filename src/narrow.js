import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRules } from './check.js';
import { assertLanded, assertPage, assertScope, findChrome, launch, signIn } from './story.js';

/**
 * Narrow-screen check: renders the page at a phone width and at a desktop width in Chrome and reports what only a
 * rendered page shows: the page scrolling sideways, text cut off, text made smaller to fit, and content that is
 * there on desktop but gone on the phone. Run it with the longest locale (German, Finnish) to find the breaks early.
 */

// options: { scope, ignore } from --scope and --ignore, written into the source as JSON.
const MEASURE = (options) => `((options) => {
    const scopeList = (options.scope ?? []).join(', ');
    const ignoreList = (options.ignore ?? []).join(', ');
    const inside = (element) => (!scopeList || Boolean(element.closest(scopeList))) && !(ignoreList && element.closest(ignoreList));
    const path = (element) => {
        const parts = [];
        for (let node = element; node && node !== document.body; node = node.parentElement) parts.unshift([...node.parentElement.children].indexOf(node));
        return parts.join('.');
    };
    const ownText = (element) => [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(' ').replace(/\\s+/g, ' ').trim();
    const name = (element, text) => element.tagName.toLowerCase() + (text ? ' "' + (text.length > 48 ? text.slice(0, 47) + '…' : text) + '"' : '');
    // Layout width, not window.innerWidth: a mobile browser zooms out to fit an overflowing page.
    const width = document.documentElement.clientWidth;
    const elements = [];
    for (const element of document.body.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'svg', 'path'].includes(element.tagName)) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const text = ownText(element);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        // Inside a container that scrolls sideways on purpose (a wide table), overflow is the design.
        let scroller = false;
        for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(node).overflowX)) { scroller = true; break; }
        }
        elements.push({
            key: path(element), label: name(element, text), text: text.length > 0, visible, scroller, inScope: inside(element),
            // Under aria-hidden="true": decoration a screen reader skips, not text anyone reads.
            decor: Boolean(element.closest('[aria-hidden="true"]')),
            right: rect.right, font: parseFloat(style.fontSize),
            clipped: text.length > 0 && visible && element.scrollWidth > element.clientWidth + 1 && /(hidden|clip)/.test(style.overflowX + style.overflow) && !element.title,
            ellipsis: text.length > 0 && visible && style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1 && !element.title,
        });
    }
    return { width, scrollWidth: document.documentElement.scrollWidth, scoped: Boolean(scopeList), elements };
})(${JSON.stringify(options)})`;

/**
 * Worst-case data, written over the rendered page: names become a long Turkish name, numbers a large one, other text grows
 * by 40 % with one unbroken word. It tests the layout only; a page's own logic does not run again, so "1 members" needs a
 * look at the screen with real data (worst-case-data, no-naive-plural).
 */
const STRESS = `(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'CODE', 'PRE'].includes(node.parentElement.tagName)) continue;
        const text = node.textContent.trim();
        if (!/[\\p{L}\\d]/u.test(text)) continue;
        if (/^\\p{Lu}\\p{L}+(?: \\p{Lu}\\p{L}+){1,2}$/u.test(text)) { node.textContent = 'Muhammed Abdülkerim Çağlayanoğlu'; continue; }
        const numbers = text.replace(/\\d[\\d.,]*/g, '1.234.567,89');
        node.textContent = /\\p{L}/u.test(text) ? numbers + ' ' + 'Afyonkarahisarlılaştıramadıklarımız'.slice(0, Math.ceil(text.length * 0.4)) : numbers;
    }
})()`;

const finding = (rule, severity, path, value, message) => ({ rule, area: loadRules().rules.find((item) => item.id === rule).area, severity, path, line: 0, value, message });

/**
 * @param {string} input file or URL
 * @param {{width?: number, desktop?: number, stress?: boolean, allowStatus?: number[], allowRedirect?: boolean, auth?: object, onLanded?: (url: string) => void, scope?: string[], ignore?: string[]}} options
 *   auth: cookies and headers for a page behind a sign-in (see signIn); onLanded: told the address measured after a redirect;
 *   scope, ignore: CSS selectors; only elements inside a scope match and outside every ignore match are reported
 */
export async function narrow(input, { width = 320, desktop = 1280, stress = false, allowStatus = [], allowRedirect = false, auth = {}, onLanded, scope = [], ignore = [] } = {}) {
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH');
    const url = /^https?:\/\//.test(input) ? input : pathToFileURL(resolve(input)).href;
    if (!/^https?:\/\//.test(input) && !existsSync(resolve(input))) throw new Error(`Not found: ${input}`);

    const browser = await launch(chrome);
    try {
        await signIn(browser, url, auth);
        assertPage(await browser.open(url, { width: desktop, height: 900 }), url, allowStatus);
        const landed = await assertLanded(browser, url, { allowRedirect });
        if (landed) onLanded?.(landed);
        await assertScope(browser, url, { scope, ignore });
        const measure = MEASURE({ scope, ignore });
        const wide = await browser.evaluate(measure);
        await browser.open(url, { width, height: 800, mobile: true });
        const phone = await browser.evaluate(measure);
        const before = new Map(wide.elements.map((element) => [element.key, element]));
        const findings = [];

        // The page scrolls sideways as a whole; with --scope that counts when something in the scoped area sticks out.
        const spills = (page) => page.elements.some((element) => element.inScope && element.visible && !element.scroller && element.right > page.width + 1);
        if (phone.scrollWidth > phone.width + 1 && (!phone.scoped || spills(phone))) {
            const culprits = phone.elements.filter((element) => element.inScope && element.visible && !element.scroller && element.right > phone.width + 1 && element.text).slice(0, 5);
            findings.push(finding('no-horizontal-overflow', 'error', input, `${phone.scrollWidth}px`, `Page is ${phone.scrollWidth} px wide at ${width} px; it scrolls sideways${culprits.length ? `: ${culprits.map((element) => element.label).join(', ')}` : ''}`));
        }
        for (const element of phone.elements) {
            if (!element.inScope || element.decor) continue;
            if (element.clipped || element.ellipsis) findings.push(finding('text-not-clipped', 'warn', input, element.label, `Text cut off at ${width} px: ${element.label}`));
            const was = before.get(element.key);
            if (element.text && element.visible && element.font < 12) findings.push(finding('no-shrunk-text', 'error', input, element.label, `Text at ${element.font} px on a ${width} px screen: ${element.label}`));
            else if (element.text && element.visible && was?.visible && was.font <= 18 && element.font < was.font - 0.5) {
                findings.push(finding('no-shrunk-text', 'warn', input, element.label, `Text shrinks from ${was.font} px to ${element.font} px at ${width} px: ${element.label}`));
            }
            if (element.text && !element.visible && was?.visible && was.text) findings.push(finding('no-hidden-content-narrow', 'info', input, element.label, `Shown on desktop, hidden at ${width} px: ${element.label}`));
        }

        if (stress) {
            // Only what the longer data breaks; what was already broken is reported above.
            const overflowing = phone.scrollWidth > phone.width + 1 && (!phone.scoped || spills(phone));
            const cut = new Set(phone.elements.filter((element) => element.clipped || element.ellipsis).map((element) => element.key));
            await browser.evaluate(STRESS);
            const worst = await browser.evaluate(measure);
            if (!overflowing && worst.scrollWidth > worst.width + 1 && (!worst.scoped || spills(worst))) {
                const culprits = worst.elements.filter((element) => element.inScope && element.visible && !element.scroller && element.right > worst.width + 1 && element.text).slice(0, 3);
                findings.push(finding('no-horizontal-overflow', 'warn', input, `${worst.scrollWidth}px`, `With long data the page is ${worst.scrollWidth} px wide at ${width} px${culprits.length ? `: ${culprits.map((element) => element.label).join(', ')}` : ''}`));
            }
            for (const element of worst.elements) {
                if (!element.inScope || element.decor) continue;
                if ((element.clipped || element.ellipsis) && !cut.has(element.key)) findings.push(finding('text-not-clipped', 'warn', input, element.label, `With long data text is cut off at ${width} px: ${element.label}`));
            }
        }

        return findings;
    } finally {
        await browser.close();
    }
}
