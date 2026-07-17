import XCTest
import GRDB
@testable import Canto

// The starter pack's contract: every word is a real dictionary reading, has
// bundled art for its card front, and the pack is big enough to unlock the
// Tower on day one (ADR 0023).
final class StarterPackTests: XCTestCase {
    private static let dictQueue: DatabaseQueue = {
        guard let path = Bundle(for: StarterPackTests.self).path(forResource: "dict", ofType: "sqlite")
            ?? Bundle.main.path(forResource: "dict", ofType: "sqlite") else {
            fatalError("dict.sqlite not found in test bundle or host app bundle")
        }
        var config = Configuration()
        config.readonly = true
        return try! DatabaseQueue(path: path, configuration: config)
    }()

    func test_everyWordIsARealDictionaryReading() throws {
        for word in StarterPack.words {
            let count = try Self.dictQueue.read { db in
                try Int.fetchOne(
                    db,
                    sql: "SELECT COUNT(*) FROM senses WHERE traditional = ? AND jyutping = ?",
                    arguments: [word.traditional, word.jyutping]
                ) ?? 0
            }
            XCTAssertGreaterThan(
                count, 0,
                "\(word.english) → \(word.traditional) \(word.jyutping) is not a dictionary sense"
            )
        }
    }

    func test_everyWordHasACardSprite() {
        for word in StarterPack.words {
            XCTAssertNotNil(
                SpriteArt.cardImage(forEnglish: word.english),
                "\(word.english) has no bundled sprite"
            )
        }
    }

    func test_packIsBigEnoughToUnlockTheTower() {
        XCTAssertGreaterThanOrEqual(StarterPack.words.count, Balance.deckUnlockSize)
    }

    func test_noDuplicateReadings() {
        let pairs = StarterPack.words.map { "\($0.traditional)|\($0.jyutping)" }
        XCTAssertEqual(Set(pairs).count, pairs.count, "duplicate (traditional, jyutping) in the pack")
    }
}
