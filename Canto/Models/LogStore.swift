import Foundation
import GRDB

struct LookupRecord: Identifiable, Hashable, FetchableRecord {
    let id: Int64
    let heardText: String
    let matched: Bool
    let chosenSenseId: Int64?
    let chosenTraditional: String?
    let chosenJyutping: String?
    let viaVoice: Bool
    let createdAt: String

    init(row: Row) {
        id = row["id"]
        heardText = row["heard_text"]
        matched = row["matched"]
        chosenSenseId = row["chosen_sense_id"]
        chosenTraditional = row["chosen_traditional"]
        chosenJyutping = row["chosen_jyutping"]
        viaVoice = row["via_voice"]
        createdAt = row["created_at"]
    }
}

/// Writes log.sqlite in Application Support. Unlike DictionaryStore's
/// fatalError, a broken log must never crash the app: the app is useful
/// without the log but useless without the dictionary, so failures here
/// are NSLog'd and swallowed.
final class LogStore {
    static let shared = LogStore()

    private let dbQueue: DatabaseQueue?

    init(directory: URL = LogStore.defaultDirectory) {
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let path = directory.appendingPathComponent("log.sqlite").path
            let queue = try DatabaseQueue(path: path)
            try queue.write { db in
                try db.execute(sql: """
                    CREATE TABLE IF NOT EXISTS lookups (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      heard_text TEXT NOT NULL,
                      matched INTEGER NOT NULL,
                      chosen_sense_id INTEGER,
                      chosen_traditional TEXT,
                      chosen_jyutping TEXT,
                      via_voice INTEGER NOT NULL,
                      created_at TEXT NOT NULL
                    )
                    """)
            }
            dbQueue = queue
        } catch {
            NSLog("LogStore failed to open log.sqlite: %@", String(describing: error))
            dbQueue = nil
        }
    }

    private static var defaultDirectory: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    @discardableResult
    func record(heard: String, matched: Bool, viaVoice: Bool) -> Int64? {
        guard let dbQueue else { return nil }
        let createdAt = ISO8601DateFormatter().string(from: Date())
        do {
            return try dbQueue.write { db in
                try db.execute(
                    sql: "INSERT INTO lookups (heard_text, matched, via_voice, created_at) VALUES (?, ?, ?, ?)",
                    arguments: [heard, matched, viaVoice, createdAt]
                )
                return db.lastInsertedRowID
            }
        } catch {
            NSLog("LogStore record failed: %@", String(describing: error))
            return nil
        }
    }

    // Stores the sense's text alongside its id: senses.id is just insertion
    // order in build_dict.py, so a dictionary rebuild remaps every historical
    // id. The characters and jyutping are what the flashcard seed needs.
    // Returns false when the write didn't persist so the caller doesn't show
    // an "Added" tick over a Keep that never reached the deck.
    @discardableResult
    func setChosenSense(lookupId: Int64, sense: Sense) -> Bool {
        guard let dbQueue else { return false }
        do {
            try dbQueue.write { db in
                try db.execute(
                    sql: """
                        UPDATE lookups
                        SET chosen_sense_id = ?, chosen_traditional = ?, chosen_jyutping = ?
                        WHERE id = ?
                        """,
                    arguments: [sense.id, sense.traditional, sense.jyutping, lookupId]
                )
            }
            return true
        } catch {
            NSLog("LogStore setChosenSense failed: %@", String(describing: error))
            return false
        }
    }

    /// Records a Keep for a word the dictionary doesn't know. NULL sense id is
    /// safe: GameStore.syncDeck reads only the denormalised pair
    /// (chosen_traditional/chosen_jyutping), never chosen_sense_id.
    @discardableResult
    func setChosenCustom(lookupId: Int64, traditional: String, jyutping: String) -> Bool {
        guard !jyutping.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            NSLog("LogStore setChosenCustom rejected an empty jyutping")
            return false
        }
        guard let dbQueue else { return false }
        do {
            try dbQueue.write { db in
                try db.execute(
                    sql: """
                        UPDATE lookups
                        SET chosen_sense_id = NULL, chosen_traditional = ?, chosen_jyutping = ?
                        WHERE id = ?
                        """,
                    arguments: [traditional, jyutping, lookupId]
                )
            }
            return true
        } catch {
            NSLog("LogStore setChosenCustom failed: %@", String(describing: error))
            return false
        }
    }

    func recentLookups(limit: Int = 200) -> [LookupRecord] {
        guard let dbQueue else { return [] }
        do {
            return try dbQueue.read { db in
                try LookupRecord.fetchAll(
                    db,
                    sql: "SELECT * FROM lookups ORDER BY id DESC LIMIT ?",
                    arguments: [limit]
                )
            }
        } catch {
            NSLog("LogStore recentLookups failed: %@", String(describing: error))
            return []
        }
    }

    @discardableResult
    func clearHistory() -> Bool {
        guard let dbQueue else { return false }
        do {
            try dbQueue.write { db in try db.execute(sql: "DELETE FROM lookups") }
            return true
        } catch {
            NSLog("LogStore.clearHistory failed: %@", String(describing: error))
            return false
        }
    }

    enum LogStoreError: Error, LocalizedError {
        case notOpen

        var errorDescription: String? { "The history database isn't open." }
    }

    // Everything, for the game snapshot — History is part of the state.
    func allLookups() -> [LookupRecord] {
        guard let dbQueue else { return [] }
        do {
            return try dbQueue.read { db in
                try LookupRecord.fetchAll(db, sql: "SELECT * FROM lookups ORDER BY id ASC")
            }
        } catch {
            NSLog("LogStore allLookups failed: %@", String(describing: error))
            return []
        }
    }

    // Snapshot import. Throws, unlike the rest of LogStore: restored data is
    // hand-carried and a swallowed failure would silently drop History.
    // One transaction; inserts in createdAt order so fresh AUTOINCREMENT ids
    // stay chronological. Returns the highest new id, for the syncDeck
    // checkpoint.
    func replaceAllLookups(_ lookups: [GameSnapshot.Lookup]) throws -> Int64 {
        guard let dbQueue else { throw LogStoreError.notOpen }
        return try dbQueue.write { db in
            try db.execute(sql: "DELETE FROM lookups")
            // Tracked per insert: after an empty import lastInsertedRowID
            // would report a stale id from an earlier write, not 0.
            var maxId: Int64 = 0
            for lookup in lookups.sorted(by: { $0.createdAt < $1.createdAt }) {
                try db.execute(
                    sql: """
                        INSERT INTO lookups
                          (heard_text, matched, chosen_sense_id, chosen_traditional, chosen_jyutping, via_voice, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                    arguments: [
                        lookup.heardText, lookup.matched, lookup.chosenSenseId,
                        lookup.chosenTraditional, lookup.chosenJyutping,
                        lookup.viaVoice, lookup.createdAt,
                    ]
                )
                maxId = db.lastInsertedRowID
            }
            return maxId
        }
    }

    // Feeds GameStore.syncDeck: lookups the player actually chose a sense
    // for, ascending so the checkpoint in game.sqlite's meta table can walk
    // forward from the last imported id.
    func lookupsWithChosenSense(afterId id: Int64) -> [LookupRecord] {
        guard let dbQueue else { return [] }
        do {
            return try dbQueue.read { db in
                try LookupRecord.fetchAll(
                    db,
                    sql: "SELECT * FROM lookups WHERE id > ? AND chosen_traditional IS NOT NULL ORDER BY id ASC",
                    arguments: [id]
                )
            }
        } catch {
            NSLog("LogStore lookupsWithChosenSense failed: %@", String(describing: error))
            return []
        }
    }
}
