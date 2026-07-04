import Foundation

// Deck Export (ADR 0010): the deck travels off-device as JSON, since the app
// makes no network calls and the art pipeline can't read the phone. Also
// doubles as a manual backup. Pure so it's testable without GameStore.
enum DeckExport {
    struct Card: Codable {
        let english: String
        let traditional: String
        let jyutping: String
        let benched: Bool
        let dadBox: Int
        let kidBox: Int
    }

    struct Payload: Codable {
        let exportedOn: String
        let balance: Int
        let cards: [Card]
    }

    static func json(entries: [DeckEntry], balance: Int, date: String) -> Data {
        let payload = Payload(
            exportedOn: date,
            balance: balance,
            cards: entries.map { entry in
                Card(
                    english: entry.english, traditional: entry.traditional, jyutping: entry.jyutping,
                    benched: entry.benched, dadBox: entry.dadBox, kidBox: entry.kidBox
                )
            }
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return (try? encoder.encode(payload)) ?? Data()
    }
}
