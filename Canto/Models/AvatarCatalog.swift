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
        AvatarItem(id: "avatar-mei", name: "Mei"),
        AvatarItem(id: "avatar-freya", name: "Freya"),
        AvatarItem(id: "avatar-priya", name: "Priya"),
        AvatarItem(id: "avatar-wren", name: "Wren"),
        AvatarItem(id: "avatar-talia", name: "Talia"),
        AvatarItem(id: "avatar-zoe", name: "Zoe"),
        AvatarItem(id: "avatar-nia", name: "Nia"),
        AvatarItem(id: "avatar-hana", name: "Hana"),
        AvatarItem(id: "avatar-isla", name: "Isla"),
        AvatarItem(id: "avatar-rosa", name: "Rosa"),
        AvatarItem(id: "avatar-kaze", name: "Kaze"),
        AvatarItem(id: "avatar-vay", name: "Vay"),
        AvatarItem(id: "avatar-goldie", name: "Goldie"),
        AvatarItem(id: "avatar-onyx", name: "Onyx"),
        AvatarItem(id: "avatar-suki", name: "Suki"),
        AvatarItem(id: "avatar-ryo", name: "Ryo"),
        AvatarItem(id: "avatar-aki", name: "Aki"),
        AvatarItem(id: "avatar-zuri", name: "Zuri"),
        AvatarItem(id: "avatar-nimbus", name: "Nimbus"),
        AvatarItem(id: "avatar-tora", name: "Tora"),
    ]
    // No avatar_id row -> the shipped kid renders exactly as it does today.
    static let legacyHeroSprite = "player-kid"

    static func item(id: String) -> AvatarItem? { all.first { $0.id == id } }
}
