import XCTest
@testable import Canto

final class BadgeEngineTests: XCTestCase {
    private func stats(
        finishedRuns: Int = 0, victories: Int = 0, bossBeaten: String? = nil,
        lifetimeHits: Int = 0, masteredCount: Int = 0, deckSize: Int = 0,
        streak: Int = 0, walletEverReached: Int = 0
    ) -> BadgeStats {
        BadgeStats(
            finishedRuns: finishedRuns, victories: victories, bossBeaten: bossBeaten,
            lifetimeHits: lifetimeHits, masteredCount: masteredCount, deckSize: deckSize,
            streak: streak, walletEverReached: walletEverReached
        )
    }

    func test_eligible_emptyStatsEarnsNothing() {
        XCTAssertTrue(BadgeEngine.eligible(stats()).isEmpty)
    }

    func test_eligible_firstRunAtOneFinishedRun() {
        XCTAssertEqual(BadgeEngine.eligible(stats(finishedRuns: 1)), ["first-run"])
    }

    func test_eligible_firstVictoryAtOneVictory() {
        XCTAssertEqual(BadgeEngine.eligible(stats(victories: 1)), ["first-victory"])
    }

    func test_eligible_bossBadgesKeyOffBiomeName() {
        XCTAssertEqual(BadgeEngine.eligible(stats(bossBeaten: "tower")), ["boss-tower"])
        XCTAssertEqual(BadgeEngine.eligible(stats(bossBeaten: "forest")), ["boss-forest"])
        XCTAssertEqual(BadgeEngine.eligible(stats(bossBeaten: "desert")), ["boss-desert"])
        XCTAssertTrue(BadgeEngine.eligible(stats(bossBeaten: nil)).isEmpty)
    }

    func test_eligible_hits49IsNoBadgeHits50Is() {
        XCTAssertTrue(BadgeEngine.eligible(stats(lifetimeHits: 49)).isEmpty)
        XCTAssertEqual(BadgeEngine.eligible(stats(lifetimeHits: 50)), ["hits-50"])
    }

    func test_eligible_hits250AlsoIncludesHits50() {
        XCTAssertEqual(BadgeEngine.eligible(stats(lifetimeHits: 250)), ["hits-50", "hits-250"])
    }

    func test_eligible_mastered5And15Thresholds() {
        XCTAssertTrue(BadgeEngine.eligible(stats(masteredCount: 4)).isEmpty)
        XCTAssertEqual(BadgeEngine.eligible(stats(masteredCount: 5)), ["mastered-5"])
        XCTAssertEqual(BadgeEngine.eligible(stats(masteredCount: 15)), ["mastered-5", "mastered-15"])
    }

    func test_eligible_deck25And50Thresholds() {
        XCTAssertTrue(BadgeEngine.eligible(stats(deckSize: 24)).isEmpty)
        XCTAssertEqual(BadgeEngine.eligible(stats(deckSize: 25)), ["deck-25"])
        XCTAssertEqual(BadgeEngine.eligible(stats(deckSize: 50)), ["deck-25", "deck-50"])
    }

    func test_eligible_streakLadderAccumulates() {
        XCTAssertTrue(BadgeEngine.eligible(stats(streak: 2)).isEmpty)
        XCTAssertEqual(BadgeEngine.eligible(stats(streak: 3)), ["streak-3"])
        XCTAssertEqual(BadgeEngine.eligible(stats(streak: 7)), ["streak-3", "streak-7"])
        XCTAssertEqual(BadgeEngine.eligible(stats(streak: 14)), ["streak-3", "streak-7", "streak-14"])
        XCTAssertEqual(BadgeEngine.eligible(stats(streak: 30)), ["streak-3", "streak-7", "streak-14", "streak-30"])
    }

    func test_eligible_rich100UsesTheGivenWalletEverReachedValue() {
        XCTAssertTrue(BadgeEngine.eligible(stats(walletEverReached: 99)).isEmpty)
        XCTAssertEqual(BadgeEngine.eligible(stats(walletEverReached: 100)), ["rich-100"])
    }

    func test_eligible_returnsAllSatisfiedIdsNotJustNewOnes() {
        let s = stats(finishedRuns: 3, victories: 2, lifetimeHits: 300, masteredCount: 20, deckSize: 60, streak: 30, walletEverReached: 150)
        let eligible = BadgeEngine.eligible(s)
        XCTAssertEqual(eligible, [
            "first-run", "first-victory", "hits-50", "hits-250", "mastered-5", "mastered-15",
            "deck-25", "deck-50", "streak-3", "streak-7", "streak-14", "streak-30", "rich-100",
        ])
    }

    func test_all_containsEveryCatalogueId() {
        XCTAssertEqual(Set(BadgeEngine.all).count, BadgeEngine.all.count, "no duplicate ids")
        XCTAssertEqual(Set(BadgeEngine.all), [
            "first-run", "first-victory", "boss-tower", "boss-forest", "boss-desert",
            "hits-50", "hits-250", "mastered-5", "mastered-15", "deck-25", "deck-50",
            "streak-3", "streak-7", "streak-14", "streak-30", "rich-100",
        ])
    }

    // Ties `all` to what eligible() can actually award, so adding a badge to one
    // and forgetting the other fails here. Comparing `all` to a hand-typed list
    // (above) can't do that - the same slip fools both lists. Slice 6's sprite
    // test iterates `all`, so a drifted id ships a badge with no art.
    func test_all_listsEveryIdEligibleCanAward() {
        let maxed = stats(
            finishedRuns: .max, victories: .max, lifetimeHits: .max,
            masteredCount: .max, deckSize: .max, streak: .max, walletEverReached: .max
        )
        // One run beats at most one boss, so no single stats value yields all three.
        let awardable = ["tower", "forest", "desert"].reduce(into: BadgeEngine.eligible(maxed)) { ids, biome in
            ids.formUnion(BadgeEngine.eligible(stats(bossBeaten: biome)))
        }
        XCTAssertEqual(awardable, Set(BadgeEngine.all))
    }
}
