import SwiftUI
import WebKit

/// The live beta page in a web view, plus the bridge that hands it screenshots and text from the Share extension.
@MainActor
final class WebModel: NSObject, ObservableObject {
    static let live = URL(string: "https://somohanty04.github.io/linger-prototype/beta/")!
    #if DEBUG
    // For testing against a local copy:  xcrun simctl launch booted com.somohanty.linger -LingerURL http://localhost:8765/beta/
    static let home = UserDefaults.standard.string(forKey: "LingerURL").flatMap(URL.init(string:)) ?? live
    #else
    static let home = live
    #endif
    static let host = home.host ?? "somohanty04.github.io"

    @Published var failed = false
    let webView: WKWebView
    private var pageReady = false
    private var waiting: Inbox.Item?

    override init() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true            // camera preview plays inside the page
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "Mobile/15E148 Safari/604.1 LingerApp/" + (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
        let controller = WKUserContentController()
        config.userContentController = controller
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        controller.add(WeakHandler(self), name: "linger")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "LaunchBackground")
        webView.scrollView.contentInsetAdjustmentBehavior = .never // the page handles the notch itself
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = false
        #if DEBUG
        webView.isInspectable = true // Safari → Develop menu, for debugging
        #endif
        webView.load(URLRequest(url: Self.home))
    }

    func reload() {
        failed = false
        pageReady = false
        webView.load(URLRequest(url: Self.home))
    }

    /// linger://share?id=… from the Share extension.
    func open(_ url: URL) {
        guard url.scheme == Inbox.scheme else { return }
        let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "id" }?.value
        if let item = Inbox.take(id) { deliver(item) }
    }

    func checkInbox() {
        if let item = Inbox.take() { deliver(item) }
    }

    private func deliver(_ item: Inbox.Item) {
        guard pageReady else { waiting = item; return }
        let message: [String: String]
        switch item {
        case .image(let data): message = ["type": "image", "data": "data:image/jpeg;base64," + data.base64EncodedString()]
        case .text(let s): message = ["type": "text", "text": s]
        }
        guard let json = try? JSONSerialization.data(withJSONObject: message),
              let arg = String(data: json, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.LingerNative && LingerNative.receive(\(arg))")
    }

    /// Say it: listen for one word and hand the page what was heard.
    private let listener = SpeechListener()
    fileprivate func listen(_ start: Bool) {
        guard start else { listener.stop(); return }
        listener.start { [weak self] texts, error in
            guard let self, let json = try? JSONSerialization.data(withJSONObject: ["texts": texts, "error": error ?? NSNull()] as [String: Any]),
                  let arg = String(data: json, encoding: .utf8) else { return }
            self.webView.evaluateJavaScript("window.LingerNative && LingerNative.heard(\(arg))")
        }
    }

    fileprivate func pageSaidReady() {
        pageReady = true
        if let item = waiting { waiting = nil; deliver(item) } else { checkInbox() }
    }
}

extension WebModel: WKNavigationDelegate, WKUIDelegate {
    // Linger's own pages stay in the app; other links (e.g. the Chrome extension download) open in Safari.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = action.request.url else { return .cancel }
        if url.host == Self.host || url.scheme == "about" || url.scheme == "data" || url.scheme == "blob" || action.targetFrame?.isMainFrame == false {
            return .allow
        }
        if action.navigationType == .linkActivated || action.targetFrame == nil {
            await UIApplication.shared.open(url)
            return .cancel
        }
        return .allow
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { pageReady = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed = true }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { reload() }

    // target="_blank" links
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { UIApplication.shared.open(url) }
        return nil
    }

    // Camera for Lens: the system asks the person once; the page is Linger's own.
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType) async -> WKPermissionDecision {
        origin.host == Self.host ? .grant : .prompt
    }

    // alert / confirm / prompt from the page
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
        await present(message, buttons: [("OK", true)])
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
        await present(message, buttons: [("Cancel", false), ("OK", true)])
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo) async -> String? {
        UIPasteboard.general.string = defaultText
        _ = await present(prompt + (defaultText.map { "\n\n\($0)\n\n(Copied.)" } ?? ""), buttons: [("OK", true)])
        return defaultText
    }

    private func present(_ message: String, buttons: [(String, Bool)]) async -> Bool {
        await withCheckedContinuation { done in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            for (title, value) in buttons {
                alert.addAction(UIAlertAction(title: title, style: value ? .default : .cancel) { _ in done.resume(returning: value) })
            }
            guard let root = webView.window?.rootViewController else { done.resume(returning: false); return }
            var top = root
            while let next = top.presentedViewController { top = next }
            top.present(alert, animated: true)
        }
    }
}

/// Messages from the page: { ready: true } once the app has started; { haptic: "light" | "medium" | "success" } for a tap you can feel.
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var model: WebModel?
    init(_ model: WebModel) { self.model = model }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.request.url?.host == WebModel.host, let body = message.body as? [String: Any] else { return }
        MainActor.assumeIsolated {
            if body["ready"] as? Bool == true { model?.pageSaidReady() }
            if let kind = body["haptic"] as? String { Haptics.play(kind) }
            if let listen = body["listen"] as? String { model?.listen(listen == "start") }
        }
    }
}

@MainActor
private enum Haptics {
    static let light = UIImpactFeedbackGenerator(style: .light)
    static let medium = UIImpactFeedbackGenerator(style: .medium)
    static let note = UINotificationFeedbackGenerator()
    static func play(_ kind: String) {
        switch kind {
        case "medium": medium.impactOccurred()
        case "success": note.notificationOccurred(.success)
        default: light.impactOccurred(intensity: 0.7)
        }
    }
}

struct WebView: UIViewRepresentable {
    let model: WebModel
    func makeUIView(context: Context) -> WKWebView { model.webView }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
