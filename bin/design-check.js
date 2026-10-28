#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_FILE, check, loadRules } from '../src/check.js';

const HELP = `design-check — Enmera design rules for product interfaces

Usage
  npx @enmera/design-check [path …]         Check the project
  npx @enmera/design-check rules [--tr]      List the rules
  npx @enmera/design-check init              Write ${CONFIG_FILE} with the defaults

Options
  --json      Machine-readable findings
  --strict    Exit 1 on warnings too (default: errors only)
  --quiet     Only the summary line
  --tr        Turkish rule texts

Rules and reasons: https://github.com/enmerasoftware/design-check/blob/main/RULES.md`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const COMMANDS = ['check', 'rules', 'init', 'help'];
const positional = args.filter((arg) => !arg.startsWith('--'));
// "design-check src lang" is a check of those paths; the command word is optional.
const [command, ...rest] = COMMANDS.includes(positional[0]) ? positional : ['check', ...positional];
const lang = flags.has('--tr') ? 'tr' : 'en';
const cwd = process.cwd();
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const SEVERITY = { error: (text) => paint(31, text), warn: (text) => paint(33, text), info: (text) => paint(36, text) };

if (flags.has('--help') || flags.has('-h') || command === 'help') {
    console.log(HELP);
    process.exit(0);
}

if (command === 'rules') {
    const { rules, areas } = loadRules();
    for (const rule of rules) {
        console.log(`${SEVERITY[rule.severity](rule.severity.padEnd(5))}  ${rule.id.padEnd(24)} ${areas[rule.area][lang].padEnd(18)} ${rule.title[lang]}${rule.check ? '' : paint(2, '  (review)')}`);
    }
    process.exit(0);
}

if (command === 'init') {
    const file = join(cwd, CONFIG_FILE);
    if (existsSync(file)) {
        console.error(`${CONFIG_FILE} already exists.`);
        process.exit(1);
    }
    writeFileSync(
        file,
        `${JSON.stringify(
            {
                include: ['resources/js', 'src'],
                ignore: [],
                i18n: { files: ['lang/*.json'], keysAreSource: true },
                properNouns: [],
                rules: {},
                allow: { 'type-scale': [], 'radius-scale': [], 'glow-in-charts-only': [] },
            },
            null,
            4,
        )}\n`,
    );
    console.log(`Wrote ${CONFIG_FILE}. Add exceptions under "allow" as "path/glob" or "path/glob:exact match".`);
    process.exit(0);
}

if (command !== 'check') {
    console.error(`Unknown command "${command}".\n\n${HELP}`);
    process.exit(2);
}

const findings = check(cwd, rest.length > 0 ? { include: rest } : {});
const count = (severity) => findings.filter((item) => item.severity === severity).length;

if (flags.has('--json')) {
    console.log(JSON.stringify({ findings, errors: count('error'), warnings: count('warn') }, null, 2));
} else {
    if (!flags.has('--quiet')) {
        let current = null;
        for (const item of findings) {
            if (item.path !== current) {
                current = item.path;
                console.log(`\n${paint(1, item.path)}`);
            }
            console.log(`  ${String(item.line).padStart(5)}  ${SEVERITY[item.severity](item.severity.padEnd(5))}  ${item.message}  ${paint(2, item.rule)}`);
        }
    }
    console.log(`\n${findings.length === 0 ? paint(32, 'No findings.') : `${count('error')} errors, ${count('warn')} warnings, ${count('info')} notes.`}`);
}

process.exit(count('error') > 0 || (flags.has('--strict') && count('warn') > 0) ? 1 : 0);
