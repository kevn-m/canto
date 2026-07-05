import XCTest
@testable import Canto

// No network calls here: parseTranslation is a pure function, and the
// disabled-init case only needs a bundle with no secrets.json.
final class OnlineTranslatorTests: XCTestCase {
    func test_parseTranslation_success() {
        let json = #"{"data":{"translations":[{"translatedText":"驚"}]}}"#
        let data = Data(json.utf8)
        XCTAssertEqual(OnlineTranslator.parseTranslation(data), "驚")
    }

    func test_parseTranslation_emptyText_returnsNil() {
        let json = #"{"data":{"translations":[{"translatedText":""}]}}"#
        let data = Data(json.utf8)
        XCTAssertNil(OnlineTranslator.parseTranslation(data))
    }

    func test_parseTranslation_garbage_returnsNil() {
        let data = Data("not json".utf8)
        XCTAssertNil(OnlineTranslator.parseTranslation(data))
    }

    // A padded response must still match a dictionary row exactly, so the
    // trailing newline/spaces are stripped rather than breaking the WHERE match.
    func test_parseTranslation_trimsSurroundingWhitespace() {
        let json = "{\"data\":{\"translations\":[{\"translatedText\":\"  \u{9A5A}\\n\"}]}}"
        let data = Data(json.utf8)
        XCTAssertEqual(OnlineTranslator.parseTranslation(data), "\u{9A5A}")
    }

    func test_disabled_whenBundleHasNoSecrets() {
        // The test bundle has no secrets.json - a fresh clone's real-world state.
        let translator = OnlineTranslator(bundle: Bundle(for: OnlineTranslatorTests.self))
        XCTAssertFalse(translator.isEnabled)
    }
}
