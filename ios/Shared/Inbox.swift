import Foundation

/// Hand-off between the Share extension and the app, through the shared App Group folder.
/// The extension saves one item (a screenshot as JPEG, or text) and opens linger://share?id=…;
/// the app reads it, passes it to the web page, and deletes it.
enum Inbox {
    static let scheme = "linger"
    private static var groupID: String {
        Bundle.main.object(forInfoDictionaryKey: "LingerAppGroup") as? String ?? "group.com.somohanty.linger"
    }
    static var folder: URL? {
        guard let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { return nil }
        let dir = base.appendingPathComponent("Inbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    enum Item {
        case image(Data)  // JPEG
        case text(String)
    }

    /// Saves an item and returns its id.
    @discardableResult
    static func save(_ item: Item) throws -> String {
        guard let dir = folder else { throw CocoaError(.fileNoSuchFile) }
        let id = UUID().uuidString
        switch item {
        case .image(let data): try data.write(to: dir.appendingPathComponent(id + ".jpg"), options: .atomic)
        case .text(let s): try Data(s.utf8).write(to: dir.appendingPathComponent(id + ".txt"), options: .atomic)
        }
        return id
    }

    /// Takes the item with this id, or the newest item from the last 10 minutes when id is nil.
    /// Whatever is taken (and anything older) is deleted.
    static func take(_ id: String? = nil) -> Item? {
        guard let dir = folder,
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey]) else { return nil }
        let dated = files.map { ($0, (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }
            .sorted { $0.1 > $1.1 }
        let pick: URL?
        if let id { pick = dated.first { $0.0.deletingPathExtension().lastPathComponent == id }?.0 }
        else { pick = dated.first { $0.1 > Date().addingTimeInterval(-600) }?.0 }
        defer { dated.forEach { try? FileManager.default.removeItem(at: $0.0) } }
        guard let url = pick, let data = try? Data(contentsOf: url) else { return nil }
        return url.pathExtension == "txt" ? .text(String(decoding: data, as: UTF8.self)) : .image(data)
    }
}
