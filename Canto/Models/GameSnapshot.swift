import Foundation

// Game snapshot (ADR 0020): the whole game state travels off-device as JSON —
// history, Deck, boxes, wallet, badges, gear, finished runs, shop, equipped
// state. The durability plan while there's no cloud sync; TestFlight's 90-day
// builds make wallet loss real. Pure and Codable so it's testable without the
// stores.
//
// Rules baked into the payload:
// - Card ids are not portable (AUTOINCREMENT): reviews reference cards by
//   (traditional, jyutping) and import remaps to fresh ids.
// - Only finished runs travel: an unfinished run's state_json holds card ids
//   that die in the remap.
// - No photos: imported cards get NULL and fall back to the character glyph.
// - meta carries equipped_*/avatar_id/family_rewards_enabled; the
//   last_imported_lookup_id checkpoint is recomputed at import, never carried.
enum GameSnapshot {
    static let currentVersion = 1

    enum SnapshotError: Error, LocalizedError {
        case newerVersion(Int)
        case unreadable

        var errorDescription: String? {
            switch self {
            case .newerVersion: return "This snapshot is from a newer version of JyutKeep."
            case .unreadable: return "This file isn't a JyutKeep snapshot."
            }
        }
    }

    struct Lookup: Codable {
        let heardText: String
        let matched: Bool
        let chosenSenseId: Int64?
        let chosenTraditional: String?
        let chosenJyutping: String?
        let viaVoice: Bool
        let createdAt: String

        init(_ record: LookupRecord) {
            heardText = record.heardText
            matched = record.matched
            chosenSenseId = record.chosenSenseId
            chosenTraditional = record.chosenTraditional
            chosenJyutping = record.chosenJyutping
            viaVoice = record.viaVoice
            createdAt = record.createdAt
        }
    }

    struct Card: Codable {
        let traditional: String
        let jyutping: String
        let english: String
        let benched: Bool
        let createdAt: String
        let box: Int
        let dueOn: String
    }

    struct LedgerEntry: Codable {
        let amount: Int
        let reason: String
        let createdAt: String
    }

    struct Review: Codable {
        let traditional: String
        let jyutping: String
        let result: String
        let reviewedAt: String
    }

    struct Run: Codable {
        let runDate: String
        let stateJson: String
        let finished: Bool
    }

    struct ShopItem: Codable {
        let name: String
        let price: Int
        let archived: Bool
    }

    struct Badge: Codable {
        let badgeId: String
        let earnedAt: String
    }

    struct GearItem: Codable {
        let gearId: String
        let acquiredAt: String
    }

    // The game.sqlite side of a payload, so GameStore can hand its rows over
    // without knowing about lookups (log.sqlite's half).
    struct GameRows {
        let cards: [Card]
        let ledger: [LedgerEntry]
        let reviews: [Review]
        let runs: [Run]
        let shopItems: [ShopItem]
        let badges: [Badge]
        let gear: [GearItem]
        let meta: [String: String]
    }

    struct Payload: Codable {
        let version: Int
        let exportedOn: String
        let lookups: [Lookup]
        let cards: [Card]
        let ledger: [LedgerEntry]
        let reviews: [Review]
        let runs: [Run]
        let shopItems: [ShopItem]
        let badges: [Badge]
        let gear: [GearItem]
        let meta: [String: String]
    }

    static func json(game: GameRows, lookups: [Lookup], date: String) -> Data {
        let payload = Payload(
            version: currentVersion, exportedOn: date, lookups: lookups,
            cards: game.cards, ledger: game.ledger, reviews: game.reviews,
            runs: game.runs.filter(\.finished), shopItems: game.shopItems,
            badges: game.badges, gear: game.gear, meta: game.meta
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return (try? encoder.encode(payload)) ?? Data()
    }

    // A newer snapshot's fields may not decode as today's Payload, so the
    // version is probed alone first — "newer version" must beat "unreadable".
    private struct VersionProbe: Codable { let version: Int }

    static func decode(_ data: Data) throws -> Payload {
        guard let probe = try? JSONDecoder().decode(VersionProbe.self, from: data) else {
            throw SnapshotError.unreadable
        }
        guard probe.version <= currentVersion else {
            throw SnapshotError.newerVersion(probe.version)
        }
        guard let payload = try? JSONDecoder().decode(Payload.self, from: data) else {
            throw SnapshotError.unreadable
        }
        return payload
    }
}
