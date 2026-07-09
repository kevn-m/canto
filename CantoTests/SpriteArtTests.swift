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
            // Sprite corpus slice 1 (ranks 1–50, deduped, can/office/body swapped
            // for camera/fire/ice).
            "man", "house", "car", "dog", "horse", "tree", "boat", "gun",
            "girl", "guy", "boy", "men", "mother", "father", "baby", "doctor",
            "police", "bed", "room", "face", "phone", "hair", "school", "sit",
            "door", "head", "book", "night", "honey", "blood", "drink", "money",
            "paper", "hotel", "eye", "table", "plane", "dress", "food", "bag",
            "suit", "neck", "clock", "rock", "watch", "box", "camera", "fire", "ice",
            // Sprite corpus slices 2-3 (gated: body-parts, abstracts, alcohol dropped).
            "smoke", "card", "cup", "town", "street", "kid", "window", "bird",
            "church", "rain", "teeth", "bridge", "ring", "pig", "woman", "wall",
            "hat", "professor", "train", "coat", "saw", "truck", "shirt", "cat",
            "clothes", "bottle", "rose", "pizza", "magazine", "island", "jail",
            "bell", "mouth", "sun", "pants", "milk", "heart", "meat", "hill",
            "glass", "shoe", "toilet", "chicken", "doll", "hospital", "toast",
            "apple", "sea", "map", "garage", "park", "snake", "cow", "airport",
            "lake", "bug", "lawyer",
            // Sprite corpus slices 4-20 (gated; weapons dropped).
            "mule", "pumpkin", "fridge", "bean", "flag", "helmet", "sailor", "pan",
            "bracelet", "garbage", "spoon", "palm", "ketchup", "balloon", "bee", "sock",
            "shovel", "nest", "flashlight", "spaghetti", "tomato", "robe", "refrigerator", "chocolate",
            "jar", "necklace", "jump", "wolf", "motorcycle", "hamburger", "tower", "oven",
            "bacon", "towel", "peanut", "umbrella", "chair", "ham", "envelope", "soup",
            "fence", "drum", "shark", "banana", "passport", "cheese", "clown", "guitar",
            "carpet", "wallet", "pot", "fan", "ambulance", "whale", "priest", "ladder",
            "mail", "plate", "popcorn", "bush", "gift", "spider", "sheep", "planet",
            "trash", "grandmother", "potato", "toad", "barrel", "fork", "lipstick", "dice",
            "goose", "strawberry", "leopard", "cowboy", "leaf", "luggage", "sweater", "cabinet",
            "bat", "cage", "star", "bread", "cake", "boots", "basketball", "sleep",
            "castle", "pen", "turtle", "candy", "rope", "mask", "picture", "bath",
            "piano", "rabbit", "salad", "hook", "tea", "wheel", "sandwich", "turkey",
            "nail", "baseball", "duck", "blanket", "diamond", "lemon", "bowl", "corn",
            "frog", "lock", "suitcase", "cave", "eagle", "pillow", "princess", "lamp",
            "badge", "soap", "soldier", "razor", "elk", "bathtub", "shorts", "mailbox",
            "owl", "peach", "bicycle", "butterfly", "grape", "violin", "lobster", "vase",
            "toothbrush", "tuna", "orange", "gorilla", "moose", "peanuts", "cracker", "brick",
            "olive", "deer", "queen", "trophy", "bride", "briefcase", "sausage", "wheelchair",
            "hose", "ginger", "skirt", "carrot", "sofa", "tractor", "camel", "garlic",
            "sushi", "locker", "drawers", "shrimp", "rocket", "doughnut", "wheat", "scissors",
            "pyramid", "squirrel", "freezer", "helicopter", "ant", "singer", "cockroach", "chain",
            "drums", "salmon", "palace", "camp", "toothpaste", "lighthouse", "marbles", "robot",
            "microscope", "lasagna", "muffin", "cola", "blueberry", "platter", "flute", "pancake",
            "grandpa", "cradle", "grapefruit", "cheesecake", "pineapple", "octopus", "skunk", "meatball",
            "cupcake", "dove", "notebook", "fern", "bible", "mustache", "photographer", "museum",
            "bagel", "backpack", "coyote", "postcard", "waiter", "lettuce", "meteor", "telescope",
            "sled", "chili", "pope", "cactus", "laptop", "submarine", "penguin",
            // Sprite corpus slices 15, 17-20 (gated; tomb/thief dropped).
            "tub", "tray", "pea", "warehouse", "toaster", "cherry", "fountain", "crystal",
            "shop", "bookstore", "biscuit", "stadium", "wig", "grill", "cheeseburger", "kite",
            "king", "scooter", "earring", "onion", "pasta", "twins", "net", "emerald",
            "panther", "typewriter", "thermometer", "chopsticks", "nut", "brush", "coconut", "shield",
            "loaf", "plum", "pajamas", "omelet", "throne", "speaker", "torch", "saxophone",
            "blender", "raven", "mango", "bakery", "cranberry", "pigeon", "screwdriver", "oyster",
            "cello", "fiddle", "ski", "goggles", "bin", "weasel", "classroom", "jaguar",
            "iceberg", "orchid", "farmer", "cloud", "lollipop", "apron", "bowling", "pirate",
            "bandage", "pelican", "stocking", "pepper", "softball", "raspberry", "fortress", "janitor",
            "watermelon", "harp", "zebra", "dragonfly", "circus", "keyboard", "zipper", "disc",
            "scorpion", "escalator", "calendar", "mackerel", "fisherman", "astronaut", "snail",
            // Sprite corpus slice 21 (gated; synonyms and shared concepts aliased).
            "broccoli", "kangaroo", "seagull", "sculpture", "fireman", "pier", "curry",
            "goldfish", "parachute", "popsicle", "rainbow", "lizard", "checkers", "beaver",
            "scanner", "hamster", "holly", "lever", "squash",
            // Sprite corpus slice 22 (gated; synonyms and shared concepts aliased).
            "mast", "stereo", "walrus", "cappuccino", "harmonica", "heater", "weeds",
            "rudder", "firewood", "pistachio", "clarinet", "rag", "puppet", "volcano",
            "dishwasher", "saucer", "mosquito", "fig", "jellyfish", "tennis", "seaweed",
            "carousel", "reef", "ink", "banjo",
            // Sprite corpus slice 23 (gated; alcohol/drug/profanity/anatomy rows dropped).
            "hippo", "vinegar", "dial", "spray", "feed", "fishing", "date", "snowball",
            "chimpanzee", "buffet", "cricket", "shampoo", "bouquet", "necktie", "ledge",
            "pick", "canteen", "caviar", "groom", "cuff", "fossil", "slug", "aquarium",
            "mistletoe", "propeller",
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

    // "eyes" was deduped into 眼's "eye" sprite at draw time; the alias keeps
    // an "eyes" card from showing a blank.
    func test_cardImage_resolvesTheEyesAlias() {
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "eyes"))
    }

    // Plurals/synonyms resolve to an already-drawn sprite instead of a blank.
    func test_cardImage_resolvesTheSliceAliases() {
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "ship"))   // -> boat
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "mom"))    // -> mother
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "cab"))    // -> car
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "taxi"))   // -> car (cab has no sprite of its own)
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "puppy"))  // -> dog
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "dragon")) // -> boss-dragon
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "rooster")) // -> chicken
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "nightgown")) // -> pajamas
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "trout")) // -> salmon
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "mommy")) // -> mother
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "chariot")) // -> car
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "barbecue")) // -> grill
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "snails")) // -> snail
        XCTAssertNotNil(SpriteArt.cardImage(forEnglish: "sailboat")) // -> boat
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
