import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

/**
 * Which Apple platform a Swift file is built for: 'macos' or null (iOS, mixed or unknown: the iOS rules apply, as before).
 * A Mac app is read with pointer sizes and without Dynamic Type; everything else keeps the touch rules.
 */

/** AppKit, or types only AppKit has. Foundation's NS types (NSString, NSRange, NSAttributedString) exist on iOS too. */
const MAC = /^[ \t]*(?:@\w+[ \t]+)*import[ \t]+(?:(?:class|struct|enum|protocol|func|var)[ \t]+)?(?:AppKit|Cocoa)\b|\bNS(?:View|ViewController|ViewRepresentable|ViewControllerRepresentable|HostingView|HostingController|Window|WindowController|Panel|Application|ApplicationDelegate|ApplicationDelegateAdaptor|Color|Font|Image|Event|Menu|MenuItem|Button|TextField|TextView|StackView|ScrollView|Screen|Cursor|Workspace|Pasteboard|BezierPath|Alert|StatusBar|StatusItem|VisualEffectView|TrackingArea|SplitView|TableView|OutlineView|CollectionView|Popover|ToolbarItem|Toolbar)\b/m;
/** UIKit or another touch platform named outright. */
const TOUCH = /^[ \t]*(?:@\w+[ \t]+)*import[ \t]+(?:(?:class|struct|enum|protocol|func|var)[ \t]+)?(?:UIKit|WatchKit)\b|\bUI(?:View|ViewController|ViewRepresentable|ViewControllerRepresentable|HostingController|Application|ApplicationDelegateAdaptor|Color|Font|Image|Screen|Device|Window)\b/m;
/** A file that builds for more than one platform says so with #if os(…) or #if canImport(AppKit/UIKit). */
const CONDITIONAL = /#(?:else)?if\b[^\n]*\b(?:os\(\s*(?:macOS|iOS|watchOS|tvOS|visionOS|xrOS)\s*\)|canImport\(\s*(?:AppKit|Cocoa|UIKit)\s*\)|targetEnvironment\()/;
const SKIP_DIR = /^(?:\.|node_modules$|Pods$|DerivedData$|build$|Carthage$)/;

/** The platform a file names by itself: 'macos', 'touch' or null. */
export function ownPlatform(source) {
    if (CONDITIONAL.test(source)) return null;
    if (TOUCH.test(source)) return 'touch';

    return MAC.test(source) ? 'macos' : null;
}

/** The platforms a project manifest declares, or null when it names none. */
export function manifestPlatforms(file, text) {
    if (file.endsWith('Package.swift')) {
        const list = /\bplatforms\s*:\s*\[([^\]]*)\]/.exec(text);

        return list ? new Set([...list[1].matchAll(/\.(macOS|iOS|tvOS|watchOS|visionOS|macCatalyst|driverKit)\b/g)].map((match) => match[1].toLowerCase())) : null;
    }
    if (file.endsWith('project.yml') || file.endsWith('project.yaml')) {
        // XcodeGen: platform: macOS, or a list (platform: [iOS, macOS]); supportedDestinations names more.
        const found = new Set();
        for (const match of text.matchAll(/^\s*(?:platform|supportedDestinations)\s*:\s*(\[[^\]\n]*\]|[^\n#]+)/gm)) for (const name of match[1].matchAll(/\b(macOS|iOS|tvOS|watchOS|visionOS|auto)\b/g)) found.add(name[1].toLowerCase());

        return found.size ? found : null;
    }
    // project.pbxproj: each build configuration's SDKROOT.
    const found = new Set([...text.matchAll(/\bSDKROOT\s*=\s*"?(\w+)"?\s*;/g)].map((match) => (match[1] === 'macosx' ? 'macos' : match[1])));

    return found.size ? found : null;
}

const onlyMac = (platforms) => Boolean(platforms) && platforms.size > 0 && [...platforms].every((name) => name === 'macos');

/** The nearest Package.swift, project.yml or .xcodeproj above a folder, up to the repository root: 'macos' when it builds only for the Mac. */
function projectPlatform(folder, cache) {
    if (cache.has(folder)) return cache.get(folder);
    let answer;
    const entries = (() => {
        try {
            return readdirSync(folder);
        } catch {
            return [];
        }
    })();
    const manifests = [
        ...['Package.swift', 'project.yml', 'project.yaml'].filter((name) => entries.includes(name)).map((name) => join(folder, name)),
        ...entries.filter((name) => name.endsWith('.xcodeproj')).map((name) => join(folder, name, 'project.pbxproj')).filter((file) => existsSync(file)),
    ];
    if (manifests.length) {
        // Every project here must build only for the Mac; one that also builds for iOS keeps the touch rules.
        const all = manifests.map((file) => manifestPlatforms(file, readFileSync(file, 'utf8')));
        answer = all.some(Boolean) && all.filter(Boolean).every(onlyMac) ? 'macos' : null;
    } else if (entries.includes('.git') || dirname(folder) === folder) answer = null;
    else answer = projectPlatform(dirname(folder), cache);
    cache.set(folder, answer);

    return answer;
}

function swiftFiles(folder, out = []) {
    let entries = [];
    try {
        entries = readdirSync(folder, { withFileTypes: true });
    } catch {}
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!SKIP_DIR.test(entry.name)) swiftFiles(join(folder, entry.name), out);
        } else if (entry.name.endsWith('.swift')) out.push(join(folder, entry.name));
    }

    return out;
}

/** A Swift package target (Sources/<Target>) is one module: one AppKit file and no UIKit file make all of it a Mac target. */
function modulePlatform(full, cache) {
    const parts = full.split(sep);
    const at = parts.lastIndexOf('Sources');
    if (at < 0 || at + 2 >= parts.length) return null;
    const folder = parts.slice(0, at + 2).join(sep);
    if (!cache.has(folder)) {
        const seen = swiftFiles(folder).map((file) => ownPlatform(readFileSync(file, 'utf8')));
        cache.set(folder, seen.includes('macos') && !seen.includes('touch') ? 'macos' : null);
    }

    return cache.get(folder);
}

/**
 * 'macos' when the file is built for the Mac only, else null. In order: a file that names UIKit is a touch file; a
 * project that builds only for the Mac makes every file a Mac file; a file that imports AppKit or uses its views is one;
 * so is a file in a Swift package target whose other files are. Files that branch on the platform stay as they were.
 */
export function swiftPlatform(cwd, path, source, cache = { projects: new Map(), modules: new Map() }) {
    const own = ownPlatform(source);
    if (own === 'touch') return null;
    const full = resolve(cwd, path);
    if (projectPlatform(dirname(full), cache.projects) === 'macos') return 'macos';
    if (own === 'macos') return 'macos';
    if (CONDITIONAL.test(source)) return null;

    return modulePlatform(full, cache.modules);
}
