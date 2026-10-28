import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyBaseline, check, globToRegExp, isLabel, isTitled, justified, loadRules, toBaseline } from '../src/check.js';
import { classUnits, literals } from '../src/classes.js';
import { inventory } from '../src/inventory.js';
import { parseAttrs, readTag, visibleText } from '../src/jsx.js';

const app = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'app');
const findings = check(app);
const by = (rule) => findings.filter((item) => item.rule === rule);
const values = (rule) => by(rule).map((item) => item.value);

test('every rule has both languages, a known area and a valid check type', () => {
    const { areas, rules } = loadRules();
    const types = ['class', 'regex', 'i18n-case', 'icon-button-name', 'shared-components', 'style-overrides', 'repeated-markup', 'shared-looks'];
    for (const rule of rules) {
        assert.ok(areas[rule.area], rule.id);
        for (const field of ['title', 'rule', 'why', 'fix']) assert.ok(rule[field].en && rule[field].tr, `${rule.id}.${field}`);
        assert.ok(['error', 'warn', 'info'].includes(rule.severity), rule.id);
        if (rule.check) assert.ok(types.includes(rule.check.type), `${rule.id}: ${rule.check.type}`);
    }
    assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
});

test('class rules read className and cn(), not comments or copy', () => {
    assert.deepEqual(values('type-scale'), ['text-[10px]', 'text-[15px]']); // text-[13px] ignored with a reason
    assert.deepEqual(by('radius-scale'), []); // rounded-[2px] is micro, rounded-[28px] allowed in config
    assert.equal(by('no-decorative-uppercase').length, 1);
    assert.deepEqual(values('no-ai-gradients'), ['from-purple-500', 'bg-clip-text']);
    assert.equal(by('no-side-stripe').length, 1);
    assert.deepEqual(values('glow-in-charts-only'), ['shadow-[0_0_24px']); // a 1px ring is not a glow
    assert.deepEqual(by('pulse-for-live-only'), []); // turned off in config
});

test('copy rules', () => {
    assert.equal(by('icons-not-emoji').length, 1);
    assert.deepEqual(values('no-buzzwords'), ['Seamless']); // the comment is ignored
    assert.equal(by('specific-action-labels').length, 1);
    assert.equal(by('error-copy').length, 1);
    assert.equal(by('ellipsis-character').length, 1);
});

test('accessibility: focus ring and icon-only buttons', () => {
    assert.equal(by('focus-ring-removed').length, 1); // the cn() with focus-visible:ring-2 passes
    assert.deepEqual(values('icon-button-name'), ['button']); // the Button with aria-label passes
});

test('components: raw elements and outside styling', () => {
    assert.deepEqual(values('use-shared-components'), ['button', 'input']); // hidden input and components/ui are fine
    assert.deepEqual(values('use-shared-looks'), ['badge:span', 'heading:h2', 'button link:a', 'box:div', 'box:div', 'box:div']); // the three repeated cards are boxes too; a plain span, a spaced div and components/ui are fine
    // mt-2 w-full only places it; the ignore on the Input covers focus-ring-removed only, not this rule
    assert.deepEqual(values('no-style-overrides'), ['rounded-full bg-red-500 px-6', 'bg-red-500', 'outline-none']); // a Card may take gap, padding and text, not a colour
    const repeated = by('repeated-markup');
    assert.equal(repeated.length, 1);
    assert.equal(repeated[0].places.length, 3); // w-full is layout, so the third copy matches too
});

test('i18n, motion and css', () => {
    assert.deepEqual(values('locale-aware-case'), ['.toUpperCase()']);
    assert.deepEqual(values('locale-number-format'), ['.toFixed(']);
    assert.equal(by('no-naive-plural').length, 1);
    assert.equal(by('no-concatenated-translation').length, 1);
    assert.deepEqual(by('no-transition-all').map((item) => item.path), ['src/motion.css', 'src/page.tsx']);
    assert.deepEqual(by('no-bounce-easing').map((item) => item.path), ['src/motion.css', 'src/page.tsx']);
    assert.deepEqual(by('no-marquee').map((item) => item.path), ['src/motion.css']);
});

test('sentence case: JSX labels, source keys and translations', () => {
    assert.deepEqual(values('sentence-case').sort(), ['High Impact', 'Rank Tracking', 'Sıra Takibi', 'Takip Et']);
});

test('baseline hides known findings and reports new ones', () => {
    const baseline = toBaseline(findings);
    assert.deepEqual(applyBaseline(findings, baseline), []);
    const extra = [...findings, { ...findings[0] }];
    assert.equal(applyBaseline(extra, baseline).filter((item) => item.path === findings[0].path && item.rule === findings[0].rule).length, baseline[`${findings[0].path}\u0000${findings[0].rule}`] + 1);
});

test('inventory counts looks per kind', () => {
    const result = inventory(app);
    assert.equal(result.button.raw, 1); // components/ui/button.tsx is the component itself
    assert.ok(result.button.variants.some((variant) => variant.key === '<Button variant=ghost> + bg-red-500 px-6 rounded-full'));
    assert.equal(result.card.variants[0].count, 3);
});

test('extractors', () => {
    assert.deepEqual(literals("cn('a b', on && \"c\", `d ${x ? 'e' : 'f'} g`)"), ['a b', 'c', 'd   g', 'e', 'f']);
    assert.equal(classUnits('<div className={cn("px-2", "py-1")} /> <p className="m-1">').length, 2);
    const tag = readTag('<Button onClick={() => a > b} aria-label="X">', 0);
    assert.equal(tag.name, 'Button');
    assert.equal(parseAttrs(tag.attrs)['aria-label'], 'X');
    assert.deepEqual(parseAttrs('className={cn("a")} id={"x"}'), { className: { code: 'cn("a")' }, id: 'x' });
    assert.equal(visibleText('<TrashIcon /> {/* x */}'), '');
    assert.notEqual(visibleText("<TrashIcon /> {t('Delete')}"), '');
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
