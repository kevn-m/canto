import SwiftUI

struct LookupView: View {
    @State private var query = ""
    @State private var result: LookupResult?
    @State private var selectedSenseId: Int64?
    @State private var showVoiceUnavailableAlert = false

    private let store = DictionaryStore.shared
    @State private var speaker = CantoneseSpeaker()
    @State private var speechListener = SpeechListener()

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Type an English word", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                    .onSubmit(runLookup)
                    .onChange(of: speechListener.heardText) { _, newValue in
                        if speechListener.isListening {
                            query = newValue
                        }
                    }

                micButton

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
            .alert("Voice input unavailable", isPresented: speechErrorBinding) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(speechListener.errorMessage ?? "")
            }
            .onAppear {
                speechListener.onFinish = { text in
                    query = text
                    runLookup()
                }
            }
        }
    }

    private var micButton: some View {
        Button(action: toggleListening) {
            Image(systemName: "mic.fill")
                .font(.system(size: 32))
                .padding()
                .foregroundStyle(speechListener.isListening ? .red : .accentColor)
                .symbolEffect(.pulse, isActive: speechListener.isListening)
        }
        .accessibilityLabel(speechListener.isListening ? "Stop listening" : "Start listening")
    }

    private var speechErrorBinding: Binding<Bool> {
        Binding(
            get: { speechListener.errorMessage != nil },
            set: { if !$0 { speechListener.errorMessage = nil } }
        )
    }

    private func toggleListening() {
        if speechListener.isListening {
            speechListener.stop()
        } else {
            speechListener.start()
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
        if speechListener.isListening {
            speechListener.cancel()
        }
        selectedSenseId = sense.id
        if speaker.voiceAvailable {
            speaker.speak(sense.traditional)
        } else {
            showVoiceUnavailableAlert = true
        }
    }
}
