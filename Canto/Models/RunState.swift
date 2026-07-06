import Foundation

// Codable snapshot of an in-progress Run, saved to runs.state_json after
// every review so a killed app resumes mid-fight (see GameStore.saveRun).
struct RunState: Codable, Equatable {
    var floors: [Floor]
    var floorIndex: Int
    var enemyHP: Int
    var partyHP: Int                     // the hero's HP; Run fails at 0
    var dealt: [Int64]                   // card ids already dealt this Run
    var damageDealt: Int                 // display only
    var extensionsTaken: Int

    // A snapshot that would trap floors[floorIndex] must never host a fight;
    // GameStore.todaysRun rejects (and clears) rows that fail this.
    var isStructurallyValid: Bool {
        !floors.isEmpty && floors.indices.contains(floorIndex)
    }

    struct Floor: Codable, Equatable {
        var kind: Kind                   // .fight, .boss, .extensionFight
        var enemyName: String            // keys the sprite asset, e.g. "slime"
        var maxHP: Int

        enum Kind: String, Codable {
            case fight, boss, extensionFight
        }
    }

    struct PayoutBreakdown: Equatable {
        let finish: Int
        let bossBonus: Int
        let extensions: Int
        var total: Int { finish + bossBonus + extensions }
    }

    // Flat payout, deliberately not damage-based: pays for finishing the Run,
    // not for how well it went. Victory always follows a boss kill (the door
    // only appears after the boss dies), so bossBonus keys off partyHP alone.
    // An extension floor at index < floorIndex was already cleared to get
    // this far; the current floor only counts if it was won too.
    func payoutBreakdown() -> PayoutBreakdown {
        let victory = partyHP > 0
        let clearedExtensions = floors.enumerated().filter { index, floor in
            floor.kind == .extensionFight && (index < floorIndex || (victory && index == floorIndex))
        }.count
        return PayoutBreakdown(
            finish: Balance.runFinishPay,
            bossBonus: victory ? Balance.bossBonusPay : 0,
            extensions: clearedExtensions * Balance.extensionPay
        )
    }
}
