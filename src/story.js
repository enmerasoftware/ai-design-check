import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { check, loadRules } from './check.js';

/**
 * Before/after story video: the before screen with every finding marked, a wipe to the after screen while the
 * count falls, and an end card. No dependencies: Chrome is driven over the DevTools protocol (on a pipe)
 * and ffmpeg encodes the frames.
 */

const SIZE = 1080;
const FPS = 30;
const DURATION = 12;
const VIEW = { width: 1280, height: 1000 };

export function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean);
    const found = candidates.find((path) => existsSync(path));
    if (found) return found;
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
        const which = spawnSync('which', [name], { encoding: 'utf8' });
        if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
    }

    return null;
}

/** What the styles add up to right now: text sizes, heights, and how much CSS the page has. */
const STYLE_PRINT = `(() => {
    let total = 0;
    for (const el of document.querySelectorAll('body *')) total += parseFloat(getComputedStyle(el).fontSize) || 0;
    return [total, document.documentElement?.scrollHeight ?? 0, document.styleSheets.length, [...document.querySelectorAll('style')].reduce((sum, el) => sum + el.textContent.length, 0)].join();
})()`;

export async function launch(chrome) {
    const profile = mkdtempSync(join(tmpdir(), 'ai-design-check-chrome-'));
    // DevTools over a pipe, not a WebSocket: Node 20 has no global WebSocket, and there is no port to look up.
    const proc = spawn(chrome, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--hide-scrollbars', '--disable-gpu', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
    // Chrome says why it would not start (no sandbox in a container, a missing library) only here.
    let reason = '';
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk) => { reason = (reason + chunk).slice(-1500); });
    const [input, output] = [proc.stdio[3], proc.stdio[4]];

    let id = 0;
    let sessionId;
    let buffer = '';
    const pending = new Map();
    const listeners = new Map();
    // Once Chrome is gone every later call fails at once: a call left waiting would hang the run, or end it silently.
    let gone = null;
    const exited = new Promise((done) => proc.once('exit', done));
    const abort = (error) => {
        gone ??= error;
        for (const { fail } of pending.values()) fail(error);
        pending.clear();
    };
    proc.on('error', abort);
    proc.on('exit', () => abort(new Error(`Chrome exited before it finished${reason.includes('sandbox') ? ' (in a container: Chrome needs a sandbox or a wrapper set in CHROME_PATH that passes --no-sandbox)' : ''}${reason.trim() ? `\n${reason.trim().split('\n').slice(-3).join('\n')}` : ''}`)));
    input.on('error', () => {}); // A closed pipe also shows up as the exit above.
    output.setEncoding('utf8');
    output.on('data', (chunk) => {
        buffer += chunk;
        for (let end = buffer.indexOf('\0'); end >= 0; end = buffer.indexOf('\0')) {
            const message = JSON.parse(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
            if (message.id && pending.has(message.id)) {
                const { done, fail } = pending.get(message.id);
                pending.delete(message.id);
                message.error ? fail(new Error(message.error.message)) : done(message.result);
            } else if (message.method) (listeners.get(message.method) ?? []).splice(0).forEach((listener) => listener(message.params));
        }
    });
    const send = (method, params = {}) => new Promise((done, fail) => {
        if (gone) return fail(gone);
        const current = ++id;
        // A page that never answers (a hung script) must end the run, not hang it.
        const timer = setTimeout(() => {
            pending.delete(current);
            fail(new Error(`The page did not answer within 2 minutes (${method})`));
        }, 120000);
        timer.unref();
        pending.set(current, { done: (value) => { clearTimeout(timer); done(value); }, fail: (error) => { clearTimeout(timer); fail(error); } });
        input.write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
    });
    const once = (method, timeout = 20000) => new Promise((done) => {
        listeners.set(method, [...(listeners.get(method) ?? []), done]);
        setTimeout(done, timeout).unref();
    });
    const evaluate = async (expression) => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');

        return result.result.value;
    };
    const close = async () => {
        if (proc.exitCode === null && proc.signalCode === null) {
            proc.kill();
            // Chrome's helpers can outlive the main process for a moment (Linux); never let cleanup fail the run.
            const timer = setTimeout(() => proc.kill('SIGKILL'), 3000);
            await exited;
            clearTimeout(timer);
        }
        input.destroy();
        output.destroy();
        proc.stderr.destroy();
        try {
            rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
            // A leftover temp profile is harmless; the OS clears tmp.
        }
    };

    // A Chrome left running keeps Node alive for ever, so any failure while starting closes it.
    const starting = setTimeout(() => abort(new Error('Chrome did not answer within 60 seconds')), 60000);
    try {
        let page;
        while (!(page = (await send('Target.getTargets')).targetInfos.find((target) => target.type === 'page'))) await new Promise((done) => setTimeout(done, 50));
        ({ sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true }));
        await send('Page.enable');
        await send('Network.enable');
    } catch (error) {
        await close();
        throw error;
    } finally {
        clearTimeout(starting);
    }

    /** Every event of one kind until the returned function is called. */
    const on = (method, listener) => {
        let live = true;
        const again = (params) => {
            if (!live) return;
            listener(params);
            listeners.set(method, [...(listeners.get(method) ?? []), again]);
        };
        listeners.set(method, [...(listeners.get(method) ?? []), again]);

        return () => { live = false; };
    };
    // An alert() would block every later call on the page.
    on('Page.javascriptDialogOpening', () => { send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });

    return {
        send,
        evaluate,
        on,
        async open(url, { width, height, settle = 1200, mobile = false, steady = true }) {
            await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
            let response = null;
            const stop = on('Network.responseReceived', ({ type, response: received }) => { if (type === 'Document') response = received; });
            const loaded = once('Page.loadEventFired');
            const { errorText } = await send('Page.navigate', { url });
            if (errorText) {
                stop();
                throw new Error(`Could not open ${url}: ${errorText}`);
            }
            await Promise.race([loaded, exited]);
            stop();
            if (gone) throw gone;
            await new Promise((done) => setTimeout(done, settle)); // CDN styles and fonts
            // A fixed wait loses to a slow machine: go on only when the styles have stopped changing, within reason.
            let last = null;
            for (let tries = 0; steady && tries < 16; tries++) {
                const now = await evaluate(STYLE_PRINT);
                if (now === last) break;
                last = now;
                await new Promise((done) => setTimeout(done, 300));
            }

            return response && { status: response.status, mimeType: response.mimeType, url: response.url };
        },
        close,
    };
}

/** An error page or a JSON answer is not the page that was asked for: measuring it would report a clean page. */
export function assertPage(response, url, allowStatus = []) {
    if (!response) return;
    if (response.status >= 400 && !allowStatus.includes(response.status)) throw new Error(`${url} answered HTTP ${response.status}, so there is no page to check. Is it the right address, and is the server up? (--allow-status ${response.status} checks that page anyway.)`);
    if (response.mimeType && !/html|xml|svg/.test(response.mimeType)) throw new Error(`${url} answered ${response.mimeType}, not a page.`);
}

/**
 * A page behind a sign-in: cookies and extra request headers, set before it opens. The values are the person's secrets;
 * nothing here prints them. Both go only to the page's own origin: a page's scripts, fonts and analytics live on other
 * hosts, and an Authorization header must not reach them.
 * @param {{cookies?: {name: string, value: string}[], headers?: Record<string, string>}} auth
 */
export async function signIn(browser, url, { cookies = [], headers = {} } = {}) {
    if (cookies.length && /^https?:\/\//.test(url)) {
        const { origin, protocol } = new URL(url);
        await browser.send('Network.setCookies', { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin, path: '/', secure: protocol === 'https:' })) });
    }
    if (Object.keys(headers).length && /^https?:\/\//.test(url)) await headersFor(browser, new URL(url).origin, headers);
}

const addedHeaders = new WeakMap();

/** Network.setExtraHTTPHeaders would send them to every host, so each request to the origin is held and given them. */
async function headersFor(browser, origin, headers) {
    addedHeaders.get(browser)?.();
    const names = new Set(Object.keys(headers).map((name) => name.toLowerCase()));
    addedHeaders.set(browser, browser.on('Fetch.requestPaused', ({ requestId, request }) => {
        const own = new URL(request.url).origin === origin;
        const kept = Object.entries(request.headers).filter(([name]) => !own || !names.has(name.toLowerCase()));
        const all = [...kept, ...(own ? Object.entries(headers) : [])].map(([name, value]) => ({ name, value }));
        browser.send('Fetch.continueRequest', { requestId, headers: all }).catch(() => {});
    }));
    await browser.send('Fetch.enable', { patterns: [{ urlPattern: `${origin}/*` }] });
}

// A sign-in page by its address or its title; the Turkish words too (giriş, oturum).
const SIGN_IN = /(?:^|[^a-z])(?:log[\s_-]?in|sign[\s_-]?in|o?auth(?:2|enticat(?:e|ion)|ori[sz]e)?|sso|sessions?|giri[sş]|oturum)(?:[^a-z]|$)/i;
// The same, for an address someone asks for on purpose: checking the sign-up page itself is fine.
const ACCOUNT_PAGE = /(?:^|[^a-z])(?:sign[\s_-]?up|register|join|password|forgot|reset|kay[iı]t)(?:[^a-z]|$)/i;
/** A sign-in screen holds little else. Above this much visible text the form is part of a real page. */
const SIGN_IN_TEXT = 800;
const samePage = (a, b) => a.host === b.host && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '');

/**
 * Where open() ended up. A redirect means another page was measured: its address is returned so it can be named. A
 * sign-in page in place of the one asked for would pass as clean, so that stops the run (exit 2) unless allowRedirect.
 * An app can show that screen at the address asked for, with no redirect: a short page with a password field, or with
 * an email field and a sign-in heading, title or button, counts the same.
 * @returns {Promise<string|null>} the page measured instead, or null when it is the one asked for
 */
export async function assertLanded(browser, url, { allowRedirect = false } = {}) {
    if (!/^https?:\/\//.test(url)) return null;
    const page = await browser.evaluate(`({ href: location.href, title: document.title, password: [...document.querySelectorAll('input[type=password]')].some((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'), email: [...document.querySelectorAll('form input[type=email], form input[autocomplete=username], form input[name=email], form input[name=username]')].some((el) => el.getClientRects().length > 0), text: (document.body?.innerText ?? '').trim().length, words: [...document.querySelectorAll('h1, h2, button, input[type=submit]')].map((el) => (el.innerText || el.value || '').trim()).join(' | ').slice(0, 500) })`);
    const asked = new URL(url);
    const landed = new URL(page.href);
    if (samePage(asked, landed)) {
        const askedForIt = SIGN_IN.test(asked.pathname) || ACCOUNT_PAGE.test(asked.pathname);
        const screen = page.text < SIGN_IN_TEXT && (page.password || (page.email && (SIGN_IN.test(page.title) || SIGN_IN.test(page.words))));
        if (allowRedirect || askedForIt || !screen) return null;
        throw Object.assign(new Error(`${url} shows a sign-in form in place of the page, so the page cannot be checked. Sign in for it with --cookie "name=value" or --header "Name: value" (AI_DESIGN_CHECK_COOKIE and AI_DESIGN_CHECK_HEADERS keep them out of shell history and CI logs), or check the form itself with --allow-redirect.`), { exitCode: 2 });
    }
    // The query is left out: a sign-in address often carries a token or the way back.
    const where = `${landed.origin}${landed.pathname}`;
    if (!allowRedirect && (page.password || SIGN_IN.test(`${landed.host}${landed.pathname}`) || SIGN_IN.test(page.title))) {
        throw Object.assign(new Error(`${url} sent the browser to ${where}, which looks like a sign-in page, so the page asked for cannot be checked. Sign in for it with --cookie "name=value" or --header "Name: value" (AI_DESIGN_CHECK_COOKIE and AI_DESIGN_CHECK_HEADERS keep them out of shell history and CI logs), or check the page it landed on with --allow-redirect.`), { exitCode: 2 });
    }

    return where;
}

/**
 * --scope and --ignore, checked on the page before anything is measured. A scope that matches nothing would measure
 * nothing and read as a clean page, and a selector Chrome cannot parse would fail deep inside the measuring: both stop
 * the run (exit 2) and name the selector. An --ignore that matches nothing is fine: there is nothing to leave out.
 */
export async function assertScope(browser, url, { scope = [], ignore = [] } = {}) {
    if (!scope.length && !ignore.length) return;
    const { bad, empty } = await browser.evaluate(`((scope, ignore) => {
        const bad = [...scope, ...ignore].find((selector) => { try { document.querySelector(selector); return false; } catch { return true; } });
        return bad !== undefined ? { bad } : { empty: scope.filter((selector) => !document.querySelector(selector)) };
    })(${JSON.stringify(scope)}, ${JSON.stringify(ignore)})`);
    if (bad !== undefined) throw Object.assign(new Error(`"${bad}" is not a CSS selector (--${scope.includes(bad) ? 'scope' : 'ignore'}).`), { exitCode: 2 });
    if (empty.length) throw Object.assign(new Error(`--scope "${empty[0]}" matches nothing on ${url}, so nothing there would be checked. Check the selector against the page's HTML.`), { exitCode: 2 });
}

/** A local copy of the page for the checker, and the URL Chrome opens. */
async function source(input, work, name) {
    if (/^https?:\/\//.test(input)) {
        const html = await (await fetch(input)).text();
        writeFileSync(join(work, `${name}.html`), html);

        return { url: input, dir: work, file: `${name}.html` };
    }
    const path = resolve(input);
    if (!existsSync(path)) throw new Error(`Not found: ${input}`);

    return { url: pathToFileURL(path).href, dir: dirname(path), file: basename(path) };
}

/** Boxes on the screen for each finding: elements that carry the class, or the text that matched. */
const BOXES = (values, view) => `(() => {
    const values = ${JSON.stringify(values)};
    const boxes = [];
    const add = (raw) => {
        // Clamp to the screen; page-sized regions (the main column, the sidebar) would cover everything.
        const left = Math.max(0, raw.left), top = Math.max(0, raw.top);
        const rect = { left, top, width: Math.min(${view.width}, raw.right) - left, height: Math.min(${view.height}, raw.bottom) - top };
        if (rect.width < 2 || rect.height < 2 || rect.width * rect.height > ${view.width * view.height} * 0.12) return;
        boxes.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    };
    // A blurred or hidden decoration has no visible edge to point at.
    const visible = (element) => {
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && Number(style.opacity) > 0.05 && !/blur/.test(style.filter);
    };
    const all = [...document.querySelectorAll('body *')];
    for (const value of values) {
        if (!/\\s/.test(value) && /[-:[]/.test(value)) {
            all.filter((element) => element.classList.contains(value) && visible(element)).slice(0, 40).forEach((element) => add(element.getBoundingClientRect()));
            continue;
        }
        // Every place the text appears (the same emoji in each row), not only the first.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let found = 0;
        while (walker.nextNode() && found < 20) {
            const text = walker.currentNode.textContent;
            for (let at = text.indexOf(value); at >= 0 && found < 20; at = text.indexOf(value, at + value.length)) {
                const range = document.createRange();
                range.setStart(walker.currentNode, at);
                range.setEnd(walker.currentNode, at + value.length);
                add(range.getBoundingClientRect());
                found++;
            }
        }
    }
    const seen = new Set();
    // Reading order, so the marks sweep down the screen.
    boxes.sort((a, b) => Math.round(a.y / 8) - Math.round(b.y / 8) || a.x - b.x);
    return boxes.filter((box) => {
        const key = [box.x, box.y, box.w, box.h].map(Math.round).join(',');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 160);
})()`;

const STAGE = (data) => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#0e0f12">
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
const data = ${JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, (char) => `\\u${char.charCodeAt(0).toString(16)}`)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const load = (src) => new Promise((done) => { const image = new Image(); image.onload = () => done(image); image.src = src; });
let before, after;
const ready = Promise.all([load(data.before), load(data.after)]).then(([a, b]) => { before = a; after = b; });
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const span = (t, from, to) => ease((t - from) / (to - from));
const FONT = '-apple-system, "Segoe UI", Inter, system-ui, sans-serif';
const MONO = '"SF Mono", Menlo, Consolas, monospace';
const X = 40, Y = 170, W = 1000, H = W * ${VIEW.height} / ${VIEW.width}, S = W / ${VIEW.width};
function rounded(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function render(t) {
    ctx.clearRect(0, 0, ${SIZE}, ${SIZE});
    ctx.fillStyle = '#0e0f12'; ctx.fillRect(0, 0, ${SIZE}, ${SIZE});
    const fade = span(t, 0, 0.5);
    const wipe = span(t, 5.4, 7.6);
    const wipeX = X + W * wipe;
    const count = t < 5.4 ? Math.round(data.beforeCount * span(t, 0.6, 4.6)) : Math.round(data.beforeCount + (data.afterCount - data.beforeCount) * wipe);
    ctx.globalAlpha = fade;

    // Header: which screen and the live count.
    ctx.fillStyle = '#8b8f98'; ctx.font = '500 26px ' + FONT; ctx.textBaseline = 'alphabetic';
    ctx.fillText(t < 6.5 ? 'Before' : 'After', X, 82);
    ctx.fillStyle = '#eef0f5'; ctx.font = '600 34px ' + FONT;
    ctx.fillText(data.title, X, 128);
    ctx.textAlign = 'right';
    ctx.font = '500 26px ' + FONT; ctx.fillStyle = '#8b8f98';
    ctx.fillText(count === 1 ? 'finding' : 'findings', X + W, 128);
    const label = ctx.measureText(count === 1 ? 'finding' : 'findings').width;
    ctx.fillStyle = count === 0 && t > 6.5 ? '#4cc38a' : (count > 0 ? '#ff7a8a' : '#eef0f5');
    ctx.font = '600 84px ' + FONT;
    ctx.fillText(String(count), X + W - label - 16, 128);
    ctx.textAlign = 'left';

    // Screens: after on the left of the wipe, before on the right.
    ctx.save(); rounded(X, Y, W, H, 18); ctx.clip();
    ctx.drawImage(before, X, Y, W, H);
    if (wipe > 0) { ctx.save(); ctx.beginPath(); ctx.rect(X, Y, wipeX - X, H); ctx.clip(); ctx.drawImage(after, X, Y, W, H); ctx.restore(); }

    // Findings: pop in one by one; they live on the before screen only, so the wipe cuts them off.
    ctx.save(); ctx.beginPath(); ctx.rect(wipeX, Y, X + W - wipeX, H); ctx.clip();
    data.boxes.forEach((box, index) => {
        const appear = span(t, 0.6 + (3.6 * index) / Math.max(1, data.boxes.length), 0.95 + (3.6 * index) / Math.max(1, data.boxes.length));
        const x = X + box.x * S, y = Y + box.y * S, w = box.w * S, h = box.h * S;
        if (appear <= 0) return;
        const grow = 1 + (1 - appear) * 0.35;
        const cx = x + w / 2, cy = y + h / 2;
        rounded(cx - (w * grow) / 2 - 3, cy - (h * grow) / 2 - 3, w * grow + 6, h * grow + 6, 5);
        ctx.fillStyle = 'rgba(255, 92, 112, ' + 0.08 * appear + ')'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 92, 112, ' + appear + ')'; ctx.stroke();
    });
    ctx.restore();
    ctx.restore();
    if (wipe > 0 && wipe < 1) { ctx.fillStyle = '#eef0f5'; ctx.fillRect(wipeX - 1.5, Y - 10, 3, H + 20); }
    rounded(X, Y, W, H, 18); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke();

    // Footer: the command.
    ctx.fillStyle = '#eef0f5'; ctx.font = '500 30px ' + MONO;
    ctx.fillText('npx @enmera/ai-design-check', X, Y + H + 68);
    ctx.textAlign = 'right'; ctx.fillStyle = '#8b8f98'; ctx.font = '500 24px ' + FONT;
    ctx.fillText(data.rules + ' rules', X + W, Y + H + 66); ctx.textAlign = 'left';

    // End card.
    const end = span(t, 9.0, 9.8);
    if (end > 0) {
        ctx.fillStyle = 'rgba(14, 15, 18, ' + 0.9 * end + ')'; ctx.fillRect(0, 0, ${SIZE}, ${SIZE});
        ctx.globalAlpha = end; ctx.textAlign = 'center';
        ctx.fillStyle = '#eef0f5'; ctx.font = '600 120px ' + FONT;
        ctx.fillText(data.beforeCount + ' → ' + data.afterCount, ${SIZE / 2}, 470);
        ctx.fillStyle = '#8b8f98'; ctx.font = '500 34px ' + FONT;
        ctx.fillText('design findings in one pass', ${SIZE / 2}, 530);
        ctx.fillStyle = '#eef0f5'; ctx.font = '500 34px ' + MONO;
        ctx.fillText('npx @enmera/ai-design-check', ${SIZE / 2}, 660);
        ctx.fillStyle = '#8b8f98'; ctx.font = '400 26px ' + FONT;
        ctx.fillText('Rules, a checker and a fix skill for AI-built UI', ${SIZE / 2}, 712);
        ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
}
window.frame = async (t) => { await ready; render(t); return canvas.toDataURL('image/jpeg', 0.92); };
</script></body></html>`;

/**
 * @param {string} beforeInput file or URL
 * @param {string} afterInput file or URL
 * @param {{out?: string, still?: string, title?: string}} options
 */
export async function story(beforeInput, afterInput, { out = 'story.mp4', still, title, music } = {}) {
    if (music && !existsSync(resolve(music))) throw new Error(`Not found: ${music}`);
    const chrome = findChrome();
    if (!chrome) throw new Error('Chrome or Chromium not found; set CHROME_PATH');
    if (spawnSync('ffmpeg', ['-version']).status !== 0) throw new Error('ffmpeg not found on PATH');

    const work = mkdtempSync(join(tmpdir(), 'ai-design-check-story-'));
    const browser = await launch(chrome);
    try {
        const pages = [await source(beforeInput, work, 'before'), await source(afterInput, work, 'after')];
        const [beforeFindings, afterFindings] = pages.map((page) => check(page.dir, { include: [page.file] }));
        const shots = [];
        let boxes = [];
        for (const [index, page] of pages.entries()) {
            await browser.open(page.url, VIEW);
            if (index === 0) boxes = await browser.evaluate(BOXES([...new Set(beforeFindings.map((item) => item.value))], VIEW));
            const shot = await browser.send('Page.captureScreenshot', { format: 'png' });
            shots.push(`data:image/png;base64,${shot.data}`);
        }

        const stage = join(work, 'stage.html');
        const name = title ?? (await browser.evaluate('document.title')) ?? basename(beforeInput);
        writeFileSync(stage, STAGE({ before: shots[0], after: shots[1], boxes, beforeCount: beforeFindings.length, afterCount: afterFindings.length, title: name, rules: loadRules().rules.length }));
        await browser.open(pathToFileURL(stage).href, { width: SIZE, height: SIZE, settle: 100 });

        if (still) {
            const image = await browser.evaluate('frame(6.5)');
            writeFileSync(still, Buffer.from(image.split(',')[1], 'base64'));
        }
        // Music (optional) is cut to the video and faded out over the last second.
        const audio = music ? ['-i', resolve(music), '-map', '0:v', '-map', '1:a', '-af', `afade=t=out:st=${DURATION - 1}:d=1`, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : [];
        const encoder = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...audio, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', resolve(out)], { stdio: ['pipe', 'inherit', 'inherit'] });
        const finished = new Promise((done, fail) => encoder.on('exit', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited with ${code}`)))));
        for (let index = 0; index < FPS * DURATION; index++) {
            const image = await browser.evaluate(`frame(${index / FPS})`);
            if (!encoder.stdin.write(Buffer.from(image.split(',')[1], 'base64'))) await new Promise((done) => encoder.stdin.once('drain', done));
        }
        encoder.stdin.end();
        await finished;

        return { before: beforeFindings.length, after: afterFindings.length, marked: boxes.length, out: resolve(out) };
    } finally {
        await browser.close();
        rmSync(work, { recursive: true, force: true });
    }
}
