import UIKit
import UniformTypeIdentifiers

/// Share → Linger: saves the screenshot (or selected text) for the app and opens it.
/// Screenshots are shrunk to at most 2000 px on the long side, which is plenty to read and keeps the hand-off fast.
final class ShareViewController: UIViewController {
    private let label = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0x1F / 255, green: 0x2D / 255, blue: 0xA8 / 255, alpha: 1)
        label.text = "Opening Linger…"
        label.textColor = .white
        label.font = .preferredFont(forTextStyle: .title3)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        Task { await handle() }
    }

    private func handle() async {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        var item: Inbox.Item?
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) {
            if let data = await loadImage(p) { item = .image(data) }
        } else if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            if let s = try? await p.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String { item = .text(s) }
        }
        guard let item, let id = try? Inbox.save(item), let url = URL(string: "\(Inbox.scheme)://share?id=\(id)") else {
            label.text = "Linger couldn’t open this. Try a screenshot or some selected text."
            try? await Task.sleep(for: .seconds(2))
            extensionContext?.cancelRequest(withError: CocoaError(.fileReadUnknown))
            return
        }
        if openApp(url) {
            extensionContext?.completeRequest(returningItems: nil)
        } else {
            // Fallback: the app picks it up from the shared folder the next time it opens.
            label.text = "Saved. Open Linger to see it explained."
            try? await Task.sleep(for: .seconds(2))
            extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func loadImage(_ p: NSItemProvider) async -> Data? {
        let raw = try? await p.loadItem(forTypeIdentifier: UTType.image.identifier)
        var image: UIImage?
        if let url = raw as? URL { image = UIImage(contentsOfFile: url.path) }
        else if let data = raw as? Data { image = UIImage(data: data) }
        else if let img = raw as? UIImage { image = img }
        guard let image else { return nil }
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, 2000 / max(longest, 1))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let small = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return small.jpegData(compressionQuality: 0.85)
    }

    /// Extensions can't call UIApplication.shared, but the app object is in the responder chain.
    private func openApp(_ url: URL) -> Bool {
        var r: UIResponder? = self
        while let x = r {
            if let app = x as? UIApplication { app.open(url, options: [:], completionHandler: nil); return true }
            r = x.next
        }
        return false
    }
}
