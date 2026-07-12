import XCTest
@testable import Canto

final class ReviewEngineTests: XCTestCase {
    private func card(id: Int64, box: Int = 0, dueOn: String = "2026-07-04") -> CardRecord {
        CardRecord(id: id, traditional: "字", jyutping: "zi6", english: "word", box: box, dueOn: dueOn)
    }

    // MARK: - nextBox

    func test_nextBox_hitClimbsOneBox() {
        XCTAssertEqual(ReviewEngine.nextBox(from: 0, result: .hit), 1)
        XCTAssertEqual(ReviewEngine.nextBox(from: 1, result: .hit), 2)
        XCTAssertEqual(ReviewEngine.nextBox(from: 2, result: .hit), 3)
    }

    func test_nextBox_hitCapsAtMastered() {
        XCTAssertEqual(ReviewEngine.nextBox(from: 3, result: .hit), 3)
    }

    func test_nextBox_whiffDropsToLearningFromAnyBox() {
        XCTAssertEqual(ReviewEngine.nextBox(from: 0, result: .whiff), 1)
        XCTAssertEqual(ReviewEngine.nextBox(from: 2, result: .whiff), 1)
        XCTAssertEqual(ReviewEngine.nextBox(from: 3, result: .whiff), 1)
    }

    // MARK: - nextDueDate

    func test_nextDueDate_whiffStaysDueToday() {
        XCTAssertEqual(ReviewEngine.nextDueDate(box: 2, result: .whiff, today: "2026-07-04"), "2026-07-04")
    }

    func test_nextDueDate_hitFollowsIntervalsTableForNewBox() {
        // box 0 -> hit -> box 1 -> interval 1 day
        XCTAssertEqual(ReviewEngine.nextDueDate(box: 0, result: .hit, today: "2026-07-04"), "2026-07-05")
        // box 1 -> hit -> box 2 -> interval 3 days
        XCTAssertEqual(ReviewEngine.nextDueDate(box: 1, result: .hit, today: "2026-07-04"), "2026-07-07")
        // box 2 -> hit -> box 3 -> interval 7 days
        XCTAssertEqual(ReviewEngine.nextDueDate(box: 2, result: .hit, today: "2026-07-04"), "2026-07-11")
    }

    // MARK: - damage

    func test_damage_newAndLearningDealThree() {
        XCTAssertEqual(ReviewEngine.damage(forBox: 0), 3)
        XCTAssertEqual(ReviewEngine.damage(forBox: 1), 3)
    }

    func test_damage_solidDealsTwo() {
        XCTAssertEqual(ReviewEngine.damage(forBox: 2), 2)
    }

    func test_damage_masteredDealsOne() {
        XCTAssertEqual(ReviewEngine.damage(forBox: 3), 1)
    }

    func test_damageTable_hasOneEntryPerBox() {
        // Play-tuning edits Balance.damageByBox; a wrong length would trap at
        // ReviewEngine.damage(forBox:) mid-battle instead of failing here.
        XCTAssertEqual(Balance.damageByBox.count, 4)
    }

    // MARK: - hand

    func test_hand_capsDueAtTwoWhenAFillCardExists() {
        // Three chronic whiffs are all due every day; without the cap they
        // would deal the identical hand every fight, forever.
        let due = [card(id: 1), card(id: 2), card(id: 3)]
        let soonest = [card(id: 4)]
        let hand = ReviewEngine.hand(due: due, soonest: soonest)
        XCTAssertEqual(hand.map(\.id), [1, 2, 4])
    }

    func test_hand_padsFromDueWhenNoFillCardExists() {
        let due = [card(id: 1), card(id: 2), card(id: 3)]
        let hand = ReviewEngine.hand(due: due, soonest: [])
        XCTAssertEqual(hand.map(\.id), [1, 2, 3])
    }

    func test_hand_fillsFromSoonestWhenFewerThanThreeDue() {
        let due = [card(id: 1)]
        let soonest = [card(id: 2), card(id: 3), card(id: 4)]
        let hand = ReviewEngine.hand(due: due, soonest: soonest)
        XCTAssertEqual(hand.map(\.id), [1, 2, 3])
    }

    func test_hand_neverReturnsMoreThanThree() {
        let due = [card(id: 1), card(id: 2), card(id: 3), card(id: 4)]
        let hand = ReviewEngine.hand(due: due, soonest: [])
        XCTAssertEqual(hand.count, 3)
    }

    func test_hand_returnsFewerThanThreeWhenBothListsAreShort() {
        let due = [card(id: 1)]
        let hand = ReviewEngine.hand(due: due, soonest: [])
        XCTAssertEqual(hand.map(\.id), [1])
    }
}
