# Linger for iPhone

A thin native shell (SwiftUI + WKWebView) around the live beta page,
https://somohanty04.github.io/linger-prototype/beta/. Web changes reach testers on their next launch;
only changes in this folder need a new TestFlight build. There is also a Share extension (`LingerShare`)
that hands screenshots and text to the page.

## Open the project

`project.yml` is the source of truth; `Linger.xcodeproj` is generated from it with
[XcodeGen](https://github.com/yonaskolb/XcodeGen) and also checked in, so either works.

```sh
brew install xcodegen   # once
cd ios
xcodegen                # regenerate Linger.xcodeproj after editing project.yml or adding files
open Linger.xcodeproj
```

If you change build settings or add files without XcodeGen, keep `project.yml` in step (and the other way round).

## Team access

Signing is automatic with `DEVELOPMENT_TEAM` in `project.yml` (`4MGQ54PRK5`). To build to a device or upload
you need to be a member of that team in App Store Connect (App Manager or Admin to upload), and be signed in
to that Apple ID in Xcode → Settings → Accounts. The App Group `group.com.somohanty.linger` must exist in that team.

## Ship a TestFlight build

1. Bump the build number: `CURRENT_PROJECT_VERSION` in `project.yml` (and the two `CURRENT_PROJECT_VERSION`
   lines in `Linger.xcodeproj/project.pbxproj`, or rerun `xcodegen`). Each upload needs a higher build number.
   Change `MARKETING_VERSION` only for a new public version.
2. In Xcode pick the **Any iOS Device (arm64)** destination.
3. **Product → Archive**. When the Organizer opens: **Distribute App → App Store Connect → Upload**.
4. After processing (usually 10–30 min) the build appears in App Store Connect → TestFlight; add it to the tester group.

## Page ↔ shell contract

**Shell → page**

- `window.LINGER_SHELL = { build: <CFBundleVersion as a number>, version: "<CFBundleShortVersionString>" }`,
  injected at document start in the main frame. The page treats a missing `LINGER_SHELL` as build 1 and can ask
  testers on an older build to update in TestFlight.
- `LingerNative.receive({ type: "image", data } | { type: "text", text })`: an item from the Share extension,
  sent after the page says ready.
- `LingerNative.heard({ texts, error })`: the result of a `listen` request.
- The user agent ends with `LingerApp/<version>`.

**Page → shell** — `webkit.messageHandlers.linger.postMessage({...})`, accepted only from the Linger host:

| Key | Value | Effect |
| --- | --- | --- |
| `ready` | `true` | The page has started. Hides the offline screen; queued Share items are delivered. If it doesn't arrive within ~15 s of a load, the offline screen is shown. |
| `haptic` | `"light"` \| `"medium"` \| `"success"` | A tap you can feel. |
| `listen` | `"start"` \| `"stop"` | Say it: speech recognition for one word; result via `LingerNative.heard`. |
| `open` | `"settings"` | Opens the app's page in Settings (e.g. to turn camera access back on). Other values are ignored. |

## Getting page updates

The page is served with a 10-minute cache, so from build 4 the shell makes sure testers see a new version right away:

- **Every load** asks the server whether the page changed (`.reloadRevalidatingCacheData`). An unchanged page still
  comes from the cache, so this costs a quick check, not a download.
- **Coming back to the app** (it was in the background) fetches the page's HTML and compares its `app.js?v=` number
  with the one that's loaded. Only if they differ does the page reload; otherwise nothing happens and the reader stays
  where they were. It's skipped for 10 seconds after a Share item was handed over, so that item isn't lost.
- Bump `app.js?v=` in `index.html` and `beta/index.html` with every app change, as before: that number is what the
  shell compares.

## Offline screen

Shown when a main-frame load fails (cancelled loads are ignored) or the page doesn't say ready in time. Before showing
it, the shell tries the saved copy of the page once (`.returnCacheDataDontLoad`), so Linger still opens offline if it
has been opened before. "Try again" reloads; the app also retries by itself when the network comes back.

## Testing against a local page (Debug builds)

```sh
xcrun simctl launch booted com.somohanty.linger -LingerURL http://localhost:8765/beta/
```
