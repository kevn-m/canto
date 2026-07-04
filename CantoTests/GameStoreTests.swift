import XCTest
import GRDB
@testable import Canto

final class GameStoreTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("GameStoreTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    // Reads reviews.count directly from the sqlite file: GameStore's public
    // API has no getter for it, and adding one just for this assertion would
    // be surface area the game never needs.
    private func reviewCount() throws -> Int {
        let queue = try DatabaseQueue(path: tempDir.appendingPathComponent("game.sqlite").path)
        return try queue.read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM reviews") ?? 0
        }
    }

    // MARK: - syncDeck

    func test_syncDeck_importsOnlyLookupsWithChosenSense() {
        let log = LogStore(directory: tempDir)
        log.record(heard: "nothing chosen", matched: false, viaVoice: false)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let deck = store.deck()
        XCTAssertEqual(deck.count, 1)
        XCTAssertEqual(deck[0].traditional, "食")
    }

    func test_syncDeck_duplicateTraditionalJyutpingCollapseToOneCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "eat again", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 1)
    }

    func test_syncDeck_safeToRunTwiceWithNoNewLookups() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 1)
    }

    func test_syncDeck_checkpointAdvancesSoLaterSyncOnlyImportsNewLookups() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        XCTAssertEqual(store.deck().count, 1)

        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 2)
    }

    func test_syncDeck_createsCardStatesForBothPlayersOnNewCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let entry = store.deck().first!
        XCTAssertEqual(entry.dadBox, 0)
        XCTAssertEqual(entry.kidBox, 0)
        XCTAssertEqual(entry.dadDueOn, "1970-01-01")
        XCTAssertEqual(entry.kidDueOn, "1970-01-01")
    }

    // MARK: - recordReview

    func test_recordReview_hitClimbsBoxAndAppendsReviewRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.recordReview(cardId: cardId, player: .kid, result: .hit, on: "2026-07-04")

        let entry = store.deck().first!
        XCTAssertEqual(entry.kidBox, 1)
        XCTAssertEqual(entry.kidDueOn, "2026-07-05")
        XCTAssertEqual(try reviewCount(), 1)
    }

    func test_recordReview_whiffDropsBoxAndStaysDueTodayAndAppendsReviewRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.recordReview(cardId: cardId, player: .dad, result: .hit, on: "2026-07-04")
        store.recordReview(cardId: cardId, player: .dad, result: .whiff, on: "2026-07-05")

        let entry = store.deck().first!
        XCTAssertEqual(entry.dadBox, 1)
        XCTAssertEqual(entry.dadDueOn, "2026-07-05")
        XCTAssertEqual(try reviewCount(), 2)
    }

    // MARK: - dueCards / nextCards / benching

    func test_benchedCards_excludedFromDueAndNextCards() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.setBenched(cardId: cardId, true)

        XCTAssertTrue(store.dueCards(for: .kid, on: "2026-07-04", excluding: []).isEmpty)
        XCTAssertTrue(store.nextCards(for: .kid, excluding: [], limit: 3).isEmpty)
    }

    func test_dueCards_returnsUnbenchedDueCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let due = store.dueCards(for: .kid, on: "2026-07-04", excluding: [])
        XCTAssertEqual(due.count, 1)
        XCTAssertEqual(due[0].traditional, "食")
    }

    // MARK: - Ledger

    func test_balance_isSumOfLedgerAndCreditAdds() {
        let store = GameStore(directory: tempDir)
        XCTAssertEqual(store.balance(), 0)

        store.credit(10, reason: "run_finish")
        store.credit(5, reason: "boss_bonus")

        XCTAssertEqual(store.balance(), 15)
    }

    func test_redeem_decrementsBalanceExactlyOnceWhenAffordable() {
        let store = GameStore(directory: tempDir)
        store.credit(30, reason: "run_finish")
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!

        XCTAssertTrue(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 10)
    }

    func test_redeem_refusesAndWritesNothingWhenBalanceTooLow() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!

        XCTAssertFalse(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 0)
    }

    // MARK: - Shop

    func test_shopItem_addAndArchiveRoundTrip() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Ice cream", price: 20)
        XCTAssertEqual(store.shopItems(includeArchived: false).count, 1)

        let item = store.shopItems(includeArchived: false).first!
        store.archiveShopItem(id: item.id)

        XCTAssertTrue(store.shopItems(includeArchived: false).isEmpty)
        XCTAssertEqual(store.shopItems(includeArchived: true).count, 1)
        XCTAssertTrue(store.shopItems(includeArchived: true).first!.archived)
    }

    // MARK: - Runs

    private func makeRunState(enemyHP: Int = 7) -> RunState {
        RunState(
            floors: [RunState.Floor(kind: .fight, enemyName: "slime", maxHP: 7)],
            floorIndex: 0, enemyHP: enemyHP, partyHP: 5, turn: .kid,
            dealt: [:], kidDamageDealt: 0, extensionsTaken: 0
        )
    }

    func test_run_startSaveTodaysRunRoundTrip() {
        let store = GameStore(directory: tempDir)

        let runId = store.startRun(on: "2026-07-04", state: makeRunState())
        XCTAssertNotNil(runId)

        store.saveRun(id: runId!, state: makeRunState(enemyHP: 4))

        let fetched = store.todaysRun(on: "2026-07-04")
        XCTAssertEqual(fetched?.id, runId)
        XCTAssertEqual(fetched?.state.enemyHP, 4)
        XCTAssertFalse(fetched?.finished ?? true)
    }

    func test_startRun_returnsNilWhenOneAlreadyExistsForThatDate() {
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
        XCTAssertNil(store.startRun(on: "2026-07-04", state: makeRunState()))
    }

    func test_finishRun_marksFinished() {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!

        store.finishRun(id: runId, state: makeRunState(enemyHP: 0))

        XCTAssertEqual(store.todaysRun(on: "2026-07-04")?.finished, true)
    }

    func test_nextCards_ordersBySoonestDueAndRespectsLimit() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id

        // A hit pushes 食 to due 2026-07-05; 狗 stays at the 1970 epoch.
        store.recordReview(cardId: eatId, player: .kid, result: .hit, on: "2026-07-04")

        let one = store.nextCards(for: .kid, excluding: [], limit: 1)
        XCTAssertEqual(one.map(\.traditional), ["狗"])

        let two = store.nextCards(for: .kid, excluding: [], limit: 3)
        XCTAssertEqual(two.map(\.traditional), ["狗", "食"])
    }

    // MARK: - Failure contract (ADR 0009)

    // Mid-query errors hop to the main queue (reportError), so give the
    // main runloop a beat before asserting on lastError.
    private func drainMainQueue() {
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
    }

    private func rawGameQueue() throws -> DatabaseQueue {
        try DatabaseQueue(path: tempDir.appendingPathComponent("game.sqlite").path)
    }

    func test_deckAndDueCards_skipAndReportCorruptBoxRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        // Plant a box the CHECK constraint would normally reject, as a
        // migration bug or pre-CHECK db would.
        try rawGameQueue().write { db in
            try db.execute(sql: "PRAGMA ignore_check_constraints = 1")
            try db.execute(sql: "UPDATE card_states SET box = 9 WHERE player = 'kid'")
        }

        XCTAssertTrue(store.dueCards(for: .kid, on: "2026-07-04", excluding: []).isEmpty)
        XCTAssertTrue(store.deck().isEmpty)
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
    }

    func test_todaysRun_clearsCorruptRowSoAFreshRunCanStart() throws {
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))

        try rawGameQueue().write { db in
            try db.execute(sql: "UPDATE runs SET state_json = 'not json'")
        }

        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
    }

    func test_redeem_refusesArchivedItemAndReportsIt() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!
        store.archiveShopItem(id: item.id)

        XCTAssertFalse(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 100)
        XCTAssertNotNil(store.lastError)
    }

    func test_addShopItem_refusesNonPositivePrice() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Free money", price: -5)

        XCTAssertTrue(store.shopItems(includeArchived: true).isEmpty)
        XCTAssertNotNil(store.lastError)
    }

    func test_recordReview_unknownCardReportsInsteadOfSilentNoOp() {
        let store = GameStore(directory: tempDir)
        // The false return is what stops BattleView advancing the fight.
        XCTAssertFalse(store.recordReview(cardId: 999, player: .kid, result: .hit, on: "2026-07-04"))
        XCTAssertNotNil(store.lastError)
    }

    func test_clearError_resetsLastError() throws {
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.lastError)

        store.clearError()
        XCTAssertNil(store.lastError)
    }

    func test_writeFailureOnUnwritablePath_setsLastErrorInsteadOfCrashing() throws {
        // Point "directory" at a plain file, so FileManager can't create a
        // directory there and GameStore's open fails - mirrors
        // LogStoreTests' unwritable-path test but GameStore must surface the
        // failure via lastError instead of swallowing it.
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)

        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.lastError)

        let redeemed = store.redeem(item: ShopItem(id: 1, name: "Ice cream", price: 5, archived: false))
        XCTAssertFalse(redeemed)
        XCTAssertNotNil(store.lastError)
        XCTAssertEqual(store.balance(), 0)
    }
}
