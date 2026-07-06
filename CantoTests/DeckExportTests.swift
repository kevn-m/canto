import XCTest
@testable import Canto

final class DeckExportTests: XCTestCase {
    private func makeEntry(
        traditional: String = "食", jyutping: String = "sik6", english: String = "eat",
        benched: Bool = false, box: Int = 1
    ) -> DeckEntry {
        DeckEntry(
            id: 1, traditional: traditional, jyutping: jyutping, english: english, photoFilename: nil,
            benched: benched, box: box, dueOn: "2026-07-04"
        )
    }

    func test_json_encodesEntryFieldsBalanceAndDate() throws {
        let data = DeckExport.json(entries: [makeEntry()], balance: 15, date: "2026-07-05")

        let decoded = try JSONDecoder().decode(DeckExport.Payload.self, from: data)

        XCTAssertEqual(decoded.balance, 15)
        XCTAssertEqual(decoded.exportedOn, "2026-07-05")
        XCTAssertEqual(decoded.cards.count, 1)
        let card = try XCTUnwrap(decoded.cards.first)
        XCTAssertEqual(card.english, "eat")
        XCTAssertEqual(card.traditional, "食")
        XCTAssertEqual(card.jyutping, "sik6")
        XCTAssertFalse(card.benched)
        XCTAssertEqual(card.box, 1)
    }

    func test_json_emptyDeckStillEncodesBalanceAndDate() throws {
        let data = DeckExport.json(entries: [], balance: 0, date: "2026-07-05")

        let decoded = try JSONDecoder().decode(DeckExport.Payload.self, from: data)

        XCTAssertTrue(decoded.cards.isEmpty)
        XCTAssertEqual(decoded.balance, 0)
        XCTAssertEqual(decoded.exportedOn, "2026-07-05")
    }

    func test_json_carriesBenchedFlag() throws {
        let data = DeckExport.json(entries: [makeEntry(benched: true)], balance: 0, date: "2026-07-05")

        let decoded = try JSONDecoder().decode(DeckExport.Payload.self, from: data)

        XCTAssertTrue(try XCTUnwrap(decoded.cards.first).benched)
    }
}
