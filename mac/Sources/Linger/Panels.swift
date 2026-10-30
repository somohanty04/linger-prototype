import AppKit
import SwiftUI
import AVFoundation

// MARK: - Look and feel (the phone app's final-draft colors)

enum Ink {
    static let indigo900 = Color(red: 0x1F / 255, green: 0x2A / 255, blue: 0xA8 / 255)
    static let indigo500 = Color(red: 0x6D / 255, green: 0x79 / 255, blue: 0xFF / 255)
    static let indigo100 = Color(red: 0xEA / 255, green: 0xEF / 255, blue: 0xFF / 255)
    static let indigo50 = Color(red: 0xF6 / 255, green: 0xF8 / 255, blue: 0xFF / 255)
    static let cyan = Color(red: 0x44 / 255, green: 0xC9 / 255, blue: 0xE6 / 255)
    static let blue = Color(red: 0x2E / 255, green: 0x50 / 255, blue: 0xD8 / 255)
    static let ink = Color(red: 0x14 / 255, green: 0x16 / 255, blue: 0x1F / 255)
    static let muted = Color(red: 0x5B / 255, green: 0x60 / 255, blue: 0x70 / 255)
    static let okInk = Color(red: 0x11 / 255, green: 0x59 / 255, blue: 0x40 / 255)
    static let okBg = Color(red: 0xF0 / 255, green: 0xFF / 255, blue: 0xFA / 255)
    static let cta = LinearGradient(colors: [indigo500, Color(red: 0x2B / 255, green: 0x39 / 255, blue: 0xB2 / 255)], startPoint: .leading, endPoint: .trailing)
    static let hero = LinearGradient(colors: [Color(red: 0x1F / 255, green: 0x2D / 255, blue: 0xA8 / 255), Color(red: 0x54 / 255, green: 0x64 / 255, blue: 0xD9 / 255)], startPoint: .topLeading, endPoint: .bottomTrailing)
}

enum Speech {
    static let synth = AVSpeechSynthesizer()
    static func say(_ text: String) {
        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: text); u.voice = AVSpeechSynthesisVoice(language: "en-US"); u.rate = 0.45
        synth.speak(u)
    }
}

// MARK: - A floating panel that sits on top of every app without taking focus away

final class FloatingPanel: NSPanel {
    init<V: View>(_ view: V, focusable: Bool = false) {
        super.init(contentRect: .zero, styleMask: focusable ? [.borderless] : [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isFloatingPanel = true
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient]
        backgroundColor = .clear
        isOpaque = false
        hasShadow = true
        hidesOnDeactivate = false
        isMovableByWindowBackground = true
        let host = NSHostingView(rootView: view)
        contentView = host
        setContentSize(host.fittingSize)
    }
    override var canBecomeKey: Bool { true }
    func refit() { if let h = contentView as? NSHostingView<AnyView> { setContentSize(h.fittingSize) } else if let v = contentView { setContentSize(v.fittingSize) } }
    /// Put the panel next to a screen rect (Quartz coords), below it if there's room, otherwise above; keep it on screen.
    func place(near quartz: CGRect) {
        let target = ScreenReader.toCocoa(quartz)
        let screen = NSScreen.screens.first { $0.frame.intersects(target) } ?? NSScreen.main ?? NSScreen.screens[0]
        let vis = screen.visibleFrame
        let size = frame.size
        var x = min(max(vis.minX + 8, target.minX), vis.maxX - size.width - 8)
        var y = target.minY - size.height - 8
        if y < vis.minY + 8 { y = min(target.maxY + 8, vis.maxY - size.height - 8) }
        x = max(vis.minX + 8, x)
        setFrameOrigin(NSPoint(x: x, y: y))
    }
    func placeTopRight() {
        let vis = (NSScreen.main ?? NSScreen.screens[0]).visibleFrame
        setFrameOrigin(NSPoint(x: vis.maxX - frame.width - 16, y: vis.maxY - frame.height - 16))
    }
}

struct Pill: View {
    let text: String; var fg: Color = .white; var bg: Color = Ink.blue
    var body: some View { Text(text).font(.system(size: 11, weight: .bold)).foregroundColor(fg).padding(.horizontal, 8).padding(.vertical, 3).background(bg).cornerRadius(5) }
}

struct RoundButton: View {
    let title: String; var primary = false; var done = false; let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(.system(size: 13, weight: .bold)).frame(maxWidth: .infinity).frame(height: 34)
                .foregroundColor(done ? Ink.okInk : primary ? .white : Ink.indigo900)
                .background(Group { if done { Ink.okBg } else if primary { Ink.cta } else { Color.white } })
                .clipShape(Capsule())
                .overlay(Capsule().stroke(done ? Ink.okInk.opacity(0.3) : primary ? Color.clear : Ink.indigo500.opacity(0.45), lineWidth: 1))
        }.buttonStyle(.plain)
    }
}

// MARK: - Word card

final class CardModel: ObservableObject {
    @Published var word = ""
    @Published var kind: Words.Kind = .hard
    @Published var say = ""
    @Published var meaning = ""
    @Published var sentence = ""
    @Published var plain = ""
    @Published var local = ""
    @Published var city = ""
    @Published var saved = false
    @Published var note = ""
    @Published var why = ""
    var onClose: () -> Void = {}
    var onSave: () -> Void = {}
}

struct CardView: View {
    @ObservedObject var m: CardModel
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !m.why.isEmpty { Text("👁 " + m.why).font(.system(size: 11, weight: .bold)).foregroundColor(Color(red: 0.54, green: 0.35, blue: 0)).padding(.horizontal, 8).padding(.vertical, 4).background(Color(red: 1, green: 0.96, blue: 0.89)).cornerRadius(7) }
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(m.word).font(.system(size: 24, weight: .heavy)).foregroundColor(Ink.indigo900)
                    if !m.say.isEmpty { Text("/\(m.say)/").font(.system(size: 11, weight: .bold)).foregroundColor(Color(red: 0.04, green: 0.48, blue: 0.53)).padding(.horizontal, 8).padding(.vertical, 2).background(Color(red: 0.87, green: 0.96, blue: 0.96)).clipShape(Capsule()) }
                }
                Spacer()
                Pill(text: m.kind == .slang ? "Local slang" : m.kind == .hard ? "Hard word" : "Word", fg: m.kind == .word ? Ink.muted : .white, bg: m.kind == .slang ? Ink.cyan : m.kind == .hard ? Ink.blue : Color(white: 0.93))
                Button(action: m.onClose) { Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundColor(Ink.indigo900).frame(width: 26, height: 26).background(Ink.indigo100).clipShape(Circle()) }.buttonStyle(.plain)
            }
            Text(m.meaning.isEmpty ? "Looking up…" : m.meaning).font(.system(size: 15, weight: .semibold)).foregroundColor(Ink.ink).fixedSize(horizontal: false, vertical: true)
            if !m.sentence.isEmpty {
                Text(m.plain != m.sentence ? "THIS SENTENCE IN PLAIN ENGLISH" : "IN THIS SENTENCE").font(.system(size: 10, weight: .bold)).foregroundColor(Ink.muted)
                Text(m.plain != m.sentence ? m.plain : "“\(m.sentence)”").font(.system(size: 13)).foregroundColor(Ink.ink).padding(8).frame(maxWidth: .infinity, alignment: .leading).background(Ink.indigo50).cornerRadius(9).fixedSize(horizontal: false, vertical: true)
                if m.plain != m.sentence { Text("“\(m.sentence)”").font(.system(size: 12).italic()).foregroundColor(Ink.muted).fixedSize(horizontal: false, vertical: true) }
            }
            if !m.local.isEmpty { Text("📍 \(m.city): \(m.local)").font(.system(size: 12)).foregroundColor(Ink.indigo900).padding(8).frame(maxWidth: .infinity, alignment: .leading).background(Ink.indigo100).cornerRadius(9).fixedSize(horizontal: false, vertical: true) }
            HStack(spacing: 8) {
                RoundButton(title: "🔊 Hear it") { Speech.say("\(m.word). \(m.sentence)") }
                RoundButton(title: m.saved ? "✓ Saved" : "★ Save to Linger", primary: !m.saved, done: m.saved, action: m.onSave)
            }
            if !m.note.isEmpty { Text(m.note).font(.system(size: 11)).foregroundColor(Ink.muted).fixedSize(horizontal: false, vertical: true) }
        }
        .padding(14).frame(width: 320).background(Color.white).cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.black.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Explain this window

final class ExplainModel: ObservableObject {
    @Published var title = "What this wants from you"
    @Published var source = ""
    @Published var points: [(String, String)] = []
    @Published var dates: [String] = []
    @Published var hardWords: [String] = []
    @Published var picked = ""
    @Published var pickedMeaning = ""
    var onClose: () -> Void = {}
    var onPick: (String) -> Void = { _ in }
}

struct ExplainView: View {
    @ObservedObject var m: ExplainModel
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("✦ " + m.title).font(.system(size: 17, weight: .heavy)).foregroundColor(.white)
                    if !m.source.isEmpty { Text(m.source).font(.system(size: 11)).foregroundColor(Color.white.opacity(0.8)) }
                }
                Spacer()
                Button(action: m.onClose) { Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundColor(.white).frame(width: 26, height: 26).background(Color.white.opacity(0.2)).clipShape(Circle()) }.buttonStyle(.plain)
            }.padding(14).background(Ink.hero)
            VStack(alignment: .leading, spacing: 10) {
                if m.points.isEmpty { Text("Linger couldn’t find instructions in this window.").font(.system(size: 13)) }
                ForEach(Array(m.points.enumerated()), id: \.offset) { _, p in
                    HStack(alignment: .top, spacing: 10) { Text(p.0); Text(p.1).font(.system(size: 13)).fixedSize(horizontal: false, vertical: true) }
                        .padding(10).frame(maxWidth: .infinity, alignment: .leading).background(Ink.indigo50).cornerRadius(11)
                }
                if !m.dates.isEmpty {
                    Text("KEY DATES AND AMOUNTS").font(.system(size: 10, weight: .bold)).foregroundColor(Ink.muted)
                    FlowRow(items: m.dates) { Text($0).font(.system(size: 12, weight: .bold)).foregroundColor(Ink.okInk).padding(.horizontal, 10).padding(.vertical, 4).background(Ink.okBg).clipShape(Capsule()) }
                }
                if !m.hardWords.isEmpty {
                    Text("HARD WORDS · CLICK FOR THE MEANING").font(.system(size: 10, weight: .bold)).foregroundColor(Ink.muted)
                    FlowRow(items: m.hardWords) { w in
                        Button { m.onPick(w) } label: { Text(w).font(.system(size: 12, weight: .bold)).foregroundColor(m.picked == w ? .white : Ink.indigo900).padding(.horizontal, 10).padding(.vertical, 4).background(m.picked == w ? Ink.indigo500 : Ink.indigo100).clipShape(Capsule()) }.buttonStyle(.plain)
                    }
                    if !m.picked.isEmpty { Text("\(m.picked): \(m.pickedMeaning.isEmpty ? "Looking up…" : m.pickedMeaning)").font(.system(size: 13)).padding(8).frame(maxWidth: .infinity, alignment: .leading).background(Ink.indigo100).cornerRadius(9).fixedSize(horizontal: false, vertical: true) }
                }
                RoundButton(title: "🔊 Read aloud") { Speech.say(m.points.map { $0.1 }.joined(separator: " ")) }
                Text("Made by swapping formal words for plain ones in the important sentences.").font(.system(size: 11)).foregroundColor(Ink.muted)
            }.padding(14)
        }
        .frame(width: 380).background(Color.white).cornerRadius(18)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.black.opacity(0.08), lineWidth: 1))
    }
}

/// Wrapping row of chips.
struct FlowRow<Item: Hashable, V: View>: View {
    let items: [Item]; let content: (Item) -> V
    var body: some View {
        WrapLayout(spacing: 6) { ForEach(items, id: \.self) { content($0) } }
    }
}

struct WrapLayout: Layout {
    var spacing: CGFloat = 6
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? 350; var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0
        for s in subviews { let z = s.sizeThatFits(.unspecified); if x + z.width > maxW, x > 0 { x = 0; y += rowH + spacing; rowH = 0 }; x += z.width + spacing; rowH = max(rowH, z.height) }
        return CGSize(width: maxW, height: y + rowH)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for s in subviews { let z = s.sizeThatFits(.unspecified); if x + z.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowH + spacing; rowH = 0 }; s.place(at: CGPoint(x: x, y: y), proposal: .unspecified); x += z.width + spacing; rowH = max(rowH, z.height) }
    }
}

// MARK: - Connect the phone

final class PairModel: ObservableObject {
    @Published var code = ""
    @Published var message = ""
    var onConnect: () -> Void = {}
    var onClose: () -> Void = {}
}

struct PairView: View {
    @ObservedObject var m: PairModel
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { Text("📱 Connect your phone").font(.system(size: 16, weight: .heavy)).foregroundColor(Ink.indigo900); Spacer()
                Button(action: m.onClose) { Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).foregroundColor(Ink.indigo900).frame(width: 26, height: 26).background(Ink.indigo100).clipShape(Circle()) }.buttonStyle(.plain) }
            Text("In the Linger phone app, open Words → Turn on live sync, and type the 12-character code here. Words you save on the Mac then appear on your phone.").font(.system(size: 12)).foregroundColor(Ink.muted).fixedSize(horizontal: false, vertical: true)
            HStack {
                TextField("xxxx-xxxx-xxxx", text: $m.code).textFieldStyle(.roundedBorder).font(.system(size: 14, design: .monospaced)).onSubmit(m.onConnect)
                Button("Connect", action: m.onConnect).keyboardShortcut(.defaultAction)
            }
            if !m.message.isEmpty { Text(m.message).font(.system(size: 12)).foregroundColor(Ink.muted) }
        }.padding(16).frame(width: 360).background(Color.white).cornerRadius(16)
    }
}

// MARK: - Short notice near the mouse

struct ToastView: View {
    let text: String
    var body: some View { Text(text).font(.system(size: 13, weight: .semibold)).foregroundColor(.white).padding(.horizontal, 14).padding(.vertical, 9).background(Ink.indigo900).clipShape(Capsule()) }
}
