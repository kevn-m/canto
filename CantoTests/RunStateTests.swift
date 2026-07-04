import XCTest
@testable import Canto

final class RunStateTests: XCTestCase {
    private func makeState(floors: [RunState.Floor], floorIndex: Int, partyHP: Int) -> RunState {
        RunState(
            floors: floors, floorIndex: floorIndex, enemyHP: 0, partyHP: partyHP, turn: .kid,
            dealt: [:], kidDamageDealt: 0, extensionsTaken: 0
        )
    }

    private let baseFloors = [
        RunState.Floor(kind: .fight, enemyName: "slime", maxHP: 7),
        RunState.Floor(kind: .fight, enemyName: "bat", maxHP: 7),
        RunState.Floor(kind: .boss, enemyName: "dragon", maxHP: 12),
    ]

    func test_payoutBreakdown_defeatPaysFinishOnly() {
        let state = makeState(floors: baseFloors, floorIndex: 0, partyHP: 0)

        let payout = state.payoutBreakdown()

        XCTAssertEqual(payout.finish, Balance.runFinishPay)
        XCTAssertEqual(payout.bossBonus, 0)
        XCTAssertEqual(payout.extensions, 0)
        XCTAssertEqual(payout.total, Balance.runFinishPay)
    }

    func test_payoutBreakdown_victoryPaysFinishPlusBoss() {
        let state = makeState(floors: baseFloors, floorIndex: 2, partyHP: 5)

        let payout = state.payoutBreakdown()

        XCTAssertEqual(payout.finish, Balance.runFinishPay)
        XCTAssertEqual(payout.bossBonus, Balance.bossBonusPay)
        XCTAssertEqual(payout.extensions, 0)
        XCTAssertEqual(payout.total, Balance.runFinishPay + Balance.bossBonusPay)
    }

    func test_payoutBreakdown_victoryWithTwoClearedExtensionsPaysBoth() {
        let floors = baseFloors + [
            RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: 7),
            RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: 7),
        ]
        let state = makeState(floors: floors, floorIndex: 4, partyHP: 5)

        let payout = state.payoutBreakdown()

        XCTAssertEqual(payout.finish, Balance.runFinishPay)
        XCTAssertEqual(payout.bossBonus, Balance.bossBonusPay)
        XCTAssertEqual(payout.extensions, 2 * Balance.extensionPay)
        XCTAssertEqual(payout.total, Balance.runFinishPay + Balance.bossBonusPay + 2 * Balance.extensionPay)
    }

    func test_payoutBreakdown_defeatOnExtensionFloorPaysOnlyEarlierClearedExtensions() {
        let floors = baseFloors + [
            RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: 7),
            RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: 7),
        ]
        let state = makeState(floors: floors, floorIndex: 4, partyHP: 0)

        let payout = state.payoutBreakdown()

        XCTAssertEqual(payout.finish, Balance.runFinishPay)
        XCTAssertEqual(payout.bossBonus, 0)
        XCTAssertEqual(payout.extensions, 1 * Balance.extensionPay, "only the earlier cleared extension floor pays; the one just lost on doesn't")
        XCTAssertEqual(payout.total, Balance.runFinishPay + Balance.extensionPay)
    }
}
