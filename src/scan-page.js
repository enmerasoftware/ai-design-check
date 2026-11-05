/* eslint-disable no-undef -- runs in the page; sent to Chrome as source, so it uses nothing from outside */
export function scanPage(designSystem) {
    const found = [];
    const counts = {};
    const hit = (rule, value, message) => {
        counts[rule] = (counts[rule] || 0) + 1;
        if (counts[rule] > (rule === 'legible-contrast' ? 60 : 12) || found.some((item) => item.rule === rule && item.value === value)) return;
        found.push({ rule, value: String(value).slice(0, 120), ...(message ? { message } : {}) });
    };
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const phone = vw < 768;
    const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const memo = {};
    const parse = (value) => {
        if (!value || value === 'transparent' || value === 'none') return null;
        if (memo[value] !== undefined) return memo[value];
        canvas.clearRect(0, 0, 1, 1);
        canvas.fillStyle = '#000';
        canvas.fillStyle = value;
        canvas.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data;
        return (memo[value] = a === 0 ? null : { r, g, b, a: a / 255 });
    };
    const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
    const lum = (c) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const chroma = (c) => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
    const hue = (c) => {
        const max = Math.max(c.r, c.g, c.b), d = max - Math.min(c.r, c.g, c.b);
        if (!d) return 0;
        const h = max === c.r ? ((c.g - c.b) / d) % 6 : max === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4;
        return (h * 60 + 360) % 360;
    };
    const text = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
    const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const short = (value) => (value.length > 48 ? `${value.slice(0, 47)}…` : value);
    const px = (value) => parseFloat(value) || 0;
    const shown = (style, rect) => style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE', 'BR']);
    const inSvg = (el) => el instanceof SVGElement;
    // The colour behind an element; null when a picture or gradient is under it, since that needs eyes.
    const ground = (el) => {
        for (let node = el; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (style.backgroundImage !== 'none') return null;
            const fill = parse(style.backgroundColor);
            if (fill && fill.a >= 0.9) return fill;
            if (fill) return null;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
    };
    const all = [...document.body.querySelectorAll('*')].filter((el) => !SKIP.has(el.tagName)).map((el) => ({ el, style: getComputedStyle(el), rect: el.getBoundingClientRect(), tag: el.tagName })).filter((item) => shown(item.style, item.rect));
    const texts = all.filter((item) => !inSvg(item.el) && own(item.el).length > 0);
    const isCard = ({ style, rect, tag }) => {
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'IMG', 'PRE', 'CODE', 'HR', 'TABLE'].includes(tag) || rect.width < 120 || rect.height < 60) return false;
        const border = ['Top', 'Right', 'Bottom', 'Left'].filter((side) => px(style[`border${side}Width`]) > 0 && parse(style[`border${side}Color`])).length >= 3;
        return border || style.boxShadow !== 'none';
    };
    // Every colour inside a computed value, brackets and all: Chrome writes Tailwind 4 colours as oklch() and oklab(),
    // others as lab(), lch(), hwb(), color() or color-mix(), so a pattern for rgb() alone misses them. parse() reads each.
    const colors = (value) => {
        const found = [];
        const start = /(?<![\w-])(?:url|rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color|light-dark)\(|(?<![\w-])(?:transparent|currentcolor)(?![\w-])/gi;
        for (let match = start.exec(value ?? ''); match; match = start.exec(value)) {
            let end = start.lastIndex;
            if (match[0].endsWith('(')) {
                for (let depth = 1; end < value.length && depth; end++) depth += value[end] === '(' ? 1 : value[end] === ')' ? -1 : 0;
                start.lastIndex = end;
            }
            if (!/^url/i.test(match[0])) found.push(value.slice(match.index, end)); // a picture's address is not a colour
        }
        return found;
    };
    // A comma list cut at the top level only, so rgb(0, 0, 0) and color-mix(in oklab, a, b) stay whole.
    const layers = (value) => {
        const parts = [];
        let depth = 0;
        let from = 0;
        for (let i = 0; i <= value.length; i++) {
            if (value[i] === '(') depth++;
            else if (value[i] === ')') depth--;
            else if (i === value.length || (value[i] === ',' && !depth)) { parts.push(value.slice(from, i).trim()); from = i + 1; }
        }
        return parts.filter(Boolean);
    };
    const shadows = (value) => (!value || value === 'none' ? [] : layers(value).map((part) => {
        const color = colors(part)[0];
        const [x = 0, y = 0, blur = 0, spread = 0] = ((color ? part.replace(color, ' ') : part).match(/-?[\d.]+px/g) ?? []).map(px);
        return { color: color ? parse(color) : null, x, y, blur, spread, inset: /\binset\b/.test(part) };
    }));
    // The drop-shadow() steps of a filter, read like box shadows.
    const drops = (value) => {
        const found = [];
        for (let at = (value ?? '').indexOf('drop-shadow('); at >= 0; at = value.indexOf('drop-shadow(', at + 1)) {
            let end = at + 12;
            for (let depth = 1; end < value.length && depth; end++) depth += value[end] === '(' ? 1 : value[end] === ')' ? -1 : 0;
            found.push(...shadows(value.slice(at + 12, end - 1)));
        }
        return found;
    };
    const lines = (node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rows = [];
        for (const rect of range.getClientRects()) {
            if (rect.width < 1) continue;
            const row = rows.find((item) => Math.abs(item.top - rect.top) < rect.height / 2);
            if (row) { row.left = Math.min(row.left, rect.left); row.right = Math.max(row.right, rect.right); }
            else rows.push({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
        }
        return rows;
    };

    // Reading
    for (const { el, style, rect, tag } of texts) {
        const size = px(style.fontSize);
        const value = own(el);
        const label = `${tag.toLowerCase()} "${short(value)}"`;
        const color = parse(style.color);
        const back = ground(el);
        if (color && back && style.backgroundClip !== 'text' && style.webkitBackgroundClip !== 'text') {
            const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
            let alpha = color.a;
            for (let node = el; node && node !== document.documentElement; node = node.parentElement) alpha *= +getComputedStyle(node).opacity;
            const contrast = alpha < 0.05 ? 21 : ratio({ r: color.r * alpha + back.r * (1 - alpha), g: color.g * alpha + back.g * (1 - alpha), b: color.b * alpha + back.b * (1 - alpha) }, back); // nearly gone is no-invisible-content
            if (contrast < (large ? 3 : 4.5)) hit('legible-contrast', label, `${contrast.toFixed(1)}:1, needs ${large ? 3 : 4.5}:1: ${label}`);
            if (chroma(color) < 0.1 && lum(color) > 0.08 && lum(color) < 0.75 && chroma(back) > 0.25) hit('no-gray-on-color', label);
            if (lum(back) < 0.04 && chroma(color) > 0.45 && hue(color) >= 165 && hue(color) <= 205) counts.neon = [...(counts.neon || []), label];
        }
        if (tag !== 'SUP' && tag !== 'SUB' && value.length >= 3) {
            const interactive = ['A', 'BUTTON', 'LABEL', 'TH', 'TD'].includes(tag);
            if (size < (interactive ? 11 : 12)) hit('no-tiny-text', label, `${size} px: ${label}`);
        }
        const words = value.split(' ').length;
        if (words >= 8 && (style.textTransform === 'uppercase' || (value === value.toUpperCase() && /\p{Lu}/u.test(value)))) hit('no-all-caps-sentences', label);
        const spacing = px(style.letterSpacing) / size;
        if (spacing < -0.05) hit('no-crushed-tracking', label, `Letter spacing ${spacing.toFixed(2)}em: ${label}`);
        if (spacing > 0.05 && value.length >= 20 && style.textTransform !== 'uppercase' && value !== value.toUpperCase()) hit('no-wide-tracking-body', label);
        const height = px(style.lineHeight) || size * 1.2;
        const rows = value.length >= 30 && rect.height >= height * 1.5 ? lines(el).length : 1;
        if (rows >= 2) {
            if (height / size < 1.28 && size < 32 && value.length >= 60 && style.display !== 'inline' && !/^H[1-6]$/.test(tag)) hit('no-tight-leading', label, `Line height ${(height / size).toFixed(2)}: ${label}`);
            if (value.length / rows > 85 && !['PRE', 'CODE'].includes(tag)) hit('readable-measure', label, `About ${Math.round(value.length / rows)} characters a line: ${label}`);
        }
        if (style.textAlign === 'justify' && style.hyphens !== 'auto') hit('no-justified-text', label);
        if (value.length >= 40 && ['P', 'LI'].includes(tag)) {
            const margin = phone ? 12 : 16;
            const painted = lines(el);
            if (painted.some((row) => row.left < margin || row.right > vw - margin)) hit('text-off-viewport-edge', label);
        }
        if (tag !== 'TD' && rect.width > 2 && rect.height > 2 && el.scrollWidth > el.clientWidth + 1 && /(hidden|clip)/.test(style.overflowX) && !el.title && lines(el).some((row) => row.right > rect.right + 1)) hit('text-not-clipped', label);
        // Cover: what is painted over the middle of the text.
        if (rect.top >= 0 && rect.bottom <= vh && rect.left >= 0 && rect.right <= vw) {
            const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            if (top && top !== el && !el.contains(top) && !top.contains(el)) {
                const cover = getComputedStyle(top);
                if (!['fixed', 'sticky'].includes(cover.position) && (parse(cover.backgroundColor)?.a ?? 0) >= 0.9 && cover.pointerEvents !== 'none') hit('text-not-covered', label);
            }
        }
        // Boxes that hold their own text with no room around it.
        if (rect.width >= 30 && rect.height < 120 && (px(style.paddingLeft) < 3 || px(style.paddingRight) < 3) && (parse(style.backgroundColor) || px(style.borderTopWidth) > 0) && style.display !== 'inline' && !['TD', 'TH', 'INPUT', 'LABEL'].includes(tag)) {
            const row = lines(el)[0];
            if (row && Math.min(row.left - rect.left, rect.right - row.right, row.top - rect.top + 2) < 3 && ground(el.parentElement ?? el) !== null && hex(parse(style.backgroundColor) ?? { r: 0, g: 0, b: 0 }) !== hex(ground(el.parentElement) ?? { r: 1, g: 1, b: 1 })) hit('no-cramped-padding', label);
        }
    }
    if ((counts.neon || []).length >= 2) hit('no-neon-on-dark', counts.neon[0]);
    delete counts.neon;

    // Paragraph and heading shape
    for (const { el, style, rect } of texts.filter((item) => item.tag === 'P').slice(0, 80)) {
        if (/pretty|balance/.test(style.textWrap || '') || style.textAlign === 'center') continue;
        const node = [...el.childNodes].filter((n) => n.nodeType === 3).pop();
        const words = node?.textContent.trim().split(/\s+/) ?? [];
        if (words.length < 4 || el.lastChild !== node) continue;
        const rows = lines(el);
        if (rows.length < 2) continue;
        const last = rows[rows.length - 1];
        const lastWord = document.createRange();
        const end = node.textContent.trimEnd().length;
        lastWord.setStart(node, end - words[words.length - 1].length);
        lastWord.setEnd(node, end);
        if (Math.abs(lastWord.getBoundingClientRect().left - last.left) < 2 && rect.width > 0) hit('no-straggler', short(own(el)));
    }
    for (const { el, style } of all.filter((item) => /^H[1-3]$/.test(item.tag))) {
        if (/balance|pretty/.test(style.textWrap || '')) continue;
        const rows = lines(el);
        if (rows.length >= 2) {
            const [before, after] = rows.slice(-2);
            if (after.right - after.left < (before.right - before.left) / 2.5) hit('balanced-headings', short(text(el)));
        }
    }

    // Structure
    const headings = all.filter((item) => /^H[1-6]$/.test(item.tag) && text(item.el));
    let level = 0;
    for (const { el, tag } of headings) {
        const next = Number(tag[1]);
        if (level && next > level + 1) hit('heading-order', short(text(el)), `h${level} then h${next}: "${short(text(el))}"`);
        level = next;
    }
    const rhythm = headings.filter(({ el }) => el.previousElementSibling && el.nextElementSibling).map(({ el, rect }) => ({ above: rect.top - el.previousElementSibling.getBoundingClientRect().bottom, below: el.nextElementSibling.getBoundingClientRect().top - rect.bottom }));
    if (rhythm.length >= 3 && rhythm.filter(({ above, below }) => above <= below).length >= rhythm.length / 2) hit('heading-spacing', `${rhythm.filter(({ above, below }) => above <= below).length} of ${rhythm.length} headings`);

    const main = headings.filter((item) => /^H[1-3]$/.test(item.tag));
    const bodySizes = {};
    for (const { el, style, tag } of texts) if (['P', 'LI', 'TD'].includes(tag)) bodySizes[px(style.fontSize)] = (bodySizes[px(style.fontSize)] || 0) + own(el).length;
    const body = Number(Object.entries(bodySizes).sort((a, b) => b[1] - a[1])[0]?.[0]);
    if (body && main.length && Math.max(...main.map((item) => px(item.style.fontSize))) / body < 1.25) hit('flat-type-scale', `${Math.max(...main.map((item) => px(item.style.fontSize)))} px on ${body} px text`);

    const h1 = headings.find((item) => item.tag === 'H1');
    const serif = (family) => /serif|Fraunces|Recoleta|Playfair|Newsreader|Instrument|Georgia|Lora|Cormorant|Times/i.test(family) && !/sans-serif/i.test(family);
    const italicSerif = (style) => style.fontStyle === 'italic' && serif(style.fontFamily);
    const italicHero = h1 && px(h1.style.fontSize) >= 40 && (italicSerif(h1.style) || [...h1.el.querySelectorAll('em, i, span')].some((item) => italicSerif(getComputedStyle(item))));
    if (h1) {
        const size = px(h1.style.fontSize);
        if (italicHero) hit('no-italic-serif-hero', short(text(h1.el)));
        if (text(h1.el).split(' ').length >= 8 && (size >= 64 || h1.rect.height > vh * 0.6)) hit('no-giant-sentence', `${size} px: ${short(text(h1.el))}`);
        // One column running far past the fold while its neighbour fits.
        for (let box = h1.el.parentElement; box && box !== document.body; box = box.parentElement) {
            // A stretched column reports its neighbour's height, so a column is measured by what it holds.
            const held = (child) => {
                const rect = child.getBoundingClientRect();
                const inner = [...child.children].map((item) => item.getBoundingClientRect().bottom);
                return { top: rect.top, height: inner.length ? Math.max(...inner) - rect.top : rect.height };
            };
            const row = [...box.parentElement.children].map(held).filter((item) => item.height > 0);
            if (row.length >= 2 && row.every((item) => Math.abs(item.top - row[0].top) < 40) && !phone) {
                const tall = Math.max(...row.map((item) => item.height));
                const low = Math.min(...row.map((item) => item.height));
                if (tall > vh * 1.3 && low < vh && tall >= low * 2) hit('no-lopsided-fold', `${Math.round(tall)} px beside ${Math.round(low)} px`);
                break;
            }
        }
    }

    // The headline of the first screen: the largest h1 or h2 that starts above the fold (a screen-reader-only one is not).
    const hero = headings.filter((item) => /^H[12]$/.test(item.tag) && item.rect.top < vh && item.rect.bottom > 0 && px(item.style.fontSize) >= 24 && item.rect.height >= 12).sort((a, b) => px(b.style.fontSize) - px(a.style.fontSize))[0];
    // What one rule has reported, its neighbours leave alone: one thing, one finding.
    const claimed = new Set();
    const taken = (el) => [...claimed].some((item) => item.contains(el) || el.contains(item));
    if (hero && !/text/.test(hero.style.backgroundClip + hero.style.webkitBackgroundClip)) {
        // A word or short run set apart by colour or by gradient text. The headline's colour is the one most letters have.
        const inks = {};
        const walker = document.createTreeWalker(hero.el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const ink = getComputedStyle(node.parentElement).color;
            inks[ink] = (inks[ink] || 0) + node.textContent.trim().length;
        }
        const base = parse(Object.entries(inks).sort((a, b) => b[1] - a[1])[0]?.[0]);
        const whole = text(hero.el);
        for (const run of hero.el.querySelectorAll('*')) {
            const value = text(run);
            if (!value || value.split(' ').length > 5 || value.length > whole.length * 0.6 || run.getBoundingClientRect().width < 2 || run.closest('a, button, code, kbd, samp, sup, sub, svg')) continue;
            const look = getComputedStyle(run);
            const gradient = /text/.test(look.backgroundClip + look.webkitBackgroundClip) && look.backgroundImage !== 'none';
            const ink = parse(look.color);
            const apart = ink && base && ink.a >= 0.5 && chroma(ink) > 0.2 && Math.abs(ink.r - base.r) + Math.abs(ink.g - base.g) + Math.abs(ink.b - base.b) >= 80;
            // A badge or a highlight has a ground of its own; an italic serif word is no-italic-serif-hero's.
            if ((!gradient && (parse(look.backgroundColor)?.a ?? 0) >= 0.1) || (italicHero && hero.el === h1.el && italicSerif(look))) continue;
            // Gradient text is no-ai-gradients' already, an error of its own: one thing, one finding.
            if (apart && !gradient) {
                hit('no-accent-word', `"${short(value)}" in "${short(whole)}"`);
                break;
            }
        }
    }
    if (hero) {
        // A small pill lined up just above the headline: the announcement badge. A pill in the site's header or menu is not.
        const rows = lines(hero.el);
        const left = rows.length ? Math.min(...rows.map((row) => row.left)) : hero.rect.left;
        const right = rows.length ? Math.max(...rows.map((row) => row.right)) : hero.rect.right;
        for (const { el, style, rect, tag } of all) {
            if (rect.bottom > hero.rect.top + 4 || rect.bottom < hero.rect.top - 160 || rect.height < 14 || rect.height > 44 || rect.width < 24 || rect.width > 480) continue;
            const value = text(el);
            const lined = Math.abs(rect.left - left) < 24 || Math.abs((rect.left + rect.right) / 2 - (left + right) / 2) < 40;
            const round = Math.min(px(style.borderTopLeftRadius), px(style.borderBottomRightRadius)) >= rect.height / 2 - 1;
            const painted = (parse(style.backgroundColor)?.a ?? 0) >= 0.04 || (px(style.borderTopWidth) > 0 && parse(style.borderTopColor)) || style.backgroundImage !== 'none';
            const frame = el.closest('header, [role="banner"]');
            if (!value || value.length > 60 || value.split(' ').length > 8 || !lined || !round || !painted || px(style.fontSize) > 16 || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'IMG'].includes(tag)) continue;
            if ((frame && !frame.contains(hero.el)) || el.closest('nav, [role="navigation"]')) continue;
            let pinned = false;
            for (let node = el; node && node !== document.body; node = node.parentElement) pinned ||= /fixed|sticky/.test(getComputedStyle(node).position);
            if (pinned) continue;
            hit('no-announcement-pill', short(value));
            claimed.add(el);
            break;
        }
    }
    for (const heading of headings) {
        const prev = heading.el.previousElementSibling;
        if (prev && /^H[1-3]$/.test(heading.tag)) {
            const style = getComputedStyle(prev);
            const value = text(prev);
            const small = px(style.fontSize) <= 14 && value.length > 0 && value.length <= 40 && !prev.querySelector('a, button, img, svg') && !['A', 'NAV', 'BUTTON'].includes(prev.tagName);
            const shouted = style.textTransform === 'uppercase' || px(style.letterSpacing) / px(style.fontSize) >= 0.05 || (value === value.toUpperCase() && /\p{Lu}/u.test(value));
            if (small && shouted && !/^0?\d+[.)]?$/.test(value) && !taken(prev)) {
                hit('no-eyebrow-label', value);
                claimed.add(prev);
            }
        }
    }
    const numbered = headings.filter(({ el }) => /^0?\d{1,2}[.)]?$/.test(text(el.previousElementSibling ?? document.createElement('i'))));
    if (numbered.length >= 2) hit('no-section-numbers', numbered.map(({ el }) => text(el.previousElementSibling)).join(', '));

    // Short lines that string three or more items on middle dots or bullets. A footer line, a row of links and a byline
    // that carries a date or a reading time are records, not decoration.
    const visible = new Set(all.map((item) => item.el));
    const DATED = /\b(?:19|20)\d{2}\b|\b\d{1,2}:\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}\b|\b\d{1,2}\.? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|oca|şub|nis|haz|tem|ağu|eyl|eki|kas|ara)|\bmin(?:ute)?s? read\b|\bago\b|\b\d+(?:[.,]\d+)? ?[kmg]b\b/i;
    const strung = new Set();
    const dots = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = dots.nextNode(); node; node = dots.nextNode()) {
        let line = node.parentElement;
        if (!/[·•∙]/.test(node.textContent) || !line || line === document.body || SKIP.has(line.tagName) || inSvg(line)) continue;
        // The line: the widest box around the dot that is still one short row.
        while (line.parentElement !== document.body && line.parentElement.getBoundingClientRect().height <= line.getBoundingClientRect().height + 16 && text(line.parentElement).length <= 80) line = line.parentElement;
        if (strung.has(line)) continue;
        strung.add(line);
        const value = text(line);
        const items = value.split(/\s[·•∙]\s/);
        if (items.length < 3 || value.length > 80 || items.some((item) => !/\p{L}/u.test(item) || item.trim().split(' ').length > 5)) continue;
        if (!visible.has(line) || line.closest('footer, nav, table, pre, code, [role="contentinfo"], [role="navigation"]') || line.querySelectorAll('a').length >= 2) continue;
        if (/^(?:©|\(c\)|copyright)/i.test(value) || DATED.test(value) || taken(line)) continue;
        hit('no-middle-dot-lists', short(value));
    }

    // Boxes
    const cards = all.filter(isCard);
    for (const card of cards) {
        for (let node = card.el.parentElement; node && node !== document.body; node = node.parentElement) {
            const outer = cards.find((item) => item.el === node);
            if (outer && card.rect.width * card.rect.height < outer.rect.width * outer.rect.height * 0.9) {
                hit('no-nested-cards', `${card.tag.toLowerCase()} inside ${outer.tag.toLowerCase()}: ${short(text(card.el))}`);
                break;
            }
        }
        const labels = {};
        // A card, not a whole section that happens to have a border.
        for (const leaf of card.rect.height < 500 ? card.el.querySelectorAll('*') : []) {
            const value = own(leaf);
            if (leaf.getBoundingClientRect().width > 0 && value.length >= 3 && value.length <= 30) labels[value] = (labels[value] || 0) + 1;
        }
        for (const [value, total] of Object.entries(labels)) if (total >= 3) hit('no-repeated-label', value, `"${value}" ${total} times in one card`);
    }
    for (const parent of new Set(cards.map((item) => item.el.parentElement))) {
        const row = cards.filter((item) => item.el.parentElement === parent);
        if (row.length >= 3 && row.every((item) => px(item.style.borderTopWidth) === 1 && shadows(item.style.boxShadow).some((shadow) => shadow.blur >= 24))) hit('no-border-and-wide-shadow', `${row.length} cards`);
    }

    const chars = { total: 0, hidden: 0 };
    // A tinted shadow cast below a card, button or picture. A focus ring has no blur and a glow no offset: other rules.
    const tinted = (shadow) => shadow.color && !shadow.inset && shadow.blur >= 6 && Math.abs(shadow.x) + Math.abs(shadow.y) >= 2 && shadow.color.a >= 0.15 && chroma(shadow.color) > 0.25;
    for (const { el, style, rect, tag } of all) {
        // Shadows
        for (const shadow of shadows(style.boxShadow)) {
            if (!shadow.color) continue;
            if (chroma(shadow.color) > 0.2 && !shadow.x && !shadow.y && shadow.blur >= 8) hit('glow-in-charts-only', `${tag.toLowerCase()}: ${shadow.blur} px glow`);
            if ((Math.abs(shadow.x) >= 4 || Math.abs(shadow.y) >= 4) && !shadow.blur && shadow.color.a > 0.3) hit('no-hard-offset-shadow', `${tag.toLowerCase()}: ${shadow.x} ${shadow.y} 0`);
        }
        if (rect.width >= 32 && rect.height >= 20 && [...shadows(style.boxShadow), ...drops(style.filter)].some(tinted)) hit('no-colored-shadow', `${tag.toLowerCase()}: ${short(text(el)) || 'no text'}`);
        if (rect.width >= 100 && rect.height >= 40 && tag !== 'BLOCKQUOTE') {
            const sides = ['Top', 'Right', 'Bottom', 'Left'].map((side) => px(style[`border${side}Width`]));
            const thick = sides.filter((width) => width >= 3).length === 1 && sides.filter((width) => width <= 1).length === 3;
            if (thick && ['Left', 'Right'].some((side) => px(style[`border${side}Width`]) >= 3 && chroma(parse(style[`border${side}Color`]) ?? { r: 0, g: 0, b: 0 }) > 0.15)) hit('no-side-stripe', short(text(el)));
        }
        // Painted surfaces
        const painted = [style.backgroundImage];
        for (const pseudo of ['::before', '::after']) {
            const part = getComputedStyle(el, pseudo);
            if (part.content !== 'none' && part.content !== 'normal') painted.push(part.backgroundImage);
        }
        for (const image of painted) {
            if (image === 'none') continue;
            const tokens = colors(image).map((token) => (/^currentcolor$/i.test(token) ? style.color : token));
            const stops = tokens.map(parse).filter(Boolean);
            const fading = tokens.some((token) => (parse(token)?.a ?? 0) < 0.05);
            if (/radial-gradient/.test(image) && fading && rect.width >= 240 && rect.height >= 120 && stops.some((stop) => chroma(stop) > 0.2)) hit('no-radial-halo', `${tag.toLowerCase()}: ${short(text(el)) || 'background'}`);
            if (/gradient/.test(image) && rect.width >= 120 && stops.some((stop) => chroma(stop) > 0.3 && hue(stop) >= 245 && hue(stop) <= 320)) hit('no-ai-gradients', `${tag.toLowerCase()}: purple gradient`);
            if (/repeating-(linear|radial)-gradient/.test(image) && rect.width >= 200 && rect.height >= 100) hit('no-stripe-surface', tag.toLowerCase());
            if ((image.match(/linear-gradient/g) ?? []).length >= 2 && /\d+px/.test(style.backgroundSize) && rect.width >= 200 && rect.height >= 150 && !/repeating/.test(image)) hit('no-grid-wallpaper', `${tag.toLowerCase()}: ${style.backgroundSize}`);
            if (/url\(/.test(image) && /gradient/.test(image.split('url(')[0])) {
                const stops = colors(image.split('url(')[0]).map(parse);
                if (stops.length && stops.every((stop) => stop && stop.a >= 0.9)) hit('no-buried-image', `${tag.toLowerCase()}: picture under a solid wash`);
            }
        }
        if ((style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') && /gradient/.test(style.backgroundImage)) hit('no-ai-gradients', `gradient text: ${short(text(el))}`);
        if (/polygon\(/.test(style.clipPath) && (style.clipPath.match(/,/g) ?? []).length >= 11) hit('no-blob-clip-path', `${tag.toLowerCase()}: polygon`);
        if (/^path\(/.test(style.clipPath)) hit('no-blob-clip-path', `${tag.toLowerCase()}: path`);
        if (tag === 'IMG') {
            if (+style.opacity < 0.1 && rect.width >= 200) hit('no-buried-image', `${el.src.split('/').pop()}: near-zero opacity`);
        }
        // Motion
        for (const timing of [style.transitionTimingFunction, style.animationTimingFunction]) {
            const curve = /cubic-bezier\(([^)]+)\)/.exec(timing)?.[1].split(',').map(Number);
            if (curve && (curve[1] > 1.1 || curve[3] > 1.1 || curve[1] < -0.1 || curve[3] < -0.1)) hit('no-bounce-easing', `${tag.toLowerCase()}: ${timing}`);
        }
        // Scrollers whose first card touches the edge while the page around them has a gutter.
        if (/(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1 && el.children.length >= 2 && rect.left > 16 && !['PRE', 'CODE', 'TABLE'].includes(tag)) {
            const first = el.children[0];
            const firstStyle = getComputedStyle(first);
            if (Math.abs(first.getBoundingClientRect().left - rect.left) < 2 && (px(firstStyle.borderRadius) > 0 || px(firstStyle.borderTopWidth) > 0)) hit('no-flush-cards', short(text(first)));
        }
        // A clipping box cutting off something positioned inside it.
        if (/(hidden|clip)/.test(style.overflowX + style.overflowY) && style.position !== 'static') {
            for (const child of el.children) {
                const inner = getComputedStyle(child);
                if (inner.position !== 'absolute') continue;
                const box = child.getBoundingClientRect();
                const out = Math.max(box.bottom - rect.bottom, box.right - rect.right, rect.left - box.left, rect.top - box.top);
                if (out >= 8 && box.width >= 60 && box.height >= 24 && text(child) && out < Math.max(box.width, box.height) && inner.transform === 'none') hit('no-clipped-popover', short(text(child)));
            }
        }
        if (tag === 'svg' && rect.width >= 280 && rect.height >= 180) {
            const shapes = el.querySelectorAll('rect, circle, ellipse, polygon, line').length;
            if (shapes >= 14 && el.querySelectorAll('text').length < 3) hit('no-clipart-svg', `${shapes} shapes, ${Math.round(rect.width)}×${Math.round(rect.height)}`);
        }
    }
    // Text the visitor never sees, from the live page.
    for (const { el } of texts) {
        const value = own(el).length;
        chars.total += value;
        let opacity = 1;
        for (let node = el; node; node = node.parentElement) opacity *= +getComputedStyle(node).opacity;
        if (opacity < 0.05) chars.hidden += value;
    }
    if (chars.total >= 100 && chars.hidden / chars.total > 0.2) hit('no-invisible-content', `${Math.round((chars.hidden / chars.total) * 100)}% of the text`);

    // Icon tiles and repeats
    const tiles = all.filter(({ el, rect, style }) => rect.width >= 28 && rect.width <= 72 && Math.abs(rect.width - rect.height) <= 4 && px(style.borderRadius) >= 6 && (parse(style.backgroundColor) || style.backgroundImage !== 'none') && el.querySelector('svg, img, i') && !own(el) && el.nextElementSibling && (/^H[1-5]$/.test(el.nextElementSibling.tagName) || el.nextElementSibling.querySelector?.('h1,h2,h3,h4,h5')));
    if (tiles.length >= 2) hit('no-icon-tile-stack', `${tiles.length} tiles above headings`);

    // Calls to action that end in an arrow, as a glyph or an icon. One such link is fine; two different ones are a habit.
    const ARROW = /(?:→|⟶|➜|➔|➝|➞|›|»|->)$/;
    // lucide-arrow-right, bi-arrow-right-short, fa-arrow-right-long, arrow_forward; not chevrons, not sign-in brackets.
    const ARROW_ICON = /(?:arrow[-_]?(?:right|forward|narrow[-_]right|long[-_]right)|long[-_]arrow[-_]right|move[-_]right)(?:[-_](?:short|long|circle|alt|fill|line|thin|bold))*(?![\w-])/i;
    // What an icon is called: its classes, its icon attributes, its file, or the sprite it uses (<use href="#arrow-right">).
    const named = (node) => [...['class', 'data-lucide', 'data-icon', 'icon', 'name', 'src'].map((name) => node.getAttribute(name)), node.querySelector('use')?.getAttribute('href') ?? node.querySelector('use')?.getAttribute('xlink:href')].filter(Boolean).join(' ');
    // The last thing painted inside a control: a word, or an icon.
    const tail = (node) => {
        for (let child = node.lastChild; child; child = child.previousSibling) {
            if (child.nodeType === 3 && child.textContent.trim()) return child;
            if (child.nodeType !== 1 || getComputedStyle(child).display === 'none') continue;
            return /^(svg|i|img)$/i.test(child.tagName) || ARROW_ICON.test(named(child)) ? child : (tail(child) ?? child);
        }
        return null;
    };
    const arrowed = new Set();
    for (const { el, style, rect, tag } of all) {
        const control = ['A', 'BUTTON'].includes(tag) || el.getAttribute('role') === 'button' || (tag === 'INPUT' && /^(submit|button)$/.test(el.type));
        if (!control || rect.width < 8 || rect.height < 8 || rect.right <= 0 || rect.bottom <= 0 || rect.left >= vw || +style.opacity < 0.1 || el.closest('nav, [role="navigation"], .pagination')) continue;
        const label = tag === 'INPUT' ? el.value.replace(/\s+/g, ' ').trim() : text(el);
        const end = tag === 'INPUT' ? null : tail(el);
        // Material icons are a word drawn as a picture: arrow_forward.
        const host = end?.nodeType === 3 ? end.parentElement : end;
        const ligature = host && /material-(?:icons|symbols)/.test(host.getAttribute('class') ?? '') && /^(?:arrow_forward|arrow_right_alt|east)$/.test(host.textContent.trim());
        const words = ligature ? label.slice(0, -host.textContent.trim().length) : label.replace(ARROW, '');
        const icon = ligature || (end?.nodeType === 1 && ARROW_ICON.test(named(end))) || /(?:→|⟶|➜|➔|›|»|->)\s*["']$/.test(getComputedStyle(el, '::after').content);
        if (/\p{L}/u.test(words) && (ARROW.test(label) || icon)) arrowed.add(label);
    }
    if (arrowed.size >= 2) hit('no-arrow-suffix', `${arrowed.size} calls to action: ${[...arrowed].slice(0, 3).map((label) => `"${short(label)}"`).join(', ')}`);

    // Rhythm: one gap repeated everywhere.
    const gaps = {};
    for (const { el } of all) {
        const kids = [...el.children].map((child) => child.getBoundingClientRect()).filter((rect) => rect.height > 0);
        for (let i = 1; i < kids.length; i++) {
            const gap = Math.round(kids[i].top - kids[i - 1].bottom);
            if (gap > 0) gaps[gap] = (gaps[gap] || 0) + 1;
        }
    }
    const gapTotal = Object.values(gaps).reduce((sum, value) => sum + value, 0);
    const [topGap, topCount] = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (gapTotal >= 10 && topCount / gapTotal >= 0.75) hit('spacing-rhythm', `${Math.round((topCount / gapTotal) * 100)}% of the gaps are ${topGap} px`);

    // Animations that never end
    for (const animation of document.getAnimations()) {
        const target = animation.effect?.target;
        if (!target || animation.effect.getComputedTiming().iterations !== Infinity) continue;
        const rect = target.getBoundingClientRect();
        const value = own(target);
        const parent = target.parentElement && getComputedStyle(target.parentElement);
        if ((rect.width <= 4 && rect.height >= 10) || /^[|▋█_]$/.test(value)) hit('no-blinking-cursor', target.tagName.toLowerCase());
        else if (rect.width <= 24 && rect.height <= 24 && !value) hit('pulse-for-live-only', target.tagName.toLowerCase());
        else if (parent && /(hidden|clip)/.test(parent.overflowX) && (rect.width > target.parentElement.getBoundingClientRect().width * 1.2 || /marquee|ticker/i.test(animation.animationName ?? ''))) hit('no-marquee', short(text(target)));
    }

    // Content that grows out of its grid or flex cell and paints over the next one. The usual cause is a flex item with
    // min-width:auto holding a long nowrap line (truncate without min-w-0): the box widens, the cell does not.
    const layouts = new Map();
    const layoutOf = (el) => layouts.get(el) ?? layouts.set(el, getComputedStyle(el).display).get(el);
    for (const { el, style, rect } of all) {
        const parent = el.parentElement;
        if (!parent || !/flex|grid/.test(layoutOf(parent)) || style.display.startsWith('inline') || style.overflowX !== 'visible' || el.scrollWidth <= el.clientWidth + 1) continue;
        const siblings = [...parent.children].filter((other) => other !== el && other.getBoundingClientRect().width > 0);
        if (!siblings.length) continue;
        let out = null;
        const walk = (node) => {
            for (const child of node.children) {
                const look = getComputedStyle(child);
                if (look.position === 'absolute' || look.position === 'fixed' || look.display === 'none') continue;
                const box = child.getBoundingClientRect();
                const past = Math.max(box.right - rect.right, rect.left - box.left);
                if (box.width > 0 && past > 1 && (!out || past > out.past)) out = { box, past };
                if (look.overflowX === 'visible') walk(child);
            }
        };
        walk(el);
        if (!out) continue;
        const { box } = out;
        const over = siblings.find((other) => {
            const next = other.getBoundingClientRect();
            return Math.min(box.right, next.right) - Math.max(box.left, next.left) > 1 && Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top) > 1;
        });
        if (over) hit('cell-holds-content', `${el.tagName.toLowerCase()} "${short(text(el))}"`, `Runs ${Math.round(out.past)} px past its column onto the next one: ${el.tagName.toLowerCase()} "${short(text(el))}"`);
    }

    // The whole page
    const fonts = {};
    for (const { el, style } of texts) {
        const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        fonts[family] = (fonts[family] || 0) + own(el).length;
    }
    const topFont = Object.entries(fonts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (/^(Inter|Roboto|Fraunces|Geist|Plus Jakarta Sans|Space Grotesk|DM Sans|Poppins|Open Sans)\b/.test(topFont ?? '')) hit('no-overused-font', topFont);
    const page = parse(getComputedStyle(document.body).backgroundColor) ?? parse(getComputedStyle(document.documentElement).backgroundColor);
    if (page && lum(page) > 0.7 && hue(page) >= 30 && hue(page) <= 65 && chroma(page) >= 0.015 && chroma(page) <= 0.12) hit('no-default-cream', hex(page));
    if (document.documentElement.scrollWidth > vw + 1) {
        // Name what sticks out, so the fix has a place to start: the outermost elements past the right edge (a Bootstrap
        // .row with gutters wider than its container's padding is the usual one). Fixed layers do not widen the page.
        const wide = [];
        for (const el of document.body.querySelectorAll('*')) {
            if (wide.length >= 2) break;
            const box = el.getBoundingClientRect();
            if (box.right <= vw + 1 || box.width === 0 || wide.some((outer) => outer.contains(el)) || getComputedStyle(el).position === 'fixed') continue;
            let held = false;
            for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
                if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowX)) { held = true; break; }
            }
            if (!held) wide.push(el);
        }
        const label = (el) => el.tagName.toLowerCase() + [...el.classList].slice(0, 3).map((name) => `.${name}`).join('');
        hit('no-horizontal-overflow', `${document.documentElement.scrollWidth} px at ${vw} px${wide.length ? `: ${wide.map(label).join(', ')}` : ''}`);
    }
    for (const img of document.images) {
        if (!img.getAttribute('src') || (img.complete && !img.naturalWidth && getComputedStyle(img).display !== 'none')) hit('image-not-broken', img.getAttribute('src')?.slice(0, 80) || '(empty src)');
    }

    // Copy
    const copy = text(document.body);
    const dashes = (copy.match(/—| -- /g) ?? []).length;
    if (dashes >= 8 && copy.length / dashes < 500) hit('no-em-dash-saturation', `${dashes} em dashes`);
    const cadence = copy.match(/\b[\p{L}-]+\. (?:No|Just|Not|Only|Never) [\p{L}-]+\.|\bNot an? [\p{L} -]{2,30}\. An? [\p{L} -]{2,30}\./gu) ?? [];
    if (cadence.length >= 3) hit('no-aphorism-cadence', cadence.slice(0, 3).join(' / '));
    const theatre = /\b(?:[\p{L}-]+ theat(?:er|re)\b(?<!\bthe theat(?:er|re))|güvenlik tiyatrosu)/iu.exec(copy);
    if (theatre && /\b(?:compliance|security|productivity|privacy|safety|audit|engineering|process|güvenlik) theat|tiyatrosu/i.test(theatre[0])) hit('no-theater-copy', theatre[0]);

    // Against a declared design system
    if (designSystem) {
        const drift = (kind, value) => hit('design-system-drift', `${kind} ${value}`);
        const usedColors = new Set();
        const lower = (list) => (list ?? []).map((item) => String(item).toLowerCase());
        for (const { style } of texts) {
            const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
            if (designSystem.fonts && !lower(designSystem.fonts).includes(family.toLowerCase())) drift('font', family);
            if (designSystem.sizes && !designSystem.sizes.includes(px(style.fontSize))) drift('size', `${px(style.fontSize)}px`);
        }
        for (const { style } of all) {
            if (designSystem.radii && px(style.borderRadius) > 0 && !designSystem.radii.includes(px(style.borderRadius))) drift('radius', `${px(style.borderRadius)}px`);
            const fill = parse(style.backgroundColor);
            if (fill) usedColors.add(hex(fill));
            const ink = parse(style.color);
            if (ink) usedColors.add(hex(ink));
        }
        if (designSystem.colors) for (const color of usedColors) if (!lower(designSystem.colors).includes(color)) drift('colour', color);
    }

    return found;
}
