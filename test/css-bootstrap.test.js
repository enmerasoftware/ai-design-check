import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, coverage, spacingScales } from '../src/check.js';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');

/** A throwaway project: { path: content }, removed afterwards. */
function project(files, body) {
    const cwd = mkdtempSync(join(tmpdir(), 'adc-css-'));
    try {
        for (const [path, content] of Object.entries(files)) {
            mkdirSync(dirname(join(cwd, path)), { recursive: true });
            writeFileSync(join(cwd, path), content);
        }

        return body(cwd, (path) => readFileSync(join(cwd, path), 'utf8'));
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
}
const run = (cwd, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
const of = (findings, rule) => findings.filter((item) => item.rule === rule).map((item) => item.value);
const at = (findings, rule) => findings.filter((item) => item.rule === rule).map((item) => `${item.path}:${item.line} ${item.value}`);

/** The rules a generated Bootstrap page trips, and a careful one must not. */
const RULES = ['no-ai-gradients', 'no-hover-scale', 'spacing-scale', 'radius-scale', 'no-decorative-uppercase', 'icon-button-name', 'focus-ring-removed', 'no-gradient-buttons', 'no-heavy-headings', 'no-heavy-card-shadow'];

const GENERATED = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .feature { margin-top: 13px; }
        .card { border-radius: 13px; }
        .card:hover { transform: scale(1.05); }
    </style>
</head>
<body>
    <section class="hero bg-gradient text-white py-5">
        <div class="container">
            <span class="text-uppercase small fw-bold text-white-50">Our platform</span>
            <h1 class="display-4 fw-bolder">Build faster</h1>
            <a href="#" class="btn btn-light btn-lg bg-gradient">Get started</a>
        </div>
    </section>
    <div class="card shadow-lg p-4">Card</div>
    <button class="btn"><i class="bi bi-trash"></i></button>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    <input class="form-control shadow-none" type="email" placeholder="Email">
    <ul class="dropdown-menu shadow-lg"><li>Item</li></ul>
    <div class="modal-content shadow-lg">Modal</div>
    <div class="toast shadow-lg">Toast</div>
    <div class="offcanvas offcanvas-end shadow-lg">Panel</div>
</body>
</html>
`;

const CAREFUL = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .hero { background: var(--bs-body-bg); margin-top: 16px; padding: 24px 12px 0; }
        .card { border-radius: 12px; margin-bottom: -8px; }
        .card:hover { border-color: var(--bs-primary); }
        .card:active { transform: scale(0.98); }
        .pill { border-radius: 999px; }
        .avatar { border-radius: 50%; }
        .tag { border-radius: 4px; padding: 2px 8px; }
        a:focus { outline: none; box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.4); }
        button:focus:not(:focus-visible) { outline: 0; }
        .btn:focus { outline: none; }
        .btn:focus-visible { outline: 2px solid var(--bs-primary); outline-offset: 2px; }
        .label { text-transform: uppercase; letter-spacing: 0.02em; }
        .fade-out { background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff); }
        .chart { background: linear-gradient(90deg, #0d6efd, #0dcaf0); }
    </style>
</head>
<body>
    <section class="hero py-5 bg-body-tertiary">
        <div class="container">
            <p class="text-body-secondary small mb-1">Our platform</p>
            <h1 class="display-5 fw-semibold">Build faster</h1>
            <a href="#" class="btn btn-primary btn-lg">Get started</a>
        </div>
    </section>
    <div class="card shadow-sm p-4">Card</div>
    <button class="btn btn-outline-danger" aria-label="Delete item"><i class="bi bi-trash" aria-hidden="true"></i></button>
    <button class="btn btn-link"><i class="bi bi-download"></i> Download</button>
    <button class="btn"><span class="visually-hidden">Settings</span><i class="bi bi-gear"></i></button>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    <a href="/"><img src="logo.svg" alt="Acme"></a>
    <input class="form-control" type="email" placeholder="Email">
    <input class="form-control shadow-none focus-ring" type="search" placeholder="Search">
    <span class="badge text-bg-secondary text-uppercase">new</span>
    <ul class="dropdown-menu shadow-lg"><li>Item</li></ul>
    <div style="margin: 0 auto; padding: 8px 16px; border-radius: 8px">Inline, on the scale</div>
</body>
</html>
`;

const PLAIN_CSS = `:root { --space-2: 8px; --radius: 8px; }
.page { margin: 0 auto; padding: 24px 16px; display: grid; gap: 8px; }
.card { border-radius: var(--radius); padding: 1rem; margin-bottom: -8px; }
.card + .card { margin-top: calc(var(--space-2) * 3); }
.btn { background: #0d6efd; border-radius: 6px; padding: 8px 12px; }
.btn:focus-visible { outline: 2px solid #0b5ed7; outline-offset: 2px; }
.hairline { border-top: 1px solid #ddd; margin-top: 1px; }
.overlay { position: fixed; inset: 0; }
.shade { background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6)); }
.title { text-transform: uppercase; font-weight: 600; }
/* .old { margin: 13px; transform: scale(1.1); } */
`;

test('a generated-looking Bootstrap landing page is caught rule by rule', () => {
    project({ 'index.html': GENERATED }, (cwd) => {
        const found = check(cwd);
        assert.deepEqual(at(found, 'no-ai-gradients'), ['index.html:9 linear-gradient(135deg, #667eea 0%, #764ba2 100%)']);
        assert.deepEqual(at(found, 'spacing-scale'), ['index.html:10 13px']);
        assert.deepEqual(at(found, 'radius-scale'), ['index.html:11 13px']);
        assert.deepEqual(at(found, 'no-hover-scale'), ['index.html:12 transform: scale(1.05)']);
        assert.deepEqual(at(found, 'no-decorative-uppercase'), ['index.html:18 Our platform']);
        assert.deepEqual(at(found, 'no-heavy-headings'), ['index.html:19 fw-bolder']);
        assert.deepEqual(at(found, 'no-gradient-buttons'), ['index.html:20 bg-gradient']); // the hero's bg-gradient is not a button
        assert.deepEqual(at(found, 'no-heavy-card-shadow'), ['index.html:23 shadow-lg']); // dropdown, modal, toast and offcanvas float
        assert.deepEqual(found.filter((item) => item.rule === 'icon-button-name').map((item) => `${item.line} ${item.message}`), ['24 Icon-only <button> has no aria-label', '25 Close button (.btn-close) has no aria-label']);
        assert.deepEqual(at(found, 'focus-ring-removed'), ['index.html:26 shadow-none']);
        assert.match(found.find((item) => item.rule === 'spacing-scale').message, /Off the spacing scale, 4 px grid \(default\): 13px in margin-top/);
    });
});

test('a careful Bootstrap page and a clean plain-CSS page find none of it', () => {
    project({ 'index.html': CAREFUL }, (cwd) => assert.deepEqual(check(cwd).filter((item) => RULES.includes(item.rule)), []));
    project({ 'styles.css': PLAIN_CSS, 'index.html': '<link rel="stylesheet" href="styles.css">\n<main class="page"><a href="/settings" title="Settings"><svg aria-hidden="true"></svg></a></main>\n' }, (cwd) => {
        assert.deepEqual(check(cwd).filter((item) => RULES.includes(item.rule)), []);
    });
});

test('plain CSS: every length of a shorthand, rem by the root size, hairlines, negatives and functions', () => {
    const css = [
        '.a { margin: 13px 7px 0 auto; padding: 4px 12px; }',
        '.b { margin-left: -12px; margin-right: -13px; gap: 1px; inset: 0; width: 13px; }',
        '.c { padding: calc(13px + 1rem) max(7px, 2%); margin: 50% auto; }',
        '.d { padding-block: 0.8rem; padding-inline: 0.75rem; top: 13px; }',
        '.e { border-radius: 999px; border-top-left-radius: 7px; border-radius: 50%; border-radius: var(--r); border-radius: 4px 9999px; }',
    ].join('\n');
    project({ 'a.css': `${css}\n` }, (cwd) => {
        const found = check(cwd);
        assert.deepEqual(at(found, 'spacing-scale'), ['a.css:1 13px', 'a.css:1 7px', 'a.css:2 -13px', 'a.css:4 0.8rem', 'a.css:4 13px']);
        assert.match(found.find((item) => item.value === '0.8rem').message, /0\.8rem \(12\.8px\) in padding-block/);
        assert.deepEqual(at(found, 'radius-scale'), ['a.css:5 7px']);
    });
    // A root size of 10 px makes 1.2rem 12 px; a root size text cannot settle leaves rem alone.
    project({ 'a.css': 'html { font-size: 62.5%; }\n.a { margin: 1.2rem 1.3rem; }\n' }, (cwd) => assert.deepEqual(of(check(cwd), 'spacing-scale'), ['1.3rem']));
    project({ 'a.css': 'html { font-size: clamp(14px, 2vw, 18px); }\n.a { margin: 1.3rem 13px; }\n' }, (cwd) => assert.deepEqual(of(check(cwd), 'spacing-scale'), ['13px']));
});

test('purple is read from its hue in any notation, and gradient text from its block', () => {
    const css = [
        '.a { background: linear-gradient(90deg, rgb(118, 75, 162), #fff); }',
        '.b { background-image: radial-gradient(circle, hsl(270deg 60% 50% / 0.3), transparent); }',
        '.c { --hero: conic-gradient(rebeccapurple, white); }',
        '.d { background: linear-gradient(oklch(62.7% 0.265 303.9), #000); }',
        '.e { background: linear-gradient(#0d6efd, #0dcaf0); }',
        '.f { background: linear-gradient(#71717a, #e4e4e7); }',
        '.g { background: linear-gradient(90deg, #f43f5e, #f97316); -webkit-background-clip: text; background-clip: text; color: transparent; }',
        '.h { -webkit-background-clip: text; color: transparent; }',
    ].join('\n');
    project({ 'a.css': `${css}\n` }, (cwd) => {
        const found = check(cwd).filter((item) => item.rule === 'no-ai-gradients');
        // Blue to cyan and zinc are not purple; a clip without a gradient is not gradient text; one finding per block.
        assert.deepEqual(found.map((item) => `${item.line} ${item.value}`), ['1 linear-gradient(90deg, rgb(118, 75, 162), #fff)', '2 radial-gradient(circle, hsl(270deg 60% 50% / 0.3), transparent)', '3 conic-gradient(rebeccapurple, white)', '4 linear-gradient(oklch(62.7% 0.265 303.9), #000)', '7 -webkit-background-clip: text']);
    });
});

test('hover, focus, uppercase and button rules read the selector and the block', () => {
    const css = [
        '.card:hover { transform: translateY(-2px) scale(1.02); }',
        '.tile:hover { scale: 1.05; }',
        '.tile:active { transform: scale(1.05); }',
        '.tile:hover { transform: scale(0.98); }',
        'button:focus { outline: none; }',
        'input { outline: 0; }',
        'a:focus { outline: none; text-decoration: underline; }',
        '.btn:focus { outline: 0; } .btn:focus-visible { box-shadow: 0 0 0 3px #0d6efd; }',
        '*:focus { outline: none; } :focus-visible { outline: 2px solid #0d6efd; }',
        '.panel { outline: none; }',
        '[tabindex="-1"]:focus { outline: 0; }',
        '.eyebrow { text-transform: uppercase; letter-spacing: 0.1em; }',
        '.kicker { text-transform: uppercase; letter-spacing: 2px; } .caps { text-transform: uppercase; letter-spacing: 0.02em; }',
        '.btn-primary { background-image: linear-gradient(#0d6efd, #0a58ca); } .cta-section { background: linear-gradient(#fff, #f8f9fa); }',
    ].join('\n');
    project({ 'a.css': `${css}\n`, 'b.html': '<button class="btn" style="outline: none">Go</button>\n<a class="btn" style="background: linear-gradient(#0d6efd, #0a58ca)">Go</a>\n' }, (cwd) => {
        const found = check(cwd);
        assert.deepEqual(at(found, 'no-hover-scale'), ['a.css:1 transform: translateY(-2px) scale(1.02)', 'a.css:2 scale: 1.05']);
        assert.deepEqual(at(found, 'focus-ring-removed'), ['a.css:5 outline: none', 'a.css:6 outline: 0', 'b.html:1 outline: none']);
        assert.deepEqual(at(found, 'no-decorative-uppercase'), ['a.css:12 text-transform: uppercase', 'a.css:13 text-transform: uppercase']);
        assert.deepEqual(at(found, 'no-gradient-buttons'), ['a.css:14 linear-gradient(#0d6efd, #0a58ca)', 'b.html:2 linear-gradient(#0d6efd, #0a58ca)']);
    });
});

test('icon-only buttons in HTML, Blade, Vue and Svelte', () => {
    project({
        'a.html': [
            '<button class="btn"><span class="material-symbols-outlined">delete</span></button>',
            '<a href="/"><img src="logo.svg" alt=""></a>',
            '<button class="navbar-toggler" type="button"><span class="navbar-toggler-icon"></span></button>',
            '<button class="btn"><i class="fa-solid fa-xmark"></i> Close</button>',
            '<button class="btn" title="Delete"><i class="bi bi-trash"></i></button>',
            '<button class="btn"></button>',
        ].join('\n'),
        'b.blade.php': '<button class="btn">{{ __("Delete") }} <i class="bi bi-trash"></i></button>\n<button class="btn"><i class="bi bi-x"></i></button>\n',
        'c.vue': '<template>\n  <button :aria-label="t(\'Delete\')"><TrashIcon /></button>\n  <button><TrashIcon /></button>\n</template>\n',
        'd.svelte': '<button aria-label={label}><svg></svg></button>\n<button on:click={close}><svg></svg></button>\n',
    }, (cwd) => {
        assert.deepEqual(at(check(cwd), 'icon-button-name'), ['a.html:1 button', 'a.html:2 a', 'a.html:3 button', 'b.blade.php:2 button', 'c.vue:3 button', 'd.svelte:2 button']);
    });
});

test('SCSS is read as CSS: comments, $variable definitions and @include lines are not values', () => {
    const scss = [
        '// .ghost { margin: 13px; transform: scale(1.1); }',
        '@use "sass:math";',
        '@import "bootstrap/scss/functions";',
        '$card-gap: 13px;',
        '/* .old { padding: 7px; } */',
        '.card {',
        '    padding: 13px;',
        '    margin: math.div($card-gap, 2) 7px;',
        '    @include transition(all 0.2s);',
        '    &:hover { transform: scale(1.05); }',
        '    #{$name} { margin-top: 12px; }',
        '}',
    ].join('\n');
    project({ 'scss/app.scss': `${scss}\n`, 'a.sass': '.a\n  margin: 13px\n', 'b.less': '.a { margin: 13px; }\n' }, (cwd) => {
        const found = check(cwd);
        assert.deepEqual(at(found, 'spacing-scale'), ['scss/app.scss:7 13px', 'scss/app.scss:8 7px']);
        assert.deepEqual(at(found, 'no-hover-scale'), ['scss/app.scss:10 transform: scale(1.05)']);
        assert.deepEqual(of(found, 'no-transition-all'), []);
        assert.deepEqual(coverage(cwd), { read: 1, unread: { sass: 1, less: 1 } });
    });
    // Vue's <style lang="scss"> is read the same way.
    project({ 'a.vue': '<template><div /></template>\n<style lang="scss">\n// margin: 7px;\n$x: 13px;\n.a { &:hover { scale: 1.1; } }\n</style>\n' }, (cwd) => {
        assert.deepEqual(at(check(cwd), 'no-hover-scale'), ['a.vue:5 scale: 1.1']);
        assert.deepEqual(of(check(cwd), 'spacing-scale'), []);
    });
});

test('the Bootstrap scale: $spacer and $spacers in SCSS add steps to the 4 px grid', () => {
    const scale = (files) => project(files, (cwd) => spacingScales(cwd).web);
    assert.deepEqual(scale({ 'scss/custom.scss': '$spacer: 1.25rem;\n@import "bootstrap/scss/bootstrap";\n' }), { base: 4, values: [5, 10, 20, 30, 60], source: 'scss/custom.scss, Bootstrap $spacer' });
    assert.deepEqual(scale({ 'a.scss': '@import "bootstrap/scss/functions";\n@import "bootstrap/scss/variables";\n$spacers: map-merge($spacers, (6: $spacer * 4.5));\n' }).values, [4, 8, 16, 24, 48, 72]);
    assert.deepEqual(scale({ 'a.scss': '$spacer: 16px;\n$spacers: (0: 0, 1: 6px, 2: math.div($spacer, 2), 3: ($spacer * 1.5));\n' }).values, [6, 8, 24]);
    assert.deepEqual(scale({ 'a.scss': '@use "bootstrap/scss/bootstrap" with ($spacer: 1.5rem, $enable-shadows: true);\n' }).values, [6, 12, 24, 36, 72]);
    // A copied _variables.scss holds Bootstrap's !default values; the project's own $spacer wins over them.
    const copied = scale({ 'scss/_variables.scss': '$spacer: 1rem !default;\n$spacers: (0: 0, 1: $spacer * .25, 2: $spacer * .5, 3: $spacer) !default;\n', 'scss/custom.scss': '$spacer: 1.25rem;\n' });
    assert.deepEqual(copied.values, [5, 10, 20]);
    assert.match(copied.source, /Bootstrap \$spacer and \$spacers$/);
    // Bootstrap kept as it is says nothing new: its steps are on the 4 px grid already.
    assert.equal(scale({ 'a.scss': '@import "bootstrap/scss/bootstrap";\n.a { margin: 8px; }\n' }).source, 'default');
    for (const [files, note] of [
        [{ 'a.scss': '$spacer: clamp(1rem, 2vw, 2rem);\n' }, /a\.scss: Bootstrap \$spacer cannot be read as px/],
        [{ 'a.scss': '$spacers: $my-spacers;\n' }, /a\.scss: Bootstrap \$spacers cannot be read as px/],
        [{ 'a.scss': '$spacer: 1rem;\n', 'b.scss': '$spacer: 1.5rem;\n' }, /set different Bootstrap \$spacer/],
    ]) {
        const read = scale(files);
        assert.deepEqual([read.base, read.source], [4, 'default'], JSON.stringify(files));
        assert.match(read.note, note);
    }
    // The order: @theme and the Tailwind config come first, CSS variables after.
    const bootstrap = { 'b.scss': '$spacer: 1.25rem;\n' };
    assert.equal(scale({ ...bootstrap, 'a.css': '@theme { --spacing: 6px; }' }).base, 6);
    assert.deepEqual(scale({ ...bootstrap, 'a.css': ':root { --space-1: 6px; }' }).values, [5, 10, 20, 30, 60]);
    // The steps judge the CSS: 10 px is a step of a 20 px $spacer, 13 px is not.
    project({ ...bootstrap, 'a.css': '.a { margin: 10px 13px; }\n' }, (cwd) => {
        const found = check(cwd).filter((item) => item.rule === 'spacing-scale');
        assert.deepEqual(found.map((item) => item.value), ['13px']);
        assert.match(found[0].message, /4 px grid plus 5, 10, 20, 30, 60 px \(b\.scss, Bootstrap \$spacer\)/);
    });
});

test('--fix moves CSS, inline and SCSS lengths, each number on its own; a tie goes up', () => {
    project({
        'a.css': '.a { margin: 13px 7px 0 auto; padding: 10px; }\n.b { border-radius: 7px 13px; margin-left: -13px; gap: 14px; }\n.c { top: 13px; padding-top: 0.8rem; border-radius: 40px; }\n',
        'b.html': '<div class="mt-[13px]" style="padding: 10px 13px; border-radius: 7px">Box</div>\n<p style=\'margin-bottom: 13px\'>Text <span style="margin: 13px">13px</span></p>\n',
        'c.scss': '// margin: 13px in a comment stays\n$gap: 13px;\n.x {\n    margin-top: 13px;\n    &:hover { padding: 7px; }\n}\n',
    }, (cwd, read) => {
        const dry = run(cwd, '--fix', '--dry-run');
        assert.match(dry.stdout, /a\.css:1 +13px → 12px +spacing-scale/);
        assert.equal(read('a.css').includes('13px 7px'), true);
        run(cwd, '--fix');
        assert.equal(read('a.css'), '.a { margin: 12px 8px 0 auto; padding: 12px; }\n.b { border-radius: 8px 12px; margin-left: -12px; gap: 16px; }\n.c { top: 13px; padding-top: 0.8rem; border-radius: 40px; }\n');
        assert.equal(read('b.html'), '<div class="mt-3" style="padding: 12px 12px; border-radius: 8px">Box</div>\n<p style=\'margin-bottom: 12px\'>Text <span style="margin: 12px">13px</span></p>\n');
        assert.equal(read('c.scss'), '// margin: 13px in a comment stays\n$gap: 13px;\n.x {\n    margin-top: 12px;\n    &:hover { padding: 8px; }\n}\n');
        // An offset, a rem value and a corner far from any step stay in the report.
        const left = check(cwd).filter((item) => ['spacing-scale', 'radius-scale'].includes(item.rule)).map((item) => `${item.path}:${item.line} ${item.value}`).sort();
        assert.deepEqual(left, ['a.css:3 0.8rem', 'a.css:3 13px', 'a.css:3 40px']);
        assert.match(run(cwd, '--fix').stdout, /Nothing to fix/);
    });
});

test('a framework stylesheet copied into the project is the framework\'s, not the project\'s', () => {
    const vendor = '/*!\n * Bootstrap  v5.3.3 (https://getbootstrap.com/)\n * Licensed under MIT\n */\n.btn { padding: .375rem .75rem; margin-top: 13px; border-radius: 13px; }\n';
    const tailwind = '/*! tailwindcss v4.1.11 | MIT License | https://tailwindcss.com */\n.mt-\\[13px\\] { margin-top: 13px; }\n';
    const unbannered = '.swagger-ui .btn { margin-top: 13px; }\n';
    project({ 'public/css/bootstrap.css': vendor, 'public/css/app.css': tailwind, 'static/swagger-ui/swagger-ui.css': unbannered, 'static/css/select2.min2.css': unbannered, 'src/site.css': '.hero { margin-top: 13px; }\n' }, (cwd) => {
        const found = at(check(cwd), 'spacing-scale');
        assert.deepEqual(found, ['src/site.css:1 13px']);
    });
});
