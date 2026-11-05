import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Has a command-line agent write the benchmark's pages from the same prompts as the rest of the set.
 *
 *   node bench/generate.js <folder> <codex|gemini> <model> [--command path]
 *
 * Each page is written by a fresh run in an empty folder, with the user's own instructions and plugins left out where
 * the agent allows it, into <folder>/<model>/<brief>-<framework>.html. Pages already there are kept, so it can resume.
 */

const [folder, agent, model] = process.argv.slice(2);
if (!folder || !['codex', 'gemini'].includes(agent) || !model) {
    console.error('Usage: node bench/generate.js <folder> <codex|gemini> <model> [--command path]');
    process.exit(2);
}
const at = process.argv.indexOf('--command');
const command = at > 0 ? process.argv[at + 1] : agent;

const index = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'pages', 'index.json'), 'utf8'));
const jobs = [...new Map(index.map((page) => [`${page.brief}-${page.framework}`, page.prompt])).entries()];
const out = join(resolve(folder), model);
mkdirSync(out, { recursive: true });

const ARGS = {
    codex: (prompt) => ['exec', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules', '-s', 'workspace-write', '-m', model, '-c', 'model_reasoning_effort="medium"', prompt],
    gemini: (prompt) => ['--model', model, '--approval-mode', 'auto_edit', '--prompt', prompt],
};

const write = (prompt, cwd) => new Promise((done) => {
    const child = execFile(command, ARGS[agent](`${prompt}\n\nWrite the finished page to page.html in the current folder and do nothing else.`), { cwd, timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => done({ error, stderr }));
    child.stdin.end(); // codex exec reads stdin until it closes
});

// Two at a time: the work happens at the provider, and each run here is one small process.
let next = 0;
const worker = async () => {
    while (next < jobs.length) {
        const [name, prompt] = jobs[next++];
        const target = join(out, `${name}.html`);
        if (existsSync(target) && statSync(target).size > 0) continue;
        for (let attempt = 1; attempt <= 2; attempt++) {
            const cwd = mkdtempSync(join(tmpdir(), 'bench-page-'));
            const { error, stderr } = await write(prompt, cwd);
            const page = join(cwd, 'page.html');
            if (existsSync(page) && statSync(page).size > 0) {
                renameSync(page, target);
                console.log(`${model}/${name}: ${statSync(target).size} bytes`);
                rmSync(cwd, { recursive: true, force: true });
                break;
            }
            rmSync(cwd, { recursive: true, force: true });
            console.log(`${model}/${name}: no page on attempt ${attempt}${error ? ` (${String(stderr || error.message).trim().split('\n').pop().slice(0, 160)})` : ''}`);
        }
    }
};
await Promise.all([worker(), worker()]);
