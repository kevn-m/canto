// Cosmetic only - never touches Balance's combat numbers. The gear table
// (schema v4) stores only what's owned/equipped; this catalogue is the
// fixed price/kind lookup for those ids.
enum GearKind {
    case hat, companion
}

struct GearItem: Identifiable, Equatable {
    let id: String
    let kind: GearKind
    let price: Int
}

enum GearCatalog {
    static let all: [GearItem] = [
        GearItem(id: "hat-cap", kind: .hat, price: Balance.gearPriceHat),
        GearItem(id: "hat-crown", kind: .hat, price: Balance.gearPriceHat),
        GearItem(id: "hat-wizard", kind: .hat, price: Balance.gearPriceHat),
        GearItem(id: "pal-cat", kind: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dog", kind: .companion, price: Balance.gearPriceCompanion),
        GearItem(id: "pal-dragonling", kind: .companion, price: Balance.gearPriceCompanion),
    ]

    static func item(id: String) -> GearItem? {
        all.first { $0.id == id }
    }
}
