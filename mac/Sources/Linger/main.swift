import AppKit
import SwiftUI
import Carbon

/// Linger for Mac: a menu-bar app that explains hard English words in any app.
///   Linger mode (⌃⌥U): hard words in the front window get underlined; rest the mouse on one to see its meaning
///   ⌃⌥L  look up the word under the mouse        ⌃⌥E  explain the window you're reading
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var status: NSStatusItem!
    private var cardPanel: FloatingPanel?, explainPanel: FloatingPanel?, pairPanel: FloatingPanel?, toastPanel: FloatingPanel?
    private let card = CardModel(), explain = ExplainModel(), pair = PairModel()
    private var clickAway: Any?
    private let mode = LingerMode()
    private var modeWanted: Bool { get { UserDefaults.standard.object(forKey: "lingerMode") as? Bool ?? true } set { UserDefaults.standard.set(newValue, forKey: "lingerMode") } }

    func applicationDidFinishLaunching(_ note: Notification) {
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = AppDelegate.menuIcon()
        status.button?.toolTip = "Linger"
        let menu = NSMenu(); menu.delegate = self; status.menu = menu

        HotKeys.register(id: 1, keyCode: kVK_ANSI_L, modifiers: controlKey | optionKey) { [weak self] in self?.lookUpUnderMouse() }
        HotKeys.register(id: 2, keyCode: kVK_ANSI_E, modifiers: controlKey | optionKey) { [weak self] in self?.explainWindow() }
        HotKeys.register(id: 3, keyCode: kVK_ANSI_U, modifiers: controlKey | optionKey) { [weak self] in self?.toggleMode() }
        mode.onHover = { [weak self] w, sentence in self?.showCard(for: w, sentence: sentence, why: "") }
        mode.onStatus = { [weak self] text in self?.status.button?.toolTip = "Linger · " + text }
        if modeWanted && ScreenReader.hasPermission { mode.start() }

        card.onClose = { [weak self] in self?.closeCard() }
        explain.onClose = { [weak self] in self?.explainPanel?.orderOut(nil) }
        explain.onPick = { [weak self] w in self?.pickHardWord(w) }
        pair.onClose = { [weak self] in self?.pairPanel?.orderOut(nil) }
        pair.onConnect = { [weak self] in self?.connectPhone() }

        if !ScreenReader.hasPermission { DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.showWelcome() } }
    }

    // MARK: Menu

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        let head = NSMenuItem(title: "Linger · explains hard English anywhere", action: nil, keyEquivalent: ""); head.isEnabled = false
        menu.addItem(head)
        let perm = NSMenuItem(title: ScreenReader.hasPermission ? "✓ Screen reading allowed" : "⚠️ Screen reading not allowed yet", action: nil, keyEquivalent: ""); perm.isEnabled = false
        menu.addItem(perm)
        menu.addItem(.separator())
        let lm = item("Linger mode: underline hard words", #selector(toggleMode)); lm.state = mode.isOn ? .on : .off
        lm.keyEquivalent = "u"; lm.keyEquivalentModifierMask = [.control, .option]
        menu.addItem(lm)
        let tip = NSMenuItem(title: "    Rest the mouse on an underlined word to see its meaning", action: nil, keyEquivalent: ""); tip.isEnabled = false
        menu.addItem(tip)
        let look = item("Look up word under mouse", #selector(menuLookUp)); look.keyEquivalent = "l"; look.keyEquivalentModifierMask = [.control, .option]
        let expl = item("Explain this window", #selector(menuExplain)); expl.keyEquivalent = "e"; expl.keyEquivalentModifierMask = [.control, .option]
        menu.addItem(look); menu.addItem(expl)
        menu.addItem(.separator())
        if !ScreenReader.hasPermission {
            menu.addItem(item("⚠️ Allow screen reading…", #selector(askPermission)))
            menu.addItem(item("Restart Linger (after allowing)", #selector(restart)))
            menu.addItem(.separator())
        }
        if Sync.pairCode.isEmpty { menu.addItem(item("📱 Connect your phone…", #selector(showPair))) }
        else {
            let p = NSMenuItem(title: "📱 Saving to your phone · \(Sync.pretty(Sync.pairCode))", action: nil, keyEquivalent: ""); p.isEnabled = false; menu.addItem(p)
            menu.addItem(item("Disconnect phone", #selector(unpair)))
        }
        let saved = Sync.saved
        let sub = NSMenu()
        if saved.isEmpty { let e = NSMenuItem(title: "Look up a word, then ★ Save to Linger", action: nil, keyEquivalent: ""); e.isEnabled = false; sub.addItem(e) }
        for w in saved.prefix(15) { let i = NSMenuItem(title: "\(w.w) · \(w.m.prefix(50))", action: nil, keyEquivalent: ""); i.isEnabled = false; sub.addItem(i) }
        let savedItem = NSMenuItem(title: "★ Saved words (\(saved.count))", action: nil, keyEquivalent: ""); savedItem.submenu = sub; menu.addItem(savedItem)
        menu.addItem(item("Open the Linger phone app", #selector(openPhoneApp)))
        menu.addItem(.separator())
        menu.addItem(item("How to use Linger", #selector(showWelcome)))
        menu.addItem(item("Quit Linger", #selector(quit)))
    }
    private func item(_ title: String, _ sel: Selector) -> NSMenuItem { let i = NSMenuItem(title: title, action: sel, keyEquivalent: ""); i.target = self; return i }
    @objc private func menuLookUp() { DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.lookUpUnderMouse() } }
    @objc private func menuExplain() { DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.explainWindow() } }
    @objc private func askPermission() {
        ScreenReader.requestPermission()
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") { NSWorkspace.shared.open(url) }
    }
    @objc private func restart() {
        let path = Bundle.main.bundlePath
        let task = Process(); task.launchPath = "/bin/sh"; task.arguments = ["-c", "sleep 1; open \"\(path)\""]
        try? task.run(); NSApp.terminate(nil)
    }
    @objc private func unpair() { Sync.pairCode = "" }
    @objc func toggleMode() {
        if mode.isOn { mode.stop(); modeWanted = false; toast("Linger mode off") }
        else if !ScreenReader.hasPermission { toast("Allow screen reading first (Linger menu)"); askPermission() }
        else { modeWanted = true; mode.start(); toast("Linger mode on: hard words will be underlined") }
    }
    @objc private func openPhoneApp() { NSWorkspace.shared.open(URL(string: "https://somohanty04.github.io/linger-prototype/")!) }
    @objc private func quit() { NSApp.terminate(nil) }

    @objc private func showWelcome() {
        let a = NSAlert()
        a.messageText = "Linger for Mac"
        a.informativeText = """
        Linger explains hard English words in any app: email, PDFs, websites, documents.

        • Linger mode (on by default, ⌃⌥U to turn on or off): hard words in the window you're reading get an orange dotted underline. Rest the mouse on one to see its meaning.
        • ⌃⌥L (Control-Option-L): point at a word with the mouse, press the keys, and Linger shows its meaning, the sentence in plain English, and lets you hear it and save it.
        • ⌃⌥E (Control-Option-E): explain the window you're reading: what it wants from you, key dates and amounts, and the hard words.

        Linger reads the window in front only while Linger mode is on, or when you press these keys. Everything stays on this Mac, except saved words you send to your phone.
        \(ScreenReader.hasPermission ? "" : "\nFirst, allow screen reading: click Allow, turn Linger on in System Settings → Privacy & Security → Screen & System Audio Recording, then restart Linger from its menu.")
        """
        a.addButton(withTitle: ScreenReader.hasPermission ? "OK" : "Allow screen reading")
        if !ScreenReader.hasPermission { a.addButton(withTitle: "Later") }
        NSApp.activate(ignoringOtherApps: true)
        if a.runModal() == .alertFirstButtonReturn, !ScreenReader.hasPermission { askPermission() }
    }

    // MARK: Look up the word under the mouse

    func lookUpUnderMouse() {
        guard ScreenReader.hasPermission else { toast("Allow screen reading first (Linger menu)"); askPermission(); return }
        toast("Looking up…")
        let p = ScreenReader.mouse()
        let area = CGRect(x: p.x - 450, y: p.y - 80, width: 900, height: 160)
        Task { @MainActor in
            do {
                let (img, shot) = try await ScreenReader.capture(area)
                let result = try await ScreenReader.read(img, area: shot)
                let hit = result.words.first { $0.rect.insetBy(dx: -3, dy: -3).contains(p) }
                    ?? result.words.min { dist($0.rect, p) < dist($1.rect, p) }.flatMap { dist($0.rect, p) < 45 ? $0 : nil }
                guard let w = hit else { toast("No text under the mouse"); return }
                toastPanel?.orderOut(nil)
                showCard(for: w, sentence: ScreenReader.sentence(around: w, in: result), why: "")
            } catch { toast("Couldn’t read the screen") }
        }
    }
    private func dist(_ r: CGRect, _ p: CGPoint) -> CGFloat { hypot(max(r.minX - p.x, 0, p.x - r.maxX), max(r.minY - p.y, 0, p.y - r.maxY)) }

    func showCard(for w: ScreenReader.Word, sentence: String, why: String) {
        let words = Words.shared, k = Words.key(w.text)
        let kind = words.classify(w.text, sentenceStart: true) ?? .word
        let sl = words.slang[k]
        card.word = w.text; card.kind = sl != nil ? .slang : kind; card.say = sl?.say ?? ""
        card.local = sl?.local ?? ""; card.city = sl?.city ?? ""
        card.meaning = words.knownMeaning(k) ?? ""
        card.sentence = sentence; card.plain = words.plainify(sentence)
        card.saved = Sync.saved.contains { $0.key == k }; card.note = ""; card.why = why
        card.onSave = { [weak self] in self?.saveCurrent(key: k) }
        if cardPanel == nil { cardPanel = FloatingPanel(CardView(m: card)) }
        cardPanel?.refit(); cardPanel?.place(near: w.rect); cardPanel?.orderFrontRegardless()
        DispatchQueue.main.async { self.cardPanel?.refit(); self.cardPanel?.place(near: w.rect) }
        armClickAway()
        if card.meaning.isEmpty {
            Task { @MainActor in
                let m = await Sync.lookup(k) ?? "Not in the dictionary yet."
                if self.card.word == w.text { self.card.meaning = m; self.cardPanel?.refit() }
            }
        }
    }
    private func saveCurrent(key: String) {
        let date = DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .none).replacingOccurrences(of: ", \\d{4}$", with: "", options: .regularExpression)
        let app = NSWorkspace.shared.frontmostApplication?.localizedName ?? "Mac"
        let word = Sync.Saved(key: key, w: card.word.lowercased(), m: card.meaning, s: card.sentence, p: card.plain != card.sentence ? card.plain : "", place: "Mac · \(app)", date: date)
        card.saved = true
        Task { @MainActor in
            switch await Sync.save(word) {
            case .synced: self.card.note = "Sent to the Linger app on your phone."
            case .notPaired: self.card.note = "Saved on this Mac. Connect your phone from the Linger menu to send words there."
            case .failed: self.card.note = "Saved on this Mac. Couldn’t reach your phone right now."
            }
            self.cardPanel?.refit()
        }
    }
    private func closeCard() { cardPanel?.orderOut(nil); mode.cardClosed(); if let c = clickAway { NSEvent.removeMonitor(c); clickAway = nil } }
    /// Close the card when the user clicks somewhere else.
    private func armClickAway() {
        if let c = clickAway { NSEvent.removeMonitor(c) }
        clickAway = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in self?.closeCard() }
    }

    // MARK: Explain the window you're reading

    func explainWindow() {
        guard ScreenReader.hasPermission else { toast("Allow screen reading first (Linger menu)"); askPermission(); return }
        toast("Reading this window…")
        Task { @MainActor in
            do {
                let (img, frame, appName) = try await ScreenReader.captureFrontWindow()
                let result = try await ScreenReader.read(img, area: frame)
                let s = Words.shared.summarize(ScreenReader.paragraphs(result))
                explain.source = "From \(appName)"
                explain.points = s.points; explain.dates = s.dates; explain.hardWords = s.hardWords
                explain.picked = ""; explain.pickedMeaning = ""
                if explainPanel == nil { explainPanel = FloatingPanel(ExplainView(m: explain)) }
                toastPanel?.orderOut(nil)
                explainPanel?.refit(); explainPanel?.placeTopRight(); explainPanel?.orderFrontRegardless()
                DispatchQueue.main.async { self.explainPanel?.refit(); self.explainPanel?.placeTopRight() }
            } catch ScreenReader.Failure.noWindow { toast("No window to explain") } catch { toast("Couldn’t read this window") }
        }
    }
    private func pickHardWord(_ w: String) {
        let k = Words.key(w)
        explain.picked = w
        explain.pickedMeaning = Words.shared.knownMeaning(k) ?? ""
        explainPanel?.refit()
        if explain.pickedMeaning.isEmpty {
            Task { @MainActor in
                let m = await Sync.lookup(k) ?? "Not in the dictionary yet."
                if self.explain.picked == w { self.explain.pickedMeaning = m; self.explainPanel?.refit() }
            }
        }
    }

    // MARK: Phone pairing

    @objc private func showPair() {
        pair.code = ""; pair.message = ""
        if pairPanel == nil { pairPanel = FloatingPanel(PairView(m: pair), focusable: true) }
        pairPanel?.refit(); pairPanel?.center()
        NSApp.activate(ignoringOtherApps: true)
        pairPanel?.makeKeyAndOrderFront(nil)
    }
    private func connectPhone() {
        let code = Sync.tidy(pair.code)
        guard code.count >= 10 else { pair.message = "The code has 12 letters and numbers."; return }
        pair.message = "Checking…"
        Task { @MainActor in
            if await Sync.check(code) { Sync.pairCode = code; pair.message = "Connected ✓"; DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { self.pairPanel?.orderOut(nil) } }
            else { pair.message = "Couldn’t reach Linger. Check your internet connection." }
        }
    }

    // MARK: Small helpers

    func toast(_ text: String) {
        toastPanel?.orderOut(nil)
        toastPanel = FloatingPanel(ToastView(text: text))
        let p = ScreenReader.mouse()
        toastPanel?.place(near: CGRect(x: p.x - 10, y: p.y + 14, width: 20, height: 4))
        toastPanel?.orderFrontRegardless()
        let shown = toastPanel
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { if self.toastPanel === shown { shown?.orderOut(nil) } }
    }

    /// The Linger ring-and-dot mark as a menu-bar (template) icon.
    static func menuIcon() -> NSImage {
        let img = NSImage(size: NSSize(width: 18, height: 18), flipped: false) { r in
            NSColor.black.setStroke(); NSColor.black.setFill()
            let ring = NSBezierPath(ovalIn: r.insetBy(dx: 2.2, dy: 2.2)); ring.lineWidth = 2; ring.stroke()
            NSBezierPath(ovalIn: r.insetBy(dx: 6, dy: 6)).fill()
            return true
        }
        img.isTemplate = true
        return img
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
