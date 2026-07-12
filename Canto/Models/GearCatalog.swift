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
        GearItem(id: "helm-jade", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-jade", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-jade", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-jade-sword", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-jade-disc", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-mage", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-mage", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-mage", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-mage-staff", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-mage-tome", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-rogue", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-rogue", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-rogue", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-rogue-dagger", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-rogue-dagger", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-paladin", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-paladin", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-paladin", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-paladin-hammer", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-paladin-shield", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-warlock", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-warlock", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-warlock", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-warlock-staff", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-warlock-orb", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-hunter", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-hunter", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-hunter", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-hunter-bow", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-hunter-quiver", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-druid", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-druid", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-druid", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-druid-staff", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-druid-blossom", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-shaman", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-shaman", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-shaman", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-shaman-axe", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-shaman-totem", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-frost", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-frost", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-frost", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-frost-runeblade", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-frost-shield", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "helm-priest", slot: .helmet, price: Balance.gearPriceHelmet),
        GearItem(id: "chest-priest", slot: .chest, price: Balance.gearPriceChest),
        GearItem(id: "legs-priest", slot: .leggings, price: Balance.gearPriceLeggings),
        GearItem(id: "weap-priest-staff", slot: .weapon, price: Balance.gearPriceWeapon),
        GearItem(id: "off-priest-lantern", slot: .offhand, price: Balance.gearPriceOffhand),
        GearItem(id: "pal-cat", slot: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dog", slot: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dragonling", slot: .companion, price: Balance.gearPriceCompanion),
    ]

    static func item(id: String) -> GearItem? {
        all.first { $0.id == id }
    }
}
