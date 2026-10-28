// RULES.md and RULES.tr.md are generated from rules.json. `--check` fails when they are out of date (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { areas, rules } = JSON.parse(readFileSync(join(root, 'rules.json'), 'utf8'));

const TEXT = {
    en: {
        title: 'Enmera design rules',
        intro: 'Generated from `rules.json`; edit that file, then run `npm run docs`. Rules marked **checked** are found by `npx @enmera/ai-design-check`; the others are reviewed by people and agents.',
        rule: 'Rule',
        why: 'Why',
        fix: 'How to fix',
        checked: 'checked',
        review: 'review',
        severity: { error: 'error', warn: 'warning', info: 'note' },
        other: '[Türkçe](RULES.tr.md)',
    },
    tr: {
        title: 'Enmera tasarım kuralları',
        intro: '`rules.json` dosyasından üretilir; o dosyayı düzenleyip `npm run docs` çalıştırın. **Denetlenir** işaretli kuralları `npx @enmera/ai-design-check` bulur; diğerlerine insanlar ve ajanlar bakar.',
        rule: 'Kural',
        why: 'Neden',
        fix: 'Nasıl düzeltilir',
        checked: 'denetlenir',
        review: 'gözden geçirilir',
        severity: { error: 'hata', warn: 'uyarı', info: 'not' },
        other: '[English](RULES.md)',
    },
};

function render(lang) {
    const t = TEXT[lang];
    const lines = [`# ${t.title}`, '', `${t.other} · ${t.intro}`, ''];

    for (const [area, name] of Object.entries(areas)) {
        const inArea = rules.filter((rule) => rule.area === area);
        if (inArea.length === 0) continue;
        lines.push(`## ${name[lang]}`, '');
        for (const rule of inArea) {
            lines.push(`### ${rule.title[lang]}`, '', `\`${rule.id}\` · ${t.severity[rule.severity]} · ${rule.check ? t.checked : t.review}`, '');
            lines.push(`**${t.rule}:** ${rule.rule[lang]}`, '', `**${t.why}:** ${rule.why[lang]}`, '', `**${t.fix}:** ${rule.fix[lang]}`, '');
        }
    }

    return `${lines.join('\n').trimEnd()}\n`;
}

const outputs = { 'RULES.md': render('en'), 'RULES.tr.md': render('tr') };
let stale = false;

for (const [file, content] of Object.entries(outputs)) {
    const path = join(root, file);
    let current = '';
    try {
        current = readFileSync(path, 'utf8');
    } catch {}
    if (process.argv.includes('--check')) {
        if (current !== content) {
            console.error(`${file} is out of date: run npm run docs.`);
            stale = true;
        }
    } else {
        writeFileSync(path, content);
    }
}

process.exit(stale ? 1 : 0);
