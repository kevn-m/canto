import XCTest
import GRDB
@testable import Canto

final class TowerEngineTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("TowerEngineTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    private func makeState(floorIndex: Int = 0, extensionsTaken: Int = 0) -> RunState {
        RunState(
            floors: [
                RunState.Floor(kind: .fight, enemyName: "slime", maxHP: Balance.fightHP),
                RunState.Floor(kind: .fight, enemyName: "bat", maxHP: Balance.fightHP),
                RunState.Floor(kind: .boss, enemyName: "dragon", maxHP: Balance.bossHP),
            ],
            floorIndex: floorIndex, enemyHP: 0, partyHP: Balance.partyHP, turn: .kid,
            dealt: [:], kidDamageDealt: 0, extensionsTaken: extensionsTaken
        )
    }

    // MARK: - advance

    func test_advance_movesToNextFloorAndResetsEnemyHPWhenFloorsRemain() {
        var state = makeState(floorIndex: 0)

        let result = TowerEngine.advance(after: .victory, state: &state, dueCardsExist: false)

        XCTAssertEqual(result, .nextFloor)
        XCTAssertEqual(state.floorIndex, 1)
        XCTAssertEqual(state.enemyHP, Balance.fightHP)
    }

    func test_advance_offersDoorOnLastFloorWhenDueCardsExist() {
        var state = makeState(floorIndex: 2)

        let result = TowerEngine.advance(after: .victory, state: &state, dueCardsExist: true)

        XCTAssertEqual(result, .offerDoor)
        XCTAssertEqual(state.floorIndex, 2, "no floor mutation while just offering the door")
    }

    func test_advance_finishesVictoryOnLastFloorWithNoDueCards() {
        var state = makeState(floorIndex: 2)

        let result = TowerEngine.advance(after: .victory, state: &state, dueCardsExist: false)

        XCTAssertEqual(result, .runFinished(.victory))
    }

    func test_advance_finishesDefeatEvenMidFloorWithDueCardsAvailable() {
        var state = makeState(floorIndex: 0)

        let result = TowerEngine.advance(after: .defeat, state: &state, dueCardsExist: true)

        XCTAssertEqual(result, .runFinished(.defeat))
        XCTAssertEqual(state.floorIndex, 0, "a defeat must not advance the floor")
    }

    func test_advance_noDoorOnceExtensionCapReached() {
        var state = makeState(floorIndex: 2, extensionsTaken: Balance.maxExtensions)

        let result = TowerEngine.advance(after: .victory, state: &state, dueCardsExist: true)

        XCTAssertEqual(result, .runFinished(.victory), "the door must close at the cap or the climb never ends")
    }

    // MARK: - makeFreshRun

    func test_makeFreshRun_startsAtFloorZeroWithMatchingHP() {
        let state = TowerEngine.makeFreshRun()

        XCTAssertEqual(state.floors.count, 3)
        XCTAssertEqual(state.floors.last?.kind, .boss)
        XCTAssertEqual(state.enemyHP, state.floors[0].maxHP)
        XCTAssertEqual(state.partyHP, Balance.partyHP)
        XCTAssertTrue(state.isStructurallyValid)
    }

    // MARK: - takeDoor

    func test_takeDoor_appendsExtensionFloorAndIncrementsCount() {
        var state = makeState(floorIndex: 2, extensionsTaken: 0)

        TowerEngine.takeDoor(state: &state)

        XCTAssertEqual(state.floors.count, 4)
        XCTAssertEqual(state.floorIndex, 3)
        XCTAssertEqual(state.floors.last?.kind, .extensionFight)
        XCTAssertEqual(state.enemyHP, Balance.fightHP)
        XCTAssertEqual(state.extensionsTaken, 1)
    }

    // MARK: - isValid

    func test_isValid_falseForEmptyFloors() {
        var state = makeState()
        state.floors = []

        XCTAssertFalse(TowerEngine.isValid(state))
    }

    func test_isValid_falseForFloorIndexOutOfBounds() {
        let state = makeState(floorIndex: 3)

        XCTAssertFalse(TowerEngine.isValid(state))
    }

    func test_isValid_trueForFloorIndexInBounds() {
        let state = makeState(floorIndex: 1)

        XCTAssertTrue(TowerEngine.isValid(state))
    }

    // MARK: - reconcileDealt

    func test_reconcileDealt_mergesTodaysReviewsPerPlayerWithoutDuplicating() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id
        let dogId = store.deck().first { $0.traditional == "狗" }!.id

        let queue = try rawGameQueue(in: tempDir)
        try queue.write { db in
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [eatId, "kid", "hit", "2026-07-04T10:00:00Z"]
            )
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [dogId, "dad", "hit", "2026-07-04T11:00:00Z"]
            )
        }

        var state = makeState()
        state.dealt = ["kid": [eatId]]

        TowerEngine.reconcileDealt(in: &state, store: store, today: "2026-07-04")

        XCTAssertEqual(state.dealt["kid"], [eatId], "already-tracked deal must not duplicate")
        XCTAssertEqual(state.dealt["dad"], [dogId])
    }
}
