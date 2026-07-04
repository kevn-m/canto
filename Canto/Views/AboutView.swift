import SwiftUI

struct AboutView: View {
    var body: some View {
        List {
            Section("Dictionary data") {
                Text("Dictionary data from CC-Canto (Pleco Software) and CC-CEDICT, licensed under CC BY-SA 3.0. English index from words.hk (public domain).")
                Link("cantonese.org", destination: URL(string: "https://cantonese.org")!)
                Link("words.hk", destination: URL(string: "https://words.hk")!)
            }
        }
        .navigationTitle("About")
    }
}
