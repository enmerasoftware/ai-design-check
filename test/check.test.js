import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyBaseline, check, globToRegExp, isLabel, isTitled, justified, loadRules, toBaseline } from '../src/check.js';
import { classUnits, literals } from '../src/classes.js';
import { inventory } from '../src/inventory.js';
import { parseAttrs, readTag, visibleText } from '../src/jsx.js';
import { narrow } from '../src/narrow.js';
import { findChrome } from '../src/story.js';

const app = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'app');
const findings = check(app);
const by = (rule) => findings.filter((item) => item.rule === rule);
const values = (rule) => by(rule).map((item) => item.value);

test('every rule has both languages, a known area and a valid check type', () => {
    const { areas, rules } = loadRules();
    const types = ['render', 'native', 'class', 'regex', 'i18n-case', 'icon-button-name', 'shared-components', 'style-overrides', 'repeated-markup', 'shared-looks'];
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

test('generated-UI tells (fixtures/slop)', () => {
    const slop = check(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'slop'));
    const at = (rule) => slop.filter((item) => item.rule === rule).map((item) => item.value);
    assert.deepEqual(at('no-decorative-uppercase'), ['NAVIGATION']);
    assert.equal(at('icons-not-emoji').length, 1); // HTML is scanned too
    assert.deepEqual(at('no-heavy-headings'), ['font-extrabold']);
    assert.deepEqual(at('no-greeting-headline'), ['Welcome back']);
    assert.deepEqual(at('no-hover-scale'), ['hover:scale-105']);
    assert.deepEqual(at('spacing-scale'), ['mt-[13px]', 'gap-[7px]']); // 32 px is on the grid, 1 px is a hairline
    assert.deepEqual(at('no-exclamation-copy'), ['+12%!!']); // not a non-null assertion, not Tailwind's important
    assert.equal(at('no-unsourced-proof').length, 1);
    assert.deepEqual(at('no-layout-animation'), ['transition-[left]']);
    assert.equal(at('no-announcement-pill').length, 1);
    assert.deepEqual(at('no-italic-emphasis'), ['italic']);
    assert.equal(at('no-tight-small-text').length, 1);
    assert.equal(at('no-trailing-period-labels').length, 1);
    assert.equal(at('short-placeholders').length, 1);
    assert.equal(at('no-sparkle-for-ai').length, 1);
    assert.deepEqual(at('no-placeholder-data'), ['John Doe']);
    assert.deepEqual(at('no-blur-blobs'), ['blur-3xl']);
    assert.deepEqual(at('no-gradient-buttons'), ['bg-gradient-to-r']); // a section background is not a button
    assert.deepEqual(at('no-heavy-card-shadow'), ['shadow-xl']); // the floating menu keeps its shadow
    assert.deepEqual(at('tap-target'), ['size-5']); // a tall link and a status dot pass
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

test('native apps: SwiftUI and Jetpack Compose', () => {
    const native = check(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'native'));
    const of = (file, rule) => native.filter((item) => item.path.endsWith(file) && item.rule === rule).map((item) => item.value);
    assert.deepEqual(of('.swift', 'spacing-scale'), ['spacing: 13', '.padding(10']);
    assert.deepEqual(of('.swift', 'dynamic-type'), ['.font(.system(size: 26']);
    assert.deepEqual(of('.swift', 'sentence-case'), ['Text("Upcoming Payments"']);
    assert.deepEqual(of('.swift', 'tap-target'), ['.frame(width: 24, height: 24)', '.frame(width: 28, height: 28)']); // padded button and a plain dot pass
    assert.equal(of('.swift', 'radius-scale').length, 1);
    for (const rule of ['no-heavy-headings', 'no-ai-gradients', 'no-sparkle-for-ai', 'icons-not-emoji', 'no-greeting-headline', 'no-heavy-card-shadow', 'no-blur-blobs', 'pulse-for-live-only']) assert.equal(of('.swift', rule).length, 1, rule);
    assert.deepEqual(of('.swift', 'no-exclamation-copy').length, 2); // the greeting and "You did it!", not the comment
    assert.deepEqual(of('.kt', 'spacing-scale'), ['10.dp', '18.dp']);
    assert.deepEqual(of('.kt', 'type-scale'), ['fontSize = 26.sp']);
    assert.deepEqual(of('.kt', 'tap-target'), ['.size(24.dp)', '.size(32.dp)']); // an icon inside a 48 dp IconButton passes
    assert.deepEqual(of('.kt', 'sentence-case'), ['Text(text = "Recent Activity"']);
    for (const rule of ['no-heavy-headings', 'no-ai-gradients', 'no-sparkle-for-ai', 'icons-not-emoji', 'no-greeting-headline', 'radius-scale', 'no-heavy-card-shadow']) assert.equal(of('.kt', rule).length, 1, rule);
});

test('accessibility is told apart from style', () => {
    assert.ok(findings.every((item) => item.area));
    assert.equal(by('focus-ring-removed')[0].area, 'accessibility');
    assert.equal(by('sentence-case')[0].area, 'writing');

    const { rules } = loadRules();
    const severity = (id) => rules.find((rule) => rule.id === id).severity;
    assert.equal(severity('focus-ring-removed'), 'error');
    assert.equal(severity('no-gradient-buttons'), 'warn');
    // A warning since the benchmark: purple gradients fired on a quarter of human-designed sites and on no AI page.
    assert.equal(severity('no-ai-gradients'), 'warn');

    const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');
    const { stdout } = spawnSync(process.execPath, [bin], { cwd: app, encoding: 'utf8' });
    assert.ok(stdout.indexOf('Accessibility (') >= 0 && stdout.indexOf('Accessibility (') < stdout.indexOf('Style ('));
    assert.ok(stdout.indexOf('focus-ring-removed') < stdout.indexOf('Style ('));
    assert.ok(stdout.indexOf('sentence-case') > stdout.indexOf('Style ('));
    assert.match(stdout, /\d+ accessibility, \d+ style: /);
});

test('phone browsers: zoom, field size, height and hover', () => {
    const found = check(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mobile'));
    const of = (rule) => found.filter((item) => item.rule === rule).map((item) => `${item.path.replace('src/', '')}:${item.line}`);
    assert.deepEqual(of('no-zoom-lock'), ['form.tsx:1', 'locked.html:4']); // maximum-scale=5 is fine
    assert.deepEqual(of('input-text-16'), ['form.tsx:6', 'form.tsx:7', 'forms.css:1']); // base with sm:text-sm, a file field, a placeholder, a label class and min-width pass
    assert.deepEqual(of('dynamic-viewport-height'), ['form.tsx:14', 'locked.html:6', 'locked.html:7']); // a dvh partner, min-height and md: pass
    assert.deepEqual(of('no-hover-only-content'), ['form.tsx:17', 'form.tsx:18']);
    assert.deepEqual(of('hover-media-query'), ['forms.css:7']); // one per file; @media (hover: hover) passes
});

test('motion: slow answers and endless loops', () => {
    const found = check(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mobile'));
    const of = (rule) => found.filter((item) => item.rule === rule).map((item) => `${item.path.replace('src/', '')}:${item.line}`);
    assert.deepEqual(of('interface-speed'), ['form.tsx:21', 'form.tsx:22', 'locked.html:9']); // 200 ms, an entrance and a 400 ms delay pass
    assert.deepEqual(of('no-endless-loop'), ['form.tsx:25', 'locked.html:8']); // a loader and a comment pass
});

test('glob', () => {
    assert.ok(globToRegExp('lang/*.json').test('lang/tr.json'));
    assert.ok(globToRegExp('**/node_modules/**').test('a/node_modules/b/c.js'));
    assert.ok(!globToRegExp('lang/*.json').test('lang/x/tr.json'));
});

// Renders in Chrome; skipped where no Chrome is installed.
test('narrow: overflow, cut-off, shrunk and hidden text at 320 px', { skip: !findChrome() && 'no Chrome', timeout: 90_000 }, async () => {
    const examples = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples');
    const broken = (await narrow(join(examples, 'narrow-de.html'))).map((item) => item.rule).sort();
    assert.deepEqual(broken, ['no-hidden-content-narrow', 'no-horizontal-overflow', 'no-shrunk-text', 'text-not-clipped']);
    assert.deepEqual(await narrow(join(examples, 'narrow-de.fixed.html')), []);
});

test('narrow --stress: long names and large numbers break what short ones do not', { skip: !findChrome() && 'no Chrome', timeout: 90_000 }, async () => {
    const page = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'stress.html');
    assert.deepEqual(await narrow(page), []);
    const worst = await narrow(page, { stress: true });
    assert.deepEqual([...new Set(worst.map((item) => item.rule))].sort(), ['no-horizontal-overflow', 'text-not-clipped']);
    assert.ok(worst.every((item) => item.severity === 'warn' && /^With long data/.test(item.message)));
    assert.ok(worst.some((item) => item.value.includes('Muhammed')));
});
