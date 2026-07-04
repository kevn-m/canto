// Every tunable game-balance number, in one place, so play-testing tunes
// numbers without touching ReviewEngine or the battle rules.
enum Balance {
    static let deckUnlockSize = 15
    static let damageByBox = [3, 3, 2, 1]     // New, Learning, Solid, Mastered
    static let enemyAttack = 1
    static let partyHP = 5
    static let fightHP = 7                     // ~3 cards to clear
    static let bossHP = 12                     // ~5 cards
    static let maxExtensions = 3               // door offers per Run
    static let runFinishPay = 10
    static let bossBonusPay = 5
    static let extensionPay = 2
}
