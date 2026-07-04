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

// A quick side-to-side wobble; bump animatableData by 1 inside
// withAnimation to run one shake.
struct ShakeEffect: GeometryEffect {
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 6 * sin(animatableData * .pi * 6), y: 0))
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
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    DeckView()
                } label: {
                    Image(systemName: "rectangle.stack.fill")
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    ShopView()
                } label: {
                    Image(systemName: "cart.fill")
                }
            }
        }
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

    // ImageRenderer (DesignSnapshotTests) never runs onAppear, so the deal
    // can't happen there - snapshots inject a hand instead. Live play leaves
    // this empty and deals as before.
    init(runState: Binding<RunState>, onVictory: @escaping () -> Void, onDefeat: @escaping () -> Void, previewHand: [CardRecord] = []) {
        _runState = runState
        self.onVictory = onVictory
        self.onDefeat = onDefeat
        _hand = State(initialValue: previewHand)
    }

    @ObservedObject private var gameStore = GameStore.shared
    @State private var hand: [CardRecord]
    @State private var playingCard: CardRecord?
    @State private var today = ReviewEngine.todayString()
    @State private var enemyShakes = 0
    @State private var partyShakes = 0
    @State private var damagePop: Int?
    @State private var enemyFlashes = false
    @State private var enemyLunges = false
    @State private var enemyDefeated = false

    var body: some View {
        VStack(spacing: 20) {
            if let lastError = gameStore.lastError {
                errorBanner(lastError)
            }

            enemyView
            hpBars

            Spacer()

            // The banner sits with the hand it labels: these are the
            // current player's cards.
            turnIndicator
            handView
        }
        .padding()
        .background(DungeonBackground())
        .environment(\.colorScheme, .dark)
        .onAppear {
            today = ReviewEngine.todayString()
            // Live play always lands here with an empty hand (fresh floor
            // identity); only an injected previewHand skips the deal.
            if hand.isEmpty { dealHandForCurrentTurn() }
        }
        // Swiping the sheet away without grading is allowed on purpose:
        // dad arbitrates, and grade inflation is parenting, not a bug
        // (see the plan's accepted risks). The card just comes back.
        .sheet(item: $playingCard) { card in
            CardPlayView(card: card) { result in
                grade(card: card, result: result)
            }
        }
        .onChange(of: runState.enemyHP) { old, new in
            guard new < old else { return }
            SFXPlayer.shared.play(.hit)
            damagePop = old - new
            // Two-step pulses need a real suspension between the writes:
            // synchronous set-then-unset coalesces into one transaction and
            // the flash never shows (Code Patrol caught both pulses here).
            withAnimation(.linear(duration: 0.05)) { enemyFlashes = true }
            Task {
                try? await Task.sleep(for: .seconds(0.12))
                withAnimation(.easeOut(duration: 0.3)) { enemyFlashes = false }
            }
            withAnimation(.linear(duration: 0.3)) { enemyShakes += 1 }
            // enemyShakes doubles as the pop's generation token: a second
            // hit inside the 0.7s must not have its pop cleared early by
            // the first hit's sleeper.
            let generation = enemyShakes
            Task {
                try? await Task.sleep(for: .seconds(0.7))
                guard enemyShakes == generation else { return }
                withAnimation(.easeOut(duration: 0.4)) { damagePop = nil }
            }
        }
        .onChange(of: runState.partyHP) { old, new in
            guard new < old else { return }
            SFXPlayer.shared.play(.whiff)
            // The enemy lunges down at the party, then springs back. Same
            // deferred-unset rule as the flash above.
            withAnimation(.easeIn(duration: 0.15)) { enemyLunges = true }
            Task {
                try? await Task.sleep(for: .seconds(0.18))
                withAnimation(.spring(duration: 0.4)) { enemyLunges = false }
            }
            withAnimation(.linear(duration: 0.3).delay(0.1)) { partyShakes += 1 }
        }
    }

    private var currentFloor: RunState.Floor { runState.floors[runState.floorIndex] }

    private var enemyView: some View {
        VStack(spacing: 4) {
            Text(currentFloor.enemyName.capitalized)
                .font(GameTheme.title(16))
                .foregroundStyle(GameTheme.cream)
                .padding(.horizontal, 14)
                .padding(.vertical, 4)
                .background(Capsule().fill(GameTheme.deepNavy.opacity(0.8)))
                .overlay(Capsule().strokeBorder(GameTheme.gold.opacity(0.6), lineWidth: 1.5))
            ZStack(alignment: .bottom) {
                // Ground shadow anchors the enemy to a "stage".
                Ellipse()
                    .fill(.black.opacity(0.35))
                    .frame(width: enemySize * 0.8, height: 18)
                    .blur(radius: 3)
                EnemySpriteView(enemyName: currentFloor.enemyName, size: enemySize)
                    // A slow breathing bob so the enemy feels alive between turns.
                    .phaseAnimator([0.0, -6.0]) { view, offset in
                        view.offset(y: offset)
                    } animation: { _ in .easeInOut(duration: 1.2) }
                    .brightness(enemyFlashes ? 0.8 : 0)
                    .offset(y: enemyLunges ? 26 : 0)
                    .scaleEffect(enemyLunges ? 1.12 : 1, anchor: .bottom)
                    // The knockout: squash flat into the ground and fade.
                    .scaleEffect(x: enemyDefeated ? 1.3 : 1, y: enemyDefeated ? 0.05 : 1, anchor: .bottom)
                    .opacity(enemyDefeated ? 0 : 1)
                    .modifier(ShakeEffect(animatableData: CGFloat(enemyShakes)))
                if enemyDefeated {
                    HStack(spacing: 22) {
                        ForEach(0..<3, id: \.self) { star in
                            Image(systemName: "star.fill")
                                .font(.system(size: star == 1 ? 44 : 30))
                                .foregroundStyle(GameTheme.yellow)
                                .shadow(color: GameTheme.gold.opacity(0.8), radius: 8)
                        }
                    }
                    .padding(.bottom, enemySize * 0.35)
                    .transition(.scale(scale: 0.2).combined(with: .opacity))
                }
            }
            .overlay(alignment: .topTrailing) {
                if let damagePop {
                    Text("-\(damagePop)")
                        .font(GameTheme.title(42))
                        .foregroundStyle(GameTheme.yellow)
                        .shadow(color: GameTheme.red, radius: 0, x: 2, y: 2)
                        .transition(.offset(y: -24).combined(with: .opacity))
                }
            }
        }
    }

    private var enemySize: CGFloat { currentFloor.kind == .boss ? 180 : 145 }

    private var hpBars: some View {
        VStack(spacing: 10) {
            GameHPBar(icon: "bolt.fill", value: runState.enemyHP, max: currentFloor.maxHP, fill: GameTheme.red)
            GameHPBar(icon: "heart.fill", value: runState.partyHP, max: Balance.partyHP, fill: GameTheme.green)
                .modifier(ShakeEffect(animatableData: CGFloat(partyShakes)))
        }
        .padding(.horizontal, 8)
        .animation(.easeOut(duration: 0.35), value: runState.enemyHP)
        .animation(.easeOut(duration: 0.35), value: runState.partyHP)
    }

    private var turnIndicator: some View {
        HStack(spacing: 8) {
            if let sprite = SpriteArt.playerImage(for: runState.turn) {
                Image(uiImage: sprite)
                    .resizable()
                    .interpolation(.none)
                    .scaledToFit()
                    .frame(width: 34, height: 34)
            }
            Text(runState.turn == .kid ? "Your turn" : "Dad's turn")
                .font(GameTheme.title(20))
                .foregroundStyle(GameTheme.navy)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
            .background(
                Capsule().fill(
                    LinearGradient(colors: [GameTheme.yellow, GameTheme.gold], startPoint: .top, endPoint: .bottom)
                )
            )
            .shadow(color: .black.opacity(0.4), radius: 4, y: 3)
            // A fresh identity per turn re-runs the insertion transition,
            // so the banner bounces in on every handover.
            .id(runState.turn)
            .transition(.scale(scale: 0.5).combined(with: .opacity))
            .animation(.spring(duration: 0.45, bounce: 0.5), value: runState.turn)
    }

    private var handView: some View {
        HStack(spacing: -6) {
            ForEach(Array(hand.enumerated()), id: \.element.id) { index, card in
                Button {
                    playingCard = card
                } label: {
                    HandCardView(card: card)
                }
                .buttonStyle(HandCardButtonStyle())
                // A slight fan, like cards held across the table.
                .rotationEffect(.degrees(Double(index - (hand.count - 1) / 2) * 5))
                .offset(y: abs(Double(index) - Double(hand.count - 1) / 2) * 10)
                .zIndex(Double(index))
            }
        }
        .padding(.bottom, 8)
        // No card plays during the knockout pause.
        .allowsHitTesting(!enemyDefeated)
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
        case .victory: celebrateEnemyDefeat()
        case .defeat: onDefeat()
        case nil: dealHandForCurrentTurn()
        }
    }

    // The knockout moment: let the final hit land, squash the enemy with a
    // star burst, then advance. A kill mid-pause is safe - enemyHP 0 is
    // already persisted, and TowerView's resume path replays the victory.
    private func celebrateEnemyDefeat() {
        Task {
            try? await Task.sleep(for: .seconds(0.35))
            SFXPlayer.shared.play(.enemyDown)
            withAnimation(.easeIn(duration: 0.4)) { enemyDefeated = true }
            try? await Task.sleep(for: .seconds(1.1))
            onVictory()
        }
    }
}

// One card in the hand: art window over the English word, framed like a
// real card. The kid picks by picture; the word is there for dad.
struct HandCardView: View {
    let card: CardRecord
    private let photos = CardPhotos()

    var body: some View {
        VStack(spacing: 6) {
            artView
                .frame(width: 76, height: 76)
            Text(card.english)
                .font(GameTheme.title(14))
                .foregroundStyle(GameTheme.navy)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: 80)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 10)
        .cardFrame()
    }

    @ViewBuilder
    private var artView: some View {
        if let filename = card.photoFilename, let photo = photos.load(filename: filename) {
            Image(uiImage: photo)
                .resizable()
                .scaledToFill()
                .frame(width: 76, height: 76)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        } else if let sprite = SpriteArt.cardImage(forEnglish: card.english) {
            Image(uiImage: sprite)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
        } else {
            Text(card.traditional)
                .font(GameTheme.title(40))
                .foregroundStyle(GameTheme.navy)
                .minimumScaleFactor(0.5)
        }
    }
}

struct HandCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 1.08 : 1)
            .offset(y: configuration.isPressed ? -12 : 0)
            .animation(.spring(duration: 0.25), value: configuration.isPressed)
    }
}
