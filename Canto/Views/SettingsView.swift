import SwiftUI

struct SettingsView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @AppStorage("hasOnboarded") private var hasOnboarded = false
    @State private var showResetDialog = false
    @State private var familyRewardsEnabled = false
    @State private var exportURL: URL?
    @State private var showImporter = false
    @State private var pendingSnapshot: GameSnapshot.Payload?
    @State private var importMessage: String?

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                List {
                    Section {
                        Toggle("Family rewards", isOn: $familyRewardsEnabled)
                            .tint(GameTheme.gold)
                            .onChange(of: familyRewardsEnabled) { _, enabled in
                                gameStore.setFamilyRewardsEnabled(enabled)
                            }
                    } header: {
                        Text("Family rewards")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    } footer: {
                        // Off by default (ADR 0021): the Shop is gear-only
                        // until a parent turns this on.
                        Text("Lets a parent add real-world rewards to the Shop, so your child can spend CantoBux on treats you set alongside in-game gear.")
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    }
                    .listRowBackground(GameTheme.navy.opacity(0.4))

                    Section {
                        Button("Start over", role: .destructive) { showResetDialog = true }
                    } header: {
                        Text("Reset")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    }
                    .listRowBackground(GameTheme.navy.opacity(0.4))

                    Section {
                        Button("Show intro again") { hasOnboarded = false }
                    } header: {
                        Text("Intro")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    } footer: {
                        Text("Replays the welcome screens. Your words and CantoBux stay put.")
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    }
                    .listRowBackground(GameTheme.navy.opacity(0.4))

                    Section {
                        if let exportURL {
                            ShareLink(item: exportURL) {
                                Text("Export snapshot")
                            }
                        }
                        Button("Import snapshot") { showImporter = true }
                    } header: {
                        Text("Backup")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    } footer: {
                        Text("A snapshot carries your words, history, CantoBux, badges and gear. Photos stay on this phone.")
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    }
                    .listRowBackground(GameTheme.navy.opacity(0.4))

                    Section {
                        Text("Dictionary data from CC-Canto (Pleco Software) and CC-CEDICT, licensed under CC BY-SA 3.0. English index from words.hk (public domain).")
                            .font(.system(size: 15, weight: .medium, design: .rounded))
                            .foregroundStyle(GameTheme.cream.opacity(0.85))
                        Link("cantonese.org", destination: URL(string: "https://cantonese.org")!)
                            .font(GameTheme.title(16))
                            .tint(GameTheme.gold)
                        Link("words.hk", destination: URL(string: "https://words.hk")!)
                            .font(GameTheme.title(16))
                            .tint(GameTheme.gold)
                    } header: {
                        Text("Dictionary data")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.cream.opacity(0.6))
                    }
                    .listRowBackground(GameTheme.navy.opacity(0.4))
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            familyRewardsEnabled = gameStore.familyRewardsEnabled()
            exportURL = writeSnapshot()
        }
        .confirmationDialog(
            "Erase all words, history, photos and CantoBux? This can't be undone.",
            isPresented: $showResetDialog,
            titleVisibility: .visible
        ) {
            Button("Start over", role: .destructive) {
                gameStore.resetEverything(clearing: LogStore.shared)
            }
            Button("Cancel", role: .cancel) {}
        }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.json]) { result in
            readSnapshot(result)
        }
        .confirmationDialog(
            "Replace everything on this phone with the snapshot from \(pendingSnapshot?.exportedOn ?? "")? This can't be undone.",
            isPresented: Binding(
                get: { pendingSnapshot != nil },
                set: { if !$0 { pendingSnapshot = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Replace everything", role: .destructive) {
                if let payload = pendingSnapshot {
                    runImport(payload)
                }
                pendingSnapshot = nil
            }
            Button("Cancel", role: .cancel) {}
        }
        .alert(
            importMessage ?? "",
            isPresented: Binding(
                get: { importMessage != nil },
                set: { if !$0 { importMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        }
    }

    // ShareLink's plain-item initialiser only takes URL/String, so the export
    // is written to a named temp file — once per appear, not per render
    // (same shape as DeckView's export).
    private func writeSnapshot() -> URL? {
        let data = GameSnapshot.json(
            game: gameStore.snapshotRows(),
            lookups: LogStore.shared.allLookups().map(GameSnapshot.Lookup.init),
            date: ISO8601DateFormatter().string(from: Date())
        )
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("canto-snapshot.json")
        do {
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }

    private func readSnapshot(_ result: Result<URL, Error>) {
        guard case .success(let url) = result else { return }
        // The picked file lives outside the sandbox; reads fail without the
        // security scope.
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            pendingSnapshot = try GameSnapshot.decode(try Data(contentsOf: url))
        } catch {
            importMessage = error.localizedDescription
        }
    }

    private func runImport(_ payload: GameSnapshot.Payload) {
        do {
            let lastLogId = try LogStore.shared.replaceAllLookups(payload.lookups)
            gameStore.importSnapshot(payload, lastLogId: lastLogId)
            // importSnapshot surfaces its own failure via the sticky
            // lastError banner; only a clean run gets the success alert.
            if gameStore.lastError == nil {
                importMessage = "Snapshot restored."
                exportURL = writeSnapshot()
            }
        } catch {
            importMessage = error.localizedDescription
        }
    }
}
