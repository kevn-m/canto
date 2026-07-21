// Cosmetic only - never touches Balance's combat numbers. The gear table
// (schema v4) stores only what's owned/equipped; this catalogue is the
// fixed price/slot lookup for those ids.
enum GearSlot: String, CaseIterable {
    case helmet, chest, leggings, weapon, offhand, companion

    // Draw order on the Rig. The companion is NOT here - it renders beside the
    // avatar, not on it.
    static let zOrder: [GearSlot] = [.leggings, .chest, .weapon, .offhand, .helmet]
}

struct GearItem: Identifiable, Equatable {
    let id: String
    let slot: GearSlot
    let price: Int
}

// A named shelf in the Shop: hats, one section per armour outfit, pals.
struct GearSet: Identifiable {
    let id: String
    let name: String
    let items: [GearItem]
}

enum GearCatalog {
    static let sets: [GearSet] = [
        GearSet(id: "hats", name: "Hats", items: [
            GearItem(id: "hat-cap", slot: .helmet, price: Balance.gearPriceHat),
            GearItem(id: "hat-crown", slot: .helmet, price: Balance.gearPriceHat),
            GearItem(id: "hat-wizard", slot: .helmet, price: Balance.gearPriceHat),
        ]),
        armourSet(id: "knight", name: "Knight", weapon: "sword", offhand: "shield"),
        armourSet(id: "jade", name: "Jade", weapon: "sword", offhand: "disc"),
        armourSet(id: "mage", name: "Mage", weapon: "staff", offhand: "tome"),
        armourSet(id: "rogue", name: "Rogue", weapon: "dagger", offhand: "dagger"),
        armourSet(id: "paladin", name: "Paladin", weapon: "hammer", offhand: "shield"),
        armourSet(id: "warlock", name: "Warlock", weapon: "staff", offhand: "orb"),
        armourSet(id: "hunter", name: "Hunter", weapon: "bow", offhand: "quiver"),
        armourSet(id: "druid", name: "Druid", weapon: "staff", offhand: "blossom"),
        armourSet(id: "shaman", name: "Shaman", weapon: "axe", offhand: "totem"),
        armourSet(id: "frost", name: "Frost", weapon: "runeblade", offhand: "shield"),
        armourSet(id: "priest", name: "Priest", weapon: "staff", offhand: "lantern"),
        GearSet(id: "pals", name: "Pals", items: [
            GearItem(id: "pal-cat", slot: .companion, price: Balance.gearPriceCompanion),
            GearItem(id: "pal-dog", slot: .companion, price: Balance.gearPriceCompanion),
            GearItem(id: "pal-dragonling", slot: .companion, price: Balance.gearPriceCompanion),
        ]),
    ]

    static let all: [GearItem] = sets.flatMap(\.items)

    static func item(id: String) -> GearItem? {
        all.first { $0.id == id }
    }

    // Every armour outfit is the same five slots; only the weapon/offhand
    // sprite names vary (weap-knight-sword, off-mage-tome, ...).
    private static func armourSet(id: String, name: String, weapon: String, offhand: String) -> GearSet {
        GearSet(id: id, name: name, items: [
            GearItem(id: "helm-\(id)", slot: .helmet, price: Balance.gearPriceHelmet),
            GearItem(id: "chest-\(id)", slot: .chest, price: Balance.gearPriceChest),
            GearItem(id: "legs-\(id)", slot: .leggings, price: Balance.gearPriceLeggings),
            GearItem(id: "weap-\(id)-\(weapon)", slot: .weapon, price: Balance.gearPriceWeapon),
            GearItem(id: "off-\(id)-\(offhand)", slot: .offhand, price: Balance.gearPriceOffhand),
        ])
    }
}
