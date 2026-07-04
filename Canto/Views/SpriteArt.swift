import SwiftUI

// Loads the bundled 64px chibi sprites (generated in art/reference-sheet,
// copied into Resources/Sprites). Card sprites are keyed by the card's
// English word; enemies by Floor.enemyName.
enum SpriteArt {
    // Sprite names that don't equal the word they illustrate.
    private static let cardAliases = ["eat": "eating"]

    static func cardImage(forEnglish english: String) -> UIImage? {
        let word = english.lowercased().trimmingCharacters(in: .whitespaces)
        return image(named: cardAliases[word] ?? word)
    }

    static func enemyImage(for enemyName: String) -> UIImage? {
        image(named: enemyName == "dragon" ? "boss-dragon" : "enemy-\(enemyName)")
    }

    // Tries the bundle root and the Sprites subdirectory: XcodeGen flattens
    // resource groups today, but a folder reference would nest them.
    static func image(named name: String) -> UIImage? {
        let url = Bundle.main.url(forResource: name, withExtension: "png")
            ?? Bundle.main.url(forResource: name, withExtension: "png", subdirectory: "Sprites")
        guard let url else { return nil }
        return UIImage(contentsOfFile: url.path)
    }
}

// An enemy sprite scaled up with hard pixel edges, or the SF Symbol
// stand-in for any enemy that has no sprite yet.
struct EnemySpriteView: View {
    let enemyName: String
    var size: CGFloat = 96

    var body: some View {
        if let sprite = SpriteArt.enemyImage(for: enemyName) {
            Image(uiImage: sprite)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(width: size, height: size)
        } else {
            Image(systemName: fallbackSymbol)
                .font(.system(size: size * 0.7))
                .foregroundStyle(.red)
                .frame(width: size, height: size)
        }
    }

    private var fallbackSymbol: String {
        switch enemyName {
        case "slime": return "drop.fill"
        case "bat": return "bird.fill"
        case "dragon": return "flame.fill"
        default: return "ladybug.fill"
        }
    }
}
