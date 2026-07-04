import SwiftUI

struct LookupView: View {
    @State private var query = ""
    @State private var result: LookupResult?
    @State private var selectedSenseId: Int64?
    @State private var showVoiceUnavailableAlert = false
    @State private var lastLookupId: Int64?
    @State private var lastLoggedQuery: String?

    @Environment(\.scenePhase) private var scenePhase

    private let store = DictionaryStore.shared
    private let logStore = LogStore.shared
    @State private var speaker = CantoneseSpeaker()
    @State private var speechListener = SpeechListener()

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Type an English word", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                    .onSubmit { runLookup(viaVoice: false) }
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
                    NavigationLink {
                        TowerEntryView()
                    } label: {
                        Image(systemName: "shield.lefthalf.filled")
                    }
                    // Battle audio claims .playback; a still-running mic tap
                    // (.record) would be yanked out from under the engine.
                    .simultaneousGesture(TapGesture().onEnded {
                        if speechListener.isListening {
                            speechListener.cancel()
                        }
                    })
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink("History") {
                        HistoryView()
                    }
                }
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
                    runLookup(viaVoice: true)
                }
                startListeningIfRequested()
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active {
                    startListeningIfRequested()
                }
            }
            // With openAppWhenRun, iOS foregrounds the app BEFORE running
            // perform(), so the flag can be set after scenePhase already went
            // .active — watching the flag itself covers that ordering.
            .onChange(of: LaunchIntent.shared.shouldStartListening) { _, requested in
                if requested {
                    startListeningIfRequested()
                }
            }
        }
    }

    // The Action Button intent can cold-launch the app (onAppear runs) or
    // foreground an already-running one (only scenePhase changes), so both
    // paths call this. consume() guards against an ordinary foreground
    // re-triggering the mic.
    private func startListeningIfRequested() {
        guard LaunchIntent.shared.consume() else { return }
        speechListener.start()
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

    private func runLookup(viaVoice: Bool) {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            result = nil
            lastLookupId = nil
            lastLoggedQuery = nil
            return
        }
        // A double-fired onSubmit would log the same intent twice, leaving a
        // phantom "abandoned" row in the miss log — skip exact repeats while
        // their results are still on screen.
        if trimmed == lastLoggedQuery, result != nil { return }
        result = store.lookup(trimmed)
        selectedSenseId = nil
        lastLookupId = logStore.record(
            heard: trimmed,
            matched: !(result?.senses.isEmpty ?? true),
            viaVoice: viaVoice
        )
        lastLoggedQuery = trimmed
    }

    private func selectAndSpeak(_ sense: Sense) {
        if speechListener.isListening {
            speechListener.cancel()
        }
        selectedSenseId = sense.id
        if let lastLookupId {
            logStore.setChosenSense(lookupId: lastLookupId, sense: sense)
        }
        if speaker.voiceAvailable {
            speaker.speak(sense.traditional)
        } else {
            showVoiceUnavailableAlert = true
        }
    }
}
