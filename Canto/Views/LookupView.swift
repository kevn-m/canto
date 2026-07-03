import SwiftUI

struct LookupView: View {
    @State private var query = ""
    @State private var result: LookupResult?
    @State private var selectedSenseId: Int64?
    @State private var showVoiceUnavailableAlert = false

    private let store = DictionaryStore.shared
    @State private var speaker = CantoneseSpeaker()

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Type an English word", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                    .onSubmit(runLookup)

                resultsView
            }
            .navigationTitle("Canto")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink("About") {
                        AboutView()
                    }
                }
            }
            .alert("Cantonese voice not installed", isPresented: $showVoiceUnavailableAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Download the Cantonese voice in Settings → Accessibility → Spoken Content to hear lookups read aloud.")
            }
        }
    }

    @ViewBuilder
    private var resultsView: some View {
        if let result, result.senses.isEmpty {
            Spacer()
            Text("No results")
                .foregroundStyle(.secondary)
            Spacer()
        } else if let result {
            List(result.senses) { sense in
                SenseRowView(sense: sense)
                    .contentShape(Rectangle())
                    .onTapGesture { selectAndSpeak(sense) }
                    .listRowBackground(sense.id == selectedSenseId ? Color.accentColor.opacity(0.15) : nil)
            }
        } else {
            Spacer()
        }
    }

    private func runLookup() {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            result = nil
            return
        }
        result = store.lookup(query)
        selectedSenseId = nil
    }

    private func selectAndSpeak(_ sense: Sense) {
        selectedSenseId = sense.id
        if speaker.voiceAvailable {
            speaker.speak(sense.traditional)
        } else {
            showVoiceUnavailableAlert = true
        }
    }
}
