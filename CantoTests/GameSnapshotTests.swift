import XCTest
import GRDB
@testable import Canto

final class GameSnapshotTests: XCTestCase {
    var sourceDir: URL!
    var destDir: URL!

    override func setUp() {
        super.setUp()
        sourceDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("GameSnapshotTests-src-\(UUID().uuidString)")
        destDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("GameSnapshotTests-dst-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: sourceDir)
        try? FileManager.default.removeItem(at: destDir)
        sourceDir = nil
        destDir = nil
        super.tearDown()
    }

    // A store with every kind of state a snapshot must carry: history with a
    // miss, cards in different boxes, ledger, a finished and an unfinished
    // run, shop items, gear, an equipped slot, an avatar (badges arrive via
    // finishRun's awards).
    private func seedStores() -> (store: GameStore, log: LogStore) {
        let log = LogStore(directory: sourceDir)
        log.record(heard: "missed word", matched: false, viaVoice: true)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")

        let store = GameStore(directory: sourceDir)
        store.syncDeck(from: log)
        let deck = store.deck()
        store.recordReview(cardId: deck[0].id, result: .hit, on: "2026-07-01")
        store.recordReview(cardId: deck[1].id, result: .whiff, on: "2026-07-02")

        store.credit(10_000, reason: "test seed")
        store.addShopItem(name: "ice cream", price: 200)

        let finishedId = store.startRun(on: "2026-07-01", state: TowerEngine.makeFreshRun())!
        store.finishRun(id: finishedId, state: TowerEngine.makeFreshRun())
        _ = store.startRun(on: "2026-07-02", state: TowerEngine.makeFreshRun())

        XCTAssertTrue(store.buyGear(id: "hat-cap"))
        store.equip(slot: .helmet, id: "hat-cap")
        store.setAvatar(id: "avatar-scout")
        XCTAssertNil(store.lastError, "seeding must not error")
        return (store, log)
    }

    private func export(_ store: GameStore, _ log: LogStore) -> Data {
        GameSnapshot.json(
            game: store.snapshotRows(),
            lookups: log.allLookups().map(GameSnapshot.Lookup.init),
            date: "2026-07-17T00:00:00Z"
        )
    }

    @discardableResult
    private func importInto(destDir: URL, data: Data) throws -> (store: GameStore, log: LogStore) {
        let payload = try GameSnapshot.decode(data)
        let log = LogStore(directory: destDir)
        let lastId = try log.replaceAllLookups(payload.lookups)
        let store = GameStore(directory: destDir)
        store.importSnapshot(payload, lastLogId: lastId)
        return (store, log)
    }

    func test_roundTrip_restoresTheWholeGame() throws {
        let (source, sourceLog) = seedStores()
        let data = export(source, sourceLog)

        let (dest, destLog) = try importInto(destDir: destDir, data: data)

        XCTAssertNil(dest.lastError)
        XCTAssertEqual(dest.balance(), source.balance())
        XCTAssertEqual(destLog.allLookups().count, sourceLog.allLookups().count)

        let sourceDeck = source.deck().map { "\($0.traditional)|\($0.jyutping)|\($0.english)|\($0.box)|\($0.dueOn)|\($0.benched)" }
        let destDeck = dest.deck().map { "\($0.traditional)|\($0.jyutping)|\($0.english)|\($0.box)|\($0.dueOn)|\($0.benched)" }
        XCTAssertEqual(Set(destDeck), Set(sourceDeck))

        XCTAssertEqual(dest.ownedGear(), source.ownedGear())
        XCTAssertEqual(dest.equippedGear(), source.equippedGear())
        XCTAssertEqual(dest.avatarId(), source.avatarId())
        XCTAssertEqual(dest.earnedBadges().map(\.id), source.earnedBadges().map(\.id))
        XCTAssertEqual(dest.shopItems(includeArchived: true).map(\.name), ["ice cream"])

        let queue = try rawGameQueue(in: destDir)
        let reviewCount = try queue.read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM reviews") }
        XCTAssertEqual(reviewCount, 2)
    }

    func test_roundTrip_dropsTheUnfinishedRun() throws {
        let (source, sourceLog) = seedStores()
        try importInto(destDir: destDir, data: export(source, sourceLog))

        let queue = try rawGameQueue(in: destDir)
        let counts = try queue.read { db in
            (total: try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM runs") ?? -1,
             unfinished: try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM runs WHERE finished = 0") ?? -1)
        }
        XCTAssertEqual(counts.total, 1)
        XCTAssertEqual(counts.unfinished, 0)
    }

    // The checkpoint must land on the restored log's max id, or the next
    // syncDeck re-imports restored History as duplicate cards.
    func test_roundTrip_syncDeckAfterImportInsertsNothing() throws {
        let (source, sourceLog) = seedStores()
        let (dest, destLog) = try importInto(destDir: destDir, data: export(source, sourceLog))

        let before = dest.deck().count
        dest.syncDeck(from: destLog)
        XCTAssertEqual(dest.deck().count, before)
    }

    func test_roundTrip_reviewsRemapToTheRightNewCardIds() throws {
        let (source, sourceLog) = seedStores()
        try importInto(destDir: destDir, data: export(source, sourceLog))

        let queue = try rawGameQueue(in: destDir)
        let results = try queue.read { db in
            try Row.fetchAll(db, sql: """
                SELECT c.traditional, r.result FROM reviews r JOIN cards c ON c.id = r.card_id
                """).map { (traditional: $0["traditional"] as String, result: $0["result"] as String) }
        }
        XCTAssertEqual(results.first { $0.traditional == "食" }?.result, "hit")
        XCTAssertEqual(results.first { $0.traditional == "狗" }?.result, "whiff")
    }

    func test_decode_refusesANewerSnapshot() {
        let data = Data(#"{"version": 2}"#.utf8)
        XCTAssertThrowsError(try GameSnapshot.decode(data)) { error in
            guard case GameSnapshot.SnapshotError.newerVersion(2) = error else {
                return XCTFail("expected newerVersion, got \(error)")
            }
        }
    }

    func test_decode_refusesNonSnapshotJSON() {
        XCTAssertThrowsError(try GameSnapshot.decode(Data("not json".utf8)))
        XCTAssertThrowsError(try GameSnapshot.decode(Data(#"{"version": 1}"#.utf8)))
    }

    // A payload that violates the box CHECK must roll the whole import back:
    // lastError set, nothing half-written.
    func test_importFailure_rollsBackAndSetsLastError() throws {
        let (source, sourceLog) = seedStores()
        let good = export(source, sourceLog)
        let (dest, destLog) = try importInto(destDir: destDir, data: good)
        XCTAssertNil(dest.lastError)
        let deckBefore = dest.deck().count
        let balanceBefore = dest.balance()

        let bad = GameSnapshot.Payload(
            version: 1, exportedOn: "2026-07-17T00:00:00Z", lookups: [],
            cards: [GameSnapshot.Card(
                traditional: "食", jyutping: "sik6", english: "eat",
                benched: false, createdAt: "2026-07-01T00:00:00Z", box: 9, dueOn: "2026-07-01"
            )],
            ledger: [], reviews: [], runs: [], shopItems: [], badges: [], gear: [], meta: [:]
        )
        dest.importSnapshot(bad, lastLogId: try destLog.replaceAllLookups([]))

        XCTAssertNotNil(dest.lastError)
        XCTAssertEqual(dest.deck().count, deckBefore)
        XCTAssertEqual(dest.balance(), balanceBefore)
    }
}
