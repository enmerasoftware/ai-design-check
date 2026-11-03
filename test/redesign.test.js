import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { detectStack, laravelView, pageFiles } from '../src/redesign/detect.js';
import { diagnose, typeScale } from '../src/redesign/diagnose.js';
import { OUT, agentCommand, redesign, verify } from '../src/redesign/run.js';
import { measure } from '../src/redesign/measure.js';
import { briefMd, studyPrompt, validateBrief } from '../src/redesign/study.js';
import { findChrome } from '../src/story.js';

const laravel = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'laravel');

test('laravel: route → controller → view → layouts, includes and components', () => {
    const stack = detectStack(laravel);
    assert.equal(stack.framework, 'laravel');
    assert.equal(stack.styling, 'tailwind4');
    assert.equal(stack.cssEntry, 'resources/css/app.css');
    assert.equal(laravelView(laravel, '/'), 'home');
    assert.equal(laravelView(laravel, '/about'), 'about');
    assert.deepEqual(pageFiles(laravel, stack, '/'), [
        'resources/views/home.blade.php',
        'resources/views/layouts/app.blade.php',
        'resources/views/partials/nav.blade.php',
        'resources/views/partials/hero.blade.php',
        'resources/views/components/feature-card.blade.php',
    ]);
});

test('type scale moves every size with the body', () => {
    const { scale, map } = typeScale(16, 1.25, [11, 14, 18, 48], 14);
    assert.ok(scale.includes(16));
    assert.equal(map[14], 16);
    assert.equal(map[11], 13);
    assert.equal(map[18], 20);
});

/** A measured page with the given metrics and system, the rest empty. */
const page = ({ sizes = { 16: 1000 }, metrics = {}, spaces = { 16: 10, 24: 10 }, radii = { 12: 5 }, inventory = {}, mobile = {}, buttonInks = { '#ffffff': 10 } } = {}) => ({
    desktop: {
        url: 'http://localhost/', title: 'Test',
        system: { fonts: { Inter: 1000 }, sizes, weights: {}, textColors: {}, fills: {}, radii, spaces, buttonFills: { '#00a99b': 10 }, buttonInks, headingFont: 'Inter', background: '#ffffff' },
        metrics: { h1: { size: 56, lines: 2 }, edges: 2, emptiest: 0, viewportHeight: 900, paragraphs: [], contrast: [], contrastCount: 0, smallTargets: [], smallTargetCount: 0, overflow: 0, eyebrows: [], numbering: [], gradientText: 0, restingShadows: 0, accents: ['#00a99b'], ...metrics },
        inventory: { headings: ['h1 hello'], links: ['/a'], images: ['x.png'], fields: [], words: ['hello', 'world'], ...inventory },
    },
    mobile: { metrics: { overflow: 0, smallTargetCount: 0, h1: null, ...mobile } },
});

test('a sound page gets no decisions', () => {
    assert.equal(diagnose(page({ metrics: { moving: 1 } })).sound, true);
});

test('decisions keep the brand and leave what is sound: teal button stays as it is, teal text darkens, six sizes stay', () => {
    const result = diagnose(page({ sizes: { 14: 1000, 12: 100, 18: 50, 16: 40, 20: 30, 44: 20 }, metrics: { contrastCount: 3, contrast: [{ text: 'Sign in', ratio: 2.9, size: 14 }] } }));
    const decisions = result.passes.flatMap((pass) => pass.items.map((item) => `${item.id}: ${item.decision}`)).join('\n');
    assert.match(decisions, /small-text: Nothing under 13 px: 12 → 13/);
    assert.doesNotMatch(decisions, /type-scale/);
    assert.match(decisions, /#00a99b → #0\w{5} \(4\.\d:1\)/);
    assert.doesNotMatch(decisions, /Buttons filled/);
    assert.ok(result.keep.some((item) => item.startsWith('Filled buttons keep their fill and their text colour')));
    assert.ok(result.keep.some((item) => item.includes('headline stays 56 px')));
});

test('verify throws a pass away when content is lost or nothing improved', () => {
    const before = page({ metrics: { contrastCount: 5 } });
    assert.deepEqual(verify(before, page({ metrics: { contrastCount: 1 } }), 'color'), []);
    assert.match(verify(before, page({ metrics: { contrastCount: 1 }, inventory: { links: [] } }), 'color').join(), /Lost 1 links/);
    assert.match(verify(before, page({ metrics: { contrastCount: 1 }, buttonInks: { '#111111': 10 } }), 'color').join(), /Text on coloured buttons changed to #111111/);
    assert.match(verify(before, page({ metrics: { contrastCount: 5 } }), 'color').join(), /changed nothing/);
    assert.match(verify(before, page({ metrics: { contrastCount: 1 }, inventory: { words: ['hello'] } }), 'color').join(), /Kept 50% of the words/);
    assert.match(verify(before, page({ metrics: { contrastCount: 1 }, mobile: { overflow: 420 } }), 'color').join(), /Sideways/);
    assert.match(verify(before, page({ metrics: { contrastCount: 1, h1: { size: 40, lines: 1 } } }), 'color').join(), /headline shrank 56 → 40/);
});

test('a long phone headline gets a decision, not a crash', () => {
    const result = diagnose(page({ metrics: { moving: 1 }, mobile: { h1: { lines: 6 } } }));
    assert.match(result.passes[0].items[0].decision, /Phone headline about 38 px/);
});

test('the first screen is left to the study: a photo behind the headline is a fact, not a fixed recipe', () => {
    const result = diagnose(page({ metrics: { heroPhoto: true, moving: 0 } }));
    assert.deepEqual(result.passes, []);
    assert.equal(result.facts.heroPhoto, true);
    assert.equal(result.facts.moving, 0);
});

const studied = () => {
    const site = page({ inventory: { headings: ['h1 hello', 'h2 our work'], words: ['hello', 'world', 'three', 'kilns'], images: ['x.png'] } });
    site.desktop.system.fills = { '#ffffff': 900, '#00a99b': 100 };
    site.desktop.system.textColors = { '#111111': 900, '#ffffff': 50 };
    return site;
};
const card = (extra = {}) => ({ heading: 'Our work', says: 'What they make', problem: 'A stock photo says nothing', idea: 'Draw the three kilns firing in turn', evidence: 'three kilns', colors: { ground: '#ffffff', text: '#111111' }, ...extra });
const goodBrief = (extra = {}) => ({ product: { job: 'Sell pottery', claim: 'Fired in three kilns', proof: 'The kilns' }, keep: [{ heading: 'Hello', why: 'The headline works' }], sections: [card()], ...extra });

test('a brief is checked against the measured page', () => {
    assert.deepEqual(validateBrief(goodBrief(), studied()), []);
    assert.deepEqual(validateBrief({ leaveAlone: true, reason: 'Nothing would be better' }, studied()), []);
    const problem = (brief) => validateBrief(brief, studied()).join('\n');
    assert.match(problem({}), /product/);
    assert.match(problem(goodBrief({ keep: [] })), /"hello"/); // every main heading has a card or a reason to stay
    assert.match(problem(goodBrief({ sections: [card({ heading: 'Invented' })] })), /"Invented" is not on the page/);
    assert.match(problem(goodBrief({ sections: [card({ evidence: 'award winning' })] })), /"award winning" is not on the page/);
    assert.match(problem(goodBrief({ sections: [card({ colors: { ground: '#7c3aed', text: '#ffffff' } })] })), /#7c3aed is not in the site's colours/);
    assert.match(problem(goodBrief({ sections: [card({ colors: { ground: '#00a99b', text: '#111111' } }), card({ heading: 'Hello', colors: { ground: '#00a99b', text: '#111111' } })] })), /same coloured ground/);
    assert.match(problem(goodBrief({ sections: [card({ colors: { ground: '#ffffff', text: '#00a99b' } })] })), /2\.\d:1/);
    assert.match(problem(goodBrief({ sections: [card(), card({ heading: 'Hello' })] })), /same idea/);
    assert.match(problem(goodBrief({ sections: [card({ replacesImages: ['nope.png'] })] })), /nope\.png/);
});

test('the brief reads as section cards for the person', () => {
    const text = briefMd(goodBrief());
    assert.match(text, /## Our work/);
    assert.match(text, /Draw the three kilns/);
    assert.match(text, /Ground #ffffff, text #111111/);
    assert.match(text, /## Stays as it is/);
});

test('the craft pass may do what the brief says and nothing that breaks the page', () => {
    const before = page({ metrics: { sameGrounds: 0, lowerLabels: [] } });
    const after = (metrics, inventory = {}) => page({ metrics: { sameGrounds: 0, lowerLabels: [], moving: 2, ...metrics }, inventory });
    assert.deepEqual(verify(before, after({}), 'craft'), []);
    assert.match(verify(before, before, 'craft').join(), /changed nothing/);
    assert.match(verify(before, after({}, { images: [] }), 'craft').join(), /Lost 1 images/);
    assert.deepEqual(verify(before, after({}, { images: [] }), 'craft', { replacesImages: ['x.png'] }), []);
    assert.match(verify(before, after({ sameGrounds: 2 }), 'craft').join(), /same coloured ground/);
    assert.match(verify(before, after({ lowerLabels: ['teknik mimari'] }), 'craft').join(), /small letter: teknik mimari/);
});

test('a missing agent says what to do instead of failing later', () => {
    assert.throws(() => agentCommand('claude', { PATH: '/nonexistent' }), /claude was not found.*--agent none/s);
    assert.throws(() => agentCommand('cursor'), /Unknown agent/);
});

test('one command: study, numbered passes, craft, on a branch, with a stand-in agent', { skip: !findChrome() || process.platform === 'win32' }, async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'adc-redesign-'));
    const bin = join(cwd, '.stub');
    mkdirSync(bin);
    const html = (body) => `<!doctype html><html lang="en"><title>Kilns</title><body style="margin:0;background:#fff;color:#111;font:16px sans-serif">${body}</body></html>`;
    writeFileSync(join(cwd, 'index.html'), html('<h1 style="font-size:64px">Hello pottery</h1><p style="font-size:11px">Three kilns fire every week in our small workshop.</p><h2 style="font-size:32px">Our work</h2>'));
    // Stands in for the claude command: answers each kind of prompt the way an agent would.
    writeFileSync(join(bin, 'claude'), `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs');
const prompt = readFileSync(0, 'utf8');
const stage = /Study this page/.test(prompt) ? 'study' : /Version A:/.test(prompt) ? 'judge' : /section cards/.test(prompt) ? 'craft' : 'pass';
writeFileSync('.ai-design-check/stages.txt', (() => { try { return readFileSync('.ai-design-check/stages.txt', 'utf8'); } catch { return ''; } })() + stage + '\\n');
if (stage === 'study') writeFileSync(/Write it to (\\S+\\.json)/.exec(prompt)[1], JSON.stringify({ product: { job: 'Sell pottery', claim: 'Three kilns', proof: 'Weekly firing' }, keep: [{ heading: 'Hello pottery', why: 'Works' }], sections: [{ heading: 'Our work', says: 'What they make', problem: 'Plain', idea: 'Draw the kilns firing', evidence: 'three kilns', colors: { ground: '#ffffff', text: '#111111' } }] }));
if (stage === 'judge') console.log(JSON.stringify({ winner: /Version A: [^\\n]*before/.test(prompt) || (/craft/.test(prompt) && !/Version A: [^\\n]*craft/.test(prompt)) ? 'B' : 'A', confidence: 0.9, reason: 'Clearer' }));
if (stage === 'pass') writeFileSync('index.html', readFileSync('index.html', 'utf8').replace('font-size:11px', 'font-size:13px'));
if (stage === 'craft') writeFileSync('index.html', readFileSync('index.html', 'utf8').replace('<h2', '<style>@keyframes spin{to{opacity:.5}}</style><div style="animation:spin 2s infinite;background:#fff;height:9px"></div><h2'));
`, { mode: 0o755 });
    spawnSync('git', ['init', '-q'], { cwd });
    spawnSync('git', ['add', 'index.html'], { cwd });
    spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'start'], { cwd });
    spawnSync('git', ['config', 'user.email', 't@t'], { cwd });
    spawnSync('git', ['config', 'user.name', 't'], { cwd });
    const server = createServer((req, res) => res.end(readFileSync(join(cwd, 'index.html')))).listen(0);
    await once(server, 'listening');
    const path = process.env.PATH;
    process.env.PATH = `${bin}:${path}`;
    try {
        const result = await redesign({ cwd, url: `http://127.0.0.1:${server.address().port}/` });
        assert.deepEqual(readFileSync(join(cwd, '.ai-design-check', 'stages.txt'), 'utf8').trim().split('\n').filter((stage) => stage !== 'judge'), ['study', 'pass', 'craft']);
        assert.deepEqual(result.passes.map((pass) => [pass.name, pass.kept]), [['type', true], ['craft', true]]);
        assert.match(readFileSync(join(cwd, OUT, 'BRIEF.md'), 'utf8'), /Draw the kilns firing/);
        assert.match(spawnSync('git', ['log', '--format=%s'], { cwd, encoding: 'utf8' }).stdout, /Design: craft/);
    } finally {
        process.env.PATH = path;
        server.close();
        rmSync(cwd, { recursive: true, force: true });
    }
});

test('--plan stops after the study so a person can read and edit the cards', { skip: !findChrome() || process.platform === 'win32' }, async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'adc-plan-'));
    const bin = join(cwd, '.stub');
    mkdirSync(bin);
    writeFileSync(join(cwd, 'index.html'), '<!doctype html><html lang="en"><title>Kilns</title><body><h1 style="font-size:64px">Hello pottery</h1><p>Three kilns fire every week.</p></body></html>');
    writeFileSync(join(bin, 'claude'), `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs');
writeFileSync(/Write it to (\\S+\\.json)/.exec(readFileSync(0, 'utf8'))[1], JSON.stringify({ leaveAlone: true, reason: 'Nothing to gain' }));
`, { mode: 0o755 });
    spawnSync('git', ['init', '-q'], { cwd });
    const server = createServer((req, res) => res.end(readFileSync(join(cwd, 'index.html')))).listen(0);
    await once(server, 'listening');
    const path = process.env.PATH;
    process.env.PATH = `${bin}:${path}`;
    try {
        const result = await redesign({ cwd, url: `http://127.0.0.1:${server.address().port}/`, plan: true });
        assert.equal(result.study.leaveAlone, true);
        assert.deepEqual(result.passes, []);
        assert.ok(existsSync(join(cwd, OUT, 'brief.json')));
        assert.equal(spawnSync('git', ['branch', '--list'], { cwd, encoding: 'utf8' }).stdout.trim(), '');
    } finally {
        process.env.PATH = path;
        server.close();
        rmSync(cwd, { recursive: true, force: true });
    }
});

test('smooth scrolling does not fool the contrast measure', { skip: !findChrome() }, async () => {
    const html = `<!doctype html><html lang="en" style="scroll-behavior:smooth"><title>t</title><body style="margin:0;font:16px sans-serif;background:#fff;color:#111"><div style="height:2400px">Top words here</div><section style="background:#111;color:#fff;padding:40px"><h2 style="font-size:32px">White on dark far down</h2><p>Light words that pass with room to spare</p></section><div style="height:2400px">Bottom words</div></body></html>`;
    const { desktop } = await measure(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { widths: [1440] });
    assert.deepEqual(desktop.metrics.contrast, []);
});

test('see-through text counts as what it looks like', { skip: !findChrome() }, async () => {
    const html = `<!doctype html><html lang="en"><title>t</title><body style="margin:0;font:16px sans-serif;background:#fff;color:#111"><p style="color:rgba(0,0,0,.3)">Faint words by alpha here</p><button disabled style="opacity:.4;background:#0d6efd;color:#fff;border:0;padding:12px">Faint submit</button><p>Solid words</p></body></html>`;
    const { desktop } = await measure(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { widths: [1440] });
    assert.ok(desktop.metrics.contrast.some((item) => item.text.startsWith('Faint words')), JSON.stringify(desktop.metrics.contrast));
});

test('a problem names what failed, so the second try can fix it', () => {
    const before = page({ metrics: { contrastCount: 1, contrast: [{ text: 'Old', ratio: 3, size: 16 }], moving: 1 } });
    const after = page({ metrics: { contrastCount: 2, contrast: [{ text: 'Old', ratio: 3, size: 16 }, { text: 'New label', ratio: 1.5, size: 14 }], moving: 2 } });
    assert.match(verify(before, after, 'craft').join(), /Contrast failures 1 → 2: "New label" 1\.5:1/);
});

test('the study writes in the language of the page', () => {
    const site = studied();
    site.desktop.lang = 'de';
    const prompt = studyPrompt({ stack: { framework: 'html', styling: 'css' }, files: [], page: site, diagnosis: diagnose(site), screenshots: [], out: 'x', url: 'http://x/' });
    assert.match(prompt, /Write the cards in the language of the page \(de\)/);
});
