import Foundation
import GRDB

enum Player: String, Codable, CaseIterable { case dad, kid }

// A card plus both players' box/due state, for DeckView. CardRecord stays
// the single-player shape ReviewEngine consumes; this is GameStore's own
// read model, not a bent version of it.
struct DeckEntry: Identifiable, Hashable {
    let id: Int64
    let traditional: String
    let jyutping: String
    let english: String
    let photoFilename: String?
    let benched: Bool
    let dadBox: Int
    let dadDueOn: String
    let kidBox: Int
    let kidDueOn: String
}

struct ShopItem: Identifiable, Hashable {
    let id: Int64
    let name: String
    let price: Int
    let archived: Bool
}

private enum GameStoreError: Error, LocalizedError {
    case stateEncodingFailed
    case unknownCard(Int64)
    case itemUnavailable(String)
    case invalidPrice(Int)

    var errorDescription: String? {
        switch self {
        case .stateEncodingFailed: return "Couldn't encode the run state."
        case .unknownCard(let id): return "No card state found for card \(id)."
        case .itemUnavailable(let name): return "\(name) is no longer in the shop."
        case .invalidPrice(let price): return "A shop price must be positive, not \(price)."
        }
    }
}

/// Writes game.sqlite in Application Support: the deck, box state, reviews,
/// bux ledger, shop, and Run snapshots. Third database, third failure
/// contract: unlike LogStore (swallows) and DictionaryStore (fatalErrors),
/// a broken wallet must be visible, not silent - open and write failures
/// set `lastError` and nothing ever crashes. `lastError` is sticky until
/// `clearError()` - the UI dismisses it, success doesn't.
final class GameStore: ObservableObject {
    static let shared = GameStore()

    @Published private(set) var lastError: String?

    private let dbQueue: DatabaseQueue?

    init(directory: URL = GameStore.defaultDirectory) {
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let path = directory.appendingPathComponent("game.sqlite").path
            let queue = try DatabaseQueue(path: path)
            try queue.write { db in try Self.createSchema(db) }
            dbQueue = queue
        } catch {
            dbQueue = nil
            reportError("Couldn't open the game database: \(error.localizedDescription)")
        }
    }

    private static func createSchema(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS cards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              traditional TEXT NOT NULL,
              jyutping TEXT NOT NULL,
              english TEXT NOT NULL,
              photo_filename TEXT,
              benched INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              UNIQUE(traditional, jyutping)
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS card_states (
              card_id INTEGER NOT NULL REFERENCES cards(id),
              player TEXT NOT NULL CHECK (player IN ('dad','kid')),
              box INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 3),
              due_on TEXT NOT NULL DEFAULT '1970-01-01',
              PRIMARY KEY (card_id, player)
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              card_id INTEGER NOT NULL,
              player TEXT NOT NULL,
              result TEXT NOT NULL CHECK (result IN ('hit','whiff')),
              reviewed_at TEXT NOT NULL
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS bux_ledger (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              amount INTEGER NOT NULL,
              reason TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS shop_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              price INTEGER NOT NULL,
              archived INTEGER NOT NULL DEFAULT 0
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              run_date TEXT NOT NULL UNIQUE,
              state_json TEXT NOT NULL,
              finished INTEGER NOT NULL DEFAULT 0
            )
            """)
        try db.execute(sql: """
            CREATE TABLE IF NOT EXISTS meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )
            """)
        // Schema version stamp so a future release can migrate a
        // populated device db instead of no-op'ing on IF NOT EXISTS.
        try db.execute(sql: "PRAGMA user_version = 1")
    }

    func clearError() {
        reportError(nil)
    }

    // GRDB runs read/write closures on its own serial queue, so any error
    // found mid-query must hop to main before touching the @Published var.
    private func reportError(_ message: String?) {
        if Thread.isMainThread {
            lastError = message
        } else {
            DispatchQueue.main.async { self.lastError = message }
        }
    }

    private static var defaultDirectory: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    // MARK: - Read/write helpers
    //
    // GameStore's failure contract (never crash, never swallow) applies to
    // every method below, so these three collapse the guard-dbQueue/do/catch
    // boilerplate LogStore repeats per method into one place.

    private func readValue<T>(default defaultValue: T, _ block: (Database) throws -> T) -> T {
        guard let dbQueue else {
            reportError("Couldn't read the game database: it isn't open.")
            return defaultValue
        }
        do {
            return try dbQueue.read(block)
        } catch {
            reportError("Couldn't read the game database: \(error.localizedDescription)")
            return defaultValue
        }
    }

    private func writeValue<T>(default defaultValue: T, _ block: (Database) throws -> T) -> T {
        guard let dbQueue else {
            reportError("Couldn't save to the game database: it isn't open.")
            return defaultValue
        }
        do {
            return try dbQueue.write(block)
        } catch {
            reportError("Couldn't save to the game database: \(error.localizedDescription)")
            return defaultValue
        }
    }

    private func write(_ block: (Database) throws -> Void) {
        writeValue(default: ()) { db in try block(db) }
    }

    private func encodeStateJSON(_ state: RunState) throws -> String {
        let data = try JSONEncoder().encode(state)
        guard let json = String(data: data, encoding: .utf8) else {
            throw GameStoreError.stateEncodingFailed
        }
        return json
    }

    // A box outside 0...3 means corrupt data slipped past the CHECK
    // constraint (or predates it); the row is skipped and surfaced rather
    // than handed to ReviewEngine, which doesn't expect it.
    private func validBox(_ box: Int, cardId: Int64) -> Bool {
        guard (0...3).contains(box) else {
            reportError("Corrupt card state: box \(box) out of range for card \(cardId).")
            return false
        }
        return true
    }

    // Shared row -> CardRecord hydration for dueCards/nextCards.
    private func hydrateCardRecords(_ rows: [Row], excluding: Set<Int64>) -> [CardRecord] {
        rows.compactMap { row in
            let id: Int64 = row["id"]
            guard !excluding.contains(id) else { return nil }
            let box: Int = row["box"]
            guard validBox(box, cardId: id) else { return nil }
            return CardRecord(
                id: id, traditional: row["traditional"], jyutping: row["jyutping"],
                english: row["english"], box: box, dueOn: row["due_on"]
            )
        }
    }

    // MARK: - Deck

    // Checkpoint read and import are separate transactions; two overlapping
    // calls stay harmless only because INSERT OR IGNORE and the forward-only
    // checkpoint are idempotent. Keep them that way.
    func syncDeck(from log: LogStore) {
        let lastId = readValue(default: Int64(0)) { db in
            try String.fetchOne(db, sql: "SELECT value FROM meta WHERE key = ?", arguments: ["last_imported_lookup_id"])
                .flatMap { Int64($0) } ?? 0
        }

        let lookups = log.lookupsWithChosenSense(afterId: lastId)
        guard !lookups.isEmpty else { return }

        let createdAt = ISO8601DateFormatter().string(from: Date())
        write { db in
            for lookup in lookups {
                guard let traditional = lookup.chosenTraditional, let jyutping = lookup.chosenJyutping else { continue }
                try db.execute(
                    sql: "INSERT OR IGNORE INTO cards (traditional, jyutping, english, created_at) VALUES (?, ?, ?, ?)",
                    arguments: [
                        traditional, jyutping,
                        lookup.heardText.lowercased().trimmingCharacters(in: .whitespacesAndNewlines),
                        createdAt,
                    ]
                )
                guard db.changesCount > 0 else { continue }
                let cardId = db.lastInsertedRowID
                for player in Player.allCases {
                    try db.execute(
                        sql: "INSERT INTO card_states (card_id, player) VALUES (?, ?)",
                        arguments: [cardId, player.rawValue]
                    )
                }
            }
            let maxId = lookups.map(\.id).max() ?? lastId
            try db.execute(
                sql: "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
                arguments: ["last_imported_lookup_id", String(maxId)]
            )
        }
    }

    func deck() -> [DeckEntry] {
        readValue(default: []) { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT c.id, c.traditional, c.jyutping, c.english, c.photo_filename, c.benched,
                       dad.box AS dad_box, dad.due_on AS dad_due_on,
                       kid.box AS kid_box, kid.due_on AS kid_due_on
                FROM cards c
                JOIN card_states dad ON dad.card_id = c.id AND dad.player = 'dad'
                JOIN card_states kid ON kid.card_id = c.id AND kid.player = 'kid'
                ORDER BY c.id
                """)
            return rows.compactMap { row -> DeckEntry? in
                let id: Int64 = row["id"]
                let dadBox: Int = row["dad_box"]
                let kidBox: Int = row["kid_box"]
                guard self.validBox(dadBox, cardId: id), self.validBox(kidBox, cardId: id) else {
                    return nil
                }
                return DeckEntry(
                    id: id, traditional: row["traditional"], jyutping: row["jyutping"],
                    english: row["english"], photoFilename: row["photo_filename"], benched: row["benched"],
                    dadBox: dadBox, dadDueOn: row["dad_due_on"], kidBox: kidBox, kidDueOn: row["kid_due_on"]
                )
            }
        }
    }

    func setBenched(cardId: Int64, _ benched: Bool) {
        write { db in
            try db.execute(sql: "UPDATE cards SET benched = ? WHERE id = ?", arguments: [benched, cardId])
        }
    }

    func setPhoto(cardId: Int64, filename: String?) {
        write { db in
            try db.execute(sql: "UPDATE cards SET photo_filename = ? WHERE id = ?", arguments: [filename, cardId])
        }
    }

    func deckSize() -> Int {
        readValue(default: 0) { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM cards WHERE benched = 0") ?? 0
        }
    }

    // MARK: - Review

    func dueCards(for player: Player, on date: String, excluding: Set<Int64>) -> [CardRecord] {
        readValue(default: []) { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT c.id, c.traditional, c.jyutping, c.english, cs.box, cs.due_on
                FROM cards c
                JOIN card_states cs ON cs.card_id = c.id AND cs.player = ?
                WHERE c.benched = 0 AND cs.due_on <= ?
                ORDER BY cs.due_on ASC
                """, arguments: [player.rawValue, date])
            return self.hydrateCardRecords(rows, excluding: excluding)
        }
    }

    func nextCards(for player: Player, excluding: Set<Int64>, limit: Int) -> [CardRecord] {
        readValue(default: []) { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT c.id, c.traditional, c.jyutping, c.english, cs.box, cs.due_on
                FROM cards c
                JOIN card_states cs ON cs.card_id = c.id AND cs.player = ?
                WHERE c.benched = 0
                ORDER BY cs.due_on ASC
                """, arguments: [player.rawValue])
            return Array(self.hydrateCardRecords(rows, excluding: excluding).prefix(limit))
        }
    }

    // Returns false (and sets lastError) when the write failed - the battle
    // must not advance HP or turns on a review that never persisted.
    @discardableResult
    func recordReview(cardId: Int64, player: Player, result: ReviewResult, on date: String) -> Bool {
        writeValue(default: false) { db in
            guard let currentBox = try Int.fetchOne(
                db, sql: "SELECT box FROM card_states WHERE card_id = ? AND player = ?",
                arguments: [cardId, player.rawValue]
            ) else { throw GameStoreError.unknownCard(cardId) }

            let newBox = ReviewEngine.nextBox(from: currentBox, result: result)
            let newDueOn = ReviewEngine.nextDueDate(box: currentBox, result: result, today: date)
            let reviewedAt = ISO8601DateFormatter().string(from: Date())

            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [cardId, player.rawValue, result.rawValue, reviewedAt]
            )
            try db.execute(
                sql: "UPDATE card_states SET box = ?, due_on = ? WHERE card_id = ? AND player = ?",
                arguments: [newBox, newDueOn, cardId, player.rawValue]
            )
            return true
        }
    }

    // MARK: - Runs

    func todaysRun(on date: String) -> (id: Int64, state: RunState, finished: Bool)? {
        writeValue(default: nil) { db in
            guard let row = try Row.fetchOne(
                db, sql: "SELECT id, state_json, finished FROM runs WHERE run_date = ?", arguments: [date]
            ) else { return nil }

            let stateJSON: String = row["state_json"]
            guard let data = stateJSON.data(using: .utf8),
                  let state = try? JSONDecoder().decode(RunState.self, from: data) else {
                // An undecodable snapshot would otherwise dead-end the tower
                // for the whole day (run_date is UNIQUE and startRun sees the
                // row). Losing one run's progress beats that, so clear it.
                try db.execute(sql: "DELETE FROM runs WHERE run_date = ?", arguments: [date])
                self.reportError("Corrupt run state for \(date) - cleared it so a fresh Run can start.")
                return nil
            }
            return (id: row["id"], state: state, finished: row["finished"])
        }
    }

    func startRun(on date: String, state: RunState) -> Int64? {
        writeValue(default: nil) { db in
            let existing = try Int64.fetchOne(db, sql: "SELECT id FROM runs WHERE run_date = ?", arguments: [date])
            guard existing == nil else { return nil }
            let json = try self.encodeStateJSON(state)
            try db.execute(
                sql: "INSERT INTO runs (run_date, state_json, finished) VALUES (?, ?, 0)",
                arguments: [date, json]
            )
            return db.lastInsertedRowID
        }
    }

    func saveRun(id: Int64, state: RunState) {
        write { db in
            let json = try self.encodeStateJSON(state)
            try db.execute(sql: "UPDATE runs SET state_json = ? WHERE id = ?", arguments: [json, id])
        }
    }

    func finishRun(id: Int64, state: RunState) {
        write { db in
            let json = try self.encodeStateJSON(state)
            try db.execute(
                sql: "UPDATE runs SET state_json = ?, finished = 1 WHERE id = ?",
                arguments: [json, id]
            )
        }
    }

    // MARK: - Bux + shop

    // The wallet is always the sum of the ledger - never a stored number a
    // crash could half-update.
    private func fetchBalance(_ db: Database) throws -> Int {
        try Int.fetchOne(db, sql: "SELECT COALESCE(SUM(amount), 0) FROM bux_ledger") ?? 0
    }

    func balance() -> Int {
        readValue(default: 0) { db in try self.fetchBalance(db) }
    }

    func credit(_ amount: Int, reason: String) {
        write { db in
            try db.execute(
                sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (?, ?, ?)",
                arguments: [amount, reason, ISO8601DateFormatter().string(from: Date())]
            )
        }
    }

    func shopItems(includeArchived: Bool) -> [ShopItem] {
        readValue(default: []) { db in
            let sql = includeArchived
                ? "SELECT id, name, price, archived FROM shop_items ORDER BY id"
                : "SELECT id, name, price, archived FROM shop_items WHERE archived = 0 ORDER BY id"
            return try Row.fetchAll(db, sql: sql).map { row in
                ShopItem(id: row["id"], name: row["name"], price: row["price"], archived: row["archived"])
            }
        }
    }

    func addShopItem(name: String, price: Int) {
        write { db in
            // A negative price would flip redeem's -price into a credit,
            // silently corrupting the wallet invariant (balance = SUM).
            guard price > 0 else { throw GameStoreError.invalidPrice(price) }
            try db.execute(sql: "INSERT INTO shop_items (name, price) VALUES (?, ?)", arguments: [name, price])
        }
    }

    func archiveShopItem(id: Int64) {
        write { db in
            try db.execute(sql: "UPDATE shop_items SET archived = 1 WHERE id = ?", arguments: [id])
        }
    }

    // Balance check and ledger write happen in one transaction so a crash
    // between them can't spend bux without recording it (or vice versa).
    // The item is re-read by id so a stale ShopItem from an open screen
    // can't charge an old price or redeem something dad already archived.
    func redeem(item: ShopItem) -> Bool {
        writeValue(default: false) { db in
            guard let row = try Row.fetchOne(
                db, sql: "SELECT name, price FROM shop_items WHERE id = ? AND archived = 0",
                arguments: [item.id]
            ) else { throw GameStoreError.itemUnavailable(item.name) }

            let name: String = row["name"]
            let price: Int = row["price"]
            guard try self.fetchBalance(db) >= price else { return false }
            try db.execute(
                sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (?, ?, ?)",
                arguments: [-price, "redeem:\(name)", ISO8601DateFormatter().string(from: Date())]
            )
            return true
        }
    }
}
