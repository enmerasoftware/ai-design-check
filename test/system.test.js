import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contrast, hexToOklch, hexToRgb, oklchToHex } from '../src/color.js';
import { preview } from '../src/preview.js';
import { CHARACTERS, COMPONENTS, KINDS, contrastReport, designSystem, library } from '../src/system.js';
import { bootstrap, css, kotlin, scss, swift } from '../src/tokens.js';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');
// The least each text color must reach, whatever the report claims: WCAG 2 AA for text, and the steps body and
// secondary text keep above the rest.
const FLOOR = { text: 12, textSecondary: 7 };
const floorOf = (fg) => FLOOR[fg] ?? 4.5;
// Brands around the hue wheel, very light and very dark ones, the pure primaries and both ends of the range.
const BRANDS = [
    undefined,
    ...Array.from({ length: 12 }, (_, index) => oklchToHex({ l: 0.62, c: 0.16, h: index * 30 })),
    ...Array.from({ length: 6 }, (_, index) => oklchToHex({ l: 0.94, c: 0.05, h: index * 60 })),
    ...Array.from({ length: 6 }, (_, index) => oklchToHex({ l: 0.22, c: 0.07, h: index * 60 })),
    '#FFFF00', '#00FFFF', '#FF00FF', '#00FF00', '#FF0000', '#0000FF',
    '#000000', '#0B0B0B', '#808080', '#FAFAFA', '#FFFFFF',
    '#F18A20', '#CFEA8E', '#FFEB3B', '#7C3AED', '#1E5A63',
];
const camel = (name) => name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

test('color math round-trips and measures WCAG contrast', () => {
    for (const hex of ['#1e5a63', '#f18a20', '#7c3aed', '#ffffff', '#000000']) assert.equal(oklchToHex(hexToOklch(hex)), hex);
    assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
    assert.equal(contrast('#777777', '#777777'), 1);
});

test('every text color passes on every ground it sits on, for every character, kind and brand, in both themes', () => {
    for (const character of Object.keys(CHARACTERS)) {
        for (const kind of KINDS) {
            for (const brand of BRANDS) {
                const system = designSystem({ character, kind, brand });
                for (const mode of ['light', 'dark']) {
                    const colors = system.color[mode];
                    for (const pair of contrastReport(colors)) {
                        // Measured again, unrounded: the report rounds to two places.
                        const ratio = contrast(colors[pair.fg], colors[pair.bg]);
                        assert.ok(ratio >= Math.max(floorOf(pair.fg), pair.target), `${character}/${kind}/${brand}/${mode}: ${pair.fg} on ${pair.bg} ${ratio.toFixed(3)}`);
                    }
                    // The hover shows: at least 1.15:1 from the accent at rest.
                    assert.ok(contrast(colors.accent, colors.accentHover) >= 1.15, `${character}/${brand}/${mode}: hover ${colors.accentHover} on ${colors.accent}`);
                }
            }
        }
    }
});

test('the contrast report covers every text-on-ground pair of the component map, the tokens and the preview', () => {
    const system = designSystem({ character: 'warm', brand: '#F18A20' });
    const colors = system.color.light;
    const listed = new Set(contrastReport(colors).map((pair) => `${pair.fg} on ${pair.bg}`));
    const needed = new Set();
    // Component map: text and placeholder on the background and the hover; with no background of its own, on the page and on cards.
    for (const part of Object.values(COMPONENTS)) {
        const grounds = [part.background, part.hover].filter((name) => name && name !== 'transparent');
        if (!part.background || part.background === 'transparent') grounds.push('bg', 'surface');
        for (const fg of [part.text, part.placeholder].filter(Boolean)) for (const bg of grounds) needed.add(`${fg} on ${bg}`);
    }
    // Tokens: every ink on its fill, every colored text on its soft ground.
    for (const name of Object.keys(colors)) {
        if (name.endsWith('Ink')) needed.add(`${name} on ${name.slice(0, -3)}`);
        if (name.endsWith('Text') && colors[`${name.slice(0, -4)}Soft`]) needed.add(`${name} on ${name.slice(0, -4)}Soft`);
    }
    // Preview: each rule that paints a background, with its own text color, its base rule's (:hover) or the pane's.
    const style = preview(system, '').split('<style>')[1].split('</style>')[0];
    const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
        selector: selector.trim(), bg: body.match(/background: var\(--c-([a-z0-9-]+)\)/)?.[1], fg: body.match(/(?:^|[\s;])color: var\(--c-([a-z0-9-]+)\)/)?.[1],
    }));
    for (const rule of rules.filter((item) => item.bg)) {
        const fg = rule.fg ?? rules.find((item) => item.selector === rule.selector.replace(/:hover$/, '') && item.fg)?.fg ?? 'text';
        needed.add(`${camel(fg)} on ${camel(rule.bg)}`);
    }
    assert.ok(needed.has('accentInk on accentHover') && needed.has('warningText on warningSoft'), 'the walk found the pairs');
    for (const pair of needed) assert.ok(listed.has(pair), `the report leaves out ${pair}`);
});

test('Bootstrap gets the system as CSS and Sass variables, and its text stays readable', () => {
    const rgb = (hex) => hexToRgb(hex).map((channel) => Math.round(channel * 255)).join(', ');
    const block = (text, start) => Object.fromEntries([...text.slice(text.indexOf(start)).split('}')[0].matchAll(/--([a-z0-9-]+): ([^;]+);/g)].map(([, name, value]) => [name, value]));
    const status = ['success', 'warning', 'danger', 'info'];
    for (const character of Object.keys(CHARACTERS)) {
        for (const brand of BRANDS) {
            const system = designSystem({ character, brand });
            const out = bootstrap(system);
            for (const [mode, start] of [['light', ':root,\n[data-bs-theme=light] {'], ['dark', '[data-bs-theme=dark] {']]) {
                const vars = block(out, start);
                const colors = system.color[mode];
                for (const name of ['body-bg', 'body-color', 'secondary-color', 'tertiary-bg', 'border-color', 'primary', 'primary-rgb', 'link-color', 'link-color-rgb', 'emphasis-color', ...status.flatMap((item) => [item, `${item}-rgb`, `${item}-text-emphasis`, `${item}-bg-subtle`, `${item}-border-subtle`])]) {
                    assert.ok(vars[`bs-${name}`], `${mode}: --bs-${name}`);
                }
                assert.equal(vars['bs-primary'], colors.accent);
                assert.equal(vars['bs-primary-rgb'], rgb(colors.accent));
                assert.equal(vars['bs-body-color'], colors.text);
                assert.equal(vars['bs-link-color-rgb'], rgb(vars['bs-link-color']));
                // Every pair Bootstrap draws with these variables.
                const pairs = [
                    ...['body-color', 'secondary-color'].flatMap((fg) => ['body-bg', 'tertiary-bg', 'secondary-bg'].map((bg) => [fg, bg])),
                    ['tertiary-color', 'body-bg'], ['tertiary-color', 'tertiary-bg'],
                    ...['link-color', 'link-hover-color', 'primary-text-emphasis'].flatMap((fg) => [[fg, 'body-bg'], [fg, 'tertiary-bg'], [fg, 'primary-bg-subtle']]),
                    ...status.flatMap((item) => [[`${item}-text-emphasis`, 'body-bg'], [`${item}-text-emphasis`, `${item}-bg-subtle`], [`ds-${item}-ink`, item]]),
                    ['form-valid-color', 'body-bg'], ['form-invalid-color', 'body-bg'], ['ds-primary-ink', 'primary'], ['ds-primary-ink', 'ds-primary-hover'],
                ];
                for (const [fg, bg] of pairs) {
                    const [a, b] = [vars[fg.startsWith('ds-') ? fg : `bs-${fg}`], vars[bg.startsWith('ds-') ? bg : `bs-${bg}`]];
                    assert.ok(contrast(a, b) >= 4.5, `${character}/${brand}/${mode}: ${fg} ${a} on ${bg} ${b} ${contrast(a, b).toFixed(2)}`);
                }
            }
            assert.equal(block(out, ':root,\n[data-bs-theme=light] {')['bs-border-radius'], `${system.shape.radius.md}px`);
        }
    }
    const system = designSystem({ character: 'editorial', brand: '#FFFF00' });
    const out = bootstrap(system);
    for (const name of ['bg', 'border-color', 'color', 'hover-bg', 'hover-border-color', 'hover-color', 'active-bg', 'active-color', 'focus-shadow-rgb', 'disabled-bg', 'disabled-color']) {
        assert.match(out.split('.btn-primary {')[1].split('}')[0], new RegExp(`--bs-btn-${name}: var\\(--`), name);
    }
    assert.match(out, /--bs-body-font-family: var\(--bs-font-sans-serif\);/);
    assert.match(out, /--bs-font-sans-serif: "Source Sans 3"/);
    for (const name of ['sm', 'lg', 'xl', 'xxl']) assert.match(out, new RegExp(`--bs-border-radius-${name}: \\d+px;`));
    // Sass: the same choices, every line a plain assignment, and no dark theme colors Bootstrap would not read.
    const sass = scss(system);
    for (const line of [`$primary: ${system.color.light.accent};`, `$body-bg: ${system.color.light.surface};`, `$body-bg-dark: ${system.color.dark.surface};`, `$link-color-dark: ${system.color.dark.accentText};`, '$enable-dark-mode: true;', `$border-radius: ${system.shape.radius.md}px;`, '$font-family-sans-serif: "Source Sans 3", system-ui, sans-serif;', '$spacer: 1rem;']) {
        assert.ok(sass.includes(`\n${line}\n`), line);
    }
    for (const name of ['sm', 'lg', 'xl', 'xxl']) assert.match(sass, new RegExp(`\\n\\$border-radius-${name}: \\d+px;`));
    assert.doesNotMatch(sass, /\$(?:primary|success|warning|danger|info)-dark:/);
    for (const line of sass.split('\n').filter((item) => item && !item.startsWith('//'))) assert.match(line, /^\$[a-z-]+: [^;]+;$/);
});

test('every character has a pairing whose fonts are in the library', () => {
    const lib = library();
    const names = new Set(lib.families.map((item) => item.name));
    for (const character of Object.keys(CHARACTERS)) {
        assert.ok(lib.characters[character], character);
        for (const role of ['ui', 'display', 'numeric', 'mono']) assert.ok(names.has(lib.pairings[character][role]), `${character}.${role}`);
    }
});

test('apps get iOS text sizes that map to Dynamic Type', () => {
    const { type } = designSystem({ kind: 'app' });
    assert.equal(type.body.size, 17);
    assert.equal(type.body.ios, 'body');
    assert.match(swift(designSystem({ kind: 'app' })), /relativeTo: \.body/);
});

test('outputs name the same tokens on every platform', () => {
    const system = designSystem({ character: 'warm', brand: '#F18A20' });
    assert.match(css(system), /--color-accent-ink:/);
    assert.match(css(system), /prefers-color-scheme: dark/);
    assert.match(swift(system), /static let accentInk = Color\(light: 0x/);
    assert.match(kotlin(system), /onPrimary = Color\(0xFF/);
    assert.throws(() => designSystem({ character: 'loud' }), /Unknown character/);
    assert.throws(() => designSystem({ ui: 'Comic Sans' }), /Unknown font/);
});

test('the system command writes every file', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'adc-')), 'ds');
    const text = execFileSync('node', [bin, 'system', '--character', 'precise', '--brand', '1E5A63', '--out', out], { encoding: 'utf8' });
    assert.match(text, /precise · dashboard · brand #1E5A63/);
    for (const name of ['tokens.css', 'theme.css', 'bootstrap.css', '_variables.scss', 'tokens.json', 'DesignSystem.swift', 'DesignSystem.kt', 'preview.html']) assert.ok(existsSync(join(out, name)), name);
    assert.match(readFileSync(join(out, 'theme.css'), 'utf8'), /@theme \{/);
    assert.equal(JSON.parse(execFileSync('node', [bin, 'system', '--json'], { encoding: 'utf8' })).kind, 'dashboard');
});
