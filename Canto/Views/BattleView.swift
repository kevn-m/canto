import SwiftUI

// Pure hand-dealing glue (rule 1 in the tech plan): due cards most-overdue
// first, filled from the soonest-due, excluding cards already dealt this
// Run. If that leaves nothing (the player's whole deck has been dealt
// already), fall back to the hardest cards, ignoring the once-per-Run rule -
// the game must never stall.
enum BattleEngine {
    enum Outcome { case victory, defeat }

    // Steps 4 and 6 of the battle rules, pure so they're testable and so
    // Slice 4 can reuse them on a persisted RunState. Only the PLAYED card
    // joins dealt - marking the whole shown hand would let a kid dodge the
    // hard words forever by always playing the easy one (ADR 0005).
    static func applyResult(_ result: ReviewResult, card: CardRecord, to state: inout RunState) -> Outcome? {
        state.dealt[state.turn.rawValue, default: []].append(card.id)
        switch result {
        case .hit:
            let damage = ReviewEngine.damage(forBox: card.box)
            state.enemyHP -= damage
            if state.turn == .kid { state.kidDamageDealt += damage }
        case .whiff:
            state.partyHP -= Balance.enemyAttack
        }
        if state.enemyHP <= 0 { return .victory }
        if state.partyHP <= 0 { return .defeat }
        state.turn = state.turn == .kid ? .dad : .kid
        return nil
    }

    static func dealHand(store: GameStore, player: Player, dealt: Set<Int64>, today: String) -> [CardRecord] {
        let due = store.dueCards(for: player, on: today, excluding: dealt)
        let fill = store.nextCards(
            for: player,
            excluding: dealt.union(due.map(\.id)),
            limit: max(0, 3 - due.count)
        )
        let hand = ReviewEngine.hand(due: due, soonest: fill)
        guard hand.isEmpty else { return hand }

        return Array(
            store.nextCards(for: player, excluding: [], limit: Int.max)
                .sorted { $0.box < $1.box }
                .prefix(3)
        )
    }
}

// GameStore.lastError, shown plainly wherever game screens live (ADR 0009).
struct ErrorBanner: View {
    let message: String
    var onDismiss: () -> Void

    var body: some View {
        HStack {
            Text(message).font(.footnote)
            Spacer()
            Button("Dismiss", action: onDismiss)
        }
        .padding(8)
        .background(Color.red.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// The Tower toolbar destination: gated on deck size, syncs new lookups into
// cards on appear, and hosts one fight. Floors/payouts are Slice 4/5.
struct TowerEntryView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var deckSize = 0

    var body: some View {
        Group {
            if deckSize < Balance.deckUnlockSize {
                lockedView(deckSize: deckSize)
            } else {
                TowerView()
            }
        }
        .navigationTitle("Tower")
        .onAppear {
            // Sync before measuring, so the word just looked up counts
            // towards the unlock the moment this screen opens.
            gameStore.syncDeck(from: LogStore.shared)
            deckSize = gameStore.deckSize()
        }
    }

    private func lockedView(deckSize: Int) -> some View {
        VStack(spacing: 20) {
            // A broken game.sqlite reads as deckSize 0, which looks exactly
            // like "not enough words yet" - the error must show here too
            // (ADR 0009), not just inside the fight screen.
            if let lastError = gameStore.lastError {
                ErrorBanner(message: lastError) { gameStore.clearError() }
            }
            Image(systemName: "lock.fill")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)
            Text("\(deckSize) / \(Balance.deckUnlockSize) words collected")
                .font(.title2.bold())
            ProgressView(value: Double(deckSize), total: Double(Balance.deckUnlockSize))
                .padding(.horizontal, 40)
            Text("Look things up to unlock the tower")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

// One fight: enemy, party HP, hand of 3, turn owner. All state changes read
// and write `runState` directly so the caller (Slice 4's TowerView) can
// swap in a persisted binding without touching this view.
struct BattleView: View {
    @Binding var runState: RunState
    var onVictory: () -> Void
    var onDefeat: () -> Void

    @ObservedObject private var gameStore = GameStore.shared
    @State private var hand: [CardRecord] = []
    @State private var playingCard: CardRecord?
    @State private var today = ReviewEngine.todayString()

    var body: some View {
        VStack(spacing: 20) {
            if let lastError = gameStore.lastError {
                errorBanner(lastError)
            }

            enemyView
            hpBars
            turnIndicator

            Spacer()

            handView
        }
        .padding()
        .onAppear {
            today = ReviewEngine.todayString()
            dealHandForCurrentTurn()
        }
        // Swiping the sheet away without grading is allowed on purpose:
        // dad arbitrates, and grade inflation is parenting, not a bug
        // (see the plan's accepted risks). The card just comes back.
        .sheet(item: $playingCard) { card in
            CardPlayView(card: card) { result in
                grade(card: card, result: result)
            }
        }
    }

    private var currentFloor: RunState.Floor { runState.floors[runState.floorIndex] }

    private var enemyView: some View {
        Image(systemName: enemySymbol(for: currentFloor.enemyName))
            .font(.system(size: 96))
            .foregroundStyle(.red)
    }

    // Placeholder art: Floor.enemyName keys the future sprite
    // (enemy-<name>); this maps it to an SF Symbol stand-in for now.
    private func enemySymbol(for enemyName: String) -> String {
        switch enemyName {
        case "slime": return "drop.fill"
        case "bat": return "bird.fill"
        case "dragon": return "flame.fill"
        default: return "ladybug.fill"
        }
    }

    private var hpBars: some View {
        VStack(spacing: 8) {
            hpBar(label: "Enemy", value: runState.enemyHP, max: currentFloor.maxHP, color: .red)
            hpBar(label: "Party", value: runState.partyHP, max: Balance.partyHP, color: .green)
        }
    }

    private func hpBar(label: String, value: Int, max maxValue: Int, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            ProgressView(value: Double(Swift.max(value, 0)), total: Double(maxValue))
                .tint(color)
        }
    }

    private var turnIndicator: some View {
        Text(runState.turn == .kid ? "🧒 Your turn" : "🧑 Dad's turn")
            .font(.title3.bold())
    }

    private var handView: some View {
        HStack(spacing: 16) {
            ForEach(hand) { card in
                Button {
                    playingCard = card
                } label: {
                    VStack {
                        Text(card.traditional).font(.largeTitle)
                        Image(systemName: "hand.tap.fill")
                    }
                    .frame(width: 90, height: 90)
                    .background(Color.accentColor.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }

    private func errorBanner(_ message: String) -> some View {
        ErrorBanner(message: message) {
            gameStore.clearError()
            // The failure may have starved the hand (empty reads);
            // re-deal so the fight can continue once the db recovers.
            dealHandForCurrentTurn()
        }
    }

    private func dealHandForCurrentTurn() {
        let player = runState.turn
        let dealt = Set(runState.dealt[player.rawValue] ?? [])
        hand = BattleEngine.dealHand(store: gameStore, player: player, dealt: dealt, today: today)
    }

    private func grade(card: CardRecord, result: ReviewResult) {
        // One-shot per presentation: a double-tap on Hit/Whiff must not
        // review the card twice.
        guard playingCard != nil else { return }
        playingCard = nil

        // A review that never persisted must not advance the fight - the
        // banner shows the failure and the same card can be played again.
        guard gameStore.recordReview(cardId: card.id, player: runState.turn, result: result, on: today) else {
            return
        }

        switch BattleEngine.applyResult(result, card: card, to: &runState) {
        case .victory: onVictory()
        case .defeat: onDefeat()
        case nil: dealHandForCurrentTurn()
        }
    }
}
