import SwiftUI
import UIKit

struct LookupView: View {
    @State private var query = ""
    @State private var result: LookupResult?
    @State private var selectedSenseId: Int64?
    @State private var keptSenseId: Int64?
    @State private var customPickKept = false
    @State private var showVoiceUnavailableAlert = false
    @State private var lastLookupId: Int64?
    @State private var lastLoggedQuery: String?
    @State private var pendingCameraSense: Sense?
    @State private var pick: Pick?
    @State private var pickPending = false
    @State private var pickTask: Task<Void, Never>?
    @State private var browsing = false
    @State private var browsedSenses: [Sense] = []

    @Environment(\.scenePhase) private var scenePhase

    private let store = DictionaryStore.shared
    private let logStore = LogStore.shared
    private let photos = CardPhotos()
    private let translator = OnlineTranslator()
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
            .fullScreenCover(item: $pendingCameraSense) { sense in
                CameraPicker { image in
                    pendingCameraSense = nil
                    if let image {
                        attachPhoto(image, to: sense)
                    }
                }
                .ignoresSafeArea()
            }
        }
    }

    // Snapping a photo before the deck's next sync would leave nothing to
    // attach it to, so this syncs first, then finds the just-created card by
    // (traditional, jyutping) - the same UNIQUE key syncDeck dedupes on.
    private func attachPhoto(_ image: UIImage, to sense: Sense) {
        let gameStore = GameStore.shared
        gameStore.syncDeck(from: logStore)
        guard let cardId = gameStore.deck().first(where: {
            $0.traditional == sense.traditional && $0.jyutping == sense.jyutping
        })?.id else {
            NSLog("attachPhoto: no card for %@ after syncDeck", sense.traditional)
            return
        }
        guard let filename = photos.save(image: image, cardId: cardId) else {
            NSLog("attachPhoto: photo save failed for card %lld", cardId)
            return
        }
        gameStore.setPhoto(cardId: cardId, filename: filename)
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
        if let result {
            VStack(spacing: 0) {
                PickSectionView(
                    pick: pick,
                    pickPending: pickPending,
                    selectedSenseId: selectedSenseId,
                    keptSenseId: keptSenseId,
                    customKept: customPickKept,
                    onTap: listen(to:),
                    onKeep: keep,
                    onCamera: { pendingCameraSense = $0 },
                    onSpeakCharacters: { speaker.speak($0) },
                    readingCandidates: { store.readingCandidates(forCharacter: $0) },
                    onKeepCustom: keepCustom
                )
                if result.senses.isEmpty {
                    Spacer()
                    Text("No results")
                        .foregroundStyle(.secondary)
                    Spacer()
                } else {
                    List {
                        ForEach(displayedSenses) { sense in
                            LookupResultRowView(
                                sense: sense,
                                selectedSenseId: selectedSenseId,
                                keptSenseId: keptSenseId,
                                onTap: listen(to:),
                                onKeep: keep,
                                onCamera: { pendingCameraSense = $0 }
                            )
                            .listRowBackground(sense.id == selectedSenseId ? Color.accentColor.opacity(0.15) : nil)
                        }
                        if !browsing, !result.isWordFallback {
                            Button {
                                // Fetch once, on the tap. Only switch to the
                                // browse list if it actually loaded — an empty
                                // result means a read error, and blanking the
                                // screen is worse than leaving the top-5 up.
                                let more = store.browseSenses(lastLoggedQuery ?? "")
                                if !more.isEmpty {
                                    browsedSenses = more
                                    browsing = true
                                }
                            } label: {
                                Text("Show more")
                                    .frame(maxWidth: .infinity, alignment: .center)
                                    .foregroundStyle(.secondary)
                            }
                            .accessibilityLabel("Show more results")
                        }
                    }
                }
            }
        } else {
            Spacer()
        }
    }

    private var displayedSenses: [Sense] {
        browsing ? browsedSenses : (result?.senses ?? [])
    }

    private func runLookup(viaVoice: Bool) {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            result = nil
            lastLookupId = nil
            lastLoggedQuery = nil
            pickTask?.cancel()
            pick = nil
            pickPending = false
            customPickKept = false
            browsing = false
            browsedSenses = []
            return
        }
        // A double-fired onSubmit would log the same intent twice, leaving a
        // phantom "abandoned" row in the miss log — skip exact repeats while
        // their results are still on screen.
        if trimmed == lastLoggedQuery, result != nil { return }
        result = store.lookup(trimmed)
        selectedSenseId = nil
        keptSenseId = nil
        customPickKept = false
        browsing = false
        browsedSenses = []
        lastLookupId = logStore.record(
            heard: trimmed,
            matched: !(result?.senses.isEmpty ?? true),
            viaVoice: viaVoice
        )
        lastLoggedQuery = trimmed

        pickTask?.cancel()
        pick = nil
        pickPending = translator.isEnabled
        guard translator.isEnabled else { return }
        pickTask = Task {
            let characters = await translator.translate(trimmed)
            // A slow answer for the previous word must not pin onto the current
            // one: cancellation catches it, the query check is the belt-and-braces.
            guard !Task.isCancelled, trimmed == lastLoggedQuery else { return }
            let senses = characters.map { store.pickSenses(forCharacters: $0, query: trimmed) } ?? []
            await MainActor.run {
                if let characters {
                    pick = Pick(characters: characters, senses: senses)
                }
                pickPending = false
            }
        }
    }

    private func listen(to sense: Sense) {
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

    // Keeping a different row overwrites the chosen sense — last Keep wins, deliberately.
    private func keep(_ sense: Sense) {
        guard let lastLookupId else {
            NSLog("keep: no lookup row to attach to; keep dropped for %@", sense.traditional)
            return
        }
        // Only flip to "Added" if the log write persisted — a swallowed failure
        // must not leave a green tick over a card that never reached the deck.
        if logStore.setChosenSense(lookupId: lastLookupId, sense: sense) {
            keptSenseId = sense.id
        }
    }

    private func keepCustom(_ jyutping: String) {
        guard let lastLookupId, let pick else {
            NSLog("keepCustom: no lookup row to attach to; keep dropped")
            return
        }
        if logStore.setChosenCustom(lookupId: lastLookupId, traditional: pick.characters, jyutping: jyutping) {
            customPickKept = true
        }
    }
}
