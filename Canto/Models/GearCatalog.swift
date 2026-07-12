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

enum GearCatalog {
    static let all: [GearItem] = [
        GearItem(id: "hat-cap", slot: .helmet, price: Balance.gearPriceHat),
        GearItem(id: "hat-crown", slot: .helmet, price: Balance.gearPriceHat),
        GearItem(id: "hat-wizard", slot: .helmet, price: Balance.gearPriceHat),
        GearItem(id: "helm-knight", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-knight", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-knight", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-knight-sword", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-knight-shield", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "pal-cat", slot: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dog", slot: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dragonling", slot: .companion, price: Balance.gearPriceCompanion),
    ]

    static func item(id: String) -> GearItem? {
        all.first { $0.id == id }
    }
}
