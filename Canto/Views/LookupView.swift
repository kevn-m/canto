import SwiftUI
import UIKit

struct LookupView: View {
    // Bumped by AppShellView when the Action Button intent fires; each new
    // token starts the mic once. Default 0 for previews/tests.
    var listenRequest: Int = 0

    @State private var query = ""
    @State private var lastHandledListenRequest = 0
    @FocusState private var queryFieldFocused: Bool
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

    private let store = DictionaryStore.shared
    private let logStore = LogStore.shared
    private let photos = CardPhotos()
    private let translator = OnlineTranslator()
    @State private var speaker = CantoneseSpeaker()
    @State private var speechListener = SpeechListener()

    var body: some View {
        VStack(spacing: 0) {
            // Explicit prompt colour: dark mode draws the default placeholder
            // with vibrancy, which smears against the cream field.
            TextField(
                "", text: $query,
                prompt: Text("Type an English word").foregroundStyle(GameTheme.navy.opacity(0.45))
            )
                .textFieldStyle(GameTextFieldStyle())
                .focused($queryFieldFocused)
                .padding(.horizontal)
                .padding(.top, 8)
                .onSubmit { runLookup(viaVoice: false) }
                .onChange(of: speechListener.heardText) { _, newValue in
                    if speechListener.isListening {
                        query = newValue
                    }
                }

            micButton

            resultsView
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(InnBackground())
        // Tapping blank space should dismiss the keyboard, not just move
        // focus — a background tap catcher covers Spacer areas the TextField
        // itself doesn't own.
        .contentShape(Rectangle())
        .onTapGesture { queryFieldFocused = false }
        .navigationTitle("Canto")
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
            handleListenRequest(listenRequest)
        }
        .onChange(of: listenRequest) { _, token in
            handleListenRequest(token)
        }
        // Battle audio claims .playback; a still-running mic tap (.record)
        // would be yanked out from under the engine when a tab switch lands
        // in the Tower.
        .onDisappear {
            if speechListener.isListening {
                speechListener.cancel()
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

    // One mic start per token: re-appearing with an already-handled token
    // (an ordinary tab switch back to Lookup) must not re-trigger recording.
    private func handleListenRequest(_ token: Int) {
        guard token != lastHandledListenRequest else { return }
        lastHandledListenRequest = token
        speechListener.start()
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

    private var micButton: some View {
        Button(action: toggleListening) {
            Image(systemName: "mic.fill")
                .font(.system(size: 32))
                .padding()
                .foregroundStyle(speechListener.isListening ? GameTheme.red : GameTheme.gold)
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
                    onSpeakCharacters: { characters in
                        if speaker.voiceAvailable {
                            speaker.speak(characters)
                        } else {
                            showVoiceUnavailableAlert = true
                        }
                    },
                    onKeepCustom: keepCustom
                )
                if result.senses.isEmpty {
                    Spacer()
                    Text("No results")
                        .font(GameTheme.title(20))
                        .foregroundStyle(GameTheme.cream.opacity(0.7))
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
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
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
                                    .font(GameTheme.title(16))
                                    .frame(maxWidth: .infinity, alignment: .center)
                                    .foregroundStyle(GameTheme.cream.opacity(0.65))
                            }
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                            .accessibilityLabel("Show more results")
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
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
            let isCurrent = await MainActor.run { trimmed == lastLoggedQuery }
            guard !Task.isCancelled, isCurrent else { return }
            guard let characters else {
                await MainActor.run {
                    guard !Task.isCancelled, trimmed == lastLoggedQuery else { return }
                    pickPending = false
                }
                return
            }

            let store = store
            let dataTask = Task.detached { () -> (senses: [Sense], derived: DerivedReading?) in
                let senses = store.pickSenses(forCharacters: characters, query: trimmed)
                guard !Task.isCancelled else { return (senses, nil) }
                let derived = senses.isEmpty ? try? store.derivedReading(for: characters) : nil
                return (senses, derived)
            }
            let data = await withTaskCancellationHandler {
                await dataTask.value
            } onCancel: {
                dataTask.cancel()
            }

            await MainActor.run {
                guard !Task.isCancelled, trimmed == lastLoggedQuery else { return }
                pick = Pick(characters: characters, senses: data.senses, derived: data.derived)
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
