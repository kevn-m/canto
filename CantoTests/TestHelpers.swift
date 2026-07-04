import XCTest
@testable import Canto

// Shared between GameStoreTests and BattleEngineTests: a lookup the player
// chose a Sense for, the shape syncDeck imports into a Card.
extension XCTestCase {
    @discardableResult
    func makeChosenLookup(_ log: LogStore, heard: String, traditional: String, jyutping: String, senseId: Int64 = 1) -> Int64 {
        let id = log.record(heard: heard, matched: true, viaVoice: false)!
        let sense = Sense(row: [
            "id": senseId, "traditional": traditional, "simplified": nil, "jyutping": jyutping,
            "pinyin": nil, "gloss": "gloss", "source": 0, "popularity": 1,
        ])
        log.setChosenSense(lookupId: id, sense: sense)
        return id
    }
}
