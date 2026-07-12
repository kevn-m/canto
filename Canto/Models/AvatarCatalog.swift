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
        AvatarItem(id: "avatar-ember", name: "Ember"),
        AvatarItem(id: "avatar-lily", name: "Lily"),
        AvatarItem(id: "avatar-jun", name: "Jun"),
        AvatarItem(id: "avatar-pip", name: "Pip"),
        AvatarItem(id: "avatar-koa", name: "Koa"),
        AvatarItem(id: "avatar-yuki", name: "Yuki"),
        AvatarItem(id: "avatar-amara", name: "Amara"),
        AvatarItem(id: "avatar-noor", name: "Noor"),
        AvatarItem(id: "avatar-rex", name: "Rex"),
        AvatarItem(id: "avatar-sage", name: "Sage"),
    ]
    // No avatar_id row -> the shipped kid renders exactly as it does today.
    static let legacyHeroSprite = "player-kid"

    static func item(id: String) -> AvatarItem? { all.first { $0.id == id } }
}
