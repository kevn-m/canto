import Foundation

// Codable snapshot of an in-progress Run, saved to runs.state_json after
// every review so a killed app resumes mid-fight (see GameStore.saveRun).
struct RunState: Codable, Equatable {
    var floors: [Floor]
    var floorIndex: Int
    var enemyHP: Int
    var partyHP: Int                     // shared; Run fails at 0
    var turn: Player                     // alternates every card played
    var dealt: [String: [Int64]]         // Player.rawValue -> card ids already dealt this Run
    var kidDamageDealt: Int              // display only
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
}
