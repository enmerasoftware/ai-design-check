// Builds the Codex and ChatGPT plugin package: skills only, so no MCP review, no hooks. Output: build/ai-design-check-plugin.zip
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const out = join(root, 'build', 'ai-design-check');
rmSync(join(root, 'build'), { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });
cpSync(join(root, 'skills'), join(out, 'skills'), { recursive: true });
cpSync(join(root, 'assets', 'logo.png'), join(out, 'assets', 'logo.png'));
cpSync(join(root, 'RULES.md'), join(out, 'RULES.md'));
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
const manifest = `${JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'ai-design-check',
    version,
    description: 'Find and fix what makes an AI-built interface look generated, on the web and in mobile apps.',
    author: { name: 'Enmera Software', url: 'https://github.com/enmerasoftware' },
    homepage: 'https://github.com/enmerasoftware/ai-design-check',
    license: 'MIT',
    keywords: ['design', 'ui', 'accessibility', 'flutter', 'swiftui', 'jetpack-compose', 'react-native'],
    extensions: {
        'com.openai': {
            interface: {
                displayName: 'AI Design Check',
                shortDescription: 'Fix generated-looking UI',
                longDescription: 'AI Design Check finds what makes an interface built with an AI agent look generated, and repairs it. It has 137 design rules. A checker reads web projects (React, Vue, Svelte, Laravel Blade, HTML) and SwiftUI, Jetpack Compose, Flutter and React Native apps, and scans running pages at desktop and phone width, with no model and no API key. The fix skill measures a screen, writes a short brief from your product, repairs it in order of harm and reports the count before and after. Features, data and words stay. Mechanical fixes (spacing and corners to your scale, very heavy type to bold) need no judgement and are made by a command you can preview first.',
                developerName: 'Enmera Software',
                category: 'Productivity',
                capabilities: [],
                websiteURL: 'https://github.com/enmerasoftware/ai-design-check',
                supportURL: 'https://github.com/enmerasoftware/ai-design-check/issues',
                privacyPolicyURL: 'https://github.com/enmerasoftware/ai-design-check/blob/main/PRIVACY.md',
                termsOfServiceURL: 'https://github.com/enmerasoftware/ai-design-check/blob/main/LICENSE',
                defaultPrompt: ['Fix the design of this screen', 'Check this project for what looks AI generated', 'Scan my running page at http://localhost:3000'],
                brandColor: '#123A40',
                logo: './assets/logo.png',
                composerIcon: './assets/logo.png',
            },
        },
    },
}, null, 2)}\n`;
writeFileSync(join(out, 'plugin.json'), manifest);
writeFileSync(join(root, 'plugin', 'plugin.json'), manifest);
mkdirSync(join(root, 'plugin', 'assets'), { recursive: true });
cpSync(join(root, 'assets', 'logo.png'), join(root, 'plugin', 'assets', 'logo.png'));
const zip = spawnSync('zip', ['-qr', '../ai-design-check-plugin.zip', '.'], { cwd: out, encoding: 'utf8' });
if (zip.status !== 0) throw new Error(zip.stderr || 'zip failed');
console.log(join(root, 'build', 'ai-design-check-plugin.zip'));
