import SwiftUI

// Loads the bundled 64px chibi sprites (generated in art/reference-sheet,
// copied into Resources/Sprites). Card sprites are keyed by the card's
// English word; enemies by Floor.enemyName.
enum SpriteArt {
    // Sprite names that don't equal the word they illustrate: plurals, synonyms,
    // and words that resolve to an already-drawn concept (deduped at draw time).
    private static let cardAliases = [
        "alligator": "crocodile", "ape": "monkey", "automobile": "car", "baboon": "monkey",
        "barbecue": "grill", "bathroom": "toilet",
        "bedroom": "room", "blouse": "shirt", "bonnet": "hat", "boot": "shoe",
        "bulldog": "dog", "bunny": "rabbit", "cab": "car", "canoe": "boat", "cap": "hat",
        "cash": "money", "cathedral": "church", "cedar": "tree", "chamber": "room", "chapel": "church",
        "chariot": "car",
        "chick": "chicken", "cobra": "snake", "cock": "chicken", "comics": "book",
        "cop": "police", "cottage": "house", "crate": "box", "crib": "bed",
        "dad": "father", "dentist": "doctor", "dogs": "dog", "dollar": "money", "dragon": "boss-dragon",
        "eat": "eating", "eyeball": "eye", "eyes": "eye", "flea": "bug",
        "grandma": "grandmother", "granite": "rock", "grove": "tree", "handbag": "bag",
        "handgun": "gun", "hen": "chicken", "infant": "baby", "inn": "hotel",
        "jacket": "coat", "jeans": "pants", "jeep": "car", "jet": "plane",
        "kids": "kid", "kitten": "cat", "lemonade": "drink", "lieutenant": "police",
        "lunch": "food", "mama": "mother", "mansion": "house", "mattress": "bed",
        "mom": "mother", "mommy": "mother", "monastery": "church", "motel": "hotel", "mummy": "mother",
        "mustang": "horse", "nightgown": "pajamas",
        "nickel": "money", "oak": "tree", "officer": "police", "papa": "father",
        "physician": "doctor", "piglet": "pig", "plant": "tree", "policeman": "police",
        "pony": "horse", "poodle": "dog", "pork": "meat", "prison": "jail",
        "puppy": "dog", "purse": "bag", "python": "snake", "raincoat": "coat",
        "rattlesnake": "snake", "restroom": "toilet", "rooster": "chicken", "sack": "bag",
        "saloon": "car", "sergeant": "police", "shelter": "house", "sheriff": "police",
        "ship": "boat", "shotgun": "gun", "sidewalk": "street", "singing": "singer",
        "sister": "girl", "slipper": "shoe", "soda": "drink", "son": "boy",
        "sailboat": "boat", "snails": "snail", "steak": "meat", "streets": "street", "subway": "train", "sunrise": "sun",
        "surgeon": "doctor", "sweatshirt": "shirt", "tables": "table", "taxi": "car",
        "teacher": "professor", "telephone": "phone", "textbook": "book", "timer": "clock",
        "tooth": "teeth", "trout": "salmon", "trucks": "truck", "tuxedo": "suit",
        "university": "school", "veal": "meat", "wife": "woman",
        "woods": "tree", "yacht": "boat",
    ]

    static func cardImage(forEnglish english: String) -> UIImage? {
        let word = english.lowercased().trimmingCharacters(in: .whitespaces)
        return image(named: cardAliases[word] ?? word)
    }

    static func enemyImage(for enemyName: String) -> UIImage? {
        let isBoss = Biome.allCases.contains { $0.bossEnemy == enemyName }
        return image(named: isBoss ? "boss-\(enemyName)" : "enemy-\(enemyName)")
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
