import Foundation

// Codable snapshot of an in-progress Run, saved to runs.state_json after
// every review so a killed app resumes mid-fight (see GameStore.saveRun).
struct RunState: Codable {
    var floors: [Floor]
    var floorIndex: Int
    var enemyHP: Int
    var partyHP: Int                     // shared; Run fails at 0
    var turn: Player                     // alternates every card played
    var dealt: [String: [Int64]]         // Player.rawValue -> card ids already dealt this Run
    var kidDamageDealt: Int              // display only
    var extensionsTaken: Int

    struct Floor: Codable {
        var kind: Kind                   // .fight, .boss, .extensionFight
        var enemyName: String            // keys the sprite asset, e.g. "slime"
        var maxHP: Int

        enum Kind: String, Codable {
            case fight, boss, extensionFight
        }
    }
}
