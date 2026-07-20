import XCTest
@testable import Canto

final class DeckSearchTests: XCTestCase {
    private func entry(id: Int64 = 1, traditional: String, jyutping: String, english: String) -> DeckEntry {
        DeckEntry(
            id: id, traditional: traditional, jyutping: jyutping, english: english,
            photoFilename: nil, benched: false, box: 1, dueOn: "2026-07-20"
        )
    }

    private var deck: [DeckEntry] {
        [
            entry(id: 1, traditional: "食", jyutping: "sik6", english: "eat"),
            entry(id: 2, traditional: "飲", jyutping: "jam2", english: "drink"),
            entry(id: 3, traditional: "老虎", jyutping: "lou5 fu2", english: "tiger"),
        ]
    }

    func test_emptyOrWhitespaceQuery_returnsWholeDeck() {
        XCTAssertEqual(DeckSearch.filter(deck, query: "").map(\.id), [1, 2, 3])
        XCTAssertEqual(DeckSearch.filter(deck, query: "   ").map(\.id), [1, 2, 3])
    }

    // A learner searches in whichever form they remember - all three must hit.
    func test_matchesEnglishJyutpingAndCharacters() {
        XCTAssertEqual(DeckSearch.filter(deck, query: "eat").map(\.id), [1])
        XCTAssertEqual(DeckSearch.filter(deck, query: "jam").map(\.id), [2])
        XCTAssertEqual(DeckSearch.filter(deck, query: "虎").map(\.id), [3])
    }

    // The keyboard capitalises the first letter - that must not hide matches.
    func test_englishAndJyutpingMatchingIgnoresCase() {
        XCTAssertEqual(DeckSearch.filter(deck, query: "Tiger").map(\.id), [3])
        XCTAssertEqual(DeckSearch.filter(deck, query: "SIK").map(\.id), [1])
    }

    // "sik" must find sik6 without the tone number (the direction a learner
    // actually types), via plain prefix containment.
    func test_jyutpingMatchesWithoutToneNumber() {
        XCTAssertEqual(DeckSearch.filter(deck, query: "sik").map(\.id), [1])
    }

    func test_noMatchReturnsEmpty_notWholeDeck() {
        XCTAssertTrue(DeckSearch.filter(deck, query: "zebra").isEmpty)
    }
}
