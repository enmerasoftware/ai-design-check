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
 * A px length in a stylesheet, a style attribute or SCSS, each number on its own: a margin, padding or gap moves on the
 * web scale; a corner moves to a radius step within 3 px, as a rounded-[…] class does. An offset (top, inset) is left in
 * the report like a size, and so are rem and em, whose px depend on a root or a font size.
 */
function cssLength(finding, scales) {
    const length = /^(-?)(\d*\.?\d+)px$/.exec(finding.value);
    if (!length) return null;
    const [, minus, raw] = length;
    const number = Number(raw);
    if (finding.rule === 'radius-scale') {
        const step = [5, ...RADIUS_PX].reduce((best, item) => (Math.abs(item - number) <= Math.abs(best - number) ? item : best));

        return Math.abs(step - number) <= 3 ? `${minus}${step}px` : null;
    }

    return finding.rule === 'spacing-scale' && SPACING_PROPERTY.test(finding.css) ? `${minus}${nearestOnScale(scales.web, number)}px` : null;
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

/** Returns the changes ({ path, line, rule, from, to }); with write they are made. */
export function applyFixes(cwd, findings, scales, { write = true } = {}) {
    let themed;
    const answer = {
        'spacing-scale': (value) => spacing(value, scales),
        'radius-scale': (value) => radius(value, (themed ??= changesRadiusTheme(cwd))),
        'no-heavy-headings': (value) => weight(value),
    };
    const changes = [];
    changes.skipped = [];
    const byFile = new Map();
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
        if (write && edits.length > 0) {
            let out = source;
            for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.to + out.slice(edit.end);
            writeFileSync(join(cwd, path), out);
        }
    }

    return changes;
}
