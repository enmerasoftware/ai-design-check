import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { detectStack, locateByMarkers, pageFiles } from './detect.js';
import { designMd, diagnose } from './diagnose.js';
import { measure, sizesInUse } from './measure.js';
import { briefMd, craftPrompt, studyPrompt, validateBrief } from './study.js';
import { check } from '../check.js';

/**
 * redesign: measure the running page, have the person's own coding agent (Claude Code or Codex) study it, then apply the
 * numbered fixes and the agent's section ideas one pass at a time on a new git branch. After every pass the page is
 * measured again; a pass that loses content, adds contrast failures or sideways scrolling, or does not improve what it
 * was for is thrown away.
 */

export const OUT = '.ai-design-check/redesign';

// quotePath off: a non-ASCII file name stays a usable path. The buffer: a long list cut short would read as files gone.
const git = (cwd, ...args) => spawnSync('git', ['-c', 'core.quotePath=false', ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 30 });
const gitOk = (cwd, ...args) => {
    const result = git(cwd, ...args);
    if (result.status !== 0) throw new Error(`git ${args[0]} failed, so nothing more is touched: ${result.stderr.trim() || result.error?.message || `exit ${result.status}`}`);

    return result.stdout;
};
const lines = (text) => text.split('\n').filter(Boolean);

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

    return `You are applying one pass of a design plan to this ${stack.framework} project. The plan was decided by a design tool; your job is to carry it out in the code exactly and choose nothing yourself.

Page: ${url}
Files that make this page (start here; follow their includes, components and the stylesheet ${stack.cssEntry ?? ''}):
${files.length ? files.map((file) => `- ${file}`).join('\n') : '- (not found automatically: find the templates by the page\'s headings and text)'}
Styling: ${styling}

Keep, unchanged:
${diagnosis.keep.map((item) => `- ${item}`).join('\n')}

Pass "${pass.name}". Apply these decisions:
${pass.items.map((item) => `- ${item.decision}\n  (now: ${item.evidence})`).join('\n')}

Rules:
- Change only what these decisions name. No new colours, fonts, sizes, radii, shadows, gradients, icons, sections or effects beyond them.
- Scope: the files that draw this page and the stylesheet. Do not edit templates of other pages, admin screens, account pages or e-mails, and do not add helpers or tests.
- Never make a heading smaller or a section shorter unless a decision says so.
- Every word, link, image, icon, form field, component and section stays, in the same order. Do not rewrite copy.
- Prefer one shared change (a theme value, a variable, a shared component) over the same edit on many pages; when a shared component is used elsewhere, the change must suit those places too.
- Keep template logic exactly: Blade directives, loops, translations (__(), @lang, t()), props, routes.
- Text you cannot find in the files comes from a database or CMS: change how it is styled, never move it into a template.
- Templates and components may be shared by other pages or sites (a theme); keep every change sound for them as well.
- Do not run git, do not install packages, do not touch vendor or build output. Send no messages to anyone.
- When done, list the files you changed and one line per decision saying how it was applied.`;
}

/**
 * A blind look: the same screens before and after, shown as A and B in random order. The arithmetic above says nothing
 * was broken; this says whether it looks better. Asks once per pass and returns who won.
 */
function critique(agent, cwd, beforePrefix, afterPrefix, passName) {
    const flip = Math.random() < 0.5;
    const [a, b] = flip ? [afterPrefix, beforePrefix] : [beforePrefix, afterPrefix];
    const shots = (prefix) => ['fold-1440', 'next-1440', 'fold-390'].map((name) => `${prefix}-${name}.png`);
    const prompt = `You are a senior product designer judging two versions of the same web page. Open these image files:
Version A: ${shots(a).join(', ')}
Version B: ${shots(b).join(', ')}

Judge only what you see, as a visitor would: hierarchy (one clear thing per screen), typography, spacing and composition, colour discipline, imagery, and whether the page feels designed and specific rather than templated. Ignore small rendering differences. A version that shrinks the headline, empties the first screen or looks more generic is worse even if it is tidier.

If you cannot tell them apart, say so. Answer with one line of JSON and nothing else: {"winner":"A"|"B"|"same","confidence":0.0-1.0,"reason":"one sentence"}`;
    const run = agent === 'codex'
        ? spawnSync(agentCommand(agent), ['exec', '--skip-git-repo-check', '-s', 'read-only', prompt, ...[...shots(a), ...shots(b)].flatMap((file) => ['-i', file])], { cwd, input: '', encoding: 'utf8', timeout: 5 * 60 * 1000 })
        : spawnSync(agentCommand(agent), ['-p', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', '--add-dir', cwd], { cwd, input: prompt, encoding: 'utf8', timeout: 5 * 60 * 1000 });
    const match = /\{[^{}]*"winner"[^{}]*\}/.exec(run.stdout ?? '');
    if (!match) return { ok: true, reason: 'No verdict from the visual comparison', pass: passName };
    const verdict = JSON.parse(match[0]);
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

function runAgent(agent, prompt, cwd, { minutes = 20, edits = true } = {}) {
    const options = { cwd, input: agent === 'codex' ? '' : prompt, encoding: 'utf8', timeout: minutes * 60 * 1000, maxBuffer: 32 * 1024 * 1024 };
    if (agent === 'claude') return spawnSync(agentCommand(agent), ['-p', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', ...(edits ? ['Edit'] : []), 'Write', 'Glob', 'Grep', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(grep:*)', 'Bash(find:*)'], options);

    return spawnSync(agentCommand(agent), ['exec', '--skip-git-repo-check', '-s', 'workspace-write', prompt], options);
}

/** The agent's study: written, read back and checked against the page; what the check finds gets one more try. */
function study(agent, cwd, out, context, log) {
    const file = join(out, 'brief.json');
    const read = () => {
        try {
            return JSON.parse(readFileSync(file, 'utf8').replace(/^```(?:json)?\s*|\s*```\s*$/g, ''));
        } catch {
            return null;
        }
    };
    rmSync(file, { force: true });
    const snap = snapshot(cwd);
    const prompt = studyPrompt({ ...context, out });
    writeFileSync(join(out, 'study.md'), prompt);
    log('Studying the page, its code and its subject …');
    let run = runAgent(agent, prompt, cwd, { minutes: 15, edits: false });
    writeFileSync(join(out, 'study.log'), `${run.stdout ?? ''}\n${run.stderr ?? ''}`);
    let brief = read();
    let problems = brief ? validateBrief(brief, context.page) : ['No readable brief.json was written'];
    if (problems.length) {
        log(`  checked: ${problems.join('; ')}; one more try`);
        run = runAgent(agent, `${prompt}\n\nYour last brief had these problems. Write the whole file again with them fixed:\n${list(problems)}`, cwd, { minutes: 15, edits: false });
        brief = read();
        problems = brief ? validateBrief(brief, context.page) : ['No readable brief.json was written'];
    }
    restore(cwd, snap); // the study reads; anything it changed goes back

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
 * @param {{cwd: string, url: string, path?: string, agent?: 'claude'|'codex'|'none', build?: string, only?: string[], kind?: string, plan?: boolean, briefFile?: string, log?: (line: string) => void}} options
 *   plan: stop after the study, so a person can read and edit the cards. briefFile: build a brief someone already has.
 */
export async function redesign({ cwd, url, path = '/', agent = 'claude', build, only, kind = 'marketing', plan = false, briefFile, log = () => {} }) {
    if (agent !== 'none') agentCommand(agent);
    const out = join(cwd, OUT);
    mkdirSync(out, { recursive: true });
    const ignore = join(cwd, '.ai-design-check', '.gitignore');
    if (!existsSync(ignore)) writeFileSync(ignore, '*\n');
    const stack = detectStack(cwd);
    log(`Measuring ${url} …`);
    const before = await measure(url, { screenshots: join(out, 'before') });
    let files = pageFiles(cwd, stack, path);
    if (!files.length) files = locateByMarkers(cwd, before.desktop.inventory.markers);
    log(`${stack.framework}${stack.templates.length ? ` (${stack.templates.join(', ')})` : ''}, ${stack.styling}; page files: ${files.length ? files.join(', ') : 'none found, the agent will search'}`);
    const diagnosis = diagnose(before, { kind });
    writeFileSync(join(out, 'DESIGN.md'), designMd(before, diagnosis));
    writeFileSync(join(out, 'plan.json'), `${JSON.stringify({ url, stack, files, diagnosis }, null, 2)}\n`);
    const passes = diagnosis.passes.filter((pass) => !only || only.includes(pass.name));
    passes.forEach((pass, index) => writeFileSync(join(out, `pass-${index + 1}-${pass.name}.md`), brief({ stack, files, diagnosis, pass, url })));
    const result = { stack, files, diagnosis, before: summary(before), passes: [], out: relative(cwd, out) };
    const screenshots = ['fold-1440', 'next-1440', 'fold-390'].map((name) => join(out, `before-${name}.png`)).filter(existsSync);
    const context = { stack, files, page: before, diagnosis, screenshots, url };
    if (agent === 'none') {
        writeFileSync(join(out, 'study.md'), studyPrompt({ ...context, out: relative(cwd, out) }));
        return result;
    }

    // The part that takes judgement comes first, so a person can stop here and read it.
    let cards = null;
    if (!only || only.includes('craft')) {
        const given = briefFile ? JSON.parse(readFileSync(briefFile, 'utf8')) : null;
        const studied = given ? { brief: given, problems: validateBrief(given, before) } : study(agent, cwd, out, context, log);
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
        writeFileSync(join(out, `pass-${passes.length}-craft.md`), craftPrompt({ stack, files, brief: cards, url, out: relative(cwd, out) }));
    }
    if (passes.length === 0) return result;

    if (!stack.git) throw new Error('redesign applies passes on a git branch; run it in a git repository (or use --agent none for the plan only)');
    const dirty = lines(git(cwd, 'status', '--porcelain').stdout).length;
    if (dirty) log(`${dirty} uncommitted files are left as they are; passes commit only what they change`);
    const branch = `redesign/${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
    const start = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
    if (git(cwd, 'checkout', '-b', branch).status !== 0) throw new Error(`Could not create branch ${branch}`);
    log(`Working on branch ${branch} (from ${start})`);

    let baseline = before;
    let baselinePrefix = join(out, 'before');
    const errors = errorsBy(check(cwd));
    for (const [index, pass] of passes.entries()) {
        log(`Pass ${index + 1}/${passes.length}: ${pass.name} (${pass.items.length} decisions) …`);
        const snap = snapshot(cwd);
        const prompt = readFileSync(join(out, `pass-${index + 1}-${pass.name}.md`), 'utf8');
        const options = pass.name === 'craft' ? { minutes: 45 } : {};
        const allowed = pass.name === 'craft' ? { replacesImages: cards.sections.flatMap((section) => section.replacesImages ?? []) } : {};
        const run = runAgent(agent, prompt, cwd, options);
        writeFileSync(join(out, `pass-${index + 1}-${pass.name}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`);
        if (run.status !== 0) {
            restore(cwd, snap);
            result.passes.push({ name: pass.name, kept: false, problems: [`The agent stopped with an error (see pass-${index + 1}-${pass.name}.log)`] });
            continue;
        }
        if (build) {
            const built = spawnSync(build, { cwd, shell: true, encoding: 'utf8', timeout: 10 * 60 * 1000 });
            if (built.status !== 0) {
                restore(cwd, snap);
                result.passes.push({ name: pass.name, kept: false, problems: [`The build failed: ${(built.stderr || built.stdout).slice(-300)}`] });
                continue;
            }
        }
        const prefix = join(out, `pass-${index + 1}-${pass.name}`);
        const rebuild = () => (build ? spawnSync(build, { cwd, shell: true, encoding: 'utf8', timeout: 10 * 60 * 1000 }) : null);
        let after = await measure(url, { screenshots: prefix });
        // What the pass wrote also goes through the checker: new errors in a file count against it.
        const newErrors = () => {
            const { tracked, added } = changedSince(cwd, snap);
            const changed = [...tracked, ...added].filter((file) => !file.startsWith('.ai-design-check/'));
            const now = errorsBy(changed.length ? check(cwd, { include: changed }) : []);

            return Object.entries(now).filter(([file, count]) => count > (errors[file] ?? 0)).map(([file, count]) => `${count - (errors[file] ?? 0)} new rule errors in ${file}`);
        };
        let problems = [...verify(baseline, after, pass.name, allowed), ...newErrors()];
        // What the arithmetic found can be fixed: one more try, with the measured problems and nothing else.
        if (problems.length) {
            log(`  measured: ${problems.join('; ')}; one more try`);
            const fix = runAgent(agent, `${prompt}\n\nThis pass is already applied in the working tree; keep that work. Measuring the page found these problems. Fix only these:\n${list(problems)}`, cwd, options);
            writeFileSync(`${prefix}.fix.log`, `${fix.stdout ?? ''}\n${fix.stderr ?? ''}`);
            rebuild();
            after = await measure(url, { screenshots: prefix });
            problems = [...verify(baseline, after, pass.name, allowed), ...newErrors()];
        }
        if (!problems.length) {
            const verdict = critique(agent, cwd, baselinePrefix, prefix, pass.name);
            log(`  looked at it: ${verdict.afterWon === undefined ? verdict.reason : `${verdict.afterWon ? 'after' : 'before'} wins (${verdict.confidence}): ${verdict.reason}`}`);
            if (!verdict.ok) problems.push(`Looks worse: ${verdict.reason}`);
        }
        if (problems.length) {
            // Thrown away from the branch, not from the disk: hours of an agent's work stay available to read or apply.
            writeFileSync(`${prefix}.rejected.patch`, (snap.commit ? git(cwd, 'diff', snap.commit).stdout : ''));
            restore(cwd, snap);
            rebuild();
            restore(cwd, snap); // build output that is tracked goes back to exactly what it was
            log(`  thrown away: ${problems.join('; ')}`);
            result.passes.push({ name: pass.name, kept: false, problems });
            continue;
        }
        const { tracked, added } = changedSince(cwd, snap);
        const changed = [...tracked, ...added];
        // A commit that fails (a hook, no identity) must not be reported as a kept pass.
        gitOk(cwd, 'add', '--', ...changed);
        gitOk(cwd, 'commit', '-q', '-m', `Design: ${pass.name} (${pass.items.map((item) => item.id).join(', ')})`, '--', ...changed);
        Object.assign(errors, errorsBy(check(cwd, { include: changed })));
        log(`  kept: ${JSON.stringify(summary(baseline))} → ${JSON.stringify(summary(after))}`);
        result.passes.push({ name: pass.name, kept: true, after: summary(after) });
        baseline = after;
        baselinePrefix = prefix;
    }
    result.after = summary(baseline);
    result.branch = branch;
    result.start = start;
    writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);

    return result;
}
