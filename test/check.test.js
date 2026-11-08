import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
    const types = ['render', 'native', 'class', 'regex', 'i18n-case', 'icon-button-name', 'shared-components', 'style-overrides', 'repeated-markup', 'shared-looks', 'min-width-chain', 'merged-leading', 'positioned-scroller', 'snap-padding'];
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

test('narrow --scope and --ignore: only the module is reported, decoration is not text', { skip: !findChrome() && 'no Chrome', timeout: 240_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-narrow-scope-'));
    const file = join(dir, 'page.html');
    const cut = (text) => `<div style="width:80px;overflow:hidden;white-space:nowrap">${text}</div>`;
    writeFileSync(file, `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>t</title></head><body style="margin:0;font:16px sans-serif"><nav>${cut('Shell navigation label cut off')}</nav><div class="badge">${cut('Test badge text cut off')}</div><div data-block-type="module-1">${cut('Module label that is cut off')}<div aria-hidden="true">${cut('0101 1100 code rain row cut off')}</div></div></body></html>`);
    const labels = async (options) => (await narrow(file, options)).filter((item) => item.rule === 'text-not-clipped').map((item) => item.value).join(' | ');
    const whole = await labels({});
    assert.match(whole, /Shell navigation/);
    assert.doesNotMatch(whole, /code rain/);
    const scoped = await labels({ scope: ['[data-block-type=module-1]'] });
    assert.match(scoped, /Module label/);
    assert.doesNotMatch(scoped, /Shell|badge/);
    const ignored = await labels({ ignore: ['nav'] });
    assert.match(ignored, /Test badge/);
    assert.doesNotMatch(ignored, /Shell/);
    await assert.rejects(narrow(file, { scope: ['.module-9'] }), (error) => error.exitCode === 2 && /matches nothing/.test(error.message));
});

test('a truncated line in a flex item without min-w-0 is named where min-w-0 goes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-chain-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Showcase.tsx'), [
        'export function Showcase({ apps }) {',
        '    const [name] = useState<string>("");',
        '    return (',
        '        <div className="grid grid-cols-2 gap-4">',
        '            {apps.map((app) => (',
        '                <a key={app.id} href={app.url} className="group flex">',
        '                    <div className="flex flex-1 flex-col rounded-lg border p-4">',
        '                        <p className="truncate font-medium">{app.name}</p>',
        '                    </div>',
        '                </a>',
        '            ))}',
        '            <div className="flex items-center gap-2">',
        '                <img src="x.png" />',
        '                <div className="min-w-0 flex-1"><p className="truncate">{name}</p></div>',
        '            </div>',
        '            <div className="flex gap-2"><span className="truncate">Its own flex item</span></div>',
        "            <div className={cn('flex', open && 'gap-2')}>",
        '                <div className="flex-1"><span className="truncate">Wide</span></div>',
        '            </div>',
        '            <div className="flex"><div className="w-48"><span className="truncate">Fixed width</span></div></div>',
        '            <ul className="flex flex-col"><li><span className="truncate">Column</span></li></ul>',
        '            <Card><span className="truncate">Inside a component</span></Card>',
        '            <div className="flex w-max gap-3"><a className="flex shrink-0 gap-2"><span className="max-w-48 truncate">Capped line</span></a></div>',
        '            <a className="group flex">',
        '                <Panel className="flex flex-1 flex-col">',
        '                    <div className="flex items-center gap-3"><div className="min-w-0"><p className="truncate">Inner min-w-0 is not enough</p></div></div>',
        '                </Panel>',
        '            </a>',
        '            <div className="flex flex-wrap gap-3"><>',
        '                <span className="min-w-0 flex-1 truncate">A fragment is not a box</span>',
        '            </></div>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    writeFileSync(join(dir, 'src', 'list.html'), '<div class="flex gap-2"><div class="grow"><span class="truncate">Bad</span></div></div>\n<div class="flex"><div class="min-w-0 grow"><span class="truncate">Good</span></div></div>\n');
    const found = check(dir).filter((item) => item.rule === 'cell-holds-content').map((item) => `${item.path}:${item.line}`);
    assert.deepEqual(found, ['src/list.html:1', 'src/Showcase.tsx:7', 'src/Showcase.tsx:18', 'src/Showcase.tsx:25']);
});

test('Blade: classes inside {{ }} ternaries, @class() and Alpine :class are read', () => {
    const source = [
        `<h2 class="mx-auto {{ $on ? 'text-4xl' : 'text-[40px] leading-[44px]' }} {{ $color }}">T</h2>`,
        `<span @class(['p-[13px]', 'font-bold' => $active])>S</span>`,
        `<div x-bind:class="{ 'text-[21px]': open }" :class="open ? 'p-[7px]' : ''">D</div>`,
    ].join('\n');
    const text = classUnits(source).map((unit) => unit.text).join(' | ');
    assert.equal(text, 'mx-auto text-4xl text-[40px] leading-[44px] | p-[13px] font-bold | text-[21px] | p-[7px]');
});

test('a box that scrolls sideways in a grid item without min-w-0 is named where min-w-0 goes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-scroll-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Cli.tsx'), [
        'export function Cli() {',
        '    return (',
        '        <div className="grid gap-6 lg:grid-cols-2">',
        '            <div>',
        '                <pre className="overflow-x-auto rounded p-4">npx @enmera/ai-design-check scan https://example.com --scope main</pre>',
        '            </div>',
        '            <div className="min-w-0"><pre className="overflow-x-auto">fine</pre></div>',
        '            <pre className="overflow-x-auto">the box itself may be the item</pre>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'cell-holds-content').map((item) => `${item.path}:${item.line}`);
    assert.deepEqual(found, ['src/Cli.tsx:4']);
});

test('a component is looked through to its root: where it is defined, in this file or a relative import', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-root-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Market.tsx'), [
        "import { MarketAppTile } from './MarketAppTile';",
        "import Quiet, { Chip as Pill } from './parts';",
        'function Section({ className, children }) {',
        "    return <section className={cn('min-w-0 rounded-xl border p-4', className)}>{children}</section>;",
        '}',
        'const Row = ({ app }) => (',
        '    <a className="flex items-center gap-3">',
        '        <div className="min-w-0"><p className="truncate">{app.name}</p></div>',
        '    </a>',
        ');',
        'export function Market({ apps }) {',
        '    return (',
        '        <div className="grid gap-4 lg:grid-cols-3">',
        '            <Section className="lg:col-span-2">',
        '                <pre className="overflow-x-auto">npx @enmera/ai-design-check scan https://example.com</pre>',
        '            </Section>',
        '            {apps.map((app) => <Row key={app.id} app={app} />)}',
        '            {apps.map((app) => <MarketAppTile key={app.id} app={app} />)}',
        '            <Quiet />',
        '            <Pill className="min-w-0" />',
        '            <Unknown><span className="truncate">Not found</span></Unknown>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    writeFileSync(join(dir, 'src', 'MarketAppTile.tsx'), [
        'export function MarketAppTile({ app }) {',
        '    if (!app) return null;',
        '    return (',
        '        <Link href={app.url} className="flex items-center gap-3 rounded-lg border p-3">',
        '            <img src={app.icon} />',
        '            <div className="min-w-0 flex-1"><p className="truncate font-medium">{app.name}</p></div>',
        '        </Link>',
        '    );',
        '}',
    ].join('\n'));
    writeFileSync(join(dir, 'src', 'parts.tsx'), [
        'export const Chip = forwardRef((props, ref) => (',
        '    <span ref={ref} className="flex gap-1"><b className="min-w-0"><i className="truncate">{props.label}</i></b></span>',
        '));',
        'export default function Quiet() {',
        '    return (',
        '        // ai-design-check-ignore-next-line cell-holds-content -- a fixed set of short labels',
        '        <div className="flex gap-2"><p className="min-w-0"><span className="truncate">Short</span></p></div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'cell-holds-content');
    assert.deepEqual(found.map((item) => `${item.path}:${item.line}`), ['src/Market.tsx:7', 'src/MarketAppTile.tsx:4']);
    assert.match(found[0].message, /^<a> \(the root of <Row>, a grid item at src\/Market\.tsx:17\) is a grid item holding a truncated line but has no min-w-0/);
    assert.match(found[1].message, /^<Link> \(the root of <MarketAppTile>, a grid item at src\/Market\.tsx:18\)/);
});

test('a link laid out as a card is not a hand-written button link', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-cardlink-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Links.tsx'), [
        'export function Links() {',
        '    return (',
        '        <div>',
        '            <Link href="/a" className="flex flex-col rounded-3xl border bg-white p-5">Tile</Link>',
        '            <Link href="/b" className="h-full rounded-xl border bg-card px-3 py-2">Tile</Link>',
        '            <a href="/c" className="grid rounded bg-muted px-2">Tile</a>',
        '            <a href="/d" className="rounded-2xl bg-card p-6">Tile</a>',
        '            <a href="/e" className="rounded-lg bg-card px-4 py-2">',
        '                <h3>Title</h3>',
        '                <p>Body</p>',
        '            </a>',
        '            <a href="/f" className="rounded-lg bg-card px-4 py-2"><span>App</span><span>Free</span></a>',
        '            <Link href="/g" className="rounded-md bg-primary px-4 py-2 text-white">Save</Link>',
        '            <a href="/h" className="rounded-md bg-primary px-3 py-1.5"><ArrowIcon /> Next</a>',
        '            <a href="/i" className="rounded bg-primary p-2">Go</a>',
        '            <a href="/j" className="flex items-center gap-2 rounded bg-primary px-4 py-2"><svg /> Start</a>',
        // A logo and a label, or a label and a lucide icon (no Icon suffix), are still a button.
        '            <a href="/k" className="btn rounded-md bg-primary px-4 py-2"><img src="/google.svg" alt="" />Continue with Google</a>',
        '            <Link href="/l" className="inline-flex px-4 py-2 rounded-md bg-primary"><span>Get started</span><ArrowRight className="size-4" /></Link>',
        '            <a href="/m" className="rounded-lg bg-card px-4 py-2"><Image src="/a.png" alt="" /><span>App</span><span>Free</span></a>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'use-shared-looks').map((item) => `${item.line} ${item.value}`);
    assert.deepEqual(found, ['13 button link:Link', '14 button link:a', '15 button link:a', '16 button link:a', '17 button link:a', '18 button link:Link']);
});

test('a scroll box holding an absolute or sr-only child is positioned', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-scroller-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Plans.tsx'), [
        'export function Plans() {',
        '    return (',
        '        <div>',
        '            <div className="overflow-x-auto"><table><caption className="sr-only">Plans</caption></table></div>',
        '            <div className="overflow-auto rounded"><div><span className="absolute right-0">New</span></div></div>',
        '            <div className="overflow-x-scroll md:overflow-visible"><span className="sr-only">Swipe</span></div>',
        '            <div className="relative overflow-x-auto"><table><caption className="sr-only">Plans</caption></table></div>',
        '            <div className="overflow-x-auto"><div className="relative"><span className="absolute inset-0" /></div></div>',
        '            <div className="overflow-x-auto"><Card><span className="sr-only">Inside a component</span></Card></div>',
        '            <div className="overflow-hidden"><span className="sr-only">Clipped anyway</span></div>',
        '            <div className="sticky top-0 overflow-x-auto"><span className="absolute">Positioned</span></div>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    writeFileSync(join(dir, 'src', 'table.html'), '<div class="overflow-x-auto"><table><caption class="sr-only">Plans</caption></table></div>\n<div class="relative overflow-x-auto"><span class="sr-only">ok</span></div>\n');
    const found = check(dir).filter((item) => item.rule === 'scroller-holds-absolute');
    assert.deepEqual(found.map((item) => `${item.path}:${item.line}`), ['src/Plans.tsx:4', 'src/Plans.tsx:5', 'src/Plans.tsx:6', 'src/table.html:1']);
    assert.match(found[0].message, /holds <caption> that is sr-only.*add relative to the scroller$/);
});

test('a snap row with side padding has the same scroll padding', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-snap-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Row.tsx'), [
        'export function Row() {',
        '    return (',
        '        <div>',
        '            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4">a</div>',
        '            <div className="flex snap-mandatory overflow-x-auto ps-6">b</div>',
        "            <div className={cn('flex snap-x', 'md:pl-8')}>c</div>",
        '            <div className="flex snap-x gap-4 overflow-x-auto px-4 scroll-px-4">d</div>',
        '            <div className="flex snap-mandatory px-4">e</div>',
        '            <div className="flex overflow-x-auto px-4">f</div>',
        '            <div className="flex snap-x md:px-8 md:scroll-pl-8">g</div>',
        '            <div className="flex snap-x overflow-x-auto p-4">h</div>',
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'snap-scroll-padding');
    assert.deepEqual(found.map((item) => `${item.line} ${item.value}`), ['4 px-4', '5 ps-6', '6 md:pl-8']);
    assert.match(found[0].message, /add scroll-px-4 to match it$/);
});

test('an ignore directly after "=> (" or "return (" is a // line comment, and it counts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-ignore-jsx-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'List.tsx'), [
        'export const List = ({ items }) => (',
        '    <div>',
        '        {items.map((item) => (',
        '            // ai-design-check-ignore-next-line spacing-scale -- matches the photo grid',
        '            <p key={item} className="mt-[13px]">{item}</p>',
        '        ))}',
        '        <p className="mt-[13px]">Kept</p>',
        '    </div>',
        ');',
        'export function Hero() {',
        '    return (',
        '        // ai-design-check-ignore-next-line spacing-scale -- the hero lines up with the photo',
        '        <div className="mt-[13px]">Hero</div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'spacing-scale').map((item) => item.line);
    assert.deepEqual(found, [7]);
});

test('cn(): a line height before a font size is dropped by tailwind-merge', () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-merge-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'Via.tsx'), [
        'export function Via({ big }) {',
        '    return (',
        '        <div>',
        "            <h2 className={cn('font-semibold leading-snug', 'text-xl')}>Via</h2>",
        "            <h3 className={twMerge('leading-tight md:text-2xl', big && 'text-3xl')}>Big</h3>",
        "            <h4 className={cn('text-xl leading-snug')}>After the size</h4>",
        "            <h5 className={cn('text-xl/snug')}>Paired</h5>",
        "            <h6 className={clsx('leading-snug', 'text-xl')}>clsx does not merge</h6>",
        "            <p className={cn('md:leading-snug', 'text-xl')}>Other variant</p>",
        "            <p className=\"leading-snug text-xl\">Plain string</p>",
        '        </div>',
        '    );',
        '}',
    ].join('\n'));
    const found = check(dir).filter((item) => item.rule === 'leading-survives-merge').map((item) => `${item.line} ${item.value}`);
    assert.deepEqual(found, ['4 leading-snug … text-xl', '5 leading-tight … text-3xl']);
});

test('narrow: content wider than the screen on a page that cannot scroll sideways is information', { skip: !findChrome() && 'no Chrome', timeout: 90_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-sideways-'));
    const file = join(dir, 'page.html');
    writeFileSync(file, '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><style>body{margin:0;overflow-x:hidden;font:16px/1.5 Georgia,serif}</style></head><body><p>Short words.</p><div style="width:485px;height:20px;background:#eee"></div></body></html>');
    const found = (await narrow(file)).filter((item) => item.rule === 'no-horizontal-overflow');
    assert.deepEqual(found.map((item) => item.severity), ['info']);
});

const narrowPage = (body, style = '') => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>t</title><style>body{margin:0;font:16px/1.5 sans-serif}${style}</style></head><body>${body}</body></html>`;

test('narrow: screen-reader-only text is cut on purpose, a real label is not', { skip: !findChrome() && 'no Chrome', timeout: 90_000 }, async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'adc-sronly-')), 'page.html');
    writeFileSync(file, narrowPage([
        '<a href="#main"><span class="sr-only">Skip to the main content of this page</span></a>',
        '<span class="vh">Visually hidden heading text for readers</span>',
        '<span style="position:absolute;width:60px;overflow:hidden;white-space:nowrap;clip:rect(0 0 0 0)">Clipped away with rect only, no 1 px box</span>',
        '<div class="sr-wrap"><span style="white-space:nowrap">A long label inside a hidden wrapper box</span></div>',
        '<div style="width:80px;overflow:hidden;white-space:nowrap">Real label that is cut off</div>',
    ].join(''), '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.sr-wrap{position:absolute;width:1px;height:1px;overflow:hidden}'));
    const cut = (await narrow(file)).filter((item) => item.rule === 'text-not-clipped').map((item) => item.value);
    assert.deepEqual(cut, ['div "Real label that is cut off"']);
});

test('narrow: a link that moves into the hamburger menu is not hidden content', { skip: !findChrome() && 'no Chrome', timeout: 90_000 }, async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'adc-hamburger-')), 'page.html');
    writeFileSync(file, narrowPage([
        '<header><nav class="top"><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/blog">Blog</a></nav>',
        '<button class="burger" aria-controls="menu" aria-expanded="false">Menu</button>',
        '<div id="menu" hidden><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/news">Blog</a></div></header>',
        '<span class="desk">Free for teams</span><details><summary>More</summary><span>Free for teams</span></details>',
        '<p class="desk">Only on desktop, nowhere else</p>',
    ].join(''), '.burger{display:none}@media (max-width:600px){.top,.desk{display:none}.burger{display:block}}'));
    const hidden = (await narrow(file)).filter((item) => item.rule === 'no-hidden-content-narrow').map((item) => item.value).sort();
    // Blog points elsewhere in the menu, so it is gone; the text in <details> is the same words in a menu.
    assert.deepEqual(hidden, ['a "Blog"', 'p "Only on desktop, nowhere else"']);
});

test('narrow: the deepest box that sticks out is named, with its classes, even without text', { skip: !findChrome() && 'no Chrome', timeout: 180_000 }, async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-culprit-'));
    const plain = join(dir, 'plain.html');
    writeFileSync(plain, narrowPage('<p>Short words.</p><button class="q faq-row" style="display:flex;width:100%;padding:0;border:0"><span>Question</span><span class="size-8 rounded-full bg-ink extra" style="flex:none;width:32px;height:32px;margin-left:400px;background:#222"></span></button>'));
    const found = (await narrow(plain)).filter((item) => item.rule === 'no-horizontal-overflow');
    assert.equal(found.length, 1);
    assert.match(found[0].message, /scrolls sideways: span\.size-8\.rounded-full\.bg-ink$/);
    const stressed = join(dir, 'stress.html');
    writeFileSync(stressed, narrowPage('<div class="row" style="display:flex;align-items:center"><span class="who" style="white-space:nowrap;font-size:24px">Ada Lovelace</span><i class="dot size-8" style="flex:none;width:32px;height:32px;background:#222"></i></div>'));
    assert.deepEqual((await narrow(stressed)).filter((item) => item.rule === 'no-horizontal-overflow'), []);
    const worst = (await narrow(stressed, { stress: true })).filter((item) => item.rule === 'no-horizontal-overflow');
    assert.equal(worst.length, 1);
    assert.match(worst[0].message, /^With long data the page is \d+ px wide at 320 px: .*i\.dot\.size-8/);
    assert.match(worst[0].message, /span\.who "Muhammed/);
    assert.doesNotMatch(worst[0].message, /div\.row/);
});
