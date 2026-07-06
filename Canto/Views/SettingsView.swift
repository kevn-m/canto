import SwiftUI

struct SettingsView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var showResetDialog = false

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                List {
                    Section {
                        Button("Start over", role: .destructive) { showResetDialog = true }
                    } header: {
                        Text("Reset")
                            .font(GameTheme.title(13))
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
    }
}
