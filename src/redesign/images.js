import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Images made for a redesign, only when the person asks with --images and says yes to the cost. The key comes from the
 * environment and goes nowhere else: not into a log, a prompt, a result or an error message.
 */

// Rough prices per image, for the estimate shown before anything is generated; the provider's pricing is what counts.
export const COST = { openai: 0.06, gemini: 0.04 };
export const PROVIDERS = ['openai', 'gemini'];
export const KEYS = { openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY' };
export const SIZES = ['1536x1024', '1024x1024', '1024x1536'];
export const IMAGES_MAX = 6;
export const IMAGES_CAP = 12;
const OPENAI = 'https://api.openai.com/v1/images/generations';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const ASPECT = { '1536x1024': '3:2 landscape', '1024x1024': '1:1 square', '1024x1536': '2:3 portrait' };
const NO_TEXT = 'No text, letters, numbers, logos or watermarks anywhere in the image.';

const usage = (message) => Object.assign(new Error(message), { exitCode: 2 });

/** The key for a provider, from the environment only; a missing one is a usage problem, named by its variable. */
export function imageKey(provider, env = process.env) {
    if (!PROVIDERS.includes(provider)) throw usage(`--images takes ${PROVIDERS.join(' or ')}, not ${provider}.`);
    const key = env[KEYS[provider]]?.trim();
    if (!key) throw usage(`--images ${provider} needs ${KEYS[provider]} in the environment; the key is read from there only.`);

    return key;
}

/** --images-max: a whole number from 1 to the hard cap. */
export function imagesMaxOf(value) {
    if (value === undefined || value === null) return IMAGES_MAX;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > IMAGES_CAP) throw usage(`--images-max takes a whole number from 1 to ${IMAGES_CAP}, not ${value}.`);

    return n;
}

/** What is about to be generated and what it may cost, said before the person says yes. */
export function costLines(planned, provider) {
    const each = COST[provider] ?? 0;
    const model = provider === 'openai' ? 'gpt-image-1, medium' : 'gemini-2.5-flash-image';

    return [
        `Images to generate with ${provider} (${model}):`,
        ...planned.map((item) => `  ${item.card}: ${item.for} (${item.size})`),
        `Estimated cost: about $${(each * planned.length).toFixed(2)} for ${planned.length} image${planned.length === 1 ? '' : 's'} (estimate, check your provider's pricing)`,
    ];
}

/** A file name from a card's heading: lower case, plain letters, dashes. */
export function slug(text) {
    const plain = String(text ?? '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return plain.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'card';
}

/** An error line that never carries the key and never a long response body. */
function clean(text, key) {
    let line = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (key) line = line.split(key).join('***');
    line = line.replace(/\bsk-[A-Za-z0-9_-]{6,}/g, 'sk-***').replace(/\bAIza[0-9A-Za-z_-]{10,}/g, 'AIza***');

    return line.length > 200 ? `${line.slice(0, 200)}…` : line;
}

/** One image as PNG bytes. Throws with a short line that is safe to print. */
export async function generateImage({ provider, key, prompt, size = '1536x1024', signal }) {
    const timeout = AbortSignal.timeout(180_000);
    const stop = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response;
    if (provider === 'openai') {
        response = await fetch(OPENAI, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: 'gpt-image-1', prompt: `${prompt}\n\n${NO_TEXT}`, size, quality: 'medium', n: 1 }),
            signal: stop,
        });
    } else if (provider === 'gemini') {
        response = await fetch(GEMINI, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\n\nAspect ratio ${ASPECT[size] ?? '3:2 landscape'}. ${NO_TEXT}` }] }] }),
            signal: stop,
        });
    } else throw new Error(`unknown provider ${provider}`);
    const body = await response.text();
    if (!response.ok) throw new Error(clean(`${provider} answered ${response.status}: ${body}`, key));
    let data;
    try {
        data = JSON.parse(body);
    } catch {
        throw new Error(clean(`${provider} answered with something that is not JSON: ${body}`, key));
    }
    const b64 = provider === 'openai'
        ? data?.data?.[0]?.b64_json
        : (data?.candidates?.[0]?.content?.parts ?? []).map((part) => part?.inlineData?.data ?? part?.inline_data?.data).find(Boolean);
    if (!b64) throw new Error(clean(`${provider} sent no image${data?.error?.message ? `: ${data.error.message}` : ''}`, key));

    return Buffer.from(b64, 'base64');
}

/**
 * Every planned image, one after another. A failed one is said in one line and left out: its card goes ahead without it.
 * @returns {Promise<{card: string, for: string, file: string}[]>}
 */
export async function generateImages({ provider, key, planned, log = () => {}, signal, shown = (file) => file }) {
    const made = [];
    for (const item of planned) {
        if (signal?.aborted) break;
        try {
            const png = await generateImage({ provider, key, prompt: item.prompt, size: item.size, signal });
            mkdirSync(dirname(item.file), { recursive: true });
            writeFileSync(item.file, png);
            made.push({ card: item.card, for: item.for, file: item.file });
            log(`  image made for "${item.card}": ${shown(item.file)}`);
        } catch (error) {
            if (signal?.aborted) break;
            log(`  image for "${item.card}" not made, the card goes ahead without it: ${clean(error.message, key)}`);
        }
    }

    return made;
}
