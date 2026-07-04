import SwiftUI

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

    static let baseFloors: [RunState.Floor] = [
        RunState.Floor(kind: .fight, enemyName: "slime", maxHP: Balance.fightHP),
        RunState.Floor(kind: .fight, enemyName: "bat", maxHP: Balance.fightHP),
        RunState.Floor(kind: .boss, enemyName: "dragon", maxHP: Balance.bossHP),
    ]

    static func makeFreshRun() -> RunState {
        RunState(
            floors: baseFloors,
            floorIndex: 0,
            enemyHP: baseFloors[0].maxHP,
            partyHP: Balance.partyHP,
            turn: .kid,
            dealt: [:],
            kidDamageDealt: 0,
            extensionsTaken: 0
        )
    }

    // The door (rule 7): appends a fight floor and points at it. Reuses the
    // regular fight enemy/HP, never the boss's.
    static func takeDoor(state: inout RunState) {
        state.floors.append(RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: Balance.fightHP))
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
        for player in Player.allCases {
            let reviewedToday = store.reviewedCardIds(for: player, on: today)
            let missing = reviewedToday.subtracting(Set(state.dealt[player.rawValue] ?? []))
            guard !missing.isEmpty else { continue }
            state.dealt[player.rawValue, default: []].append(contentsOf: missing)
        }
    }
}

// The map: today's Run, resumed or fresh, climbing 2 fights + a boss with an
// optional extension door at the end. Runs repeat freely - an unfinished run
// resumes, a finished one just means the next tap starts a new climb.
struct TowerView: View {
    private enum Phase {
        case loading, notStarted, fighting, doorOffer, finished(BattleEngine.Outcome), corrupt
    }

    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var gameStore = GameStore.shared
    @State private var today = ReviewEngine.todayString()
    @State private var runId: Int64?
    @State private var runState = TowerEngine.makeFreshRun()
    @State private var phase: Phase = .loading

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView()
            case .notStarted:
                startView
            case .fighting:
                BattleView(runState: $runState, onVictory: { handleOutcome(.victory) }, onDefeat: { handleOutcome(.defeat) })
                    // Load-bearing: phase stays .fighting across floors, so
                    // without a per-floor identity BattleView would keep its
                    // stale hand instead of re-running onAppear's deal.
                    .id(runState.floorIndex)
            case .doorOffer:
                doorView
            case .finished(let outcome):
                VStack(spacing: 24) {
                    RunSummaryView(state: runState, outcome: outcome)
                    Button("Climb again") { startRun() }
                        .font(.title3.bold())
                        .buttonStyle(.borderedProminent)
                }
            case .corrupt:
                corruptView
            }
        }
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
                runState = resumedState
                phase = .finished(finalOutcome)
            }
            return
        }

        runState = resumedState
        phase = .fighting
    }

    // MARK: - Actions

    private func startRun() {
        let state = TowerEngine.makeFreshRun()
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

    private func handleOutcome(_ outcome: BattleEngine.Outcome) {
        guard let runId else { return }
        switch TowerEngine.advance(after: outcome, state: &runState, dueCardsExist: dueCardsExist(for: runState)) {
        case .nextFloor:
            break
        case .offerDoor:
            phase = .doorOffer
        case .runFinished(let finalOutcome):
            gameStore.finishRun(id: runId, state: runState)
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
        phase = .finished(.victory)
    }

    // Excludes cards already played this Run: a card whiffed on the boss
    // floor is "due" all day but can't be re-dealt, so it must not open
    // the door on its own.
    private func dueCardsExist(for state: RunState) -> Bool {
        Player.allCases.contains { player in
            let dealt = Set(state.dealt[player.rawValue] ?? [])
            return !gameStore.dueCards(for: player, on: today, excluding: dealt).isEmpty
        }
    }

    // MARK: - Views

    private var startView: some View {
        VStack(spacing: 24) {
            if let lastError = gameStore.lastError {
                ErrorBanner(message: lastError) { gameStore.clearError() }
            }
            VStack(spacing: 16) {
                ForEach(Array(TowerEngine.baseFloors.enumerated()), id: \.offset) { index, floor in
                    floorRow(floor, current: index == 0)
                }
            }
            Button("Start") { startRun() }
                .font(.title2.bold())
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func floorRow(_ floor: RunState.Floor, current: Bool) -> some View {
        HStack(spacing: 12) {
            EnemySpriteView(enemyName: floor.enemyName, size: 44)
                .saturation(current ? 1 : 0.3)
                .opacity(current ? 1 : 0.6)
            Text(floor.enemyName.capitalized)
                .fontWeight(current ? .bold : .regular)
        }
    }

    private var doorView: some View {
        VStack(spacing: 24) {
            Image(systemName: "door.left.hand.open")
                .font(.system(size: 64))
                .foregroundStyle(Color.accentColor)
            Text("Go deeper?")
                .font(.largeTitle.bold())
            Text("There are more due words - want another floor?")
                .foregroundStyle(.secondary)
            HStack(spacing: 20) {
                Button("Not today", action: declineDoor)
                Button("Go deeper!", action: takeDoor)
                    .buttonStyle(.borderedProminent)
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
                .font(.title2.bold())
            // GameStore clears bad rows on read, so reloading starts fresh.
            Button("Try again") { loadTodaysRun() }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
