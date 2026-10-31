#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { CONFIG_FILE, applyBaseline, check, loadRules, toBaseline } from '../src/check.js';
import { inventory } from '../src/inventory.js';

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

Options
  --format text|json|github   Output (github: annotations on pull requests)
  --json                      Same as --format json
  --strict                    Exit 1 on warnings too (default: errors only)
  --quiet                     Only the summary line
  --write-baseline            Record current findings in ${BASELINE}; later runs report only new ones
  --no-baseline               Ignore the baseline file
  --tr                        Turkish rule texts

Inline ignore (a reason is required):
  // ai-design-check-ignore-next-line rule-id -- why
  // ai-design-check-ignore-file rule-id -- why

Rules and reasons: https://github.com/enmerasoftware/ai-design-check/blob/main/RULES.md`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--') && !arg.includes('=')));
const valueOf = (name) => {
    const inline = args.find((arg) => arg.startsWith(`--${name}=`));
    if (inline) return inline.split('=')[1];
    const index = args.indexOf(`--${name}`);

    return index >= 0 ? args[index + 1] : undefined;
};
const COMMANDS = ['check', 'rules', 'init', 'help', 'inventory', 'hook', 'story'];
const positional = args.filter((arg, index) => !arg.startsWith('--') && !['--format', '--out', '--still', '--title', '--music'].includes(args[index - 1]));
// "ai-design-check src lang" is a check of those paths; the command word is optional.
const [command, ...named] = COMMANDS.includes(positional[0]) ? positional : ['check', ...positional];
// "./src/a.tsx" and absolute paths name the same file as "src/a.tsx"; the walker and the globs expect the last form.
const rest = named.map((path) => relative(process.cwd(), resolve(path)).split(sep).join('/') || '.');
const format = flags.has('--json') ? 'json' : (valueOf('format') ?? 'text');
const lang = flags.has('--tr') ? 'tr' : 'en';
const cwd = process.cwd();
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const SEVERITY = { error: (text) => paint(31, text), warn: (text) => paint(33, text), info: (text) => paint(36, text) };
// Output is collected and written once; exiting only after the write flushes keeps large piped output (--json) whole.
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
        include: ['resources/js', 'src'],
        ignore: [],
        i18n: { files: ['lang/*.json'], keysAreSource: true },
        properNouns: [],
        componentDirs: ['**/components/ui/**'],
        rules: {},
        allow: { 'type-scale': [], 'radius-scale': [], 'glow-in-charts-only': [] },
    };
    writeFileSync(file, `${JSON.stringify(config, null, 4)}\n`);
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
    const path = relative(cwd, file).split(sep).join('/');
    if (path.startsWith('..')) done(0);
    const findings = check(cwd, { include: [path] }).filter((item) => item.rule !== 'repeated-markup' && item.severity !== 'info');
    if (findings.length === 0) done(0);
    console.error(`ai-design-check found ${findings.length} design rule issue(s) in ${path}. Fix them, or add "// ai-design-check-ignore-next-line <rule> -- <reason>" when the rule does not apply:`);
    for (const item of findings) console.error(`  ${path}:${item.line}  ${item.rule}  ${item.message}`);
    console.error('Rules and how to fix them: npx @enmera/ai-design-check rules');
    done(2);
}

if (command !== 'check') {
    console.error(`Unknown command "${command}".\n\n${HELP}`);
    done(2);
}

let findings = check(cwd, rest.length > 0 ? { include: rest } : {});
const baselineFile = join(cwd, BASELINE);

if (flags.has('--write-baseline')) {
    writeFileSync(baselineFile, `${JSON.stringify({ version: 1, note: 'Findings that existed when the baseline was written; only new ones are reported.', counts: toBaseline(findings) }, null, 2)}\n`);
    print(`Wrote ${BASELINE} with ${findings.length} existing findings. Commit it; later runs report only new findings.`);
    done(0);
}

let baselined = 0;
if (!flags.has('--no-baseline') && existsSync(baselineFile)) {
    const before = findings.length;
    findings = applyBaseline(findings, JSON.parse(readFileSync(baselineFile, 'utf8')).counts ?? {});
    baselined = before - findings.length;
}

const count = (severity) => findings.filter((item) => item.severity === severity).length;
const { rules } = loadRules();
const review = rules.filter((rule) => !rule.check).length;

if (format === 'json') {
    print(JSON.stringify({ findings, errors: count('error'), warnings: count('warn'), notes: count('info'), baselined, reviewRules: review }, null, 2));
} else if (format === 'github') {
    const LEVEL = { error: 'error', warn: 'warning', info: 'notice' };
    for (const item of findings) print(`::${LEVEL[item.severity]} file=${item.path},line=${item.line},title=${item.rule}::${item.message.replace(/\n/g, ' ')}`);
} else {
    if (!flags.has('--quiet')) {
        let current = null;
        for (const item of findings) {
            if (item.path !== current) {
                current = item.path;
                print(`\n${paint(1, item.path)}`);
            }
            print(`  ${String(item.line).padStart(5)}  ${SEVERITY[item.severity](item.severity.padEnd(5))}  ${item.message}  ${paint(2, item.rule)}`);
        }
    }
    const summary = findings.length === 0 ? paint(32, 'No findings.') : `${count('error')} errors, ${count('warn')} warnings, ${count('info')} notes.`;
    print(`\n${summary}${baselined ? ` ${baselined} known findings hidden by the baseline.` : ''} ${paint(2, `${rules.length - review} rules checked automatically; ${review} need a look at the screen (npx @enmera/ai-design-check rules).`)}`);
}

done(count('error') > 0 || (flags.has('--strict') && count('warn') > 0) ? 1 : 0);
