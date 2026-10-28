import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, globToRegExp, isLabel, isTitled, justified, loadRules } from '../src/check.js';

const app = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'app');
const findings = check(app);
const by = (rule) => findings.filter((item) => item.rule === rule);

test('every rule has both languages and a known area', () => {
    const { areas, rules } = loadRules();
    for (const rule of rules) {
        assert.ok(areas[rule.area], rule.id);
        for (const field of ['title', 'rule', 'why', 'fix']) assert.ok(rule[field].en && rule[field].tr, `${rule.id}.${field}`);
        assert.ok(['error', 'warn', 'info'].includes(rule.severity), rule.id);
    }
    assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
});

test('scale rules find arbitrary sizes and honour the allow list', () => {
    assert.deepEqual(by('type-scale').map((item) => item.value), ['text-[10px]']);
    assert.deepEqual(by('radius-scale'), []); // rounded-[2px] is micro, rounded-[28px] allowed in config
});

test('visual tells are found', () => {
    assert.equal(by('no-decorative-uppercase').length, 1);
    assert.deepEqual(by('no-ai-gradients').map((item) => item.value), ['from-purple-500', 'bg-clip-text']);
    assert.equal(by('no-side-stripe').length, 1);
    assert.equal(by('icons-not-emoji').length, 1);
    assert.equal(by('no-buzzwords')[0].value, 'Seamless');
    assert.deepEqual(by('pulse-for-live-only'), []); // turned off in config
    assert.deepEqual(by('glow-in-charts-only').map((item) => item.value), ['shadow-[0_0_24px']); // a 1px ring is not a glow
});

test('sentence case: JSX labels, source keys and translations', () => {
    const values = by('sentence-case').map((item) => item.value).sort();
    assert.deepEqual(values, ['High Impact', 'Rank Tracking', 'Sıra Takibi', 'Takip Et']);
});

test('label helpers', () => {
    assert.ok(isLabel('Takip Et') && isTitled('Takip Et'));
    assert.ok(!isTitled('Kelime takibi'));
    assert.ok(!isLabel('Site sağlığı › Site denetimi'));
    assert.ok(isTitled('Kullanım ve Faturalama'));
    assert.ok(justified('Connect Search Console', ['Search Console']));
    assert.ok(justified('Open SERP', []));
    assert.ok(!justified('Open Reports', []));
    assert.ok(!justified('New App Feature', ['App Store']));
    assert.ok(justified('Open the App Store', ['App Store']));
});

test('glob', () => {
    assert.ok(globToRegExp('lang/*.json').test('lang/tr.json'));
    assert.ok(globToRegExp('**/node_modules/**').test('a/node_modules/b/c.js'));
    assert.ok(!globToRegExp('lang/*.json').test('lang/x/tr.json'));
});
