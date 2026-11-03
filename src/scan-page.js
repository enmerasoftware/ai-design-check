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
    const shadows = (value) => (value === 'none' ? [] : value.split(/,(?![^(]*\))/).map((part) => {
        const color = /rgba?\([^)]*\)/.exec(part)?.[0];
        const [x = 0, y = 0, blur = 0, spread = 0] = (part.replace(color, '').match(/-?[\d.]+px/g) ?? []).map(px);
        return { color: parse(color), x, y, blur, spread };
    }));
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
        const rows = Math.round(rect.height / height);
        if (rows >= 2 && value.length >= 30) {
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
    if (h1) {
        const size = px(h1.style.fontSize);
        const serif = (family) => /serif|Fraunces|Recoleta|Playfair|Newsreader|Instrument|Georgia|Lora|Cormorant|Times/i.test(family) && !/sans-serif/i.test(family);
        const emphasis = [...h1.el.querySelectorAll('em, i, span')].some((item) => getComputedStyle(item).fontStyle === 'italic' && serif(getComputedStyle(item).fontFamily));
        if (size >= 40 && ((h1.style.fontStyle === 'italic' && serif(h1.style.fontFamily)) || emphasis)) hit('no-italic-serif-hero', short(text(h1.el)));
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
    for (const heading of headings) {
        const prev = heading.el.previousElementSibling;
        if (prev && /^H[1-3]$/.test(heading.tag)) {
            const style = getComputedStyle(prev);
            const value = text(prev);
            const small = px(style.fontSize) <= 14 && value.length > 0 && value.length <= 40 && !prev.querySelector('a, button, img, svg') && !['A', 'NAV', 'BUTTON'].includes(prev.tagName);
            const shouted = style.textTransform === 'uppercase' || px(style.letterSpacing) / px(style.fontSize) >= 0.05 || (value === value.toUpperCase() && /\p{Lu}/u.test(value));
            if (small && shouted && !/^0?\d+[.)]?$/.test(value)) hit('no-eyebrow-label', value);
        }
    }
    const numbered = headings.filter(({ el }) => /^0?\d{1,2}[.)]?$/.test(text(el.previousElementSibling ?? document.createElement('i'))));
    if (numbered.length >= 2) hit('no-section-numbers', numbered.map(({ el }) => text(el.previousElementSibling)).join(', '));

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
    for (const { el, style, rect, tag } of all) {
        // Shadows
        for (const shadow of shadows(style.boxShadow)) {
            if (!shadow.color) continue;
            if (chroma(shadow.color) > 0.2 && !shadow.x && !shadow.y && shadow.blur >= 8) hit('glow-in-charts-only', `${tag.toLowerCase()}: ${shadow.blur} px glow`);
            if ((Math.abs(shadow.x) >= 4 || Math.abs(shadow.y) >= 4) && !shadow.blur && shadow.color.a > 0.3) hit('no-hard-offset-shadow', `${tag.toLowerCase()}: ${shadow.x} ${shadow.y} 0`);
        }
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
            const stops = (image.match(/rgba?\([^)]*\)/g) ?? []).map(parse).filter(Boolean);
            const fading = /transparent|rgba\([^)]*,\s*0\)/.test(image);
            if (/radial-gradient/.test(image) && fading && rect.width >= 240 && rect.height >= 120 && stops.some((stop) => chroma(stop) > 0.2)) hit('no-radial-halo', `${tag.toLowerCase()}: ${short(text(el)) || 'background'}`);
            if (/gradient/.test(image) && rect.width >= 120 && stops.some((stop) => chroma(stop) > 0.3 && hue(stop) >= 245 && hue(stop) <= 320)) hit('no-ai-gradients', `${tag.toLowerCase()}: purple gradient`);
            if (/repeating-(linear|radial)-gradient/.test(image) && rect.width >= 200 && rect.height >= 100) hit('no-stripe-surface', tag.toLowerCase());
            if ((image.match(/linear-gradient/g) ?? []).length >= 2 && /\d+px/.test(style.backgroundSize) && rect.width >= 200 && rect.height >= 150 && !/repeating/.test(image)) hit('no-grid-wallpaper', `${tag.toLowerCase()}: ${style.backgroundSize}`);
            if (/url\(/.test(image) && /gradient/.test(image.split('url(')[0])) {
                const wash = (image.split('url(')[0].match(/rgba?\([^)]*\)/g) ?? []).map(parse).filter(Boolean);
                if (wash.length && wash.every((stop) => stop.a >= 0.9)) hit('no-buried-image', `${tag.toLowerCase()}: picture under a solid wash`);
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
                if (out >= 8 && box.width >= 60 && box.height >= 24 && text(child) && out < box.height && inner.transform === 'none') hit('no-clipped-popover', short(text(child)));
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

    // The whole page
    const fonts = {};
    for (const { el, style } of texts) {
        const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        fonts[family] = (fonts[family] || 0) + own(el).length;
    }
    const topFont = Object.entries(fonts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (/^(Inter|Roboto|Fraunces|Geist|Plus Jakarta Sans|Space Grotesk|DM Sans|Poppins|Open Sans)\b/.test(topFont ?? '')) hit('no-overused-font', topFont);
    const page = parse(getComputedStyle(document.body).backgroundColor) ?? parse(getComputedStyle(document.documentElement).backgroundColor);
    if (page && lum(page) > 0.8 && hue(page) >= 30 && hue(page) <= 65 && chroma(page) >= 0.015 && chroma(page) <= 0.12) hit('no-default-cream', hex(page));
    if (document.documentElement.scrollWidth > vw + 1) hit('no-horizontal-overflow', `${document.documentElement.scrollWidth} px at ${vw} px`);
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
