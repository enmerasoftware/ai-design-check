import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, walk } from './check.js';
import { RADIUS_STEPS as RADIUS_PX, SPACING_PROPERTY, nearestOnScale } from './spacing.js';

/**
 * --fix: the findings with one mechanical answer, changed without an agent. A value moves to the nearest step of the
 * project's scale (a tie goes up: a little more room rather than less). Everything that takes a decision (colour, tap
 * size, emoji, words, hierarchy) stays in the report.
 */

const SPACING_CLASS = /^((?:[\w-]+:)*)(-?)([mp][xytrblse]?|gap(?:-[xy])?|space-[xy])-\[(\d+(?:\.\d+)?)px\]$/;
const RADIUS_CLASS = /^(.*?)(rounded(?:-[a-z]{1,2})?)-\[(\d+(?:\.\d+)?)px\]$/;
/** The steps Tailwind 3 and 4 name the same. */
const RADIUS_STEPS = [[6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl']];
const LAST_NUMBER = /\d+(?:\.\d+)?(?!.*\d)/;
/** Tailwind 3 names only these steps; 4 names them all. Anything else stays a bracket value, which works on both. */
const NAMED_STEPS = new Set([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96]);
const nearestStep = (value, step) => Math.floor(value / step + 0.5) * step;
const hasThemeSteps = ({ base, source }) => Boolean(base) && (source === 'default' || /@theme|tailwind/i.test(source));

function spacing(value, scales) {
    const name = SPACING_CLASS.exec(value);
    if (!name) {
        if (/[[\]]/.test(value)) return null; // a size (h-[31px]) is not rounded: the box may depend on it
        const number = Number(LAST_NUMBER.exec(value)?.[0]);

        return value.replace(LAST_NUMBER, String(nearestOnScale(scales.native, number)));
    }
    const [, prefix, minus, utility, raw] = name;
    const number = nearestOnScale(scales.web, Number(raw));
    const onGrid = scales.web.base && number % scales.web.base === 0;

    const step = number / scales.web.base;

    return `${prefix}${minus}${utility}-${onGrid && hasThemeSteps(scales.web) && NAMED_STEPS.has(step) ? step : `[${number}px]`}`;
}

function radius(value, themed) {
    const name = RADIUS_CLASS.exec(value);
    if (!name) return /[[\]]/.test(value) ? null : value.replace(LAST_NUMBER, String(nearestStep(Number(LAST_NUMBER.exec(value)[0]), 4)));
    if (themed) return null;
    const [, prefix, utility, raw] = name;
    const [step, label] = RADIUS_STEPS.reduce((best, item) => (Math.abs(item[0] - raw) <= Math.abs(best[0] - raw) ? item : best));

    return Math.abs(step - raw) <= 3 ? `${prefix}${utility}-${label}` : null;
}

/**
 * A px or rem length in a stylesheet, a style attribute or SCSS, each number on its own: a margin, padding or gap moves
 * on the web scale; a corner moves to a radius step within 3 px, as a rounded-[…] class does. A rem is read at the root
 * size the report used, and stays a rem (0.45rem → 0.5rem at 16 px). An offset (top, inset) is left in the report like a size, and
 * so is em, whose px depend on the element's own font size.
 */
function cssLength(finding, scales) {
    const length = /^(-?)(\d*\.?\d+)(px|rem)$/.exec(finding.value);
    if (!length) return null;
    const [, minus, raw, unit] = length;
    // The report has already read the rem at the project's root size: "0.45rem (7.2px)". No px there, no fix.
    const root = unit === 'rem' ? Number(/\((-?\d*\.?\d+)px\)/.exec(finding.message ?? '')?.[1]) / Number(raw) : 1;
    if (!(root > 0)) return null;
    const number = Number(raw) * root;
    const write = (px) => `${minus}${unit === 'rem' ? `${Number((px / root).toFixed(4))}rem` : `${px}px`}`;
    if (finding.rule === 'radius-scale') {
        const step = [5, ...RADIUS_PX].reduce((best, item) => (Math.abs(item - number) <= Math.abs(best - number) ? item : best));

        return Math.abs(step - number) <= 3 ? write(step) : null;
    }

    return finding.rule === 'spacing-scale' && SPACING_PROPERTY.test(finding.css) ? write(nearestOnScale(scales.web, number)) : null;
}

const weight = (value) => value
    .replace(/font-(?:extrabold|black)/, 'font-bold')
    .replace(/FontWeight\.(?:ExtraBold|Black)\b/, 'FontWeight.Bold')
    .replace(/FontWeight\.w[89]00\b/, 'FontWeight.w700')
    .replace(/\.(?:heavy|black)\b/, '.bold')
    .replace(/(fontWeight\s*:\s*['"]?)[89]00/, '$1700');

/** A project that renames its radius steps has its own idea of rounded-lg. */
function changesRadiusTheme(cwd) {
    const config = loadConfig(cwd);

    return walk(cwd, '.', config.ignore).filter((path) => /\.css$|(?:^|\/)tailwind\.config\.\w+$/.test(path)).some((path) => /--radius-[\w-]+\s*:|\bborderRadius\s*:/.test(readFileSync(join(cwd, path), 'utf8')));
}

/** Where a class value sits: the same token, not the tail of a longer one (mt-[13px] inside md:mt-[13px]). */
function locate(source, value, line) {
    let from = 0;
    for (let at = 1; at < line; at++) from = source.indexOf('\n', from) + 1;
    for (let index = source.indexOf(value, from); index >= 0; index = source.indexOf(value, index + 1)) {
        const before = source[index - 1] ?? ' ';
        const after = source[index + value.length] ?? ' ';
        if (!/[\w:[-]/.test(before) && !/[\w-]/.test(after)) return index;
    }

    return -1;
}


/** Tailwind's font-size steps, in px. text-2xs is a common project addition, so it counts only where the theme names it. */
const TYPE_STEPS = [[12, 'xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl'], [30, '3xl'], [36, '4xl'], [48, '5xl'], [60, '6xl'], [72, '7xl'], [96, '8xl'], [128, '9xl']];
const nearestType = (px) => TYPE_STEPS.reduce((best, item) => {
    const gap = Math.abs(item[0] - px) - Math.abs(best[0] - px);
    return gap < 0 || (gap === 0 && item[0] > best[0]) ? item : best; // a tie goes up, as spacing does
});
const SIZE_TOKEN = /(^|[\s'"`{])((?:[\w-]+:)*)text-\[(\d*\.?\d+)(px|rem)\](?=[\s'"`}]|$)/g;

/**
 * --nearest-type: every text-[Npx] on a line the report flagged moves to the nearest theme step, its variant kept
 * (lg:text-[64px] → lg:text-6xl). A leading-[Npx] with the same variant in the same class string keeps its ratio to
 * the size, on the 4 px grid; a tracking-[Npx] is named for a look, since a fixed letter spacing does not scale.
 */
function typeEdits(source, lines, scales) {
    const edits = [];
    const notes = [];
    const starts = [0];
    for (let index = source.indexOf('\n'); index >= 0; index = source.indexOf('\n', index + 1)) starts.push(index + 1);
    for (const line of lines) {
        const from = starts[line - 1];
        const text = source.slice(from, starts[line] ?? source.length);
        // A class string: text between quotes, so the two sides of a {{ $a ? '…' : '…' }} are paired on their own.
        for (const run of text.matchAll(/[^'"`]+/g)) {
            const sizes = new Map();
            for (const match of run[0].matchAll(SIZE_TOKEN)) {
                const [, lead, prefix, raw, unit] = match;
                const px = Number(raw) * (unit === 'rem' ? 16 : 1);
                const [step, name] = nearestType(px);
                const start = from + run.index + match.index + lead.length;
                const old = match[0].slice(lead.length);
                sizes.set(prefix, { px, step });
                edits.push({ start, end: start + old.length, line, from: old, to: `${prefix}text-${name}` });
            }
            for (const match of run[0].matchAll(/(^|[\s{])((?:[\w-]+:)*)(leading|tracking)-\[(-?\d*\.?\d+)(px|rem)\](?=[\s}]|$)/g)) {
                const [, lead, prefix, kind, raw, unit] = match;
                const size = sizes.get(prefix);
                if (!size || size.step === size.px) continue;
                const old = match[0].slice(lead.length);
                if (kind === 'tracking') {
                    notes.push({ line, note: `${old} was set for ${size.px} px text; check it at ${size.step} px` });
                    continue;
                }
                const px = Number(raw) * (unit === 'rem' ? 16 : 1);
                const next = nearestOnScale(scales.web, (px / size.px) * size.step);
                const start = from + run.index + match.index + lead.length;
                if (next !== px) edits.push({ start, end: start + old.length, line, from: old, to: `${prefix}leading-[${next}px]` });
            }
        }
    }

    return { edits, notes };
}

/** Returns the changes ({ path, line, rule, from, to }); with write they are made. */
export function applyFixes(cwd, findings, scales, { write = true, nearestType: typeScale = false } = {}) {
    let themed;
    const answer = {
        'spacing-scale': (value) => spacing(value, scales),
        'radius-scale': (value) => radius(value, (themed ??= changesRadiusTheme(cwd))),
        'no-heavy-headings': (value) => weight(value),
    };
    const changes = [];
    changes.skipped = [];
    changes.notes = [];
    const byFile = new Map();
    const typeLines = new Map();
    if (typeScale) for (const finding of findings) if (finding.rule === 'type-scale' && !finding.css && /^text-\[/.test(finding.value)) typeLines.set(finding.path, new Set([...(typeLines.get(finding.path) ?? []), finding.line]));
    for (const path of typeLines.keys()) if (!byFile.has(path)) byFile.set(path, []);
    for (const finding of findings) {
        // A finding read from CSS names its property; one read from a class or app code does not.
        const to = finding.css ? cssLength(finding, scales) : answer[finding.rule]?.(finding.value);
        if (to && to !== finding.value) byFile.set(finding.path, [...(byFile.get(finding.path) ?? []), { finding, to }]);
    }
    for (const [path, items] of byFile) {
        const bytes = readFileSync(join(cwd, path));
        const source = bytes.toString('utf8');
        // Writing back text decoded from another encoding (Windows-1254, Latin-1) would destroy every non-ASCII letter.
        if (!Buffer.from(source).equals(bytes)) {
            changes.skipped.push(path);
            continue;
        }
        const edits = [];
        const taken = new Set();
        for (const { finding, to } of items) {
            const start = finding.offset === undefined ? locate(source, finding.value, finding.line) : source.indexOf(finding.value, finding.offset);
            if (start < 0 || taken.has(start)) continue;
            taken.add(start);
            edits.push({ start, end: start + finding.value.length, to });
            changes.push({ path, line: finding.line, rule: finding.rule, from: finding.value, to });
        }
        if (typeLines.has(path)) {
            const { edits: sized, notes } = typeEdits(source, [...typeLines.get(path)].sort((a, b) => a - b), scales);
            for (const edit of sized) {
                if (edits.some((other) => edit.start < other.end && other.start < edit.end)) continue;
                edits.push(edit);
                changes.push({ path, line: edit.line, rule: 'type-scale', from: edit.from, to: edit.to });
            }
            changes.notes.push(...notes.map((note) => ({ path, ...note })));
        }
        if (write && edits.length > 0) {
            let out = source;
            for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.to + out.slice(edit.end);
            writeFileSync(join(cwd, path), out);
        }
    }

    return changes;
}
