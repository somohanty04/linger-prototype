import SwiftUI
import WebKit
import Network

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

    /// A page that hasn't said ready by now counts as failed (e.g. a captive Wi-Fi portal, or a half-loaded page).
    static let readyTimeout: Duration = .seconds(15)

    @Published var failed = false
    @Published var retrying = false      // a retry is loading behind the offline screen
    let webView: WKWebView
    private var pageReady = false
    private var triedCache = false        // offline: the saved copy of the page was already tried
    private var lastDelivery = Date.distantPast // when a Share item last went to the page
    private var waiting: Inbox.Item?
    private var watchdog: Task<Void, Never>?
    private let network = NWPathMonitor()

    override init() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true            // camera preview plays inside the page
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "Mobile/15E148 Safari/604.1 LingerApp/" + (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
        let controller = WKUserContentController()
        controller.addUserScript(Self.shellScript)
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
        // No pinch or double-tap zoom: the app has its own Text size and Display zoom settings, and a stray zoom
        // used to leave the whole page magnified.
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.scrollView.bouncesZoom = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.allowsBackForwardNavigationGestures = false
        #if DEBUG
        webView.isInspectable = true // Safari → Develop menu, for debugging
        #endif
        // Retry by itself when the connection comes back while the offline screen is up.
        network.pathUpdateHandler = { [weak self] path in
            guard path.status == .satisfied else { return }
            Task { @MainActor in self?.networkIsBack() }
        }
        network.start(queue: .main)
        loadHome()
    }

    /// window.LINGER_SHELL = { build, version } before the page's own scripts run,
    /// so the page can tell testers on an older shell to update in TestFlight. A missing value means build 1.
    private static var shellScript: WKUserScript {
        let info = Bundle.main.infoDictionary ?? [:]
        let shell: [String: Any] = [
            "build": Int(info["CFBundleVersion"] as? String ?? "") ?? 1,
            "version": info["CFBundleShortVersionString"] as? String ?? "",
        ]
        // JSON keeps the version string safely quoted.
        let json = (try? JSONSerialization.data(withJSONObject: shell)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return WKUserScript(source: "window.LINGER_SHELL = \(json);", injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    /// Try again. The offline screen stays up (showing progress) until the page says ready, so it doesn't flash blank.
    func reload() {
        retrying = failed
        triedCache = false
        loadHome()
    }

    /// Asks the server each time whether the page changed (a quick check; an unchanged page still comes from the
    /// cache), so a new version shows up on the next open instead of after the server's 10-minute cache time.
    /// Offline, the saved copy is tried before the offline screen.
    private func loadHome(fromCache: Bool = false) {
        pageReady = false
        webView.load(URLRequest(url: Self.home, cachePolicy: fromCache ? .returnCacheDataDontLoad : .reloadRevalidatingCacheData))
        watchdog?.cancel()
        watchdog = Task { [weak self] in
            try? await Task.sleep(for: Self.readyTimeout)
            guard !Task.isCancelled, let self, !self.pageReady else { return }
            self.loadFailed()
        }
    }

    fileprivate func loadFailed() {
        watchdog?.cancel()
        retrying = false
        failed = true
    }

    private func networkIsBack() {
        if failed && !retrying { reload() }
    }

    fileprivate func loadFailedOrTryCache() {
        if !triedCache { triedCache = true; loadHome(fromCache: true); return }
        loadFailed()
    }

    /// Coming back to the app: the page doesn't reload by itself, so if the server has a newer version (a different
    /// app.js?v= number), load it. If nothing changed, nothing happens and you stay where you were. Skipped right after
    /// a Share item was handed over, so it isn't lost; the update then loads the next time.
    func refreshIfOutdated() async {
        guard pageReady, !failed, Date().timeIntervalSince(lastDelivery) > 10 else { return }
        let request = URLRequest(url: Self.home, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 4)
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let server = Self.pageVersion(String(decoding: data, as: UTF8.self)) else { return }
        let js = "(document.querySelector('script[src*=\"app.js?v=\"]') || {}).src || ''"
        guard let src = (try? await webView.evaluateJavaScript(js)) as? String, let loaded = Self.pageVersion(src) else { return }
        if server != loaded, pageReady, !failed, Date().timeIntervalSince(lastDelivery) > 10 {
            triedCache = false
            loadHome()
        }
    }

    /// "app.js?v=57" in the page's HTML or a script's address: the page's version.
    private static func pageVersion(_ text: String) -> String? {
        text.range(of: #"app\.js\?v=\d+"#, options: .regularExpression).map { String(text[$0]) }
    }

    /// The app's own page in Settings, where camera (and microphone) access can be turned back on.
    fileprivate func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
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
        lastDelivery = Date()
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
        triedCache = false
        watchdog?.cancel()
        // A load that worked (after a retry, or a slow one that beat the timeout late) hides the offline screen.
        failed = false
        retrying = false
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
    // These two only fire for main-frame navigations; a failing iframe or image doesn't reach here.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { navigationFailed(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { reload() }

    private func navigationFailed(_ error: Error) {
        let e = error as NSError
        // A load replaced by another (a link tap, or Try again during a slow load) reports "cancelled": not a failure.
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
        // WebKit's "frame load interrupted" (102): the load was handed elsewhere by a policy decision, also not a failure.
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return }
        loadFailedOrTryCache()
    }

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

/// Messages from the page: { ready: true } once the app has started; { haptic: "light" | "medium" | "success" } for a tap you can feel;
/// { listen: "start" | "stop" } for Say it; { open: "settings" } to open the app's page in Settings (e.g. to turn the camera back on).
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var model: WebModel?
    init(_ model: WebModel) { self.model = model }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.request.url?.host == WebModel.host, let body = message.body as? [String: Any] else { return }
        MainActor.assumeIsolated {
            if body["ready"] as? Bool == true { model?.pageSaidReady() }
            if let kind = body["haptic"] as? String { Haptics.play(kind) }
            if let listen = body["listen"] as? String { model?.listen(listen == "start") }
            if body["open"] as? String == "settings" { model?.openSettings() } // only Settings: the page can't open arbitrary URLs
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
