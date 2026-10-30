import AppKit
import ScreenCaptureKit
import Vision

/// Reads text that's on screen in any app: capture part of the screen (ScreenCaptureKit), then recognize the
/// words and where they are (Vision). Everything happens on this Mac. Needs the Screen Recording permission.
///
/// Coordinates are "global Quartz" points: (0,0) is the top-left of the main display, y grows downward.
enum ScreenReader {
    struct Word { let text: String; let rect: CGRect; let lineIndex: Int }
    struct Result { let words: [Word]; let lines: [String]; let lineRects: [CGRect] }

    enum Failure: Error { case noPermission, noDisplay, noWindow }

    static var hasPermission: Bool { CGPreflightScreenCaptureAccess() }
    @discardableResult static func requestPermission() -> Bool { CGRequestScreenCaptureAccess() }

    static var mainHeight: CGFloat { NSScreen.screens.first?.frame.height ?? 0 }
    static func mouse() -> CGPoint { let m = NSEvent.mouseLocation; return CGPoint(x: m.x, y: mainHeight - m.y) }
    /// Quartz rect → AppKit rect (bottom-left origin), for placing windows.
    static func toCocoa(_ r: CGRect) -> CGRect { CGRect(x: r.minX, y: mainHeight - r.maxY, width: r.width, height: r.height) }

    private static func content() async throws -> SCShareableContent {
        try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
    }

    /// Capture a rectangle of the screen (Linger's own windows are left out).
    static func capture(_ rect: CGRect) async throws -> (CGImage, CGRect) {
        guard hasPermission else { throw Failure.noPermission }
        let c = try await content()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        guard let display = c.displays.first(where: { $0.frame.contains(center) }) ?? c.displays.first else { throw Failure.noDisplay }
        let mine = c.windows.filter { $0.owningApplication?.processID == ProcessInfo.processInfo.processIdentifier }
        let filter = SCContentFilter(display: display, excludingWindows: mine)
        let clipped = rect.intersection(display.frame)
        let config = SCStreamConfiguration()
        config.sourceRect = clipped.offsetBy(dx: -display.frame.minX, dy: -display.frame.minY)
        let scale = CGFloat(filter.pointPixelScale)
        config.width = Int(clipped.width * scale); config.height = Int(clipped.height * scale)
        config.showsCursor = false
        let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
        return (image, clipped)
    }

    /// Capture the frontmost app's main window (the one you're reading).
    static func captureFrontWindow() async throws -> (CGImage, CGRect, String) {
        guard hasPermission else { throw Failure.noPermission }
        let c = try await content()
        let me = ProcessInfo.processInfo.processIdentifier
        let front = NSWorkspace.shared.frontmostApplication
        let pid = (front?.processIdentifier == me ? nil : front?.processIdentifier)
        let candidates = c.windows.filter { w in
            w.isOnScreen && w.windowLayer == 0 && w.frame.width > 200 && w.frame.height > 120 && w.owningApplication?.processID != me &&
            (pid == nil || w.owningApplication?.processID == pid)
        }
        guard let win = candidates.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else { throw Failure.noWindow }
        let filter = SCContentFilter(desktopIndependentWindow: win)
        let config = SCStreamConfiguration()
        let scale = CGFloat(filter.pointPixelScale)
        config.width = Int(win.frame.width * scale); config.height = Int(win.frame.height * scale)
        config.showsCursor = false
        let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
        return (image, win.frame, win.owningApplication?.applicationName ?? "this window")
    }

    /// Recognize text and the position of every word. `area` is where the image sits on screen.
    static func read(_ image: CGImage, area: CGRect) async throws -> Result {
        // Run text recognition off the main thread; results are read after perform() returns (no callback to double-resume).
        let observations: [VNRecognizedTextObservation] = try await Task.detached(priority: .userInitiated) {
            let req = VNRecognizeTextRequest()
            req.recognitionLevel = .accurate
            req.usesLanguageCorrection = true
            req.recognitionLanguages = ["en-US"]
            try VNImageRequestHandler(cgImage: image, options: [:]).perform([req])
            return req.results ?? []
        }.value
        let toScreen = { (b: CGRect) -> CGRect in
            CGRect(x: area.minX + b.minX * area.width, y: area.minY + (1 - b.maxY) * area.height, width: b.width * area.width, height: b.height * area.height)
        }
        // Reading order: top to bottom, then left to right.
        let sorted = observations.sorted { a, b in
            abs(a.boundingBox.midY - b.boundingBox.midY) > 0.01 ? a.boundingBox.midY > b.boundingBox.midY : a.boundingBox.minX < b.boundingBox.minX
        }
        let wordRe = try! NSRegularExpression(pattern: "[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]")
        var words: [Word] = [], lines: [String] = [], lineRects: [CGRect] = []
        for obs in sorted {
            guard let cand = obs.topCandidates(1).first else { continue }
            let s = cand.string
            let li = lines.count
            lines.append(s); lineRects.append(toScreen(obs.boundingBox))
            for m in wordRe.matches(in: s, range: NSRange(s.startIndex..., in: s)) {
                guard let r = Range(m.range, in: s), let box = try? cand.boundingBox(for: r) else { continue }
                words.append(Word(text: String(s[r]), rect: toScreen(box.boundingBox), lineIndex: li))
            }
        }
        return Result(words: words, lines: lines, lineRects: lineRects)
    }

    /// Rejoin screen lines into paragraphs: a bigger vertical gap (or a heading) starts a new paragraph.
    static func paragraphs(_ r: Result) -> String {
        var out = ""
        for (i, line) in r.lines.enumerated() {
            if i == 0 { out = line; continue }
            let prev = r.lineRects[i - 1], cur = r.lineRects[i]
            let gap = cur.minY - prev.maxY, h = max(prev.height, cur.height, 1)
            let heading = r.lines[i - 1] == r.lines[i - 1].uppercased() || line == line.uppercased()
            let newPara = gap > h * 0.9 || gap < -h * 0.5 || heading
            if newPara { out += "\n" + line }
            else if out.hasSuffix("-") { out.removeLast(); out += line }
            else { out += " " + line }
        }
        return out
    }

    /// The sentence a word sits in, using the lines around it.
    static func sentence(around word: Word, in result: Result) -> String {
        let lo = max(0, word.lineIndex - 2), hi = min(result.lines.count - 1, word.lineIndex + 2)
        let sub = Result(words: [], lines: Array(result.lines[lo...hi]), lineRects: Array(result.lineRects[lo...hi]))
        let text = paragraphs(sub)
        let s = Words.sentences(text).first { $0.contains(word.text) } ?? result.lines[word.lineIndex]
        return s.count > 260 ? String(s.prefix(260)) + "…" : s
    }
}
