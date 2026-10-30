import Foundation

/// Saving words: kept on this Mac, and sent to the phone app through the same Firestore document the phone
/// listens to (pairs/{code}), using the REST API. Meanings for unknown words come from Wiktionary.
enum Sync {
    static let projectId = "linger-f41a7"
    static let apiKey = "AIzaSyDxWUp1eTp8bXZV-GV13XQAHI_Q4fL0GCU"
    private static func doc(_ code: String) -> String { "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/pairs/\(code)" }

    static var pairCode: String {
        get { UserDefaults.standard.string(forKey: "pairCode") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "pairCode") }
    }
    static func tidy(_ c: String) -> String { c.lowercased().filter { $0.isLetter || $0.isNumber } }
    static func pretty(_ c: String) -> String {
        var out = ""; for (i, ch) in tidy(c).enumerated() { if i > 0 && i % 4 == 0 { out += "-" }; out.append(ch) }; return out
    }

    struct Saved: Codable { let key, w, m, s, p, place, date: String }
    static var saved: [Saved] {
        get { (UserDefaults.standard.data(forKey: "saved")).flatMap { try? JSONDecoder().decode([Saved].self, from: $0) } ?? [] }
        set { UserDefaults.standard.set(try? JSONEncoder().encode(Array(newValue.prefix(200))), forKey: "saved") }
    }

    enum SaveResult { case synced, notPaired, failed }

    static func save(_ word: Saved) async -> SaveResult {
        saved = [word] + saved.filter { $0.key != word.key }
        guard !pairCode.isEmpty else { return .notPaired }
        let str = { (v: String) in ["stringValue": v] }
        let fields: [String: Any] = ["w": str(word.w), "m": str(word.m), "s": str(word.s), "p": str(word.p), "place": str(word.place), "date": str(word.date)]
        let body: [String: Any] = ["fields": ["words": ["mapValue": ["fields": [word.key: ["mapValue": ["fields": fields]]]]]]]
        let path = "words.`\(word.key.replacingOccurrences(of: "`", with: ""))`"
        var comps = URLComponents(string: doc(pairCode))!
        comps.queryItems = [URLQueryItem(name: "key", value: apiKey), URLQueryItem(name: "updateMask.fieldPaths", value: path)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        guard let (_, resp) = try? await URLSession.shared.data(for: req), (resp as? HTTPURLResponse)?.statusCode == 200 else { return .failed }
        return .synced
    }

    /// true if the code can be reached (the document may not exist yet if the phone hasn't saved anything).
    static func check(_ code: String) async -> Bool {
        guard let url = URL(string: doc(code) + "?key=\(apiKey)"), let (_, resp) = try? await URLSession.shared.data(from: url),
              let status = (resp as? HTTPURLResponse)?.statusCode else { return false }
        return status == 200 || status == 404
    }

    /// A short definition from Wiktionary (HTML stripped).
    static func lookup(_ word: String) async -> String? {
        guard let enc = word.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "https://en.wiktionary.org/api/rest_v1/page/definition/\(enc)"),
              let (data, resp) = try? await URLSession.shared.data(from: url), (resp as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let en = json["en"] as? [[String: Any]] else { return nil }
        let defs = en.flatMap { ($0["definitions"] as? [[String: Any]]) ?? [] }.compactMap { $0["definition"] as? String }.map { html -> String in
            html.replacingOccurrences(of: "<style[\\s\\S]*?</style>", with: "", options: .regularExpression)
                .replacingOccurrences(of: "<sup[\\s\\S]*?</sup>", with: "", options: .regularExpression)
                .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
                .replacingOccurrences(of: "&nbsp;", with: " ").replacingOccurrences(of: "&amp;", with: "&").replacingOccurrences(of: "&quot;", with: "\"").replacingOccurrences(of: "&#39;", with: "'")
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        }.filter { !$0.isEmpty && $0.range(of: "^(obsolete|archaic|plural of|alternative)", options: [.regularExpression, .caseInsensitive]) == nil }
        guard let d = defs.first(where: { $0.count <= 140 }) ?? defs.first else { return nil }
        return d.prefix(1).uppercased() + d.dropFirst()
    }
}
