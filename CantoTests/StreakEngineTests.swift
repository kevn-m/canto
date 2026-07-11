import XCTest
@testable import Canto

final class StreakEngineTests: XCTestCase {
    func test_length_todayPresentCountsTowardStreak() {
        let dates: Set<String> = ["2026-07-03", "2026-07-04"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-07-04"), 2)
    }

    func test_length_todayAbsentButYesterdayPresentStartsFromYesterday() {
        let dates: Set<String> = ["2026-07-02", "2026-07-03"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-07-04"), 2)
    }

    func test_length_neitherTodayNorYesterdayIsZero() {
        let dates: Set<String> = ["2026-07-01"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-07-04"), 0)
    }

    func test_length_emptySetIsZero() {
        XCTAssertEqual(StreakEngine.length(dates: [], today: "2026-07-04"), 0)
    }

    func test_length_gapInMiddleResetsToRunEndingToday() {
        // 07-01 is disconnected from the run ending today - only 07-03/07-04 count.
        let dates: Set<String> = ["2026-07-01", "2026-07-03", "2026-07-04"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-07-04"), 2)
    }

    func test_length_monthBoundaryCountsAcrossMonths() {
        let dates: Set<String> = ["2026-06-30", "2026-07-01", "2026-07-02"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-07-02"), 3)
    }

    func test_length_yearBoundaryCountsAcrossYears() {
        let dates: Set<String> = ["2025-12-31", "2026-01-01"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-01-01"), 2)
    }

    // Clocks jump forward 2026-10-04 (AU). Walking back from the 5th with a
    // fixed 24h instead of a calendar day lands on the 3rd, skipping the 4th,
    // and the streak reads 1. Only the spring-forward direction can catch that
    // - falling back lands on the same date either way, so there is no April
    // twin of this test on purpose. Bites only when the machine runs an AU
    // zone: ReviewEngine's formatter uses .current, so under UTC there is no
    // transition here to trip over.
    func test_length_doesNotSkipTheDayClocksJumpForward() {
        let dates: Set<String> = ["2026-10-03", "2026-10-04", "2026-10-05"]
        XCTAssertEqual(StreakEngine.length(dates: dates, today: "2026-10-05"), 3)
    }
}
