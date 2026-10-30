import Foundation
import AppKit

/// Linger's word knowledge, shared with the phone app and the Chrome extension (Resources/words.json):
/// plain-English swaps for formal words, hard-word meanings, local slang, and the ~10,000 most common English words.
final class Words {
    static let shared = Words()

    struct Slang: Decodable { let word, say, meaning, local, city: String }
    private struct File: Decodable {
        let plain: [String: String]
        let phrases: [[String]]
        let hard: [String: String]
        let slang: [String: Slang]
        let common: [String]
    }

    let plain: [String: String]
    let hard: [String: String]
    let slang: [String: Slang]
    private let rank: [String: Int]
    private let phrases: [(NSRegularExpression, String)]

    private init() {
        let url = Bundle.main.url(forResource: "words", withExtension: "json")
        let file = url.flatMap { try? Data(contentsOf: $0) }.flatMap { try? JSONDecoder().decode(File.self, from: $0) }
        plain = file?.plain ?? [:]
        hard = file?.hard ?? [:]
        slang = file?.slang ?? [:]
        var r: [String: Int] = [:]
        for (i, w) in (file?.common ?? []).enumerated() where r[w] == nil { r[w] = i }
        rank = r
        // JS-style replacements ($1) become NSRegularExpression templates.
        phrases = (file?.phrases ?? []).compactMap { p in
            guard p.count == 2, let re = try? NSRegularExpression(pattern: p[0], options: [.caseInsensitive]) else { return nil }
            return (re, p[1].replacingOccurrences(of: "$1", with: "$1"))
        }
    }

    static func key(_ w: String) -> String {
        let s = w.lowercased().replacingOccurrences(of: "’", with: "'").filter { $0.isLetter || $0 == "'" }
        return s.trimmingCharacters(in: CharacterSet(charactersIn: "'"))
    }

    private func isCommon(_ k: String) -> Bool {
        if rank[k] != nil { return true }
        let stems = [k.replacingSuffix("ies", "y"), k.replacingSuffix("es", ""), k.replacingSuffix("s", ""), k.replacingSuffix("ed", ""),
                     k.replacingSuffix("ed", "e"), k.replacingSuffix("d", ""), k.replacingSuffix("ing", ""), k.replacingSuffix("ing", "e"),
                     k.replacingSuffix("ly", ""), k.replacingSuffix("er", ""), k.replacingSuffix("est", "")]
        return stems.contains { $0.count > 2 && $0 != k && rank[$0] != nil }
    }

    enum Kind: String { case hard, slang, word }

    /// hard = not among the most common words, or a formal word Linger knows (unless it's very common).
    func classify(_ raw: String, sentenceStart: Bool = false) -> Kind? {
        let k = Words.key(raw)
        if k.count < 3 || raw.contains(where: { $0.isNumber }) { return nil }
        if slang[k] != nil { return .slang }
        if plain[k] != nil || hard[k] != nil { return (rank[k] ?? 99_999) > 2500 ? .hard : nil }
        if let f = raw.first, f.isUppercase, !sentenceStart { return nil } // names and places
        if raw.count > 1, raw == raw.uppercased() { return nil }           // acronyms
        if k.count < 6 || k.contains("'") { return nil }
        return isCommon(k) ? nil : .hard
    }

    /// macOS's own spell checker knows real English words; brands, names and misread text fail it.
    private var spellCache: [String: Bool] = [:]
    func isRealWord(_ raw: String) -> Bool {
        let w = raw.trimmingCharacters(in: CharacterSet.letters.inverted)
        if let c = spellCache[w.lowercased()] { return c }
        let r = NSSpellChecker.shared.checkSpelling(of: w.lowercased(), startingAt: 0, language: "en", wrap: false, inSpellDocumentWithTag: 0, wordCount: nil)
        let ok = r.location == NSNotFound
        spellCache[w.lowercased()] = ok
        return ok
    }

    /// A meaning we already know (no lookup needed).
    func knownMeaning(_ k: String) -> String? {
        if let s = slang[k] { return s.meaning }
        if let h = hard[k] { return h }
        if let p = plain[k], !p.isEmpty { return p.prefix(1).uppercased() + p.dropFirst() + "." }
        return nil
    }

    /// Swap formal words for plain ones ("Any arrears must be remitted" → "Any late rent must be paid").
    func plainify(_ s: String) -> String {
        var t = s
        for (re, rep) in phrases { t = re.stringByReplacingMatches(in: t, range: NSRange(t.startIndex..., in: t), withTemplate: rep) }
        let wordRe = try! NSRegularExpression(pattern: "[A-Za-z]+")
        var out = ""; var last = t.startIndex
        for m in wordRe.matches(in: t, range: NSRange(t.startIndex..., in: t)) {
            guard let r = Range(m.range, in: t) else { continue }
            out += t[last..<r.lowerBound]
            let w = String(t[r])
            if let p = plain[w.lowercased()] {
                out += p.isEmpty ? "" : (w.first!.isUppercase ? p.prefix(1).uppercased() + p.dropFirst() : p)
            } else { out += w }
            last = r.upperBound
        }
        out += t[last...]
        out = out.replacingOccurrences(of: "\\b([Aa]) ([aeiou])", with: "$1n $2", options: .regularExpression)
            .replacingOccurrences(of: "\\s{2,}", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\s+([.,])", with: "$1", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
        return out.prefix(1).uppercased() + out.dropFirst()
    }

    // MARK: Explain a whole window

    private static let months = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
    private static let dateRe = try! NSRegularExpression(pattern: "\\b(?:(?:\(months))\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|the\\s+\\d{1,2}(?:st|nd|rd|th))\\b", options: [.caseInsensitive])
    private static let moneyRe = try! NSRegularExpression(pattern: "\\$\\s?\\d[\\d,]*(?:\\.\\d{2})?")
    private static let actionRe = try! NSRegularExpression(pattern: "\\b(must|required|due|please|prohibited|not permitted|failure|deadline|pay|payment|no later than|shall|need to|by the|overdue|delinquent|owe)\\b", options: [.caseInsensitive])

    static func sentences(_ text: String) -> [String] {
        text.components(separatedBy: .newlines).flatMap { line -> [String] in
            let l = line.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            return l.replacingOccurrences(of: "([.!?])\\s+", with: "$1\u{1F}", options: .regularExpression).components(separatedBy: "\u{1F}")
        }.map { $0.trimmingCharacters(in: .whitespaces) }.filter { $0.split(separator: " ").count > 2 }
    }

    private static func has(_ re: NSRegularExpression, _ s: String) -> Bool { re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil }
    private static func all(_ re: NSRegularExpression, _ s: String) -> [String] {
        re.matches(in: s, range: NSRange(s.startIndex..., in: s)).compactMap { Range($0.range, in: s).map { String(s[$0]) } }
    }

    struct Summary { var points: [(String, String)]; var dates: [String]; var hardWords: [String] }

    /// "What this wants from you": sentences that ask you to do something or contain a date or an amount, in plain English.
    func summarize(_ text: String) -> Summary {
        let sents = Words.sentences(text).prefix(150).map { $0.replacingOccurrences(of: "^(dear [^,]{1,40}|hi|hello|hey)( [^,]{1,25})?,\\s*", with: "", options: [.regularExpression, .caseInsensitive]) }
        var acts = sents.filter { $0 != $0.uppercased() && $0.count < 320 && (Words.has(Words.actionRe, $0) || Words.has(Words.dateRe, $0) || $0.contains("$")) }
        if acts.isEmpty { acts = Array(sents.prefix(3)) }
        let points = acts.prefix(5).map { s -> (String, String) in
            let icon = s.contains("$") ? "💵" : Words.has(Words.dateRe, s) ? "📅" : s.range(of: "prohibit|not permitted|not allowed", options: [.regularExpression, .caseInsensitive]) != nil ? "🚫" : "📌"
            return (icon, plainify(s))
        }
        var seen = Set<String>(), dates: [String] = []
        for d in Words.all(Words.dateRe, text) + Words.all(Words.moneyRe, text) where !seen.contains(d.lowercased()) { seen.insert(d.lowercased()); dates.append(d) }
        var hardSeen = Set<String>(), hardWords: [String] = []
        let wordRe = try! NSRegularExpression(pattern: "[A-Za-z][A-Za-z'’-]*[A-Za-z]")
        for w in Words.all(wordRe, text) {
            let k = Words.key(w)
            if !hardSeen.contains(k), classify(w, sentenceStart: true) != nil, plain[k] != nil || hard[k] != nil || slang[k] != nil || isRealWord(w) { hardSeen.insert(k); hardWords.append(w) }
            if hardWords.count >= 12 { break }
        }
        return Summary(points: points, dates: Array(dates.prefix(6)), hardWords: hardWords)
    }
}

extension String {
    func replacingSuffix(_ suffix: String, _ with: String) -> String { hasSuffix(suffix) ? String(dropLast(suffix.count)) + with : self }
}
