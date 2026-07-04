import SwiftUI
import PhotosUI
import UIKit

// The whole deck: photo, english, characters, each player's box, bench
// toggle, and photo attach. Also hosts Deck Export (ADR 0010) - a share
// button sending deck JSON off-device for the card-art-pipeline plan, and as
// a manual backup.
struct DeckView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var entries: [DeckEntry] = []
    @State private var balance = 0
    @State private var dialogEntry: DeckEntry?
    @State private var photoTargetCardId: Int64?
    @State private var pendingCameraEntry: DeckEntry?
    @State private var photosPickerItem: PhotosPickerItem?
    @State private var exportURL: URL?

    private let photos = CardPhotos()

    private static let boxColors: [Color] = [.gray, .blue, .orange, .green] // New, Learning, Solid, Mastered

    var body: some View {
        VStack(spacing: 0) {
            if let lastError = gameStore.lastError {
                ErrorBanner(message: lastError) { gameStore.clearError() }
            }
            List(entries) { entry in
                row(entry)
                    .swipeActions {
                        Button(entry.benched ? "Unbench" : "Bench") {
                            gameStore.setBenched(cardId: entry.id, !entry.benched)
                            reload()
                        }
                        .tint(entry.benched ? .green : .gray)
                    }
            }
            .listStyle(.plain)
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
        .onChange(of: photosPickerItem) { _, newItem in
            guard let newItem else { return }
            attachFromLibrary(newItem)
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

    private func row(_ entry: DeckEntry) -> some View {
        HStack(spacing: 12) {
            thumbnail(entry)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.english).font(.headline)
                Text(entry.traditional).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            VStack(spacing: 4) {
                boxDot(entry.dadBox, label: "D")
                boxDot(entry.kidBox, label: "K")
            }
            if entry.benched {
                Text("Benched").font(.caption2).foregroundStyle(.secondary)
            }
        }
        .opacity(entry.benched ? 0.4 : 1)
        .contentShape(Rectangle())
        .onTapGesture {
            dialogEntry = entry
            photoTargetCardId = entry.id
        }
    }

    private func thumbnail(_ entry: DeckEntry) -> some View {
        Group {
            if let filename = entry.photoFilename, let uiImage = photos.load(filename: filename) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else {
                Text(entry.traditional).font(.title2.bold())
            }
        }
        .frame(width: 44, height: 44)
        .background(Color.secondary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func boxDot(_ box: Int, label: String) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Self.boxColors[min(max(box, 0), 3)])
                .frame(width: 10, height: 10)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func reload() {
        entries = gameStore.deck()
        balance = gameStore.balance()
        exportURL = writeExport()
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
