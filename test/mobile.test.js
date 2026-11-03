import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, coverage } from '../src/check.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(here, 'fixtures', name);
const bin = join(here, '..', 'bin', 'ai-design-check.js');
const values = (findings, rule, file = '') => findings.filter((item) => item.rule === rule && item.path.endsWith(file)).map((item) => item.value);

test('React Native: style objects are read in files that import it', () => {
    const rn = check(fixture('rn'));
    assert.deepEqual(values(rn, 'spacing-scale'), ['padding: 13', 'marginTop: 10']);
    assert.deepEqual(values(rn, 'radius-scale'), ['borderRadius: 7', 'borderRadius: 13']); // 22 on a 44 wide box is a circle, 999 a pill
    assert.deepEqual(values(rn, 'type-scale'), ['fontSize: 10']); // 24 is a size, not a guess
    assert.deepEqual(values(rn, 'no-heavy-headings'), ["fontWeight: '900'"]);
    assert.deepEqual(values(rn, 'no-heavy-card-shadow'), ['shadowRadius: 40', 'elevation: 12']);
    assert.deepEqual(values(rn, 'dynamic-type'), ['allowFontScaling={false}']);
    assert.equal(values(rn, 'no-ai-gradients').length, 1);
    assert.equal(values(rn, 'no-bounce-easing').length, 1);
    assert.equal(values(rn, 'pulse-for-live-only').length, 1);
    assert.equal(values(rn, 'no-decorative-uppercase').length, 2); // GET STARTED and textTransform with letterSpacing
    assert.equal(values(rn, 'error-copy').length, 1);
    assert.equal(rn.filter((item) => item.path.endsWith('Web.tsx')).length, 0);
});

test('React Native: a touchable is measured through its stylesheet', () => {
    const rn = check(fixture('rn'));
    assert.deepEqual(values(rn, 'tap-target'), ['height: 30', 'height: 30']); // hitSlop and 48 tall pass
    assert.deepEqual(rn.filter((item) => item.rule === 'tap-target').map((item) => item.line), [10, 13]);
    assert.deepEqual(rn.filter((item) => item.rule === 'icon-button-name').map((item) => item.line), [13]);
});

test('Flutter: dart files are read', () => {
    const dart = check(fixture('flutter'));
    assert.deepEqual(values(dart, 'spacing-scale'), ['13', 'spacing: 10', 'SizedBox(height: 10)']);
    assert.deepEqual(values(dart, 'radius-scale'), ['BorderRadius.circular(7']); // 22 on a 44 wide box is a circle
    assert.deepEqual(values(dart, 'type-scale'), ['fontSize: 10']);
    assert.deepEqual(values(dart, 'no-heavy-headings'), ['FontWeight.w900']);
    assert.deepEqual(values(dart, 'no-heavy-card-shadow'), ['blurRadius: 40', 'elevation: 12']);
    assert.deepEqual(values(dart, 'dynamic-type'), ['textScaler: TextScaler.noScaling']);
    assert.equal(values(dart, 'tap-target').length, 3);
    assert.equal(values(dart, 'icon-button-name').length, 1);
    assert.deepEqual(values(dart, 'sentence-case'), ["Text('Recent Activity'"]);
    for (const rule of ['no-ai-gradients', 'no-bounce-easing', 'pulse-for-live-only', 'no-blur-blobs', 'no-sparkle-for-ai', 'icons-not-emoji', 'no-greeting-headline', 'error-copy', 'ellipsis-character', 'specific-action-labels']) assert.equal(values(dart, rule).length, 1, rule);
    assert.equal(values(dart, 'no-decorative-uppercase').length, 1);
    assert.ok(dart.every((item) => !item.path.endsWith('.g.dart')), 'generated code is not read');
    assert.ok(dart.every((item) => item.line !== 2), 'comments are not read');
});

test('SwiftUI and Compose: copy, labels and shouting caps', () => {
    const native = check(fixture('native'));
    for (const file of ['Copy.swift', 'Copy.kt']) {
        for (const rule of ['error-copy', 'ellipsis-character', 'no-buzzwords', 'no-unsourced-proof', 'specific-action-labels', 'icon-button-name']) assert.equal(values(native, rule, file).length, 1, `${file} ${rule}`);
        assert.equal(values(native, 'no-decorative-uppercase', file).length, 2, file);
    }
});

test('what could not be read is named, not reported as clean', () => {
    assert.deepEqual(coverage(fixture('unread')), { read: 0, unread: { php: 1 } });
    assert.deepEqual(coverage(fixture('flutter')), { read: 1, unread: {} });
    const { status, stdout } = spawnSync(process.execPath, [bin], { cwd: fixture('unread'), encoding: 'utf8' });
    assert.doesNotMatch(stdout, /No findings/);
    assert.match(stdout, /Nothing checked: 1 \.php file/);
    assert.equal(status, 2);
    const json = spawnSync(process.execPath, [bin, '--json'], { cwd: fixture('unread'), encoding: 'utf8' });
    assert.deepEqual(JSON.parse(json.stdout).unread, { php: 1 });
});

test('a pill and a circle are not off the radius scale, in any language', () => {
    const project = mkdtempSync(join(tmpdir(), 'adc-radius-'));
    try {
        writeFileSync(join(project, 'A.swift'), 'a.cornerRadius(999)\nb.cornerRadius(7)\nc.frame(width: 44, height: 44).cornerRadius(22)\n');
        writeFileSync(join(project, 'B.kt'), 'RoundedCornerShape(999.dp)\nRoundedCornerShape(7.dp)\nModifier.size(44.dp).clip(RoundedCornerShape(22.dp))\n');
        assert.deepEqual(values(check(project), 'radius-scale'), ['cornerRadius(7', 'RoundedCornerShape(7.dp']);
    } finally {
        rmSync(project, { recursive: true, force: true });
    }
});

test('test code is not interface code', () => {
    const project = mkdtempSync(join(tmpdir(), 'adc-tests-'));
    try {
        mkdirSync(join(project, 'test'));
        for (const file of ['AppTests.swift', 'AppTest.kt', 'test/a_test.dart', 'a.test.tsx']) writeFileSync(join(project, file), 'Text("Oops, that did not work")\n');
        assert.deepEqual(check(project), []);
    } finally {
        rmSync(project, { recursive: true, force: true });
    }
});

test('an escaped quote does not end a Dart string', () => {
    const project = mkdtempSync(join(tmpdir(), 'adc-dart-'));
    try {
        writeFileSync(join(project, 'a.dart'), "Text('It\\'s great to see you! Really');\n");
        assert.deepEqual(values(check(project), 'no-exclamation-copy'), ["'It\\'s great to see you! Really'"]);
    } finally {
        rmSync(project, { recursive: true, force: true });
    }
});

test('the newer rules reach app code too', () => {
    const project = mkdtempSync(join(tmpdir(), 'adc-new-'));
    try {
        writeFileSync(join(project, 'A.swift'), 'Text("a").tracking(-3)\nText("b").font(.custom("Inter", size: 16))\nText("c").font(.system(size: 9))\nImage("")\nText("Stop this security theater")\nText("WE ARE THE BEST TEAM IN THE WHOLE TOWN")\nRadialGradient(colors: [.blue, .clear], center: .center, startRadius: 0, endRadius: 200)\nCard().shadow(color: .black, radius: 0, x: 6, y: 6)\n// passes\nImage(systemName: "x").font(.system(size: 8))\nText("d").tracking(-0.5)\nText("e").font(.custom("Rubik", size: 16))\nText("f").font(.system(size: 13))\nImage("logo")\nText("The city theater")\nText("SHORT")\nRadialGradient(colors: [.blue, .red], center: .center, startRadius: 0, endRadius: 200)\nCard().shadow(color: .black, radius: 8, x: 6, y: 6)\n');
        writeFileSync(join(project, 'B.kt'), 'Text("a", textAlign = TextAlign.Justify)\nText("b", letterSpacing = (-3).sp)\nText("c", fontSize = 9.sp, fontFamily = FontFamily(Font(R.font.inter)))\nText("Stop this security theater")\nBrush.radialGradient(listOf(Blue, Color.Transparent))\n// passes\nText("d", textAlign = TextAlign.Start)\nText("e", letterSpacing = 1.sp)\nText("f", fontFamily = FontFamily(Font(R.font.rubik)))\n');
        writeFileSync(join(project, 'c.dart'), "Text('a', textAlign: TextAlign.justify, style: TextStyle(letterSpacing: -3, fontFamily: 'Inter'));\nGoogleFonts.poppins();\nImage.network('');\nText('Stop this security theater');\nRadialGradient(colors: [Colors.blue, Colors.transparent]);\nText('WE ARE THE BEST TEAM IN THE WHOLE TOWN');\n// passes\nText('b', textAlign: TextAlign.start, style: TextStyle(letterSpacing: 1, fontFamily: 'Rubik'));\nGoogleFonts.rubik();\nImage.network('https://x.test/a.png');\n");
        writeFileSync(join(project, 'd.tsx'), "import { View } from 'react-native';\nconst s = { a: { textAlign: 'justify', letterSpacing: -3, fontFamily: 'Inter' }, b: { shadowOffset: { width: 6, height: 6 }, shadowRadius: 0 } };\nexport const A = () => <Image source={{ uri: '' }} />;\nconst p = <RadialGradient colors={['#00f', 'transparent']} />;\n// passes\nconst t = { a: { textAlign: 'left', letterSpacing: 1, fontFamily: 'Rubik' }, b: { shadowOffset: { width: 6, height: 6 }, shadowRadius: 8 } };\nconst u = <Image source={{ uri: 'https://x.test/a.png' }} />;\n");
        const found = check(project);
        const counts = (file) => Object.fromEntries(['no-justified-text', 'no-crushed-tracking', 'no-overused-font', 'no-tiny-text', 'image-not-broken', 'no-theater-copy', 'no-all-caps-sentences', 'no-radial-halo', 'no-hard-offset-shadow'].map((rule) => [rule, values(found, rule, file).length]).filter(([, total]) => total));
        assert.deepEqual(counts('A.swift'), { 'no-crushed-tracking': 1, 'no-overused-font': 1, 'no-tiny-text': 1, 'image-not-broken': 1, 'no-theater-copy': 1, 'no-all-caps-sentences': 1, 'no-radial-halo': 1, 'no-hard-offset-shadow': 1 });
        assert.deepEqual(counts('B.kt'), { 'no-justified-text': 1, 'no-crushed-tracking': 1, 'no-overused-font': 1, 'no-tiny-text': 1, 'no-theater-copy': 1, 'no-radial-halo': 1 });
        assert.deepEqual(counts('c.dart'), { 'no-justified-text': 1, 'no-crushed-tracking': 1, 'no-overused-font': 2, 'image-not-broken': 1, 'no-theater-copy': 1, 'no-all-caps-sentences': 1, 'no-radial-halo': 1 });
        assert.deepEqual(counts('d.tsx'), { 'no-justified-text': 1, 'no-crushed-tracking': 1, 'no-overused-font': 1, 'image-not-broken': 1, 'no-radial-halo': 1, 'no-hard-offset-shadow': 1 });
    } finally {
        rmSync(project, { recursive: true, force: true });
    }
});
