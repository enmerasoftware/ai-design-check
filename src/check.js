import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASS_FUNCTIONS, balancedEnd, blankComments, classUnits, literals, tokens, utility } from './classes.js';
import { cssHits, markupSheet, scssAsCss } from './css.js';
import { children, parseAttrs, readTag, tags, visibleText } from './jsx.js';
import { LOOKS } from './looks.js';
import { RADIUS_STEPS, describeScale, onRadiusScale, onScale, readScales } from './spacing.js';

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
/** Markup written as HTML: style="" is CSS here (JSX takes an object) and icons come as <i>, <svg> or a ligature span. */
const HTML_LIKE = ['html', 'blade.php', 'vue', 'svelte'];
/** App code read through each rule's check.native patterns: SwiftUI (swift), Jetpack Compose (kt), Flutter (dart). React Native files are "rn". */
const NATIVE = ['swift', 'kt', 'dart'];
const SCRIPT = ['tsx', 'jsx', 'ts', 'js'];
const REACT_NATIVE = /\bfrom\s+['"]react-native['"]|\brequire\(\s*['"]react-native['"]\s*\)/;
/** Interface code no rule reads yet: the report names it instead of calling the project clean. */
const UNREAD = /\.(php|astro|ejs|erb|twig|hbs|liquid|njk|cshtml|razor|m|mm|java|sass|less|styl|mdx|pug|haml|slim)$/;
const STYLESHEET = ['css', 'scss'];
/** A framework's own stylesheet copied into the project, named by its licence banner: its values are the framework's choices. */
/** The same, known by where it sits or what it is called: a library's stylesheet often has no banner (Swagger UI's has none). */
const VENDOR_PATH = /(?:^|\/)(?:third[-_]?party|3rd[-_]?party|swagger-ui|tinymce|ckeditor|highlight\.js|mathjax|katex|codemirror|monaco-editor)\/|(?:^|\/)(?:bootstrap(?:[.-][\w.-]*)?|font-?awesome[\w.-]*|normalize|animate|select2[\w.-]*|flatpickr[\w.-]*|swiper[\w.-]*|slick(?:-theme)?|owl\.carousel[\w.-]*|datatables[\w.-]*|leaflet[\w.-]*|prism[\w.-]*|bulma[\w.-]*|materialize[\w.-]*|uikit[\w.-]*|swagger-ui[\w.-]*)\.s?css$/i;
const VENDOR_CSS = /^\uFEFF?\s*\/\*!?(?:(?!\*\/)[\s\S]){0,600}?\b(?:Bootstrap|tailwindcss|Font Awesome|Bulma|Foundation for Sites|normalize\.css|animate\.css|Materialize|UIkit|Pico CSS|Bootswatch|AdminLTE)\b/i;
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
        designSystem: config.designSystem, // fonts, sizes, radii and colours the scan holds a page to
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

/** A file as a stylesheet ({ css, regions }), offsets kept: a .css or .scss file, or the <style> blocks and style attributes of markup. */
function sheetOf(extension, source) {
    if (extension === 'css') return { css: blankComments(source, false) };
    if (extension === 'scss') return { css: scssAsCss(source) };

    return markupSheet(source, { inline: HTML_LIKE.includes(extension) });
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

/** Bootstrap's close button draws its × in CSS: empty as it is, it still needs a name. */
const CLOSE_BUTTON = /(?:^|\s)btn-close(?:\s|$)/;
const CLOSE_MESSAGE = 'Close button (.btn-close) has no aria-label';

function checkIconButtons(path, source, report) {
    const iconNames = new Set([...source.matchAll(ICON_IMPORT)].flatMap((match) => match[1].split(',').map((name) => name.trim().split(/\s+as\s+/).pop()).filter(Boolean)));
    for (const tag of tags(source, ['button', 'Button', 'IconButton', 'a', 'Link', 'LinkButton'])) {
        const attrs = parseAttrs(tag.attrs);
        // A spread may carry the label; a react-aria slot ("previous", "next") is labelled by its parent.
        if (NAME_ATTRS.some((name) => attrs[name] !== undefined) || attrs.slot !== undefined || /\{\s*\.\.\./.test(tag.attrs)) continue;
        const inner = children(source, tag);
        if (CLOSE_BUTTON.test(typeof attrs.className === 'string' ? attrs.className : '') && inner !== null && visibleText(inner) === '') {
            report('icon-button-name', path, lineOf(source, tag.start), tag.name, CLOSE_MESSAGE);
            continue;
        }
        if (inner === null || inner === '') continue;
        const hasIcon = /<(?:svg|[A-Z]\w*Icon|Icon|[A-Z]\w*Logo)\b/.test(inner) || [...inner.matchAll(/<([A-Z]\w*)\b/g)].some((match) => iconNames.has(match[1]));
        if (hasIcon && visibleText(inner) === '') report('icon-button-name', path, lineOf(source, tag.start), tag.name, `Icon-only <${tag.name}> has no aria-label`);
    }
}

/** Icons in HTML: an icon font (<i class="bi …">, Font Awesome), a ligature or Bootstrap *-icon span, an svg, an image, an icon component. */
const MARKUP_ICON = /<(?:svg|i|img|iconify-icon|ion-icon|[A-Z]\w*Icon|Icon|[A-Z]\w*Logo)\b|<span\b[^>]*\bclass=["'][^"']*(?:\bmaterial-(?:icons|symbols)|-icon\b)/;
/** A ligature icon's text is the icon's name ("delete", "arrow_forward"), not a label. */
const LIGATURE = /<(span|i)\b[^>]*\bclass=["'][^"']*\bmaterial-(?:icons|symbols)[^>]*>[^<]*<\/\1>/g;
/** A child that names the control: an image's alt, an svg's aria-label, text that a framework fills in. */
const CHILD_NAME = /\b(?:alt|aria-label|title)=(?:["']\s*[^\s"']|\{)|\b(?:v-text|v-html|x-text|x-html)=/;

/** HTML, Blade, Vue and Svelte: a Vue or Alpine binding (:aria-label) names the control too, and {{ }} text is text. */
function checkMarkupIconButtons(path, source, report) {
    for (const tag of tags(source, ['button', 'a'])) {
        const attrs = parseAttrs(tag.attrs);
        const names = Object.keys(attrs).map((name) => name.replace(/^(?:v-bind:|x-bind:|:|attr\.)/, ''));
        if (names.some((name) => NAME_ATTRS.includes(name) || /^(?:v-text|v-html|x-text|x-html)$/.test(name)) || attrs['aria-hidden'] === 'true') continue;
        const inner = children(source, tag);
        if (inner === null) continue;
        const content = inner.replace(LIGATURE, ' <i></i> ');
        const closeButton = CLOSE_BUTTON.test(typeof attrs.class === 'string' ? attrs.class : '');
        if (!(closeButton || MARKUP_ICON.test(content)) || CHILD_NAME.test(content) || visibleText(content) !== '') continue;
        report('icon-button-name', path, lineOf(source, tag.start), tag.name, closeButton ? CLOSE_MESSAGE : `Icon-only <${tag.name}> has no aria-label`);
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

/** Elements that never close in HTML, so they never hold anything. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** The utilities on an element: className, class, a Vue :class, cn('…') literals; variants stripped. */
function utilitiesOf(attrs) {
    const parsed = parseAttrs(attrs);
    const values = ['className', 'class', ':class', 'v-bind:class'].map((name) => parsed[name]).filter((value) => value !== undefined && value !== true);
    const raw = values.flatMap((value) => tokens(typeof value === 'string' ? value : literals(value.code).join(' ')));
    const set = new Set(raw.map(utility));
    // The column list a phone gets: grid-cols-N with no breakpoint in front of it (md:grid-cols-2 alone leaves the
    // phone one implicit auto column, which grows to its content).
    Object.defineProperty(set, 'base', { value: new Set(raw.filter((token) => !token.includes(':')).map(utility)) });
    return set;
}
/** A width that caps how wide the text can ask its parents to be (a percentage does not: it is auto while sizing). */
const CAPPED = /^(?:w-(?!auto$|fit$|max$|min$|full$|\d+\/\d+$)\S+|max-w-(?!none$|full$|max$|fit$)\S+|size-\S+)$/;
/** A flex or grid item allowed to be narrower than its content: min-w-0 or a clipping overflow. */
const SHRINKS = /^(?:min-w-0|min-w-\[0(?:px)?\]|overflow-(?:x-)?(?:hidden|clip|auto|scroll))$/;
const ROW_FLEX = (classes) => (classes.has('flex') || classes.has('inline-flex')) && !classes.has('flex-col') && !classes.has('flex-col-reverse');
/**
 * A grid whose tracks may grow to their content. grid-cols-N is minmax(0, 1fr) in Tailwind and cannot; an arbitrary
 * list can when one track is auto, content-sized or a bare 1fr (minmax(auto, 1fr)); minmax(11rem, 1fr) cannot.
 */
const GROWING_TRACK = /(?:^|[_,(\s])(?:\d*\.?\d+fr|auto|min-content|max-content|fit-content)(?![-\w])/;
const AUTO_GRID = (classes) => {
    if (!classes.has('grid') && !classes.has('inline-grid')) return false;
    const columns = [...(classes.base ?? classes)].filter((name) => name.startsWith('grid-cols-'));
    if (!columns.length) return true;
    return columns.some((name) => name.startsWith('grid-cols-[') && GROWING_TRACK.test(name.slice(11, -1).replace(/minmax\(\s*(?!auto\b)[^,()]+,[^()]*\)/g, 'x')));
};

/**
 * A truncated line inside a flex item that has no min-w-0: the item never shrinks below the line's full width, so a
 * long name widens the card past its column and over the next one. The line's width travels up every parent until a
 * fixed width or max-w caps it; min-w-0 on one item lets that item shrink but does not stop the width travelling on,
 * so each flex or grid item on the way needs its own.
 */
function checkMinWidthChain(chain, path, source, raw, report) {
    const file = chainFile(chain, path, source);
    file.raw = raw;
    // A dry pass first: a component defined further down the file is used before the walk reaches its root.
    if (file.roots.size) walkChain(chain, file, null, 0);
    walkChain(chain, file, report, 0);
}

/** Two class sets as one: a component's root classes and the className its caller passes in. */
function mergedClasses(root, own) {
    const set = new Set([...root, ...own]);
    Object.defineProperty(set, 'base', { value: new Set([...(root.base ?? root), ...(own.base ?? own)]) });
    return set;
}

/** One file read for the chain rule: its source, the components it defines and the ones it imports. */
function chainFile(chain, path, source) {
    if (chain.files.has(path)) return chain.files.get(path);
    const file = { path, source, roots: componentRoots(source), imports: relativeImports(source), carried: new Map() };
    chain.files.set(path, file);
    return file;
}

/** The component a tag names, defined in this file or imported from a relative path in the project; null when unknown. */
function resolveComponent(chain, file, name, depth) {
    let target = file;
    let exported = name;
    if (!file.roots.has(name)) {
        const imported = file.imports.get(name);
        if (!imported || depth >= 2 || !chain.cwd) return null;
        const path = resolveImport(chain, file.path, imported.from);
        if (!path) return null;
        if (!chain.files.has(path)) {
            const raw = readFileSync(join(chain.cwd, path), 'utf8');
            const read = chainFile(chain, path, blankMarkupComments(raw));
            read.raw = raw;
            walkChain(chain, read, null, depth + 1);
        }
        target = chain.files.get(path);
        exported = imported.name === 'default' ? (/\bexport\s+default\s+(?:[\w.]+\(\s*)?(?:function\s+)?([A-Z]\w*)/.exec(target.source)?.[1] ?? '') : imported.name;
    }
    const root = target.roots.get(exported);
    if (!root) return null;

    return { file: target, root, name, classes: utilitiesOf(root.attrs) };
}

const IMPORTABLE = ['', '.tsx', '.jsx', '.js', '/index.tsx', '/index.jsx', '/index.js'];
function resolveImport(chain, from, specifier) {
    const base = join(dirname(from), specifier).split(sep).join('/');
    if (base.startsWith('..')) return null;
    for (const suffix of IMPORTABLE) {
        const path = base + suffix;
        if (!/\.(?:tsx|jsx|js)$/.test(path) || matches(chain.ignore, path)) continue;
        const full = join(chain.cwd, path);
        if (existsSync(full) && statSync(full).isFile()) return path;
    }
    return null;
}

/** import Foo, { Bar, Baz as Qux } from './x': local name → { name it is exported as, from }. Relative paths only. */
function relativeImports(source) {
    const out = new Map();
    for (const match of source.matchAll(/\bimport\s+(?!type\s)(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        if (match[1]) out.set(match[1], { name: 'default', from: match[3] });
        for (const entry of (match[2] ?? '').split(',')) {
            const named = /^\s*(?:type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(entry);
            if (named && !/^\s*type\s/.test(entry)) out.set(named[2] ?? named[1], { name: named[1], from: match[3] });
        }
    }
    return out;
}

/** The JSX a function body returns at its own level (not a callback's): the last such return wins. */
function returnedTag(source, from, to) {
    let found = null;
    const body = source.slice(from, to);
    for (const match of body.matchAll(/\breturn\s*\(?\s*<(?=[A-Za-z])/g)) {
        const before = body.slice(0, match.index);
        if ((before.match(/\{/g) ?? []).length === (before.match(/\}/g) ?? []).length) found = from + match.index + match[0].length - 1;
    }
    return found === null ? null : readTag(source, found);
}

/**
 * Components a file defines and the element each one renders at its root: function Foo(…) { return (<root …>) } and
 * const Foo = (…) => (<root …>), also inside forwardRef() or memo(). A fragment or a computed root is left out.
 */
function componentRoots(source) {
    const roots = new Map();
    for (const match of source.matchAll(/\bfunction\s+([A-Z]\w*)\s*(?:<[^<>()]*>)?\s*\(|\b(?:const|let)\s+([A-Z]\w*)\s*(?::[^=;]+)?=(?!=)/g)) {
        const name = match[1] ?? match[2];
        if (roots.has(name)) continue;
        let at = match.index + match[0].length;
        if (match[2]) {
            // Wrappers (forwardRef(, React.memo(, async) in front of the parameters.
            at += /^\s*(?:(?:[\w$.]+\s*(?:<[^<>()]*>)?\s*\(\s*)(?=[(\w])|async\s+)*/.exec(source.slice(at, at + 200))[0].length;
            if (source[at] === '(') at = balancedEnd(source, at, '(', ')');
            else if (/[\w$]/.test(source[at] ?? '')) at += /^[\w$]+/.exec(source.slice(at))[0].length;
            else continue;
            const arrow = at > 0 && /^\s*(?::[^=;{}]*)?=>\s*/.exec(source.slice(at, at + 200));
            if (!arrow) continue;
            at += arrow[0].length;
            if (source[at] !== '{') {
                const head = /^\(?\s*/.exec(source.slice(at))[0];
                const root = source[at + head.length] === '<' ? readTag(source, at + head.length) : null;
                if (root) roots.set(name, root);
                continue;
            }
        } else {
            at = balancedEnd(source, at - 1, '(', ')');
            if (at < 0) continue;
            const brace = /^[^{;]*/.exec(source.slice(at, at + 200))[0].length + at;
            if (source[brace] !== '{') continue;
            at = brace;
        }
        const end = balancedEnd(source, at);
        const root = end > 0 ? returnedTag(source, at + 1, end - 1) : null;
        if (root) roots.set(name, root);
    }
    return roots;
}

/**
 * The walk itself. With report null it only records which elements carry a content width up (file.carried: start →
 * 'truncate' | 'scroll'), so a component's root can be looked through from where the component is used.
 */
function walkChain(chain, file, report, depth) {
    const { path, source } = file;
    const stack = [];
    for (const match of source.matchAll(/<(\/?)(?:([A-Za-z][\w.-]*)(?=[\s/>])|(?=>))/g)) {
        if (match[1]) {
            const at = stack.map((item) => item.name).lastIndexOf(match[2] ?? '');
            if (at >= 0) stack.length = at;
            continue;
        }
        const tag = match[2] ? readTag(source, match.index) : { name: '', attrs: '', selfClosing: false, start: match.index };
        if (!tag) continue;
        const own = utilitiesOf(tag.attrs);
        // A component known by its source: its root's classes, with the caller's className on top.
        const def = /^[A-Z]/.test(tag.name) ? resolveComponent(chain, file, tag.name, depth) : null;
        const element = { name: tag.name, classes: def ? mergedClasses(def.classes, own) : own, start: tag.start, def };
        // A box that scrolls sideways (a code block, a table wrapper) asks its parents for its full content width just
        // like a truncated line: the scroll only starts once something above it is allowed to be narrower.
        const scrolls = [...element.classes].some((name) => /^overflow-(?:x-)?(?:auto|scroll)$/.test(name));
        const held = def?.file.carried.get(def.root.start) ?? (element.classes.has('truncate') || element.classes.has('text-ellipsis') ? 'truncate' : scrolls ? 'scroll' : null);
        if (held) {
            const capped = (item) => [...item.classes].some((name) => CAPPED.test(name));
            let item = element;
            let open = true;
            for (let index = stack.length - 1; index >= 0 && index >= stack.length - 8; index--) {
                const parent = stack[index];
                if (!parent.name) continue; // a fragment draws no box: its children belong to the box around it
                if (/^[A-Z]/.test(parent.name) && !parent.def && !parent.classes.size) { open = false; break; } // a component: its layout is elsewhere
                if (capped(item)) { open = false; break; }
                file.carried.set(item.start, held);
                // The truncated element itself is never the culprit (truncate clips); a component holding one may be.
                if ((item !== element || item.def) && (ROW_FLEX(parent.classes) || AUTO_GRID(parent.classes)) && ![...item.classes].some((name) => SHRINKS.test(name))) {
                    if (report) reportChain(chain, file, item, parent, held, element, report);
                    open = false;
                    break;
                }
                item = parent;
            }
            if (open && !capped(item)) file.carried.set(item.start, held);
        }
        if (!tag.selfClosing && !(VOID.has(tag.name) && !/^[A-Z]/.test(tag.name))) stack.push(element);
    }
}

/** Names the box that needs min-w-0: for a component, its root element in the file that defines it. */
function reportChain(chain, file, item, parent, held, element, report) {
    const at = item.def ? item.def.file : file;
    const start = item.def ? item.def.root.start : item.start;
    const key = `${at.path}:${start}`;
    if (chain.seen.has(key)) return;
    chain.seen.add(key);
    const name = item.def ? item.def.root.name : item.name;
    const kind = ROW_FLEX(parent.classes) ? 'flex' : 'grid';
    const what = held === 'scroll' ? (item.def ? 'a box that scrolls sideways' : `a box that scrolls sideways (<${element.name}>)`) : 'a truncated line';
    const where = item.def ? ` (the root of <${item.def.name}>, a ${kind} item at ${file.path}:${lineOf(file.source, item.start)})` : '';
    const ignored = at === file ? undefined : (chain.ignores.get(at.path) ?? chain.ignores.set(at.path, ignores(at.raw ?? '')).get(at.path));
    report('cell-holds-content', at.path, lineOf(at.source, start), `<${name || '>'}`, `<${name}>${where} is a ${kind} item holding ${what} but has no min-w-0: ${held === 'scroll' ? 'a long line widens the column instead of scrolling' : 'a long text widens it past its column'}`, ignored);
}

const POSITIONED = /^(?:relative|absolute|fixed|sticky)$/;
const SCROLLER = /^overflow-(?:x-)?(?:auto|scroll)$/;
/**
 * An absolute (or sr-only, which is absolute) element is clipped by a scroll box only when that box, or a box inside
 * it, is positioned. Inside a static scroller it takes its containing block from further up, escapes the scroll and
 * widens the page: a table's sr-only caption made a 390 px page 610 px wide.
 */
function checkScrollerPosition(path, source, report) {
    const stack = [];
    const reported = new Set();
    for (const match of source.matchAll(/<(\/?)(?:([A-Za-z][\w.-]*)(?=[\s/>])|(?=>))/g)) {
        if (match[1]) {
            const at = stack.map((item) => item.name).lastIndexOf(match[2] ?? '');
            if (at >= 0) stack.length = at;
            continue;
        }
        const tag = match[2] ? readTag(source, match.index) : { name: '', attrs: '', selfClosing: false, start: match.index };
        if (!tag) continue;
        const classes = utilitiesOf(tag.attrs);
        const element = { name: tag.name, classes, start: tag.start };
        if (classes.has('absolute') || classes.has('sr-only')) {
            for (let index = stack.length - 1; index >= 0; index--) {
                const box = stack[index];
                if (!box.name) continue;
                if ([...box.classes].some((name) => POSITIONED.test(name))) break;
                if (/^[A-Z]/.test(box.name) && !box.classes.size) break; // a component: it may be positioned inside
                if (![...box.classes].some((name) => SCROLLER.test(name))) continue;
                if (!reported.has(box.start)) {
                    reported.add(box.start);
                    const scroll = [...box.classes].find((name) => SCROLLER.test(name));
                    report('scroller-holds-absolute', path, lineOf(source, box.start), `<${box.name} ${scroll}>`, `<${box.name}> scrolls (${scroll}) but is not positioned, and holds <${tag.name}> that is ${classes.has('sr-only') ? 'sr-only' : 'absolute'}: it escapes the scroll box and widens the page; add relative to the scroller`);
                }
                break;
            }
        }
        if (!tag.selfClosing && !(VOID.has(tag.name) && !/^[A-Z]/.test(tag.name))) stack.push(element);
    }
}

/**
 * A snap row with side padding but no scroll padding: the padding shows at rest, but the first snap lands the card on
 * the scroller's edge, so the cards end flush with the screen. scroll-px-* gives the snap the same inset.
 */
function snapPadding(text) {
    const list = tokens(text);
    const names = list.map(utility);
    const snaps = names.includes('snap-x') || (names.some((name) => /^snap-(?:mandatory|proximity)$/.test(name)) && names.some((name) => /^overflow-(?:x-)?(?:auto|scroll)$/.test(name)));
    if (!snaps || names.some((name) => /^scroll-p[xsl]?-/.test(name))) return null;
    return list.find((token) => /^p[xsl]-/.test(utility(token))) ?? null;
}

/**
 * tailwind-merge drops a line height written before a font size: text-xl sets its own, so cn('leading-snug', 'text-xl')
 * renders at text-xl's 1.2 and leading-snug is gone. Only the merging helpers (cn, twMerge, tv); a plain class string
 * keeps both. text-xl/snug, or leading after the size, keeps it.
 */
const SIZE = /^text-(?:xs|sm|base|lg|[2-9]?xl|\[\d[^\]/]*\])$/;
function checkMergedLeading(path, source, report) {
    for (const match of source.matchAll(/(?<![\w.$])(?:cn|twMerge|tv)\s*\(/g)) {
        const open = match.index + match[0].length - 1;
        const end = balancedEnd(source, open, '(', ')');
        if (end < 0) continue;
        const unit = { index: match.index };
        const list = tokens(literals(source.slice(open, end)).join(' '));
        const variant = (token) => token.split(':').slice(0, -1).join(':');
        for (const [index, token] of list.entries()) {
            if (!/^leading-/.test(utility(token))) continue;
            const size = list.slice(index + 1).find((other) => SIZE.test(utility(other)) && variant(other) === variant(token));
            if (size) {
                report('leading-survives-merge', path, lineOf(source, unit.index), `${token} … ${size}`, `${token} comes before ${size} in a merging call: tailwind-merge drops it and the size's own line height wins; write ${size}/${utility(token).slice(8)} or put ${token} after it`);
                break;
            }
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

/** Tags whose presence makes a link's content a block (a tile), not a button label. An image alone does not: a logo
 * beside the label is a button too ("Continue with Google"). */
const BLOCK_CHILD = /<(?:div|p|h[1-6]|ul|ol|li|dl|section|article|header|footer|figure|picture|table)(?=[\s/>])/;
/** Elements directly inside a fragment of JSX children that hold something; icons (svg, *Icon, <i>) and self-closing
 * tags (a lucide <ArrowRight />, a logo <img />) do not count. */
function topLevelElements(markup) {
    let count = 0;
    let depth = 0;
    for (const match of markup.matchAll(/<(\/?)([A-Za-z][\w.-]*)?/g)) {
        if (match[1]) {
            depth = Math.max(0, depth - 1);
            continue;
        }
        if (!match[2]) continue;
        const tag = readTag(markup, match.index);
        if (!tag) continue;
        if (depth === 0 && !tag.selfClosing && !/^(?:svg|i|[A-Z]\w*Icon)$/.test(tag.name)) count++;
        if (!tag.selfClosing) depth++;
    }
    return count;
}
/**
 * A link laid out as a card: a column, full height, a grid, padding of 16 px or more on every side, or children that
 * are blocks (a title and a line of text). LinkButton is for a link that looks like a button, not for a clickable tile.
 */
function cardLink(source, tag, text) {
    const list = tokens(text).map(utility);
    if (list.some((name) => /^(?:flex-col|flex-col-reverse|h-full|grid|inline-grid)$/.test(name))) return true;
    if (list.some((name) => /^p-(?:\d+(?:\.\d+)?|\[\d+(?:\.\d+)?(?:px|rem)\])$/.test(name) && (name.startsWith('p-[') ? parseFloat(name.slice(3)) * (name.endsWith('rem]') ? 16 : 1) >= 16 : Number(name.slice(2)) >= 4))) return true;
    const inner = children(source, tag);
    if (inner === null) return true; // more than a label's worth of markup
    return BLOCK_CHILD.test(inner) || topLevelElements(inner) >= 2;
}

function checkLooks(config, path, source, report) {
    if (matches(config.componentDirs, path)) return;
    const looks = Object.values(config.looks);
    for (const tag of tags(source, looks.flatMap((look) => look.tags))) {
        const raw = parseAttrs(tag.attrs).className ?? parseAttrs(tag.attrs).class;
        if (raw === undefined) continue;
        const text = typeof raw === 'string' ? raw : classUnits(`className={${raw.code}}`, config.classFunctions).map((unit) => unit.text).join(' ');
        const look = looks.find((item) => item.tags.includes(tag.name) && item.test(text));
        if (look?.name === 'button link' && cardLink(source, tag, text)) continue;
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
    // skipped: the inline ignores of another file, for a finding named where its fix goes (a component's root).
    const report = (id, path, line, value, message, skipped = skip) => {
        const rule = catalogue.rules.find((item) => item.id === id);
        const severity = severityOf(rule);
        if (severity === 'off' || allowed(config, id, path, value) || skipped(id, line)) return null;
        const finding = { rule: id, area: rule.area, severity, path, line, value, message: message ?? rule.title.en };
        findings.push(finding);

        return finding;
    };

    const files = [...new Set(config.include.flatMap((start) => walk(cwd, start, config.ignore)))];
    const active = catalogue.rules.filter((rule) => rule.check && severityOf(rule) !== 'off');
    const classRules = active.filter((rule) => rule.check.type === 'class');
    const regexRules = active.filter((rule) => rule.check.type === 'regex');
    const repeated = active.find((rule) => rule.check.type === 'repeated-markup');
    const snapRule = active.some((rule) => rule.check.type === 'snap-padding');
    const groups = new Map();
    // Shared by every file of the run: components are looked through across files, each culprit named once.
    const chain = { cwd, ignore: config.ignore, files: new Map(), seen: new Set(), ignores: new Map() };

    for (const path of files) {
        let extension = extensionOf(path);
        if (extension === 'js' && looksLikeJsx(readFileSync(join(cwd, path), 'utf8'))) extension = 'jsx';
        const isI18n = config.i18n.files.length > 0 && matches(config.i18n.files, path);
        const markup = MARKUP.includes(extension);
        const regexFor = regexRules.filter((rule) => rule.check.files.includes(extension) && !(isI18n && !['no-buzzwords', 'error-copy', 'ellipsis-character'].includes(rule.id)));
        if (!markup && !STYLESHEET.includes(extension) && regexFor.length === 0 && !NATIVE.includes(extension) && !isI18n) continue;

        const raw = readFileSync(join(cwd, path), 'utf8');
        if (STYLESHEET.includes(extension) && (VENDOR_PATH.test(path) || VENDOR_CSS.test(raw))) continue;
        skip = ignores(raw); // inline ignores live in comments, so they are read before comments are blanked
        const source = markup ? blankMarkupComments(raw) : raw;
        const reactNative = SCRIPT.includes(extension) && REACT_NATIVE.test(source);
        const platform = reactNative ? 'rn' : extension;
        const nativeFor = NATIVE.includes(extension) || reactNative ? active.filter((rule) => rule.check.native?.[platform]) : [];

        if (markup) {
            for (const unit of classUnits(source, config.classFunctions)) {
                const line = lineOf(source, unit.index);
                const seen = new Set();
                // One pattern with the rule's options, or a list: an object entry carries its own (Bootstrap's classes beside Tailwind's).
                for (const rule of classRules.filter((item) => item.check.pattern)) for (const entry of [rule.check.pattern].flat()) {
                    const check = typeof entry === 'string' ? rule.check : entry;
                    const pattern = typeof entry === 'string' ? entry : entry.pattern;
                    if (check.with && !new RegExp(check.with, 'u').test(unit.text)) continue;
                    if (check.unless && new RegExp(check.unless, 'u').test(unit.text)) continue;
                    if (check.exceptElements && unit.element && new RegExp(check.exceptElements).test(unit.element)) continue;
                    if (check.onlyElements && !(unit.element && new RegExp(check.onlyElements).test(unit.element))) continue;
                    // The element's own attributes can rule it out (type="file" has no text to zoom on).
                    if (check.unlessTag) {
                        const next = source.indexOf('<', unit.index);
                        if (new RegExp(check.unlessTag, 'u').test(source.slice(source.lastIndexOf('<', unit.index), next < 0 ? undefined : next))) continue;
                    }
                    // A wrapper just above may carry the style (focus-within: ring on the box around an input).
                    if (check.unlessBefore && new RegExp(check.unlessBefore, 'u').test(source.slice(Math.max(0, unit.index - 1500), unit.index))) continue;
                    for (const match of unit.text.matchAll(new RegExp(pattern, 'gu'))) {
                        // A value on the project's scale (mt-[24px] on a 4 px grid) and hairlines (1–2 px) pass.
                        if (check.scale && onScale(spacing().web, Number(match[1]), match[0])) continue;
                        // Two entries may find the same class (fw-bolder on an h1 that is also .display-4): one finding.
                        if (seen.has(`${rule.id}:${match.index}`)) continue;
                        seen.add(`${rule.id}:${match.index}`);
                        report(rule.id, path, line, match[0].trim(), check.scale ? `Off the spacing scale, ${describeScale(spacing().web)}: ${match[0].trim()}` : `${rule.title.en}: ${match[0].trim()}`);
                    }
                }
                if (snapRule) {
                    const pad = snapPadding(unit.text);
                    if (pad) report('snap-scroll-padding', path, line, pad, `Snap scroller with ${pad} but no scroll padding: the first card snaps flush to the edge; add scroll-${utility(pad)} to match it`);
                }
                if (repeated) {
                    const key = signature(unit.text);
                    if (key.split(' ').length >= repeated.check.minTokens) groups.set(key, [...(groups.get(key) ?? []), { path, line, skip: skip('repeated-markup', line) }]);
                }
            }
        }
        // Class rules that also need the element's text (an all-caps label written by hand).
        if (markup) {
            for (const rule of classRules.filter((item) => item.check.markup)) for (const markupPattern of [rule.check.markup].flat()) {
                for (const match of source.matchAll(new RegExp(markupPattern, 'gu'))) report(rule.id, path, lineOf(source, match.index), match[1] ?? match[0], `${rule.title.en}: ${(match[1] ?? match[0]).trim()}`);
            }
        }
        if (STYLESHEET.includes(extension) || markup) {
            const sheet = sheetOf(extension, source);
            const { css } = sheet;
            for (const rule of classRules.filter((item) => item.check.css)) for (const entry of [rule.check.css].flat()) {
                if (typeof entry !== 'string') {
                    // Declaration by declaration: each length of a shorthand, each gradient, each offending block.
                    for (const hit of cssHits(sheet, entry)) {
                        let message = `${rule.title.en}: ${hit.value}`;
                        if (entry.scale === 'spacing') {
                            const px = hit.unit === 'px' ? hit.number : spacing().rem ? hit.number * spacing().rem : null;
                            // 0, hairlines and the negative of a step pass; a rem with an unknown root size is not guessed.
                            if (px === null || onScale(spacing().web, Math.abs(px), hit.property)) continue;
                            message = `Off the spacing scale, ${describeScale(spacing().web)}: ${hit.value}${hit.unit === 'rem' ? ` (${Math.round(Math.abs(px) * 100) / 100}px)` : ''} in ${hit.property}`;
                        } else if (entry.scale === 'radius') {
                            if (hit.unit !== 'px' || onRadiusScale(Math.abs(hit.number))) continue;
                            message = `Corner radius off the steps (${RADIUS_STEPS.join(', ')} px; up to 5 px and 999 px or more pass): ${hit.value} in ${hit.property}`;
                        }
                        const finding = report(rule.id, path, lineOf(source, hit.index), hit.value, message);
                        // Where the text sits and which property it belongs to, for --fix; not part of the report.
                        if (finding) Object.defineProperties(finding, { offset: { value: hit.index }, css: { value: hit.property } });
                    }
                    continue;
                }
                let reported = false;
                for (const match of css.matchAll(new RegExp(entry, 'gu'))) {
                    if (reported && rule.check.cssOnePerFile) break;
                    if (rule.check.unlessMedia && atRulesAround(css, match.index).some((at) => new RegExp(rule.check.unlessMedia, 'iu').test(at))) continue;
                    const value = match[0].replace(/\s+/g, ' ').trim();
                    reported = Boolean(report(rule.id, path, lineOf(source, match.index), value, `${rule.title.en}: ${value}`)) || reported;
                }
            }
        }
        // Code rules read code and copy, not comments (inline ignores were read above, before blanking).
        const code = ['tsx', 'jsx', 'ts', 'js', 'vue', 'svelte', 'css', 'scss', ...NATIVE].includes(extension) ? blankComments(source, extension !== 'css') : source;
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
        if (on('icon-button-name') && HTML_LIKE.includes(extension)) checkMarkupIconButtons(path, source, report);
        if (on('cell-holds-content') && MARKUP.includes(extension)) checkMinWidthChain(chain, path, source, raw, report);
        if (on('scroller-holds-absolute') && MARKUP.includes(extension)) checkScrollerPosition(path, source, report);
        if (on('leading-survives-merge') && (MARKUP.includes(extension) || SCRIPT.includes(extension))) checkMergedLeading(path, source, report);
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
        else if ([...MARKUP, ...NATIVE, ...SCRIPT, ...STYLESHEET].includes(extensionOf(path)) || config.include.includes(path) || matches(config.i18n.files, path)) read++;
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
