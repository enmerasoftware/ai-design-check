import { writeFileSync } from 'node:fs';
import { assertLanded, assertPage, assertScope, findChrome, launch, signIn } from '../story.js';

/**
 * Renders a page in Chrome and measures what a designer looks at, from the computed styles of what is on screen:
 *
 * - system: the fonts, sizes, colours, radii and spacing the page really uses, weighted by how much of it each covers;
 * - metrics: type sizes in use, headline-to-body ratio, distinct left edges, line length, spacing on the 4 px grid,
 *   accents, contrast failures, small tap targets, sideways scrolling, empty stretches, and the known generated-UI
 *   tells (eyebrow labels, 01/02/03 numbering, gradient text, a centred hero with the picture underneath);
 * - inventory: every heading, link, image, form field and word, so a redesign can be checked for lost content;
 * - sections: the big blocks down the page with what they hold.
 *
 * The in-page code below is plain browser JavaScript; it is sent to Chrome as source.
 *
 * With --scope (and --ignore) the system, metrics, inventory and sections come from the scoped area only, so the study
 * is about that part (a CMS module) and not the app's shell around it. What belongs to the page as a whole stays
 * page-wide: the title, language, page height and the page's own background when there is no scope; sideways
 * scrolling counts when the scoped area is what runs past the edge.
 */

/* eslint-disable no-undef -- runs in the page */
function inPage(options = {}) {
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const scopeList = (options?.scope ?? []).join(', ');
    const ignoreList = (options?.ignore ?? []).join(', ');
    const inside = (el) => (!scopeList || Boolean(el.closest(scopeList))) && !(ignoreList && el.closest(ignoreList));
    const roots = scopeList ? [...document.querySelectorAll(scopeList)].filter((el, i, list) => !list.some((other) => other !== el && other.contains(el))) : [document.body];
    const within = (selector) => [...document.querySelectorAll(selector)].filter(inside);
    // Text under aria-hidden="true" is decoration a screen reader skips: not the type the page reads in.
    const decor = (el) => Boolean(el.closest('[aria-hidden="true"]'));
    // Any CSS colour (rgb, oklch, color-mix …) to sRGB, by painting one pixel.
    const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const cache = {};
    const parse = (value) => {
        if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null;
        if (cache[value] !== undefined) return cache[value];
        const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(value);
        if (m) return (cache[value] = { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] });
        pixel.clearRect(0, 0, 1, 1);
        pixel.fillStyle = '#000';
        pixel.fillStyle = value;
        pixel.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
        return (cache[value] = a === 0 ? null : { r, g, b, a: a / 255 });
    };
    const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
    const lum = (c) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const chroma = (c) => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
    const add = (map, key, weight = 1) => { if (key !== null && key !== undefined && key !== '') map[key] = (map[key] || 0) + weight; };
    const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const textOf = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
    const shown = (style, rect) => style.display !== 'none' && style.visibility !== 'hidden' && +style.opacity > 0.05 && rect.width > 0 && rect.height > 0;
    // The colour behind a text box, from what is painted under its centre. A picture, video, canvas or gradient under
    // the text makes it unknown (null): that contrast needs eyes, not arithmetic.
    const background = (el) => {
        let rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > vh) {
            scrollTo(0, Math.max(0, rect.top + scrollY - vh / 3));
            rect = el.getBoundingClientRect();
        }
        const x = Math.min(Math.max(rect.left + Math.min(rect.width, 40) / 2, 0), vw - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), vh - 1);
        const stack = document.elementsFromPoint(x, y);
        // Only what is painted behind the text counts; a sticky bar passing over it does not.
        const at = stack.findIndex((node) => node === el || el.contains(node));
        for (const node of at >= 0 ? stack.slice(at) : stack) {
            if (['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'svg'].includes(node.tagName)) return null;
            // An overlay drawn by ::before/::after sits over the box's own background.
            for (const pseudo of ['::after', '::before']) {
                const layer = getComputedStyle(node, pseudo);
                if (layer.content === 'none' || !/absolute|fixed/.test(layer.position)) continue;
                if (layer.backgroundImage !== 'none') return null;
                const c = parse(layer.backgroundColor);
                if (c && c.a >= 0.5) return c;
            }
            const style = getComputedStyle(node);
            if (style.backgroundImage !== 'none') return null;
            const c = parse(style.backgroundColor);
            if (c && c.a >= 0.5) return c;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
    };
    const fonts = {}, sizes = {}, weights = {}, textColors = {}, fills = {}, radii = {}, spaces = {}, buttonFills = {}, buttonInks = {};
    const blocks = [], paragraphs = [], contrast = [], smallTargets = [], content = [];
    let headingFont = null, h1 = null, firstH2 = null, gradientText = 0, restingShadows = 0;
    const eyebrows = [], numbering = [];

    for (const el of within('body *')) {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'svg', 'path', 'g'].includes(el.tagName)) continue;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (!shown(style, rect)) continue;
        const top = rect.top + scrollY;
        const text = own(el);
        const reads = !decor(el);
        const size = parseFloat(style.fontSize);
        const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        if (text) {
            // Decoration keeps its visual tells (gradient text, numbering, eyebrows) but is not the type or contrast.
            if (reads) {
                add(fonts, family, text.length);
                add(sizes, Math.round(size), text.length);
                add(weights, style.fontWeight, text.length);
            }
            const color = parse(style.color);
            if (color && reads) add(textColors, hex(color), text.length);
            const bg = reads ? background(el) : null;
            if (color && bg && text.length > 1) {
                const large = size >= 24 || (size >= 18.66 && +style.fontWeight >= 700);
                // See-through text is as faint as it looks: its alpha and every opacity above it, over what is behind.
                let alpha = color.a;
                for (let node = el; node && node !== document.documentElement; node = node.parentElement) alpha *= +getComputedStyle(node).opacity;
                const r = ratio({ r: color.r * alpha + bg.r * (1 - alpha), g: color.g * alpha + bg.g * (1 - alpha), b: color.b * alpha + bg.b * (1 - alpha) }, bg);
                if (r < (large ? 3 : 4.5)) contrast.push({ text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, size: Math.round(size) });
            }
            if (/-webkit-text|text/.test(style.webkitBackgroundClip || style.backgroundClip) && style.backgroundImage.includes('gradient')) gradientText += 1;
            content.push({ top, bottom: top + rect.height });
            // Text blocks for edges and measure: block-level boxes that hold their own text.
            if (reads && rect.width >= vw * 0.35 && text.length >= 20 && !/inline/.test(style.display) && rect.left >= 0 && rect.left < vw) blocks.push({ left: Math.round(rect.left), top, text: text.length });
            // Eyebrow: a short label just above a heading, small and uppercase or tracked, or in a pill.
            const next = el.nextElementSibling;
            if (text.length <= 32 && size <= 14 && !/^[$>#~]\s/.test(text) && next && /^H[1-3]$/.test(next.tagName) && !/mono|code|courier|consol/i.test(style.fontFamily) && (style.textTransform === 'uppercase' || parseFloat(style.letterSpacing) > 0.5 || parseFloat(style.borderTopLeftRadius) >= 12)) eyebrows.push(text);
            if (/^0[1-9]\.?$/.test(text)) numbering.push(text);
        }
        if (el.tagName === 'P' && !decor(el) && textOf(el).length > 80) {
            const lineHeight = parseFloat(style.lineHeight) || size * 1.5;
            const lines = Math.max(1, Math.round(rect.height / lineHeight));
            paragraphs.push({ chars: Math.round(textOf(el).length / lines), centred: style.textAlign === 'center' && lines > 3, size: Math.round(size) });
        }
        if (/^H[1-3]$/.test(el.tagName) && !headingFont) headingFont = family;
        if (el.tagName === 'H1' && !h1) {
            const lineHeight = parseFloat(style.lineHeight) || size * 1.15;
            h1 = { size: Math.round(size), lines: Math.max(1, Math.round(rect.height / lineHeight)), text: textOf(el).slice(0, 120), top: Math.round(top), centred: style.textAlign === 'center', font: family, weight: style.fontWeight };
        }
        // Without an h1, the first h2 a visitor sees is the first screen's heading.
        if (el.tagName === 'H2' && !firstH2 && top < vh && textOf(el)) firstH2 = textOf(el).toLowerCase();
        if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'PICTURE') content.push({ top, bottom: top + rect.height });
        const area = Math.min(rect.width, vw) * Math.min(rect.height, 4000);
        const fill = parse(style.backgroundColor);
        if (fill && fill.a >= 0.5) add(fills, hex(fill), area);
        const radius = parseFloat(style.borderTopLeftRadius);
        if (radius > 0 && radius < 200 && rect.width > 24) add(radii, Math.round(radius));
        for (const key of ['paddingTop', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
            const v = parseFloat(style[key]);
            if (v > 0 && v < 240) add(spaces, Math.round(v));
        }
        if (style.boxShadow !== 'none' && rect.width > 160 && rect.height > 100 && !/fixed|sticky|absolute/.test(style.position)) {
            const blur = [...style.boxShadow.matchAll(/(-?[\d.]+)px/g)].map((m) => +m[1])[2] ?? 0;
            if (blur >= 12) restingShadows += 1;
        }
        const interactive = el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || (el.tagName === 'INPUT' && !['hidden'].includes(el.type));
        if (interactive) {
            if (fill && fill.a >= 0.5 && text.length < 40 && (el.tagName === 'BUTTON' || parseFloat(style.paddingLeft) >= 8)) {
                add(buttonFills, hex(fill), rect.width * rect.height);
                if (chroma(fill) > 0.15 && parse(style.color)) add(buttonInks, hex(parse(style.color)), rect.width * rect.height);
            }
            const min = vw < 768 ? 44 : 24;
            const inline = el.tagName === 'A' && /inline/.test(style.display) && el.closest('p, li');
            if (!inline && (rect.width < min || rect.height < min) && rect.width < 400) smallTargets.push({ text: (textOf(el) || el.getAttribute('aria-label') || el.tagName).slice(0, 30), width: Math.round(rect.width), height: Math.round(rect.height) });
        }
    }

    // Distinct left edges: cluster block lefts within 4 px; count clusters holding 90% of the text.
    const edgeMap = {};
    for (const b of blocks) {
        const key = Object.keys(edgeMap).map(Number).find((x) => Math.abs(x - b.left) <= 4) ?? b.left;
        edgeMap[key] = (edgeMap[key] || 0) + b.text;
    }
    const edgeTotal = Object.values(edgeMap).reduce((s, v) => s + v, 0) || 1;
    let covered = 0, edges = 0;
    for (const v of Object.values(edgeMap).sort((a, b) => b - a)) { if (covered / edgeTotal >= 0.9) break; covered += v; edges += 1; }

    // Largest vertical stretch with no text or picture.
    content.sort((a, b) => a.top - b.top);
    let reach = content[0]?.bottom ?? 0, emptiest = 0;
    for (const item of content) { if (item.top > reach) emptiest = Math.max(emptiest, item.top - reach); reach = Math.max(reach, item.bottom); }

    // Sections: the big blocks down the page.
    const big = (el) => { const r = el.getBoundingClientRect(); return r.height >= 80 && r.width >= vw * 0.6 && getComputedStyle(el).display !== 'none'; };
    let sections;
    if (scopeList) {
        // The scoped area's own blocks, measured against its width: a module beside the shell's menu is narrower than
        // the screen. An area that holds one block is that block.
        const span = Math.max(...roots.map((el) => el.getBoundingClientRect().width));
        const part = (el) => { const r = el.getBoundingClientRect(); return inside(el) && r.height >= 80 && r.width >= span * 0.6 && getComputedStyle(el).display !== 'none'; };
        sections = roots.flatMap((el) => [...el.children].filter(part));
        for (let i = 0; i < 4 && sections.length === 1; i++) sections = [...sections[0].children].filter(part);
        if (!sections.length) sections = roots;
    } else {
        const root = document.querySelector('main') || document.body;
        sections = [...root.children].filter((el) => big(el) && inside(el));
        for (let i = 0; i < 4 && sections.length === 1; i++) sections = [...sections[0].children].filter((el) => big(el) && inside(el));
        if (root !== document.body) sections = [document.querySelector('header'), ...sections, [...document.querySelectorAll('footer')].pop()].filter((el) => el && inside(el));
    }
    sections = sections.filter((el, i, all) => !all.some((other, j) => j !== i && other.contains(el)));
    const describe = (el) => {
        const r = el.getBoundingClientRect();
        const images = [...el.querySelectorAll('img, video')].filter((m) => m.getBoundingClientRect().width >= 200);
        const firstImage = images[0]?.getBoundingClientRect();
        const heading = el.querySelector('h1, h2');
        return {
            tag: el.tagName.toLowerCase(), id: el.id || null, classes: [...el.classList].slice(0, 6).join(' '),
            top: Math.round(r.top + scrollY), height: Math.round(r.height),
            heading: heading ? textOf(heading).slice(0, 120) : null,
            images: images.length,
            mediaBelowHeading: Boolean(heading && firstImage && firstImage.top > heading.getBoundingClientRect().bottom && Math.abs(firstImage.left + firstImage.width / 2 - vw / 2) < 40),
            layout: getComputedStyle(el).display,
        };
    };

    // The first screen: what stands behind the headline, and whether the page moves at all.
    const h1El = within('h1')[0];
    let heroPhoto = false;
    let hero = null;
    if (h1El) {
        scrollTo(0, 0);
        const r = h1El.getBoundingClientRect();
        for (const node of document.elementsFromPoint(Math.min(r.left + r.width / 2, vw - 1), Math.min(Math.max(r.top + r.height / 2, 0), vh - 1))) {
            const box = node.getBoundingClientRect();
            const wide = box.width >= vw * 0.6 && box.height >= 300;
            if (wide && (node.tagName === 'IMG' || node.tagName === 'PICTURE' || /url\(/.test(getComputedStyle(node).backgroundImage))) heroPhoto = true;
        }
        const section = h1El.closest('section, header, main > div, body > div') || h1El.parentElement;
        for (const img of [...section.querySelectorAll('img')].filter(inside)) {
            const box = img.getBoundingClientRect();
            if (box.width >= vw * 0.6 && box.height >= 300) heroPhoto = true;
        }
        // What the first screen's block holds besides the headline: a visual at least 35% wide, and lines of copy.
        const visual = heroPhoto || [...section.querySelectorAll('img, picture, video, canvas, svg, iframe')].filter(inside).some((node) => {
            const box = node.getBoundingClientRect();
            return box.width >= vw * 0.35 && box.height >= 120 && box.top < vh;
        });
        let lines = 0;
        for (const node of [h1El, ...section.querySelectorAll('p, li, blockquote')].filter(inside)) {
            const box = node.getBoundingClientRect();
            const look = getComputedStyle(node);
            if (box.top < vh && box.height > 0) lines += Math.max(1, Math.round(box.height / (parseFloat(look.lineHeight) || parseFloat(look.fontSize) * 1.3)));
        }
        hero = { visual, lines };
    }
    const moving = [...document.getAnimations()].filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.effect.target && inside(a.effect.target)).length + within('video[autoplay], canvas').length;

    // Boxes side by side on one coloured ground read as a single loud block.
    let sameGrounds = 0;
    for (const parent of within('body *')) {
        const boxes = [...parent.children].filter(inside).map((el) => ({ rect: el.getBoundingClientRect(), fill: parse(getComputedStyle(el).backgroundColor) })).filter(({ rect, fill }) => rect.width >= 200 && rect.height >= 120 && fill && fill.a >= 0.5 && chroma(fill) > 0.12);
        for (let i = 1; i < boxes.length; i++) if (hex(boxes[i].fill) === hex(boxes[i - 1].fill) && Math.abs(boxes[i].rect.top - boxes[i - 1].rect.top) < 8) sameGrounds++;
    }
    // Short labels in small letters on a page that capitalises the rest were copied out of a sentence.
    const labels = [...new Set(within('span, li, label, small, strong, figcaption, h2, h3, h4, text, tspan').map(own).filter((label) => label.length >= 3 && label.length <= 40 && label.split(' ').length <= 4 && /^\p{L}/u.test(label) && !/[.:/@]/.test(label)))];
    const small = labels.filter((label) => /^\p{Ll}/u.test(label));
    const lowerLabels = labels.length - small.length >= small.length * 3 ? small : [];

    // A decorative layer: under aria-hidden="true", or a positioned layer that takes no clicks (pointer-events: none,
    // absolute or fixed), such as a faded "code rain" behind the hero. Its text is not what a visitor reads.
    const layers = new Map();
    const decorative = (el) => {
        if (layers.has(el)) return layers.get(el);
        const style = getComputedStyle(el);
        const own = el.getAttribute('aria-hidden') === 'true' || (style.pointerEvents === 'none' && ['absolute', 'fixed'].includes(style.position));
        const result = own || (el.parentElement ? decorative(el.parentElement) : false);
        layers.set(el, result);
        return result;
    };
    // The words of the area measured, text node by text node: innerText cannot leave the ignored parts out. Reading
    // text and decoration apart, so a pass that rewrites the decoration is not taken for one that loses content.
    const textOfArea = () => {
        const words = [];
        const decor = [];
        for (const root of roots) {
            const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            for (let node = walk.nextNode(); node; node = walk.nextNode()) {
                const parent = node.parentElement;
                if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(parent.tagName) && inside(parent) && parent.checkVisibility()) (decorative(parent) ? decor : words).push(node.textContent);
            }
        }
        const split = (list) => list.join(' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
        return { words: split(words), decoration: split(decor) };
    };
    const text = textOfArea();
    const inventory = {
        headings: within('h1,h2,h3,h4').filter((h) => textOf(h)).map((h) => `${h.tagName.toLowerCase()} ${textOf(h).toLowerCase()}`),
        links: within('a[href]').map((a) => a.getAttribute('href')).filter((h) => h && !h.startsWith('javascript')),
        images: within('img').map((img) => (img.currentSrc || img.src).split('?')[0].split('/').pop()).filter(Boolean),
        backgrounds: [...new Set(within('body *').flatMap((el) => [...getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)].map((match) => match[1].split('?')[0].split('/').pop())))],
        // Generated ids (React, react-aria) change on every load; a field is its tag, type and name.
        fields: within('input, select, textarea, button[type=submit]').filter((f) => f.type !== 'hidden').map((f) => `${f.tagName.toLowerCase()}:${f.type || ''}:${f.name || ''}`),
        // Class strings that find the templates behind the page when the route cannot be followed.
        // The scoped area's own classes come first: they name the module's template.
        markers: [...new Set([...(scopeList ? roots : []), ...within('h1, h2, main > *, body > * > section, section')].map((el) => (el.getAttribute('class') || '').trim()).filter((c) => c.length >= 12))].slice(0, 40),
        words: text.words,
        // Text in decorative layers: on the page, yet not content a pass must keep.
        decoration: text.decoration,
    };

    // The colour the scoped area stands on: its own fill or the nearest one above it.
    const groundOf = (el) => {
        for (let node = el; node; node = node.parentElement) {
            const fill = parse(getComputedStyle(node).backgroundColor);
            if (fill && fill.a >= 0.5) return fill;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
    };
    // With --scope the page scrolling sideways counts when the scoped area runs past the edge (scrollWidth holds a
    // visible overflow too); --ignore alone leaves it page-wide, since the whole page still scrolls.
    const spills = !scopeList || roots.some((el) => el.getBoundingClientRect().left + Math.max(el.scrollWidth, el.getBoundingClientRect().width) > vw + 1);
    return {
        url: location.href, title: document.title, lang: document.documentElement.lang || null, viewport: vw, pageHeight: document.documentElement.scrollHeight,
        system: {
            fonts, sizes, weights, textColors, fills, radii, spaces, buttonFills, buttonInks, headingFont,
            background: hex(scopeList ? groundOf(roots[0]) : parse(getComputedStyle(document.body).backgroundColor)?.a >= 0.5 ? parse(getComputedStyle(document.body).backgroundColor) : (parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255 })),
        },
        metrics: {
            h1, firstH2, edges, emptiest: Math.round(emptiest), viewportHeight: vh,
            paragraphs, contrast: contrast.slice(0, 40), contrastCount: contrast.length,
            smallTargets: smallTargets.slice(0, 40), smallTargetCount: smallTargets.length,
            overflow: document.documentElement.scrollWidth > vw + 1 && spills ? document.documentElement.scrollWidth : 0,
            eyebrows, numbering, gradientText, restingShadows, heroPhoto, hero, moving, sameGrounds, lowerLabels,
            accents: Object.entries(buttonFills).map(([h]) => h).filter((h) => chroma(parse(`rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`)) > 0.15),
        },
        inventory,
        sections: sections.map(describe),
    };
}

/**
 * Popups, cookie bars and anything else that covers the page are hidden, as a returning visitor's closed ones are, and
 * stay hidden: many open on a timer, and frameworks reset inline styles, so this keeps sweeping with a stylesheet rule.
 */
function clearOverlays() {
    const sweep = () => {
        const area = innerWidth * innerHeight;
        for (const el of document.querySelectorAll('body *')) {
            if (el.hasAttribute('data-adc-hidden')) continue;
            const style = getComputedStyle(el);
            if (style.position !== 'fixed' || style.display === 'none') continue;
            const rect = el.getBoundingClientRect();
            const named = /cookie|consent|gdpr|çerez|cerez/i.test(`${el.id} ${el.className} ${(el.innerText || '').slice(0, 300)}`);
            // A card floating in the middle of the screen is a popup, whatever its size; bars and bubbles at the edges stay.
            const centred = rect.width >= 200 && Math.abs(rect.left + rect.width / 2 - innerWidth / 2) < innerWidth * 0.15 && rect.top > innerHeight * 0.05 && rect.bottom < innerHeight * 0.95;
            if (named || centred || style.backdropFilter !== 'none' || (rect.width * rect.height) / area >= 0.2) el.setAttribute('data-adc-hidden', '');
        }
        for (const el of document.querySelectorAll('dialog[open]')) el.close();
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    };
    if (!document.getElementById('adc-overlays')) {
        const sheet = document.createElement('style');
        sheet.id = 'adc-overlays';
        sheet.textContent = '[data-adc-hidden] { display: none !important; }';
        document.head.append(sheet);
        setInterval(sweep, 150);
    }
    sweep();
    return true;
}

/** Size buckets that carry at least 1% of the text, sorted. */
export function sizesInUse(sizes) {
    const total = Object.values(sizes).reduce((sum, value) => sum + value, 0) || 1;

    return Object.entries(sizes).filter(([, value]) => value / total >= 0.01).map(([size]) => Number(size)).sort((a, b) => a - b);
}

export const topKey = (map) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

/**
 * @param {string} url
 * @param {{screenshots?: string, widths?: number[], signal?: AbortSignal, auth?: object, allowRedirect?: boolean, onLanded?: (url: string) => void, scope?: string[], ignore?: string[]}} options
 *   screenshots: a path prefix; writes <prefix>-<width>.png. signal: closes the browser at once when the run is stopped.
 *   auth: cookies and headers for a page behind a sign-in (see signIn). onLanded: told the address measured after a redirect.
 *   scope, ignore: CSS selectors; only the area inside a scope match and outside every ignore match is measured (a scope
 *   that matches nothing stops the run, exit 2). Screenshots stay whole pages.
 * @returns {Promise<{desktop: object, mobile: object}>}
 */
export async function measure(url, { screenshots, widths = [1440, 390], signal, auth, allowRedirect = false, onLanded, scope = [], ignore = [] } = {}) {
    if (signal?.aborted) throw new Error('Stopped before measuring');
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH');
    const browser = await launch(chrome);
    const stop = () => { browser.close(); };
    signal?.addEventListener('abort', stop, { once: true });
    try {
        await signIn(browser, url, auth);
        const out = {};
        for (const [index, width] of widths.entries()) {
            const mobile = width < 768;
            assertPage(await browser.open(url, { width, height: mobile ? 844 : 900, mobile, settle: 1800 }), url);
            if (index === 0) {
                const landed = await assertLanded(browser, url, { allowRedirect });
                if (landed) onLanded?.(landed);
                await assertScope(browser, url, { scope, ignore });
            }
            await browser.evaluate(`document.documentElement.style.scrollBehavior = 'auto'; (${clearOverlays.toString()})()`); // a smooth scroll would still be moving when things are measured
            // Lazy images and on-scroll reveals: walk down the page once, then freeze motion before measuring.
            await browser.evaluate(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await document.fonts.ready; await new Promise((r) => setTimeout(r, 400)); })()`);
            await new Promise((done) => setTimeout(done, 1200)); // entrance animations finish; frozen they would stick invisible
            await browser.evaluate(`(${clearOverlays.toString()})()`);
            out[mobile ? 'mobile' : 'desktop'] = await browser.evaluate(`(${inPage.toString()})(${JSON.stringify({ scope, ignore })})`);
            if (screenshots) {
                // The first screen and the next one as a visitor sees them, for the visual comparison.
                await browser.evaluate(`(${clearOverlays.toString()})(); scrollTo(0, 0)`);
                await new Promise((done) => setTimeout(done, 200));
                const fold = await browser.send('Page.captureScreenshot', { format: 'png' });
                writeFileSync(`${screenshots}-fold-${width}.png`, Buffer.from(fold.data, 'base64'));
                if (!mobile) {
                    await browser.evaluate('scrollTo(0, innerHeight)');
                    await new Promise((done) => setTimeout(done, 200));
                    const next = await browser.send('Page.captureScreenshot', { format: 'png' });
                    writeFileSync(`${screenshots}-next-${width}.png`, Buffer.from(next.data, 'base64'));
                    await browser.evaluate('scrollTo(0, 0)');
                }
                const height = await browser.evaluate('Math.min(document.documentElement.scrollHeight, 14000)');
                await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
                await new Promise((done) => setTimeout(done, 500));
                const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
                writeFileSync(`${screenshots}-${width}.png`, Buffer.from(shot.data, 'base64'));
            }
        }

        return out;
    } finally {
        signal?.removeEventListener('abort', stop);
        await browser.close();
    }
}
