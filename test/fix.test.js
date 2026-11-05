import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from '../src/check.js';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');

function project(files, body) {
    const cwd = mkdtempSync(join(tmpdir(), 'adc-fix-'));
    try {
        for (const [path, source] of Object.entries(files)) {
            mkdirSync(dirname(join(cwd, path)), { recursive: true });
            writeFileSync(join(cwd, path), source);
        }
        body(cwd, (path) => readFileSync(join(cwd, path), 'utf8'));
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
}
const run = (cwd, ...args) => spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
const FIXABLE = ['spacing-scale', 'radius-scale', 'no-heavy-headings'];
const fixable = (cwd) => check(cwd).filter((item) => FIXABLE.includes(item.rule));

test('--fix: SwiftUI, Compose and Flutter values move to the nearest step, a tie goes up', () => {
    project({
        'Home.swift': 'Text("a").padding(13).padding(.top, 10).cornerRadius(7).fontWeight(.black)\nVStack(spacing: 6) {}\nText("b").font(.system(size: 20, weight: .heavy))\n',
        'Home.kt': 'Modifier.size(10.dp).padding(10.dp)\nRoundedCornerShape(13.dp)\nText("a", fontWeight = FontWeight.ExtraBold)\nArrangement.spacedBy(18.dp)\n',
        'lib/home.dart': "Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 13))\nBorderRadius.circular(7)\nSizedBox(height: 10)\nTextStyle(fontWeight: FontWeight.w900)\nRow(spacing: 14)\n",
    }, (cwd, read) => {
        const { status } = run(cwd, '--fix');
        assert.ok(status === 0 || status === 1);
        assert.equal(read('Home.swift'), 'Text("a").padding(12).padding(.top, 12).cornerRadius(8).fontWeight(.bold)\nVStack(spacing: 8) {}\nText("b").font(.system(size: 20, weight: .bold))\n');
        assert.equal(read('Home.kt'), 'Modifier.size(10.dp).padding(12.dp)\nRoundedCornerShape(12.dp)\nText("a", fontWeight = FontWeight.Bold)\nArrangement.spacedBy(20.dp)\n');
        assert.equal(read('lib/home.dart'), "Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12))\nBorderRadius.circular(8)\nSizedBox(height: 12)\nTextStyle(fontWeight: FontWeight.w700)\nRow(spacing: 16)\n");
        assert.deepEqual(fixable(cwd), []);
    });
});

test('--fix: React Native style objects, and a circle stays a circle', () => {
    project({
        'App.tsx': "import { View } from 'react-native';\nconst s = StyleSheet.create({ a: { padding: 13, borderRadius: 7, fontWeight: '900' }, b: { width: 44, borderRadius: 22 } });\nconst c = { height: 31 };\n",
    }, (cwd, read) => {
        run(cwd, '--fix');
        assert.equal(read('App.tsx'), "import { View } from 'react-native';\nconst s = StyleSheet.create({ a: { padding: 12, borderRadius: 8, fontWeight: '700' }, b: { width: 44, borderRadius: 22 } });\nconst c = { height: 31 };\n");
    });
});

test('--fix: Tailwind in React and Blade takes theme steps, sizes stay in the report', () => {
    project({
        'a.tsx': 'export const A = () => <div className="md:mt-[13px] -ml-[6px] h-[31px] gap-[7px] rounded-[7px] rounded-t-[13px] font-black">x</div>;\n',
        'b.blade.php': '<div class="p-[10px] sm:font-extrabold rounded-[40px]">x</div>\n',
    }, (cwd, read) => {
        run(cwd, '--fix');
        assert.equal(read('a.tsx'), 'export const A = () => <div className="md:mt-3 -ml-2 h-[31px] gap-2 rounded-lg rounded-t-xl font-bold">x</div>;\n');
        assert.equal(read('b.blade.php'), '<div class="p-3 sm:font-bold rounded-[40px]">x</div>\n');
        assert.deepEqual(fixable(cwd).map((item) => item.value), ['h-[31px]', 'rounded-[40px]']);
    });
});

test('--fix: a project that changes the radius theme keeps its bracket values', () => {
    project({
        'a.css': '@theme { --radius-lg: 20px; }\n',
        'a.tsx': 'export const A = () => <div className="rounded-[7px] mt-[13px]">x</div>;\n',
    }, (cwd, read) => {
        run(cwd, '--fix');
        assert.equal(read('a.tsx'), 'export const A = () => <div className="rounded-[7px] mt-3">x</div>;\n');
    });
});

test('--fix: a scale from the config file, without a grid, is used as a list', () => {
    project({
        'ai-design-check.json': JSON.stringify({ spacing: { native: [6, 12, 20] }, rules: {} }),
        'Home.swift': 'Text("a").padding(13)\n',
    }, (cwd, read) => {
        run(cwd, '--fix');
        assert.equal(read('Home.swift'), 'Text("a").padding(12)\n');
    });
});

test('--fix leaves ignored lines, turned-off rules and comments alone', () => {
    project({
        'ai-design-check.json': JSON.stringify({ rules: { 'no-heavy-headings': 'off' } }),
        'Home.swift': '// .padding(13) in a comment\n// ai-design-check-ignore-next-line spacing-scale -- matches the system bar\nText("a").padding(13)\nText("b").fontWeight(.black)\n',
    }, (cwd, read) => {
        const before = read('Home.swift');
        run(cwd, '--fix');
        assert.equal(read('Home.swift'), before);
    });
});

test('--fix --dry-run lists the changes and writes nothing; a second --fix has nothing to do', () => {
    project({ 'Home.swift': 'Text("a").padding(13)\n' }, (cwd, read) => {
        const dry = run(cwd, '--fix', '--dry-run');
        assert.match(dry.stdout, /Home\.swift:1 +\.padding\(13 → \.padding\(12 +spacing-scale/);
        assert.match(dry.stdout, /1 change would be made/);
        assert.equal(read('Home.swift'), 'Text("a").padding(13)\n');

        assert.match(run(cwd, '--fix').stdout, /1 change made/);
        assert.equal(read('Home.swift'), 'Text("a").padding(12)\n');
        assert.match(run(cwd, '--fix').stdout, /Nothing to fix/);
    });
});

test('--fix --json reports the changes', () => {
    project({ 'Home.swift': 'Text("a").padding(13)\n' }, (cwd) => {
        const { fixes, findings } = JSON.parse(run(cwd, '--fix', '--json').stdout);
        assert.deepEqual(fixes, [{ path: 'Home.swift', line: 1, rule: 'spacing-scale', from: '.padding(13', to: '.padding(12' }]);
        assert.equal(findings.filter((item) => item.rule === 'spacing-scale').length, 0);
    });
});

test('--fix --nearest-type: bracket sizes move to theme steps with their variants, leading keeps its ratio', () => {
    const view = [
        `<h2 class="mx-auto {{ $t ? 'text-4xl sm:text-6xl leading-snug' : 'text-[40px] leading-[44px] sm:text-[52px] sm:leading-[58px] lg:text-[64px] lg:leading-[68px] tracking-[-0.035em]' }} {{ $c }}">T</h2>`,
        `<p class="{{ $t ? 'text-sm' : 'text-[17px] leading-[28px] lg:text-[20px] lg:leading-[32px]' }}">D</p>`,
        `<span class="text-[13px] tracking-[1px]">S</span>`,
        '',
    ].join('\n');
    project({ 'views/hero.blade.php': view }, (cwd, read) => {
        const plain = run(cwd, '--fix', '--dry-run').stdout;
        assert.match(plain, /No mechanical fix here\. 6 findings left .*type-scale 6/);
        assert.match(plain, /Add --nearest-type/);
        run(cwd, '--fix');
        assert.equal(read('views/hero.blade.php'), view); // off by default

        const dry = run(cwd, '--fix', '--dry-run', '--nearest-type').stdout;
        assert.match(dry, /hero\.blade\.php:1 +lg:text-\[64px\] → lg:text-6xl +type-scale/);
        assert.match(dry, /hero\.blade\.php:3 +tracking-\[1px\] was set for 13 px text; check it at 14 px/);
        assert.match(dry, /Nothing else left\./);
        run(cwd, '--fix', '--nearest-type');
        assert.equal(read('views/hero.blade.php'), [
            `<h2 class="mx-auto {{ $t ? 'text-4xl sm:text-6xl leading-snug' : 'text-4xl leading-[40px] sm:text-5xl sm:leading-[52px] lg:text-6xl lg:leading-[64px] tracking-[-0.035em]' }} {{ $c }}">T</h2>`,
            `<p class="{{ $t ? 'text-sm' : 'text-lg leading-[28px] lg:text-xl lg:leading-[32px]' }}">D</p>`,
            `<span class="text-sm tracking-[1px]">S</span>`,
            '',
        ].join('\n'));
        assert.deepEqual(check(cwd).filter((item) => item.rule === 'type-scale'), []);
    });
});
