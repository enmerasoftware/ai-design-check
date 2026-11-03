import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRules } from '../src/check.js';
import { scanWith } from '../src/scan.js';
import { findChrome, launch } from '../src/story.js';

const skip = !findChrome();
let browser;
before(async () => { if (!skip) browser = await launch(findChrome()); });
after(async () => { await browser?.close(); });

const page = (body, css = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><style>body{margin:0;padding:24px;font:16px/1.5 Georgia,serif;color:#111;background:#fff}${css}</style></head><body>${body}</body></html>`;
const rulesOf = async (html, width = 1280) => (await scanWith(browser, `data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { width })).map((item) => item.rule);
const long = 'The kiln runs for nine hours and the glaze settles into the clay as it cools down slowly overnight in the workshop. '.repeat(3);
const card = 'border:1px solid #ccc;border-radius:12px;padding:16px;background:#fff';

// Each rule: pages that must be flagged and shapes that look close but must pass.
const CASES = {
    'legible-contrast': { flag: ['<p style="color:#aaa">Pale words on a white page here</p>', '<a href="/" style="color:#ccc">Pale link</a>'], pass: ['<p style="color:#555">Dark enough words on white</p>', '<h1 style="font-size:48px;color:#888">Large title</h1>', '<div style="background:#111;color:#eee;padding:16px">Light on dark</div>'] },
    'no-nested-cards': { flag: [`<div style="${card};width:500px;height:200px"><div style="${card};width:200px;height:80px">Inner</div></div>`], pass: [`<div style="${card};width:500px;height:200px">One card</div>`, `<div style="${card};width:500px"><button style="border:1px solid #333;border-radius:8px;padding:8px 16px">Save</button></div>`] },
    'spacing-rhythm': { flag: [`<div>${'<p style="margin:0 0 24px">Same gap again</p>'.repeat(12)}</div>`], pass: [`<div><h2 style="margin:0 0 8px">Title</h2><p style="margin:0 0 24px">Text</p><h2 style="margin:48px 0 8px">Next</h2><p style="margin:0 0 12px">Text</p><p style="margin:0 0 64px">End</p></div>`] },
    'no-bounce-easing': { flag: ['<button style="transition:transform .3s cubic-bezier(.34,1.56,.64,1)">Go</button>'], pass: ['<button style="transition:transform .3s cubic-bezier(.22,1,.36,1)">Go</button>'] },
    'pulse-for-live-only': { flag: ['<i style="display:inline-block;width:8px;height:8px;background:green;animation:p 1s infinite"></i>'], pass: ['<i style="display:inline-block;width:8px;height:8px;background:green"></i>'] },
    'no-blinking-cursor': { flag: ['<span style="display:inline-block;width:2px;height:20px;background:#111;animation:p 1s infinite"></span>'], pass: ['<span style="display:inline-block;width:2px;height:20px;background:#111"></span>'] },
    'no-clipart-svg': { flag: [`<svg width="500" height="300">${'<rect width="9" height="9"/><circle r="4"/>'.repeat(8)}</svg>`], pass: ['<svg width="24" height="24"><rect width="9" height="9"/></svg>', `<svg width="500" height="300">${'<rect width="9" height="9"/><text>12</text>'.repeat(8)}</svg>`] },
    'glow-in-charts-only': { flag: ['<div style="box-shadow:0 0 30px #a0f;width:200px;height:50px"></div>'], pass: ['<div style="box-shadow:0 2px 8px rgba(0,0,0,.1);width:200px;height:50px"></div>'] },
    'no-radial-halo': { flag: ['<section style="height:400px;background:radial-gradient(circle,#7c3aed,transparent)">x</section>'], pass: ['<section style="height:400px;background:radial-gradient(circle,#ddd,transparent)">x</section>', '<i style="display:block;width:40px;height:40px;background:radial-gradient(circle,#7c3aed,transparent)"></i>'] },
    'no-ai-gradients': { flag: ['<div style="height:200px;background:linear-gradient(90deg,#7c3aed,#3b82f6)">x</div>', '<h1 style="background:linear-gradient(90deg,#333,#666);-webkit-background-clip:text;color:transparent">Hello</h1>'], pass: ['<div style="height:200px;background:linear-gradient(90deg,#eee,#fff)">x</div>'] },
    'no-neon-on-dark': { flag: ['<div style="background:#0a0a14;padding:16px"><p style="color:#22e6f0">Neon one</p><p style="color:#22e6f0">Neon two</p></div>'], pass: ['<div style="background:#0a0a14;padding:16px"><p style="color:#eee">Calm one</p><p style="color:#eee">Calm two</p></div>', '<p style="color:#067">Teal on white</p><p style="color:#067">Teal again</p>'] },
    'no-stripe-surface': { flag: ['<div style="height:200px;background:repeating-linear-gradient(45deg,#eee 0 4px,#fff 4px 8px)">x</div>'], pass: ['<div style="height:20px;width:40px;background:repeating-linear-gradient(45deg,#eee 0 4px,#fff 4px 8px)">x</div>'] },
    'no-grid-wallpaper': { flag: ['<div style="height:300px;background-image:linear-gradient(#ddd 1px,transparent 1px),linear-gradient(90deg,#ddd 1px,transparent 1px);background-size:40px 40px">x</div>'], pass: ['<div style="height:300px;background-image:linear-gradient(#ddd,#fff)">x</div>'] },
    'no-blob-clip-path': { flag: ['<div style="width:200px;height:200px;background:#333;clip-path:polygon(0 0,10% 5%,20% 0,30% 5%,40% 0,50% 5%,60% 0,70% 5%,80% 0,90% 5%,100% 0,100% 100%,0 100%)"></div>'], pass: ['<div style="width:200px;height:200px;background:#333;clip-path:polygon(0 0,100% 0,100% 90%,0 100%)"></div>'] },
    'no-buried-image': { flag: ['<div style="height:300px;background:linear-gradient(rgba(0,0,0,.97),rgba(0,0,0,.97)),url(x.png)">x</div>'], pass: ['<div style="height:300px;background:linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)),url(x.png)">x</div>'] },
    'no-hard-offset-shadow': { flag: ['<div style="box-shadow:6px 6px 0 #111;width:200px;height:50px"></div>'], pass: ['<div style="box-shadow:0 1px 0 #111;width:200px;height:50px"></div>', '<div style="box-shadow:6px 6px 12px #999;width:200px;height:50px"></div>'] },
    'no-side-stripe': { flag: ['<div style="border-left:4px solid #e11;border-radius:8px;padding:16px;width:300px">Note</div>'], pass: ['<blockquote style="border-left:4px solid #e11;padding:16px;width:300px">Quote</blockquote>', `<div style="${card};width:300px">Card</div>`] },
    'no-icon-tile-stack': { flag: [`${'<div><div style="width:48px;height:48px;border-radius:12px;background:#eef"><svg width="24" height="24"></svg></div><h3>Fast</h3></div>'.repeat(2)}`], pass: ['<div><div style="width:48px;height:48px;border-radius:12px;background:#eef"><svg width="24" height="24"></svg></div><h3>Once</h3></div>', `${'<div><svg width="24" height="24"></svg><h3>Plain</h3></div>'.repeat(2)}`] },
    'no-italic-serif-hero': { flag: ['<h1 style="font:italic 64px Georgia,serif">Quiet rooms</h1>', '<h1 style="font:64px Georgia,serif">Quiet <em>rooms</em></h1>'], pass: ['<h1 style="font:64px Georgia,serif">Quiet rooms</h1>', '<h1 style="font:italic 64px Arial,sans-serif">Quiet rooms</h1>'] },
    'no-eyebrow-label': { flag: ['<div style="font-size:12px;text-transform:uppercase;letter-spacing:.1em">New era</div><h1>Quiet rooms</h1>'], pass: ['<p>A longer lead paragraph that says something real about the rooms here.</p><h1>Quiet rooms</h1>', '<nav><a href="/">Home</a></nav><h1>Quiet rooms</h1>'] },
    'no-section-numbers': { flag: ['<div><small>01</small><h2>One</h2></div><div><small>02</small><h2>Two</h2></div>'], pass: ['<div><small>01</small><h2>One</h2></div>', '<div><h2>2024 report</h2></div><div><h2>2025 report</h2></div>'] },
    'no-em-dash-saturation': { flag: [`<p>${'A thing — then more words follow here — and on. '.repeat(5)}</p>`], pass: ['<p>A single thing — and that is fine in a sentence of ordinary length.</p>'] },
    'no-aphorism-cadence': { flag: ['<p>Ship it. No meetings.</p><p>Write it. Just text.</p><p>Not a feature. A platform.</p>'], pass: ['<p>Ship it. No meetings.</p>', '<p>Write the text and send it to the printer when ready.</p>'] },
    'no-theater-copy': { flag: ['<p>Most audits are compliance theater and nobody reads them.</p>'], pass: ['<p>The Globe theater opens in June.</p>'] },
    'no-overused-font': { flag: ['<p style="font-family:Inter,sans-serif">Words in a very common face</p>'], pass: ['<p>Words in Georgia here on the page</p>'] },
    'no-default-cream': { flag: [page('<p>Warm page</p>', 'body{background:#faf6ee}')], pass: [page('<p>White page</p>'), page('<p>Pale blue</p>', 'body{background:#eef4fb}')] },
    'flat-type-scale': { flag: ['<h1 style="font-size:18px">Title</h1><p style="font-size:16px">Body text on this page goes here.</p>'], pass: ['<h1 style="font-size:40px">Title</h1><p style="font-size:16px">Body text on this page goes here.</p>'] },
    'no-giant-sentence': { flag: ['<h1 style="font-size:96px">We build quiet rooms for the people who need a rest</h1>'], pass: ['<h1 style="font-size:96px">Quiet</h1>', '<h1 style="font-size:40px">We build quiet rooms for the people who need a rest</h1>'] },
    'no-crushed-tracking': { flag: ['<h2 style="letter-spacing:-.08em;font-size:40px">Tight title</h2>'], pass: ['<h2 style="letter-spacing:-.02em;font-size:40px">Tight title</h2>'] },
    'no-wide-tracking-body': { flag: [`<p style="letter-spacing:.1em">${long}</p>`], pass: [`<p>${long}</p>`, '<small style="letter-spacing:.1em;text-transform:uppercase">Label</small>'] },
    'no-border-and-wide-shadow': { flag: [`<div style="display:flex;gap:16px">${'<div style="border:1px solid #eee;box-shadow:0 10px 40px rgba(0,0,0,.2);width:200px;height:100px"></div>'.repeat(3)}</div>`], pass: [`<div style="display:flex;gap:16px">${'<div style="border:1px solid #eee;width:200px;height:100px"></div>'.repeat(3)}</div>`, '<div style="border:1px solid #eee;box-shadow:0 10px 40px rgba(0,0,0,.2);width:200px;height:100px"></div>'] },
    'image-not-broken': { flag: ['<img src="" width="100" height="100" alt="x">', '<img src="data:image/png;base64,broken" width="100" height="100" alt="x">'], pass: ['<img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" width="100" height="100" alt="x">'] },
    'no-script-errors': { flag: ['<script>setTimeout(function(){ undefinedFunction(); }, 0)</script><p>Page</p>'], pass: ['<script>window.x = 1</script><p>Page</p>'] },
    'no-invisible-content': { flag: [`<p style="opacity:0">${long}</p><p>Short.</p>`], pass: [`<p>${long}</p>`, `<p>${long}</p><div hidden>${long}</div>`] },
    'no-flush-cards': { flag: [`<div style="margin:0 60px;display:flex;gap:16px;overflow-x:auto;width:600px">${`<div style="${card};flex:0 0 300px">Card</div>`.repeat(4)}</div>`], pass: [`<div style="margin:0 60px;display:flex;gap:16px;overflow-x:auto;width:600px;padding:0 16px">${`<div style="${card};flex:0 0 300px">Card</div>`.repeat(4)}</div>`] },
    'text-not-covered': { flag: ['<div style="position:relative;width:300px"><p style="margin:0">Hidden words under a box here</p><div style="position:absolute;inset:0;background:#fff"></div></div>'], pass: ['<div style="position:relative;width:300px"><p style="margin:0">Visible words here</p></div>'] },
    'no-lopsided-fold': { flag: [`<div style="display:flex;gap:40px"><div style="flex:1"><h1>Title</h1></div><div style="flex:1;height:1600px;background:#eee">Long</div></div>`], pass: ['<div style="display:flex;gap:40px"><div style="flex:1"><h1>Title</h1></div><div style="flex:1;height:400px;background:#eee">Short</div></div>'] },
    'no-gray-on-color': { flag: ['<div style="background:#0a7a4b;color:#999;padding:16px">Gray words on green</div>'], pass: ['<div style="background:#0a7a4b;color:#fff;padding:16px">White words on green</div>', '<div style="background:#eee;color:#555;padding:16px">Gray words on gray</div>'] },
    'readable-measure': { flag: [`<p style="width:1200px">${long}${long}</p>`], pass: [`<p style="width:480px">${long}</p>`] },
    'no-cramped-padding': { flag: ['<div style="background:#eee;border-radius:8px;padding:1px;width:max-content">Cramped</div>'], pass: ['<div style="display:flex;align-items:center;justify-content:center;width:120px;height:40px;background:#eee">Centred</div>', '<div style="background:#eee;border-radius:8px;padding:8px 16px;width:max-content">Roomy</div>', '<a href="/">Plain link</a>'] },
    'text-off-viewport-edge': { flag: [page(`<p style="margin:0">${long}</p>`, 'body{padding:0}')], pass: [page(`<p style="margin:0;padding:0 24px">${long}</p>`, 'body{padding:0}'), page(`<p>${long}</p>`)] },
    'no-tight-leading': { flag: [`<p style="line-height:1.05;width:300px">${long}</p>`], pass: ['<div style="width:300px"><span style="line-height:1;display:block;font-size:13px">One short status line here that wraps once only</span></div>', '<h2 style="font-size:28px;line-height:1.2;width:300px">A heading that runs over two lines for sure here</h2>', `<p style="width:300px">${long}</p>`, '<h1 style="font-size:64px;line-height:1.05">Short</h1>'] },
    'heading-order': { flag: ['<h1>One</h1><h3>Three</h3>'], pass: ['<h1>One</h1><h2>Two</h2><h3>Three</h3>', '<h1>One</h1><h2>Two</h2><h3>Three</h3><h2>Back</h2>'] },
    'heading-spacing': { flag: [`${'<p style="margin:0">Text</p><h2 style="margin:4px 0 32px">Title</h2><p style="margin:0">Text</p>'.repeat(3)}`], pass: [`${'<p style="margin:0">Text</p><h2 style="margin:48px 0 8px">Title</h2><p style="margin:0">Text</p>'.repeat(3)}`] },
    'no-justified-text': { flag: [`<p style="text-align:justify;width:280px">${long}</p>`], pass: [`<p style="width:280px">${long}</p>`, `<p style="text-align:justify;hyphens:auto;width:280px" lang="en">${long}</p>`] },
    'no-straggler': { flag: ['<p style="width:300px;font:16px monospace;margin:0">aaaaaaaa bbbbbbbb cccccccc dddddddddd</p>'], pass: ['<p style="width:300px;font:16px monospace;margin:0;text-wrap:pretty">aaaaaaaa bbbbbbbb cccccccc dddddddddd</p>', '<p style="width:300px;font:16px monospace;margin:0">aaaaaaaaaa bbbbbbbbbb cc dd ee ff gg hh ii jj kk ll mm</p>'] },
    'balanced-headings': { flag: ['<h2 style="width:300px;font:32px monospace;margin:0">aaaaaaaaaaaaa bbb</h2>'], pass: ['<h2 style="width:300px;font:32px monospace;margin:0;text-wrap:balance">aaaaaaaaaaaaa bbb</h2>', '<h2 style="font:32px monospace;margin:0">one line</h2>'] },
    'no-tiny-text': { flag: ['<p style="font-size:10px">Very small words on this page here</p>', '<a href="/" style="font-size:9px">Tiny link</a>'], pass: ['<p style="font-size:13px">Small words on this page</p>', '<sup style="font-size:9px">1</sup>'] },
    'no-all-caps-sentences': { flag: ['<p>THIS IS A LONG RUN OF WORDS ALL WRITTEN IN CAPITALS HERE</p>', '<p style="text-transform:uppercase">this is a long run of words all shown in capitals here</p>'], pass: ['<small style="text-transform:uppercase">Short label</small>', '<p>NASA and ESA work together on this mission for a while.</p>'] },
    'text-not-clipped': { flag: ['<div style="width:100px;overflow:hidden;white-space:nowrap">A long sentence that will not fit in here</div>'], pass: ['<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Screen reader text that is long</span>', '<div style="width:100px;overflow:hidden"><div>Wrapped words that are fine here</div></div>', '<div style="width:300px;overflow:hidden;white-space:nowrap">Fits</div>', '<div style="width:100px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="A long sentence that will not fit in here">A long sentence that will not fit in here</div>'] },
    'no-horizontal-overflow': { flag: ['<div style="width:2000px;height:20px;background:#eee"></div>'], pass: ['<div style="width:2000px;height:20px;background:#eee;overflow:hidden;max-width:100%"></div>'] },
    'no-repeated-label': { flag: [`<div style="${card};width:400px"><div><b>Active</b></div><p><span>Active</span></p><span>Active</span></div>`], pass: [`<section style="${card};height:900px">${'<div><b>Total</b></div><p><span>Total</span></p><i>Total</i>'}</section>`, `<div style="${card};width:400px"><div><b>Active</b></div><p><span>Paused</span></p></div>`, `<ul>${'<li><span>Active</span></li>'.repeat(5)}</ul>`] },
    'no-clipped-popover': { flag: ['<div style="position:relative;overflow:hidden;width:200px;height:60px;margin:80px"><div style="position:absolute;top:40px;left:0;width:150px;height:90px;background:#eee">Menu</div></div>'], pass: ['<div style="position:relative;width:200px;height:60px"><div style="position:absolute;top:40px;left:0;width:150px;height:90px;background:#eee">Menu</div></div>', '<div style="position:relative;overflow:hidden;width:200px;height:200px"><div style="position:absolute;top:10px;left:0;width:150px;height:90px;background:#eee">Inside</div></div>'] },
};
const STYLE = '<style>@keyframes p{50%{opacity:.2}}</style>';
const wrap = (html) => (html.startsWith('<!doctype') ? html : page(STYLE + html));

for (const [rule, { flag, pass }] of Object.entries(CASES)) {
    test(`scan: ${rule}`, { skip }, async () => {
        for (const html of flag) assert.ok((await rulesOf(wrap(html))).includes(rule), `should flag: ${html.slice(0, 120)}`);
        for (const html of pass) assert.ok(!(await rulesOf(wrap(html))).includes(rule), `should pass: ${html.slice(0, 120)}`);
    });
}

test('scan: every scan rule is in the catalogue with both languages and has cases', () => {
    const { rules } = loadRules();
    const scanned = rules.filter((rule) => rule.check?.scan).map((rule) => rule.id);
    assert.deepEqual(Object.keys(CASES).filter((id) => !scanned.includes(id)), []);
    assert.deepEqual(scanned.filter((id) => !(id in CASES)).filter((id) => id !== 'no-marquee' && id !== 'design-system-drift' && id !== 'no-buzzwords'), []);
});

test('scan: a design system in the config names what drifts from it', { skip }, async () => {
    const html = page('<h2 style="font-family:Courier;font-size:27px;border-radius:9px;background:#123456;color:#fff;padding:12px">Title</h2>');
    const found = await scanWith(browser, `data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { width: 1280, config: { designSystem: { fonts: ['Georgia'], sizes: [16, 32], radii: [8], colors: ['#111111', '#ffffff'] } } });
    const values = found.filter((item) => item.rule === 'design-system-drift').map((item) => item.value).join(' ');
    assert.match(values, /Courier/);
    assert.match(values, /27px/);
    assert.match(values, /9px/);
    assert.match(values, /#123456/);
});

test('scan from the command line: a URL goes to the page scanner', { skip }, () => {
    const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ai-design-check.js');
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(page('<p>Nothing</p>'))}`;
    assert.match(spawnSync(process.execPath, [bin, 'scan', url, '--json'], { encoding: 'utf8' }).stdout, /"findings"/);
    const { stderr, status } = spawnSync(process.execPath, [bin, 'scan'], { encoding: 'utf8' });
    assert.match(stderr, /Usage/);
    assert.equal(status, 1);
});

test('scan: see-through text counts as what it looks like', { skip }, async () => {
    assert.ok((await rulesOf(page('<p style="color:rgba(0,0,0,.3)">Faint words by alpha here</p>'))).includes('legible-contrast'));
    assert.ok((await rulesOf(page('<button disabled style="opacity:.4;background:#0d6efd;color:#fff;border:0;padding:12px">Faint submit</button>'))).includes('legible-contrast'));
});

test('a page is measured once its styles have landed, not at a fixed moment', { skip }, async () => {
    // Styles arriving just after the wait, as a CDN stylesheet does on a slow machine.
    const html = page('<p id="p">Words</p><script>setTimeout(() => { const s = document.createElement("style"); s.textContent = "#p{font-size:14px}"; document.head.append(s); }, 1400)</script>');
    await browser.open(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, { width: 1280, height: 800 });
    assert.equal(await browser.evaluate('getComputedStyle(document.getElementById("p")).fontSize'), '14px');
});
