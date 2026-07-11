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

    // Name and goal for the shelf's tap-to-inspect card. Solo players read
    // (ADR 0021), so a badge can finally say what it is.
    static func name(_ id: String) -> String {
        switch id {
        case "first-run": return "First Climb"
        case "first-victory": return "First Victory"
        case "boss-tower": return "Tower Boss"
        case "boss-forest": return "Forest Boss"
        case "boss-desert": return "Desert Boss"
        case "hits-50": return "50 Hits"
        case "hits-250": return "250 Hits"
        case "mastered-5": return "5 Mastered"
        case "mastered-15": return "15 Mastered"
        case "deck-25": return "25 Words"
        case "deck-50": return "50 Words"
        case "streak-3": return "3-Day Streak"
        case "streak-7": return "7-Day Streak"
        case "streak-14": return "14-Day Streak"
        case "streak-30": return "30-Day Streak"
        case "rich-100": return "Money Bags"
        default: return id
        }
    }

    static func goal(_ id: String) -> String {
        switch id {
        case "first-run": return "Finish your first climb"
        case "first-victory": return "Win a climb"
        case "boss-tower": return "Beat the tower boss"
        case "boss-forest": return "Beat the forest boss"
        case "boss-desert": return "Beat the desert boss"
        case "hits-50": return "Land 50 hits"
        case "hits-250": return "Land 250 hits"
        case "mastered-5": return "Master 5 words"
        case "mastered-15": return "Master 15 words"
        case "deck-25": return "Collect 25 words"
        case "deck-50": return "Collect 50 words"
        case "streak-3": return "Play 3 days in a row"
        case "streak-7": return "Play 7 days in a row"
        case "streak-14": return "Play 14 days in a row"
        case "streak-30": return "Play 30 days in a row"
        case "rich-100": return "Hold 100 CantoBux at once"
        default: return ""
        }
    }

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
