// Every tunable game-balance number, in one place, so play-testing tunes
// numbers without touching ReviewEngine or the battle rules.
enum Balance {
    static let deckUnlockSize = 15
    static let damageByBox = [2, 2, 3, 4]     // New, Learning, Solid, Mastered
    static let enemyAttack = 1
    static let partyHP = 5
    static let fightHP = 7                     // 4 cards fresh, 2 mastered
    static let bossHP = 12                     // 6 cards fresh, 3 mastered
    static let maxExtensions = 3               // door offers per Run
    static let runFinishPay = 10
    static let bossBonusPay = 5
    static let extensionPay = 2
    static let badgePay = 5
    static let gearPriceHat = 15        // first hat within ~2 finished runs
    static let gearPriceCompanion = 25  // companions aspirational
    static let gearPriceHelmet = 15
    static let gearPriceChest = 20
    static let gearPriceLeggings = 15
    static let gearPriceWeapon = 25
    static let gearPriceOffhand = 20
}
