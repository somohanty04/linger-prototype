# Linger for Mac

A menu-bar app that explains hard English words in **any app**: Mail, PDFs in Preview, Word, Slack, websites.

- **Linger mode** (on by default, ⌃⌥U to turn on/off): hard words in the window you're reading get an orange dotted underline, refreshed about once a second when the window changes. Rest the mouse on an underlined word to see its card. Scrolling hides the lines until the page settles.

- **⌃⌥L** (Control-Option-L): point at a word with the mouse and press the keys. A card shows the meaning, the sentence in plain English, local notes for slang, 🔊 Hear it, and ★ Save to Linger.
- **⌃⌥E** (Control-Option-E): explain the window you're reading: "What this wants from you", key dates and amounts, and the hard words (click one for its meaning).
- **📱 Connect your phone** (menu): type the code from the phone app (Words → Turn on live sync); saved words appear on the phone right away.
- Saved words are listed in the menu.

Linger reads the front window only while Linger mode is on, or when you press a shortcut. Text recognition runs on the Mac (Apple Vision); only words you save are sent to your phone.

## Install

**Teammates:** download `linger-mac.zip` from https://somohanty04.github.io/linger-prototype/linger-mac.zip, unzip, and drag **Linger** into **Applications**. The first time, macOS says it can't check the app (it isn't from the App Store): right-click Linger → **Open** → **Open** (or System Settings → Privacy & Security → **Open Anyway**).

**First run:** Linger asks to read the screen. Click **Allow screen reading**, turn on **Linger** under System Settings → Privacy & Security → **Screen & System Audio Recording**, then choose **Restart Linger** from the menu-bar icon.

Works on macOS 14 (Sonoma) or newer, Apple silicon and Intel.

## Build it yourself (no Xcode needed)

```sh
cd mac && ./build.sh
```

This uses the Command Line Tools (`xcode-select --install`). The app is written to `mac/build/Linger.app`. Every rebuild has a new signature, so macOS asks for the screen-reading permission again: remove the old Linger entry in Screen & System Audio Recording and allow the new one.

## Files

- `Sources/Linger/main.swift`: menu bar, shortcuts, word card, Explain, pairing
- `ScreenReader.swift`: captures part of the screen or a window and recognizes words with their positions
- `Words.swift`: hard-word detection, plain-English swaps, summaries (same data as the phone app and extension: `Resources/words.json`)
- `Sync.swift`: saved words, phone sync (Firestore), Wiktionary lookups
- `Panels.swift`: the floating SwiftUI panels
- `HotKeys.swift`: system-wide shortcuts

## Next

Webcam eye tracking across all apps.
