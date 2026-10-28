import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Rule catalogue: the single source for docs, the checker and the agent skill. */
export function loadRules() {
    return JSON.parse(readFileSync(join(ROOT, 'rules.json'), 'utf8'));
}

export const CONFIG_FILE = 'design-check.json';
/** Also read: the neutral dotfile and the 0.1 name. */
export const CONFIG_FILES = [CONFIG_FILE, '.design-rules.json', 'enmera-design.json'];

const DEFAULT_IGNORE = ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**', '**/public/build/**', '**/.git/**', '**/storage/**', '**/*.min.*'];

/** Names that keep their capitals inside a sentence-case label. Projects add their own in config.properNouns. */
const PROPER_NOUNS = [
    'Google', 'Apple', 'App Store', 'App Store Connect', 'Google Play', 'Search Console', 'Google Analytics', 'Meta', 'Facebook', 'Instagram', 'TikTok',
    'YouTube', 'Threads', 'Reddit', 'WhatsApp', 'Telegram', 'Slack', 'Bing', 'Cloudflare', 'Shopify', 'WordPress', 'Wix', 'Webflow', 'Ghost',
    'BigCommerce', 'GitHub', 'Claude', 'ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'OpenAI', 'Anthropic', 'Microsoft', 'Chrome', 'Safari',
    'Paddle', 'Stripe', 'PayPal', 'iyzico', 'PayTR', 'Trendyol', 'Hepsiburada', 'Amazon', 'Markdown', 'Enmera', 'Searvia', 'Enmera Commerce',
    'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca', 'Portekizce', 'Japonca', 'Arapça', 'Rusça', 'Türkiye',
];

/** Turkish- and English-aware: small connectives that stay lower case inside a label. */
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'of', 'on', 'in', 'to', 'by', 'with', 'vs', 've', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü']);

export function loadConfig(cwd) {
    const file = CONFIG_FILES.map((name) => join(cwd, name)).find((path) => existsSync(path));
    const config = file ? JSON.parse(readFileSync(file, 'utf8')) : {};

    return {
        include: config.include ?? ['.'],
        ignore: [...DEFAULT_IGNORE, ...(config.ignore ?? [])],
        rules: config.rules ?? {},
        allow: config.allow ?? {},
        i18n: { files: config.i18n?.files ?? [], keysAreSource: config.i18n?.keysAreSource ?? true, framework: config.i18n?.framework ?? [] },
        labels: config.labels ?? true,
        properNouns: [...PROPER_NOUNS, ...(config.properNouns ?? [])],
    };
}

/** Minimal glob: ** any depth, * within a segment, ? one character. */
export function globToRegExp(glob) {
    let out = '';
    for (let i = 0; i < glob.length; i++) {
        const char = glob[i];
        if (char === '*' && glob[i + 1] === '*') {
            out += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
            i += glob[i + 2] === '/' ? 2 : 1;
        } else if (char === '*') out += '[^/]*';
        else if (char === '?') out += '[^/]';
        else out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }

    return new RegExp(`^${out}$`);
}

const matches = (globs, path) => globs.some((glob) => globToRegExp(glob).test(path) || globToRegExp(`${glob}/**`).test(path));

function walk(cwd, start, ignore, files = []) {
    const full = join(cwd, start);
    if (!existsSync(full)) return files;
    if (statSync(full).isFile()) return [...files, start];

    for (const entry of readdirSync(full, { withFileTypes: true })) {
        const path = (start === '.' ? entry.name : `${start}/${entry.name}`).split(sep).join('/');
        if (matches(ignore, path)) continue;
        if (entry.isDirectory()) walk(cwd, path, ignore, files);
        else files.push(path);
    }

    return files;
}

const extensionOf = (path) => (path.endsWith('.blade.php') ? 'blade.php' : path.split('.').pop());

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

/** allow: { ruleId: ["glob", "glob:exact match"] } */
function allowed(config, rule, path, value) {
    return (config.allow[rule] ?? []).some((entry) => {
        const split = entry.lastIndexOf(':');
        const hasValue = split > 0 && !entry.slice(split).includes('/') && !entry.endsWith('**');
        const glob = hasValue ? entry.slice(0, split) : entry;

        return matches([glob], path) && (!hasValue || entry.slice(split + 1) === value);
    });
}

const words = (text) => text.trim().split(/\s+/);

/** Short label: 2–5 words, no sentence punctuation, no placeholder sentence, no path separator. */
export function isLabel(text) {
    const count = words(text).length;

    return count >= 2 && count <= 5 && !/[.!?:,;›·(|]|\s:[a-z_]/u.test(text) && /^\p{Lu}/u.test(text);
}

/** Every word after the first (connectives aside) starts with a capital: "Takip Et", "High Impact". */
export function isTitled(text) {
    const rest = words(text).slice(1).filter((word) => /^\p{L}/u.test(word) && !SMALL.has(word.toLocaleLowerCase('tr')));

    return rest.length > 0 && rest.every((word) => /^\p{Lu}/u.test(word));
}

/** Capitals are justified: a proper noun, an acronym or a mixed-case word explains every capitalised word. */
export function justified(text, properNouns, source = '') {
    // Product and category names: a known brand anywhere ("Google Tag Manager") or an ampersand ("Health & Fitness").
    const single = new Set(properNouns.filter((name) => !name.includes(' ')));
    const brand = (word) => single.has(word.split(/['’]/u)[0]);
    if (/\s&\s/u.test(text) || words(text).some(brand) || properNouns.some((name) => name.includes(' ') && text.includes(name))) return true;

    const rest = words(text).slice(1).map((word) => word.replace(/^[("“'‘]+|[)"”'’.,:;!?]+$/gu, '').split(/['’]/u)[0]);

    return rest.every((word) => {
        if (!/^\p{Lu}/u.test(word)) return true;
        if (/[\p{Lu}\d]/u.test(word.slice(1))) return true; // AI, SERP, iOS, GA4
        if (source && new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'u').test(source.split(/\s+/).slice(1).join(' '))) return true;

        return single.has(word) || properNouns.some((name) => name.includes(' ') && text.includes(name) && name.split(' ').includes(word));
    });
}

function checkI18n(config, path, source, report) {
    let dictionary;
    try {
        dictionary = JSON.parse(source);
    } catch {
        return;
    }

    for (const [key, value] of Object.entries(dictionary)) {
        if (typeof value !== 'string') continue;
        const line = lineOf(source, Math.max(0, source.indexOf(JSON.stringify(key))));

        if (config.i18n.keysAreSource && !config.i18n.framework.includes(key) && isLabel(key) && isTitled(key) && !justified(key, config.properNouns)) {
            report('sentence-case', path, line, key, `Source text in Title Case: "${key}"`);
        }
        // A translation may keep capitals that the source text also has (a proper noun translated with its official name).
        const sourceHasNames = config.i18n.keysAreSource && words(key).slice(1).some((word) => /^\p{Lu}/u.test(word));
        if (isLabel(value) && isTitled(value) && !sourceHasNames && !justified(value, config.properNouns)) {
            report('sentence-case', path, line, value, `Translation in Title Case: "${value}" (${key})`);
        }
    }
}

const LABEL_PATTERN = /\b(?:label|title|placeholder|aria-label|tooltip|description|heading)=\{?\s*(["'])([^"'{}\n]{3,60})\1|\bt\(\s*(["'])([^"'\n]{3,60})\3/g;

function checkLabels(config, path, source, report) {
    for (const match of source.matchAll(LABEL_PATTERN)) {
        const text = match[2] ?? match[4];
        if (isLabel(text) && isTitled(text) && !justified(text, config.properNouns)) {
            report('sentence-case', path, lineOf(source, match.index), text, `Label in Title Case: "${text}"`);
        }
    }
}

/**
 * Runs every enabled check. Returns findings ({rule, severity, path, line, value, message}) sorted by path and line.
 * config.rules: { ruleId: "off" | "info" | "warn" | "error" } overrides a rule's severity.
 */
export function check(cwd, overrides = {}) {
    const catalogue = loadRules();
    const config = { ...loadConfig(cwd), ...overrides };
    const severityOf = (rule) => config.rules[rule.id] ?? rule.severity;
    const findings = [];
    const report = (id, path, line, value, message) => {
        const rule = catalogue.rules.find((item) => item.id === id);
        const severity = severityOf(rule);
        if (severity === 'off' || allowed(config, id, path, value)) return;
        findings.push({ rule: id, severity, path, line, value, message: message ?? rule.title.en });
    };

    const files = [...new Set(config.include.flatMap((start) => walk(cwd, start, config.ignore)))];
    const regexRules = catalogue.rules.filter((rule) => rule.check?.type === 'regex' && severityOf(rule) !== 'off');
    const caseRule = catalogue.rules.find((rule) => rule.id === 'sentence-case');
    const caseOn = severityOf(caseRule) !== 'off';

    for (const path of files) {
        const extension = extensionOf(path);
        const isI18n = config.i18n.files.length > 0 && matches(config.i18n.files, path);
        const regexFor = regexRules.filter((rule) => rule.check.files.includes(extension) && !(isI18n && rule.id !== 'no-buzzwords'));
        const wantLabels = caseOn && config.labels && ['tsx', 'jsx', 'vue', 'svelte'].includes(extension);
        if (regexFor.length === 0 && !isI18n && !wantLabels) continue;

        const source = readFileSync(join(cwd, path), 'utf8');

        for (const rule of regexFor) {
            const pattern = new RegExp(rule.check.pattern, `g${rule.check.flags ?? ''}`.replace(/(.)(?=.*\1)/g, ''));
            for (const match of source.matchAll(pattern)) {
                report(rule.id, path, lineOf(source, match.index), match[0], `${rule.title.en}: ${match[0]}`);
            }
        }
        if (caseOn && isI18n) checkI18n(config, path, source, report);
        if (wantLabels) checkLabels(config, path, source, report);
    }

    return findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

export function relativeTo(cwd, path) {
    return relative(cwd, path).split(sep).join('/');
}
