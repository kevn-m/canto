import XCTest
@testable import Canto

final class BattleEngineTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("BattleEngineTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    private func card(id: Int64, box: Int = 0) -> CardRecord {
        CardRecord(id: id, traditional: "字", jyutping: "zi6", english: "word", box: box, dueOn: "2026-07-04")
    }

    private func makeState(enemyHP: Int = 7, partyHP: Int = 5, turn: Player = .kid) -> RunState {
        RunState(
            floors: [RunState.Floor(kind: .fight, enemyName: "slime", maxHP: 7)],
            floorIndex: 0, enemyHP: enemyHP, partyHP: partyHP, turn: turn,
            dealt: [:], kidDamageDealt: 0, extensionsTaken: 0
        )
    }

    // MARK: - applyResult

    func test_applyResult_hitDamagesEnemyByBoxTierAndFlipsTurn() {
        var state = makeState(turn: .kid)
        let outcome = BattleEngine.applyResult(.hit, card: card(id: 1, box: 0), to: &state)

        XCTAssertNil(outcome)
        XCTAssertEqual(state.enemyHP, 7 - 3)
        XCTAssertEqual(state.kidDamageDealt, 3)
        XCTAssertEqual(state.turn, .dad)
        XCTAssertEqual(state.dealt["kid"], [1])
    }

    func test_applyResult_whiffDrainsPartyAndFlipsTurn() {
        var state = makeState(turn: .dad)
        let outcome = BattleEngine.applyResult(.whiff, card: card(id: 2), to: &state)

        XCTAssertNil(outcome)
        XCTAssertEqual(state.partyHP, 5 - Balance.enemyAttack)
        XCTAssertEqual(state.enemyHP, 7)
        XCTAssertEqual(state.kidDamageDealt, 0)
        XCTAssertEqual(state.turn, .kid)
        XCTAssertEqual(state.dealt["dad"], [2])
    }

    func test_applyResult_enemyReachingZeroIsVictory() {
        var state = makeState(enemyHP: 2, turn: .kid)
        let outcome = BattleEngine.applyResult(.hit, card: card(id: 1, box: 0), to: &state)

        XCTAssertEqual(outcome, .victory)
        XCTAssertEqual(state.turn, .kid, "turn must not flip past a finished fight")
    }

    func test_applyResult_partyReachingZeroIsDefeat() {
        var state = makeState(partyHP: 1, turn: .kid)
        let outcome = BattleEngine.applyResult(.whiff, card: card(id: 1), to: &state)

        XCTAssertEqual(outcome, .defeat)
    }

    // MARK: - dealHand

    func test_dealHand_ordersDueCardsMostOverdueFirst() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id
        let dogId = store.deck().first { $0.traditional == "狗" }!.id

        // 食 becomes due 2026-07-02, 狗 becomes due 2026-07-03 - both are
        // due by 2026-07-04, 食 more overdue than 狗.
        store.recordReview(cardId: eatId, player: .kid, result: .hit, on: "2026-07-01")
        store.recordReview(cardId: dogId, player: .kid, result: .hit, on: "2026-07-02")

        let hand = BattleEngine.dealHand(store: store, player: .kid, dealt: [], today: "2026-07-04")

        XCTAssertEqual(hand.map(\.traditional), ["食", "狗"])
    }

    func test_dealHand_neverReturnsMoreThanThree() {
        let log = LogStore(directory: tempDir)
        for (word, traditional, jyutping) in [("eat", "食", "sik6"), ("dog", "狗", "gau2"), ("cat", "貓", "maau1"), ("water", "水", "seoi2")] {
            makeChosenLookup(log, heard: word, traditional: traditional, jyutping: jyutping)
        }
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let hand = BattleEngine.dealHand(store: store, player: .kid, dealt: [], today: "2026-07-04")

        XCTAssertEqual(hand.count, 3)
    }

    func test_dealHand_excludesAlreadyDealtCards() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id

        let hand = BattleEngine.dealHand(store: store, player: .kid, dealt: [eatId], today: "2026-07-04")

        XCTAssertEqual(hand.map(\.traditional), ["狗"])
    }

    func test_dealHand_fallsBackToLowestBoxIgnoringDealtWhenWholeDeckExhausted() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        makeChosenLookup(log, heard: "cat", traditional: "貓", jyutping: "maau1")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let deck = store.deck()
        let eatId = deck.first { $0.traditional == "食" }!.id
        let dogId = deck.first { $0.traditional == "狗" }!.id
        let catId = deck.first { $0.traditional == "貓" }!.id

        // 貓 climbs to box 2, 狗 to box 1, 食 stays New (box 0).
        store.recordReview(cardId: catId, player: .kid, result: .hit, on: "2026-07-01")
        store.recordReview(cardId: catId, player: .kid, result: .hit, on: "2026-07-02")
        store.recordReview(cardId: dogId, player: .kid, result: .hit, on: "2026-07-01")

        let allDealt: Set<Int64> = [eatId, dogId, catId]
        let hand = BattleEngine.dealHand(store: store, player: .kid, dealt: allDealt, today: "2026-07-04")

        XCTAssertEqual(hand.map(\.traditional), ["食", "狗", "貓"])
    }
}
