import { balancedEnd, blankComments } from './classes.js';
import { hexToOklch, rgbToHex } from './color.js';
import { parseAttrs, readTag } from './jsx.js';

/**
 * Plain CSS, SCSS and style="" attributes read declaration by declaration, without a parser dependency. Every offset
 * points into the file as written, so a finding names its line and --fix can change the exact text.
 */

const blank = (text) => text.replace(/[^\n]/g, ' ');
const pattern = (source) => (source ? new RegExp(source, 'iu') : null);

/**
 * SCSS read as CSS: comments, #{} interpolation, @use/@forward/@import/@include statements and $variable definitions
 * blanked. A definition is not a value in use; the scale reader reads them from the source instead.
 */
export function scssAsCss(source) {
    return blankComments(source, true)
        .replace(/#\{[^{}]*\}/g, blank)
        .replace(/@(?:use|forward|import|include)\b[^;{}]*;/g, blank)
        .replace(/(?<=(?:^|[;{}])\s*)\$[\w-]+\s*:[^;{}]*;?/g, blank);
}

/** Splits at a separator outside brackets and quotes: a selector list, the entries of a map. */
export function splitTop(text, separator = ',') {
    const parts = [];
    let depth = 0;
    let quote = null;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quote) {
            if (char === '\\') i++;
            else if (char === quote) quote = null;
        } else if (char === '"' || char === "'") quote = char;
        else if ('([{'.includes(char)) depth++;
        else if (')]}'.includes(char)) depth--;
        else if (char === separator && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(text.slice(start));

    return parts.map((part) => part.trim()).filter(Boolean);
}

/** The element a selector styles: its last compound ("a:hover" in ".nav > a:hover"). */
export function subjectOf(selector) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < selector.length; i++) {
        const char = selector[i];
        if (char === '(' || char === '[') depth++;
        else if (char === ')' || char === ']') depth--;
        else if (depth === 0 && /[\s>+~]/.test(char)) start = i + 1;
    }

    return selector.slice(start).trim();
}

/** A nested selector in full: "&:hover" in ".card" is ".card:hover", ".title" in ".card" is ".card .title". */
const nest = (parent, child) => (parent ? splitTop(child).flatMap((kid) => splitTop(parent).map((outer) => (kid.includes('&') ? kid.replaceAll('&', outer) : `${outer} ${kid}`))).join(', ') : child);

function declaration(css, from, to) {
    const text = css.slice(from, to);
    const head = /^\s*(-{0,2}[a-zA-Z][\w-]*)\s*:/.exec(text);
    if (!head) return null;
    const start = from + text.length - text.trimStart().length;
    const end = from + text.trimEnd().length;

    return { property: head[1].toLowerCase(), start, valueStart: from + head[0].length, end, value: css.slice(from + head[0].length, end) };
}

/**
 * Rule blocks of a stylesheet whose comments are already blanked: the selector with nesting resolved (an at-rule such as
 * @media keeps its parent's) and its own declarations. Each region is read on its own, so one broken <style> cannot
 * swallow the next; a region with a selector is a style attribute, its declarations a block of their own.
 */
export function cssBlocks(css, regions = [{ start: 0, end: css.length }]) {
    const blocks = [];
    for (const { start, end, selector = '' } of regions) {
        const root = { selector, decls: [], open: start - 1 };
        const stack = [root];
        let mark = start;
        let depth = 0;
        const flush = (to) => {
            const found = declaration(css, mark, to);
            if (found) stack.at(-1).decls.push(found);
        };
        for (let i = start; i < end; i++) {
            const char = css[i];
            if (char === '"' || char === "'") {
                let close = i + 1;
                while (close < end && css[close] !== char && css[close] !== '\n') close += css[close] === '\\' ? 2 : 1;
                i = close;
            } else if (char === '(') depth++;
            else if (char === ')') depth = Math.max(0, depth - 1);
            else if (char === '{') {
                const prelude = css.slice(mark, i).trim();
                const parent = stack.at(-1).selector;
                stack.push({ selector: prelude.startsWith('@') ? parent : nest(parent, prelude), decls: [], open: i });
                mark = i + 1;
                depth = 0;
            } else if (char === '}') {
                flush(i);
                if (stack.length > 1) blocks.push(stack.pop());
                mark = i + 1;
                depth = 0;
            } else if (char === ';' && depth === 0) {
                flush(i);
                mark = i + 1;
            }
        }
        flush(end);
        blocks.push(root);
    }

    return blocks.filter((block) => block.decls.length > 0).sort((a, b) => a.open - b.open);
}

/** A style attribute's selector, written from its element: <button class="btn btn-primary"> is button.btn.btn-primary. */
function selectorOf(tag) {
    const attrs = parseAttrs(tag.attrs);
    const classes = typeof attrs.class === 'string' ? attrs.class.replace(/\{\{[\s\S]*?\}\}|\{[^{}]*\}/g, ' ').split(/\s+/).filter((name) => /^[\w-]+$/.test(name)) : [];
    const type = typeof attrs.type === 'string' && /^[\w-]+$/.test(attrs.type) ? `[type=${attrs.type}]` : '';

    return `${tag.name.toLowerCase()}${classes.map((name) => `.${name}`).join('')}${type}`;
}

/**
 * style="" attributes in HTML, Blade, Vue and Svelte: { open, close } are the offsets of the quotes, so the body sits
 * between them. Template expressions ({{ }}, { }) are blanked; :style and v-bind:style are JavaScript, not CSS.
 */
export function inlineStyles(source) {
    const found = [];
    for (const match of source.matchAll(/(?<=\s)style\s*=\s*(["'])/g)) {
        const tagStart = source.lastIndexOf('<', match.index);
        const tag = tagStart < 0 ? null : readTag(source, tagStart);
        const open = match.index + match[0].length - 1;
        const close = source.indexOf(match[1], open + 1);
        if (!tag || close < 0 || tag.end <= close) continue;
        found.push({ open, close, body: source.slice(open + 1, close).replace(/\{\{[\s\S]*?\}\}|\{[^{}]*\}/g, blank), selector: selectorOf(tag) });
    }

    return found;
}

/**
 * A markup file as a stylesheet: everything outside <style> blocks and style attributes blanked, offsets kept. Each
 * attribute body becomes a block of its own ({ … } in place of the quotes), so no declaration reaches into the next.
 */
export function markupSheet(source, { inline = true } = {}) {
    const pieces = [];
    const regions = [];
    for (const match of source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
        const start = match.index + match[0].indexOf('>') + 1;
        pieces.push([start, /\blang\s*=\s*["']scss["']/i.test(match[1]) ? scssAsCss(match[2]) : blankComments(match[2], false)]);
        regions.push({ start, end: start + match[2].length });
    }
    for (const style of inline ? inlineStyles(source) : []) {
        // A style="" inside a <style> block is CSS text, not an attribute.
        if (regions.some((region) => style.open >= region.start && style.open < region.end)) continue;
        pieces.push([style.open, `{${style.body}}`]);
        regions.push({ start: style.open + 1, end: style.close, selector: style.selector });
    }
    let css = '';
    let at = 0;
    for (const [start, text] of pieces.sort((a, b) => a[0] - b[0])) {
        css += blank(source.slice(at, start)) + text;
        at = start + text.length;
    }

    return { css: css + blank(source.slice(at)), regions: regions.sort((a, b) => a.start - b.start) };
}

/** The text with every parenthesised part blanked: calc(), var() fallbacks and other functions are not plain values. */
function outsideFunctions(text) {
    let depth = 0;
    let out = '';
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') depth++;
        out += depth > 0 ? ' ' : text[i];
        if (text[i] === ')') depth = Math.max(0, depth - 1);
    }

    return out;
}

/** px and rem lengths written as plain values, each with its offset: "13px" and "7px" in "13px auto 7px". */
function lengthsIn(css, decl) {
    const text = outsideFunctions(css.slice(decl.valueStart, decl.end));

    return [...text.matchAll(/(?<![\w.#$-])-?(?:\d+\.?\d*|\.\d+)(px|rem)(?![\w%-])/gi)].map((match) => ({ index: decl.valueStart + match.index, value: match[0], property: decl.property, number: Number(match[0].slice(0, -match[1].length)), unit: match[1].toLowerCase() }));
}

/** Gradient functions in a value, with their offsets. */
function gradientsIn(css, decl) {
    const text = css.slice(decl.valueStart, decl.end);

    return [...text.matchAll(/(?<![\w-])(?:-(?:webkit|moz|o)-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi)].map((match) => {
        const end = balancedEnd(text, match.index + match[0].length - 1, '(', ')');

        return { index: decl.valueStart + match.index, value: text.slice(match.index, end < 0 ? text.length : end), property: decl.property };
    });
}

/** Named colours near the purple family; any other name is not one of its colours, so it needs no entry. */
const NAMED = {
    blueviolet: '#8a2be2', darkmagenta: '#8b008b', darkorchid: '#9932cc', darkslateblue: '#483d8b', darkviolet: '#9400d3', fuchsia: '#ff00ff',
    indigo: '#4b0082', lavender: '#e6e6fa', magenta: '#ff00ff', mediumorchid: '#ba55d3', mediumpurple: '#9370db', mediumslateblue: '#7b68ee',
    mediumvioletred: '#c71585', midnightblue: '#191970', orchid: '#da70d6', plum: '#dda0dd', purple: '#800080', rebeccapurple: '#663399',
    slateblue: '#6a5acd', thistle: '#d8bfd8', violet: '#ee82ee',
};

const channel = (raw, scale) => (raw.endsWith('%') ? (parseFloat(raw) / 100) * scale : parseFloat(raw));
const hueOf = (raw) => {
    const number = parseFloat(raw);
    if (/turn$/i.test(raw)) return number * 360;
    if (/grad$/i.test(raw)) return number * 0.9;
    if (/rad$/i.test(raw)) return (number * 180) / Math.PI;

    return number;
};

function hslToRgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);

    return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
}

/** Colours in a value as OKLCH chroma and hue: hex, rgb(), hsl(), oklch() and named colours. */
export function colorsIn(text) {
    const colors = [];
    const oklch = (hex) => colors.push(hexToOklch(hex));
    for (const match of text.matchAll(/#([0-9a-f]{3,8})(?![\w-])|\b(rgba?|hsla?|oklch)\(([^()]*)\)|(?<![\w#-])([a-z]+)(?![\w-])/gi)) {
        const [, hex, fn, args, name] = match;
        if (hex) {
            if (hex.length === 3 || hex.length === 4) oklch(`#${[...hex.slice(0, 3)].map((char) => char + char).join('')}`);
            else if (hex.length === 6 || hex.length === 8) oklch(`#${hex.slice(0, 6)}`);
        } else if (fn) {
            const parts = args.split(/[\s,/]+/).filter(Boolean);
            if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(parseFloat(part)))) continue;
            const kind = fn.toLowerCase();
            if (kind === 'oklch') colors.push({ c: channel(parts[1], 0.4), h: hueOf(parts[2]) });
            else if (kind.startsWith('rgb')) oklch(rgbToHex(parts.slice(0, 3).map((part) => channel(part, 255) / 255)));
            else oklch(rgbToHex(hslToRgb(((hueOf(parts[0]) % 360) + 360) % 360, channel(parts[1], 100) / 100, channel(parts[2], 100) / 100)));
        } else if (NAMED[name.toLowerCase()]) oklch(NAMED[name.toLowerCase()]);
    }

    return colors;
}

/** Below this chroma a colour reads as grey, whatever its hue (zinc and slate lean blue-violet). */
const MIN_CHROMA = 0.03;
const inHue = ([from, to]) => ({ c, h }) => c >= MIN_CHROMA && (from <= to ? h >= from && h <= to : h >= from || h <= to);

const ownText = (block) => block.decls.map((decl) => `${decl.property}: ${decl.value.trim()}`).join('; ');
/**
 * A selector without its state: ".btn:focus" and ".btn:focus-visible" style the same element. A bare ":focus-visible"
 * stands in only for "*:focus": against "button:focus" it loses on specificity, so it is no replacement there.
 */
const stateless = (selector) => selector.replace(/:not\([^()]*\)/g, '').replace(/(?<!:):[a-z-]+(?![\w(-])/gi, '').replace(/\s+/g, ' ').trim().replace(/^\*$/, '');

/**
 * One object entry of a rule's "css" list, read declaration by declaration in a sheet ({ css, regions }):
 *   property        the properties it reads, as whole names; any when absent
 *   value           what the value must hold; with "above", group 1 is a number that must be larger
 *   scale           "spacing" or "radius": every px or rem length outside a function is a hit (the caller judges it)
 *   gradient        every gradient function is a hit; with "hue": [from, to], only one with a colour in that OKLCH range
 *   selector        the block's selector, any part of it; "subject" is the element it styles (the last compound)
 *   unlessSelector  selector parts the entry does not apply to
 *   with, unless    the block's own declarations ("property: value; …") must, or must not, match
 *   unlessRule      a pseudo-class: a block elsewhere in the file for the same element with it, matching "unless", rules the block out
 * Hits are { index, value, property }, plus number and unit for a scale. A whole declaration counts once per block.
 */
export function cssHits(sheet, entry) {
    sheet.blocks ??= cssBlocks(sheet.css, sheet.regions);
    const property = entry.property ? new RegExp(`^(?:${entry.property})$`, 'iu') : null;
    const [selector, subject, unlessSelector, withText, unless, unlessRule] = [entry.selector, entry.subject, entry.unlessSelector, entry.with, entry.unless, entry.unlessRule].map(pattern);
    const value = entry.value ? new RegExp(entry.value, 'giu') : null;
    const replaced = (block, part) => sheet.blocks.some((other) => other !== block && (!unless || unless.test(ownText(other))) && splitTop(other.selector).some((candidate) => unlessRule.test(candidate.replace(/:not\([^()]*\)/g, '')) && stateless(candidate) === stateless(part)));
    const holds = (decl) => !value || [...decl.value.matchAll(value)].some((match) => entry.above === undefined || Number(match[1]) > entry.above);
    const hits = [];
    for (const block of sheet.blocks) {
        const parts = splitTop(block.selector).filter((part) => !(unlessSelector && unlessSelector.test(part)) && (!selector || selector.test(part)) && (!subject || subject.test(subjectOf(part))));
        if ((selector || subject || unlessSelector) && parts.length === 0) continue;
        const own = ownText(block);
        if ((withText && !withText.test(own)) || (unless && unless.test(own))) continue;
        if (unlessRule && parts.every((part) => replaced(block, part))) continue;
        for (const decl of block.decls.filter((item) => !property || property.test(item.property))) {
            if (entry.scale) hits.push(...lengthsIn(sheet.css, decl));
            else if (entry.gradient) hits.push(...gradientsIn(sheet.css, decl).filter((call) => !entry.hue || colorsIn(call.value).some(inHue(entry.hue))));
            else if (holds(decl)) {
                hits.push({ index: decl.start, value: sheet.css.slice(decl.start, decl.end), property: decl.property });
                break;
            }
        }
    }

    return hits;
}
