import SwiftUI
import PhotosUI
import UIKit

// The whole deck: photo, english, characters, its box, bench toggle, and
// photo attach. Also hosts Deck Export (ADR 0010) - a share button sending
// deck JSON off-device for the card-art-pipeline plan, and as a manual
// backup.
struct DeckView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var entries: [DeckEntry] = []
    @State private var balance = 0
    @State private var detailEntry: DeckEntry?
    @State private var dialogEntry: DeckEntry?
    @State private var photoTargetCardId: Int64?
    @State private var pendingCameraEntry: DeckEntry?
    @State private var photosPickerItem: PhotosPickerItem?
    @State private var exportURL: URL?
    @State private var deleteTarget: DeckEntry?

    private let photos = CardPhotos()

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                List(entries) { entry in
                    row(entry)
                        .listRowBackground(Color.clear)
                        .listRowSeparatorTint(GameTheme.cream.opacity(0.12))
                        .swipeActions {
                            Button(entry.benched ? "Unbench" : "Bench") {
                                gameStore.setBenched(cardId: entry.id, !entry.benched)
                                reload()
                            }
                            .tint(entry.benched ? GameTheme.green : GameTheme.lavender)
                            Button("Delete", role: .destructive) { deleteTarget = entry }
                        }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Deck")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let exportURL {
                    ShareLink(item: exportURL)
                }
            }
        }
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
                PhotosPicker("Photo Library", selection: $photosPickerItem, matching: .images)
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
        .onChange(of: photosPickerItem) { _, newItem in
            guard let newItem else { return }
            attachFromLibrary(newItem)
        }
    }

    private func row(_ entry: DeckEntry) -> some View {
        DeckRow(entry: entry)
            .contentShape(Rectangle())
            .onTapGesture { detailEntry = entry }
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

// One deck row: the card's battle art (photo, else sprite, else characters)
// beside its words and Box dot. Split from DeckView so the snapshot tests
// can render rows without the List (ImageRenderer draws List as a placeholder).
struct DeckRow: View {
    let entry: DeckEntry

    private let photos = CardPhotos()

    var body: some View {
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
