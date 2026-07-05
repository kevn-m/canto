import Foundation
import GRDB

/// Result of a lookup. `isWordFallback` is true when the full phrase had no
/// match and results came from merging per-word matches instead.
struct LookupResult {
    let senses: [Sense]
    let isWordFallback: Bool
}

/// Reads the bundled read-only dict.sqlite. Ranking here must match
/// `senses_for` in scripts/build_dict.py exactly — that Python function is
/// the behavioural oracle, not an approximation to riff on.
final class DictionaryStore {
    static let shared = DictionaryStore()

    private let dbQueue: DatabaseQueue

    // Ported verbatim from scripts/build_dict.py STOPWORDS.
    private static let stopwords: Set<String> = [
        "the", "a", "an", "to", "of", "in", "on", "for", "with", "and", "or",
        "at", "by", "be", "is", "are", "one's", "sth", "sb", "something",
        "somebody", "someone", "etc", "as", "up", "out", "off",
    ]

    private static let rankSQL = """
        SELECT s.*, MIN(e.weight) AS w
        FROM english_index e JOIN senses s ON s.id = e.sense_id
        WHERE e.token = ?
        GROUP BY s.id
        ORDER BY w ASC, s.source ASC, s.popularity DESC, LENGTH(s.gloss) ASC
        LIMIT 40
        """

    // Same ordering as rankSQL, no 5-cut - powers the browse-further UI.
    private static let browseSQL = """
        SELECT s.*, MIN(e.weight) AS w
        FROM english_index e JOIN senses s ON s.id = e.sense_id
        WHERE e.token = ?
        GROUP BY s.id
        ORDER BY w ASC, s.source ASC, s.popularity DESC, LENGTH(s.gloss) ASC
        LIMIT 200
        """

    // Sibling of rankSQL for the Pick: readings for fixed characters, with a
    // gloss that matches the query token winning the tie-break. See pickSenses.
    private static let pickSQL = """
        SELECT s.*, EXISTS(
            SELECT 1 FROM english_index e
            WHERE e.sense_id = s.id AND e.token = ?
        ) AS matches_query
        FROM senses s
        WHERE s.traditional = ?
        ORDER BY matches_query DESC, s.source ASC,
                 s.popularity DESC, LENGTH(s.gloss) ASC
        """

    // Crash-on-launch is deliberate for a missing/corrupt bundled dictionary:
    // the app is useless without it and a broken bundle should fail loud.
    init(bundle: Bundle = .main) {
        guard let path = bundle.path(forResource: "dict", ofType: "sqlite") else {
            fatalError("dict.sqlite not found in bundle")
        }
        var config = Configuration()
        config.readonly = true
        do {
            dbQueue = try DatabaseQueue(path: path, configuration: config)
        } catch {
            fatalError("failed to open dict.sqlite: \(error)")
        }
    }

    /// Mirrors build_dict.py's senses_for: try the whole phrase as one
    /// token first, and only fall back to per-word lookup if that misses.
    func lookup(_ query: String) -> LookupResult {
        let q = Self.clean(query)
        let rows = top5(q)
        if rows.isEmpty, q.contains(" ") {
            var seen: [String: Sense] = [:]
            var order: [String] = []
            for word in q.split(separator: " ").map(String.init) {
                if Self.stopwords.contains(word) { continue }
                for sense in top5(word).prefix(2) {
                    let key = Self.dedupKey(sense)
                    if seen[key] == nil {
                        seen[key] = sense
                        order.append(key)
                    }
                }
            }
            let merged = order.prefix(5).compactMap { seen[$0] }
            return LookupResult(senses: Array(merged), isWordFallback: true)
        }
        return LookupResult(senses: rows, isWordFallback: false)
    }

    func senses(for query: String) -> [Sense] {
        lookup(query).senses
    }

    /// Runs the ranking SQL for one token, dedupes on (traditional, jyutping)
    /// preserving order, and returns the top 5 — matches senses_for's top5().
    private func top5(_ token: String) -> [Sense] {
        var seen = Set<String>()
        var out: [Sense] = []
        do {
            try dbQueue.read { db in
                let cursor = try Row.fetchCursor(db, sql: Self.rankSQL, arguments: [token])
                while let row = try cursor.next() {
                    let sense = Sense(row: row)
                    let key = Self.dedupKey(sense)
                    if seen.contains(key) { continue }
                    seen.insert(key)
                    out.append(sense)
                    if out.count == 5 { break }
                }
            }
        } catch {
            // A read failure must not look like an ordinary Miss in the console.
            NSLog("DictionaryStore read failed for token '%@': %@", token, String(describing: error))
            return []
        }
        return out
    }

    /// Readings for the Pick's characters. Rows whose gloss matches the query
    /// win, then the usual source order. Verified: 驚 + "scared" -> geng1 first.
    /// Dedup key is jyutping ALONE (all rows share one traditional), unlike
    /// top5's (traditional, jyutping).
    func pickSenses(forCharacters characters: String, query: String) -> [Sense] {
        let token = Self.clean(query)
        var seen = Set<String>()
        var out: [Sense] = []
        do {
            try dbQueue.read { db in
                let cursor = try Row.fetchCursor(db, sql: Self.pickSQL, arguments: [token, characters])
                while let row = try cursor.next() {
                    let sense = Sense(row: row)
                    if seen.contains(sense.jyutping) { continue }
                    seen.insert(sense.jyutping)
                    out.append(sense)
                    if out.count == 2 { break }
                }
            }
        } catch {
            NSLog("DictionaryStore pickSenses failed for '%@': %@", characters, String(describing: error))
            return []
        }
        return out
    }

    /// The full ranked list for one query token - same ordering as top5,
    /// same dedup, no 5-cut. For the browse-further UI; never feeds
    /// LookupResult, so the Python/Swift oracle stays untouched.
    func browseSenses(_ query: String) -> [Sense] {
        let token = Self.clean(query)
        var seen = Set<String>()
        var out: [Sense] = []
        do {
            try dbQueue.read { db in
                let cursor = try Row.fetchCursor(db, sql: Self.browseSQL, arguments: [token])
                while let row = try cursor.next() {
                    let sense = Sense(row: row)
                    let key = Self.dedupKey(sense)
                    if seen.contains(key) { continue }
                    seen.insert(key)
                    out.append(sense)
                }
            }
        } catch {
            NSLog("DictionaryStore browse failed for '%@': %@", token, String(describing: error))
            return []
        }
        return out
    }

    private static func dedupKey(_ sense: Sense) -> String {
        "\(sense.traditional)\u{0}\(sense.jyutping)"
    }

    // Ports clean() from scripts/build_dict.py: strip the CEDICT measure-word
    // suffix, lowercase, strip bracketed qualifiers, collapse whitespace,
    // trim punctuation. Order matters and matches the Python exactly.
    private static func clean(_ text: String) -> String {
        var t = text
        t = t.replacingOccurrences(of: "\\bM:.*$", with: " ", options: .regularExpression)
        t = t.lowercased()
        t = t.replacingOccurrences(of: "\\([^)]*\\)", with: " ", options: .regularExpression)
        t = t.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        t = t.trimmingCharacters(in: CharacterSet(charactersIn: " .,;:!?"))
        return t
    }
}
