import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { detectStack, locateByMarkers, pageFiles } from './detect.js';
import { designMd, diagnose } from './diagnose.js';
import { measure, sizesInUse } from './measure.js';
import { PAGE_CONTENT_NOTE, briefMd, craftPrompt, pageContent, quoted, studyPrompt, validateBrief } from './study.js';
import { check } from '../check.js';

/**
 * redesign: measure the running page, have the person's own coding agent (Claude Code or Codex) study it, then apply the
 * numbered fixes and the agent's section ideas one pass at a time on a new git branch. After every pass the page is
 * measured again; a pass that loses content, adds contrast failures or sideways scrolling, or does not improve what it
 * was for is thrown away.
 *
 * The person's own work is never part of a pass: a tree with uncommitted changes is refused before anything starts, a
 * pass that is thrown away, stopped (Ctrl-C) or broken goes back to its snapshot, and a change the agent does not say it
 * made stops the run with the tree left as it is.
 */

export const OUT = '.ai-design-check/redesign';
const OWN = '.ai-design-check/'; // this tool's screenshots, logs and brief: git ignores them, and no pass owns them

// quotePath off: a non-ASCII file name stays a usable path. The buffer: a long list cut short would read as files gone.
const git = (cwd, ...args) => spawnSync('git', ['-c', 'core.quotePath=false', ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 30 });
const gitOk = (cwd, ...args) => {
    const result = git(cwd, ...args);
    if (result.status !== 0) throw new Error(`git ${args[0]} failed, so nothing more is touched: ${result.stderr.trim() || result.error?.message || `exit ${result.status}`}`);

    return result.stdout;
};
const lines = (text) => text.split('\n').filter(Boolean);

/**
 * Passes commit what they change, so uncommitted edits to tracked files would end up in a "Design:" commit, and the
 * printed undo would lose them. Untracked files may stay: no pass commits or removes a file that was already there.
 */
function assertClean(cwd) {
    const status = git(cwd, 'status', '--porcelain', '--untracked-files=no');
    if (status.status !== 0) throw new Error('redesign applies passes on a git branch; run it in a git repository (or use --agent none for the plan only)');
    const dirty = lines(status.stdout).map((line) => line.slice(3));
    if (dirty.length) throw new Error(`${dirty.length === 1 ? '1 tracked file has' : `${dirty.length} tracked files have`} uncommitted changes (${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ', …' : ''}): commit or stash your changes first. A pass that touched the same file would put them into its commit, and undoing the run would lose them. Nothing was changed; --plan, which only studies, runs on any tree.`);
}

/**
 * The working tree as it is now, recorded without touching it: a commit of the tracked files (`git stash create`)
 * and the list of untracked ones. Uncommitted work of the person's stays as it is; only what a pass changed since
 * the snapshot is put back or committed.
 */
function snapshot(cwd) {
    // A failed stash is not a clean tree: taking HEAD for the snapshot would make restore wipe uncommitted work.
    return {
        // A repository with no commit yet has nothing to go back to: only new files are tracked, and removed.
        commit: git(cwd, 'rev-parse', '--verify', '-q', 'HEAD').status !== 0 ? null : gitOk(cwd, 'stash', 'create').trim() || gitOk(cwd, 'rev-parse', 'HEAD').trim(),
        untracked: new Set(lines(gitOk(cwd, 'ls-files', '--others', '--exclude-standard'))),
    };
}

function changedSince(cwd, snap) {
    return {
        // --relative: from a subfolder of the repository git would otherwise name paths from its root.
        tracked: snap.commit ? lines(gitOk(cwd, 'diff', '--name-only', '--relative', snap.commit)) : [],
        added: lines(gitOk(cwd, 'ls-files', '--others', '--exclude-standard')).filter((file) => !snap.untracked.has(file)),
    };
}

function restore(cwd, snap) {
    const { tracked, added } = changedSince(cwd, snap);
    if (tracked.length) gitOk(cwd, 'restore', `--source=${snap.commit}`, '--worktree', '--', ...tracked);
    for (const file of added) rmSync(join(cwd, file), { force: true });
}

/** The changes since a snapshot as a patch, new files included: work that is put back stays there to read or apply. */
function patchOf(cwd, snap) {
    const { added } = changedSince(cwd, snap);

    return [snap.commit ? git(cwd, 'diff', '--binary', snap.commit).stdout : '', ...added.map((file) => git(cwd, 'diff', '--no-index', '--binary', '--', '/dev/null', file).stdout)].join('');
}

/** Size and time: enough to see that a file was written, without reading it. */
const stamp = (file) => {
    try {
        const stat = statSync(file);
        return `${stat.size}:${stat.mtimeMs}`;
    } catch {
        return null;
    }
};
const differ = (before, after) => [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file));

/**
 * What git cannot put back: files it ignores (a folder ignored as a whole, like node_modules, is one entry, so a change
 * deep inside it shows only when the folder's own entries change) and the untracked files that were already there.
 */
function outsideGit(cwd, untracked) {
    const files = new Map([...untracked].map((file) => [file, stamp(join(cwd, file))]));
    for (const file of lines(gitOk(cwd, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory'))) {
        if (!file.startsWith(OWN)) files.set(file, stamp(join(cwd, file)));
    }

    return files;
}

const changedStamps = (cwd, snap) => {
    const { tracked, added } = changedSince(cwd, snap);

    return new Map([...tracked, ...added].map((file) => [file, stamp(join(cwd, file))]));
};

const words = (list) => {
    const counts = new Map();
    for (const word of list) counts.set(word, (counts.get(word) ?? 0) + 1);

    return counts;
};

/** What a pass must not lose, and whether it did what it was for. */
export function verify(before, after, pass, { replacesImages = [] } = {}) {
    const problems = [];
    const lost = (key, normalise = (item) => item) => {
        const now = new Set(after.desktop.inventory[key].map(normalise));
        return [...new Set(before.desktop.inventory[key].map(normalise))].filter((item) => !now.has(item));
    };
    const slash = (href) => href.replace(/\/$/, '');
    for (const [key, label, normalise] of [['headings', 'headings'], ['links', 'links', slash], ['images', 'images'], ['fields', 'form fields']]) {
        const missing = lost(key, normalise).filter((item) => key !== 'images' || !replacesImages.includes(item)); // an image goes only if its card says so
        if (missing.length) problems.push(`Lost ${missing.length} ${label}: ${missing.slice(0, 4).join(', ')}`);
    }
    const was = words(before.desktop.inventory.words);
    const now = words(after.desktop.inventory.words);
    let kept = 0;
    let total = 0;
    for (const [word, count] of was) {
        total += count;
        kept += Math.min(count, now.get(word) ?? 0);
    }
    if (total && kept / total < 0.98) problems.push(`Kept ${Math.round((kept / total) * 1000) / 10}% of the words (needs 98%)`);
    const b = before.desktop.metrics;
    const a = after.desktop.metrics;
    const inksBefore = before.desktop.system.buttonInks ?? {};
    const newInks = Object.keys(after.desktop.system.buttonInks ?? {}).filter((ink) => !(ink in inksBefore));
    if (newInks.length) problems.push(`Text on coloured buttons changed to ${newInks.join(', ')}`);
    if (a.contrastCount > b.contrastCount) {
        const known = new Set(b.contrast.map((item) => item.text));
        const fresh = a.contrast.filter((item) => !known.has(item.text)).slice(0, 8).map((item) => `"${item.text}" ${item.ratio}:1`);
        problems.push(`Contrast failures ${b.contrastCount} → ${a.contrastCount}${fresh.length ? `: ${fresh.join(', ')}` : ''}`);
    }
    if ((after.mobile?.metrics.overflow ?? 0) > (before.mobile?.metrics.overflow ?? 0)) problems.push(`Sideways scrolling on the phone (${after.mobile.metrics.overflow} px)`);
    const sizesBefore = sizesInUse(before.desktop.system.sizes).length;
    const sizesAfter = sizesInUse(after.desktop.system.sizes).length;
    if (sizesAfter > Math.max(sizesBefore, 7)) problems.push(`Text sizes in use ${sizesBefore} → ${sizesAfter}`);

    if (b.h1 && a.h1 && a.h1.size < b.h1.size) problems.push(`The headline shrank ${b.h1.size} → ${a.h1.size} px`);
    if (b.h1 && !a.h1) problems.push('The headline is gone');
    if ((a.sameGrounds ?? 0) > (b.sameGrounds ?? 0)) problems.push(`${a.sameGrounds} pairs of boxes side by side on the same coloured ground`);
    const newLower = (a.lowerLabels ?? []).filter((label) => !(b.lowerLabels ?? []).includes(label));
    if (newLower.length) problems.push(`Labels start with a small letter: ${newLower.slice(0, 5).join(', ')}`);

    // Did the pass move what it was for?
    const radii = (page) => Object.keys(page.desktop.system.radii).length;
    const grid = (page) => {
        const entries = Object.entries(page.desktop.system.spaces);
        const all = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
        return entries.filter(([value]) => Number(value) % 4 <= 1 || Number(value) % 4 >= 3).reduce((sum, [, count]) => sum + count, 0) / all;
    };
    const body = (page) => Number(Object.entries(page.desktop.system.sizes).sort((x, y) => y[1] - x[1])[0]?.[0]);
    const moved = {
        type: sizesAfter < sizesBefore || body(after) !== body(before) || (a.h1?.size ?? 0) !== (b.h1?.size ?? 0),
        color: a.contrastCount < b.contrastCount || a.accents.length < b.accents.length,
        rhythm: grid(after) > grid(before) + 0.02 || radii(after) < radii(before) || a.edges < b.edges,
        details: a.smallTargetCount < b.smallTargetCount || a.restingShadows < b.restingShadows || a.eyebrows.length < b.eyebrows.length,
        phone: (after.mobile?.metrics.overflow ?? 0) < (before.mobile?.metrics.overflow ?? 0) || (after.mobile?.metrics.smallTargetCount ?? 0) < (before.mobile?.metrics.smallTargetCount ?? 0),
        craft: JSON.stringify(after.desktop.system) !== JSON.stringify(before.desktop.system) || JSON.stringify(after.desktop.inventory) !== JSON.stringify(before.desktop.inventory) || (a.moving ?? 0) !== (b.moving ?? 0),
    }[pass];
    if (!moved) problems.push(`The ${pass} pass changed nothing that can be measured`);

    return problems;
}

/** The brief one pass gets: the project, what stays, this pass's decisions and the limits. */
export function brief({ stack, files, diagnosis, pass, url }) {
    const styling = {
        tailwind4: 'Tailwind v4: change the @theme variables and the utility classes; prefer the theme and shared components over one-off classes',
        tailwind3: 'Tailwind v3: change tailwind.config theme values and the utility classes; prefer the config and shared components over one-off classes',
        bootstrap: 'Bootstrap: change the Sass variables and the project\'s own stylesheet; do not edit vendor files',
        sass: 'Sass: change the variables and partials the pages use',
        css: 'CSS: change the stylesheet rules and custom properties the pages use',
    }[stack.styling];
    const block = pageContent();
    // CSS can call a font anything, so the page's font names are quoted below, not written into the rules.
    const keep = diagnosis.keep.filter((item) => !item.startsWith('Fonts: '));
    const fonts = [diagnosis.font, diagnosis.headingFont && diagnosis.headingFont !== diagnosis.font ? diagnosis.headingFont : null].filter(Boolean).join('; headings: ');

    return `You are applying one pass of a design plan to this ${stack.framework} project. The plan was decided by a design tool; your job is to carry it out in the code exactly and choose nothing yourself.

Page: ${url}
Files that make this page (start here; follow their includes, components and the stylesheet ${stack.cssEntry ?? ''}):
${files.length ? files.map((file) => `- ${file}`).join('\n') : '- (not found automatically: find the templates by the page\'s headings and text)'}
Styling: ${styling}

Keep, unchanged:
- The fonts the page uses now (named in the "fonts" block below)
${keep.map((item) => `- ${item}`).join('\n')}

Pass "${pass.name}". Apply these decisions:
${pass.items.map((item) => `- ${item.id}: ${item.decision}`).join('\n')}

What the page shows now, as measured. ${PAGE_CONTENT_NOTE}
${block('fonts', fonts)}
${block('now', pass.items.map((item) => `${item.id}: ${item.evidence}`).join('\n'))}

Rules:
- Change only what these decisions name. No new colours, fonts, sizes, radii, shadows, gradients, icons, sections or effects beyond them.
- Scope: the files that draw this page and the stylesheet. Do not edit templates of other pages, admin screens, account pages or e-mails, and do not add helpers or tests.
- Never make a heading smaller or a section shorter unless a decision says so.
- Every word, link, image, icon, form field, component and section stays, in the same order. Do not rewrite copy.
- Prefer one shared change (a theme value, a variable, a shared component) over the same edit on many pages; when a shared component is used elsewhere, the change must suit those places too.
- Keep template logic exactly: Blade directives, loops, translations (__(), @lang, t()), props, routes.
- Text you cannot find in the files comes from a database or CMS: change how it is styled, never move it into a template.
- Templates and components may be shared by other pages or sites (a theme); keep every change sound for them as well.
- Do not create or change files git ignores (.env, build output, caches, node_modules): they stay out of the commit and cannot be put back.
- Do not run git, do not install packages, do not touch vendor or build output. Send no messages to anyone.
- When done, list the files you changed and one line per decision saying how it was applied.`;
}

/** A prompt again, with what was found in its result: those findings quote the page, so they are framed like it. */
const withProblems = (prompt, intro, problems) => `${prompt}\n\n${intro}\n${pageContent({ total: Math.max(0, 20000 - quoted(prompt)) })('problems', list(problems))}`;

const LOG_LIMIT = 4 * 1024 * 1024;

/**
 * A command run to its end without blocking the process, so a Ctrl-C is heard while an agent or a build works and
 * `signal` stops it. Output is kept up to a limit; with onLine, stdout is read line by line instead of kept.
 */
function run(command, args, { cwd, input = '', minutes, shell = false, signal, onLine } = {}) {
    return new Promise((done) => {
        let stdout = '';
        let stderr = '';
        let partial = '';
        let settled = false;
        // Stopped, the command gets SIGTERM; one that ignores it is not waited on for ever.
        const insist = () => setTimeout(() => child.kill('SIGKILL'), 10 * 1000).unref();
        const finish = (result) => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', insist);
            if (onLine && partial) onLine(partial);
            done({ stdout, stderr, ...result });
        };
        const child = spawn(command, args, { cwd, shell, signal, ...(minutes ? { timeout: minutes * 60 * 1000 } : {}) });
        signal?.addEventListener('abort', insist, { once: true });
        // A command that could not start never closes; a stopped one closes after its error.
        child.on('error', (error) => { if (child.pid === undefined) finish({ status: null, signal: null, error }); });
        child.on('close', (status, killedBy) => finish({ status, signal: killedBy }));
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            if (!onLine) {
                stdout = (stdout + chunk).slice(-LOG_LIMIT);
                return;
            }
            const parts = (partial + chunk).split('\n');
            partial = parts.pop();
            for (const line of parts) onLine(line);
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-LOG_LIMIT); });
        child.stdin.on('error', () => {}); // an agent that never reads its input closes the pipe early
        child.stdin.end(input);
    });
}

const WRITES = ['Edit', 'MultiEdit', 'Write', 'NotebookEdit'];

/** A path the agent named, as git names it: relative to the project, through links (/tmp is /private/tmp on a Mac). */
function inProject(cwd, file) {
    const full = resolve(cwd, file);
    let real = full;
    try {
        real = realpathSync(full);
    } catch {
        try {
            real = join(realpathSync(dirname(full)), basename(full)); // removed since
        } catch {}
    }

    return relative(realpathSync(cwd), real).split(sep).join('/');
}

// Commands that can only read, and the forms of them that stay so. Anything else may write, and then Codex's list is not whole.
const READS = /^(?:cat|head|tail|rg|grep|ls|wc|nl|pwd|echo|cut|sort|uniq|stat|file|which|tree|true|sed\s+-n\b|find\b(?!.*\s-(?:delete|exec|execdir|ok|okdir|fprint\w*|fls)\b)|git\s+(?:status|diff|log|show|ls-files|rev-parse)\b)(?:\s|$)/;

/** Whether one shell command, as Codex reports it, can only read. Quoted text and odd shapes count as writing, which is the safe side. */
export function onlyReads(command) {
    const inner = /^\S*\/?(?:ba|z)?sh\s+-l?c\s+(?:'([^']*)'|"([^"]*)")$/.exec(command.trim());
    const text = (inner ? inner[1] ?? inner[2] : command).replace(/\s\d?>\s*\/dev\/null|\s2>&1/g, '');
    if (/[>`]|\$\(|<\(|\btee\b/.test(text)) return false;

    return text.split(/&&|\|\||;|\||\n/).every((part) => READS.test(part.trim()));
}

/**
 * Reads the JSON events of codex exec: the files it changed through its edit tool, and a log a person can read. Codex
 * can also write from a shell command, and those name no file: one such command and the list is not whole, so it reports
 * nothing and nothing is compared.
 */
export function codexStream(cwd) {
    let events = 0;
    let whole = true;
    let raw = '';
    const writes = new Set();
    const said = [];

    return {
        line(text) {
            let event = null;
            try {
                event = JSON.parse(text);
            } catch {}
            if (typeof event?.type !== 'string') {
                raw = `${raw}${text}\n`.slice(-LOG_LIMIT);
                return;
            }
            events += 1;
            const item = event.type === 'item.completed' ? event.item : null;
            if (item?.type === 'agent_message' && item.text) said.push(item.text);
            if (item?.type === 'file_change') {
                for (const change of Array.isArray(item.changes) ? item.changes : []) {
                    if (typeof change?.path !== 'string') continue;
                    writes.add(inProject(cwd, change.path));
                    said.push(`> ${change.kind ?? 'change'} ${change.path}`);
                }
            }
            if (item?.type === 'command_execution') {
                said.push(`> ${item.command}`);
                if (!onlyReads(String(item.command))) whole = false;
            }
        },
        writes: () => (events && whole ? writes : null),
        log: () => (events ? said.join('\n') : raw),
    };
}

/**
 * Reads claude's stream-json as it arrives: the files the agent says it edited or wrote, and a log a person can read.
 * Output that is not such a stream (a stand-in) reports nothing, and then nothing is compared.
 */
export function agentStream(cwd) {
    let events = 0;
    let raw = '';
    const writes = new Set();
    const said = [];

    return {
        line(text) {
            let event = null;
            try {
                event = JSON.parse(text);
            } catch {}
            if (typeof event?.type !== 'string') {
                raw = `${raw}${text}\n`.slice(-LOG_LIMIT);
                return;
            }
            events += 1;
            for (const block of event.type === 'assistant' && Array.isArray(event.message?.content) ? event.message.content : []) {
                if (block?.type === 'text') said.push(block.text);
                if (block?.type !== 'tool_use') continue;
                const file = block.input?.file_path ?? block.input?.notebook_path;
                if (WRITES.includes(block.name) && typeof file === 'string') writes.add(inProject(cwd, file));
                said.push(`> ${block.name} ${file ?? block.input?.pattern ?? block.input?.command ?? ''}`.trimEnd());
            }
            if (event.type === 'result' && event.result) said.push('', String(event.result));
        },
        writes: () => (events ? writes : null),
        log: () => (events ? said.join('\n') : raw),
    };
}

/**
 * A pass, or the study, while it runs: its snapshot and what explains each change made since: the files the agent
 * says it wrote, and what the build made. `outside`: what was touched that git cannot put back.
 */
const begin = (cwd, name, prefix = null) => ({ name, prefix, snap: snapshot(cwd), explained: new Set(), reported: true, outside: new Set() });

/** Changed since the snapshot, yet neither written by the agent by its own account nor made by the build: perhaps the person's. */
function unexplained(cwd, work) {
    if (!work.reported) return [];
    const { tracked, added } = changedSince(cwd, work.snap);

    return [...tracked, ...added].filter((file) => !work.explained.has(file));
}

function leftAsIs(cwd, work, foreign) {
    const { tracked, added } = changedSince(cwd, work.snap);
    const agents = (file) => work.explained.has(file);
    const undo = [tracked.some(agents) ? `git checkout -- ${tracked.filter(agents).join(' ')}` : '', added.some(agents) ? `delete ${added.filter(agents).join(', ')}` : ''].filter(Boolean).join(', and ');
    const them = foreign.length === 1 ? ['it', 'It'] : ['them', 'They'];

    return Object.assign(new Error(`During the ${work.name}, ${foreign.join(', ')} changed and the agent did not write ${them[0]}. ${them[1]} may be yours, so nothing was put back or committed, and the run stops here.${undo ? ` To drop only the agent's changes: ${undo}.` : ''}`), { leftAsIs: true });
}

/** Back to the snapshot, only when every change is the agent's or the build's; otherwise nothing is touched. */
function putBack(cwd, work) {
    const foreign = unexplained(cwd, work);
    if (foreign.length) throw leftAsIs(cwd, work, foreign);
    restore(cwd, work.snap);
}

/** After every wait: a Ctrl-C heard meanwhile ends the run here, and the pass in progress is put back. */
const halt = (ctx) => {
    if (ctx.stop.signal.aborted) throw new Error('Stopped');
};

/**
 * One agent run inside a pass: the files it says it wrote explain those changes, and what it touched that git cannot
 * put back is noted.
 */
async function agentRun(ctx, work, prompt, options, logFile) {
    const before = outsideGit(ctx.cwd, work.snap.untracked);
    const result = await runAgent(ctx.runner, prompt, ctx.cwd, { ...options, signal: ctx.stop.signal });
    writeFileSync(logFile, result.log);
    for (const file of differ(before, outsideGit(ctx.cwd, work.snap.untracked))) work.outside.add(file);
    if (result.writes) for (const file of result.writes) work.explained.add(file);
    else work.reported = false;
    halt(ctx);

    return result;
}

/** The person's build: what it changes is its own output. */
async function buildRun(ctx, work) {
    const before = changedStamps(ctx.cwd, work.snap);
    const result = await run(ctx.build, [], { cwd: ctx.cwd, shell: true, minutes: 10, signal: ctx.stop.signal });
    for (const file of differ(before, changedStamps(ctx.cwd, work.snap))) work.explained.add(file);
    halt(ctx);

    return result;
}

/**
 * A blind look: the same screens before and after, shown as A and B in random order. The arithmetic above says nothing
 * was broken; this says whether it looks better. Asks once per pass and returns who won.
 */
async function critique(ctx, beforePrefix, afterPrefix) {
    const flip = Math.random() < 0.5;
    const [a, b] = flip ? [afterPrefix, beforePrefix] : [beforePrefix, afterPrefix];
    const shots = (prefix) => ['fold-1440', 'next-1440', 'fold-390'].map((name) => `${prefix}-${name}.png`);
    const prompt = `You are a senior product designer judging two versions of the same web page. Open these image files:
Version A: ${shots(a).join(', ')}
Version B: ${shots(b).join(', ')}

Judge only what you see, as a visitor would: hierarchy (one clear thing per screen), typography, spacing and composition, colour discipline, imagery, and whether the page feels designed and specific rather than templated. Ignore small rendering differences. A version that shrinks the headline, empties the first screen or looks more generic is worse even if it is tidier.

If you cannot tell them apart, say so. Answer with one line of JSON and nothing else: {"winner":"A"|"B"|"same","confidence":0.0-1.0,"reason":"one sentence"}`;
    const { agent, command } = ctx.runner;
    const options = { cwd: ctx.cwd, minutes: 5, signal: ctx.stop.signal };
    const judged = agent === 'codex'
        ? await run(command, ['exec', '--skip-git-repo-check', '-s', 'read-only', prompt, ...[...shots(a), ...shots(b)].flatMap((file) => ['-i', file])], options)
        : await run(command, ['-p', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', '--add-dir', ctx.cwd], { ...options, input: prompt });
    halt(ctx);
    let verdict = null;
    try {
        verdict = JSON.parse(/\{[^{}]*"winner"[^{}]*\}/.exec(judged.stdout)?.[0] ?? 'null');
    } catch {}
    if (!verdict) return { ok: true, reason: 'No verdict from the visual comparison' };
    if (verdict.winner === 'same') return { ok: true, reason: `Looks the same: ${verdict.reason}` };
    const afterWon = (verdict.winner === 'A') === flip;

    // Small passes look nearly the same, so a narrow win counts; only a page that clearly looks better before is thrown away.
    return { ok: afterWon || verdict.confidence < 0.6, afterWon, confidence: verdict.confidence, reason: verdict.reason };
}

const CODEX_IN_CHATGPT = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';

/** The command behind an agent's name; a missing one is said up front, before any measuring. */
export function agentCommand(agent, env = process.env) {
    if (!['claude', 'codex'].includes(agent)) throw new Error(`Unknown agent: ${agent} (claude, codex or none)`);
    const works = (command) => !spawnSync(command, ['--version'], { env, encoding: 'utf8', timeout: 30 * 1000 }).error;
    if (works(agent)) return agent;
    if (agent === 'codex' && existsSync(CODEX_IN_CHATGPT)) return CODEX_IN_CHATGPT;
    throw new Error(`${agent} was not found. Install it, choose the other one with --agent, or use --agent none for the plan only.`);
}

async function runAgent({ agent, command }, prompt, cwd, { minutes = 20, edits = true, signal } = {}) {
    if (agent === 'codex') {
        const stream = codexStream(cwd);
        const result = await run(command, ['exec', '--json', '--skip-git-repo-check', '-s', 'workspace-write', prompt], { cwd, minutes, signal, onLine: stream.line });

        return { ...result, writes: stream.writes(), log: `${stream.log()}\n${result.stderr}` };
    }
    // stream-json names every file the agent edits or writes, so the run can tell its changes from anyone else's.
    const stream = agentStream(cwd);
    const result = await run(command, ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', ...(edits ? ['Edit'] : []), 'Write', 'Glob', 'Grep', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(grep:*)', 'Bash(find:*)'], { cwd, input: prompt, minutes, signal, onLine: stream.line });

    return { ...result, writes: stream.writes(), log: `${stream.log()}\n${result.stderr}` };
}

/** The agent's study: written, read back and checked against the page; what the check finds gets one more try. */
async function study(ctx, out, context) {
    const file = join(out, 'brief.json');
    const read = () => {
        try {
            return JSON.parse(readFileSync(file, 'utf8').replace(/^```(?:json)?\s*|\s*```\s*$/g, ''));
        } catch {
            return null;
        }
    };
    rmSync(file, { force: true });
    const work = (ctx.current = begin(ctx.cwd, 'study'));
    const prompt = studyPrompt({ ...context, out });
    writeFileSync(join(out, 'study.md'), prompt);
    ctx.log('Studying the page, its code and its subject …');
    await agentRun(ctx, work, prompt, { minutes: 15, edits: false }, join(out, 'study.log'));
    let brief = read();
    let problems = brief ? validateBrief(brief, context.page) : ['No readable brief.json was written'];
    if (problems.length) {
        ctx.log(`  checked: ${problems.join('; ')}; one more try`);
        await agentRun(ctx, work, withProblems(prompt, 'Your last brief had the problems below; they quote the page and your brief. Write the whole file again with them fixed.', problems), { minutes: 15, edits: false }, join(out, 'study.retry.log'));
        brief = read();
        problems = brief ? validateBrief(brief, context.page) : ['No readable brief.json was written'];
    }
    putBack(ctx.cwd, work); // the study reads; anything it changed goes back
    ctx.current = null;

    return { brief, problems };
}

const list = (items) => items.map((item) => `- ${item}`).join('\n');
const errorsBy = (findings) => {
    const counts = {};
    for (const item of findings) if (item.severity === 'error') counts[item.path] = (counts[item.path] ?? 0) + 1;

    return counts;
};

const summary = (page) => {
    const m = page.desktop.metrics;
    const p = page.mobile?.metrics;

    return {
        sizes: sizesInUse(page.desktop.system.sizes).length,
        contrast: m.contrastCount,
        accents: m.accents.length,
        radii: Object.keys(page.desktop.system.radii).length,
        edges: m.edges,
        heroPhoto: m.heroPhoto,
        smallTargets: m.smallTargetCount,
        phoneOverflow: p?.overflow ?? 0,
        phoneSmallTargets: p?.smallTargetCount ?? 0,
        moving: m.moving ?? 0,
        sameGrounds: m.sameGrounds ?? 0,
    };
};

/**
 * Where a stopped or broken run leaves the person: the pass in progress goes back to its snapshot (unless a change in
 * it may be theirs), kept passes stay committed on the branch, and the way back is said.
 */
function stopped(ctx, error) {
    const notes = [];
    const work = ctx.current;
    ctx.current = null;
    if (work && !error.leftAsIs) {
        try {
            const patch = work.prefix ? patchOf(ctx.cwd, work.snap) : '';
            if (patch) writeFileSync(`${work.prefix}.stopped.patch`, patch);
            putBack(ctx.cwd, work);
            notes.push(`The ${work.name} in progress was put back${patch ? `; its changes are in ${relative(ctx.cwd, work.prefix)}.stopped.patch` : ''}.`);
        } catch (left) {
            notes.push(left.message);
        }
    }
    if (work?.outside.size) notes.push(`Not put back, git does not keep them: ${[...work.outside].join(', ')}.`);
    if (ctx.branch) {
        const kept = ctx.kept.length ? `Kept so far, committed on ${ctx.branch}: ${ctx.kept.join(', ')}.` : `Nothing was kept on ${ctx.branch}.`;
        notes.push(`${kept} You are on ${ctx.branch}. To go back${error.leftAsIs ? ', once those files are sorted out' : ''}: git checkout ${ctx.start}${ctx.kept.length ? '' : ` && git branch -D ${ctx.branch}`}`);
    } else if (work || ctx.stop.signal.aborted) notes.push('No branch was made and nothing was committed.');
    if (!ctx.stop.signal.aborted) return Object.assign(error, { message: [error.message, ...notes].join('\n') });

    return Object.assign(new Error([`Stopped (${ctx.heard === 'SIGINT' ? 'Ctrl-C' : ctx.heard}).`, ...notes].join('\n')), { exitCode: ctx.heard === 'SIGINT' ? 130 : 143 });
}

/**
 * @param {{cwd: string, url: string, path?: string, agent?: 'claude'|'codex'|'none', build?: string, only?: string[], kind?: string, plan?: boolean, briefFile?: string, allowRedirect?: boolean, auth?: object, log?: (line: string) => void}} options
 *   plan: stop after the study, so a person can read and edit the cards. briefFile: build a brief someone already has.
 *   path: the page's route, to find its files (default: the path of the page measured). auth: cookies and headers for a
 *   page behind a sign-in (see signIn in story.js). allowRedirect: measure the page a redirect lands on, even a sign-in page.
 */
export async function redesign({ cwd, url, path, agent = 'claude', build, only, kind = 'marketing', plan = false, briefFile, allowRedirect = false, auth = {}, log = () => {} }) {
    const runner = agent === 'none' ? null : { agent, command: agentCommand(agent) };
    // Before anything is written: a pass must never commit or undo the person's own edits.
    if (runner && !plan) assertClean(cwd);
    const ctx = { cwd, log, build, runner, stop: new AbortController(), heard: null, current: null, branch: null, start: null, kept: [] };
    const hear = (name) => () => {
        if (ctx.heard) return log('Still putting things back; one moment.');
        ctx.heard = name;
        log(`\n${name === 'SIGINT' ? 'Ctrl-C' : name}: stopping …`);
        ctx.stop.abort();
    };
    const handlers = { SIGINT: hear('SIGINT'), SIGTERM: hear('SIGTERM') };
    for (const [name, handler] of Object.entries(handlers)) process.on(name, handler);
    try {
        if (runner) log('Leave the files in this folder alone until the run ends: a file saved here while a pass runs may be taken for its work.');
        const measured = (screenshots, onLanded) => measure(url, { screenshots, signal: ctx.stop.signal, auth, allowRedirect, onLanded });
        const out = join(cwd, OUT);
        mkdirSync(out, { recursive: true });
        const ignore = join(cwd, '.ai-design-check', '.gitignore');
        if (!existsSync(ignore)) writeFileSync(ignore, '*\n');
        const stack = detectStack(cwd);
        log(`Measuring ${url} …`);
        let landed = null;
        const before = await measured(join(out, 'before'), (at) => {
            landed = at;
            log(`${url} redirected: measuring ${at}`);
        });
        halt(ctx);
        // After a redirect the page measured is the one the agents are told about.
        const pageUrl = landed ?? url;
        let files = pageFiles(cwd, stack, path ?? (/^https?:\/\//.test(pageUrl) ? new URL(pageUrl).pathname : '/'));
        if (!files.length) files = locateByMarkers(cwd, before.desktop.inventory.markers);
        log(`${stack.framework}${stack.templates.length ? ` (${stack.templates.join(', ')})` : ''}, ${stack.styling}; page files: ${files.length ? files.join(', ') : 'none found, the agent will search'}`);
        const diagnosis = diagnose(before, { kind });
        writeFileSync(join(out, 'DESIGN.md'), designMd(before, diagnosis));
        writeFileSync(join(out, 'plan.json'), `${JSON.stringify({ url, ...(landed ? { measured: landed } : {}), stack, files, diagnosis }, null, 2)}\n`);
        const passes = diagnosis.passes.filter((pass) => !only || only.includes(pass.name));
        passes.forEach((pass, index) => writeFileSync(join(out, `pass-${index + 1}-${pass.name}.md`), brief({ stack, files, diagnosis, pass, url: pageUrl })));
        const result = { stack, files, diagnosis, before: summary(before), passes: [], out: relative(cwd, out), ...(landed ? { measured: landed } : {}) };
        const screenshots = ['fold-1440', 'next-1440', 'fold-390'].map((name) => join(out, `before-${name}.png`)).filter(existsSync);
        const context = { stack, files, page: before, diagnosis, screenshots, url: pageUrl };
        if (!runner) {
            writeFileSync(join(out, 'study.md'), studyPrompt({ ...context, out: relative(cwd, out) }));
            return result;
        }

        // The part that takes judgement comes first, so a person can stop here and read it.
        let cards = null;
        if (!only || only.includes('craft')) {
            const given = briefFile ? JSON.parse(readFileSync(briefFile, 'utf8')) : null;
            const studied = given ? { brief: given, problems: validateBrief(given, before) } : await study(ctx, out, context);
            if (studied.problems.length) {
                log(`  no section ideas: ${studied.problems.join('; ')}`);
                result.studyProblems = studied.problems;
            } else {
                result.study = studied.brief;
                writeFileSync(join(out, 'brief.json'), `${JSON.stringify(studied.brief, null, 2)}\n`);
                writeFileSync(join(out, 'BRIEF.md'), briefMd(studied.brief, before.desktop.title));
                if (!studied.brief.leaveAlone) cards = studied.brief;
            }
        }
        if (plan) return result;
        if (cards) {
            passes.push({ name: 'craft', items: cards.sections.map((section) => ({ id: section.heading, decision: section.idea, evidence: section.problem })) });
            writeFileSync(join(out, `pass-${passes.length}-craft.md`), craftPrompt({ stack, files, brief: cards, url: pageUrl, out: relative(cwd, out) }));
        }
        if (passes.length === 0) return result;

        if (!stack.git) throw new Error('redesign applies passes on a git branch; run it in a git repository (or use --agent none for the plan only)');
        assertClean(cwd); // again: the study took a while
        const untracked = lines(git(cwd, 'ls-files', '--others', '--exclude-standard').stdout);
        if (untracked.length) log(`${untracked.length} untracked file${untracked.length === 1 ? '' : 's'} stay as they are, out of the commits: ${untracked.slice(0, 5).join(', ')}${untracked.length > 5 ? ', …' : ''}`);
        const branch = `redesign/${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
        // On a detached HEAD the way back is the commit, not "HEAD".
        const start = git(cwd, 'symbolic-ref', '--short', '-q', 'HEAD').stdout.trim() || git(cwd, 'rev-parse', '--short', 'HEAD').stdout.trim();
        if (git(cwd, 'checkout', '-b', branch).status !== 0) throw new Error(`Could not create branch ${branch}`);
        Object.assign(ctx, { branch, start });
        log(`Working on branch ${branch} (from ${start})`);

        let baseline = before;
        let baselinePrefix = join(out, 'before');
        const errors = errorsBy(check(cwd));
        for (const [index, pass] of passes.entries()) {
            log(`Pass ${index + 1}/${passes.length}: ${pass.name} (${pass.items.length} decisions) …`);
            const prefix = join(out, `pass-${index + 1}-${pass.name}`);
            const work = (ctx.current = begin(cwd, `${pass.name} pass`, prefix));
            const prompt = readFileSync(`${prefix}.md`, 'utf8');
            const options = pass.name === 'craft' ? { minutes: 45 } : {};
            const allowed = pass.name === 'craft' ? { replacesImages: cards.sections.flatMap((section) => section.replacesImages ?? []) } : {};
            // Thrown away from the branch, not from the disk: hours of an agent's work stay available to read or apply.
            const reject = async (problems, { rebuild = false } = {}) => {
                const patch = patchOf(cwd, work.snap);
                if (patch) writeFileSync(`${prefix}.rejected.patch`, patch);
                putBack(cwd, work);
                if (rebuild && build) {
                    await buildRun(ctx, work);
                    putBack(cwd, work); // build output that is tracked goes back to exactly what it was
                }
                ctx.current = null;
                log(`  thrown away: ${problems.join('; ')}`);
                if (work.outside.size) log(`  not put back, git does not keep them: ${[...work.outside].join(', ')}`);
                result.passes.push({ name: pass.name, kept: false, problems, ...(work.outside.size ? { outside: [...work.outside] } : {}) });
            };
            const ran = await agentRun(ctx, work, prompt, options, `${prefix}.log`);
            if (ran.status !== 0) {
                await reject([`The agent stopped with an error (see pass-${index + 1}-${pass.name}.log)`]);
                continue;
            }
            if (build) {
                const built = await buildRun(ctx, work);
                if (built.status !== 0) {
                    await reject([`The build failed: ${(built.stderr || built.stdout).slice(-300)}`]);
                    continue;
                }
            }
            let after = await measure(url, { screenshots: prefix, signal: ctx.stop.signal, auth, allowRedirect });
            halt(ctx);
            // What the pass wrote also goes through the checker: new errors in a file count against it.
            const newErrors = () => {
                const { tracked, added } = changedSince(cwd, work.snap);
                const changed = [...tracked, ...added].filter((file) => !file.startsWith(OWN));
                const now = errorsBy(changed.length ? check(cwd, { include: changed }) : []);

                return Object.entries(now).filter(([file, count]) => count > (errors[file] ?? 0)).map(([file, count]) => `${count - (errors[file] ?? 0)} new rule errors in ${file}`);
            };
            let problems = [...verify(baseline, after, pass.name, allowed), ...newErrors()];
            // What the arithmetic found can be fixed: one more try, with the measured problems and nothing else.
            if (problems.length) {
                log(`  measured: ${problems.join('; ')}; one more try`);
                await agentRun(ctx, work, withProblems(prompt, 'This pass is already applied in the working tree; keep that work. Measuring the page found the problems below; they quote the page. Fix only these.', problems), options, `${prefix}.fix.log`);
                if (build) await buildRun(ctx, work);
                after = await measure(url, { screenshots: prefix, signal: ctx.stop.signal, auth, allowRedirect });
                halt(ctx);
                problems = [...verify(baseline, after, pass.name, allowed), ...newErrors()];
            }
            if (!problems.length) {
                const verdict = await critique(ctx, baselinePrefix, prefix);
                log(`  looked at it: ${verdict.afterWon === undefined ? verdict.reason : `${verdict.afterWon ? 'after' : 'before'} wins (${verdict.confidence}): ${verdict.reason}`}`);
                if (!verdict.ok) problems.push(`Looks worse: ${verdict.reason}`);
            }
            if (problems.length) {
                await reject(problems, { rebuild: true });
                continue;
            }
            // A change the agent does not say it made may be the person's: it is not committed, and nothing is undone.
            const foreign = unexplained(cwd, work);
            if (foreign.length) throw leftAsIs(cwd, work, foreign);
            const { tracked, added } = changedSince(cwd, work.snap);
            const changed = [...tracked, ...added];
            if (!changed.length) {
                await reject(['No file changed, so there is nothing to keep']);
                continue;
            }
            // A commit that fails (a hook, no identity) must not be reported as a kept pass.
            try {
                gitOk(cwd, 'add', '--', ...changed);
                gitOk(cwd, 'commit', '-q', '-m', `Design: ${pass.name} (${pass.items.map((item) => item.id).join(', ')})`, '--', ...changed);
            } catch (error) {
                git(cwd, 'reset', '-q', '--', ...changed); // nothing left staged when the pass is put back
                throw error;
            }
            ctx.current = null;
            ctx.kept.push(pass.name);
            Object.assign(errors, errorsBy(check(cwd, { include: changed })));
            log(`  kept: ${JSON.stringify(summary(baseline))} → ${JSON.stringify(summary(after))}`);
            if (work.outside.size) log(`  also changed, outside git and not in the commit: ${[...work.outside].join(', ')}`);
            result.passes.push({ name: pass.name, kept: true, after: summary(after), ...(work.outside.size ? { outside: [...work.outside] } : {}) });
            baseline = after;
            baselinePrefix = prefix;
        }
        result.after = summary(baseline);
        result.branch = branch;
        result.start = start;
        writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

        return result;
    } catch (error) {
        throw stopped(ctx, error);
    } finally {
        for (const [name, handler] of Object.entries(handlers)) process.off(name, handler);
    }
}
