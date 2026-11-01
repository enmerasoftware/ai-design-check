import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contrast, hexToOklch, oklchToHex } from '../src/color.js';
import { CHARACTERS, KINDS, contrastReport, designSystem, library } from '../src/system.js';
import { css, kotlin, swift } from '../src/tokens.js';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');
const TARGET = { text: 12, textSecondary: 7 };

test('color math round-trips and measures WCAG contrast', () => {
    for (const hex of ['#1e5a63', '#f18a20', '#7c3aed', '#ffffff', '#000000']) assert.equal(oklchToHex(hexToOklch(hex)), hex);
    assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
    assert.equal(contrast('#777777', '#777777'), 1);
});

test('every character, kind and brand passes contrast in both themes', () => {
    for (const character of Object.keys(CHARACTERS)) {
        for (const kind of KINDS) {
            for (const brand of [undefined, '#F18A20', '#CFEA8E', '#FFEB3B', '#7C3AED', '#0B0B0B']) {
                const system = designSystem({ character, kind, brand });
                for (const mode of ['light', 'dark']) {
                    for (const pair of contrastReport(system.color[mode])) {
                        assert.ok(pair.ratio >= (TARGET[pair.fg] ?? 4.5), `${character}/${kind}/${brand}/${mode}: ${pair.fg} on ${pair.bg} ${pair.ratio}`);
                    }
                }
            }
        }
    }
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
    for (const name of ['tokens.css', 'theme.css', 'tokens.json', 'DesignSystem.swift', 'DesignSystem.kt', 'preview.html']) assert.ok(existsSync(join(out, name)), name);
    assert.match(readFileSync(join(out, 'theme.css'), 'utf8'), /@theme \{/);
    assert.equal(JSON.parse(execFileSync('node', [bin, 'system', '--json'], { encoding: 'utf8' })).kind, 'dashboard');
});
