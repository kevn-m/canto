import SwiftUI

// Where a Run happens. The biome is never persisted - it's derived from the
// floors' enemy names, so old saved runs resume as .tower for free and the
// schema never changes.
enum Biome: CaseIterable {
    case tower, forest, desert

    var fightEnemies: [String] {
        switch self {
        case .tower: return ["slime", "bat"]
        case .forest: return ["mushroom", "snail"]
        case .desert: return ["cactus", "scorpion"]
        }
    }

    var bossEnemy: String {
        switch self {
        case .tower: return "dragon"
        case .forest: return "wolf"
        case .desert: return "mummy"
        }
    }

    var floors: [RunState.Floor] {
        fightEnemies.map { RunState.Floor(kind: .fight, enemyName: $0, maxHP: Balance.fightHP) }
            + [RunState.Floor(kind: .boss, enemyName: bossEnemy, maxHP: Balance.bossHP)]
    }

    static func containing(enemyName: String) -> Biome {
        allCases.first { $0.fightEnemies.contains(enemyName) || $0.bossEnemy == enemyName } ?? .tower
    }

    static func random() -> Biome {
        allCases.randomElement() ?? .tower
    }
}

// Pure Run-progression rules (rule 6-7 in the tech plan): where a fight
// outcome leaves the Run - another floor, the door, or the end - kept out
// of the view body so it's testable the same way BattleEngine is.
enum TowerEngine {
    enum FloorOutcome: Equatable {
        case nextFloor
        case offerDoor
        case runFinished(BattleEngine.Outcome)
    }

    // Mutates floorIndex/enemyHP only on .nextFloor, so the caller always
    // persists exactly what this returned.
    static func advance(after outcome: BattleEngine.Outcome, state: inout RunState, dueCardsExist: Bool) -> FloorOutcome {
        guard outcome == .victory else { return .runFinished(.defeat) }
        guard state.floorIndex + 1 < state.floors.count else {
            // The door is capped: whiffed cards stay due all day, so an
            // uncapped door could grow the climb without bound.
            let doorOpen = dueCardsExist && state.extensionsTaken < Balance.maxExtensions
            return doorOpen ? .offerDoor : .runFinished(.victory)
        }
        state.floorIndex += 1
        state.enemyHP = state.floors[state.floorIndex].maxHP
        return .nextFloor
    }

    static let baseFloors: [RunState.Floor] = Biome.tower.floors

    static func makeFreshRun(biome: Biome = .tower) -> RunState {
        let floors = biome.floors
        return RunState(
            floors: floors,
            floorIndex: 0,
            enemyHP: floors[0].maxHP,
            partyHP: Balance.partyHP,
            dealt: [],
            damageDealt: 0,
            extensionsTaken: 0
        )
    }

    // The door (rule 7): appends a fight floor and points at it. Reuses the
    // run's biome fight enemy/HP, never the boss's.
    static func takeDoor(state: inout RunState) {
        let biome = Biome.containing(enemyName: state.floors[0].enemyName)
        state.floors.append(RunState.Floor(kind: .extensionFight, enemyName: biome.fightEnemies[0], maxHP: Balance.fightHP))
        state.floorIndex += 1
        state.enemyHP = Balance.fightHP
        state.extensionsTaken += 1
    }

    // A resumed RunState with no floors, or floorIndex outside them, would
    // trap BattleView on `floors[floorIndex]` - never host a fight on it.
    static func isValid(_ state: RunState) -> Bool {
        state.isStructurallyValid
    }

    // App killed after recordReview committed but before saveRun persisted
    // the updated `dealt` - merge in what actually got reviewed today so a
    // resumed Run can't re-deal (and re-review) the same card.
    static func reconcileDealt(in state: inout RunState, store: GameStore, today: String) {
        let reviewedToday = store.reviewedCardIds(on: today)
        let missing = reviewedToday.subtracting(Set(state.dealt))
        guard !missing.isEmpty else { return }
        state.dealt.append(contentsOf: missing)
    }
}

// The climb, boss on top: each floor is a node on a dotted path, the
// current fight lit and pulsing, the rest waiting in the dark.
struct TowerMapView: View {
    let floors: [RunState.Floor]
    let currentIndex: Int

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(floors.enumerated()).reversed(), id: \.offset) { index, floor in
                if index != floors.count - 1 {
                    pathDots
                }
                floorNode(floor, current: index == currentIndex)
            }
        }
    }

    private var pathDots: some View {
        VStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { _ in
                Circle()
                    .fill(GameTheme.cream.opacity(0.25))
                    .frame(width: 5, height: 5)
            }
        }
        .padding(.vertical, 6)
    }

    private func floorNode(_ floor: RunState.Floor, current: Bool) -> some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .fill(GameTheme.deepNavy.opacity(0.85))
                    .frame(width: nodeSize(floor) + 26, height: nodeSize(floor) + 26)
                    .overlay(
                        Circle().strokeBorder(
                            current ? GameTheme.gold : GameTheme.lavender.opacity(0.4),
                            lineWidth: current ? 4 : 2
                        )
                    )
                EnemySpriteView(enemyName: floor.enemyName, size: nodeSize(floor))
                    .saturation(current ? 1 : 0)
                    .opacity(current ? 1 : 0.45)
            }
            .phaseAnimator(current ? [1.0, 1.06] : [1.0]) { view, scale in
                view.scaleEffect(scale)
            } animation: { _ in .easeInOut(duration: 0.8) }
            Text(floor.enemyName.capitalized)
                .font(GameTheme.title(15))
                .foregroundStyle(current ? GameTheme.cream : GameTheme.cream.opacity(0.4))
        }
    }

    private func nodeSize(_ floor: RunState.Floor) -> CGFloat {
        floor.kind == .boss ? 72 : 54
    }
}

// Where to climb next, picked by boss portrait - no reading needed.
struct BiomePickerView: View {
    @Binding var selection: Biome

    var body: some View {
        HStack(spacing: 22) {
            ForEach(Biome.allCases, id: \.self) { biome in
                Button {
                    withAnimation(.spring(duration: 0.3)) { selection = biome }
                } label: {
                    ZStack {
                        Circle()
                            .fill(GameTheme.deepNavy.opacity(0.85))
                            .frame(width: 58, height: 58)
                            .overlay(
                                Circle().strokeBorder(
                                    biome == selection ? GameTheme.gold : GameTheme.lavender.opacity(0.4),
                                    lineWidth: biome == selection ? 3.5 : 2
                                )
                            )
                        EnemySpriteView(enemyName: biome.bossEnemy, size: 40)
                            .saturation(biome == selection ? 1 : 0)
                            .opacity(biome == selection ? 1 : 0.5)
                    }
                    .scaleEffect(biome == selection ? 1.12 : 1)
                }
            }
        }
    }
}

// The map: today's Run, resumed or fresh, climbing 2 fights + a boss with an
// optional extension door at the end. Runs repeat freely - an unfinished run
// resumes, a finished one just means the next tap starts a new climb.
struct TowerView: View {
    // The summary is a phase, not a push, so TowerEntryView never re-appears
    // after a climb - it needs telling that the streak may have grown.
    var onRunFinished: () -> Void = {}

    private enum Phase {
        case loading, notStarted, fighting, doorOffer, finished(BattleEngine.Outcome), corrupt
    }

    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var gameStore = GameStore.shared
    @State private var today = ReviewEngine.todayString()
    @State private var runId: Int64?
    @State private var runState = TowerEngine.makeFreshRun()
    @State private var phase: Phase = .loading
    // The picker's selection; map and backdrop preview exactly the run
    // Start will create. Random only as the first suggestion.
    @State private var nextBiome = Biome.random()

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView()
            case .notStarted:
                startView
            case .fighting:
                BattleView(
                    runState: $runState,
                    onVictory: { handleOutcome(.victory) },
                    onDefeat: { handleOutcome(.defeat) },
                    onAbandon: { abandonRun() }
                )
                    // Load-bearing: phase stays .fighting across floors, so
                    // without a per-floor identity BattleView would keep its
                    // stale hand instead of re-running onAppear's deal.
                    .id(runState.floorIndex)
            case .doorOffer:
                doorView
            case .finished(let outcome):
                VStack(spacing: 24) {
                    RunSummaryView(state: runState, outcome: outcome)
                    // Back to the start screen, not straight into a run:
                    // the next climb's biome is picked there.
                    Button("Climb again") { phase = .notStarted }
                        .buttonStyle(GameButtonStyle())
                }
            case .corrupt:
                corruptView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BiomeBackground(biome: currentBiome))
        .environment(\.colorScheme, .dark)
        .onAppear(perform: loadTodaysRun)
        // Catches a midnight crossed while backgrounded: reload picks up the
        // new day (fresh run) instead of playing on with yesterday's date.
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active { loadTodaysRun() }
        }
        // The kill-mid-run guard. The one-tick gap between recordReview
        // committing and this firing is accepted; reconcileDealt covers the
        // dealt list on resume, and the lost HP delta is tolerable.
        .onChange(of: runState) { _, newValue in
            guard let runId else { return }
            gameStore.saveRun(id: runId, state: newValue)
        }
    }

    // MARK: - Loading

    private func loadTodaysRun() {
        today = ReviewEngine.todayString()
        guard let run = gameStore.todaysRun(on: today) else {
            // Finished runs have no row to resume, and backgrounding fires
            // this reload - don't stomp the summary the kid just earned.
            // Climb Again still works from here (startRun uses `today`).
            if case .finished = phase { return }
            phase = .notStarted
            return
        }
        runId = run.id

        // Defence-in-depth: GameStore.todaysRun already rejects and clears
        // structurally invalid rows, so this should be unreachable - but a
        // trap on floors[floorIndex] would break the never-crash contract,
        // so the view refuses to fight on one anyway.
        guard TowerEngine.isValid(run.state) else {
            runState = run.state
            phase = .corrupt
            return
        }

        var resumedState = run.state
        TowerEngine.reconcileDealt(in: &resumedState, store: gameStore, today: today)

        // HP hit zero but the run isn't finished: the app died (or a write
        // failed) somewhere between the fight ending and its consequence
        // landing. Replay the outcome through the same rules as live play -
        // a pending floor advance resumes, a pending door re-offers, and
        // only a genuinely ended run finishes. Self-healing: a failed
        // finishRun here just retries on the next load.
        if resumedState.enemyHP <= 0 || resumedState.partyHP <= 0 {
            let outcome: BattleEngine.Outcome = resumedState.partyHP <= 0 ? .defeat : .victory
            switch TowerEngine.advance(after: outcome, state: &resumedState, dueCardsExist: dueCardsExist(for: resumedState)) {
            case .nextFloor:
                runState = resumedState
                phase = .fighting
            case .offerDoor:
                runState = resumedState
                phase = .doorOffer
            case .runFinished(let finalOutcome):
                gameStore.finishRun(id: run.id, state: resumedState)
                onRunFinished()
                runState = resumedState
                phase = .finished(finalOutcome)
            }
            return
        }

        runState = resumedState
        phase = .fighting
    }

    // MARK: - Actions

    private var currentBiome: Biome {
        switch phase {
        case .notStarted: return nextBiome
        case .fighting, .doorOffer, .finished:
            return Biome.containing(enemyName: runState.floors.first?.enemyName ?? "")
        case .loading, .corrupt: return .tower
        }
    }

    private func startRun() {
        let state = TowerEngine.makeFreshRun(biome: nextBiome)
        guard let id = gameStore.startRun(on: today, state: state) else {
            // nil is either an unfinished run already on disk (load and
            // resume it) or a write failure (lastError set; reload lands on
            // notStarted with the banner showing). Both resolve by reloading.
            loadTodaysRun()
            return
        }
        runId = id
        runState = state
        phase = .fighting
    }

    private func abandonRun() {
        guard let runId else { return }
        // Only drop to Start if the delete persisted; otherwise the unfinished
        // row survives and would resume, so keep the fight on screen with the
        // error banner rather than lie that the climb ended (ADR 0009).
        guard gameStore.abandonRun(id: runId) else { return }
        self.runId = nil
        phase = .notStarted
    }

    private func handleOutcome(_ outcome: BattleEngine.Outcome) {
        guard let runId else { return }
        switch TowerEngine.advance(after: outcome, state: &runState, dueCardsExist: dueCardsExist(for: runState)) {
        case .nextFloor:
            break
        case .offerDoor:
            phase = .doorOffer
        case .runFinished(let finalOutcome):
            gameStore.finishRun(id: runId, state: runState)
            onRunFinished()
            playFinishSounds(for: finalOutcome)
            phase = .finished(finalOutcome)
        }
    }

    private func takeDoor() {
        TowerEngine.takeDoor(state: &runState)
        phase = .fighting
    }

    private func declineDoor() {
        guard let runId else { return }
        gameStore.finishRun(id: runId, state: runState)
        onRunFinished()
        playFinishSounds(for: .victory)
        phase = .finished(.victory)
    }

    // Live finishes only - a summary reloaded on a later open stays quiet.
    private func playFinishSounds(for outcome: BattleEngine.Outcome) {
        SFXPlayer.shared.play(outcome == .victory ? .victory : .defeat)
        Task {
            try? await Task.sleep(for: .seconds(0.8))
            SFXPlayer.shared.play(.coin)
        }
    }

    // Excludes cards already played this Run: a card whiffed on the boss
    // floor is "due" all day but can't be re-dealt, so it must not open
    // the door on its own.
    private func dueCardsExist(for state: RunState) -> Bool {
        !gameStore.dueCards(on: today, excluding: Set(state.dealt)).isEmpty
    }

    // MARK: - Views

    private var startView: some View {
        VStack(spacing: 28) {
            if let lastError = gameStore.lastError {
                ErrorBanner(message: lastError) { gameStore.clearError() }
            }
            // No heading: the biome background and the map do the telling;
            // the map previews the exact run Start will create.
            TowerMapView(floors: nextBiome.floors, currentIndex: 0)
            biomePicker
            Button("Start") { startRun() }
                .buttonStyle(GameButtonStyle())
        }
        .padding()
    }

    private var biomePicker: some View {
        BiomePickerView(selection: $nextBiome)
    }

    private var doorView: some View {
        VStack(spacing: 24) {
            Image(systemName: "door.left.hand.open")
                .font(.system(size: 64))
                .foregroundStyle(GameTheme.gold)
            Text("Go deeper?")
                .font(GameTheme.title(34))
                .foregroundStyle(GameTheme.cream)
            Text("There are more due words - want another floor?")
                .foregroundStyle(GameTheme.cream.opacity(0.6))
            HStack(spacing: 20) {
                Button("Not today", action: declineDoor)
                    .buttonStyle(GameButtonStyle(prominent: false))
                Button("Go deeper!", action: takeDoor)
                    .buttonStyle(GameButtonStyle())
            }
        }
        .padding()
    }

    private var corruptView: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.orange)
            Text("Today's climb got scrambled")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            // GameStore clears bad rows on read, so reloading starts fresh.
            Button("Try again") { loadTodaysRun() }
                .buttonStyle(GameButtonStyle())
        }
        .padding()
    }
}
