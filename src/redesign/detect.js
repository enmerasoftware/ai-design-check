import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * What the project is built with and which files make a page: the framework, the styling, the CSS entry and, for a
 * route, the template files behind it. Laravel is followed through routes → controller → view → @extends, @include
 * and <x-…> components; file-routed frameworks (Next.js, Nuxt, SvelteKit, Astro) through their routes folder.
 */

const read = (path) => {
    try {
        return readFileSync(path, 'utf8');
    } catch {
        return '';
    }
};
const json = (path) => {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
};
const rel = (cwd, path) => relative(cwd, path).split(sep).join('/');

function walk(dir, test, out = [], depth = 0) {
    if (depth > 8 || !existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
        if (['node_modules', 'vendor', '.git', 'dist', 'build', 'storage', '.next', '.nuxt', '.svelte-kit'].includes(name)) continue;
        const path = join(dir, name);
        let stat;
        try {
            stat = statSync(path);
        } catch {
            continue; // a broken link
        }
        if (stat.isDirectory()) walk(path, test, out, depth + 1);
        else if (test(path)) out.push(path);
    }

    return out;
}

export function detectStack(cwd) {
    const pkg = json(join(cwd, 'package.json')) ?? {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const composer = json(join(cwd, 'composer.json')) ?? {};
    const php = { ...composer.require, ...composer['require-dev'] };
    const has = (name) => Boolean(deps[name]);

    let framework = 'html';
    if (php['laravel/framework']) framework = 'laravel';
    else if (has('next')) framework = 'next';
    else if (has('nuxt')) framework = 'nuxt';
    else if (has('@sveltejs/kit')) framework = 'sveltekit';
    else if (has('astro')) framework = 'astro';
    else if (has('vue')) framework = 'vue';
    else if (has('svelte')) framework = 'svelte';
    else if (has('react')) framework = 'react';

    const templates = [];
    if (framework === 'laravel') {
        templates.push('blade');
        if (php['livewire/livewire']) templates.push('livewire');
        if (php['inertiajs/inertia-laravel']) templates.push(has('vue') ? 'inertia-vue' : 'inertia-react');
    }

    const tailwind = deps.tailwindcss ? (/^[\^~]?[0-3]\./.test(deps.tailwindcss) ? 3 : 4) : null;
    const styling = tailwind ? `tailwind${tailwind}` : has('bootstrap') ? 'bootstrap' : has('sass') ? 'sass' : 'css';

    const cssCandidates = ['resources/css/app.css', 'resources/sass/app.scss', 'resources/scss/app.scss', 'src/app/globals.css', 'app/globals.css', 'src/styles/globals.css', 'styles/globals.css', 'src/index.css', 'src/app.css', 'src/styles.css', 'assets/css/main.css', 'src/assets/main.css', 'css/style.css', 'style.css'];
    const cssEntry = cssCandidates.find((path) => existsSync(join(cwd, path))) ?? null;

    return { framework, templates, styling, tailwind, cssEntry, git: spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, encoding: 'utf8' }).stdout.trim() === 'true' };
}

/** Laravel: the view named for a URL path in routes/web.php (Route::view, a closure or a controller method). */
export function laravelView(cwd, path = '/') {
    const routes = read(join(cwd, 'routes', 'web.php'));
    const target = path === '/' ? '/' : path.replace(/^\/|\/$/g, '');
    const pattern = new RegExp(`Route::(view|get|any)\\(\\s*['"]/?${target === '/' ? '' : target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?['"]\\s*,\\s*([^;]+);`, 'm');
    const match = pattern.exec(routes);
    if (!match) return null;
    const [, verb, rest] = match;
    if (verb === 'view') return /['"]([\w.\-/:]+)['"]/.exec(rest)?.[1] ?? null;
    const inline = /view\(\s*['"]([\w.\-/:]+)['"]/.exec(rest);
    if (inline) return inline[1];
    const action = /\[\s*([\w\\]+)::class\s*,\s*['"](\w+)['"]\s*\]/.exec(rest) ?? /([\w\\]+)::class/.exec(rest);
    if (!action) return null;
    const name = action[1].split('\\').pop();
    const method = action[2] ?? '__invoke';
    const file = walk(cwd, (item) => item.endsWith(`${sep}${name}.php`))[0];
    if (!file) return null;
    const code = read(file);
    const body = new RegExp(`function\\s+${method}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n    \\}`).exec(code)?.[1] ?? code;

    return /view\(\s*['"]([\w.\-/:]+)['"]/.exec(body)?.[1] ?? /Inertia::render\(\s*['"]([\w./-]+)['"]/.exec(body)?.[1] ?? null;
}

/** Blade view name → file. Supports dots, "namespace::view" for packages and modules found under the project. */
export function bladeFile(cwd, view) {
    const [namespace, name] = view.includes('::') ? view.split('::') : [null, view];
    const path = `${name.replace(/\./g, '/')}.blade.php`;
    const roots = namespace
        ? walk(cwd, (item) => item.endsWith(`${sep}${path.split('/').join(sep)}`)).filter((item) => item.toLowerCase().includes(namespace.toLowerCase()))
        : [join(cwd, 'resources', 'views', path)];
    const found = roots.find((item) => existsSync(item));

    return found ?? null;
}

/** Every Blade file a view pulls in: layouts, includes, components and Livewire views, page first. */
export function bladeGraph(cwd, view) {
    const files = [];
    const seen = new Set();
    const visit = (name) => {
        const file = bladeFile(cwd, name);
        if (!file || seen.has(file)) return;
        seen.add(file);
        files.push(file);
        const code = read(file);
        for (const match of code.matchAll(/@(?:extends|include|includeIf|includeWhen|includeFirst|component|each)\(\s*(?:[^,'"]+,\s*)?['"]([\w.\-/:]+)['"]/g)) visit(match[1]);
        for (const match of code.matchAll(/<x-([\w.\-:]+)/g)) {
            const tag = match[1];
            if (tag.startsWith('slot')) continue;
            const component = tag.includes('::') ? tag : `components.${tag}`;
            if (!bladeFile(cwd, component)) visit(`components.${tag}.index`);
            else visit(component);
        }
        for (const match of code.matchAll(/(?:@livewire\(\s*['"]|<livewire:)([\w.\-]+)/g)) visit(`livewire.${match[1]}`);
    };
    visit(view);

    return files.map((file) => rel(cwd, file));
}

/** The template files behind a URL path, page first, then layouts and partials. */
export function pageFiles(cwd, stack, path = '/') {
    const clean = path.replace(/^\/|\/$/g, '');
    const exists = (items) => items.filter((item) => existsSync(join(cwd, item)));

    if (stack.framework === 'laravel') {
        const view = laravelView(cwd, path);
        if (view && stack.templates.some((item) => item.startsWith('inertia')) && !bladeFile(cwd, view)) {
            const page = walk(join(cwd, 'resources', 'js'), (item) => new RegExp(`${view.replace(/\//g, `\\${sep}`)}\\.(tsx|jsx|vue)$`, 'i').test(item))[0];

            return page ? [rel(cwd, page)] : [];
        }

        return view ? bladeGraph(cwd, view) : [];
    }
    if (stack.framework === 'next') {
        const base = clean ? `${clean}/` : '';
        return exists([`app/${base}page.tsx`, `app/${base}page.jsx`, `src/app/${base}page.tsx`, `src/app/${base}page.jsx`, `pages/${clean || 'index'}.tsx`, `pages/${clean || 'index'}.jsx`, `src/pages/${clean || 'index'}.tsx`, 'app/layout.tsx', 'src/app/layout.tsx']);
    }
    if (stack.framework === 'nuxt') return exists([`pages/${clean || 'index'}.vue`, 'app.vue', 'layouts/default.vue']);
    if (stack.framework === 'sveltekit') return exists([`src/routes/${clean ? `${clean}/` : ''}+page.svelte`, 'src/routes/+layout.svelte']);
    if (stack.framework === 'astro') return exists([`src/pages/${clean || 'index'}.astro`, 'src/layouts/Layout.astro']);
    if (['react', 'vue', 'svelte'].includes(stack.framework)) return exists(['src/App.tsx', 'src/App.jsx', 'src/App.vue', 'src/App.svelte', 'index.html']);

    return exists([clean ? `${clean}.html` : 'index.html', `${clean}/index.html`]);
}

const TEMPLATE = /\.(blade\.php|tsx|jsx|vue|svelte|astro|html|twig|erb|hbs|njk|liquid)$/;

/**
 * Templates behind a rendered page found by its class strings: when a route is dynamic (a CMS, a theme helper),
 * the files that contain the page's own heading and section classes are the ones that draw it.
 */
export function locateByMarkers(cwd, markers) {
    // Class tokens, weighted by how rare they are across the templates: "hero-title" says more than "flex".
    const tokens = [...new Set(markers.flatMap((marker) => marker.split(/\s+/)).filter((token) => token.length >= 4 && !/[{}$@]/.test(token)))];
    if (!tokens.length) return [];
    const files = walk(cwd, (path) => TEMPLATE.test(path) && !path.includes(`${sep}tests${sep}`) && !path.includes(`${sep}public${sep}`));
    const present = files.map((file) => {
        const code = read(file);
        const classes = new Set([...code.matchAll(/class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{[`'"]([^`'"]*)[`'"]\})/g)].flatMap((match) => (match[1] ?? match[2] ?? match[3]).split(/\s+/)));
        return { file, hits: tokens.filter((token) => classes.has(token)) };
    });
    const df = new Map(tokens.map((token) => [token, present.filter((item) => item.hits.includes(token)).length]));
    const scored = present.map(({ file, hits }) => ({ file: rel(cwd, file), score: hits.reduce((sum, token) => sum + Math.log((files.length + 1) / (df.get(token) || 1)), 0) })).filter((item) => item.score > 0);
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.score ?? 0;

    return scored.filter((item) => item.score >= best * 0.35).slice(0, 15).map((item) => item.file);
}
