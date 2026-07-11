// Pure snapshot of everything a badge threshold checks, computed once per
// finishRun and diffed against already-earned badges. No I/O in this file -
// GameStore.badgeStats builds the snapshot from the database.
struct BadgeStats: Equatable {
    var finishedRuns: Int
    var victories: Int
    var bossBeaten: String?     // the biome of the boss beaten by THIS finishing run, if any
    var lifetimeHits: Int
    var masteredCount: Int
    var deckSize: Int
    var streak: Int
    var walletEverReached: Int
}

enum BadgeEngine {
    static let all: [String] = [
        "first-run", "first-victory",
        "boss-tower", "boss-forest", "boss-desert",
        "hits-50", "hits-250",
        "mastered-5", "mastered-15",
        "deck-25", "deck-50",
        "streak-3", "streak-7", "streak-14", "streak-30",
        "rich-100",
    ]

    // Every id the stats currently justify, not just newly earned ones -
    // GameStore subtracts the already-earned set to find what's new.
    static func eligible(_ s: BadgeStats) -> Set<String> {
        var earned: Set<String> = []
        if s.finishedRuns >= 1 { earned.insert("first-run") }
        if s.victories >= 1 { earned.insert("first-victory") }
        if s.bossBeaten == "tower" { earned.insert("boss-tower") }
        if s.bossBeaten == "forest" { earned.insert("boss-forest") }
        if s.bossBeaten == "desert" { earned.insert("boss-desert") }
        if s.lifetimeHits >= 50 { earned.insert("hits-50") }
        if s.lifetimeHits >= 250 { earned.insert("hits-250") }
        if s.masteredCount >= 5 { earned.insert("mastered-5") }
        if s.masteredCount >= 15 { earned.insert("mastered-15") }
        if s.deckSize >= 25 { earned.insert("deck-25") }
        if s.deckSize >= 50 { earned.insert("deck-50") }
        if s.streak >= 3 { earned.insert("streak-3") }
        if s.streak >= 7 { earned.insert("streak-7") }
        if s.streak >= 14 { earned.insert("streak-14") }
        if s.streak >= 30 { earned.insert("streak-30") }
        if s.walletEverReached >= 100 { earned.insert("rich-100") }
        return earned
    }
}
