import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, spacingScales } from '../src/check.js';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');
const CLASSES = 'mt-[6px] mt-[12px] mt-[13px] mt-[16px] mt-[18px] w-[400px] w-[401px] h-[2px]';

/** A throwaway project: { path: content }, with one web file using CLASSES unless it says otherwise. */
function project(files, run) {
    const cwd = mkdtempSync(join(tmpdir(), 'spacing-'));
    try {
        for (const [path, content] of Object.entries({ 'src/page.html': `<div class="${CLASSES}"></div>`, ...files })) {
            mkdirSync(dirname(join(cwd, path)), { recursive: true });
            writeFileSync(join(cwd, path), content);
        }

        return run(cwd);
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
}
const flagged = (cwd, file = '.html') => check(cwd).filter((item) => item.rule === 'spacing-scale' && item.path.endsWith(file)).map((item) => item.value);
const scale = (files) => project(files, (cwd) => spacingScales(cwd).web);
const config = (spacing) => ({ 'ai-design-check.json': JSON.stringify({ spacing }) });

test('nothing to read: the 4 px default, and the report says so', () => {
    project({}, (cwd) => {
        assert.deepEqual(flagged(cwd), ['mt-[6px]', 'mt-[13px]', 'mt-[18px]', 'w-[401px]']);
        assert.equal(spacingScales(cwd).web.source, 'default');
    });
});

test('config file: a grid, a list, or both, and it wins over everything else', () => {
    project(config({ base: 6 }), (cwd) => assert.deepEqual(flagged(cwd), ['mt-[13px]', 'mt-[16px]', 'w-[400px]', 'w-[401px]']));
    project(config(6), (cwd) => assert.equal(spacingScales(cwd).web.base, 6));
    // A list judges gaps by the list; sizes only by what the list has in common, or every width would be reported.
    project(config([4, 6, 8, 12]), (cwd) => assert.deepEqual(flagged(cwd), ['mt-[13px]', 'mt-[16px]', 'mt-[18px]', 'w-[401px]']));
    project(config({ base: 4, values: [13] }), (cwd) => assert.deepEqual(flagged(cwd), ['mt-[6px]', 'mt-[18px]', 'w-[401px]']));
    assert.equal(scale({ ...config({ base: 8 }), 'app.css': '@theme { --spacing: 6px; }' }).base, 8);
});

test('config file: a value that makes no sense leaves the default and says so', () => {
    for (const spacing of ['6px', { base: 0 }, { values: [] }, { values: ['4'] }, null]) {
        const read = scale({ ...config(spacing), 'a.css': '@theme { --spacing: 6px; }' });
        assert.deepEqual([read.base, read.source, /must be a number/.test(read.note)], [4, 'default', true], JSON.stringify(spacing));
    }
    assert.equal(scale({ ...config({}), 'a.css': '@theme { --spacing: 6px; }' }).base, 6); // empty means not set
});

test('Tailwind 4: the grid and named steps come from @theme, in rem or px', () => {
    project({ 'app.css': '@import "tailwindcss";\n@theme { --spacing: 0.375rem; --color-brand: #123; }' }, (cwd) => {
        assert.deepEqual(flagged(cwd), ['mt-[13px]', 'mt-[16px]', 'w-[400px]', 'w-[401px]']);
        assert.equal(spacingScales(cwd).web.source, 'app.css, @theme');
    });
    assert.deepEqual(scale({ 'a.css': '@theme inline { --spacing-card: 18px; }' }).values, [18]);
    assert.equal(scale({ 'a.css': '@theme inline { --spacing-card: 18px; }' }).base, 4); // Tailwind's default grid stays
    assert.deepEqual(scale({ 'a.css': '@theme { --spacing-*: initial; --spacing-sm: 6px; --spacing-md: 12px; }' }), { base: null, values: [6, 12], source: 'a.css, @theme' });
    assert.equal(scale({ 'a.css': '/* @theme { --spacing: 7px; } */' }).source, 'default'); // comments are not read
    assert.equal(scale({ 'node_modules/x/a.css': '@theme { --spacing: 7px; }' }).source, 'default'); // nor ignored folders
    assert.equal(scale({ 'public/vendor.css': `:root{--spacing:.25rem;--space-a:7px}${'.a{color:red}'.repeat(100)}` }).source, 'default'); // nor built bundles
});

test('Tailwind 4: a value that cannot be read, or two that disagree, leave the default and a note', () => {
    for (const files of [
        { 'a.css': '@theme { --spacing: calc(1rem / 3); }' },
        { 'a.css': '@theme { --spacing-sm: var(--x); }' },
        { 'a.css': '@theme { --spacing: 6px; }', 'b.css': '@theme { --spacing: 8px; }' },
    ]) {
        const read = scale(files);
        assert.deepEqual([read.base, read.source, Boolean(read.note)], [4, 'default', true], JSON.stringify(files));
    }
    assert.equal(scale({ 'a.css': '@theme { --spacing: 6px; }', 'b.css': '@theme { --spacing: 6px; }' }).base, 6);
});

test('rem follows the root font size, and an unknown root size is not guessed', () => {
    assert.equal(scale({ 'a.css': 'html { font-size: 62.5%; }\n@theme { --spacing: 0.6rem; }' }).base, 6);
    assert.equal(scale({ 'a.css': 'html { font-size: 12px; }\n@theme { --spacing: 0.5rem; }' }).base, 6);
    assert.equal(scale({ 'a.css': 'html { font-size: clamp(14px, 2vw, 18px); }\n@theme { --spacing: 0.5rem; }' }).source, 'default');
    assert.equal(scale({ 'a.css': 'html { font-size: clamp(14px, 2vw, 18px); }\n@theme { --spacing: 6px; }' }).base, 6); // px needs no root size
});

test('Tailwind 3: a plain config is read as text and never run', () => {
    const marker = join(tmpdir(), `spacing-run-${process.pid}`);
    const js = (body) => ({ 'tailwind.config.js': `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran');\nmodule.exports = ${body};` });
    assert.deepEqual(scale(js(`{ theme: { extend: { spacing: { 18: '4.5rem', card: '18px', /* no: '7px', */ } } } }`)), { base: 4, values: [18, 72], source: 'tailwind.config.js' });
    assert.deepEqual(scale(js(`{ theme: { spacing: { 0: '0', sm: '6px', md: "12px", lg: \`24px\` }, letterSpacing: { wide: '7px' } } }`)), { base: null, values: [6, 12, 24], source: 'tailwind.config.js' });
    assert.deepEqual(scale(js(`{ theme: { spacing: { sm: '6px' }, extend: { colors: { a: { spacing: '9px' } }, spacing: { md: '13px' } } } }`)).values, [6, 13]);
    assert.equal(existsSync(marker), false);
    project(js(`{ theme: { extend: { spacing: { card: '18px' } } } }`), (cwd) => assert.deepEqual(flagged(cwd), ['mt-[6px]', 'mt-[13px]', 'w-[401px]']));
    assert.equal(scale(js(`{ theme: { extend: { colors: {} } } }`)).source, 'default'); // nothing about spacing, no note
    assert.equal(scale(js(`{ theme: { extend: { colors: {} } } }`)).note, undefined);
});

test('Tailwind 3: anything that would need running leaves the default and a note', () => {
    for (const body of [
        `{ theme: { spacing: ({ theme }) => ({ sm: '6px' }) } }`,
        `{ theme: { spacing: mine } }`,
        `{ theme: { extend: { spacing: { ...mine, sm: '6px' } } } }`,
        `{ theme: { extend: { spacing: { sm: unit * 2 } } } }`,
        `{ theme: { extend: { spacing: { sm: 'calc(1rem + 1px)' } } } }`,
        `{ theme: { ...mine } }`,
        `{ theme: mine }`,
        `{ presets: [mine], theme: {} }`,
    ]) {
        const read = scale({ 'tailwind.config.js': `module.exports = ${body};` });
        assert.deepEqual([read.base, read.source, Boolean(read.note)], [4, 'default', true], body);
    }
    const two = scale({ 'a/tailwind.config.js': `module.exports = { theme: { spacing: { sm: '6px' } } };`, 'b/tailwind.config.js': `module.exports = { theme: { spacing: { sm: '8px' } } };` });
    assert.match(two.note, /different spacing/);
});

test('CSS variables add steps to the default, and only --spacing moves the grid', () => {
    project({ 'a.css': ':root { --space-1: 6px; --space-2: 0.75rem; --spacing-card: 18px; --spacer: 7px; }\n.dark { --space-3: 13px; }' }, (cwd) => {
        assert.deepEqual(flagged(cwd), ['mt-[13px]', 'w-[401px]']);
        assert.deepEqual(spacingScales(cwd).web, { base: 4, values: [6, 12, 18], source: 'a.css, CSS variables' });
    });
    assert.equal(scale({ 'a.css': ':root { --spacing: 0.375rem; }' }).base, 6);
    assert.equal(scale({ 'a.css': ':root { --space-1: clamp(1px, 2vw, 3px); }' }).source, 'default');
    assert.match(scale({ 'a.css': ':root { --spacing: calc(2px * 3); }' }).note, /--spacing/);
});

test('the order: config file, then @theme, then the Tailwind config, then CSS variables', () => {
    const tailwind = { 'tailwind.config.js': `module.exports = { theme: { extend: { spacing: { a: '18px' } } } };` };
    const variables = { 'v.css': ':root { --space-a: 6px; }' };
    assert.equal(scale({ ...tailwind, ...variables, 'a.css': '@theme { --spacing: 5px; }' }).base, 5);
    assert.deepEqual(scale({ ...tailwind, ...variables }).values, [18]);
    assert.deepEqual(scale(variables).values, [6]);
});

test('SwiftUI and Compose: a web theme changes nothing, only the config file does', () => {
    const swift = 'VStack(spacing: 13) { Text("a").padding(12).padding(16).padding(18) }';
    const kotlin = 'Column(modifier = Modifier.padding(12.dp)) {}\nColumn(modifier = Modifier.padding(18.dp)) {}';
    const files = { 'V.swift': swift, 'S.kt': kotlin };
    const off = (cwd, file) => flagged(cwd, file);
    project({ ...files, 'a.css': '@theme { --spacing: 6px; }', 'tailwind.config.js': `module.exports = { theme: { spacing: { a: '6px' } } };` }, (cwd) => {
        assert.deepEqual(off(cwd, '.swift'), ['spacing: 13', '.padding(18']);
        assert.deepEqual(off(cwd, '.kt'), ['18.dp']);
        assert.equal(spacingScales(cwd).native.source, 'default');
        assert.equal(spacingScales(cwd).web.base, 6);
    });
    project({ ...files, ...config({ base: 6 }) }, (cwd) => {
        assert.deepEqual(off(cwd, '.swift'), ['spacing: 13', '.padding(16']);
        assert.deepEqual(off(cwd, '.kt'), []);
    });
    project({ ...files, ...config({ base: 6, native: { base: 4 } }) }, (cwd) => {
        assert.deepEqual(off(cwd, '.swift'), ['spacing: 13', '.padding(18']);
        assert.equal(spacingScales(cwd).web.base, 6);
    });
    project({ ...files, ...config({ native: 6 }), 'a.css': '@theme { --spacing: 5px; }' }, (cwd) => {
        assert.deepEqual([spacingScales(cwd).web.base, spacingScales(cwd).native.base], [5, 6]);
    });
});

test('checking one file still uses the whole project\'s scale', () => {
    project({ 'a.css': '@theme { --spacing: 6px; }' }, (cwd) => {
        assert.deepEqual(check(cwd, { include: ['src/page.html'] }).filter((item) => item.rule === 'spacing-scale').map((item) => item.value), ['mt-[13px]', 'mt-[16px]', 'w-[400px]', 'w-[401px]']);
    });
});

test('the report names the scale in every format', () => {
    const run = (cwd, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' }).stdout;
    project({ 'a.css': '@theme { --spacing: 6px; }', 'V.swift': 'VStack(spacing: 13) {}' }, (cwd) => {
        const text = run(cwd);
        assert.match(text, /Spacing scale: 6 px grid \(a\.css, @theme\)\./);
        assert.match(text, /Spacing scale for SwiftUI and Compose: 4 pt\/dp grid \(default; app code is not read for a scale\)\./);
        assert.match(text, /Off the spacing scale, 6 px grid \(a\.css, @theme\): mt-\[13px\]/);
        const { spacing, findings } = JSON.parse(run(cwd, '--json'));
        assert.deepEqual([spacing.web.base, spacing.web.source, spacing.native.source], [6, 'a.css, @theme', 'default']);
        assert.ok(findings.length > 0);
        assert.match(run(cwd, '--format', 'github'), /^Spacing scale: 6 px grid/m);
        assert.doesNotMatch(run(cwd, '--quiet'), /Spacing scale/);
    });
    project({ 'a.css': '@theme { --spacing: calc(1px * 6); }' }, (cwd) => assert.match(run(cwd), /Spacing scale: 4 px grid \(default\)\.\n\s+a\.css: @theme spacing is not a plain px or rem value, default used\./));
    project({ ...config(6) }, (cwd) => assert.match(run(cwd), /Spacing scale: 6 px grid \(ai-design-check\.json\)/));
    project({ 'ai-design-check.json': JSON.stringify({ rules: { 'spacing-scale': 'off' } }) }, (cwd) => {
        assert.doesNotMatch(run(cwd), /Spacing scale/);
        assert.equal(JSON.parse(run(cwd, '--json')).spacing, undefined);
    });
});
