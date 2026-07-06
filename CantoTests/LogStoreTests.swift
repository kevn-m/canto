import XCTest
@testable import Canto

final class LogStoreTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("LogStoreTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    func test_record_insertsRowWithExpectedFields() {
        let store = LogStore(directory: tempDir)
        let id = store.record(heard: "dog", matched: true, viaVoice: true)
        XCTAssertNotNil(id)

        let rows = store.recentLookups()
        XCTAssertEqual(rows.count, 1)
        let row = rows[0]
        XCTAssertEqual(row.heardText, "dog")
        XCTAssertTrue(row.matched)
        XCTAssertTrue(row.viaVoice)
        XCTAssertFalse(row.createdAt.isEmpty)
    }

    func test_recordMiss_hasMatchedFalse() {
        let store = LogStore(directory: tempDir)
        store.record(heard: "nappy", matched: false, viaVoice: false)

        let rows = store.recentLookups()
        XCTAssertEqual(rows.count, 1)
        XCTAssertFalse(rows[0].matched)
    }

    // The chosen sense's text is stored alongside its id: senses.id is just
    // build order in build_dict.py, so a dictionary rebuild remaps ids and
    // the characters/jyutping are what the future flashcard seed reads.
    func test_setChosenSense_updatesOnlyTargetRowAndStoresText() {
        let store = LogStore(directory: tempDir)
        let firstId = store.record(heard: "eat", matched: true, viaVoice: false)
        let secondId = store.record(heard: "dog", matched: true, viaVoice: false)
        XCTAssertNotNil(firstId)
        XCTAssertNotNil(secondId)

        let sense = Sense(row: [
            "id": 42, "traditional": "狗", "simplified": nil, "jyutping": "gau2",
            "pinyin": nil, "gloss": "dog", "source": 0, "popularity": 5,
        ])
        XCTAssertTrue(store.setChosenSense(lookupId: secondId!, sense: sense))

        let rows = store.recentLookups()
        let first = rows.first { $0.id == firstId }
        let second = rows.first { $0.id == secondId }
        XCTAssertNil(first?.chosenSenseId)
        XCTAssertEqual(second?.chosenSenseId, 42)
        XCTAssertEqual(second?.chosenTraditional, "狗")
        XCTAssertEqual(second?.chosenJyutping, "gau2")
    }

    // A custom Keep (unmapped Pick) records the picked reading with no
    // chosen_sense_id - lookupsWithChosenSense must still pick it up since it
    // filters on chosen_traditional, not chosen_sense_id.
    func test_setChosenCustom_updatesRowWithNilSenseId() {
        let store = LogStore(directory: tempDir)
        let id = store.record(heard: "unmapped word", matched: true, viaVoice: false)
        XCTAssertNotNil(id)

        store.setChosenCustom(lookupId: id!, traditional: "冇譜", jyutping: "mou5 pou2")

        let rows = store.lookupsWithChosenSense(afterId: 0)
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0].chosenTraditional, "冇譜")
        XCTAssertEqual(rows[0].chosenJyutping, "mou5 pou2")
        XCTAssertNil(rows[0].chosenSenseId)
    }

    // Listening to a sense must never record it: recording only happens on
    // an explicit Keep (see LookupView.listen(to:) vs keep(_:)).
    func test_recordWithoutSetChosenSense_hasNoChosenSense() {
        let store = LogStore(directory: tempDir)
        let id = store.record(heard: "eat", matched: true, viaVoice: false)
        XCTAssertNotNil(id)

        XCTAssertTrue(store.lookupsWithChosenSense(afterId: 0).isEmpty)
    }

    func test_recentLookups_returnsReverseChronologicalOrder() {
        let store = LogStore(directory: tempDir)
        let firstId = store.record(heard: "one", matched: true, viaVoice: false)
        let secondId = store.record(heard: "two", matched: true, viaVoice: false)
        let thirdId = store.record(heard: "three", matched: true, viaVoice: false)

        let rows = store.recentLookups()
        XCTAssertEqual(rows.map(\.id), [thirdId, secondId, firstId].compactMap { $0 })
    }

    func test_rowsPersistAcrossStoreInstances_atSamePath() {
        let firstStore = LogStore(directory: tempDir)
        firstStore.record(heard: "reopen me", matched: true, viaVoice: true)

        let secondStore = LogStore(directory: tempDir)
        let rows = secondStore.recentLookups()
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0].heardText, "reopen me")
    }

    // The green "Added" tick is gated on this return (LookupView.keep), so a
    // Keep whose write can't persist must report false, not a silent success.
    func test_setChosenOnUnwritablePath_returnsFalse() throws {
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)

        let store = LogStore(directory: tempDir)
        let sense = Sense(row: [
            "id": 1, "traditional": "狗", "simplified": nil, "jyutping": "gau2",
            "pinyin": nil, "gloss": "dog", "source": 0, "popularity": 1,
        ])
        XCTAssertFalse(store.setChosenSense(lookupId: 1, sense: sense))
        XCTAssertFalse(store.setChosenCustom(lookupId: 1, traditional: "冇譜", jyutping: "mou5 pou2"))
    }

    func test_clearHistory_deletesAllLookupsAndReturnsTrue() {
        let store = LogStore(directory: tempDir)
        store.record(heard: "eat", matched: true, viaVoice: false)
        store.record(heard: "dog", matched: true, viaVoice: false)

        XCTAssertTrue(store.clearHistory())

        XCTAssertTrue(store.recentLookups().isEmpty)
    }

    func test_clearHistoryOnUnwritablePath_returnsFalseWithoutCrashing() throws {
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)

        let store = LogStore(directory: tempDir)

        XCTAssertFalse(store.clearHistory())
    }

    func test_recordOnUnwritablePath_returnsNilWithoutCrashing() throws {
        // Point "directory" at a path that is actually a plain file, so
        // FileManager can't create a directory there and LogStore's open
        // fails. record() must degrade to nil, not crash the app.
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)

        let store = LogStore(directory: tempDir)
        let id = store.record(heard: "whatever", matched: true, viaVoice: false)
        XCTAssertNil(id)
        XCTAssertTrue(store.recentLookups().isEmpty)
    }
}
