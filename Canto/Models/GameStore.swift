import Foundation
import GRDB

// A card plus its box/due state, for DeckView.
struct DeckEntry: Identifiable, Hashable {
    let id: Int64
    let traditional: String
    let jyutping: String
    let english: String
    let photoFilename: String?
    let benched: Bool
    let box: Int
    let dueOn: String
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
    private let photos: CardPhotos

    init(directory: URL = GameStore.defaultDirectory) {
        photos = CardPhotos(directory: directory)
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
        let version = try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0
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
        // 'dad' stays legal in the CHECK to avoid a PK rebuild on the live
        // wallet DB; app code only ever writes 'kid' now (see the migration below).
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
              run_date TEXT NOT NULL,
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
        // v1 had run_date UNIQUE (one Run per day). Kevin dropped that rule,
        // and a populated device db still carries the constraint in its
        // table definition - rebuild the table to shed it.
        if version == 1 {
            try db.execute(sql: """
                ALTER TABLE runs RENAME TO runs_v1;
                CREATE TABLE runs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_date TEXT NOT NULL,
                  state_json TEXT NOT NULL,
                  finished INTEGER NOT NULL DEFAULT 0
                );
                INSERT INTO runs (id, run_date, state_json, finished)
                  SELECT id, run_date, state_json, finished FROM runs_v1;
                DROP TABLE runs_v1
                """)
        }
        // Single-player: the dad/kid hot seat is gone. Keep the player column
        // (rebuilding the PK on the live wallet DB isn't worth it), collapse to
        // the kid's rows, and reset every box - Kevin chose a fresh start over
        // carrying old progress forward. Fires for v1 and v2 both: a device
        // that skipped the v2 release jumps 1 -> 3 and must still reset.
        if version == 1 || version == 2 {
            try db.execute(sql: "DELETE FROM card_states WHERE player = 'dad'")
            try db.execute(sql: "UPDATE card_states SET box = 0, due_on = '1970-01-01'")
        }
        // Schema version stamp so a future release can migrate a
        // populated device db instead of no-op'ing on IF NOT EXISTS.
        try db.execute(sql: "PRAGMA user_version = 3")
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
        rows.compactMap { row -> CardRecord? in
            let id: Int64 = row["id"]
            guard !excluding.contains(id) else { return nil }
            let box: Int = row["box"]
            guard validBox(box, cardId: id) else { return nil }
            return CardRecord(
                id: id, traditional: row["traditional"], jyutping: row["jyutping"],
                english: row["english"], box: box, dueOn: row["due_on"], photoFilename: row["photo_filename"]
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
                try db.execute(
                    sql: "INSERT INTO card_states (card_id, player) VALUES (?, 'kid')",
                    arguments: [cardId]
                )
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
                       cs.box, cs.due_on
                FROM cards c
                JOIN card_states cs ON cs.card_id = c.id AND cs.player = 'kid'
                ORDER BY c.id
                """)
            return rows.compactMap { row -> DeckEntry? in
                let id: Int64 = row["id"]
                let box: Int = row["box"]
                guard self.validBox(box, cardId: id) else { return nil }
                return DeckEntry(
                    id: id, traditional: row["traditional"], jyutping: row["jyutping"],
                    english: row["english"], photoFilename: row["photo_filename"], benched: row["benched"],
                    box: box, dueOn: row["due_on"]
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

    // Refuses only while TODAY's Run is unfinished — a Run abandoned on a past
    // day is unresumable, so it must not block deletion forever. Guard, photo
    // read and cascade share one transaction, so a refused or failed write
    // returns nil and the photo file is deleted only when the rows really were.
    func deleteCard(cardId: Int64) {
        let filename = writeValue(default: String?.none) { db -> String? in
            let today = ReviewEngine.todayString()
            let unfinished = try Int.fetchOne(
                db, sql: "SELECT COUNT(*) FROM runs WHERE run_date = ? AND finished = 0",
                arguments: [today]
            ) ?? 0
            guard unfinished == 0 else {
                self.reportError("Finish or abandon today's Run before deleting cards.")
                return nil
            }
            let filename = try String.fetchOne(db, sql: "SELECT photo_filename FROM cards WHERE id = ?", arguments: [cardId])
            try db.execute(sql: "DELETE FROM reviews WHERE card_id = ?", arguments: [cardId])
            try db.execute(sql: "DELETE FROM card_states WHERE card_id = ?", arguments: [cardId])
            try db.execute(sql: "DELETE FROM cards WHERE id = ?", arguments: [cardId])
            return filename
        }
        if let filename, !photos.delete(filename: filename) {
            NSLog("deleteCard: photo file delete failed for card %lld", cardId)
        }
    }

    // Full fresh start: wipes the kid's progress across both databases and
    // all card photos. Keeps shop_items (dad-configured). Unlike deleteCard
    // this does NOT guard on an unfinished run — a reset intentionally
    // clears runs too.
    //
    // Clears log.sqlite BEFORE touching game.sqlite: if the app dies
    // mid-reset, an untouched checkpoint means the next syncDeck just
    // re-tries the same history it already saw, rather than resurrecting a
    // "wiped" deck from history that never got cleared.
    func resetEverything(clearing log: LogStore) {
        guard log.clearHistory() else {
            reportError("Couldn't reset — try again.")
            return
        }
        let filenames: [String] = writeValue(default: []) { db in
            let names = try String.fetchAll(
                db, sql: "SELECT photo_filename FROM cards WHERE photo_filename IS NOT NULL")
            for table in ["reviews", "card_states", "cards", "bux_ledger", "runs"] {
                try db.execute(sql: "DELETE FROM \(table)")
            }
            try db.execute(
                sql: "INSERT OR REPLACE INTO meta (key, value) VALUES (?, '0')",
                arguments: ["last_imported_lookup_id"])
            return names
        }
        for name in filenames where !photos.delete(filename: name) {
            NSLog("resetEverything: photo delete failed for %@", name)
        }
    }

    // MARK: - Review

    func dueCards(on date: String, excluding: Set<Int64>) -> [CardRecord] {
        readValue(default: []) { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT c.id, c.traditional, c.jyutping, c.english, c.photo_filename, cs.box, cs.due_on
                FROM cards c
                JOIN card_states cs ON cs.card_id = c.id AND cs.player = 'kid'
                WHERE c.benched = 0 AND cs.due_on <= ?
                ORDER BY cs.due_on ASC
                """, arguments: [date])
            return self.hydrateCardRecords(rows, excluding: excluding)
        }
    }

    func nextCards(excluding: Set<Int64>, limit: Int) -> [CardRecord] {
        readValue(default: []) { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT c.id, c.traditional, c.jyutping, c.english, c.photo_filename, cs.box, cs.due_on
                FROM cards c
                JOIN card_states cs ON cs.card_id = c.id AND cs.player = 'kid'
                WHERE c.benched = 0
                ORDER BY cs.due_on ASC
                """)
            return Array(self.hydrateCardRecords(rows, excluding: excluding).prefix(limit))
        }
    }

    // Returns false (and sets lastError) when the write failed - the battle
    // must not advance HP on a review that never persisted.
    @discardableResult
    func recordReview(cardId: Int64, result: ReviewResult, on date: String) -> Bool {
        writeValue(default: false) { db in
            guard let currentBox = try Int.fetchOne(
                db, sql: "SELECT box FROM card_states WHERE card_id = ? AND player = 'kid'",
                arguments: [cardId]
            ) else { throw GameStoreError.unknownCard(cardId) }

            let newBox = ReviewEngine.nextBox(from: currentBox, result: result)
            let newDueOn = ReviewEngine.nextDueDate(box: currentBox, result: result, today: date)
            let reviewedAt = ISO8601DateFormatter().string(from: Date())

            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, 'kid', ?, ?)",
                arguments: [cardId, result.rawValue, reviewedAt]
            )
            try db.execute(
                sql: "UPDATE card_states SET box = ?, due_on = ? WHERE card_id = ? AND player = 'kid'",
                arguments: [newBox, newDueOn, cardId]
            )
            return true
        }
    }

    // Cards already reviewed today, regardless of what RunState.dealt says -
    // used on Run resume to reconcile a review that committed before a kill
    // wiped out the not-yet-saved dealt list (see TowerEngine.reconcileDealt).
    // reviewed_at is ISO8601 UTC but `date` is a local calendar day, so the
    // day converts to a UTC instant range - a prefix match would miss every
    // early-morning review east of UTC.
    func reviewedCardIds(on date: String) -> Set<Int64> {
        guard let range = Self.utcRange(ofLocalDay: date) else { return [] }
        return readValue(default: []) { db in
            let ids = try Int64.fetchAll(
                db, sql: "SELECT DISTINCT card_id FROM reviews WHERE player = 'kid' AND reviewed_at >= ? AND reviewed_at < ?",
                arguments: [range.start, range.end]
            )
            return Set(ids)
        }
    }

    private static func utcRange(ofLocalDay date: String) -> (start: String, end: String)? {
        guard let dayStart = ReviewEngine.startOfLocalDay(date),
              let dayEnd = Calendar(identifier: .gregorian).date(byAdding: .day, value: 1, to: dayStart) else {
            return nil
        }
        let iso = ISO8601DateFormatter()
        return (iso.string(from: dayStart), iso.string(from: dayEnd))
    }

    // MARK: - Runs

    // Today's unfinished run, for resume. Finished rows are paid history -
    // they never come back through here, and starting a fresh run beside
    // them is allowed (runs repeat freely since schema v2).
    func todaysRun(on date: String) -> (id: Int64, state: RunState)? {
        writeValue(default: nil) { db in
            guard let row = try Row.fetchOne(
                db,
                sql: "SELECT id, state_json FROM runs WHERE run_date = ? AND finished = 0 ORDER BY id DESC LIMIT 1",
                arguments: [date]
            ) else { return nil }

            let id: Int64 = row["id"]
            let stateJSON: String = row["state_json"]
            guard let data = stateJSON.data(using: .utf8),
                  let state = try? JSONDecoder().decode(RunState.self, from: data),
                  state.isStructurallyValid else {
                // A corrupt unfinished snapshot would dead-end resume, so it
                // gets cleared - losing one run's progress beats that.
                try db.execute(sql: "DELETE FROM runs WHERE id = ?", arguments: [id])
                self.reportError("Corrupt run state for \(date) - cleared it so a fresh Run can start.")
                return nil
            }
            return (id: id, state: state)
        }
    }

    // One unfinished run at a time is a data invariant (resume must be
    // unambiguous), not a gameplay limit - finished runs don't block.
    func startRun(on date: String, state: RunState) -> Int64? {
        writeValue(default: nil) { db in
            let existing = try Int64.fetchOne(
                db, sql: "SELECT id FROM runs WHERE run_date = ? AND finished = 0", arguments: [date]
            )
            guard existing == nil else { return nil }
            let json = try self.encodeStateJSON(state)
            try db.execute(
                sql: "INSERT INTO runs (run_date, state_json, finished) VALUES (?, ?, 0)",
                arguments: [date, json]
            )
            return db.lastInsertedRowID
        }
    }

    // finished = 0 guard: a finished run's snapshot backs what the ledger
    // already paid (RunSummaryView recomputes from it), so it's immutable.
    func saveRun(id: Int64, state: RunState) {
        write { db in
            let json = try self.encodeStateJSON(state)
            try db.execute(sql: "UPDATE runs SET state_json = ? WHERE id = ? AND finished = 0", arguments: [json, id])
        }
    }

    // False means the run is still marked unfinished on disk - TowerView's
    // load path re-finishes an ended-but-unfinished run, so this self-heals.
    // The WHERE finished = 0 guard makes that self-heal safe to call twice:
    // a run that's already finished is left untouched and pays nothing.
    @discardableResult
    func finishRun(id: Int64, state: RunState) -> Bool {
        writeValue(default: false) { db in
            let json = try self.encodeStateJSON(state)
            try db.execute(
                sql: "UPDATE runs SET state_json = ?, finished = 1 WHERE id = ? AND finished = 0",
                arguments: [json, id]
            )
            if db.changesCount > 0 {
                let payout = state.payoutBreakdown()
                let createdAt = ISO8601DateFormatter().string(from: Date())
                for (amount, reason) in [
                    (payout.finish, "run_finish"), (payout.bossBonus, "boss_bonus"), (payout.extensions, "extension"),
                ] where amount != 0 {
                    try db.execute(
                        sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (?, ?, ?)",
                        arguments: [amount, reason, createdAt]
                    )
                }
            }
            return true
        }
    }

    // Quitting a Run partway: delete the unfinished row so no summary or
    // payout follows. Pays nothing (contrast finishRun) - abandoning isn't
    // finishing. The finished = 0 guard keeps a paid, finished run immutable,
    // same as saveRun/finishRun. Returns false only if the write itself failed
    // (db not open, or the delete threw), like finishRun - TowerView then keeps
    // the fight on screen rather than lie that the climb ended.
    @discardableResult
    func abandonRun(id: Int64) -> Bool {
        writeValue(default: false) { db in
            try db.execute(sql: "DELETE FROM runs WHERE id = ? AND finished = 0", arguments: [id])
            return true
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
    // @discardableResult: ShopView relies on lastError to surface a refusal,
    // same as recordReview/finishRun below.
    @discardableResult
    func redeem(item: ShopItem) -> Bool {
        writeValue(default: false) { db in
            guard let row = try Row.fetchOne(
                db, sql: "SELECT name, price FROM shop_items WHERE id = ? AND archived = 0",
                arguments: [item.id]
            ) else { throw GameStoreError.itemUnavailable(item.name) }

            let name: String = row["name"]
            let price: Int = row["price"]
            guard try self.fetchBalance(db) >= price else {
                // The UI disables unaffordable buttons, so landing here means
                // the screen's balance went stale - say so rather than letting
                // the confirm dialog dismiss into silence.
                self.reportError("Not enough CantoBux for \(name).")
                return false
            }
            try db.execute(
                sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (?, ?, ?)",
                arguments: [-price, "redeem:\(name)", ISO8601DateFormatter().string(from: Date())]
            )
            return true
        }
    }
}
