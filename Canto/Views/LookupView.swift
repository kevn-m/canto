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
    @State private var inlineError: String?
    @State private var selectedSenseId: Int64?
    @State private var keptSenseId: Int64?
    @State private var customPickKept = false
    @State private var showVoiceUnavailableAlert = false
    @State private var lastLookupId: Int64?
    @State private var lastLoggedQuery: String?
    @State private var pendingCameraSense: Sense?
    @State private var pickPresentation: PickPresentation = .hidden
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
        LookupContentView(
            query: $query,
            queryFieldFocused: $queryFieldFocused,
            inlineError: inlineError,
            isListening: speechListener.isListening,
            result: result,
            displayedSenses: displayedSenses,
            showMoreVisible: showMoreVisible,
            presentation: pickPresentation,
            selectedSenseId: selectedSenseId,
            keptSenseId: keptSenseId,
            customKept: customPickKept,
            onSubmit: { runLookup(viaVoice: false) },
            onMicTap: toggleListening,
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
            onKeepCustom: keepCustom,
            onRetry: retryPick,
            onShowMore: showMore
        )
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
        .onChange(of: query) { _, _ in
            inlineError = nil
        }
        .onChange(of: speechListener.heardText) { _, newValue in
            if speechListener.isListening {
                query = newValue
            }
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

    private var displayedSenses: [Sense] {
        browsing ? browsedSenses : (result?.senses ?? [])
    }

    private var showMoreVisible: Bool {
        guard let result else { return false }
        return !browsing && !result.isWordFallback && !result.senses.isEmpty
    }

    private func showMore() {
        // Fetch once, on the tap. Only switch to the browse list if it
        // actually loaded — an empty result means a read error, and blanking
        // the screen is worse than leaving the top-5 up.
        let more = store.browseSenses(lastLoggedQuery ?? "")
        if !more.isEmpty {
            browsedSenses = more
            browsing = true
        }
    }

    private func runLookup(viaVoice: Bool) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            result = nil
            inlineError = nil
            lastLookupId = nil
            lastLoggedQuery = nil
            pickTask?.cancel()
            pickPresentation = .hidden
            customPickKept = false
            browsing = false
            browsedSenses = []
            return
        }
        // Lookups are words; the cap bounds the Google bill per call and the
        // proxy rejects longer anyway (ADR 0031). No query, no log row, no Pick.
        guard trimmed.unicodeScalars.count <= 60 else {
            inlineError = "Keep the lookup under 60 characters."
            return
        }
        // A double-fired onSubmit would log the same intent twice, leaving a
        // phantom "abandoned" row in the miss log — skip exact repeats while
        // their results are still on screen.
        if trimmed == lastLoggedQuery, result != nil { return }
        inlineError = nil
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

        requestPick(for: trimmed)
    }

    // Retry re-runs only the Pick for the query already on screen — it never
    // creates a second Lookup log row.
    private func retryPick() {
        guard let lastLoggedQuery else { return }
        requestPick(for: lastLoggedQuery)
    }

    // Keyless builds hide the Pick layer entirely for now; the premium
    // access mapping (upsell/attention states) arrives with PremiumStore in
    // the plan's slice 4.
    private func requestPick(for trimmed: String) {
        pickTask?.cancel()
        guard translator.isEnabled else {
            pickPresentation = .hidden
            return
        }
        pickPresentation = .checking
        pickTask = Task {
            let characters = await translator.translate(trimmed)
            // A slow answer for the previous word must not pin onto the current
            // one: cancellation catches it, the query check is the belt-and-braces.
            let isCurrent = await MainActor.run { trimmed == lastLoggedQuery }
            guard !Task.isCancelled, isCurrent else { return }
            guard let characters else {
                await MainActor.run {
                    guard !Task.isCancelled, trimmed == lastLoggedQuery else { return }
                    pickPresentation = .unavailable
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
                pickPresentation = .available(
                    Pick(characters: characters, senses: data.senses, derived: data.derived)
                )
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
        guard let lastLookupId, case .available(let pick) = pickPresentation else {
            NSLog("keepCustom: no lookup row to attach to; keep dropped")
            return
        }
        if logStore.setChosenCustom(lookupId: lastLookupId, traditional: pick.characters, jyutping: jyutping) {
            customPickKept = true
        }
    }
}

// The visual half of the screen: fixed query/mic header, then one scroll of
// Pick state + offline Senses. Pure — no lookup, logging, network, audio,
// StoreKit, or camera work — so DesignSnapshotTests can render every state
// with injected data. Not a separate file: it's half of one screen.
struct LookupContentView: View {
    @Binding var query: String
    var queryFieldFocused: FocusState<Bool>.Binding
    let inlineError: String?
    let isListening: Bool
    let result: LookupResult?
    let displayedSenses: [Sense]
    let showMoreVisible: Bool
    let presentation: PickPresentation
    let selectedSenseId: Int64?
    let keptSenseId: Int64?
    let customKept: Bool
    let onSubmit: () -> Void
    let onMicTap: () -> Void
    let onTap: (Sense) -> Void
    let onKeep: (Sense) -> Void
    let onCamera: (Sense) -> Void
    let onSpeakCharacters: (String) -> Void
    let onKeepCustom: (String) -> Void
    var onStartTrial: () -> Void = {}
    var onSubscribe: () -> Void = {}
    var onRestore: () -> Void = {}
    var onManage: () -> Void = {}
    var onRetry: () -> Void = {}
    var onShowMore: () -> Void = {}

    var body: some View {
        VStack(spacing: 0) {
            header
            if let inlineError {
                Text(inlineError)
                    .font(GameTheme.title(14))
                    .foregroundStyle(GameTheme.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.top, 6)
            }
            resultsScroll
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(InnBackground())
        // Tapping blank space should dismiss the keyboard, not just move
        // focus — a background tap catcher covers Spacer areas the TextField
        // itself doesn't own.
        .contentShape(Rectangle())
        .onTapGesture { queryFieldFocused.wrappedValue = false }
    }

    // One card row: query field plus the mic. The trailing edge deliberately
    // has room for the future Reverse Lookup direction control — no
    // placeholder rendered now.
    private var header: some View {
        HStack(spacing: 12) {
            // Explicit prompt colour: dark mode draws the default placeholder
            // with vibrancy, which smears against the cream field.
            TextField(
                "", text: $query,
                prompt: Text("Type an English word").foregroundStyle(GameTheme.navy.opacity(0.45))
            )
            .textFieldStyle(GameTextFieldStyle())
            .focused(queryFieldFocused)
            .onSubmit(onSubmit)

            Button(action: onMicTap) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(isListening ? GameTheme.red : GameTheme.gold)
                    .symbolEffect(.pulse, isActive: isListening)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(isListening ? "Stop listening" : "Start listening")
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    @ViewBuilder
    private var resultsScroll: some View {
        if result != nil || !isHidden {
            ScrollView {
                LookupResultsColumn(
                    result: result,
                    displayedSenses: displayedSenses,
                    showMoreVisible: showMoreVisible,
                    presentation: presentation,
                    selectedSenseId: selectedSenseId,
                    keptSenseId: keptSenseId,
                    customKept: customKept,
                    onTap: onTap,
                    onKeep: onKeep,
                    onCamera: onCamera,
                    onSpeakCharacters: onSpeakCharacters,
                    onKeepCustom: onKeepCustom,
                    onStartTrial: onStartTrial,
                    onSubscribe: onSubscribe,
                    onRestore: onRestore,
                    onManage: onManage,
                    onRetry: onRetry,
                    onShowMore: onShowMore
                )
            }
            .scrollDismissesKeyboard(.interactively)
        } else {
            Spacer()
        }
    }

    private var isHidden: Bool {
        if case .hidden = presentation { return true }
        return false
    }
}

// One lookup's content: Pick state card, offline Senses, Show more. Split
// from LookupContentView's ScrollView so DesignSnapshotTests can render it
// bare — ImageRenderer draws ScrollView as a sliver and TextField as a
// no-entry placeholder (the repo's known traps), so the header and scroll
// chrome are device-verified instead.
struct LookupResultsColumn: View {
    let result: LookupResult?
    let displayedSenses: [Sense]
    let showMoreVisible: Bool
    let presentation: PickPresentation
    let selectedSenseId: Int64?
    let keptSenseId: Int64?
    let customKept: Bool
    let onTap: (Sense) -> Void
    let onKeep: (Sense) -> Void
    let onCamera: (Sense) -> Void
    let onSpeakCharacters: (String) -> Void
    let onKeepCustom: (String) -> Void
    var onStartTrial: () -> Void = {}
    var onSubscribe: () -> Void = {}
    var onRestore: () -> Void = {}
    var onManage: () -> Void = {}
    var onRetry: () -> Void = {}
    var onShowMore: () -> Void = {}

    var body: some View {
        LazyVStack(spacing: 10) {
            PickSectionView(
                presentation: presentation,
                selectedSenseId: selectedSenseId,
                keptSenseId: keptSenseId,
                customKept: customKept,
                onTap: onTap,
                onKeep: onKeep,
                onCamera: onCamera,
                onSpeakCharacters: onSpeakCharacters,
                onKeepCustom: onKeepCustom,
                onStartTrial: onStartTrial,
                onSubscribe: onSubscribe,
                onRestore: onRestore,
                onManage: onManage,
                onRetry: onRetry
            )
            if let result {
                if result.senses.isEmpty {
                    // The Pick/upsell/failure card above stays visible; this
                    // only describes the bundled dictionary.
                    Text("No offline results")
                        .font(GameTheme.title(20))
                        .foregroundStyle(GameTheme.cream.opacity(0.7))
                        .padding(.top, 40)
                } else {
                    ForEach(displayedSenses) { sense in
                        LookupResultRowView(
                            sense: sense,
                            selectedSenseId: selectedSenseId,
                            keptSenseId: keptSenseId,
                            onTap: onTap,
                            onKeep: onKeep,
                            onCamera: onCamera
                        )
                        .padding(.horizontal)
                    }
                    if showMoreVisible {
                        Button(action: onShowMore) {
                            Text("Show more")
                                .font(GameTheme.title(16))
                                .frame(maxWidth: .infinity, alignment: .center)
                                .foregroundStyle(GameTheme.cream.opacity(0.65))
                        }
                        .accessibilityLabel("Show more results")
                    }
                }
            }
            // Breathing room above the floating tab bar.
            Color.clear.frame(height: 24)
        }
        .padding(.top, 6)
    }
}
