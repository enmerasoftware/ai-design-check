import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const skills = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');

/**
 * The part of YAML a SKILL.md frontmatter uses: one `key: value` per line, the value double-quoted or a plain scalar.
 * A plain scalar with ": " or " #" in it is what broke `npx skills add`, so it throws here as it does in a YAML parser.
 */
function frontmatter(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text);
    if (!match) throw new Error('No frontmatter between --- lines at the top of the file');
    const fields = {};
    for (const line of match[1].split(/\r?\n/)) {
        const entry = /^([a-z][a-z0-9_-]*):\s+(.+)$/.exec(line);
        if (!entry) throw new Error(`Not a "key: value" line: ${line}`);
        const [, key, value] = entry;
        if (key in fields) throw new Error(`Duplicate key: ${key}`);
        if (value.startsWith('"')) fields[key] = JSON.parse(value);
        else if (/: |:$| #/.test(value) || /^[>|&*!%@`'{[\]#,?-]/.test(value)) throw new Error(`Quote this value of ${key}: ${value}`);
        else fields[key] = value;
    }

    return fields;
}

test('the frontmatter reader refuses what breaks YAML', () => {
    assert.deepEqual(frontmatter('---\nname: a\ndescription: "Use when: fixing"\n---\n'), { name: 'a', description: 'Use when: fixing' });
    assert.throws(() => frontmatter('---\nname: a\ndescription: Use when: fixing\n---\n'), /Quote this value/);
    assert.throws(() => frontmatter('---\ndescription: "cut off\n---\n'), SyntaxError);
    assert.throws(() => frontmatter('# no frontmatter\n'), /No frontmatter/);
});

test('every SKILL.md has valid frontmatter with a name and a description', () => {
    const folders = readdirSync(skills, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    assert.ok(folders.length >= 2);
    const names = folders.map((folder) => {
        const { name, description } = frontmatter(readFileSync(join(skills, folder, 'SKILL.md'), 'utf8'));
        assert.match(name ?? '', /^[a-z0-9-]+$/, `${folder}: name`);
        assert.ok(description?.length > 0 && description.length <= 1024, `${folder}: description`);

        return name;
    });
    assert.equal(new Set(names).size, names.length);
});
