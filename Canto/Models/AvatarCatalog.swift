// Free to pick: an avatar is identity, not a reward. No price field on purpose -
// Gear stays the CantoBux sink.
struct AvatarItem: Identifiable, Equatable {
    let id: String        // sprite name
    let name: String      // shown in the picker
}

enum AvatarCatalog {
    static let all: [AvatarItem] = [
        AvatarItem(id: "avatar-scout", name: "Scout"),
        AvatarItem(id: "avatar-nova", name: "Nova"),
    ]
    // No avatar_id row -> the shipped kid renders exactly as it does today.
    static let legacyHeroSprite = "player-kid"

    static func item(id: String) -> AvatarItem? { all.first { $0.id == id } }
}
