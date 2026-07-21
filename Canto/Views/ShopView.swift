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
    // Try-on layers: tapped-but-not-bought gear the hero wears over what's
    // really equipped. Accumulates across slots so a whole outfit can be
    // tried before spending. Never persisted.
    @State private var previewGear: [GearSlot: String] = [:]

    // Seed the two the hero preview draws from, so the first frame already wears
    // the right avatar and gear. reload() in onAppear refreshes them along with
    // everything else; without this the preview renders the shipped kid wearing
    // nothing and then changes into your character in front of you.
    init() {
        _avatarId = State(initialValue: GameStore.shared.avatarId())
        _equipped = State(initialValue: GameStore.shared.equippedGear())
    }

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 16) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                TavernSignHeader(title: "Shop")
                balanceView
                heroPreviewButton
                ScrollView {
                    VStack(spacing: 20) {
                        GearShelf(
                            owned: ownedGear, equipped: equipped, previewed: previewGear,
                            balance: balance, onBuy: buy, onToggleEquip: toggleEquip, onPreview: togglePreview
                        )
                        if familyRewardsEnabled {
                            treatsSection
                        }
                    }
                    .padding()
                }
            }
            if familyRewardsEnabled {
                Button("Edit") { showingEdit = true }
                    .font(GameTheme.title(15))
                    .foregroundStyle(GameTheme.gold)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Capsule().fill(.black.opacity(0.35)))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(.trailing, 12)
            }
        }
        // Same reason as DeckView: bar hidden so the sign height matches
        // Settings; Edit floats over the content.
        .toolbar(.hidden, for: .navigationBar)
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
    // (show-don't-label), same spirit as the rest of the screen. Try-on
    // layers draw over the real gear, and the x badge takes them off again.
    private var heroPreviewButton: some View {
        Button { showingAvatarPicker = true } label: {
            AvatarSpriteView(
                size: 96, avatarId: avatarId,
                equipped: equipped.merging(previewGear) { _, tryOn in tryOn }
            )
            .overlay(alignment: .bottomTrailing) {
                Image(systemName: "arrow.2.squarepath")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(GameTheme.navy)
                    .padding(6)
                    .background(Circle().fill(GameTheme.gold))
            }
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            if !previewGear.isEmpty {
                Button(action: clearPreview) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(GameTheme.cream)
                        .padding(7)
                        .background(Circle().fill(GameTheme.red))
                }
                .buttonStyle(.plain)
                .offset(x: 10, y: -6)
            }
        }
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
        // The slot is real now - a leftover try-on layer would cover the
        // gear that was just paid for.
        previewGear[item.slot] = nil
        reload()
    }

    private func toggleEquip(_ item: GearItem) {
        let currentlyEquipped = equipped[item.slot] == item.id
        gameStore.equip(slot: item.slot, id: currentlyEquipped ? nil : item.id)
        previewGear[item.slot] = nil
        reload()
    }

    // Sprite tap: wear it on the hero above without spending. Tap again to
    // take it off.
    private func togglePreview(_ item: GearItem) {
        if previewGear[item.slot] == item.id {
            previewGear[item.slot] = nil
        } else {
            previewGear[item.slot] = item.id
        }
        SFXPlayer.shared.play(.flip)
    }

    private func clearPreview() {
        previewGear = [:]
        SFXPlayer.shared.play(.flip)
    }

    private func redeem() {
        guard let item = pendingRedeem else { return }
        pendingRedeem = nil
        gameStore.redeem(item: item)
        reload()
    }
}

// The gear shelves: one section per catalogue set (Hats, each outfit, Pals),
// each under a small wooden plaque. Split out so DesignSnapshotTests can
// render it bare (ShopView's ScrollView lays out as a sliver under
// ImageRenderer, the same trap as BadgeShelf).
struct GearShelf: View {
    let owned: Set<String>
    let equipped: [GearSlot: String]
    let previewed: [GearSlot: String]
    let balance: Int
    let onBuy: (GearItem) -> Void
    let onToggleEquip: (GearItem) -> Void
    let onPreview: (GearItem) -> Void
    // Overridable so DesignSnapshotTests can render a couple of sets at
    // reviewable height; the app always shows the whole catalogue.
    var sets: [GearSet] = GearCatalog.sets

    var body: some View {
        VStack(spacing: 22) {
            ForEach(sets) { set in
                VStack(spacing: 12) {
                    SetPlaque(name: set.name)
                    // Non-lazy Grid on purpose: a dozen LazyVGrids stacked in
                    // this ScrollView kept re-estimating their heights, which
                    // made scrolling jump and opened phantom gaps between
                    // sets. 61 sprite cards render fine eagerly.
                    Grid(horizontalSpacing: 14, verticalSpacing: 18) {
                        ForEach(Array(stride(from: 0, to: set.items.count, by: 3)), id: \.self) { start in
                            GridRow {
                                ForEach(set.items[start..<min(start + 3, set.items.count)]) { item in
                                    GearCardView(
                                        item: item, owned: owned.contains(item.id),
                                        equipped: equipped[item.slot] == item.id,
                                        previewing: previewed[item.slot] == item.id,
                                        affordable: balance >= item.price,
                                        onBuy: { onBuy(item) }, onToggleEquip: { onToggleEquip(item) },
                                        onPreview: { onPreview(item) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// The set's name on a small nailed-up wood plaque - TavernSignHeader's
// plank at shelf scale, minus the ropes.
private struct SetPlaque: View {
    let name: String

    var body: some View {
        Text(name)
            .font(.custom("Silkscreen-Bold", size: 15))
            .foregroundStyle(GameTheme.yellow)
            .shadow(color: .black.opacity(0.6), radius: 0, y: 1.5)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 5)
                        .fill(LinearGradient(
                            colors: [
                                Color(red: 0.48, green: 0.26, blue: 0.16),
                                Color(red: 0.34, green: 0.17, blue: 0.11),
                            ],
                            startPoint: .top, endPoint: .bottom
                        ))
                    RoundedRectangle(cornerRadius: 5)
                        .strokeBorder(Color(red: 0.22, green: 0.11, blue: 0.07), lineWidth: 2)
                }
            )
            .overlay(alignment: .leading) { nail.padding(.leading, 5) }
            .overlay(alignment: .trailing) { nail.padding(.trailing, 5) }
            .shadow(color: .black.opacity(0.4), radius: 3, y: 2)
    }

    private var nail: some View {
        Circle()
            .fill(GameTheme.gold)
            .frame(width: 4, height: 4)
    }
}

// One catalogue slot: the sprite (tap = try it on the hero above), then
// either a Buy button (unowned, disabled when unaffordable, same pattern as
// Treats) or an Equip/Unequip toggle (owned). A card being tried on wears
// the gilded flame frame; equipped keeps the steady selected ring.
private struct GearCardView: View {
    let item: GearItem
    let owned: Bool
    let equipped: Bool
    let previewing: Bool
    let affordable: Bool
    let onBuy: () -> Void
    let onToggleEquip: () -> Void
    let onPreview: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Button(action: onPreview) {
                GearSpriteView(id: item.id, slot: item.slot, size: 56)
            }
            .buttonStyle(.plain)
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
        .cardFrame(selected: equipped, gilded: previewing)
    }
}

// The sheet chrome around AvatarGrid. Single-use, stays in ShopView.swift.
struct AvatarPickerView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                TavernSignHeader(title: "Choose Hero")
                    .padding(.top, 16)
                    .padding(.bottom, 8)
                ScrollView {
                    AvatarGrid { dismiss() }
                        .padding()
                }
            }
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
            ZStack {
                InnBackground()
                VStack(spacing: 0) {
                    TavernSignHeader(title: "Edit Shop")
                        .padding(.bottom, 4)
                    Form {
                        if let lastError = gameStore.lastError {
                            ErrorBanner(message: lastError) { gameStore.clearError() }
                        }
                        Section {
                            TextField("Name", text: $newName)
                            TextField("Price", text: $newPrice)
                                .keyboardType(.numberPad)
                            Button("Add", action: addItem)
                                // Int(newPrice) == nil covers pasted "20.00",
                                // whitespace, and overflow - not just empty.
                                .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || Int(newPrice) == nil)
                        } header: {
                            Text("Add item")
                                .font(GameTheme.title(13))
                                .foregroundStyle(GameTheme.cream.opacity(0.6))
                        }
                        .listRowBackground(GameTheme.navy.opacity(0.4))
                        Section {
                            ForEach(items) { item in
                                HStack {
                                    Text(item.name)
                                    Spacer()
                                    Text("\(item.price)").foregroundStyle(.secondary)
                                }
                            }
                            .onDelete(perform: archive)
                        } header: {
                            Text("Items")
                                .font(GameTheme.title(13))
                                .foregroundStyle(GameTheme.cream.opacity(0.6))
                        }
                        .listRowBackground(GameTheme.navy.opacity(0.4))
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
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
