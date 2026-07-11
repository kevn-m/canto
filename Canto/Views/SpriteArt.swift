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
        // Slices 24-45 (batch 1 fan-out).
        "academy": "school", "airfield": "airport", "atlas": "book", "baggage": "luggage",
        "bailiff": "police", "bass": "guitar", "bedspread": "blanket", "boa": "snake",
        "boar": "pig", "boil": "pot", "bonfire": "fire", "bookshop": "bookstore",
        "bowls": "bowl", "bunk": "bed", "buttermilk": "milk", "cameraman": "photographer",
        "campfire": "fire", "canine": "dog", "catalog": "magazine", "cent": "money",
        "chopstick": "chopsticks", "chowder": "soup", "coliseum": "stadium",
        "colonel": "soldier", "constable": "police", "cot": "cradle", "counter": "table",
        "cub": "bear", "custodian": "janitor", "dairy": "milk", "daylight": "sun",
        "duchess": "princess", "duckling": "duck", "dump": "garbage", "elixir": "potion",
        "elm": "tree", "email": "envelope", "feast": "buffet", "fleece": "sweater",
        "granddaughter": "girl", "granny": "grandmother", "grapevine": "grape",
        "grocery": "shop", "hacksaw": "saw", "hairbrush": "brush", "handbook": "book",
        "hedge": "bush", "hillside": "hill", "hound": "dog", "infirmary": "hospital",
        "instructor": "professor", "kelp": "seaweed", "knapsack": "backpack", "lad": "boy",
        "lagoon": "lake", "latrine": "toilet", "leader": "king", "litter": "garbage",
        "locomotive": "train", "loudspeaker": "speaker", "lumber": "firewood", "madam": "woman",
        "maiden": "girl", "mamma": "mother", "mare": "horse", "marine": "soldier",
        "medic": "doctor", "mocha": "cappuccino", "molar": "teeth", "motorbike": "motorcycle",
        "motorcar": "car", "mozzarella": "cheese", "navy": "sailor", "newborn": "baby",
        "niece": "girl", "outfit": "clothes", "padlock": "lock", "parmesan": "cheese",
        "pastor": "priest", "pebble": "rock", "pendant": "necklace", "piggy": "pig",
        "plaza": "town", "policewoman": "police", "ponytail": "hair", "pouch": "bag",
        "poultry": "chicken", "prosecutor": "lawyer", "psychiatrist": "doctor",
        "radiator": "heater", "rainfall": "rain", "rainstorm": "rain", "ram": "sheep",
        "resort": "hotel", "revolver": "gun", "ridge": "hill", "roosters": "chicken",
        "rubble": "rock", "sailing": "boat", "sat": "sit", "satchel": "backpack",
        "shingle": "brick", "shipment": "box", "sitting": "sit", "smock": "apron",
        "snack": "food", "spectacles": "eyeglasses", "stallion": "horse",
        "stockings": "stocking", "storeroom": "room", "sunlight": "sun", "sunny": "sun",
        "tablespoon": "spoon", "teacup": "cup", "tee": "shirt", "teenager": "kid",
        "terrier": "dog", "trashcan": "trash", "troop": "soldier", "trouser": "pants",
        "twin": "twins", "urn": "vase", "viper": "snake", "warrior": "soldier",
        "washroom": "toilet", "weep": "cry", "wristwatch": "watch",
        // Slices 46-67 (batch 2 fan-out).
        "airliner": "plane", "almanac": "book", "apparel": "clothes", "arachnid": "spider",
        "archbishop": "bishop", "attire": "clothes", "auto": "car", "backdoor": "door",
        "banquet": "buffet", "bathing": "bath", "bedclothes": "blanket", "bedding": "blanket",
        "blaze": "fire", "booklet": "book", "boysenberry": "blackberry", "bridegroom": "groom",
        "broiler": "chicken", "camping": "camp", "candlelight": "candlestick",
        "carport": "garage", "cellmate": "prisoner", "chancellor": "governor",
        "chaplain": "priest", "chew": "eating", "chiffon": "fabric", "chorus": "choir",
        "citadel": "fortress", "classes": "classroom", "classmate": "kid",
        "clergyman": "priest", "cleric": "priest", "clone": "twins", "codfish": "cod",
        "commode": "toilet", "composer": "musician", "conservatory": "greenhouse",
        "convict": "prisoner", "cookware": "pot", "corncob": "corn", "cutlery": "fork",
        "dame": "woman", "delivery": "courier", "dining": "table", "diving": "diver",
        "doggy": "dog", "drumming": "drummer", "drywall": "plywood", "duvet": "blanket",
        "earphone": "headphones", "eaten": "eating", "executive": "businessman", "fee": "money",
        "fettuccine": "noodle", "filet": "meat", "fir": "pine", "fishbowl": "aquarium",
        "flier": "pamphlet", "fugitive": "prisoner", "gentleman": "man", "geyser": "fountain",
        "granddad": "grandpa", "hairstylist": "barber", "hardcover": "book",
        "hardwood": "plywood", "honeybee": "bee", "honeycomb": "beehive", "horseback": "jockey",
        "hubby": "man", "inmate": "prisoner", "insulin": "vaccine",
        "intersection": "crossroads", "invitation": "card", "jailer": "warden", "junk": "trash",
        "lecturer": "professor", "lifesaver": "buoy", "literature": "book", "lodging": "hotel",
        "longboat": "boat", "mesh": "net", "mixer": "blender", "monsoon": "rain",
        "motorway": "street", "mountaintop": "hilltop", "pant": "pants", "paperback": "book",
        "pavilion": "gazebo", "payment": "money", "peso": "money", "pickax": "pickaxe",
        "potty": "toilet", "primate": "monkey", "proprietor": "businessman",
        "publication": "magazine", "publisher": "author", "puma": "cougar", "quartz": "crystal",
        "reader": "book", "reptile": "lizard", "rider": "jockey", "roadway": "street",
        "schoolboy": "boy", "schoolroom": "classroom", "scrub": "brush", "seaman": "sailor",
        "seaside": "sea", "seated": "sit", "shaman": "wizard", "sheepdog": "dog",
        "shilling": "money", "showroom": "shop", "shrubs": "bush", "sip": "drink",
        "skipping": "jump", "snoring": "sleep", "songbird": "bird", "soprano": "singer",
        "spoonful": "spoon", "sportsman": "athlete", "stag": "deer", "stepfather": "father",
        "stepmother": "mother", "steward": "waiter", "stitching": "sewing",
        "storehouse": "warehouse", "sultan": "king", "superintendent": "manager",
        "swimwear": "swimsuit", "tabletop": "table", "teaspoon": "spoon",
        "thunderbolt": "thunderstorm", "ticking": "clock", "toddler": "baby", "tomcat": "cat",
        "tote": "bag", "transceiver": "transmitter", "traps": "mousetrap",
        "traveler": "tourist", "treetop": "tree", "twister": "tornado", "usher": "attendant",
        "venison": "meat", "washtub": "tub", "wastepaper": "trash", "watchdog": "dog",
        "weeping": "cry", "workroom": "room", "wristband": "bracelet", "yen": "money",
        // Slices 68-89 (batch 3 fan-out).
        "acrobatics": "acrobat", "administrator": "manager", "adobe": "brick",
        "android": "robot", "angler": "fisherman", "backstairs": "staircase",
        "ballpoint": "pen", "birdie": "bird", "boating": "boat", "borough": "town",
        "brat": "kid", "bridle": "reins", "butane": "propane", "cabby": "cabbie",
        "carving": "sculpture", "chalet": "house", "checker": "checkers", "choker": "necklace",
        "chophouse": "steakhouse", "citrus": "orange", "commando": "soldier",
        "commodore": "admiral", "copybook": "notebook", "crayfish": "lobster",
        "crossroad": "crossroads", "cruiser": "battleship", "cuddle": "hugging",
        "cycling": "cyclist", "czar": "king", "decaf": "coffee", "diplomat": "businessman",
        "dipper": "constellation", "dishwashing": "detergent", "drainage": "drainpipe",
        "dripping": "raindrop", "duffel": "coat", "emporium": "shop", "enclosure": "corral",
        "farmyard": "farmhouse", "fawn": "deer", "felon": "prisoner", "fiancee": "bride",
        "fishhook": "hook", "flaming": "fire", "flattop": "battleship", "flatworm": "earthworm",
        "floodlight": "spotlight", "foal": "horse", "footrest": "footstool", "friar": "monk",
        "geezer": "grandpa", "glaze": "icing", "glowworm": "firefly", "gospel": "bible",
        "governess": "nanny", "grandstand": "stadium", "gull": "seagull", "hailstone": "hail",
        "headwear": "hat", "highland": "hill", "hitter": "batter", "hospice": "hospital",
        "icecap": "iceberg", "illustration": "picture", "infantry": "soldier", "isle": "island",
        "jailbird": "prisoner", "jujitsu": "karate", "jumper": "sweater",
        "kindergarten": "school", "knitted": "sweater", "labyrinth": "maze",
        "landline": "phone", "larva": "caterpillar", "leprechaun": "elf", "linseed": "sesame",
        "lioness": "lion", "loin": "sirloin", "luncheon": "buffet", "maize": "corn",
        "mariner": "sailor", "marionette": "puppet", "marksman": "soldier",
        "marsupial": "kangaroo", "mastiff": "dog", "memorial": "monument",
        "microprocessor": "microchip", "moan": "whimper", "mogul": "businessman",
        "mudslide": "avalanche", "newlyweds": "bride", "nighttime": "night",
        "novelist": "author", "ooze": "slime", "outpost": "watchtower", "overpass": "bridge",
        "paparazzi": "photographer", "papyrus": "scroll", "pastureland": "farmland",
        "plateau": "hilltop", "portal": "door", "portfolio": "briefcase", "protector": "guard",
        "pullover": "sweater", "pulpit": "podium", "punt": "boat", "relic": "monument",
        "retriever": "dog", "roadster": "convertible", "romaine": "lettuce", "rupee": "money",
        "sandbar": "island", "schoolchild": "kid", "scorecard": "card", "scripture": "bible",
        "sentry": "guard", "serviceman": "soldier", "shaver": "razor",
        "shipbuilding": "shipyard", "silencer": "muffler", "smog": "smoke", "sow": "pig",
        "spearmint": "mint", "spokesperson": "politician", "sprig": "twig", "spruce": "pine",
        "stoneware": "pottery", "sty": "corral", "tabernacle": "shrine", "textile": "fabric",
        "thundershower": "thunderstorm", "tidewater": "seashore", "tigress": "tiger",
        "topping": "frosting", "trader": "peddler", "transistor": "microchip",
        "tumbler": "glass", "underbrush": "bush", "vaccination": "vaccine",
        "videophone": "phone", "viewfinder": "camera", "walkway": "street", "warhorse": "horse",
        "warlock": "wizard", "whirlwind": "tornado", "whiteout": "blizzard",
        "woofer": "speaker", "workbook": "notebook", "zip": "zipper",
        // Slices 90-112 (batch 4 fan-out).
        "abode": "house", "adapter": "charger", "adventurer": "explorer",
        "advertisement": "billboard", "adviser": "manager", "aftershock": "earthquake",
        "amphibian": "frog", "antihistamine": "antibiotic", "astrophysicist": "astronomer",
        "attendee": "spectator", "autobiography": "book", "balm": "moisturizer",
        "baritone": "singer", "barrette": "hairpin", "biochemist": "chemist",
        "bricklaying": "bricklayer", "brickwork": "brick", "broadcasting": "broadcaster",
        "businessperson": "businessman", "calico": "cat", "cloudburst": "rain",
        "cobble": "cobblestone", "commoner": "villager", "councilor": "politician",
        "countryman": "villager", "crystallize": "crystal", "daredevil": "stuntman",
        "deacon": "priest", "diva": "singer", "doorpost": "door", "downpour": "rain",
        "draftsman": "architect", "droplet": "dewdrop", "duo": "twins", "earthling": "man",
        "edibles": "food", "effigy": "dummy", "eruption": "volcano", "evergreen": "pine",
        "fireside": "hearth", "foodstuff": "food", "fullback": "quarterback",
        "geneticist": "scientist", "glossary": "dictionary", "goddaughter": "girl",
        "goo": "slime", "greenback": "money", "gymnastic": "gymnast", "headman": "king",
        "healer": "doctor", "hostel": "hotel", "housetop": "rooftop",
        "incinerate": "incinerator", "incisor": "teeth", "incline": "ramp", "inferno": "fire",
        "jitterbug": "tango", "jurist": "lawyer", "leaflet": "flyer", "leafy": "leaf",
        "legislator": "politician", "masonry": "stonemason", "memoir": "book",
        "microbiologist": "biologist", "moneybags": "millionaire", "mongrel": "dog",
        "munch": "eating", "newsreader": "broadcaster", "nunnery": "convent",
        "octagonal": "octagon", "onlooker": "spectator", "overseer": "foreman", "panfry": "pan",
        "pastel": "crayon", "patriarch": "grandpa", "pedicurist": "beautician",
        "photojournalist": "photographer", "physiologist": "scientist", "plantain": "banana",
        "playwright": "author", "potluck": "buffet", "precipitation": "rain",
        "puffed": "popcorn", "puppetry": "puppet", "reformatory": "school",
        "researcher": "scientist", "reviewer": "critic", "sailcloth": "fabric",
        "sampler": "platter", "sanatorium": "hospital", "sanding": "sandpaper",
        "scribe": "author", "sculpt": "sculpture", "seacoast": "seashore", "seafarer": "sailor",
        "seller": "salesperson", "semiconductor": "microchip", "sentinel": "guard",
        "shale": "slate", "sharecropper": "farmer", "shareholder": "stockbroker",
        "shortening": "margarine", "sickbed": "bed", "siesta": "sleep", "sightseer": "tourist",
        "silversmith": "goldsmith", "slider": "turtle", "slither": "snake",
        "snicker": "giggling", "soloist": "musician", "sorceress": "wizard",
        "splatter": "splashing", "standup": "comedian", "statesman": "governor",
        "stepson": "boy", "storefront": "shop", "subcontractor": "contractor",
        "swatter": "flyswatter", "tailoring": "sewing", "taxman": "accountant",
        "theologian": "priest", "tiling": "tile", "townsman": "villager",
        "treasurer": "accountant", "tresses": "hair", "triangular": "triangle",
        "twitter": "bird", "tycoon": "businessman", "ventriloquism": "ventriloquist",
        "waterfowl": "duck", "womenfolk": "woman", "woodland": "rainforest",
        "wordsmith": "author", "wrangler": "cowboy",
        // Plain batch 01 (plain-01.tsv).
        "diner": "restaurant", "panties": "underwear", "tin": "can",
        // Plain batch 02 (plain-02.tsv).
        "aspirin": "pill", "diaper": "pampers",
        // Plain batch 03 (plain-03.tsv).
        "cashmere": "sweater", "satin": "silk",
        // Plain batch 04 (plain-04.tsv).
        "algae": "seaweed", "brassiere": "bra", "chemical": "chemicals", "cinder": "ashes",
        "hump": "camel", "petrol": "gasoline", "suds": "foam", "tarmac": "asphalt",
        "turf": "sod",
        // Plain batch 05 (plain-05.tsv).
        "antifreeze": "coolant", "caffeine": "coffee", "diesel": "gasoline", "glucose": "sugar",
        "lactose": "milk", "lambskin": "sheepskin", "seawater": "saltwater",
        // Plain batch 06 (plain-06.tsv).
        "brimstone": "sulfur", "brine": "saltwater", "cellulose": "fiber", "chloride": "salt",
        "curd": "tofu", "froth": "foam", "fructose": "sugar", "grime": "dirt", "muck": "mud",
        "muslin": "cloth", "rayon": "silk", "shellac": "lacquer", "teakwood": "board",
        // Plain batch 07 (plain-07.tsv).
        "carotene": "carrot", "caster": "sugar", "flavoring": "seasoning", "gluten": "dough",
        "leavening": "yeast", "marinade": "sauce", "methanol": "ethanol", "moleskin": "suede",
        "refrigerant": "coolant", "saccharin": "sweetener", "stratus": "cloud",
        "thickener": "cornstarch", "wadding": "cotton",
        // Flag batch 01 (flag-01.tsv).
        "ax": "axe", "booze": "alcohol", "bourbon": "alcohol", "brandy": "alcohol",
        "cider": "beer", "flood": "floodwater", "gin": "alcohol", "gunfire": "gun",
        "margarita": "cocktail", "martini": "cocktail", "pub": "bar", "rum": "alcohol",
        "sherry": "alcohol", "tequila": "alcohol", "tombstone": "tomb", "torpedo": "missile",
        "valium": "pill", "vodka": "alcohol", "weapon": "sword", "whiskey": "alcohol",
        "whisky": "alcohol",
        // Flag batch 02 (flag-02.tsv).
        "assassin": "thief", "bayonet": "dagger", "bazooka": "cannon", "bomber": "plane",
        "brewery": "beer", "burglar": "thief", "chardonnay": "wine", "cognac": "alcohol",
        "crypt": "tomb", "cyanide": "formaldehyde", "daggers": "dagger", "fighter": "soldier",
        "gladiator": "soldier", "gunman": "gun", "gunner": "gun", "hunting": "gun",
        "liqueur": "alcohol", "machete": "sword", "mercenary": "soldier", "meth": "cocaine",
        "mortuary": "tomb", "robber": "thief", "sharpshooter": "gun", "shooter": "gun",
        "smoker": "cigarette", "sniper": "gun", "stiletto": "dagger", "switchblade": "dagger",
        "swordsman": "soldier", "tranquilizer": "stimulant",
        // Flag batch 03 (flag-03.tsv).
        "absinthe": "alcohol", "attacker": "soldier", "barman": "bartender", "betting": "poker",
        "blackjack": "poker", "braided": "hair", "bullfighting": "matador", "cutter": "dagger",
        "dealer": "thief", "distillery": "alcohol", "explosive": "grenade", "gambler": "poker",
        "gangster": "thief", "gunboat": "boat", "hairdo": "hair", "laxative": "medication",
        "mead": "beer", "methadone": "stimulant", "nicotine": "cigarette", "offender": "thief",
        "ogre": "troll", "painkiller": "pill", "saber": "sword", "scythe": "sickle",
        "smuggler": "thief", "terrorist": "thief", "vermouth": "alcohol", "villain": "thief",
        "warhead": "missile", "warlord": "soldier", "winery": "wine",
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
