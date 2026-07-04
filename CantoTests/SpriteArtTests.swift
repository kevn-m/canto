import XCTest
@testable import Canto

// These run against the real app bundle (TEST_HOST), so they catch a sprite
// that fell out of project.yml's resources, not just a bad name mapping.
final class SpriteArtTests: XCTestCase {
    func test_everyShippedSpriteLoadsFromTheBundle() {
        let names = [
            "bear", "coffee", "crocodile", "dolphin", "eating", "elephant",
            "giraffe", "lion", "monkey", "tiger",
            "enemy-slime", "enemy-bat", "boss-dragon",
            "player-kid", "player-dad",
        ]
        for name in names {
            XCTAssertNotNil(SpriteArt.image(named: name), "\(name).png missing from the app bundle")
        }
    }

    func test_cardImage_matchesTheEnglishWordCaseInsensitively() {
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "Bear"))
        XCTAssertNil(SpriteArt.cardImage(forEnglish: "xylophone"))
    }

    // The dictionary's word is "eat"; the sprite drawn for it is "eating".
    func test_cardImage_resolvesTheEatAlias() {
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "eat"))
    }

    func test_playerImage_mapsBothPlayers() {
        XCTAssertNotNil(SpriteArt.playerImage(for: .kid))
        XCTAssertNotNil(SpriteArt.playerImage(for: .dad))
    }

    func test_enemyImage_mapsFloorNamesToSpriteFiles() {
        XCTAssertNotNil(SpriteArt.enemyImage(for: "slime"))
        XCTAssertNotNil(SpriteArt.enemyImage(for: "bat"))
        XCTAssertNotNil(SpriteArt.enemyImage(for: "dragon"))
        XCTAssertNil(SpriteArt.enemyImage(for: "kraken"), "unknown enemies fall back to the SF Symbol")
    }
}
