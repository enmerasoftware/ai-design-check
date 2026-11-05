import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, hexToOklch, luminance, oklchToHex, round, withContrast } from './color.js';

/**
 * Design system generator: from a product character, a brand color and the kind of screen it decides the fonts and
 * their sizes, weights, line heights and letter-spacing, the colors of every surface, text, border, button, badge and
 * chart in light and dark, the radius and spacing scale. Every text color is checked against each ground it sits on
 * (GROUNDS; WCAG 2: 4.5 for text) and moved until it passes on all of them.
 */

const LIBRARY = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fonts.json'), 'utf8'));

/** Character defaults: brand hue when no brand is given, corner radius, neutral tint and the type ratio. */
export const CHARACTERS = {
    calm: { hue: 200, radius: 10, tint: 0.008, ratio: 1.2 },
    precise: { hue: 255, radius: 6, tint: 0.006, ratio: 1.15 },
    friendly: { hue: 150, radius: 14, tint: 0.01, ratio: 1.2 },
    warm: { hue: 45, radius: 12, tint: 0.012, ratio: 1.2 },
    bold: { hue: 25, radius: 8, tint: 0.006, ratio: 1.3 },
    editorial: { hue: 30, radius: 4, tint: 0.008, ratio: 1.25 },
    luxurious: { hue: 80, radius: 2, tint: 0.01, ratio: 1.3 },
    playful: { hue: 330, radius: 18, tint: 0.012, ratio: 1.25 },
    technical: { hue: 160, radius: 6, tint: 0.006, ratio: 1.15 },
    trustworthy: { hue: 235, radius: 8, tint: 0.008, ratio: 1.2 },
};

export const KINDS = ['dashboard', 'app', 'marketing', 'reading'];

export const library = () => LIBRARY;

export function family(name) {
    const found = LIBRARY.families.find((item) => item.name.toLowerCase() === String(name).toLowerCase());
    if (!found) throw new Error(`Unknown font: ${name}. See: npx @enmera/ai-design-check fonts`);

    return found;
}

/** Fonts for a character: the chosen pairing plus ranked alternatives for each role. */
export function fontsFor(character, { source = 'google' } = {}) {
    const pairing = LIBRARY.pairings[character];
    if (!pairing) throw new Error(`Unknown character: ${character}. Pick one of ${Object.keys(CHARACTERS).join(', ')}`);
    const pool = LIBRARY.families.filter((item) => source === 'any' || item.source === source);
    const rank = (role) => pool.filter((item) => item.roles.includes(role)).sort((a, b) => Number(b.characters.includes(character)) - Number(a.characters.includes(character)) || b.characters.indexOf(character) - a.characters.indexOf(character));

    return {
        ui: family(pairing.ui),
        display: family(pairing.display),
        numeric: family(pairing.numeric),
        mono: family(pairing.mono),
        alternatives: {
            ui: rank('ui').filter((item) => item.characters.includes(character)).map((item) => item.name),
            display: rank('display').filter((item) => item.characters.includes(character)).map((item) => item.name),
            adobe: LIBRARY.families.filter((item) => item.source === 'adobe' && item.characters.includes(character)).map((item) => item.name),
        },
    };
}

/**
 * Letter-spacing in em by size: large type is set tighter, small type a touch looser, body text as drawn.
 * A family's own `tracking` is added at display sizes (24 px and up).
 */
export function trackingFor(size, font) {
    const base = size >= 48 ? -0.03 : size >= 32 ? -0.02 : size >= 24 ? -0.015 : size >= 20 ? -0.01 : size <= 12 ? 0.01 : size <= 13 ? 0.005 : 0;

    return round(base + (size >= 24 ? font?.tracking ?? 0 : 0), 3);
}

/** Line height by size: body text reads at 1.5, headings close up as they grow. */
export const leadingFor = (size) => (size <= 13 ? 1.45 : size <= 18 ? 1.5 : size <= 24 ? 1.3 : size <= 36 ? 1.2 : 1.1);

/** Type roles per kind of screen, in px. Apps follow the iOS text styles so they map to Dynamic Type. */
const SIZES = {
    dashboard: { caption: 12, label: 13, body: 14, title: 16, heading: 20, page: 24, display: 30, stat: 28 },
    app: { caption: 12, label: 13, body: 17, title: 17, heading: 20, page: 28, display: 34, stat: 34 },
    marketing: { caption: 13, label: 14, body: 18, title: 20, heading: 28, page: 40, display: 56, stat: 48 },
    reading: { caption: 13, label: 14, body: 19, title: 20, heading: 26, page: 36, display: 48, stat: 36 },
};

/** iOS text style each app role maps to (Dynamic Type), and the Material 3 role on Android. */
const NATIVE_STYLES = {
    caption: ['caption', 'labelSmall'], label: ['footnote', 'labelMedium'], body: ['body', 'bodyLarge'], title: ['headline', 'titleMedium'],
    heading: ['title3', 'titleLarge'], page: ['title', 'headlineMedium'], display: ['largeTitle', 'displaySmall'], stat: ['largeTitle', 'displaySmall'],
};

const USES = {
    caption: 'Timestamps, helper text under fields, chart axis labels',
    label: 'Buttons, form labels, table headers, menu items, badges',
    body: 'Running text, table cells, list rows, descriptions',
    title: 'Card and section titles, dialog titles, list item names',
    heading: 'Headings inside a page, empty-state titles',
    page: 'The page title, once per screen',
    display: 'Hero headline on landing pages, onboarding titles',
    stat: 'Key numbers on stat cards and balances (tabular figures)',
};

export function typeScale(kind, fonts, character) {
    const sizes = SIZES[kind];
    const displayWeight = fonts.display.category === 'serif' ? 400 : 600;

    return Object.fromEntries(Object.entries(sizes).map(([role, size]) => {
        const font = ['display', 'page'].includes(role) || (role === 'heading' && kind !== 'dashboard') ? fonts.display : role === 'stat' ? fonts.numeric : fonts.ui;
        const weight = role === 'body' || role === 'caption' ? 400 : role === 'label' ? 500 : ['display', 'page'].includes(role) ? displayWeight : 600;

        return [role, {
            font: font.name, size, weight: font.weights.includes(weight) ? weight : font.weights.reduce((best, item) => (Math.abs(item - weight) < Math.abs(best - weight) ? item : best)),
            lineHeight: leadingFor(size), letterSpacing: trackingFor(size, font), tabular: role === 'stat' || undefined,
            ios: NATIVE_STYLES[role][0], android: NATIVE_STYLES[role][1], use: USES[role],
        }];
    }));
}

const tone = (h, c) => (l) => oklchToHex({ l, c, h });

/** Status colors by hue. */
const STATUS = { success: 150, warning: 75, danger: 27, info: 245 };

/**
 * Every ground each text color sits on, from the component map and the preview: the page, cards and the sidebar,
 * plus badges and the selected nav item (muted), pills (the soft grounds), buttons (the fills) and tooltips (text
 * inverted). The generator moves each text color, or for an ink its fill, until it passes on all of its grounds;
 * the report lists the same pairs.
 */
const PAGE = ['bg', 'surface', 'subtle'];
const GROUNDS = {
    text: [...PAGE, 'muted'],
    textSecondary: [...PAGE, 'muted'],
    textTertiary: PAGE,
    accentInk: ['accent', 'accentHover'],
    accentText: [...PAGE, 'accentSoft'],
    ...Object.fromEntries(Object.keys(STATUS).flatMap((name) => [[`${name}Ink`, [name]], [`${name}Text`, [...PAGE, `${name}Soft`]]])),
    surface: ['text'],
};

/** Body and secondary text keep their steps above the rest; everything else needs WCAG 2 AA for text. */
const TARGETS = { text: 12, textSecondary: 7 };
const targetOf = (role) => TARGETS[role] ?? 4.5;

/**
 * Moves a color's lightness until it reaches the target on every ground. All the grounds lie on one side of the
 * text (light ones in light mode), so each step away from one is a step away from all: the move is only as large as
 * the hardest ground needs.
 */
const readable = (color, grounds, target) => grounds.reduce((moved, ground) => withContrast(moved, ground, target), color);

/**
 * A hover fill at least 0.05 lighter or darker and 1.15:1 apart, so the change shows, with its ink still at 4.5.
 * It moves away from the ink, so the label gains contrast; toward it only when the range ends (black or white brands).
 */
function hoverOf(fill, ink) {
    const { l, c, h } = hexToOklch(fill);
    const away = luminance(ink) > luminance(fill) ? -0.01 : 0.01;
    for (const step of [away, -away]) {
        for (let next = l + 5 * step; next >= 0 && next <= 1; next += step) {
            const candidate = oklchToHex({ l: next, c, h });
            if (contrast(candidate, ink) < 4.5) break;
            if (contrast(candidate, fill) >= 1.15) return candidate;
        }
    }

    return fill;
}

/** Colors for one theme. `dark` flips the lightness steps; every text color is pushed to its target on each of its grounds. */
function theme(brand, character, dark) {
    const { tint } = CHARACTERS[character];
    const { h, c } = brand;
    const neutral = tone(h, tint);
    // The lightest steps take half the tint, or a white page reads colored.
    const paper = tone(h, dark ? tint : tint / 2);
    const steps = dark
        ? { bg: 0.17, surface: 0.205, subtle: 0.235, muted: 0.27, border: 0.3, borderStrong: 0.38 }
        : { bg: 0.985, surface: 1, subtle: 0.965, muted: 0.94, border: 0.91, borderStrong: 0.85 };
    const bg = paper(steps.bg);
    const surface = dark ? neutral(steps.surface) : '#ffffff';
    const colors = { bg, surface, subtle: paper(steps.subtle), muted: neutral(steps.muted), border: neutral(steps.border), borderStrong: neutral(steps.borderStrong) };
    // Grounds come first, so a text color can be fitted to all of the ones it sits on.
    const fit = (role, start) => readable(start, GROUNDS[role].map((name) => colors[name]), targetOf(role));
    colors.text = fit('text', neutral(dark ? 0.96 : 0.21));
    colors.textSecondary = fit('textSecondary', neutral(dark ? 0.8 : 0.42));
    colors.textTertiary = fit('textTertiary', neutral(dark ? 0.66 : 0.55));
    // Accent: the brand itself when it can carry text on it, else moved until it can. Ink is white or near-black, whichever reads.
    let accent = oklchToHex({ l: dark ? Math.max(brand.l, 0.62) : Math.min(brand.l, 0.62), c, h });
    const ink = (fill) => (contrast(fill, '#ffffff') >= contrast(fill, neutral(0.18)) ? '#ffffff' : neutral(0.18));
    // A fill moves until its ink passes, as little as it takes: lighter under near-black ink, darker under white.
    const carry = (fill) => (contrast(fill, ink(fill)) < 4.5 ? withContrast(fill, ink(fill), 4.5) : fill);
    accent = carry(accent);
    const accentInk = ink(accent);
    colors.accent = accent;
    colors.accentHover = hoverOf(accent, accentInk);
    colors.accentInk = accentInk;
    colors.accentSoft = oklchToHex({ l: dark ? 0.28 : 0.95, c: Math.min(c, 0.03), h });
    colors.accentText = fit('accentText', accent);
    colors.focus = accent;
    for (const [name, hue] of Object.entries(STATUS)) {
        const fill = carry(oklchToHex({ l: dark ? 0.68 : 0.58, c: 0.15, h: hue }));
        colors[name] = fill;
        colors[`${name}Ink`] = ink(fill);
        colors[`${name}Soft`] = oklchToHex({ l: dark ? 0.27 : 0.96, c: 0.04, h: hue });
        colors[`${name}Text`] = fit(`${name}Text`, fill);
    }
    // Charts: one series carries the accent, the rest stay quiet; categories share one lightness.
    colors.chartHighlight = accent;
    colors.chartMuted = neutral(dark ? 0.42 : 0.82);
    colors.chartGrid = neutral(dark ? 0.26 : 0.93);
    colors.chartCategories = [0, 72, 144, 216, 288].map((shift) => oklchToHex({ l: dark ? 0.7 : 0.62, c: 0.12, h: (h + shift) % 360 }));

    return colors;
}

/** Where each color goes. Values are color token names; the generator writes them for web, SwiftUI and Compose. */
export const COMPONENTS = {
    page: { background: 'bg', text: 'text', use: 'The app or page background behind everything' },
    sidebar: { background: 'subtle', text: 'textSecondary', border: 'border', use: 'Navigation column; quieter than the content' },
    navItemSelected: { background: 'muted', text: 'text', use: 'The current page in the navigation; no accent fill' },
    card: { background: 'surface', border: 'border', text: 'text', use: 'Cards, panels and table containers; a border instead of a heavy shadow' },
    cardTitle: { text: 'text', type: 'title' },
    cardMeta: { text: 'textTertiary', type: 'caption' },
    buttonPrimary: { background: 'accent', text: 'accentInk', hover: 'accentHover', use: 'One per screen: the main action' },
    buttonSecondary: { background: 'surface', text: 'text', border: 'borderStrong', hover: 'subtle', use: 'Other actions next to the primary one' },
    buttonGhost: { background: 'transparent', text: 'textSecondary', hover: 'subtle', use: 'Toolbar and row actions' },
    buttonDanger: { background: 'danger', text: 'dangerInk', use: 'Delete and other destructive confirms, only inside a confirm step' },
    input: { background: 'surface', text: 'text', placeholder: 'textTertiary', border: 'borderStrong', focus: 'focus', use: 'Text fields, selects, search' },
    badge: { background: 'muted', text: 'textSecondary', use: 'Neutral status and counts' },
    badgeAccent: { background: 'accentSoft', text: 'accentText', use: 'New or selected state, at most one per row' },
    link: { text: 'accentText', use: 'Inline links and "View all"' },
    divider: { color: 'border', use: 'Row separators, table lines' },
    tableHeader: { background: 'surface', text: 'textTertiary', type: 'label', use: 'Column names, sentence case, no uppercase' },
    positive: { text: 'successText', background: 'successSoft', use: 'Up changes, paid, healthy' },
    negative: { text: 'dangerText', background: 'dangerSoft', use: 'Down changes, failed, overdue' },
    warning: { text: 'warningText', background: 'warningSoft', use: 'Needs attention soon' },
    chart: { highlight: 'chartHighlight', rest: 'chartMuted', grid: 'chartGrid', use: 'Highlight one series in the accent, the rest muted' },
    tooltip: { background: 'text', text: 'surface', use: 'Tooltips and toasts: inverted' },
};

/** Spacing on a 4 px grid and radii that nest (inner = outer - padding). */
export function shape(character, kind) {
    const radius = CHARACTERS[character].radius;
    const dense = kind === 'dashboard';

    return {
        space: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80],
        radius: { sm: Math.max(2, Math.round(radius / 2 / 2) * 2), md: radius, lg: radius + 4, xl: radius + 8, full: 999 },
        controlHeight: dense ? { sm: 28, md: 32, lg: 40 } : kind === 'app' ? { sm: 36, md: 44, lg: 52 } : { sm: 36, md: 40, lg: 48 },
        cardPadding: dense ? 16 : kind === 'app' ? 16 : 24,
        gap: dense ? 16 : 24,
        shadow: { card: 'none (border)', popover: '0 8px 24px rgb(0 0 0 / 0.12)' },
    };
}

/**
 * @param {{character?: string, brand?: string, kind?: string, ui?: string, display?: string, source?: string}} options
 */
export function designSystem({ character = 'calm', brand, kind = 'dashboard', ui, display, source = 'google' } = {}) {
    if (!CHARACTERS[character]) throw new Error(`Unknown character: ${character}. Pick one of ${Object.keys(CHARACTERS).join(', ')}`);
    if (!KINDS.includes(kind)) throw new Error(`Unknown kind: ${kind}. Pick one of ${KINDS.join(', ')}`);
    const brandColor = brand ? hexToOklch(brand) : { l: 0.55, c: 0.13, h: CHARACTERS[character].hue };
    const fonts = fontsFor(character, { source });
    if (ui) fonts.ui = family(ui);
    if (display) fonts.display = family(display);

    return {
        character, kind, brand: brand ?? oklchToHex(brandColor),
        fonts: { ui: fonts.ui.name, display: fonts.display.name, numeric: fonts.numeric.name, mono: fonts.mono.name, alternatives: fonts.alternatives, sources: Object.fromEntries([fonts.ui, fonts.display, fonts.numeric, fonts.mono].map((item) => [item.name, item.source])), categories: Object.fromEntries([fonts.ui, fonts.display, fonts.numeric, fonts.mono].map((item) => [item.name, item.category])) },
        type: typeScale(kind, fonts, character),
        color: { light: theme(brandColor, character, false), dark: theme(brandColor, character, true) },
        components: COMPONENTS,
        shape: shape(character, kind),
    };
}

/** Contrast table for the report: every text color on every ground it sits on (GROUNDS), with the ratio it needs. */
export function contrastReport(colors) {
    return Object.entries(GROUNDS).flatMap(([fg, grounds]) => grounds.map((bg) => ({ fg, bg, ratio: round(contrast(colors[fg], colors[bg]), 2), target: targetOf(fg) })));
}
