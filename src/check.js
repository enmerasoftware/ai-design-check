import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASS_FUNCTIONS, blankComments, classUnits, tokens, utility } from './classes.js';
import { children, parseAttrs, tags, visibleText } from './jsx.js';
import { LOOKS } from './looks.js';
import { describeScale, onScale, readScales } from './spacing.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Rule catalogue: the single source for docs, the checker and the agent skill. */
export function loadRules() {
    return JSON.parse(readFileSync(join(ROOT, 'rules.json'), 'utf8'));
}

export const CONFIG_FILE = 'ai-design-check.json';
/** Also read: the neutral dotfile and the name used by @enmera/design 0.1. */
export const CONFIG_FILES = [CONFIG_FILE, '.design-rules.json', 'enmera-design.json'];

const DEFAULT_IGNORE = ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**', '**/public/build/**', '**/.git/**', '**/storage/**', '**/*.min.*', '**/Pods/**', '**/DerivedData/**', '**/.build/**', '**/.gradle/**', '**/generated/**', '**/.dart_tool/**', '**/*.g.dart', '**/*.freezed.dart', '**/*Tests.swift', '**/*Test.kt', '**/*Tests.kt', '**/*_test.dart', '**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/.next/**', '**/.nuxt/**', '**/.output/**', '**/.svelte-kit/**', '**/.astro/**', '**/.turbo/**', '**/.vercel/**', '**/.netlify/**', '**/.cache/**', '**/.expo/**', '**/.angular/**', '**/out/**', '**/coverage/**', '**/storybook-static/**'];

/** Names that keep their capitals inside a sentence-case label. Projects add their own in config.properNouns. */
const PROPER_NOUNS = [
    'Google', 'Apple', 'App Store', 'App Store Connect', 'Google Play', 'Search Console', 'Google Analytics', 'Meta', 'Facebook', 'Instagram', 'TikTok',
    'YouTube', 'Threads', 'Reddit', 'WhatsApp', 'Telegram', 'Slack', 'Bing', 'Cloudflare', 'Shopify', 'WordPress', 'Wix', 'Webflow', 'Ghost',
    'BigCommerce', 'GitHub', 'Claude', 'ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'OpenAI', 'Anthropic', 'Microsoft', 'Chrome', 'Safari',
    'Paddle', 'Stripe', 'PayPal', 'iyzico', 'PayTR', 'Trendyol', 'Hepsiburada', 'Amazon', 'Markdown', 'Enmera', 'Searvia', 'Enmera Commerce',
    'Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca', 'Portekizce', 'Japonca', 'Arapça', 'Rusça', 'Türkiye',
];

/** Raw element → the shared component that replaces it. */
const COMPONENTS = { button: 'Button', input: 'Input', select: 'Select', textarea: 'Textarea' };

/** Shared components whose look comes from props, not from className. */
const SHARED = ['Button', 'LinkButton', 'IconButton', 'Badge', 'StatusBadge', 'Input', 'Select', 'Textarea', 'Card', 'SectionCard', 'Tabs', 'TabsList', 'TabsTrigger'];

/** Utilities that change how a component looks (as opposed to where it sits). */
export const CONTAINER_VISUAL = /^(?:bg-|rounded|border(?!-[trblsexy]?-?0$)|ring|shadow|outline)/;
export const VISUAL = /^(?:bg-|text-(?!left$|right$|center$|start$|end$|justify$|wrap$|nowrap$|balance$|pretty$|ellipsis$|clip$)|font-|rounded|border|ring|shadow|p[xytrblse]?-|h-|size-|min-h-|gap-|tracking-|leading-|outline)/;

/** Turkish- and English-aware: small connectives that stay lower case inside a label. */
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'of', 'on', 'in', 'to', 'by', 'with', 'vs', 've', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü']);

const MARKUP = ['tsx', 'jsx', 'vue', 'svelte', 'html', 'blade.php'];
const JSX = ['tsx', 'jsx'];
/** App code read through each rule's check.native patterns: SwiftUI (swift), Jetpack Compose (kt), Flutter (dart). React Native files are "rn". */
const NATIVE = ['swift', 'kt', 'dart'];
const SCRIPT = ['tsx', 'jsx', 'ts', 'js'];
const REACT_NATIVE = /\bfrom\s+['"]react-native['"]|\brequire\(\s*['"]react-native['"]\s*\)/;
/** Interface code no rule reads yet: the report names it instead of calling the project clean. */
const UNREAD = /\.(php|astro|ejs|erb|twig|hbs|liquid|njk|cshtml|razor|m|mm|java|scss|sass|less|styl|mdx|pug|haml|slim)$/;
/** Files that say nothing about an interface: one of these alone must not count as "something was checked". */
const NOT_INTERFACE = /\.d\.ts$|(?:^|\/)[\w.-]+\.config\.\w+$/;
/** A plain .js file written as JSX (Create React App, older Next.js projects). */
const looksLikeJsx = (source) => /\bclassName=|(?:return|=>)\s*\(?\s*<[A-Za-z]/.test(source) && /<\/[A-Za-z]|\/>/.test(source);
const SEVERITIES = ['error', 'warn', 'info', 'off'];
const blankKeepingLines = (text) => text.replace(/[^\n]/g, ' ');
/** Commented-out markup is not markup: blanked, with every line number and offset unchanged. */
const blankMarkupComments = (source) => source.replace(/<!--[\s\S]*?-->|\{\s*\/\*[\s\S]*?\*\/\s*\}/g, blankKeepingLines);
const LAYOUT_XML = /(?:^|\/)res\/layout[^/]*\/[^/]+\.(xml)$/;

function readConfigFile(file) {
    let config;
    try {
        config = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
        throw new Error(`${basename(file)} is not valid JSON: ${error.message}`);
    }
    for (const key of ['include', 'ignore', 'properNouns', 'componentDirs']) {
        if (config[key] !== undefined && !(Array.isArray(config[key]) && config[key].every((item) => typeof item === 'string'))) throw new Error(`${basename(file)}: "${key}" must be a list of strings`);
    }
    for (const [rule, severity] of Object.entries(config.rules ?? {})) {
        if (!SEVERITIES.includes(severity)) throw new Error(`${basename(file)}: rule "${rule}" has severity ${JSON.stringify(severity)}; use ${SEVERITIES.join(', ')}`);
    }

    return config;
}

export function loadConfig(cwd) {
    const file = CONFIG_FILES.map((name) => join(cwd, name)).find((path) => existsSync(path));
    const config = file ? readConfigFile(file) : {};

    return {
        include: config.include ?? ['.'],
        ignore: [...DEFAULT_IGNORE, ...(config.ignore ?? [])],
        rules: config.rules ?? {},
        allow: config.allow ?? {},
        spacing: config.spacing,
        configFile: file ? basename(file) : CONFIG_FILE,
        i18n: { files: config.i18n?.files ?? [], keysAreSource: config.i18n?.keysAreSource ?? true, framework: config.i18n?.framework ?? [] },
        labels: config.labels ?? true,
        properNouns: [...PROPER_NOUNS, ...(config.properNouns ?? [])],
        classFunctions: [...CLASS_FUNCTIONS, ...(config.classFunctions ?? [])],
        components: { ...COMPONENTS, ...(config.components ?? {}) },
        looks: Object.fromEntries(Object.entries(LOOKS).map(([kind, look]) => [kind, { ...look, component: config.looks?.[kind] ?? look.component }]).filter(([kind]) => config.looks?.[kind] !== false)),
        componentDirs: config.componentDirs ?? ['**/components/ui/**'],
        sharedComponents: config.sharedComponents ?? SHARED,
        containers: config.containers ?? ['Card', 'SectionCard', 'Tile', 'Panel', 'RowButton', 'RowLink', 'MetaRow', 'List', 'CardContent'],
    };
}

/** Two or more words that all start with a capital, apart from proper nouns and small connectives: "Yaklaşan Ödemeler". */
function titleCased(text, properNouns) {
    const words = text.replace(/[?!.:,]/g, ' ').split(/\s+/u).filter((word) => /^\p{L}/u.test(word));
    const rest = words.slice(1).filter((word) => !SMALL.has(word.toLocaleLowerCase('tr')) && !properNouns.includes(word));

    return words.length >= 2 && rest.length > 0 && rest.every((word) => /^\p{Lu}/u.test(word) && !/^\p{Lu}+$/u.test(word));
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

export const matches = (globs, path) => globs.some((glob) => globToRegExp(glob).test(path) || globToRegExp(`${glob}/**`).test(path));

/** What git would keep, relative to cwd: tracked files and new ones .gitignore lets through. Null outside a repository. */
function gitVisible(cwd) {
    const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd, encoding: 'utf8', maxBuffer: 1 << 30 });

    return listed.status === 0 ? new Set(listed.stdout.split('\0').filter(Boolean)) : null;
}

function walkFolder(cwd, start, ignore, visible, files) {
    for (const entry of readdirSync(join(cwd, start), { withFileTypes: true })) {
        const path = (start === '.' ? entry.name : `${start}/${entry.name}`).split(sep).join('/');
        if (matches(ignore, path)) continue;
        if (entry.isDirectory()) walkFolder(cwd, path, ignore, visible, files);
        else if (!visible || visible.has(path)) files.push(path);
    }
}

export function walk(cwd, start, ignore, files = []) {
    const full = join(cwd, start);
    if (!existsSync(full)) return files;
    if (statSync(full).isFile()) return [...files, start]; // named outright: read even if ignored

    walkFolder(cwd, start, ignore, gitVisible(cwd), files);

    return files;
}

/** The spacing scales this project uses; the whole project is read, whichever paths are being checked. */
export const spacingScales = (cwd, config = loadConfig(cwd)) => readScales(cwd, config, walk(cwd, '.', config.ignore));

export const extensionOf = (path) => (path.endsWith('.blade.php') ? 'blade.php' : path.split('.').pop());

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

/** Markup with everything outside <style> blanked, so CSS rules read inline styles and line numbers stay valid. */
function styleBlocks(source) {
    let out = source.replace(/[^\n]/g, ' ');
    for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
        const start = match.index + match[0].indexOf('>') + 1;
        out = out.slice(0, start) + blankComments(match[1], false) + out.slice(start + match[1].length);
    }

    return out;
}

/** The at-rules (@media, @supports) whose block holds this position in a stylesheet. */
function atRulesAround(css, index) {
    const open = [];
    for (const match of css.slice(0, index).matchAll(/([^{};]*)\{|\}/g)) {
        if (match[0] === '}') open.pop();
        else open.push(match[1].trim());
    }

    return open.filter((prelude) => prelude.startsWith('@'));
}

/** allow: { ruleId: ["glob", "glob:exact match"] } */
function allowed(config, rule, path, value) {
    return (config.allow[rule] ?? []).some((entry) => {
        // The first colon: a value may hold more of them (hover:mt-[13px]) and a slash (w-1/2).
        const split = entry.indexOf(':');
        const hasValue = split > 0 && !entry.endsWith('**');
        const glob = hasValue ? entry.slice(0, split) : entry;

        return matches([glob], path) && (!hasValue || entry.slice(split + 1) === value);
    });
}

/**
 * Inline ignores, always with a reason after "--":
 *   ai-design-check-ignore-next-line rule-id[, rule-id] -- why
 *   ai-design-check-ignore-file rule-id -- why
 */
function ignores(source) {
    const lines = source.split('\n');
    const file = new Set();
    const byLine = new Map();
    lines.forEach((text, index) => {
        const match = /ai-design-check-ignore-(next-line|line|file)\s+([\w*,\s-]+?)\s+--\s*\S/.exec(text);
        if (!match) return;
        const ids = match[2].split(',').map((id) => id.trim()).filter(Boolean);
        if (match[1] === 'file') ids.forEach((id) => file.add(id));
        else if (match[1] === 'line') byLine.set(index + 1, [...(byLine.get(index + 1) ?? []), ...ids]);
        else {
            // next-line covers the next line; a tag opened there and left unfinished runs on to its first ">".
            for (let next = index + 1; next < Math.min(lines.length, index + 12); next++) {
                byLine.set(next + 1, [...(byLine.get(next + 1) ?? []), ...ids]);
                if (next === index + 1 ? !/<[A-Za-z][^>]*$/.test(lines[next]) : lines[next].includes('>')) break;
            }
        }
    });

    return (rule, line) => file.has(rule) || file.has('*') || (byLine.get(line) ?? []).some((id) => id === rule || id === '*');
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

const NAME_ATTRS = ['aria-label', 'aria-labelledby', 'title', 'label', 'tooltip'];

/** Names imported from an icon set: lucide's <Trash2 /> has no "Icon" in it. */
const ICON_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"](?:lucide-react|lucide-vue-next|lucide-svelte|@heroicons\/[^'"]+|react-icons\/[^'"]+|@phosphor-icons\/[^'"]+|phosphor-react|@tabler\/icons-react|@radix-ui\/react-icons|react-feather)['"]/g;

function checkIconButtons(path, source, report) {
    const iconNames = new Set([...source.matchAll(ICON_IMPORT)].flatMap((match) => match[1].split(',').map((name) => name.trim().split(/\s+as\s+/).pop()).filter(Boolean)));
    for (const tag of tags(source, ['button', 'Button', 'IconButton', 'a', 'Link', 'LinkButton'])) {
        const attrs = parseAttrs(tag.attrs);
        // A spread may carry the label; a react-aria slot ("previous", "next") is labelled by its parent.
        if (NAME_ATTRS.some((name) => attrs[name] !== undefined) || attrs.slot !== undefined || /\{\s*\.\.\./.test(tag.attrs)) continue;
        const inner = children(source, tag);
        if (inner === null || inner === '') continue;
        const hasIcon = /<(?:svg|[A-Z]\w*Icon|Icon|[A-Z]\w*Logo)\b/.test(inner) || [...inner.matchAll(/<([A-Z]\w*)\b/g)].some((match) => iconNames.has(match[1]));
        if (hasIcon && visibleText(inner) === '') report('icon-button-name', path, lineOf(source, tag.start), tag.name, `Icon-only <${tag.name}> has no aria-label`);
    }
}

const TOUCHABLES = ['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback'];

/** React Native: a touchable's size usually sits in a StyleSheet further down, so the style is followed by name. */
function checkTouchables(path, source, report) {
    const sheets = new Map();
    for (const sheet of source.matchAll(/\b(\w+)\s*=\s*StyleSheet\.create\(\s*\{([\s\S]*?)\n?\}\s*\)/g)) {
        for (const style of sheet[2].matchAll(/\b(\w+)\s*:\s*\{([^{}]*)\}/g)) sheets.set(`${sheet[1]}.${style[1]}`, style[2]);
    }
    for (const tag of tags(source, TOUCHABLES)) {
        const line = lineOf(source, tag.start);
        const inner = children(source, tag);
        const named = /\baccessibilityLabel\s*=/.test(tag.attrs);
        if (!named && !/\{\s*\.\.\./.test(tag.attrs) && inner && /<(?:[A-Z]\w*Icons?|Ionicons|Feather|Entypo|FontAwesome\w*)\b/.test(inner) && visibleText(inner) === '') report('icon-button-name', path, line, tag.name, `Icon-only <${tag.name}> has no accessibilityLabel`);
        if (/\bhitSlop\s*=/.test(tag.attrs)) continue;
        const inline = [...tag.attrs.matchAll(/style=\{\{([^{}]*)\}\}/g)].map((match) => match[1]);
        const fromSheet = [...tag.attrs.matchAll(/\b(\w+\.\w+)\b/g)].map((match) => sheets.get(match[1])).filter(Boolean);
        for (const body of [...inline, ...fromSheet]) {
            const small = /\b(?:height|minHeight)\s*:\s*([0-9.]+)/.exec(body);
            if (small && Number(small[1]) < 44) report('tap-target', path, line, small[0], `Touchable shorter than 44 pt: ${small[0]}`);
        }
    }
}

function checkSharedComponents(config, path, source, report) {
    if (matches(config.componentDirs, path)) return;
    for (const tag of tags(source, Object.keys(config.components))) {
        const type = parseAttrs(tag.attrs).type;
        if (tag.name === 'input' && ['hidden', 'file'].includes(type)) continue;
        report('use-shared-components', path, lineOf(source, tag.start), tag.name, `Raw <${tag.name}>: use <${config.components[tag.name]}>`);
    }
}

function checkLooks(config, path, source, report) {
    if (matches(config.componentDirs, path)) return;
    const looks = Object.values(config.looks);
    for (const tag of tags(source, looks.flatMap((look) => look.tags))) {
        const raw = parseAttrs(tag.attrs).className ?? parseAttrs(tag.attrs).class;
        if (raw === undefined) continue;
        const text = typeof raw === 'string' ? raw : classUnits(`className={${raw.code}}`, config.classFunctions).map((unit) => unit.text).join(' ');
        const look = looks.find((item) => item.tags.includes(tag.name) && item.test(text));
        if (look) report('use-shared-looks', path, lineOf(source, tag.start), `${look.name}:${tag.name}`, `Hand-written ${look.name} <${tag.name}>: use ${look.component}`);
    }
}

function checkOverrides(config, path, source, report) {
    // Inside the component folder components compose each other (a calendar's day Button, an input inside a group).
    if (matches(config.componentDirs, path)) return;
    for (const tag of tags(source, config.sharedComponents)) {
        const attrs = parseAttrs(tag.attrs);
        const raw = attrs.className;
        if (raw === undefined) continue;
        const text = typeof raw === 'string' ? raw : classUnits(`className={${raw.code}}`, config.classFunctions).map((unit) => unit.text).join(' ');
        // Containers (boxes, rows, lists) are laid out by their caller: padding, gap, height and text belong there.
        const look = config.containers.includes(tag.name) ? CONTAINER_VISUAL : VISUAL;
        const visual = tokens(text).filter((token) => look.test(utility(token)));
        if (visual.length > 0) report('no-style-overrides', path, lineOf(source, tag.start), visual.join(' '), `<${tag.name}> styled from outside: ${visual.join(' ')}`);
    }
}

/** Layout utilities do not make two copies look different; drop them before comparing class lists. */
export const LAYOUT = /^(?:w-|min-w-|max-w-|m[xytrblse]?-|-m|flex-1$|flex-none$|grow|shrink|self-|justify-self-|place-self-|order-|col-|row-|hidden$|block$|inline|absolute$|relative$|fixed$|sticky$|top-|right-|bottom-|left-|inset-|start-|end-|z-|transition|duration-|ease-|animate-|cursor-|select-|pointer-events-|truncate$|sr-only$)/;

const CLASS_TOKEN = /^!?-?[a-z0-9@[][\w:\-/.[\]%#()&,!*>+~=']*$/;

export const signature = (text) => [...new Set(tokens(text).filter((token) => CLASS_TOKEN.test(token) && /[-:[]|^(?:flex|grid|block|hidden|inline|border|rounded|shadow|truncate|uppercase|italic|underline|relative|absolute|sticky|fixed)$/.test(token) && !LAYOUT.test(utility(token))))].sort().join(' ');

/**
 * Runs every enabled check. Returns findings ({rule, area, severity, path, line, value, message}) sorted by path and line.
 * config.rules: { ruleId: "off" | "info" | "warn" | "error" } overrides a rule's severity.
 */
export function check(cwd, overrides = {}) {
    const catalogue = loadRules();
    const config = { ...loadConfig(cwd), ...overrides };
    const severityOf = (rule) => config.rules[rule.id] ?? rule.severity;
    const on = (id) => severityOf(catalogue.rules.find((rule) => rule.id === id)) !== 'off';
    const findings = [];
    let skip = () => false;
    // Read on first use: a run that meets no bracket value (the post-edit hook, usually) never walks the project.
    let scales = config.scales;
    const spacing = () => (scales ??= spacingScales(cwd, config));
    const report = (id, path, line, value, message) => {
        const rule = catalogue.rules.find((item) => item.id === id);
        const severity = severityOf(rule);
        if (severity === 'off' || allowed(config, id, path, value) || skip(id, line)) return null;
        const finding = { rule: id, area: rule.area, severity, path, line, value, message: message ?? rule.title.en };
        findings.push(finding);

        return finding;
    };

    const files = [...new Set(config.include.flatMap((start) => walk(cwd, start, config.ignore)))];
    const active = catalogue.rules.filter((rule) => rule.check && severityOf(rule) !== 'off');
    const classRules = active.filter((rule) => rule.check.type === 'class');
    const regexRules = active.filter((rule) => rule.check.type === 'regex');
    const repeated = active.find((rule) => rule.check.type === 'repeated-markup');
    const groups = new Map();

    for (const path of files) {
        let extension = extensionOf(path);
        if (extension === 'js' && looksLikeJsx(readFileSync(join(cwd, path), 'utf8'))) extension = 'jsx';
        const isI18n = config.i18n.files.length > 0 && matches(config.i18n.files, path);
        const markup = MARKUP.includes(extension);
        const regexFor = regexRules.filter((rule) => rule.check.files.includes(extension) && !(isI18n && !['no-buzzwords', 'error-copy', 'ellipsis-character'].includes(rule.id)));
        if (!markup && extension !== 'css' && regexFor.length === 0 && !NATIVE.includes(extension) && !isI18n) continue;

        const raw = readFileSync(join(cwd, path), 'utf8');
        skip = ignores(raw); // inline ignores live in comments, so they are read before comments are blanked
        const source = markup ? blankMarkupComments(raw) : raw;
        const reactNative = SCRIPT.includes(extension) && REACT_NATIVE.test(source);
        const platform = reactNative ? 'rn' : extension;
        const nativeFor = NATIVE.includes(extension) || reactNative ? active.filter((rule) => rule.check.native?.[platform]) : [];

        if (markup) {
            for (const unit of classUnits(source, config.classFunctions)) {
                const line = lineOf(source, unit.index);
                for (const rule of classRules.filter((item) => item.check.pattern)) {
                    if (rule.check.unless && new RegExp(rule.check.unless, 'u').test(unit.text)) continue;
                    if (rule.check.exceptElements && unit.element && new RegExp(rule.check.exceptElements).test(unit.element)) continue;
                    if (rule.check.onlyElements && !(unit.element && new RegExp(rule.check.onlyElements).test(unit.element))) continue;
                    // The element's own attributes can rule it out (type="file" has no text to zoom on).
                    if (rule.check.unlessTag) {
                        const next = source.indexOf('<', unit.index);
                        if (new RegExp(rule.check.unlessTag, 'u').test(source.slice(source.lastIndexOf('<', unit.index), next < 0 ? undefined : next))) continue;
                    }
                    // A wrapper just above may carry the style (focus-within: ring on the box around an input).
                    if (rule.check.unlessBefore && new RegExp(rule.check.unlessBefore, 'u').test(source.slice(Math.max(0, unit.index - 1500), unit.index))) continue;
                    for (const match of unit.text.matchAll(new RegExp(rule.check.pattern, 'gu'))) {
                        // A value on the project's scale (mt-[24px] on a 4 px grid) and hairlines (1–2 px) pass.
                        if (rule.check.scale && onScale(spacing().web, Number(match[1]), match[0])) continue;
                        report(rule.id, path, line, match[0].trim(), rule.check.scale ? `Off the spacing scale, ${describeScale(spacing().web)}: ${match[0].trim()}` : `${rule.title.en}: ${match[0].trim()}`);
                    }
                }
                if (repeated) {
                    const key = signature(unit.text);
                    if (key.split(' ').length >= repeated.check.minTokens) groups.set(key, [...(groups.get(key) ?? []), { path, line, skip: skip('repeated-markup', line) }]);
                }
            }
        }
        // Class rules that also need the element's text (an all-caps label written by hand).
        if (markup) {
            for (const rule of classRules.filter((item) => item.check.markup)) {
                for (const match of source.matchAll(new RegExp(rule.check.markup, 'gu'))) report(rule.id, path, lineOf(source, match.index), match[1] ?? match[0], `${rule.title.en}: ${(match[1] ?? match[0]).trim()}`);
            }
        }
        if (extension === 'css' || markup) {
            const css = extension === 'css' ? blankComments(source, false) : styleBlocks(source);
            for (const rule of classRules.filter((item) => item.check.css)) {
                let reported = false;
                for (const match of css.matchAll(new RegExp(rule.check.css, 'gu'))) {
                    if (reported && rule.check.cssOnePerFile) break;
                    if (rule.check.unlessMedia && atRulesAround(css, match.index).some((at) => new RegExp(rule.check.unlessMedia, 'iu').test(at))) continue;
                    const value = match[0].replace(/\s+/g, ' ').trim();
                    reported = Boolean(report(rule.id, path, lineOf(source, match.index), value, `${rule.title.en}: ${value}`)) || reported;
                }
            }
        }
        // Code rules read code and copy, not comments (inline ignores were read above, before blanking).
        const code = ['tsx', 'jsx', 'ts', 'js', 'vue', 'svelte', 'css', ...NATIVE].includes(extension) ? blankComments(source, extension !== 'css') : source;
        // Native rules: one pattern per platform; group 1 is the number when the rule checks a scale or a limit.
        for (const rule of nativeFor) for (const entry of [rule.check.native[platform]].flat()) {
            const native = typeof entry === 'string' ? { pattern: entry } : entry;
            for (const match of code.matchAll(new RegExp(native.pattern, `gmu${native.flags ?? ''}`))) {
                const number = Number(match[1]);
                if (native.scale && onScale(spacing().native, number)) continue;
                if (native.notMultipleOf && (number <= 2 || number % native.notMultipleOf === 0)) continue;
                if (native.min !== undefined && !(number >= native.min)) continue;
                if (native.max !== undefined && !(number < native.max)) continue;
                if (native.titleCase && !titleCased(match[1], config.properNouns)) continue;
                const before = code.slice(Math.max(0, match.index - 300), match.index);
                const after = code.slice(match.index + match[0].length, match.index + match[0].length + 300);
                if (native.unlessBefore && new RegExp(native.unlessBefore, 'u').test(before)) continue;
                if (native.unlessAfter && new RegExp(native.unlessAfter, 'u').test(after)) continue;
                // Only where the context makes it count (a size on something tappable): either side may match.
                if (native.onlyIf && !((native.onlyIf.before && new RegExp(native.onlyIf.before, 'u').test(before)) || (native.onlyIf.after && new RegExp(native.onlyIf.after, 'u').test(after)))) continue;
                // A corner of half the box's width is a circle, not a guess.
                if (native.unlessCircle && new RegExp(`\\b(?:width|height|size)\\s*[:=(]\\s*${number * 2}\\b`).test(before.slice(-120) + after.slice(0, 120))) continue;
                const finding = report(rule.id, path, lineOf(source, match.index), match[0].trim(), native.scale ? `Off the spacing scale, ${describeScale(spacing().native, 'pt/dp')}: ${match[0].trim()}` : `${rule.title.en}: ${match[0].trim()}`);
                if (finding) Object.defineProperty(finding, 'offset', { value: match.index });
            }
        }
        for (const rule of regexFor) {
            const pattern = new RegExp(rule.check.pattern, `g${rule.check.flags ?? ''}`.replace(/(.)(?=.*\1)/g, ''));
            const seen = new Set();
            const matched = [...code.matchAll(pattern)];
            if (rule.check.minPerFile && matched.length < rule.check.minPerFile) continue;
            for (const match of matched) {
                const line = lineOf(source, match.index);
                if (seen.has(line)) continue; // one finding per line and rule
                seen.add(line);
                report(rule.id, path, line, match[0], `${rule.title.en}: ${match[0]}`);
            }
        }
        if (on('sentence-case') && isI18n) checkI18n(config, path, source, report);
        if (on('sentence-case') && config.labels && ['tsx', 'jsx', 'vue', 'svelte'].includes(extension)) checkLabels(config, path, source, report);
        if (reactNative && JSX.includes(extension)) checkTouchables(path, code, report);
        if (JSX.includes(extension)) {
            if (on('icon-button-name')) checkIconButtons(path, source, report);
            if (on('use-shared-components')) checkSharedComponents(config, path, source, report);
            if (on('no-style-overrides')) checkOverrides(config, path, source, report);
            if (on('use-shared-looks')) checkLooks(config, path, source, report);
        }
    }

    if (repeated) {
        for (const [key, places] of groups) {
            const live = places.filter((place) => !place.skip);
            if (live.length < repeated.check.minCount) continue;
            const first = live[0];
            const where = [...new Set(live.map((place) => place.path))];
            skip = () => false;
            const finding = report('repeated-markup', first.path, first.line, key, `Same classes ${live.length}× in ${where.length} file(s), extract a component: ${key}`);
            if (finding) finding.places = live.map(({ path, line }) => ({ path, line }));
        }
    }

    return findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

/** How much of the project the rules can read: { read, unread: { extension: count } }. */
export function coverage(cwd, overrides = {}) {
    const config = { ...loadConfig(cwd), ...overrides };
    const files = [...new Set(config.include.flatMap((start) => walk(cwd, start, config.ignore)))];
    const unread = {};
    let read = 0;
    for (const path of files) {
        const other = (UNREAD.test(path) && !path.endsWith('.blade.php') ? UNREAD : LAYOUT_XML).exec(path)?.[1];
        if (other) unread[other] = (unread[other] ?? 0) + 1;
        else if (NOT_INTERFACE.test(path)) continue;
        else if ([...MARKUP, ...NATIVE, ...SCRIPT, 'css'].includes(extensionOf(path)) || config.include.includes(path) || matches(config.i18n.files, path)) read++;
    }

    return { read, unread };
}

/** Baseline: per file and rule, how many findings already existed. Only findings beyond those counts are reported. */
export function applyBaseline(findings, baseline) {
    const counts = new Map();
    for (const item of findings) counts.set(`${item.path}\u0000${item.rule}`, (counts.get(`${item.path}\u0000${item.rule}`) ?? 0) + 1);

    return findings.filter((item) => counts.get(`${item.path}\u0000${item.rule}`) > (baseline[`${item.path}\u0000${item.rule}`] ?? 0));
}

export function toBaseline(findings) {
    const out = {};
    for (const item of findings) out[`${item.path}\u0000${item.rule}`] = (out[`${item.path}\u0000${item.rule}`] ?? 0) + 1;

    return out;
}
