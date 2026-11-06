import { contrast, hexToOklch, withContrast } from '../color.js';
import { sizesInUse, topKey } from './measure.js';

/**
 * From a measured page to design decisions. The site's own system is the starting point: its fonts, brand colour,
 * components, icons and pictures stay. A decision is a change with numbers ("body 14 → 16 px", "accent text #00a99b →
 * #00786e"), made here so the agent that applies it chooses nothing, and grouped into passes in the order that fixes
 * the most for the least risk: type, colour, rhythm, details, phone. A page that is already sound gets few or none.
 * What a section should show is not decided here: that takes the study in study.js.
 */

const SPACE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128];
const nearest = (value, scale) => scale.reduce((best, item) => (Math.abs(item - value) < Math.abs(best - value) ? item : best));

/** A type scale built from the site's body size and a ratio, with each size in use mapped onto it. */
export function typeScale(body, ratio, inUse, from = body) {
    const steps = [-2, -1, 0, 1, 2, 3, 4, 5].map((step) => Math.round(body * ratio ** step));
    const scale = [...new Set(steps.map((size) => (size < 12 ? 12 : size)))];
    // Sizes move with the body: 14 → 16 takes 18 to about 20, then each lands on the nearest step.
    const map = Object.fromEntries(inUse.map((size) => [size, size === from ? body : nearest((size * body) / from, scale)]).filter(([size, to]) => Number(size) !== to));

    return { scale, map };
}

function share(map, test) {
    const entries = Object.entries(map);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

    return entries.filter(([key]) => test(Number(key))).reduce((sum, [, count]) => sum + count, 0) / total;
}

/**
 * @param {{desktop: object, mobile: object}} page  measure() output
 * @param {{kind?: 'marketing'|'app'}} options
 */
export function diagnose(page, { kind = 'marketing' } = {}) {
    const { desktop, mobile } = page;
    const m = desktop.metrics;
    const sys = desktop.system;
    const passes = { type: [], color: [], rhythm: [], details: [], phone: [] };
    const keep = [];
    const finding = (pass, id, evidence, decision) => passes[pass].push({ id, evidence, decision });

    // What stays: the identity the page already has.
    const font = topKey(sys.fonts);
    const brand = topKey(sys.buttonFills) && hexToOklch(topKey(sys.buttonFills)).c > 0.05 ? topKey(sys.buttonFills) : m.accents[0] ?? null;
    keep.push(`Fonts: ${font}${sys.headingFont && sys.headingFont !== font ? ` (text) and ${sys.headingFont} (headings)` : ''}`);
    if (brand) keep.push(`Brand colour ${brand}`);
    // A low ratio on a button is reported, never fixed by swapping its text colour: that is the owner's call.
    if (brand) keep.push(`Filled buttons keep their fill and their text colour exactly as they are, even where the ratio is low (white on ${brand} is ${contrast(brand, '#ffffff').toFixed(1)}:1)`);
    keep.push('Every component, icon, illustration, photograph, section and word on the page, and the order of the sections');

    // Type
    const inUse = sizesInUse(sys.sizes);
    const body = Number(topKey(sys.sizes));
    const h1 = m.h1;
    if (h1) keep.push(`The headline stays ${h1.size} px or larger, and the first screen keeps its height`);
    // Sizes change only where they break something: a page with a short list of sizes keeps them.
    const tiny = inUse.filter((size) => size < 13);
    if (tiny.length) finding('type', 'small-text', `Text at ${tiny.join(', ')} px`, `Nothing under 13 px: ${tiny.map((size) => `${size} → 13`).join(', ')}`);
    const smallRunning = m.paragraphs.filter((item) => item.size && item.size < 16).length;
    if (kind === 'marketing' && smallRunning >= 2) finding('type', 'running-text', `${smallRunning} paragraphs of running text under 16 px`, 'Paragraphs of 80 characters or more: 16 px, line height 1.55. Labels, tags and card meta keep their sizes');
    if (inUse.length > 7) {
        const { scale, map } = typeScale(body, 1.25, inUse.filter((size) => size < (h1?.size ?? Infinity)), body);
        finding('type', 'type-scale', `${inUse.length} text sizes in use: ${inUse.join(', ')} px`, `One scale, ratio 1.25: ${scale.join(', ')} px. Map ${Object.entries(map).map(([from, to]) => `${from} → ${to}`).join(', ')}. Sizes above the map and the headline do not change`);
    }
    if (h1 && kind === 'marketing' && h1.size / body < 3) finding('type', 'headline-ratio', `The headline is ${h1.size} px on ${body} px text (${(h1.size / body).toFixed(1)}×)`, `Headline ${h1.size} → clamp(${Math.round(body * 2.6)}px, 6vw, ${Math.round(body * 4.5)}px); weight 600, tracking -0.03em, line height 1.05`);
    if (h1 && h1.lines >= 3) finding('type', 'headline-lines', `The headline wraps to ${h1.lines} lines on desktop`, 'Headline on at most two lines: widen its box or balance it (text-wrap: balance); keep the words and the size');
    const long = m.paragraphs.filter((item) => item.chars > 85).length;
    if (long >= 2) finding('type', 'measure', `${long} paragraphs run past 85 characters a line`, 'Running text max-width 65ch');

    // Colour
    if (m.accents.length > 1) finding('color', 'one-accent', `${m.accents.length} accent fills on buttons: ${m.accents.join(', ')}`, `One accent: ${brand}. Other fills become neutral (surface + border) unless they mean danger or success in a form`);
    // Text on the brand's own button fill stays as it is (the brand is fixed): reported, never a target a pass must meet.
    const onBrand = (item) => brand && item.bg && item.bg.toLowerCase() === brand.toLowerCase();
    const branded = m.contrast.filter((item) => item.ratio < 4.5 && onBrand(item));
    const reportOnly = branded.length ? [`Brand colour, report only: ${branded.slice(0, 4).map((item) => `"${item.text}" ${item.ratio}:1 on ${brand}`).join(', ')}. No pass changes it; the person may change the brand colour itself.`] : [];
    const failures = m.contrast.filter((item) => item.ratio < 4.5 && !onBrand(item));
    if (failures.length) {
        const decisions = [];
        if (brand) {
            const ink = contrast(brand, '#ffffff') >= 4.5 ? null : withContrast(brand, '#ffffff', 4.5);
            if (ink) decisions.push(`Text and labels in the brand colour on white: ${brand} → ${ink} (${contrast(ink, '#ffffff').toFixed(1)}:1)`);
        }
        decisions.push('Grey text on white at least 4.5:1 (#6b7280 or darker on white); on dark grounds at least 4.5:1');
        finding('color', 'contrast', `${failures.length} text boxes under WCAG AA, e.g. ${failures.slice(0, 4).map((item) => `"${item.text}" ${item.ratio}:1`).join(', ')}`, decisions.join('. '));
    }
    if (m.gradientText) finding('color', 'gradient-text', `${m.gradientText} gradient-filled text`, 'Solid text colour; emphasis by weight or size');

    // Rhythm
    const onGrid = share(sys.spaces, (value) => value % 4 <= 1 || value % 4 >= 3);
    const distinctSpaces = Object.keys(sys.spaces).length;
    if (onGrid < 0.6 || distinctSpaces > 28) finding('rhythm', 'spacing', `${Math.round(onGrid * 100)}% of spacing on the 4 px grid, ${distinctSpaces} different values`, `Spacing only from ${SPACE.join(', ')} px; section padding one value (96 px desktop, 64 px phone); gaps inside a section smaller than the gap between sections`);
    const radii = Object.entries(sys.radii).sort((a, b) => b[1] - a[1]).map(([value]) => Number(value));
    if (radii.length > 4) {
        const card = radii.find((value) => value >= 8) ?? 12;
        finding('rhythm', 'radius', `${radii.length} corner radii: ${radii.slice(0, 8).join(', ')} px`, `Three radii: ${Math.max(4, Math.round(card / 2 / 2) * 2)} px (inputs, tags), ${card} px (buttons, cards), ${card + 8} px (large panels); pills stay round`);
    }
    if (m.edges > 4) finding('rhythm', 'edges', `Text starts at ${m.edges} different left edges`, 'One container width for every section (the most used one); headings and text inside a section share the left edge');
    if (m.emptiest > m.viewportHeight / 2) finding('rhythm', 'hole', `An empty stretch ${m.emptiest} px tall`, 'Close the hole: no blank stretch taller than half a screen');

    // Details
    if (m.smallTargetCount) finding('details', 'tap-target', `${m.smallTargetCount} links or buttons smaller than 24 px, e.g. ${m.smallTargets.slice(0, 3).map((item) => `"${item.text}" ${item.width}×${item.height}`).join(', ')}`, 'Interactive targets at least 24×24 px on desktop (padding, not a bigger icon)');
    if (m.restingShadows) finding('details', 'shadow', `${m.restingShadows} resting cards with a heavy shadow`, 'Resting cards: 1 px border, no shadow; shadow only on things that float (menus, dialogs)');
    if (m.eyebrows.length) finding('details', 'eyebrow', `Eyebrow labels above headings: ${m.eyebrows.slice(0, 4).map((text) => `"${text}"`).join(', ')}`, 'Remove the eyebrow styling (pill, tracked uppercase); keep the words only if they add information, as plain text in the lead');
    if (m.numbering.length >= 2) finding('details', 'numbering', `Decorative numbering ${m.numbering.join(', ')}`, 'Drop the 01/02/03 labels unless the order is the point (real steps)');

    // Phone
    const p = mobile?.metrics;
    if (p?.overflow) finding('phone', 'overflow', `The page is ${p.overflow} px wide on a 390 px phone`, 'Nothing wider than the screen: wrap rows, let wide tables scroll inside their own box');
    if (p?.smallTargetCount) finding('phone', 'tap-target', `${p.smallTargetCount} targets under 44 px on the phone`, 'Tap targets at least 44×44 px on phones');
    if (p?.h1 && p.h1.lines > 4) finding('phone', 'headline-lines', `The headline takes ${p.h1.lines} lines on the phone`, `Phone headline about ${Math.round(body * 2.4)} px so it fits in three lines`);

    const list = Object.entries(passes).filter(([, items]) => items.length).map(([name, items]) => ({ name, items }));

    return { keep, brand, font, headingFont: sys.headingFont, body, reportOnly, passes: list, sound: list.length === 0, facts: { heroPhoto: Boolean(m.heroPhoto), moving: m.moving ?? 0 } };
}

/** DESIGN.md: what the page is now, what stays, and the decisions per pass. */
export function designMd(page, diagnosis) {
    const sys = page.desktop.system;
    const lines = [
        `# Design: ${page.desktop.title}`,
        '',
        `Measured from ${page.desktop.url} by @enmera/ai-design-check redesign. The decisions below are the numbered fixes; the section ideas are in BRIEF.md.`,
        '',
        '## Keep',
        '',
        ...diagnosis.keep.map((item) => `- ${item}`),
        '',
        '## Now',
        '',
        `- Background ${sys.background}; text sizes in use ${sizesInUse(sys.sizes).join(', ')} px; body ${diagnosis.body} px`,
        `- Corner radii ${Object.keys(sys.radii).slice(0, 10).join(', ')} px`,
        `- Fills ${Object.entries(sys.fills).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([hex]) => hex).join(', ')}`,
        '',
    ];
    if (diagnosis.sound) lines.push('## Decisions', '', 'None: the page is sound. Leave it as it is.', '');
    for (const pass of diagnosis.passes) {
        lines.push(`## Pass: ${pass.name}`, '');
        for (const item of pass.items) lines.push(`- **${item.id}**: ${item.decision}`, `  - Now: ${item.evidence}`);
        lines.push('');
    }

    return `${lines.join('\n').trimEnd()}\n`;
}
