import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { check } from '../src/check.js';
import { manifestPlatforms, ownPlatform, swiftPlatform } from '../src/platform.js';

function project(files, run) {
    const cwd = mkdtempSync(join(tmpdir(), 'macos-'));
    try {
        for (const [path, content] of Object.entries(files)) {
            mkdirSync(dirname(join(cwd, path)), { recursive: true });
            writeFileSync(join(cwd, path), content);
        }

        return run(cwd);
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
}

// The same screen as an iOS and a Mac file would write it: a fixed font size, small icon buttons, small text, off-scale padding.
const SCREEN = `struct Toolbar: View {
    var body: some View {
        HStack {
            Text("Saved").font(.system(size: 13))
            Text("Updated 2 min ago").font(.system(size: 10))
            Text("Fine print").font(.system(size: 9))
            Button { close() } label: {
                Image(systemName: "xmark").frame(width: 24, height: 24)
            }
            Button { close() } label: {
                Image(systemName: "xmark").frame(width: 14, height: 14)
            }
        }
        .padding(13)
        .background(RoundedRectangle(cornerRadius: 10).fill(.background))
    }
}
`;
const rulesOf = (found, rule, file = '') => found.filter((item) => item.rule === rule && item.path.endsWith(file)).map((item) => item.value);

test('macOS: a file is a Mac file by AppKit, its views, its package or its project', () => {
    assert.equal(ownPlatform('import SwiftUI\nimport AppKit\n'), 'macos');
    assert.equal(ownPlatform('import Cocoa\n'), 'macos');
    assert.equal(ownPlatform('@preconcurrency import AppKit\n'), 'macos');
    assert.equal(ownPlatform('import SwiftUI\nstruct Web: NSViewRepresentable {}\n'), 'macos');
    assert.equal(ownPlatform('import SwiftUI\nlet host = NSHostingView(rootView: Text("a"))\n'), 'macos');
    // Foundation's NS types exist on iOS too.
    assert.equal(ownPlatform('import Foundation\nlet a = NSAttributedString(string: "a"); let r = NSRange(); let s: NSString = ""\n'), null);
    assert.equal(ownPlatform('import UIKit\n'), 'touch');
    assert.equal(ownPlatform('import SwiftUI\nstruct A: UIViewRepresentable {}\n'), 'touch');
    // A file that branches on the platform builds for both.
    assert.equal(ownPlatform('#if os(macOS)\nimport AppKit\n#else\nimport UIKit\n#endif\n'), null);
    assert.equal(ownPlatform('#if canImport(AppKit)\nimport AppKit\n#endif\nlet c = NSColor.red\n'), null);
    assert.equal(ownPlatform('import SwiftUI\n'), null);

    assert.deepEqual([...manifestPlatforms('Package.swift', 'let package = Package(name: "A", platforms: [.macOS(.v14)], targets: [])')], ['macos']);
    assert.deepEqual([...manifestPlatforms('Package.swift', 'platforms: [.macOS(.v14), .iOS(.v16)]')], ['macos', 'ios']);
    assert.equal(manifestPlatforms('Package.swift', 'let package = Package(name: "A")'), null);
    assert.deepEqual([...manifestPlatforms('project.yml', 'targets:\n  App:\n    type: application\n    platform: macOS\n')], ['macos']);
    assert.deepEqual([...manifestPlatforms('project.yml', 'targets:\n  App:\n    platform: [iOS, macOS]\n')], ['ios', 'macos']);
    assert.deepEqual([...manifestPlatforms('A.xcodeproj/project.pbxproj', 'SDKROOT = macosx;\nSDKROOT = macosx;\n')], ['macos']);
    assert.deepEqual([...manifestPlatforms('A.xcodeproj/project.pbxproj', 'SDKROOT = iphoneos;\nSDKROOT = macosx;\n')], ['iphoneos', 'macos']);

    const plain = 'import SwiftUI\nstruct A: View { var body: some View { Text("a") } }\n';
    project({ 'Package.swift': 'platforms: [.macOS(.v14)]', 'Sources/App/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'Sources/App/A.swift', plain), 'macos'));
    project({ 'Package.swift': 'platforms: [.macOS(.v14), .iOS(.v17)]', 'Sources/App/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'Sources/App/A.swift', plain), null));
    // A UIKit file is a touch file whatever the package says.
    project({ 'Package.swift': 'platforms: [.macOS(.v14)]', 'Sources/App/A.swift': 'import UIKit\n' }, (cwd) => assert.equal(swiftPlatform(cwd, 'Sources/App/A.swift', 'import UIKit\n'), null));
    project({ 'project.yml': 'targets:\n  App:\n    platform: macOS\n', 'App/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'App/A.swift', plain), 'macos'));
    project({ 'project.yml': 'targets:\n  App:\n    platform: iOS\n', 'App/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'App/A.swift', plain), null));
    project({ 'Mac.xcodeproj/project.pbxproj': 'SDKROOT = macosx;', 'Mac/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'Mac/A.swift', plain), 'macos'));
    project({ 'Phone.xcodeproj/project.pbxproj': 'SDKROOT = iphoneos;', 'Phone/A.swift': plain }, (cwd) => assert.equal(swiftPlatform(cwd, 'Phone/A.swift', plain), null));
    // One Swift package target is one module: an AppKit file in it makes its plain SwiftUI files Mac files too, not its neighbours'.
    project({
        'Package.swift': 'platforms: [.macOS(.v14), .iOS(.v17)]',
        'Sources/MacApp/Window.swift': 'import AppKit\n',
        'Sources/MacApp/Views/Row.swift': plain,
        'Sources/Shared/Card.swift': plain,
        'Sources/Both/Mac.swift': 'import AppKit\n',
        'Sources/Both/Phone.swift': 'import UIKit\n',
        'Sources/Both/Card.swift': plain,
    }, (cwd) => {
        assert.equal(swiftPlatform(cwd, 'Sources/MacApp/Views/Row.swift', plain), 'macos');
        assert.equal(swiftPlatform(cwd, 'Sources/Shared/Card.swift', plain), null);
        assert.equal(swiftPlatform(cwd, 'Sources/Both/Card.swift', plain), null);
    });
});

test('macOS: no Dynamic Type, pointer-sized targets, 10 pt text; the scales and the web stay', () => {
    const web = 'export const B = () => <button className="h-4">Go</button>;\n';
    project({ 'Mac/Toolbar.swift': `import SwiftUI\nimport AppKit\n\n${SCREEN}`, 'Phone/Toolbar.swift': `import SwiftUI\n\n${SCREEN}`, 'web/b.tsx': web }, (cwd) => {
        const found = check(cwd);
        // iOS: a fixed size ignores Dynamic Type; 24 and 14 pt are under 44; 10 and 9 pt are under 11.
        assert.equal(rulesOf(found, 'dynamic-type', 'Phone/Toolbar.swift').length, 3);
        assert.deepEqual(rulesOf(found, 'tap-target', 'Phone/Toolbar.swift'), ['.frame(width: 24, height: 24)', '.frame(width: 14, height: 14)']);
        assert.equal(rulesOf(found, 'no-tiny-text', 'Phone/Toolbar.swift').length, 2);
        // macOS: no Dynamic Type; 24 pt is a regular pointer target, 14 pt is under the 20 pt minimum; 10 pt is Apple's Mac minimum.
        assert.deepEqual(rulesOf(found, 'dynamic-type', 'Mac/Toolbar.swift'), []);
        assert.deepEqual(rulesOf(found, 'tap-target', 'Mac/Toolbar.swift'), ['.frame(width: 14, height: 14)']);
        assert.match(found.find((item) => item.rule === 'tap-target' && item.path.startsWith('Mac/')).message, /Pointer target under 20 pt/);
        assert.deepEqual(rulesOf(found, 'no-tiny-text', 'Mac/Toolbar.swift'), ['.font(.system(size: 9']);
        // The spacing and corner scales are the project's, on every platform.
        for (const file of ['Mac/Toolbar.swift', 'Phone/Toolbar.swift']) {
            assert.deepEqual(rulesOf(found, 'spacing-scale', file), ['.padding(13'], file);
            assert.equal(rulesOf(found, 'radius-scale', file).length, 1, file);
        }
        // A web file in a Mac project keeps the web's tap-target rule.
        assert.deepEqual(rulesOf(found, 'tap-target', 'web/b.tsx'), ['h-4']);
    });
});

test('macOS: a SwiftUI file without AppKit in a Mac-only package is read as a Mac file', () => {
    project({ 'Package.swift': 'let package = Package(name: "A", platforms: [.macOS(.v14)])', 'Sources/App/Toolbar.swift': `import SwiftUI\n\n${SCREEN}` }, (cwd) => {
        const found = check(cwd);
        assert.deepEqual(rulesOf(found, 'dynamic-type'), []);
        assert.deepEqual(rulesOf(found, 'tap-target'), ['.frame(width: 14, height: 14)']);
    });
    // Checked from inside the target, the package above is still found.
    project({ 'Package.swift': 'platforms: [.macOS(.v14)]', 'Sources/App/Toolbar.swift': `import SwiftUI\n\n${SCREEN}` }, (cwd) => {
        assert.deepEqual(rulesOf(check(join(cwd, 'Sources', 'App')), 'dynamic-type'), []);
    });
    project({ 'Package.swift': 'platforms: [.macOS(.v14), .iOS(.v17)]', 'Sources/App/Toolbar.swift': `import SwiftUI\n\n${SCREEN}` }, (cwd) => {
        assert.equal(rulesOf(check(cwd), 'dynamic-type').length, 3);
    });
});
