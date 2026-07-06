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
            "enemy-mushroom", "enemy-snail", "boss-wolf",
            "enemy-cactus", "enemy-scorpion", "boss-mummy",
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

    // Every enemy any biome can put on a floor must resolve to a sprite -
    // this is what keeps a new biome from shipping with a missing PNG.
    func test_enemyImage_mapsEveryBiomeEnemyToASprite() {
        for biome in Biome.allCases {
            for enemy in biome.fightEnemies + [biome.bossEnemy] {
                XCTAssertNotNil(SpriteArt.enemyImage(for: enemy), "\(enemy) has no sprite")
            }
        }
        XCTAssertNil(SpriteArt.enemyImage(for: "kraken"), "unknown enemies fall back to the SF Symbol")
    }
}
