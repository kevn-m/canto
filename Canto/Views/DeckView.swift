import SwiftUI
import PhotosUI
import UIKit

// Case-insensitive match on english/jyutping, plain contains on characters.
// Pure so the match rule is testable without the List (same pattern as
// BattleEngine living beside BattleView).
enum DeckSearch {
    static func filter(_ entries: [DeckEntry], query: String) -> [DeckEntry] {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return entries }
        return entries.filter {
            $0.english.localizedCaseInsensitiveContains(trimmed)
                || $0.jyutping.localizedCaseInsensitiveContains(trimmed)
                || $0.traditional.contains(trimmed)
        }
    }
}

// The whole deck: photo, english, characters, its box, bench toggle, and
// photo attach. Long-pressing a row enters multi-select (batch bench/unbench/
// delete via DeckSelectionBar), and the floating presets circle applies a
// whole-deck bench layout. Also hosts Deck Export
// (ADR 0010) - a share button sending deck JSON off-device for the
// card-art-pipeline plan, and as a manual backup.
struct DeckView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var entries: [DeckEntry] = []
    @State private var balance = 0
    @State private var detailEntry: DeckEntry?
    @State private var dialogEntry: DeckEntry?
    @State private var photoTargetCardId: Int64?
    @State private var pendingCameraEntry: DeckEntry?
    @State private var photosPickerItem: PhotosPickerItem?
    @State private var showPhotoLibrary = false
    @State private var exportURL: URL?
    @State private var deleteTarget: DeckEntry?
    @State private var searchText = ""
    @State private var selecting = false
    @State private var selection = Set<Int64>()
    @State private var showBatchDelete = false

    private let photos = CardPhotos()

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                TavernSignHeader(title: "Deck")
                    .padding(.bottom, 12)
                searchField
                List(DeckSearch.filter(entries, query: searchText)) { entry in
                    row(entry)
                        .listRowBackground(Color.clear)
                        .listRowSeparatorTint(GameTheme.cream.opacity(0.12))
                        .swipeActions {
                            if !selecting {
                                Button(entry.benched ? "Unbench" : "Bench") {
                                    gameStore.setBenched(cardId: entry.id, !entry.benched)
                                    reload()
                                }
                                .tint(entry.benched ? GameTheme.green : GameTheme.lavender)
                                Button("Delete", role: .destructive) { deleteTarget = entry }
                            }
                        }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .scrollDismissesKeyboard(.immediately)
                if selecting {
                    selectionBar
                }
            }
            if let exportURL {
                ShareLink(item: exportURL) {
                    FloatingCircleIcon(systemName: "square.and.arrow.up")
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.trailing, 12)
            }
            // Whole-deck layouts don't mix with a part-deck selection, so the
            // presets circle steps out while selecting.
            if !selecting {
                DeckPresetsButton(onPreset: applyPreset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(.leading, 12)
            }
        }
        .sensoryFeedback(.selection, trigger: selecting)
        // All three inn tabs hide the nav bar: an empty bar collapses but one
        // with items keeps its height, which left this sign hanging lower
        // than Settings'. The share button floats over the content instead.
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            gameStore.syncDeck(from: LogStore.shared)
            reload()
        }
        .sheet(item: $detailEntry) { entry in
            // The photo dialog and camera hang off the sheet's content:
            // attached to DeckView they can't present while the sheet is up.
            DeckCardDetailView(
                entry: entry,
                onToggleBench: {
                    gameStore.setBenched(cardId: entry.id, !entry.benched)
                    reload()
                },
                onPhoto: {
                    dialogEntry = entry
                    photoTargetCardId = entry.id
                }
            )
            .confirmationDialog(
                "Attach a photo",
                isPresented: Binding(get: { dialogEntry != nil }, set: { if !$0 { dialogEntry = nil } }),
                titleVisibility: .visible
            ) {
                if CameraPicker.isAvailable {
                    Button("Camera") { pendingCameraEntry = dialogEntry }
                }
                Button("Photo Library") { showPhotoLibrary = true }
                if dialogEntry?.photoFilename != nil {
                    Button("Remove Photo", role: .destructive, action: removePhoto)
                }
                Button("Cancel", role: .cancel) {}
            }
            .fullScreenCover(item: $pendingCameraEntry) { entry in
                CameraPicker { image in
                    if let image, let filename = photos.save(image: image, cardId: entry.id) {
                        gameStore.setPhoto(cardId: entry.id, filename: filename)
                    }
                    pendingCameraEntry = nil
                    reload()
                }
                .ignoresSafeArea()
            }
            .photosPicker(isPresented: $showPhotoLibrary, selection: $photosPickerItem, matching: .images)
        }
        .confirmationDialog(
            "Delete this card?",
            isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } }),
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                if let entry = deleteTarget {
                    gameStore.deleteCard(cardId: entry.id)
                    reload()
                }
                deleteTarget = nil
            }
            Button("Cancel", role: .cancel) { deleteTarget = nil }
        } message: {
            Text("Deletes its history too. The word comes back if you look it up and Keep it.")
        }
        .confirmationDialog(
            "Delete \(selection.count) card\(selection.count == 1 ? "" : "s")?",
            isPresented: $showBatchDelete,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                selection.forEach { gameStore.deleteCard(cardId: $0) }
                exitSelectMode()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Deletes their history too. The words come back if you look them up and Keep them.")
        }
        .onChange(of: photosPickerItem) { _, newItem in
            guard let newItem else { return }
            attachFromLibrary(newItem)
        }
    }

    // In-content search (LookupView's field pattern), so the sign can hang
    // above it — .searchable pins the field to the nav bar, over everything.
    private var searchField: some View {
        TextField(
            "", text: $searchText,
            prompt: Text("english, jyutping, or 字").foregroundStyle(GameTheme.navy.opacity(0.45))
        )
        .textFieldStyle(GameTextFieldStyle())
        .autocorrectionDisabled()
        .textInputAutocapitalization(.never)
        .overlay(alignment: .trailing) {
            if !searchText.isEmpty {
                Button { searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(GameTheme.navy.opacity(0.35))
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 6)
    }

    private var selectionBar: some View {
        DeckSelectionBar(
            hasSelection: !selection.isEmpty,
            onBench: { batchBench(true) },
            onUnbench: { batchBench(false) },
            onDelete: { showBatchDelete = true },
            onDone: exitSelectMode
        )
    }

    private func row(_ entry: DeckEntry) -> some View {
        DeckRow(entry: entry, selected: selecting ? selection.contains(entry.id) : nil)
            .contentShape(Rectangle())
            .onTapGesture {
                if selecting {
                    if selection.contains(entry.id) {
                        selection.remove(entry.id)
                    } else {
                        selection.insert(entry.id)
                    }
                } else {
                    detailEntry = entry
                }
            }
            .onLongPressGesture {
                guard !selecting else { return }
                selecting = true
                selection = [entry.id]
            }
    }

    private func applyPreset(_ preset: GameStore.BenchPreset) {
        gameStore.applyBenchPreset(preset)
        reload()
    }

    private func batchBench(_ benched: Bool) {
        gameStore.setBenched(cardIds: Array(selection), benched)
        exitSelectMode()
    }

    private func exitSelectMode() {
        selecting = false
        selection.removeAll()
        reload()
    }

    private func reload() {
        entries = gameStore.deck()
        balance = gameStore.balance()
        exportURL = writeExport()
        // Keep the open detail card showing the row it was opened from -
        // a bench toggle or photo change lands in `entries` first.
        if let id = detailEntry?.id {
            detailEntry = entries.first { $0.id == id }
        }
    }

    // ShareLink's plain-item initialiser only takes URL/String, so the export
    // is written to a named temp file - once per reload, not per render.
    private func writeExport() -> URL? {
        let data = DeckExport.json(entries: entries, balance: balance, date: ReviewEngine.todayString())
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("canto-deck-export.json")
        do {
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }

    private func removePhoto() {
        guard let cardId = photoTargetCardId,
              let filename = entries.first(where: { $0.id == cardId })?.photoFilename else { return }
        // DB reference first, file second: a failure here orphans a file
        // (harmless) instead of leaving the DB pointing at nothing.
        gameStore.setPhoto(cardId: cardId, filename: nil)
        photos.delete(filename: filename)
        photoTargetCardId = nil
        reload()
    }

    private func attachFromLibrary(_ item: PhotosPickerItem) {
        guard let cardId = photoTargetCardId else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self),
               let uiImage = UIImage(data: data),
               let filename = photos.save(image: uiImage, cardId: cardId) {
                gameStore.setPhoto(cardId: cardId, filename: filename)
            }
            photosPickerItem = nil
            photoTargetCardId = nil
            reload()
        }
    }
}

// The gold-on-dark circle the deck's floating chrome shares (share, presets).
struct FloatingCircleIcon: View {
    let systemName: String

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(GameTheme.gold)
            .frame(width: 44, height: 44)
            .background(Circle().fill(.black.opacity(0.35)))
    }
}

// The bench-presets dialog behind a floating circle, mirroring the share
// button. Standalone (like DeckRow) so the snapshot tests can render it
// without the List. A confirmationDialog, not a Menu: Menu is UIKit-backed
// and draws the "no entry" placeholder under ImageRenderer.
struct DeckPresetsButton: View {
    let onPreset: (GameStore.BenchPreset) -> Void

    @State private var showPresets = false

    var body: some View {
        Button { showPresets = true } label: {
            FloatingCircleIcon(systemName: "slider.horizontal.3")
        }
        .accessibilityLabel("Bench presets")
        .confirmationDialog("Bench presets", isPresented: $showPresets, titleVisibility: .visible) {
            Button("Bench Mastered cards") { onPreset(.drillWeaker) }
            Button("Bench all except Mastered") { onPreset(.drillMastered) }
            Button("Unbench every card") { onPreset(.wholeDeck) }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Sets the bench for every card in the deck.")
        }
    }
}

// The batch actions for the current selection, shown only in select mode.
// The x exits the mode and always works; the actions need a selection.
struct DeckSelectionBar: View {
    let hasSelection: Bool
    let onBench: () -> Void
    let onUnbench: () -> Void
    let onDelete: () -> Void
    let onDone: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Group {
                Button("Bench", action: onBench)
                Button("Unbench", action: onUnbench)
                Button("Delete", action: onDelete)
            }
            .buttonStyle(GameButtonStyle(prominent: false, compact: true))
            .disabled(!hasSelection)
            .opacity(hasSelection ? 1 : 0.4)
            Button(action: onDone) {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(GameTheme.cream)
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(GameTheme.navy.opacity(0.8)))
                    .overlay(Circle().strokeBorder(.black.opacity(0.3), lineWidth: 2))
                    .shadow(color: .black.opacity(0.4), radius: 4, y: 3)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Done")
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}

// One deck row: the card's battle art (photo, else sprite, else characters)
// beside its words and Box dot. Split from DeckView so the snapshot tests
// can render rows without the List (ImageRenderer draws List as a placeholder).
struct DeckRow: View {
    let entry: DeckEntry
    // nil = not in select mode; true/false draws the selection ring.
    var selected: Bool? = nil

    private let photos = CardPhotos()

    var body: some View {
        HStack(spacing: 12) {
            // Outside the benched dimming so the mark stays legible.
            if let selected {
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(selected ? GameTheme.gold : GameTheme.cream.opacity(0.4))
            }
            HStack(spacing: 12) {
                thumbnail
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.english)
                        .font(GameTheme.title(18))
                        .foregroundStyle(GameTheme.cream)
                    Text(entry.traditional)
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                        .foregroundStyle(GameTheme.cream.opacity(0.6))
                }
                Spacer()
                CardTierCrest(box: entry.box, size: 26)
                if entry.benched {
                    Text("Benched")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(GameTheme.cream.opacity(0.5))
                }
            }
            .opacity(entry.benched ? 0.4 : 1)
        }
    }

    private var thumbnail: some View {
        Group {
            if let filename = entry.photoFilename, let uiImage = photos.load(filename: filename) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else if let sprite = SpriteArt.cardImage(forEnglish: entry.english) {
                Image(uiImage: sprite)
                    .resizable()
                    .interpolation(.none)
                    .scaledToFit()
                    .padding(3)
            } else {
                Text(entry.traditional)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(GameTheme.navy)
            }
        }
        .frame(width: 44, height: 44)
        .background(GameTheme.cream)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(GameTheme.gold, lineWidth: 2))
    }
}
