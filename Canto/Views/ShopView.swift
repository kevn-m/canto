import SwiftUI

// Gear-primary shop (ADR 0024, superseding the original Treats|Gear plan):
// every player sees the cosmetic gear grid by default, and dad's real-world
// Treats only appear once "Family rewards" is switched on in Settings.
// Buying auto-equips, so the hero preview above always shows what just
// happened - no silent transitions.
struct ShopView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var balance = 0
    @State private var ownedGear: Set<String> = []
    @State private var equipped: [GearSlot: String] = [:]
    @State private var avatarId: String?
    @State private var familyRewardsEnabled = false
    @State private var items: [ShopItem] = []
    @State private var pendingRedeem: ShopItem?
    @State private var showingEdit = false
    @State private var showingAvatarPicker = false

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 16) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                balanceView
                heroPreviewButton
                ScrollView {
                    VStack(spacing: 20) {
                        GearShelf(
                            owned: ownedGear, equipped: equipped,
                            balance: balance, onBuy: buy, onToggleEquip: toggleEquip
                        )
                        if familyRewardsEnabled {
                            treatsSection
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Shop")
        .toolbar {
            if familyRewardsEnabled {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Edit") { showingEdit = true }
                        .tint(GameTheme.gold)
                }
            }
        }
        .onAppear(perform: reload)
        .confirmationDialog(
            "Spend \(pendingRedeem?.price ?? 0) CantoBux on \(pendingRedeem?.name ?? "")?",
            isPresented: Binding(get: { pendingRedeem != nil }, set: { if !$0 { pendingRedeem = nil } }),
            titleVisibility: .visible
        ) {
            Button("Redeem", action: redeem)
            Button("Cancel", role: .cancel) { pendingRedeem = nil }
        }
        .sheet(isPresented: $showingEdit, onDismiss: reload) {
            ShopEditView()
        }
        .sheet(isPresented: $showingAvatarPicker, onDismiss: reload) {
            AvatarPickerView()
        }
    }

    // Tapping the hero swaps the avatar - the swap badge is the only hint
    // (show-don't-label), same spirit as the rest of the screen.
    private var heroPreviewButton: some View {
        Button { showingAvatarPicker = true } label: {
            AvatarSpriteView(size: 96, avatarId: avatarId, equipped: equipped)
                .overlay(alignment: .bottomTrailing) {
                    Image(systemName: "arrow.2.squarepath")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(GameTheme.navy)
                        .padding(6)
                        .background(Circle().fill(GameTheme.gold))
                }
        }
        .buttonStyle(.plain)
    }

    private var balanceView: some View {
        HStack(spacing: 10) {
            Image(systemName: "dollarsign.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(GameTheme.gold)
            Text("\(balance)")
                .font(GameTheme.title(44))
                .foregroundStyle(GameTheme.cream)
        }
        .padding(.top, 8)
    }

    // Dad's real-world IOUs - only visible behind the Settings toggle
    // (ADR 0021). The Edit sheet (dad's, not the kid's) stays attached here.
    private var treatsSection: some View {
        VStack(spacing: 10) {
            ForEach(items) { item in
                treatRow(item)
            }
        }
    }

    private func treatRow(_ item: ShopItem) -> some View {
        HStack {
            Text(item.name)
                .font(GameTheme.title(18))
                .foregroundStyle(GameTheme.navy)
            Spacer()
            let affordable = balance >= item.price
            Button("Redeem (\(item.price))") { pendingRedeem = item }
                .buttonStyle(GameButtonStyle(compact: true))
                .disabled(!affordable)
                .opacity(affordable ? 1 : 0.4)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .cardFrame()
    }

    private func reload() {
        balance = gameStore.balance()
        ownedGear = gameStore.ownedGear()
        equipped = gameStore.equippedGear()
        avatarId = gameStore.avatarId()
        familyRewardsEnabled = gameStore.familyRewardsEnabled()
        items = gameStore.shopItems(includeArchived: false)
    }

    // Buying always lands the gear on the hero right away - equip
    // immediately rather than leaving a bought-but-unworn item invisible.
    // The buy and the equip are separate transactions on purpose: a death
    // between them leaves gear owned but unworn, which one tap fixes and which
    // never costs the kid a bux.
    private func buy(_ item: GearItem) {
        guard gameStore.buyGear(id: item.id) else {
            reload()
            return
        }
        SFXPlayer.shared.play(.coin)
        gameStore.equip(slot: item.slot, id: item.id)
        reload()
    }

    private func toggleEquip(_ item: GearItem) {
        let currentlyEquipped = equipped[item.slot] == item.id
        gameStore.equip(slot: item.slot, id: currentlyEquipped ? nil : item.id)
        reload()
    }

    private func redeem() {
        guard let item = pendingRedeem else { return }
        pendingRedeem = nil
        gameStore.redeem(item: item)
        reload()
    }
}

// The gear grid: every catalogue item, always, grouped by slot. Split out so
// DesignSnapshotTests can render it bare (ShopView's ScrollView lays out as
// a sliver under ImageRenderer, the same trap as BadgeShelf). No heading
// text - each group leads with its slot's sprites (show-don't-label).
struct GearShelf: View {
    let owned: Set<String>
    let equipped: [GearSlot: String]
    let balance: Int
    let onBuy: (GearItem) -> Void
    let onToggleEquip: (GearItem) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 14), count: 3)

    var body: some View {
        VStack(spacing: 18) {
            ForEach(GearSlot.allCases, id: \.self) { slot in
                let items = GearCatalog.all.filter { $0.slot == slot }
                if !items.isEmpty {
                    LazyVGrid(columns: columns, spacing: 18) {
                        ForEach(items) { item in
                            GearCardView(
                                item: item, owned: owned.contains(item.id), equipped: equipped[slot] == item.id,
                                affordable: balance >= item.price,
                                onBuy: { onBuy(item) }, onToggleEquip: { onToggleEquip(item) }
                            )
                        }
                    }
                }
            }
        }
    }
}

// One catalogue slot: the sprite (or SF Symbol fallback), then either a
// Buy button (unowned, disabled when unaffordable, same pattern as Treats)
// or an Equip/Unequip toggle (owned).
private struct GearCardView: View {
    let item: GearItem
    let owned: Bool
    let equipped: Bool
    let affordable: Bool
    let onBuy: () -> Void
    let onToggleEquip: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            GearSpriteView(id: item.id, slot: item.slot, size: 56)
            if owned {
                Button(equipped ? "Unequip" : "Equip", action: onToggleEquip)
                    .buttonStyle(GameButtonStyle(prominent: !equipped, compact: true))
            } else {
                Button("Buy (\(item.price))", action: onBuy)
                    .buttonStyle(GameButtonStyle(compact: true))
                    .disabled(!affordable)
                    .opacity(affordable ? 1 : 0.4)
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 6)
        // Fill the grid column so every card is the same size - otherwise
        // the card hugs its button and "Unequip" stretches wider than "Buy".
        .frame(maxWidth: .infinity)
        .cardFrame(selected: equipped)
    }
}

// The sheet chrome around AvatarGrid. Single-use, stays in ShopView.swift.
struct AvatarPickerView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                InnBackground()
                AvatarGrid { dismiss() }
                    .padding()
            }
            .navigationTitle("Choose Hero")
        }
    }
}

// A grid of every avatar, plus the legacy kid as the first cell (so a family
// device can go back). Bare AvatarSpriteView, no gear - identity, not a fit
// check. Split out so DesignSnapshotTests can render it bare (ImageRenderer
// draws NavigationStack as a "no entry" placeholder, the same trap as
// GearShelf/BadgeShelf).
struct AvatarGrid: View {
    var onPicked: () -> Void = {}

    @ObservedObject private var gameStore = GameStore.shared
    @State private var currentAvatarId: String?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 14), count: 3)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 18) {
            avatarCell(id: nil)
            ForEach(AvatarCatalog.all) { avatar in
                avatarCell(id: avatar.id)
            }
        }
        .onAppear { currentAvatarId = gameStore.avatarId() }
    }

    private func avatarCell(id: String?) -> some View {
        Button { pick(id) } label: {
            AvatarSpriteView(size: 72, avatarId: id)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .cardFrame(selected: currentAvatarId == id)
        }
        .buttonStyle(.plain)
    }

    // nil is the shipped kid, and it must still be written - it clears avatar_id.
    // Skipping the write here is what made the kid unpickable: the sheet played its
    // sound and dismissed while the old pick stayed on disk.
    private func pick(_ id: String?) {
        gameStore.setAvatar(id: id)
        SFXPlayer.shared.play(.flip)
        onPicked()
    }
}

// Dad-only: add new items and archive old ones. No password gate - the app
// is single-family and offline, so "dad's edit mode" just means "an extra
// tap away", not access control.
private struct ShopEditView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @Environment(\.dismiss) private var dismiss
    @State private var items: [ShopItem] = []
    @State private var newName = ""
    @State private var newPrice = ""

    var body: some View {
        NavigationStack {
            Form {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                Section("Add item") {
                    TextField("Name", text: $newName)
                    TextField("Price", text: $newPrice)
                        .keyboardType(.numberPad)
                    Button("Add", action: addItem)
                        // Int(newPrice) == nil covers pasted "20.00",
                        // whitespace, and overflow - not just empty.
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || Int(newPrice) == nil)
                }
                Section("Items") {
                    ForEach(items) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            Text("\(item.price)").foregroundStyle(.secondary)
                        }
                    }
                    .onDelete(perform: archive)
                }
            }
            .navigationTitle("Edit Shop")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear(perform: reload)
        }
    }

    private func reload() {
        items = gameStore.shopItems(includeArchived: false)
    }

    private func addItem() {
        guard let price = Int(newPrice) else { return }
        gameStore.addShopItem(name: newName.trimmingCharacters(in: .whitespaces), price: price)
        // Keep the fields on a rejected add (e.g. price 0) so dad can fix
        // the price without retyping. reportError sets lastError inline
        // on the main thread, so this check is safe right after the call.
        if gameStore.lastError == nil {
            newName = ""
            newPrice = ""
        }
        reload()
    }

    private func archive(at offsets: IndexSet) {
        for index in offsets {
            gameStore.archiveShopItem(id: items[index].id)
        }
        reload()
    }
}
