import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { balancedEnd, blankComments } from './classes.js';

/**
 * The project's spacing scale, read in this order: the config file, Tailwind 4 @theme, a Tailwind 3 config, CSS variables
 * in :root, then the 4 px default. A scale is { base, values, source }: a value is on it when it is a multiple of base or
 * listed in values. Nothing is guessed and no project code runs: a source that cannot be read leaves the default and a note.
 */
const DEFAULT_BASE = 4;
const ROOT_BLOCK = /(?:^|[\s,;{}])(?::root|html)\s*(?:,[^{}]*)?\{/g;
const SPACING_UTILITY = /(?:^|[\s:-])(?:[mp][xytrblse]?|gap(?:-[xy])?|space-[xy])-\[/;

const fallback = (note) => ({ base: DEFAULT_BASE, values: [], source: 'default', ...(note ? { note } : {}) });
const tidy = (values) => [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b);
const blocks = (css, opener) => [...css.matchAll(opener)].map((match) => {
    const open = match.index + match[0].length - 1;

    return css.slice(open + 1, Math.max(open + 1, balancedEnd(css, open) - 1));
});

/** px for "6px", "0.375rem" and "0"; null for anything else (calc, var, clamp, em, a rem with an unknown root size). */
function toPx(raw, rem) {
    const match = /^([\d.]+)(px|rem)?$/.exec(raw.trim());
    if (!match) return null;
    if (Number(match[1]) === 0) return 0;
    if (match[2] === 'px') return Number(match[1]);

    return match[2] === 'rem' && rem ? Number(match[1]) * rem : null;
}

/** Pixels per rem: 16 unless html or :root sets a font size; null when it does in a way one number cannot describe. */
function remSize(sheets) {
    const sizes = new Set(sheets.flatMap(({ css }) => blocks(css, ROOT_BLOCK).flatMap((body) => [...body.matchAll(/(?:^|[\s;{])font-size\s*:\s*([^;}]+)/g)].map((match) => match[1].trim()))));
    if (sizes.size === 0) return 16;
    if (sizes.size > 1) return null;
    const match = /^([\d.]+)(px|%)$/.exec([...sizes][0]);
    if (!match) return null;

    return match[2] === 'px' ? Number(match[1]) : (Number(match[1]) * 16) / 100;
}

/** A number, a list, or { base, values }, as written in the config file. */
function fromConfig(raw, source) {
    const shape = typeof raw === 'number' ? { base: raw } : Array.isArray(raw) ? { values: raw } : raw;
    const positive = (value) => Number.isFinite(value) && value > 0;
    if (!shape || typeof shape !== 'object' || (shape.base === undefined && shape.values === undefined)) return null;
    if (shape.base !== undefined && !positive(shape.base)) return null;
    if (shape.values !== undefined && !(Array.isArray(shape.values) && shape.values.length > 0 && shape.values.every(positive))) return null;

    return { base: shape.base ?? null, values: tidy(shape.values ?? []), source };
}

/** Tailwind 4: --spacing is the grid (0.25rem unless changed), --spacing-* add named steps, --spacing-*: initial clears them. */
function fromTheme(sheets, rem) {
    const found = [];
    for (const { path, css } of sheets) {
        let base;
        const named = new Map();
        for (const body of blocks(css, /@theme\b[^{;]*\{/g)) {
            for (const [, name, value] of body.matchAll(/(--[\w*-]+)\s*:\s*([^;}]+)/g)) {
                if (name === '--*' || name === '--spacing-*') {
                    if (value.trim() === 'initial') {
                        base = null;
                        named.clear();
                    }
                } else if (name === '--spacing') {
                    base = value.trim() === 'initial' ? null : (toPx(value, rem) || NaN);
                } else if (name.startsWith('--spacing-')) {
                    named.set(name, toPx(value, rem));
                }
            }
        }
        if (base !== undefined || named.size > 0) found.push({ path, base, named });
    }
    if (found.length === 0) return null;
    const unreadable = found.find(({ base, named }) => Number.isNaN(base) || [...named.values()].includes(null));
    if (unreadable) return fallback(`${unreadable.path}: @theme spacing is not a plain px or rem value, default used`);
    const bases = new Set(found.map(({ base }) => base).filter((base) => base !== undefined));
    const steps = new Map();
    for (const { named } of found) for (const [name, value] of named) steps.set(name, [...(steps.get(name) ?? []), value]);
    if (bases.size > 1 || [...steps.values()].some((list) => new Set(list).size > 1)) return fallback(`${found.map(({ path }) => path).join(', ')} set different @theme spacing, default used`);
    const base = bases.size === 0 ? DEFAULT_BASE : [...bases][0];
    const values = tidy([...steps.values()].map(([value]) => value).filter((value) => value > 0));
    if (!base && values.length === 0) return null;

    return { base: base || null, values, source: `${found.map(({ path }) => path).join(', ')}, @theme` };
}

/** The same text with everything inside nested brackets blanked, so a key found in it belongs to this object. */
function shallow(body) {
    let depth = 0;
    let out = '';
    for (let i = 0; i < body.length; i++) {
        const char = body[i];
        if (char === '"' || char === "'" || char === '`') {
            let end = i + 1;
            while (end < body.length && body[end] !== char) end += body[end] === '\\' ? 2 : 1;
            out += depth === 0 ? body.slice(i, end + 1) : ' '.repeat(end + 1 - i);
            i = end;
        } else {
            if (/[)\]}]/.test(char)) depth--;
            out += depth === 0 ? char : ' ';
            if (/[([{]/.test(char)) depth++;
        }
    }

    return out;
}

/** What a key holds in an object body: undefined when absent, null when it is not an object literal, else its inner text. */
function objectAt(body, key) {
    const match = new RegExp(`(?:^|[\\s,])['"]?${key}['"]?\\s*:\\s*`).exec(shallow(body));
    if (!match) return undefined;
    const open = match.index + match[0].length;
    if (body[open] !== '{') return null;
    const end = balancedEnd(body, open);

    return end < 0 ? null : body.slice(open + 1, end - 1);
}

/** Lengths of a { sm: '6px', 2: '0.5rem' } literal; null when it holds anything else. */
function lengths(body, rem) {
    const values = [];
    const left = body.replace(/(?:[\w$-]+|'[^']*'|"[^"]*")\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`)\s*(?:,|$)/g, (_, one, two, three) => {
        values.push(toPx(one ?? two ?? three, rem));

        return '';
    });

    return left.trim() === '' && !values.includes(null) ? values.filter((value) => value > 0) : null;
}

/** Tailwind 3: read as text, never run. theme.spacing replaces the steps, theme.extend.spacing adds to the 4 px default. */
function fromTailwindConfig(cwd, paths, rem) {
    const found = [];
    const spread = (body) => shallow(body).includes('...');
    for (const path of paths) {
        const code = blankComments(readFileSync(join(cwd, path), 'utf8'));
        const unreadable = fallback(`${path}: spacing is not a plain list, default used`);
        if (/\bpresets\s*:/.test(code)) return fallback(`${path}: spacing may come from a preset, default used`);
        const start = /\btheme\s*:\s*\{/.exec(code);
        if (!start) {
            if (/\btheme\s*:|\bspacing\s*:/.test(code)) return unreadable;
            continue;
        }
        const open = start.index + start[0].length - 1;
        const theme = code.slice(open + 1, Math.max(open + 1, balancedEnd(code, open) - 1));
        const extend = objectAt(theme, 'extend');
        if (extend === null || spread(theme) || (extend && spread(extend))) return unreadable;
        const replaced = objectAt(theme, 'spacing');
        const added = extend ? objectAt(extend, 'spacing') : undefined;
        if (replaced === undefined && added === undefined) continue;
        const steps = [replaced, added].filter((body) => body !== undefined).map((body) => (body === null ? null : lengths(body, rem)));
        if (steps.includes(null)) return unreadable;
        found.push({ path, scale: { base: replaced === undefined ? DEFAULT_BASE : null, values: tidy(steps.flat()) } });
    }
    if (found.length === 0) return null;
    if (new Set(found.map(({ scale }) => JSON.stringify(scale))).size > 1) return fallback(`${found.map(({ path }) => path).join(', ')} set different spacing, default used`);

    return { ...found[0].scale, source: found.map(({ path }) => path).join(', ') };
}

/** :root variables: --spacing is the grid Tailwind 4 multiplies; --space-* and --spacing-* only add steps to the default. */
function fromVariables(sheets, rem) {
    const paths = new Set();
    const grids = new Set();
    const values = [];
    for (const { path, css } of sheets) {
        for (const body of blocks(css, ROOT_BLOCK)) {
            for (const [, name, value] of body.matchAll(/(--spac(?:e|ing)(?:-[\w-]+)?)\s*:\s*([^;}]+)/g)) {
                const px = toPx(value, rem);
                if (name === '--spacing') grids.add(px || NaN);
                else if (px > 0) values.push(px);
                if (name === '--spacing' || px > 0) paths.add(path);
            }
        }
    }
    if (paths.size === 0) return null;
    if (grids.size > 1 || [...grids].some(Number.isNaN)) return fallback(`${[...paths].join(', ')}: --spacing is not one px or rem value, default used`);

    return { base: [...grids][0] ?? DEFAULT_BASE, values: tidy(values), source: `${[...paths].join(', ')}, CSS variables` };
}

/**
 * Scales for web code and for SwiftUI and Compose. Theirs comes only from the config file: spacing in app code has no
 * shared place to read it from, and a web theme next to an app says nothing about the app.
 */
export function readScales(cwd, { spacing: raw, configFile }, files) {
    const invalid = fallback(`${configFile}: "spacing" must be a number, a list of numbers or { "base", "values" }, default used`);
    const set = (value) => (value === undefined ? undefined : (fromConfig(value, configFile) ?? invalid));
    const isObject = raw && typeof raw === 'object' && !Array.isArray(raw);
    const { native: nativeRaw, ...webRaw } = isObject ? raw : {};
    const web = set(isObject ? (Object.keys(webRaw).length > 0 ? webRaw : undefined) : raw);
    const native = set(nativeRaw) ?? web ?? fallback();

    return {
        web: web ?? projectScale(cwd, files),
        native,
        present: { web: files.some((path) => /\.(?:tsx|jsx|vue|svelte|html|blade\.php)$/.test(path)), native: files.some((path) => /\.(?:swift|kt|dart)$/.test(path)) || readsReactNative(cwd) },
    };
}

function readsReactNative(cwd) {
    try {
        return /"react-native"\s*:/.test(readFileSync(join(cwd, 'package.json'), 'utf8'));
    } catch {
        return false;
    }
}

/** Built CSS (a published vendor bundle, say) carries its framework's defaults, not this project's decision. */
const isBuilt = (css) => css.length / (css.split('\n').length) > 500;

function projectScale(cwd, files) {
    const sheets = files.filter((path) => path.endsWith('.css')).map((path) => ({ path, source: readFileSync(join(cwd, path), 'utf8') })).filter(({ source }) => !isBuilt(source)).map(({ path, source }) => ({ path, css: blankComments(source, false) }));
    const rem = remSize(sheets);

    return fromTheme(sheets, rem)
        ?? fromTailwindConfig(cwd, files.filter((path) => /(?:^|\/)tailwind\.config\.(?:js|cjs|mjs|ts|cts|mts)$/.test(path)), rem)
        ?? fromVariables(sheets, rem)
        ?? fallback();
}

const greatestDivisor = (values) => {
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

    return values.map((value) => Math.round(value * 100)).reduce(gcd) / 100;
};
const multipleOf = (value, grid) => Math.abs(value / grid - Math.round(value / grid)) < 1e-6;

/**
 * 1–2 px hairlines always pass. With a list and no grid, margins, paddings and gaps must be on the list; a width, height
 * or offset only has to fit the list's common divisor, since a scale of gaps says little about sizes.
 */
export function onScale(scale, value, token = 'p-[') {
    if (value <= 2 || scale.values.includes(value)) return true;
    if (scale.base) return multipleOf(value, scale.base);

    return !SPACING_UTILITY.test(token) && multipleOf(value, greatestDivisor(scale.values));
}

/** The closest value the scale allows; a tie goes up. */
export function nearestOnScale(scale, value) {
    const steps = [...scale.values];
    if (scale.base) steps.push(Math.floor(value / scale.base) * scale.base, Math.ceil(value / scale.base) * scale.base);
    if (steps.length === 0) return value;

    return steps.reduce((best, step) => {
        const gap = Math.abs(step - value) - Math.abs(best - value);

        return gap < 0 || (gap === 0 && step > best) ? step : best;
    });
}

export function describeScale(scale, unit = 'px') {
    const list = scale.values.join(', ');
    const steps = scale.base ? `${scale.base} ${unit} grid${list ? ` plus ${list} ${unit}` : ''}` : `${list} ${unit}`;

    return `${steps} (${scale.source})`;
}

/** The report's lines: what was used, and why the default stands when a source could not be read. */
export function scaleLines({ web, native, present }) {
    const nativeSource = native.source === 'default' ? { ...native, source: 'default; app code is not read for a scale' } : native;
    const lines = [];
    if (present.web) lines.push(`Spacing scale: ${describeScale(web)}.`, ...(web.note ? [`  ${web.note}.`] : []));
    if (present.native) lines.push(`Spacing scale for app code: ${describeScale(nativeSource, 'pt/dp')}.`, ...(native.note && native.note !== web.note ? [`  ${native.note}.`] : []));

    return lines;
}
