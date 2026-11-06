#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { CONFIG_FILE, CONFIG_FILES, applyBaseline, check, coverage, loadConfig, loadRules, matches, spacingScales, toBaseline } from '../src/check.js';
import { applyFixes } from '../src/fix.js';
import { inventory } from '../src/inventory.js';
import { scaleLines } from '../src/spacing.js';

const BASELINE = '.ai-design-check-baseline.json';

const HELP = `ai-design-check — design rules and a checker for AI-built product interfaces

Usage
  npx @enmera/ai-design-check [path …]           Check the project
  npx @enmera/ai-design-check inventory [path …] Count how many ways buttons, inputs, headings, badges and cards are written
  npx @enmera/ai-design-check rules [--tr]       List the rules
  npx @enmera/ai-design-check init               Write ${CONFIG_FILE} with the defaults
  npx @enmera/ai-design-check hook               For agent hooks: check the file named in the hook JSON on stdin
  npx @enmera/ai-design-check story <before> <after> [--out story.mp4] [--still frame.png] [--title name] [--music track.mp3]
                                                 Square before/after video with every finding marked (files or URLs;
                                                 needs Chrome and ffmpeg, nothing else)
  npx @enmera/ai-design-check scan <url> [url …] Check running pages at desktop and phone width: real contrast, sizes,
                                                 what covers what, script errors, and the tells only a browser sees
                                                 (needs Chrome; no model, no API key). Each page gets its own summary
  npx @enmera/ai-design-check narrow <file|url> [--width 320] [--stress]
                                                 Render at phone width and report sideways scrolling, cut-off text,
                                                 text shrunk to fit and content hidden on phones (needs Chrome);
                                                 --stress runs it again with long names, large numbers, longer text
  npx @enmera/ai-design-check system [--character calm] [--brand "#1E5A63"] [--kind dashboard] [--out design-system]
                                                 Generate a design system: fonts, type scale, light and dark colors that
                                                 pass contrast, radius and spacing, as CSS, Tailwind, Bootstrap (CSS and
                                                 Sass), JSON, SwiftUI, Compose and a preview page (--ui/--display pick
                                                 fonts, --source any)
  npx @enmera/ai-design-check redesign <url|page.html> [--agent claude|codex|none] [--plan] [--brief brief.json] [--build "npm run build"] [--path /] [--only type,color,craft] [--in-place] [--files "a,b/**"] [--out dir] [--intent "..."] [--degree heavy|polish|none] [--images openai|gemini] [--images-max 6] [--serve dir] [--render "cmd"] [--yes]
                                                 Your coding agent studies the running page, its code and its subject and
                                                 writes one card per section; the numbered fixes (type, colour, rhythm,
                                                 details, phone) and the cards are then applied pass by pass on a new git
                                                 branch. A pass that loses content or does not improve the page is thrown
                                                 away. Needs Chrome and git; web pages only. --plan: stop after the cards
                                                 so you can read and edit them, then --brief to build them. The cards
                                                 start with a degree (heavy, polish, none) and a direction from your
                                                 product, and each says "changes the look" or "fixes only"; a card that
                                                 promised a visible change and does not show one is tried once more,
                                                 then thrown away.
                                                 --in-place: no branch, no commits, runs on a tree with uncommitted
                                                 work; a kept pass stays uncommitted and its patch is saved to undo it.
                                                 --files: paths or globs; a pass that changes any other file is thrown
                                                 away. --out: where plan, screenshots, logs and patches go (default
                                                 .ai-design-check/redesign, git-ignored; a folder outside works too).
                                                 A saved .html file (or --html page.html) in place of the URL, for a
                                                 page behind a sign-in: with --build, passes edit the sources and the
                                                 build writes the file again; without, passes edit the file itself.
                                                 --agent none: the plan and the prompts, nothing run. Commit or stash
                                                 your changes first; Ctrl-C puts the pass in progress back.
                                                 --intent "<text>": what you want from this run; it leads the study and
                                                 the cards, and is kept in brief.json. --product PRODUCT.md and
                                                 --design DESIGN.md: your notes on the product and its visual system
                                                 (default: those files in the project root, when present). Without a
                                                 PRODUCT.md the study writes a draft to the --out folder for you to
                                                 review and move to the root.
                                                 --degree heavy|polish|none: how far this run goes, chosen by you; the
                                                 study has to write that degree, and a --brief brief takes it. heavy
                                                 rebuilds every section that is not kept, composes the first screen as
                                                 one picture and lets cards use tints and shades of the site's colours.
                                                 --images openai|gemini: cards may ask for generated photos or
                                                 illustrations (at most 1 per card, --images-max per run, default 6,
                                                 up to 12). The key comes from OPENAI_API_KEY or GEMINI_API_KEY only.
                                                 Each image and an estimated cost are printed first; nothing is
                                                 generated without a yes (or --yes). Images go to <out>/images.
                                                 --serve <dir>: serve that folder on 127.0.0.1 and redesign a page in it
                                                 (redesign module-1.html --serve dist). --render "<command>": draws the
                                                 page (a CMS module into static HTML) before the first measurement and
                                                 after every pass, after --build; a failure throws the pass away.
                                                 --build-minutes <n>: time limit for --build and --render (default 10).
                                                 Before applying, the degree, direction, intent and cards are printed;
                                                 at a terminal it asks "Apply these passes? [y/N]" and stops with
                                                 nothing changed unless you say yes. --yes: apply without asking.
                                                 Every run ends with compare.html in the --out folder: each pass's
                                                 before and after screenshots side by side, kept or thrown away and
                                                 why. Tests a pass changed are listed apart (testsChanged)
  npx @enmera/ai-design-check redesign apply <patch>
                                                 Apply a saved pass (pass-N-name.rejected.patch, or a kept one's patch)
                                                 to the working tree, 3-way when it does not fit as it is; a patch that
                                                 does not apply cleanly changes nothing. Prints the files and the undo
  npx @enmera/ai-design-check shot <url|file.html> [--width 1440] [--out shot.png] [--full]
                                                 One screenshot of the page as Chrome draws it (read-only), for an agent
                                                 to look at its own work; --full: the whole page; --scope clips to that
                                                 part, --ignore hides one; --cookie and --header as for scan
  npx @enmera/ai-design-check fonts [--character calm]
                                                 The characters and the font library behind system

Options
  --format text|json|github   Output (github: annotations on pull requests)
  --json                      Same as --format json
  --strict                    Exit 1 on warnings too (default: errors only)
  --quiet                     Only the summary line
  --fix                       Change what has one mechanical answer, no agent needed: spacing and corners to the nearest
                              step of the scale (a tie goes up), very heavy type to bold. The rest stays in the report
  --dry-run                   With --fix: list the changes, write nothing
  --nearest-type              With --fix: also move text-[Npx] to the nearest theme size (lg:text-[64px] → lg:text-6xl),
                              a matching leading-[Npx] keeping its ratio. Off by default: a size is a hierarchy decision
  --write-baseline            Record current findings in ${BASELINE}; later runs report only new ones
  --no-baseline               Ignore the baseline file
  --tr                        Turkish rule texts
  --allow-status 404          scan, narrow, shot: check a page that answers this HTTP status (an error page you designed)
  --cookie "name=value"       scan, narrow, redesign, shot: a cookie for the page's host, for pages behind a sign-in
                              (repeatable). AI_DESIGN_CHECK_COOKIE="a=1; b=2" keeps it out of shell history and CI logs
  --header "Name: value"      scan, narrow, redesign, shot: a request header such as Authorization (repeatable); it goes only
                              to the page's own origin. AI_DESIGN_CHECK_HEADERS takes one per line. Cookie and header
                              values are never printed
  --allow-redirect            scan, narrow, redesign, shot: check the page a redirect lands on, even a sign-in page (without
                              it, a page that sends the browser to a sign-in page stops the run with exit 2)
  --scope "<css selector>"    scan, narrow, redesign, shot: check and measure only what is inside a match, such as one CMS
                              module in the app's shell: --scope "[data-block-type=module-1]" (repeatable: any of them).
                              A scope that matches nothing stops the run with exit 2
  --ignore "<css selector>"   scan, narrow, redesign, shot: leave out what is inside a match, such as the shell's nav or a
                              test badge (repeatable)
  --force                     system: overwrite existing files
  --version                   Print the version

Inline ignore (a reason is required):
  // ai-design-check-ignore-next-line rule-id -- why
  // ai-design-check-ignore-file rule-id -- why

Rules and reasons: https://github.com/enmerasoftware/ai-design-check/blob/main/RULES.md`;

// A bad config or baseline is the person's to fix: one line, exit 2 (a usage problem), no stack trace.
process.on('uncaughtException', (error) => {
    console.error(`ai-design-check: ${error.message}`);
    process.exit(2);
});

const args = process.argv.slice(2);
const SWITCHES = ['json', 'strict', 'quiet', 'fix', 'dry-run', 'nearest-type', 'write-baseline', 'no-baseline', 'tr', 'help', 'version', 'all', 'stress', 'plan', 'force', 'allow-redirect', 'in-place', 'yes', 'full'];
const VALUES = ['format', 'out', 'still', 'title', 'music', 'width', 'character', 'brand', 'kind', 'ui', 'display', 'source', 'path', 'agent', 'build', 'only', 'brief', 'allow-status', 'cookie', 'header', 'scope', 'ignore', 'files', 'html', 'product', 'design', 'intent', 'degree', 'images', 'images-max', 'serve', 'render', 'build-minutes'];
// The option before an argument takes it as its value ("redesign" is no option, though it ends in "design").
const takesValue = (arg) => Boolean(arg?.startsWith('--') && VALUES.includes(arg.slice(2)));
// An option that is not understood must stop the run: silently dropped, --strict is off and --dry-run writes files.
const usageError = (message) => {
    console.error(`${message}\nSee: ai-design-check --help`);
    process.exit(2);
};
args.forEach((arg, index) => {
    if (takesValue(args[index - 1]) || !arg.startsWith('-') || arg === '-h' || arg === '-v') return;
    const name = arg.replace(/^--?/, '').split('=')[0];
    if (arg.startsWith('--') && SWITCHES.includes(name)) {
        if (arg.includes('=')) usageError(`${arg}: --${name} takes no value.`);
    } else if (arg.startsWith('--') && VALUES.includes(name)) {
        if (!arg.includes('=') && (args[index + 1] === undefined || args[index + 1].startsWith('--'))) usageError(`--${name} needs a value.`);
    } else usageError(`Unknown option ${arg}.`);
});
const flags = new Set(args.filter((arg) => arg.startsWith('-') && !arg.includes('=')));
const valueOf = (name) => {
    const inline = args.find((arg) => arg.startsWith(`--${name}=`));
    if (inline) return inline.slice(name.length + 3);
    const index = args.indexOf(`--${name}`);

    return index >= 0 ? args[index + 1] : undefined;
};
/** Every value of an option given more than once (--cookie a=1 --cookie b=2), in order. */
const valuesOf = (name) => args.flatMap((arg, index) => {
    if (arg.startsWith(`--${name}=`)) return [arg.slice(name.length + 3)];

    return arg === `--${name}` && args[index - 1] !== `--${name}` && args[index + 1] !== undefined ? [args[index + 1]] : [];
});
/**
 * Cookies and headers for a page behind a sign-in, from the options and from the environment, which keeps them out of
 * shell history and CI logs. They are secrets: no message here, or anywhere after, shows a value.
 */
const signInFrom = () => {
    const cookies = [...valuesOf('cookie'), process.env.AI_DESIGN_CHECK_COOKIE ?? ''].flatMap((text) => text.split(';')).map((item) => item.trim()).filter(Boolean).map((item) => {
        const at = item.indexOf('=');
        if (at < 1) usageError('A cookie takes the form name=value (in --cookie or AI_DESIGN_CHECK_COOKIE, separated by ";"); one has no name or no "=". Its value is not shown.');

        return { name: item.slice(0, at).trim(), value: item.slice(at + 1).trim() };
    });
    const headers = {};
    for (const item of [...valuesOf('header'), ...(process.env.AI_DESIGN_CHECK_HEADERS ?? '').split(/\r?\n/)].map((line) => line.trim()).filter(Boolean)) {
        const at = item.indexOf(':');
        if (at < 1) usageError('A header takes the form "Name: value" (in --header, or one per line in AI_DESIGN_CHECK_HEADERS); one has no name or no ":". Its value is not shown.');
        headers[item.slice(0, at).trim()] = item.slice(at + 1).trim();
    }

    return { cookies, headers };
};
/** --scope and --ignore: CSS selectors for the part of the page to check; Chrome tells whether each one parses. */
const area = () => {
    const [scope, ignore] = ['scope', 'ignore'].map((name) => valuesOf(name).map((selector) => selector.trim()));
    const blank = scope.includes('') ? 'scope' : ignore.includes('') ? 'ignore' : null;
    if (blank) usageError(`--${blank} needs a CSS selector, such as "[data-block-type=module-1]".`);

    return { scope, ignore };
};
const COMMANDS = ['check', 'rules', 'init', 'help', 'inventory', 'hook', 'story', 'narrow', 'system', 'fonts', 'redesign', 'scan', 'shot'];
const positional = args.filter((arg, index) => !arg.startsWith('-') && !takesValue(args[index - 1]));
// "ai-design-check src lang" is a check of those paths; the command word is optional.
const [command, ...named] = COMMANDS.includes(positional[0]) ? positional : ['check', ...positional];
// "./src/a.tsx" and absolute paths name the same file as "src/a.tsx"; the walker and the globs expect the last form.
const rest = named.map((path) => (/^(?:https?|data|file):/.test(path) ? path : relative(process.cwd(), resolve(path)).split(sep).join('/') || '.'));
const format = flags.has('--json') ? 'json' : (valueOf('format') ?? 'text');
if (!['text', 'json', 'github'].includes(format)) usageError(`--format takes text, json or github, not ${format}.`);
const allowStatus = (valueOf('allow-status') ?? '').split(',').filter(Boolean).map(Number);
// Workflow commands: a file name or a line of page text must stay data, never start a command of its own.
const escapeData = (text) => String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
const LEVEL = { error: 'error', warn: 'warning', info: 'notice' };
const annotation = (item) => `::${LEVEL[item.severity]} ${item.line ? `file=${escapeProperty(item.path)},line=${item.line},` : ''}title=${escapeProperty(item.rule)}::${escapeData(item.message)}`;
/** A repository may hold a symlink under a name this tool writes; following it would overwrite a file outside. */
const writeOwn = (file, content) => {
    let link = false;
    try {
        link = lstatSync(file).isSymbolicLink();
    } catch {}
    if (link) throw new Error(`${file} is a symbolic link; not writing through it.`);
    writeFileSync(file, content);
};
const lang = flags.has('--tr') ? 'tr' : 'en';
const cwd = process.cwd();
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const SEVERITY = { error: (text) => paint(31, text), warn: (text) => paint(33, text), info: (text) => paint(36, text) };
// Output is collected and written once; exiting only after the write flushes keeps large piped output (--json) whole.
const readBaseline = (file) => {
    try {
        return JSON.parse(readFileSync(file, 'utf8')).counts ?? {};
    } catch (error) {
        throw new Error(`${BASELINE} is not valid JSON: ${error.message}. Fix it, or write it again with --write-baseline.`);
    }
};
const lines = [];
const print = (...parts) => lines.push(parts.join(' '));
const done = (code) => {
    if (lines.length > 0) {
        // Synchronous write, retried while a non-blocking pipe is full, so nothing after done() runs and nothing is cut.
        const buffer = Buffer.from(`${lines.join('\n')}\n`);
        let offset = 0;
        while (offset < buffer.length) {
            try {
                offset += writeSync(1, buffer, offset);
            } catch (error) {
                if (error.code !== 'EAGAIN') throw error;
            }
        }
    }
    process.exit(code);
};

if (flags.has('--help') || flags.has('-h') || command === 'help') {
    print(HELP);
    done(0);
}

if (flags.has('--version') || flags.has('-v')) {
    print(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
    done(0);
}

if (command === 'story') {
    if (named.length !== 2) {
        console.error('Usage: ai-design-check story <before.html|url> <after.html|url> [--out story.mp4]');
        done(1);
    }
    const { story } = await import('../src/story.js');
    try {
        const result = await story(named[0], named[1], { out: valueOf('out'), still: valueOf('still'), title: valueOf('title'), music: valueOf('music') });
        print(`${result.before} → ${result.after} findings, ${result.marked} marked on screen. Wrote ${relative(cwd, result.out)}`);
        done(0);
    } catch (error) {
        console.error(error.message);
        done(1);
    }
}

if (command === 'scan') {
    if (named.length === 0) {
        console.error('Usage: ai-design-check scan <url of the running page> [url …] [--format text|json|github] [--strict]');
        done(1);
    }
    const { scanPages } = await import('../src/scan.js');
    try {
        const pages = await scanPages(named, { config: loadConfig(cwd), allowStatus, allowRedirect: flags.has('--allow-redirect'), auth: signInFrom(), ...area() });
        const results = pages.flatMap((page) => page.findings);
        const total = (items, severity) => items.filter((item) => item.severity === severity).length;
        const counts = (items) => ({ errors: total(items, 'error'), warnings: total(items, 'warn'), notes: total(items, 'info') });
        const failed = pages.filter((page) => page.error);
        // A page that could not be checked says why; the pages that could still report.
        for (const page of failed) console.error(page.error.message);
        if (format === 'json') {
            print(JSON.stringify({ findings: results, ...counts(results), pages: pages.map((page) => ({ url: page.url, ...(page.measured ? { measured: page.measured } : {}), ...(page.error ? { error: page.error.message } : counts(page.findings)) })) }, null, 2));
        } else if (format === 'github') {
            for (const item of results) print(annotation(pages.length > 1 ? { ...item, message: `${item.message} (${item.path})` } : item));
        } else {
            for (const page of pages.filter((item) => !item.error)) {
                if (pages.length > 1) print(`\n${paint(1, page.url)}`);
                if (page.measured) print(paint(33, `Measured ${page.measured}: ${page.url} redirected there.`));
                const groups = [[loadRules().areas.accessibility[lang], page.findings.filter((item) => item.area === 'accessibility' || item.rule === 'legible-contrast')], [lang === 'tr' ? 'Stil' : 'Style', page.findings.filter((item) => item.area !== 'accessibility' && item.rule !== 'legible-contrast')]];
                for (const [title, items] of groups) {
                    if (items.length === 0) continue;
                    print(`\n${paint(1, `${title} (${items.length})`)}`);
                    for (const item of items) print(`  ${SEVERITY[item.severity](item.severity.padEnd(5))}  ${item.message}  ${paint(2, item.rule)}${item.width < 768 ? paint(2, ` (${item.width} px)`) : ''}`);
                }
                const { errors, warnings, notes } = counts(page.findings);
                print(`\n${page.findings.length === 0 ? paint(32, 'No findings.') : `${errors} errors, ${warnings} warnings, ${notes} notes.`} ${paint(2, page.url)}`);
            }
            if (pages.length > 1) {
                const { errors, warnings, notes } = counts(results);
                print(`\n${paint(1, `${pages.length - failed.length} of ${pages.length} pages checked`)}${failed.length ? paint(31, ` (not checked: ${failed.map((page) => page.url).join(', ')})`) : ''}: ${errors} errors, ${warnings} warnings, ${notes} notes.`);
            }
        }
        // A sign-in page in place of the one asked for is a usage problem (exit 2); a page not there is a failure.
        const status = failed.some((page) => page.error.exitCode === 2) ? 2 : failed.length || total(results, 'error') > 0 || (flags.has('--strict') && total(results, 'warn') > 0) ? 1 : 0;
        done(status);
    } catch (error) {
        console.error(error.message);
        done(error.exitCode ?? 1);
    }
}

if (command === 'narrow') {
    if (named.length !== 1) {
        console.error('Usage: ai-design-check narrow <file.html|url> [--width 320] [--stress]');
        done(1);
    }
    const { narrow } = await import('../src/narrow.js');
    try {
        const width = Number(valueOf('width') ?? 320);
        if (!(width > 0)) throw new Error(`--width takes a number of pixels, got ${valueOf('width')}`);
        const config = loadConfig(cwd);
        let measured = null;
        const results = (await narrow(named[0], { width, stress: flags.has('--stress'), allowStatus, allowRedirect: flags.has('--allow-redirect'), auth: signInFrom(), ...area(), onLanded: (landed) => { measured = landed; } }))
            .map((item) => ({ ...item, severity: config.rules[item.rule] ?? item.severity }))
            .filter((item) => item.severity !== 'off');
        if (format === 'json') print(JSON.stringify({ findings: results, ...(measured ? { measured } : {}) }, null, 2));
        else if (format === 'github') for (const item of results) print(annotation(item));
        else {
            if (measured) print(paint(33, `Measured ${measured}: ${named[0]} redirected there.`));
            if (!flags.has('--quiet')) for (const item of results) print(`  ${SEVERITY[item.severity](item.severity.padEnd(5))}  ${item.message}  ${paint(2, item.rule)}`);
            const errors = results.filter((item) => item.severity === 'error').length;
            print(`\n${results.length === 0 ? paint(32, `No problems at ${width} px.`) : `${errors} errors, ${results.length - errors} warnings and notes at ${width} px.`}`);
        }
        done(results.some((item) => item.severity === 'error' || (flags.has('--strict') && item.severity === 'warn')) ? 1 : 0);
    } catch (error) {
        console.error(error.message);
        done(error.exitCode ?? 1);
    }
}

if (command === 'system') {
    const { designSystem, contrastReport } = await import('../src/system.js');
    const tokens = await import('../src/tokens.js');
    const { preview } = await import('../src/preview.js');
    try {
        let brand = valueOf('brand');
        if (brand !== undefined) {
            if (!/^#?[0-9a-f]{6}$/i.test(brand)) throw new Error(`--brand takes a hex color like "#1E5A63", got ${brand}`);
            brand = brand.startsWith('#') ? brand : `#${brand}`;
        }
        const system = designSystem({ character: valueOf('character'), kind: valueOf('kind'), brand, ui: valueOf('ui'), display: valueOf('display'), source: valueOf('source') });
        const outArg = valueOf('out');
        if (format === 'json' && !outArg) {
            print(tokens.json(system).trimEnd());
            done(0);
        }
        const out = resolve(outArg ?? 'design-system');
        mkdirSync(out, { recursive: true });
        const css = tokens.css(system);
        const files = {
            'tokens.css': css,
            'theme.css': tokens.tailwind(system),
            'bootstrap.css': tokens.bootstrap(system),
            '_variables.scss': tokens.scss(system),
            'tokens.json': tokens.json(system),
            'DesignSystem.swift': tokens.swift(system),
            // The file that defines the scale holds every size once; that is not a screen breaking it.
            'DesignSystem.kt': `// ai-design-check-ignore-file type-scale -- generated: this file defines the type scale\n${tokens.kotlin(system)}`,
            'preview.html': preview(system, css),
        };
        const taken = Object.keys(files).filter((name) => existsSync(join(out, name)) && readFileSync(join(out, name), 'utf8') !== files[name]);
        if (taken.length && !flags.has('--force')) throw new Error(`${relative(cwd, out) || '.'} already has ${taken.join(', ')}; they would be overwritten. Use another --out, or --force.`);
        for (const [name, content] of Object.entries(files)) writeOwn(join(out, name), content);
        if (format === 'json') {
            print(tokens.json(system).trimEnd());
            done(0);
        }
        const low = (mode) => Math.min(...contrastReport(system.color[mode]).map((item) => item.ratio));
        print(`${system.character} · ${system.kind} · brand ${system.brand}`);
        print(`  Fonts     UI ${system.fonts.ui}, display ${system.fonts.display}, numbers ${system.fonts.numeric}, code ${system.fonts.mono}`);
        if (system.fonts.alternatives.ui.length) print(`            other UI fonts for ${system.character}: ${system.fonts.alternatives.ui.filter((name) => name !== system.fonts.ui).slice(0, 4).join(', ')}`);
        print(`  Type      ${Object.entries(system.type).map(([role, item]) => `${role} ${item.size}`).join(' · ')}`);
        print(`  Accent    ${system.color.light.accent} light, ${system.color.dark.accent} dark`);
        print(`  Contrast  lowest text pair ${low('light').toFixed(2)} light, ${low('dark').toFixed(2)} dark (WCAG 2, 4.5 for text)`);
        print(`  Radius    ${Object.entries(system.shape.radius).filter(([name]) => name !== 'full').map(([name, value]) => `${name} ${value}`).join(' · ')}`);
        print(`\nWrote ${Object.keys(files).join(', ')} to ${relative(cwd, out) || '.'}. Open preview.html to see both themes.`);
        done(0);
    } catch (error) {
        console.error(error.message);
        done(1);
    }
}

if (command === 'shot') {
    if (named.length !== 1) {
        console.error('Usage: ai-design-check shot <url|file.html> [--width 1440] [--out shot.png] [--full]');
        done(1);
    }
    const { shot } = await import('../src/story.js');
    try {
        const width = Number(valueOf('width') ?? 1440);
        if (!(width > 0)) usageError(`--width takes a number of pixels, got ${valueOf('width')}.`);
        const result = await shot(named[0], { width, out: valueOf('out') ?? 'shot.png', full: flags.has('--full'), allowStatus, allowRedirect: flags.has('--allow-redirect'), auth: signInFrom(), ...area() });
        if (result.landed) print(paint(33, `Took ${result.landed}: ${named[0]} redirected there.`));
        print(`Wrote ${relative(cwd, result.out) || result.out} (${result.width}×${result.height} px)`);
        done(0);
    } catch (error) {
        console.error(error.message);
        done(error.exitCode ?? 1);
    }
}

if (command === 'redesign' && named[0] === 'apply') {
    if (named.length !== 2) {
        console.error('Usage: ai-design-check redesign apply <patch>');
        done(1);
    }
    const { applySaved } = await import('../src/redesign/run.js');
    try {
        const applied = applySaved(cwd, named[1]);
        print(`Applied ${named[1]}${applied.how === '3-way' ? ' (3-way)' : ''}. Changed:\n${applied.files.map((file) => `  ${file}`).join('\n')}\nTo undo: ${applied.undo}`);
        done(0);
    } catch (error) {
        console.error(error.message);
        done(1);
    }
}

if (command === 'redesign') {
    const { redesign } = await import('../src/redesign/run.js');
    // A saved page stands in for a URL when the page is behind a sign-in and no cookie is handed over.
    const serve = valueOf('serve');
    // With --serve the page is a path inside the served folder, not a saved page to open from disk.
    const html = valueOf('html') ?? (!serve && named[0] && /\.x?html?$/i.test(named[0]) && existsSync(resolve(cwd, named[0])) ? named[0] : undefined);
    const url = html ? undefined : named[0];
    if (html && !existsSync(resolve(cwd, html))) usageError(`Not found: ${html}`);
    const minutes = valueOf('build-minutes') === undefined ? 10 : Number(valueOf('build-minutes'));
    if (!(minutes > 0)) usageError('--build-minutes takes a number of minutes above 0, such as 20.');
    const degree = valueOf('degree');
    if (degree !== undefined && !['heavy', 'polish', 'none'].includes(degree)) usageError('--degree takes heavy, polish or none.');
    // --images: a usage problem is said here, before any agent starts; the key itself is never printed.
    const images = valueOf('images');
    let imagesMax = null;
    if (valueOf('images-max') !== undefined && images === undefined) usageError('--images-max goes with --images openai|gemini.');
    if (images !== undefined) {
        const { imageKey, imagesMaxOf } = await import('../src/redesign/images.js');
        try {
            imagesMax = imagesMaxOf(valueOf('images-max'));
            if (!flags.has('--plan') && valueOf('agent') !== 'none') imageKey(images);
            else if (!['openai', 'gemini'].includes(images)) imageKey(images);
        } catch (error) {
            usageError(error.message);
        }
    }
    if (!html && !serve && (!url || !/^https?:\/\//.test(url))) {
        console.error('Usage: ai-design-check redesign <url of the running page, e.g. http://localhost:8000 | saved page.html> [--agent claude|codex|none] [--plan] [--brief brief.json] [--build "npm run build"] [--in-place] [--files "a,b/**"] [--out dir]\nApps have no page to open: use the checker, --fix and the fix skill.');
        done(1);
    }
    const input = html ?? url ?? '';
    // Asked only with a person at the terminal: an agent or CI gets the summary and the run goes on.
    const ask = process.stdin.isTTY && process.stdout.isTTY && !flags.has('--yes') && !flags.has('--plan') && valueOf('agent') !== 'none';
    const confirm = !ask ? null : async (question = 'Apply these passes? [y/N] ') => {
        const { createInterface } = await import('node:readline');
        const prompt = createInterface({ input: process.stdin, output: process.stderr });
        return new Promise((done) => {
            let answered = false;
            const end = (yes) => {
                if (answered) return;
                answered = true;
                prompt.close();
                done(yes);
            };
            prompt.on('SIGINT', () => end(false));
            prompt.on('close', () => end(false));
            prompt.question(question, (answer) => end(['y', 'yes', 'e', 'evet'].includes(answer.trim().toLocaleLowerCase('tr'))));
        });
    };
    // --files limits what may change, not what is measured: the page's own shell would count against the module.
    if (valueOf('files') && !area().scope?.length) console.error('Note: --files limits the edits, but the whole page is measured, including what those files do not render. Add --scope "<selector of their root>", such as --scope "[data-block-type=module-1]".');
    // An agent ran and nothing was kept: a script must not read that as success.
    const failedRun = (result) => !flags.has('--plan') && !result.notApproved && valueOf('agent') !== 'none' && (result.studyProblems || !result.passes.some((pass) => pass.kept));
    try {
        const result = await redesign({
            cwd, url, html, path: valueOf('path'), agent: valueOf('agent') ?? 'claude', build: valueOf('build'),
            only: valueOf('only')?.split(','), kind: valueOf('kind') ?? 'marketing', plan: flags.has('--plan'), briefFile: valueOf('brief'),
            allowRedirect: flags.has('--allow-redirect'), auth: signInFrom(), ...area(), inPlace: flags.has('--in-place'),
            files: valueOf('files')?.split(',').map((item) => item.trim()).filter(Boolean), out: valueOf('out'), log: (line) => console.error(line),
            render: valueOf('render'), serve, buildMinutes: minutes, product: valueOf('product'), design: valueOf('design'), intent: valueOf('intent'), degree: degree ?? null, images: images ?? null, imagesMax, yes: flags.has('--yes'), confirm,
        });
        if (format === 'json') {
            print(JSON.stringify(result, null, 2));
            done(failedRun(result) ? 1 : 0);
        }
        const { diagnosis, study } = result;
        if (diagnosis.sound && !result.passes.length && (!study || study.leaveAlone)) {
            print(`The page is sound: nothing to change.${study?.reason ? ` ${study.reason}` : ''}`);
            done(0);
        }
        print(`Plan (${result.out}/DESIGN.md):`);
        for (const pass of diagnosis.passes) {
            print(`  ${pass.name}`);
            for (const item of pass.items) print(`    ${paint(1, item.id)}  ${item.decision}`, paint(2, `\n      now: ${item.evidence}`));
        }
        if (study?.sections) {
            const degree = study.degree ?? 'heavy';
            print(`\nSection cards (${result.out}/BRIEF.md), degree ${degree}:`);
            if (study.direction) print(paint(2, `  ${[study.direction.character, study.direction.world].map((item) => (Array.isArray(item) ? item.join(', ') : item)).join(' · ')}; moments: ${[study.direction.moments].flat().join(', ')}; signature: ${study.direction.signature}`));
            for (const section of study.sections) {
                const look = section.changesLook === true ? paint(32, 'changes the look') : section.changesLook === false ? paint(2, 'fixes only') : '';
                print(`  ${paint(1, section.heading)}${look ? `  [${look}]` : ''}${section.layout ? `  layout ${section.layout}` : ''}  ${section.idea}`);
                if (section.layoutWhy) print(paint(2, `      layout: ${section.layoutWhy}`));
                if (section.changesLook && section.visible) print(paint(2, `      a visitor sees: ${section.visible}`));
            }
            // Said before anything is applied: cards that only close findings leave the page looking almost the same.
            if (study.degree && !study.sections.some((section) => section.changesLook === true)) print(degree === 'none' ? 'No card changes the look: the study says the page works, and these are suggestions only.' : 'No card changes the look: after these, the page will look almost the same.');
            if (study.suggestions?.length) print(`  Suggested, not built: ${study.suggestions.join('; ')}`);
        }
        if (result.productDraft) print(`\nNo PRODUCT.md yet: review the draft in ${result.productDraft} and move it to the project root, so later runs start from it.`);
        if (result.notApproved) {
            // The same command, built from the study just made, so the person does not wait for it again.
            const again = args.filter((arg, index) => arg !== '--yes' && arg !== '--brief' && args[index - 1] !== '--brief' && !arg.startsWith('--brief='));
            const quote = (arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`);
            print(`\nNothing changed; the plan files stay in ${result.out}. To apply them: npx @enmera/ai-design-check ${[...again, ...(result.continueBrief ? ['--brief', result.continueBrief] : []), '--yes'].map(quote).join(' ')}`);
            done(0);
        }
        if (result.studyProblems) print(`\n${result.briefFile ? `No section ideas, ${result.briefFile} did not pass its check` : 'No section ideas, the study did not pass its check'}:\n${result.studyProblems.map((item) => `  ${item}`).join('\n')}`);
        if (!result.passes.length) {
            print(flags.has('--plan') && study?.sections
                ? `\nNo changes made. Edit ${result.out}/brief.json if you like, then: npx @enmera/ai-design-check redesign ${input} --brief ${result.out}/brief.json`
                : `\nNo changes made. Prompts: ${result.out}/study.md and ${result.out}/pass-*.md (give them to your agent, or run with --agent claude).`);
            if (flags.has('--plan')) print(result.outside ? `${result.out} is outside the project, so git never sees it.` : `${result.out} is git-ignored: nothing in it goes into a commit.`);
            if (failedRun(result)) print(paint(31, 'FAILED: the agent ran and nothing was changed.'));
            done(failedRun(result) ? 1 : 0);
        }
        print('');
        for (const pass of result.passes) {
            print(`  ${pass.kept ? paint(32, 'kept') : paint(31, 'thrown away')}  ${pass.name}${pass.problems ? `: ${pass.problems.join('; ')}` : ''}`);
            // Git cannot put these back or commit them: the person decides what happens to them.
            if (pass.outside) print(paint(33, `    changed outside git, ${pass.kept ? `not in the ${result.inPlace ? 'patch' : 'commit'}` : 'not put back'}: ${pass.outside.join(', ')}`));
        }
        print(`\nBefore ${JSON.stringify(result.before)}\nAfter  ${JSON.stringify(result.after)}`);
        if (result.testsChanged?.length) print(paint(33, `\nTests changed by the kept passes, read them first: ${result.testsChanged.join(', ')}`));
        for (const pass of result.passes.filter((item) => item.rejectedPatch)) print(`To apply the ${pass.name} pass anyway: npx @enmera/ai-design-check redesign apply ${pass.rejectedPatch}`);
        if (result.compare) print(`Before and after, pass by pass: ${result.compare}`);
        if (result.images) print(result.images.length ? `\nGenerated images:\n${result.images.map((item) => `  ${item.card}: ${item.for}\n    ${item.file}`).join('\n')}` : '\nNo image was generated (see the lines above).');
        if (result.inPlace) {
            print(`\nIn place, nothing committed. Changed: ${result.changed.length ? result.changed.join(', ') : 'nothing'}. Screenshots, logs and patches in ${result.out}.`);
            if (result.undo.length) print(`To undo, newest first:\n${result.undo.map((command) => `  ${command}`).join('\n')}`);
        } else print(`\nBranch ${result.branch}. Screenshots and logs in ${result.out}. To undo everything: git checkout ${result.start} && git branch -D ${result.branch}`);
        if (failedRun(result)) print(paint(31, 'FAILED: every pass was thrown away, nothing was kept.'));
        done(failedRun(result) ? 1 : 0);
    } catch (error) {
        // Stopped with Ctrl-C: 130, as a shell expects; the message says where the person is and how to go back.
        console.error(error.message);
        done(error.exitCode ?? 1);
    }
}

if (command === 'fonts') {
    const { library, fontsFor, CHARACTERS } = await import('../src/system.js');
    const lib = library();
    const character = valueOf('character');
    try {
        if (character) {
            const fonts = fontsFor(character, { source: 'any' });
            print(`${character}: ${lib.characters[character]}`);
            print(`  Pairing   UI ${fonts.ui.name}, display ${fonts.display.name}, numbers ${fonts.numeric.name}, code ${fonts.mono.name}`);
            print(`  Also      UI ${fonts.alternatives.ui.join(', ') || '-'}; display ${fonts.alternatives.display.join(', ') || '-'}`);
            if (fonts.alternatives.adobe.length) print(`  Adobe     ${fonts.alternatives.adobe.join(', ')} (Creative Cloud; web only, not for bundling in an app)`);
            done(0);
        }
        print('Characters (--character):');
        for (const name of Object.keys(CHARACTERS)) print(`  ${name.padEnd(12)} ${lib.characters[name]}`);
        print('\nFonts:');
        for (const item of lib.families) print(`  ${item.name.padEnd(22)} ${item.source.padEnd(7)} ${item.category.padEnd(6)} ${item.roles.join(', ').padEnd(24)} ${paint(2, item.characters.join(', '))}`);
        print(`\n${lib.families.filter((item) => item.source === 'google').length} Google Fonts (free to use and bundle), ${lib.families.filter((item) => item.source === 'adobe').length} Adobe Fonts (Creative Cloud, web only).`);
        done(0);
    } catch (error) {
        console.error(error.message);
        done(1);
    }
}

if (command === 'rules') {
    const { rules, areas } = loadRules();
    for (const rule of rules) {
        print(`${SEVERITY[rule.severity](rule.severity.padEnd(5))}  ${rule.id.padEnd(28)} ${areas[rule.area][lang].padEnd(20)} ${rule.title[lang]}${rule.check ? '' : paint(2, '  (review)')}`);
    }
    done(0);
}

if (command === 'init') {
    const file = join(cwd, CONFIG_FILE);
    if (existsSync(file)) {
        console.error(`${CONFIG_FILE} already exists.`);
        done(1);
    }
    const config = {
        include: ['.'],
        ignore: [],
        i18n: { files: [], keysAreSource: true },
        properNouns: [],
        componentDirs: ['**/components/ui/**'],
        rules: {},
        allow: { 'type-scale': [], 'radius-scale': [], 'glow-in-charts-only': [] },
    };
    writeOwn(file, `${JSON.stringify(config, null, 4)}\n`);
    print(`Wrote ${CONFIG_FILE}. Add exceptions under "allow" as "path/glob" or "path/glob:exact match".`);
    done(0);
}

if (command === 'inventory') {
    const result = inventory(cwd, rest.length > 0 ? { include: rest } : {});
    if (format === 'json') {
        print(JSON.stringify(result, null, 2));
        done(0);
    }
    const NAMES = { button: 'Buttons', input: 'Form fields', heading: 'Headings', badge: 'Badges', card: 'Cards and boxes' };
    for (const [kind, data] of Object.entries(result)) {
        print(`\n${paint(1, NAMES[kind])}  ${data.total} uses · ${data.distinct} different looks · ${data.raw} without a shared component`);
        for (const variant of data.variants.slice(0, flags.has('--all') ? Infinity : 8)) {
            print(`  ${String(variant.count).padStart(4)}×  ${variant.key.length > 110 ? `${variant.key.slice(0, 109)}…` : variant.key}  ${paint(2, variant.first)}`);
        }
    }
    print(`\nFewer looks is better: one input, a short heading scale, a few button and badge variants. ${paint(2, '--all lists every look')}`);
    done(0);
}

if (command === 'hook') {
    // Claude Code / Cursor / Codex post-edit hooks send JSON naming the edited file; exit 2 hands the findings back to the agent.
    let input = {};
    try {
        input = JSON.parse(readFileSync(0, 'utf8') || '{}');
    } catch {}
    const file = input.tool_input?.file_path ?? input.tool_input?.path ?? input.file_path ?? input.path;
    if (!file) done(0);
    // Both sides resolved: through a symlink (/tmp on macOS) a file in the project would look like one outside it.
    let path;
    try {
        path = relative(realpathSync(cwd), realpathSync(resolve(cwd, file))).split(sep).join('/');
    } catch {
        done(0); // the file is gone
    }
    if (path.startsWith('..')) done(0);
    if (matches(loadConfig(cwd).ignore, path)) done(0);
    const baselineCounts = existsSync(join(cwd, BASELINE)) ? readBaseline(join(cwd, BASELINE)) : {};
    const findings = applyBaseline(check(cwd, { include: [path] }), baselineCounts).filter((item) => item.rule !== 'repeated-markup' && item.severity !== 'info');
    if (findings.length === 0) done(0);
    console.error(`ai-design-check found ${findings.length} design rule issue(s) in ${path}. Fix them, or add "// ai-design-check-ignore-next-line <rule> -- <reason>" when the rule does not apply:`);
    // Repository text goes back to an agent: one bounded line, so a file cannot write it a page of instructions.
    for (const item of findings) console.error(`  ${path}:${item.line}  ${item.rule}  ${item.message.replace(/\s+/g, ' ').slice(0, 200)}`);
    console.error('Rules and how to fix them: npx @enmera/ai-design-check rules');
    done(2);
}

if (command !== 'check') {
    console.error(`Unknown command "${command}".\n\n${HELP}`);
    done(2);
}

// Run from a subfolder, the project's config, baseline and scale still apply.
function projectRoot(start) {
    for (let dir = start; ; dir = dirname(dir)) {
        if ([...CONFIG_FILES, BASELINE].some((name) => existsSync(join(dir, name)))) return dir;
        if (existsSync(join(dir, '.git')) || dirname(dir) === dir) return start;
    }
}
const root = projectRoot(cwd);
const missing = rest.filter((path) => !existsSync(resolve(cwd, path)));
if (missing.length) usageError(`Not found: ${missing.join(', ')}`);
const paths = rest.length > 0 ? rest.map((path) => relative(root, resolve(cwd, path)).split(sep).join('/') || '.') : root === cwd ? [] : [relative(root, cwd).split(sep).join('/')];
const scales = loadConfig(root).rules['spacing-scale'] === 'off' ? null : spacingScales(root);
const include = paths.length > 0 ? { include: paths } : {};
let findings = check(root, { ...include, ...(scales ? { scales } : {}) });
const seen = coverage(root, include);
const dryRun = flags.has('--dry-run');
const fixes = flags.has('--fix') ? applyFixes(root, findings, scales ?? spacingScales(root), { write: !dryRun, nearestType: flags.has('--nearest-type') }) : null;
if (fixes?.length && !dryRun) findings = check(root, { ...include, ...(scales ? { scales } : {}) });
// A run that read nothing has found nothing: a wrong path, an empty folder or an unread language is not a pass.
if (seen.read === 0 && findings.length === 0) {
    const list = Object.entries(seen.unread).map(([extension, total]) => `${total} .${extension} file${total === 1 ? '' : 's'}`).join(', ');
    const message = list ? `Nothing checked: ${list}. No rule reads these yet, so this says nothing about their design.` : `Nothing checked: no interface files under ${(include.include ?? loadConfig(root).include).join(', ')}.`;
    if (format === 'json') print(JSON.stringify({ findings: [], errors: 0, warnings: 0, notes: 0, nothingChecked: true, unread: seen.unread, message }, null, 2));
    else print(message);
    done(2);
}

const baselineFile = join(root, BASELINE);

if (flags.has('--write-baseline')) {
    writeOwn(baselineFile, `${JSON.stringify({ version: 1, note: 'Findings that existed when the baseline was written; only new ones are reported.', counts: toBaseline(findings) }, null, 2)}\n`);
    print(`Wrote ${BASELINE} with ${findings.length} existing findings. Commit it; later runs report only new findings.`);
    done(0);
}

let baselined = 0;
if (!flags.has('--no-baseline') && existsSync(baselineFile)) {
    const before = findings.length;
    const counts = readBaseline(baselineFile);
    // Fixed findings leave the baseline; otherwise their allowance would let as many new ones through unseen.
    if (fixes?.length && !dryRun) {
        const now = toBaseline(findings);
        const tightened = Object.fromEntries(Object.entries(counts).map(([key, total]) => [key, Math.min(total, now[key] ?? 0)]).filter(([, total]) => total > 0));
        writeOwn(baselineFile, `${JSON.stringify({ ...JSON.parse(readFileSync(baselineFile, 'utf8')), counts: tightened }, null, 2)}\n`);
        Object.keys(counts).forEach((key) => delete counts[key]);
        Object.assign(counts, tightened);
    }
    findings = applyBaseline(findings, counts);
    baselined = before - findings.length;
}

const count = (severity) => findings.filter((item) => item.severity === severity).length;
const { rules, areas } = loadRules();
const review = rules.filter((rule) => !rule.check).length;

if (format === 'json') {
    print(JSON.stringify({ findings, errors: count('error'), warnings: count('warn'), notes: count('info'), baselined, reviewRules: review, unread: seen.unread, ...(fixes ? { fixes } : {}), ...(scales ? { spacing: { web: scales.web, native: scales.native } } : {}) }, null, 2));
} else if (format === 'github') {
    for (const item of findings) print(annotation(item));
    if (scales) print(...scaleLines(scales));
} else {
    if (!flags.has('--quiet')) {
        // Accessibility comes first and on its own: a screen people cannot use is a different problem from one that looks generated.
        const groups = [
            [areas.accessibility[lang], findings.filter((item) => item.area === 'accessibility')],
            [lang === 'tr' ? 'Stil' : 'Style', findings.filter((item) => item.area !== 'accessibility')],
        ];
        for (const [title, items] of groups) {
            if (items.length === 0) continue;
            print(`\n${paint(1, `${title} (${items.length})`)}`);
            let current = null;
            for (const item of items) {
                if (item.path !== current) {
                    current = item.path;
                    print(`${item === items[0] ? '' : '\n'}${paint(1, item.path)}`);
                }
                print(`  ${String(item.line).padStart(5)}  ${SEVERITY[item.severity](item.severity.padEnd(5))}  ${item.message}  ${paint(2, item.rule)}`);
            }
        }
    }
    if (scales && !flags.has('--quiet')) print(`\n${paint(2, scaleLines(scales).join('\n'))}`);
    if (fixes) {
        for (const path of fixes.skipped) print(paint(33, `  ${path}: not UTF-8, left as it is. Convert it first; writing it back would destroy its letters.`));
        for (const item of fixes) print(`  ${`${item.path}:${item.line}`.padEnd(32)} ${item.from} → ${item.to}  ${paint(2, item.rule)}`);
        for (const item of fixes.notes ?? []) print(paint(33, `  ${`${item.path}:${item.line}`.padEnd(32)} ${item.note}`));
        const made = `${fixes.length} change${fixes.length === 1 ? '' : 's'}`;
        if (fixes.length > 0) print(paint(1, `\n${dryRun ? `${made} would be made (--dry-run, nothing written).` : `${made} made. Check them with git diff.`}`));
        // What --fix left alone, and why: an empty "Nothing to fix" over a full report reads as a tool that does nothing.
        const key = (path, line, value) => `${path}:${line}:${value.split(':').pop()}`;
        const fixed = new Set(fixes.map((item) => key(item.path, item.line, item.from)));
        const left = dryRun ? findings.filter((item) => !fixed.has(key(item.path, item.line, item.value))) : findings;
        if (left.length === 0) print(paint(1, fixes.length === 0 ? '\nNothing to fix.' : '\nNothing else left.'));
        else {
            const byRule = Object.entries(left.reduce((all, item) => ({ ...all, [item.rule]: (all[item.rule] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
            print(paint(1, `\n${fixes.length === 0 ? 'No mechanical fix here. ' : ''}${left.length} finding${left.length === 1 ? '' : 's'} left for a person or the ai-design-fix skill: ${byRule.map(([rule, total]) => `${rule} ${total}`).join(', ')}.`));
            print(paint(2, `--fix only moves spacing and corners (px, rem, Tailwind brackets) to the nearest step and lightens extra-bold headings. Colours, sizes, offsets, em values and words take a decision, so they stay in the report.${left.some((item) => item.rule === 'type-scale') && !flags.has('--nearest-type') ? ' Add --nearest-type to move text-[Npx] to the nearest theme size as well.' : ''}`));
        }
    }
    const list = Object.entries(seen.unread).map(([extension, total]) => `${total} .${extension} file${total === 1 ? '' : 's'}`).join(', ');
    if (list) print(paint(2, `\nNot read, no rule covers them yet: ${list}.`));
    const summary = findings.length === 0 ? paint(32, 'No findings.') : `${findings.filter((item) => item.area === 'accessibility').length} accessibility, ${findings.filter((item) => item.area !== 'accessibility').length} style: ${count('error')} errors, ${count('warn')} warnings, ${count('info')} notes.`;
    print(`\n${summary}${baselined ? ` ${baselined} known findings hidden by the baseline.` : ''} ${paint(2, `${rules.filter((rule) => rule.check && (rule.check.type !== 'render' || rule.check.native)).length} rules read the code; scan <url> reads the running page; ${review} need a look at the screen (npx @enmera/ai-design-check rules).`)}`);
}

done(count('error') > 0 || (flags.has('--strict') && count('warn') > 0) ? 1 : 0);
