import SwiftUI

struct AboutView: View {
    var body: some View {
        ZStack {
            InnBackground()
            List {
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
        .navigationTitle("About")
    }
}
