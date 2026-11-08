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
    // Names a box that sticks out: tag, up to 3 classes and a short text, so a size-8 circle with no text is found too.
    const culpritLabel = (element, text) => {
        const said = text || element.textContent.replace(/\\s+/g, ' ').trim();
        return element.tagName.toLowerCase() + [...element.classList].slice(0, 3).map((item) => '.' + item).join('') + (said ? ' "' + (said.length > 32 ? said.slice(0, 31) + '…' : said) + '"' : '');
    };
    // Screen-reader-only text (sr-only, visually-hidden): a 1 px clipping box, clip: rect(0 0 0 0) or clip-path: inset(50%).
    // It is meant to be cut; it is not a clipped label.
    const concealed = (element) => {
        for (let node = element; node && node !== document.body; node = node.parentElement) {
            const look = getComputedStyle(node);
            const box = node.getBoundingClientRect();
            const clip = look.clip.match(/-?[\\d.]+(?=px)/g)?.map(Number);
            if (clip?.length === 4 && (clip[1] - clip[3] <= 1 || clip[2] - clip[0] <= 1)) return true;
            if (/^inset\\(50%/.test(look.clipPath)) return true;
            if ((box.width <= 1 || box.height <= 1) && /(hidden|clip)/.test(look.overflowX + look.overflowY)) return true;
        }
        return false;
    };
    // A top navigation link that moves into a hamburger menu at phone width is still there: the same href and the same
    // words in another link, shown or not. Other text counts as moved when the same words sit inside a menu (a nav, a
    // dialog, a <details>, aria-modal, or a panel a button names with aria-controls).
    const words = (element) => element.textContent.replace(/\\s+/g, ' ').trim();
    const links = new Map();
    for (const link of document.querySelectorAll('a[href]')) {
        const key = link.href + '\\n' + words(link);
        links.set(key, (links.get(key) ?? 0) + 1);
    }
    const panels = [...document.querySelectorAll('[aria-controls]')].flatMap((button) => button.getAttribute('aria-controls').split(/\\s+/)).map((id) => id && document.getElementById(id)).filter(Boolean);
    const menu = (element) => Boolean(element.closest('nav, dialog, details, [role="dialog"], [role="menu"], [aria-modal="true"]')) || panels.some((panel) => panel.contains(element));
    const menuTexts = new Map();
    for (const element of document.body.querySelectorAll('*')) {
        const text = ownText(element);
        if (text && menu(element)) menuTexts.set(text, [...(menuTexts.get(text) ?? []), element]);
    }
    const twin = (element, text) => {
        const link = element.closest('a[href]');
        if (link) return (links.get(link.href + '\\n' + words(link)) ?? 0) > 1;
        return (menuTexts.get(text) ?? []).some((other) => other !== element);
    };
    // Layout width, not window.innerWidth: a mobile browser zooms out to fit an overflowing page.
    const width = document.documentElement.clientWidth;
    const elements = [];
    for (const element of document.body.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'svg', 'path'].includes(element.tagName)) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const text = ownText(element);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        // Inside a container that scrolls sideways on purpose (a wide table) or clips (a marquee strip), it does not
        // widen the page.
        let scroller = false;
        for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
            if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX)) { scroller = true; break; }
        }
        let clipped = text.length > 0 && visible && element.scrollWidth > element.clientWidth + 1 && /(hidden|clip)/.test(style.overflowX + style.overflow) && !element.title;
        let ellipsis = text.length > 0 && visible && style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1 && !element.title;
        if ((clipped || ellipsis) && concealed(element)) clipped = ellipsis = false;
        const right = rect.right;
        elements.push({
            key: path(element), label: name(element, text), text: text.length > 0, visible, scroller, inScope: inside(element),
            // Under aria-hidden="true": decoration a screen reader skips, not text anyone reads.
            decor: Boolean(element.closest('[aria-hidden="true"]')),
            right, font: parseFloat(style.fontSize), clipped, ellipsis,
            culprit: visible && !scroller && right > width + 1 && !concealed(element) ? culpritLabel(element, text) : '',
            twin: text.length > 0 && !visible && twin(element, text),
        });
    }
    // Whether the visitor can actually scroll sideways: overflow-x hidden or clip on html (or on body, which passes
    // it to the viewport when html leaves it visible) keeps scrollWidth wide while the page stays put; what sticks
    // out is cut, which text-not-clipped reports. Read from the styles: a phone zooms out instead of scrolling.
    const clips = (element) => /(hidden|clip)/.test(getComputedStyle(element).overflowX);
    const rootStyle = getComputedStyle(document.documentElement).overflowX;
    const sideways = !(clips(document.documentElement) || (rootStyle === 'visible' && clips(document.body)));
    return { width, scrollWidth: document.documentElement.scrollWidth, sideways, scoped: Boolean(scopeList), elements };
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
        // The deepest boxes past the edge are the ones to fix (a size-8 circle with no text, not the row around it).
        const named = (page) => {
            const wide = page.elements.filter((element) => element.inScope && element.culprit);
            const depth = (element) => element.key.split('.').length;
            const leaves = wide.filter((element) => !wide.some((other) => other.key.startsWith(element.key + '.')));
            const culprits = leaves.sort((a, b) => depth(b) - depth(a)).slice(0, 3);
            return culprits.length ? `: ${culprits.map((element) => element.culprit).join(', ')}` : '';
        };
        if (phone.scrollWidth > phone.width + 1 && (!phone.scoped || spills(phone))) {
            const where = named(phone);
            if (phone.sideways) findings.push(finding('no-horizontal-overflow', 'error', input, `${phone.scrollWidth}px`, `Page is ${phone.scrollWidth} px wide at ${width} px; it scrolls sideways${where}`));
            else findings.push(finding('no-horizontal-overflow', 'info', input, `${phone.scrollWidth}px`, `Content is ${phone.scrollWidth} px wide at ${width} px but the page does not scroll sideways (overflow hidden); what sticks out is cut${where}`));
        }
        for (const element of phone.elements) {
            if (!element.inScope || element.decor) continue;
            if (element.clipped || element.ellipsis) findings.push(finding('text-not-clipped', 'warn', input, element.label, `Text cut off at ${width} px: ${element.label}`));
            const was = before.get(element.key);
            if (element.text && element.visible && element.font < 12) findings.push(finding('no-shrunk-text', 'error', input, element.label, `Text at ${element.font} px on a ${width} px screen: ${element.label}`));
            else if (element.text && element.visible && was?.visible && was.font <= 18 && element.font < was.font - 0.5) {
                findings.push(finding('no-shrunk-text', 'warn', input, element.label, `Text shrinks from ${was.font} px to ${element.font} px at ${width} px: ${element.label}`));
            }
            if (element.text && !element.visible && !element.twin && was?.visible && was.text) findings.push(finding('no-hidden-content-narrow', 'info', input, element.label, `Shown on desktop, hidden at ${width} px: ${element.label}`));
        }

        if (stress) {
            // Only what the longer data breaks; what was already broken is reported above.
            const overflowing = phone.scrollWidth > phone.width + 1 && (!phone.scoped || spills(phone));
            const cut = new Set(phone.elements.filter((element) => element.clipped || element.ellipsis).map((element) => element.key));
            await browser.evaluate(STRESS);
            const worst = await browser.evaluate(measure);
            if (!overflowing && worst.scrollWidth > worst.width + 1 && (!worst.scoped || spills(worst))) {
                const where = named(worst);
                if (worst.sideways) findings.push(finding('no-horizontal-overflow', 'warn', input, `${worst.scrollWidth}px`, `With long data the page is ${worst.scrollWidth} px wide at ${width} px${where}`));
                else findings.push(finding('no-horizontal-overflow', 'info', input, `${worst.scrollWidth}px`, `With long data the content is ${worst.scrollWidth} px wide at ${width} px but the page does not scroll sideways; what sticks out is cut${where}`));
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
