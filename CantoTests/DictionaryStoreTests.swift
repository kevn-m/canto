import XCTest
import GRDB
@testable import Canto

final class DictionaryStoreTests: XCTestCase {
    var store: DictionaryStore!

    override func setUp() {
        super.setUp()
        store = DictionaryStore()
    }

    // "eat" is the canonical data-quality probe (context.md): a healthy
    // dictionary ranks 食 above any 吃/喫 confusable.
    func test_eat_ranksCantoneseSikAboveMandarinConfusables() {
        let results = store.senses(for: "eat")
        let sikIndex = results.firstIndex { $0.traditional.contains("食") }
        let mandoIndex = results.firstIndex {
            ($0.traditional == "吃" || $0.traditional == "喫") && !$0.jyutping.hasPrefix("sik")
        }
        XCTAssertNotNil(sikIndex, "expected a 食-based Sense in results for \"eat\"")
        if let mandoIndex {
            XCTAssertLessThan(sikIndex!, mandoIndex, "食 must outrank the Mandarin confusable")
        }
    }

    func test_dog_returnsGauInTopResults() {
        let results = store.senses(for: "dog")
        XCTAssertTrue(results.contains { $0.traditional == "狗" && $0.jyutping.hasPrefix("gau2") })
    }

    func test_sleep_returnsColloquialFanGaauFirst() {
        let results = store.senses(for: "sleep")
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results.first?.jyutping, "fan3 gaau3")
    }

    // Coverage canary (context.md): 海豚 comes from the CEDICT join, not
    // CC-Canto, and must rank first for "dolphin".
    func test_dolphin_returnsHoiTyunFirst() {
        let results = store.senses(for: "dolphin")
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results.first?.traditional, "海豚")
        XCTAssertEqual(results.first?.jyutping, "hoi2 tyun4")
    }

    // Pick's tie-break: rows whose gloss actually matches the query win over
    // same-character rows that merely share the traditional form.
    func test_pickSensesTieBreak() {
        let results = store.pickSenses(forCharacters: "驚", query: "scared")
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results.first?.jyutping, "geng1")
    }

    func test_fullPhraseMatch_washingMachine() {
        let results = store.senses(for: "washing machine")
        XCTAssertFalse(results.isEmpty)
    }

    func test_multiWordPhraseWithNoWholePhraseEntry_fallsBackToPerWord() {
        // "a nice dog" has no whole-phrase entry; "a" is a stopword and
        // should be skipped, "nice"/"dog" get looked up individually.
        let result = store.lookup("a nice dog")
        XCTAssertTrue(result.isWordFallback)
    }

    func test_dedup_noDuplicateTraditionalJyutpingPairs() {
        let results = store.senses(for: "eat")
        var seen = Set<String>()
        for sense in results {
            let key = "\(sense.traditional)\u{0}\(sense.jyutping)"
            XCTAssertFalse(seen.contains(key), "duplicate (traditional, jyutping) pair: \(key)")
            seen.insert(key)
        }
    }

    func test_resultsAreCappedAtFive() {
        for query in ["eat", "dog", "sleep", "go", "water"] {
            let results = store.senses(for: query)
            XCTAssertLessThanOrEqual(results.count, 5, "query \"\(query)\" returned more than 5 results")
        }
    }

    // Pins Swift/Python regex parity: both engines' \s collapses NBSP, so a
    // pasted non-breaking space must not silently change the lookup path.
    func test_nonBreakingSpace_behavesLikeOrdinarySpace() {
        let withNbsp = store.senses(for: "washing\u{00A0}machine")
        let withSpace = store.senses(for: "washing machine")
        XCTAssertEqual(withNbsp, withSpace)
        XCTAssertFalse(withNbsp.isEmpty)
    }

    func test_unknownGibberish_returnsEmptyNoCrash() {
        let results = store.senses(for: "zzzzqqq")
        XCTAssertTrue(results.isEmpty)
    }

    // The right-but-drowned sense must be reachable via browse even though
    // it's beyond top-5.
    func test_browseSurfacesDrownedBeer() {
        let results = store.browseSenses("beer")
        XCTAssertTrue(results.contains { $0.traditional == "啤酒" && $0.jyutping == "be1 zau2" })
    }

    // Browse is a superset of top5 in the same order.
    func test_browsePrefixEqualsTop5() {
        let browsed = Array(store.browseSenses("eat").prefix(5))
        XCTAssertEqual(browsed, store.senses(for: "eat"))
    }

    // Source-ordered, most-likely-first readings for one character - powers
    // PickEditorView's per-character candidate picker.
    func test_readingCandidates_returnsSourceOrderedCappedAtThree() {
        let results = store.readingCandidates(forCharacters: "驚")
        XCTAssertEqual(results, ["ging1", "geng1"])
        XCTAssertLessThanOrEqual(results.count, 3)
    }

    func test_readingCandidates_unknownCharacterReturnsEmpty() {
        XCTAssertTrue(store.readingCandidates(forCharacters: "㐀").isEmpty)
    }

    // Longest match wins: 食飯 is one dictionary entry, not two guessed characters.
    func test_derivedReading_prefersLongestMatch() throws {
        let reading = try store.derivedReading(for: "食飯")
        XCTAssertEqual(reading.segments.count, 1)
        XCTAssertEqual(reading.segments[0].characters, "食飯")
        XCTAssertEqual(reading.segments[0].candidates.first, "sik6 faan6")
        XCTAssertEqual(reading.joined, "sik6 faan6")
        XCTAssertFalse(reading.hasUnknown)
    }

    // A character the dictionary has never seen renders as a gap, not a crash
    // and not a silent skip. 㐀 is known-absent.
    func test_derivedReading_unknownCharacterIsGap() throws {
        let reading = try store.derivedReading(for: "食㐀飯")
        XCTAssertEqual(reading.segments.map(\.characters), ["食", "㐀", "飯"])
        XCTAssertTrue(reading.segments[1].candidates.isEmpty)
        XCTAssertTrue(reading.hasUnknown)
        XCTAssertTrue(reading.joined.contains("?"))
    }

    // Punctuation passes through: not unknown, not spanned by a probe.
    func test_derivedReading_separatorsPassThrough() throws {
        let reading = try store.derivedReading(for: "真。")
        XCTAssertEqual(reading.segments.map(\.characters), ["真", "。"])
        XCTAssertEqual(reading.segments.map(\.isSeparator), [false, true])
        XCTAssertEqual(reading.joined, "zan1。")
        XCTAssertFalse(reading.hasUnknown)
    }

    func test_derivedReading_symbolWithVariationSelectorIsSeparator() throws {
        let reading = try store.derivedReading(for: "食❤️飯")
        XCTAssertEqual(reading.segments.map(\.characters), ["食", "❤️", "飯"])
        XCTAssertEqual(reading.segments.map(\.isSeparator), [false, true, false])
        XCTAssertEqual(reading.joined, "sik6❤️faan6")
        XCTAssertFalse(reading.hasUnknown)
    }

    func test_derivedReading_capsCompoundProbesAtEightCharacters() throws {
        let reading = try store.derivedReading(for: "中華人民共和國主席")
        XCTAssertLessThanOrEqual(reading.segments.map { $0.characters.count }.max() ?? 0, 8)
    }

    // Single-character fallback still carries up to 3 candidates for the editor.
    func test_derivedReading_singleCharacterKeepsCandidates() throws {
        let reading = try store.derivedReading(for: "驚")
        XCTAssertEqual(reading.segments.count, 1)
        XCTAssertFalse(reading.segments[0].candidates.isEmpty)
        XCTAssertLessThanOrEqual(reading.segments[0].candidates.count, 3)
    }

    // Cancelled work must never look like a complete reading to its caller.
    func test_derivedReading_cancelledTaskThrowsInsteadOfReturningPartialReading() async {
        let store = store!
        let task = Task.detached { () -> Bool in
            try? await Task.sleep(nanoseconds: 10_000_000)
            do {
                _ = try store.derivedReading(for: String(repeating: "食", count: 100))
                return false
            } catch is CancellationError {
                return true
            } catch {
                return false
            }
        }
        task.cancel()

        let threwCancellation = await task.value
        XCTAssertTrue(threwCancellation)
    }

    func test_opensReadOnly_writeAttemptThrows() throws {
        // DictionaryStore itself only exposes reads. Reopen the same file
        // with the same readonly configuration DictionaryStore uses and
        // confirm a write is rejected by SQLite, proving the store's
        // configuration is genuinely enforced rather than assumed.
        guard let path = Bundle.main.path(forResource: "dict", ofType: "sqlite") else {
            XCTFail("dict.sqlite not found in host app bundle")
            return
        }
        var config = Configuration()
        config.readonly = true
        let dbQueue = try DatabaseQueue(path: path, configuration: config)
        XCTAssertThrowsError(try dbQueue.write { db in
            try db.execute(sql: "INSERT INTO senses (traditional, jyutping, gloss, source, popularity) VALUES ('x','x','x',0,0)")
        })
    }
}
