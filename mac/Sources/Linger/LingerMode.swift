import AppKit

/// Linger mode: keeps the window you're reading underlined. About once a second it captures the front window,
/// and only if something changed, recognizes the text again and redraws orange dotted underlines under the hard
/// words. Rest the mouse on an underlined word to open its card. Scrolling hides the lines until the page settles.
final class LingerMode {
    private(set) var isOn = false
    var onHover: (ScreenReader.Word, String) -> Void = { _, _ in }
    var onStatus: (String) -> Void = { _ in }

    private var overlays: [(window: NSWindow, view: UnderlineView, screen: NSScreen)] = []
    private var timer: Timer?
    private var monitors: [Any] = []
    private var busy = false
    private var last: (sig: [UInt8], frame: CGRect, pid: pid_t)?
    private var result: ScreenReader.Result?
    private var hard: [ScreenReader.Word] = []
    private var hover: (word: ScreenReader.Word, since: Date)?
    private var shownFor: CGRect?
    private var scrolledAt = Date.distantPast

    func start() {
        guard !isOn else { return }
        isOn = true
        buildOverlays()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in self?.tick() }
        // Mouse movement and scrolling can be watched without extra permissions.
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .scrollWheel, handler: { [weak self] _ in self?.scrolled() }) { monitors.append(m) }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: [.mouseMoved], handler: { [weak self] _ in self?.mouseMoved() }) { monitors.append(m) }
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(appChanged), name: NSWorkspace.didActivateApplicationNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        tick()
    }

    func stop() {
        isOn = false
        timer?.invalidate(); timer = nil
        monitors.forEach { NSEvent.removeMonitor($0) }; monitors = []
        NSWorkspace.shared.notificationCenter.removeObserver(self)
        NotificationCenter.default.removeObserver(self)
        overlays.forEach { $0.window.orderOut(nil) }; overlays = []
        hard = []; result = nil; last = nil
    }

    // One click-through transparent window per screen, just below Linger's own panels.
    private func buildOverlays() {
        overlays.forEach { $0.window.orderOut(nil) }
        overlays = NSScreen.screens.map { screen in
            let w = NSWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
            w.isOpaque = false; w.backgroundColor = .clear; w.hasShadow = false
            w.ignoresMouseEvents = true
            w.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue - 1)
            w.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
            w.sharingType = .none // keep our underlines out of screen captures
            let v = UnderlineView(frame: NSRect(origin: .zero, size: screen.frame.size))
            w.contentView = v
            w.setFrame(screen.frame, display: false)
            w.orderFrontRegardless()
            return (w, v, screen)
        }
    }
    @objc private func screensChanged() { if isOn { buildOverlays(); redraw() } }
    @objc private func appChanged() { hard = []; redraw(); last = nil; DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { self.tick() } }

    private func scrolled() {
        scrolledAt = Date()
        if !hard.isEmpty { hard = []; redraw() } // positions are stale while the page moves
    }

    private func tick() {
        guard isOn, !busy, ScreenReader.hasPermission, Date().timeIntervalSince(scrolledAt) > 0.6 else { return }
        busy = true
        Task { @MainActor in
            defer { self.busy = false }
            guard let (img, frame, _) = try? await ScreenReader.captureFrontWindow() else { return }
            let pid = NSWorkspace.shared.frontmostApplication?.processIdentifier ?? 0
            let sig = LingerMode.signature(img)
            // Nothing changed since the last scan: keep the current underlines.
            if let l = last, l.pid == pid, l.frame == frame, LingerMode.same(l.sig, sig) { return }
            guard let r = try? await ScreenReader.read(img, area: frame) else { return }
            guard self.isOn, Date().timeIntervalSince(self.scrolledAt) > 0.6 else { return }
            self.last = (sig, frame, pid)
            self.result = r
            self.hard = LingerMode.hardWords(in: r)
            self.redraw()
            self.onStatus(self.hard.isEmpty ? "No hard words in this window" : "\(self.hard.count) hard words underlined")
        }
    }

    /// Which recognized words to underline. Only words inside real sentences count: menus, sidebars, buttons,
    /// web and email addresses, and code are skipped, and so are words macOS's spell checker doesn't know
    /// (names, brands, and text the recognizer misread).
    static func hardWords(in r: ScreenReader.Result) -> [ScreenReader.Word] {
        var out: [ScreenReader.Word] = []
        var firstSeen = Set<Int>()
        for w in r.words {
            let li = w.lineIndex, line = r.lines[li]
            let isFirst = !firstSeen.contains(li); firstSeen.insert(li)
            guard isProse(line) else { continue }
            // Vision sometimes returns the whole line's box for one word; skip boxes far wider than the word.
            if let lr = r.lineRects[safe: li], line.count > 0 {
                let perChar = lr.width / CGFloat(line.count)
                if w.rect.width > perChar * CGFloat(w.text.count) * 2.2 + 12 { continue }
            }
            let prev = li > 0 ? r.lines[li - 1].trimmingCharacters(in: .whitespaces) : ""
            let sentenceStart = isFirst && (li == 0 || prev.isEmpty || ".!?:".contains(prev.last!))
            guard Words.shared.classify(w.text, sentenceStart: sentenceStart) != nil else { continue }
            let k = Words.key(w.text)
            let known = Words.shared.plain[k] != nil || Words.shared.hard[k] != nil || Words.shared.slang[k] != nil
            guard known || Words.shared.isRealWord(w.text) else { continue }
            out.append(w)
            if out.count >= 400 { break }
        }
        return out
    }

    /// A line of running text, not a menu item, label, button, address or code.
    static func isProse(_ line: String) -> Bool {
        let l = line.lowercased()
        if l.contains("://") || l.contains("www.") || l.contains("@") || l.contains(".com") || l.contains(".org") || l.contains(".gov") { return false }
        if line.contains("{") || line.contains("}") || line.contains(";") || line.contains("=") || line.contains("</") || line.contains("()") { return false }
        let words = line.split(whereSeparator: { $0 == " " || $0 == "\t" }).filter { $0.contains(where: { $0.isLetter }) }
        guard words.count >= 5 else { return false }
        let letters = line.filter { $0.isLetter }.count
        return Double(letters) / Double(max(line.count, 1)) > 0.65
    }

    private func redraw() {
        for o in overlays {
            let sf = o.screen.frame
            o.view.lines = hard.compactMap { w in
                let c = ScreenReader.toCocoa(w.rect)
                guard sf.intersects(c) else { return nil }
                return CGRect(x: c.minX - sf.minX, y: c.minY - sf.minY, width: c.width, height: c.height)
            }
            o.view.hot = hover.flatMap { h in
                let c = ScreenReader.toCocoa(h.word.rect); return CGRect(x: c.minX - sf.minX, y: c.minY - sf.minY, width: c.width, height: c.height)
            }
            o.view.needsDisplay = true
        }
    }

    // Rest the mouse on an underlined word for ~0.6 s to open its card.
    private func mouseMoved() {
        let p = ScreenReader.mouse()
        guard let w = hard.first(where: { $0.rect.insetBy(dx: -2, dy: -3).contains(p) }) else {
            if hover != nil { hover = nil; redraw() }
            return
        }
        if hover?.word.rect != w.rect { hover = (w, Date()); redraw() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) { [weak self] in
            guard let self, let h = self.hover, h.word.rect == w.rect, Date().timeIntervalSince(h.since) >= 0.6, self.shownFor != w.rect, let r = self.result else { return }
            self.shownFor = w.rect
            self.onHover(w, ScreenReader.sentence(around: w, in: r))
        }
    }
    func cardClosed() { shownFor = nil }

    /// A tiny 32×32 grayscale thumbnail, to tell cheaply whether the window changed.
    static func signature(_ img: CGImage) -> [UInt8] {
        var px = [UInt8](repeating: 0, count: 32 * 32)
        let ctx = CGContext(data: &px, width: 32, height: 32, bitsPerComponent: 8, bytesPerRow: 32, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
        ctx?.interpolationQuality = .low
        ctx?.draw(img, in: CGRect(x: 0, y: 0, width: 32, height: 32))
        return px
    }
    static func same(_ a: [UInt8], _ b: [UInt8]) -> Bool {
        guard a.count == b.count else { return false }
        var diff = 0
        for i in 0..<a.count { diff += abs(Int(a[i]) - Int(b[i])) }
        return Double(diff) / Double(a.count) < 1.5
    }
}

/// Draws Linger's orange dotted underline under each hard word (and a soft highlight under the hovered one).
final class UnderlineView: NSView {
    var lines: [CGRect] = []
    var hot: CGRect?
    override var isFlipped: Bool { false }
    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.set(); dirtyRect.fill()
        if let h = hot {
            NSColor(red: 1, green: 0.85, blue: 0.54, alpha: 0.38).setFill()
            NSBezierPath(roundedRect: h.insetBy(dx: -2, dy: -1), xRadius: 3, yRadius: 3).fill()
        }
        let orange = NSColor(red: 0xF2 / 255, green: 0xA3 / 255, blue: 0x3A / 255, alpha: 0.95)
        orange.setStroke()
        for r in lines {
            let path = NSBezierPath()
            let y = r.minY - 1.5
            path.move(to: NSPoint(x: r.minX, y: y)); path.line(to: NSPoint(x: r.maxX, y: y))
            path.lineWidth = 2
            path.setLineDash([2, 2.5], count: 2, phase: 0)
            path.lineCapStyle = .round
            path.stroke()
        }
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
