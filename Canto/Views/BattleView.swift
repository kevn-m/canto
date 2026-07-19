import SwiftUI

// Pure hand-dealing glue (rule 1 in the tech plan): due cards most-overdue
// first, filled from the soonest-due, excluding cards already dealt this
// Run. If that leaves nothing (the player's whole deck has been dealt
// already), fall back to the least-recently-played cards, ignoring the
// once-per-Run rule - the game must never stall, and no fixed trio may
// loop for the rest of the climb.
enum BattleEngine {
    enum Outcome { case victory, defeat }

    // Steps 4 and 6 of the battle rules, pure so they're testable and so
    // Slice 4 can reuse them on a persisted RunState. Only the PLAYED card
    // joins dealt - marking the whole shown hand would let a kid dodge the
    // hard words forever by always playing the easy one (ADR 0005).
    static func applyResult(_ result: ReviewResult, card: CardRecord, to state: inout RunState) -> Outcome? {
        state.dealt.append(card.id)
        switch result {
        case .hit:
            let damage = ReviewEngine.damage(forBox: card.box)
            state.enemyHP -= damage
            state.damageDealt += damage
        case .whiff:
            state.partyHP -= Balance.enemyAttack
        }
        if state.enemyHP <= 0 { return .victory }
        if state.partyHP <= 0 { return .defeat }
        return nil
    }

    static func dealHand(store: GameStore, dealt: [Int64], today: String) -> [CardRecord] {
        let played = Set(dealt)
        let due = store.dueCards(on: today, excluding: played)
        // Always leave room for one not-yet-due card (ReviewEngine.hand's
        // due cap) so a hand is never three chronic whiffs.
        let fill = store.nextCards(
            excluding: played.union(due.map(\.id)),
            limit: 3 - min(due.count, 2)
        )
        let hand = ReviewEngine.hand(due: due, soonest: fill)
        guard hand.isEmpty else { return hand }

        var lastPlayed: [Int64: Int] = [:]
        for (index, id) in dealt.enumerated() { lastPlayed[id] = index }
        return Array(
            store.nextCards(excluding: [], limit: Int.max)
                .sorted { a, b in
                    let aIndex = lastPlayed[a.id, default: -1]
                    let bIndex = lastPlayed[b.id, default: -1]
                    return aIndex != bIndex ? aIndex < bIndex : a.box < b.box
                }
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
    @State private var streak = 0

    var body: some View {
        Group {
            if deckSize < Balance.deckUnlockSize {
                TowerLockedView(deckSize: deckSize)
            } else {
                TowerView(onRunFinished: refreshStreak)
            }
        }
        // No title: the hallway backdrop is the label (Kevin's show-don't-
        // label rule). Inline mode keeps the bar from reserving large-title
        // space above the fight.
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        // Not a toolbar item: iOS 26 clips each item to its glass circle,
        // which cut the count badge off the flame (seen on device).
        // Only from day 2 onward - a "1" every single day is noise.
        .overlay(alignment: .topLeading) {
            if streak >= 2 {
                StreakFlameChip(streak: streak)
                    .padding(.leading, 16)
            }
        }
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
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    BadgesView()
                } label: {
                    if let trophy = SpriteArt.image(named: "shelf-trophy") {
                        Image(uiImage: trophy)
                            .resizable()
                            .interpolation(.none)
                            .scaledToFit()
                            .frame(width: 22, height: 22)
                    } else {
                        Image(systemName: "trophy.fill")
                    }
                }
            }
        }
        .onAppear {
            // Sync before measuring, so the word just looked up counts
            // towards the unlock the moment this screen opens.
            gameStore.syncDeck(from: LogStore.shared)
            deckSize = gameStore.deckSize()
            refreshStreak()
        }
    }

    private func refreshStreak() {
        streak = StreakEngine.length(dates: gameStore.finishedRunDates(), today: ReviewEngine.todayString())
    }
}

// The streak as a HUD ornament: the count sits ON the flame like a
// notification badge, and hit testing is off, so it can't read as a button.
struct StreakFlameChip: View {
    let streak: Int

    var body: some View {
        // Negative spacing tucks the capsule under the flame's trailing edge;
        // a longer count grows AWAY from the flame, never over it.
        HStack(alignment: .bottom, spacing: -7) {
            if let flame = SpriteArt.image(named: "streak-flame") {
                Image(uiImage: flame)
                    .resizable()
                    .interpolation(.none)
                    .scaledToFit()
                    .frame(width: 30, height: 30)
            } else {
                Image(systemName: "flame.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(.orange)
            }
            Text("\(streak)")
                .font(GameTheme.title(12))
                .foregroundStyle(GameTheme.navy)
                .padding(.horizontal, 5)
                .padding(.vertical, 1)
                .background(Capsule().fill(GameTheme.gold))
                .overlay(Capsule().strokeBorder(GameTheme.deepNavy, lineWidth: 1.5))
                .offset(y: -1)
        }
        .allowsHitTesting(false)
    }
}

// The tower before it's earned: the dungeon backdrop sealed behind a gold
// padlock, with one pip per word still to collect so a kid who can't read
// the count can still see the gap close.
struct TowerLockedView: View {
    let deckSize: Int
    @ObservedObject private var gameStore = GameStore.shared

    var body: some View {
        VStack(spacing: 24) {
            // A broken game.sqlite reads as deckSize 0, which looks exactly
            // like "not enough words yet" - the error must show here too
            // (ADR 0009), not just inside the fight screen.
            if let lastError = gameStore.lastError {
                ErrorBanner(message: lastError) { gameStore.clearError() }
            }
            Spacer()
            lockBadge
            VStack(spacing: 16) {
                Text("\(deckSize) / \(Balance.deckUnlockSize) words collected")
                    .font(GameTheme.title(24))
                    .foregroundStyle(GameTheme.cream)
                WordPips(collected: deckSize, total: Balance.deckUnlockSize)
                    .padding(.horizontal, 32)
            }
            Text("Add words to start your climb")
                .font(GameTheme.title(16))
                .foregroundStyle(GameTheme.cream.opacity(0.6))
                .multilineTextAlignment(.center)
            Spacer()
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DungeonBackground())
        .environment(\.colorScheme, .dark)
    }

    // A gold padlock in a deepNavy node, matching the tower-map floors so the
    // locked screen reads as the same place, just sealed.
    private var lockBadge: some View {
        ZStack {
            Circle()
                .fill(GameTheme.deepNavy.opacity(0.85))
                .frame(width: 128, height: 128)
                .overlay(Circle().strokeBorder(GameTheme.gold.opacity(0.5), lineWidth: 3))
            Image(systemName: "lock.fill")
                .font(.system(size: 58, weight: .bold))
                .foregroundStyle(
                    LinearGradient(colors: [GameTheme.yellow, GameTheme.gold], startPoint: .top, endPoint: .bottom)
                )
                .shadow(color: GameTheme.gold.opacity(0.55), radius: 12)
        }
        .phaseAnimator([1.0, 1.04]) { view, scale in
            view.scaleEffect(scale)
        } animation: { _ in .easeInOut(duration: 1.2) }
    }
}

// One pip per word to unlock, gold once collected, dark while still to earn.
private struct WordPips: View {
    let collected: Int
    let total: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<total, id: \.self) { index in
                Capsule()
                    .fill(
                        index < collected
                            ? AnyShapeStyle(LinearGradient(colors: [GameTheme.yellow, GameTheme.gold], startPoint: .top, endPoint: .bottom))
                            : AnyShapeStyle(GameTheme.deepNavy)
                    )
                    .overlay(Capsule().strokeBorder(.black.opacity(0.4), lineWidth: 1.5))
                    .frame(height: 16)
            }
        }
    }
}

// A Box change worth showing: which Card and what happened to it. The UUID
// gives each ceremony a fresh view identity, so a second one in the same
// battle re-fires CardCeremonyView's onAppear settle instead of reusing a
// view SwiftUI thinks hasn't changed.
private struct PendingCardCeremony: Identifiable, Equatable {
    let id = UUID()
    let card: CardRecord
    let kind: CardCeremonyKind
}

// One fight: enemy, party HP, hand of 3, turn owner. All state changes read
// and write `runState` directly so the caller (Slice 4's TowerView) can
// swap in a persisted binding without touching this view.
struct BattleView: View {
    @Binding var runState: RunState
    var onVictory: () -> Void
    var onDefeat: () -> Void
    var onAbandon: () -> Void

    // ImageRenderer (DesignSnapshotTests) never runs onAppear, so the deal
    // can't happen there - snapshots inject a hand instead. Live play leaves
    // this empty and deals as before. A snapshot can override the avatar and
    // gear the same way, so it doesn't need a seeded database.
    //
    // The gear is read HERE, not in onAppear. Reading it later means the first
    // frame renders the shipped kid wearing nothing, and the player watches their
    // avatar and armour fade in on top - a costume change every time a floor loads.
    init(
        runState: Binding<RunState>, onVictory: @escaping () -> Void, onDefeat: @escaping () -> Void,
        onAbandon: @escaping () -> Void, previewHand: [CardRecord] = [],
        previewAvatarId: String? = nil, previewEquipped: [GearSlot: String]? = nil
    ) {
        _runState = runState
        self.onVictory = onVictory
        self.onDefeat = onDefeat
        self.onAbandon = onAbandon
        _hand = State(initialValue: previewHand)
        _avatarId = State(initialValue: previewAvatarId ?? GameStore.shared.avatarId())
        _equipped = State(initialValue: previewEquipped ?? GameStore.shared.equippedGear())
        usesPreviewLook = previewAvatarId != nil || previewEquipped != nil
    }

    private let usesPreviewLook: Bool

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
    @State private var heroLunges = false
    @State private var slashShows = false
    @State private var heroFlashes = false
    @State private var impactShows = false
    @State private var heroAttackGeneration = 0
    @State private var heroHitGeneration = 0
    @State private var enemyFlashGeneration = 0
    @State private var enemyLungeGeneration = 0
    @State private var confirmingAbandon = false
    @State private var avatarId: String?
    @State private var equipped: [GearSlot: String]
    @State private var pendingCeremony: PendingCardCeremony?
    @State private var turnLocked = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 20) {
            if let lastError = gameStore.lastError {
                errorBanner(lastError)
            }

            abandonButton

            Spacer(minLength: 0)

            HStack(alignment: .bottom) {
                heroView
                Spacer()
                enemyView
            }
            hpBars

            Spacer(minLength: 0)

            handView
        }
        .padding()
        .background(BiomeBackground(biome: Biome.containing(enemyName: currentFloor.enemyName)))
        .environment(\.colorScheme, .dark)
        // Hand and Give up go dead from the moment a ceremony is scheduled
        // until its outcome resolves - the 0.7s pre-ceremony beat would
        // otherwise leave the old hand tappable and let a second grade race
        // the first. The overlay below is added after this modifier so it
        // keeps its own hit testing.
        .allowsHitTesting(!turnLocked)
        .onAppear {
            today = ReviewEngine.todayString()
            // Live play always lands here with an empty hand (fresh floor
            // identity); only an injected previewHand skips the deal.
            if hand.isEmpty { dealHand() }
            // Re-read the look here too: the Shop pushes OVER an active fight,
            // so init's snapshot goes stale if gear changes mid-run. onAppear
            // fires again on pop-back and the hero visibly swaps into the new kit.
            if !usesPreviewLook {
                avatarId = GameStore.shared.avatarId()
                equipped = GameStore.shared.equippedGear()
            }
        }
        // Swiping the sheet away without grading is allowed on purpose:
        // dad arbitrates, and grade inflation is parenting, not a bug
        // (see the plan's accepted risks). The card just comes back.
        .sheet(item: $playingCard) { card in
            CardPlayView(card: card, biome: Biome.containing(enemyName: currentFloor.enemyName)) { result in
                grade(card: card, result: result)
            }
        }
        .confirmationDialog("Give up this climb?", isPresented: $confirmingAbandon, titleVisibility: .visible) {
            Button("Give up", role: .destructive) { onAbandon() }
            Button("Keep going", role: .cancel) {}
        } message: {
            Text("Ends the climb now. No CantoBux for an unfinished climb.")
        }
        .onChange(of: runState.enemyHP) { old, new in
            guard new < old else { return }
            SFXPlayer.shared.play(.hit)
            damagePop = old - new
            // The hero darts in, the slash lands, then the enemy's own
            // flash/shake/pop plays exactly as it always has below.
            heroAttackGeneration += 1
            let attackGeneration = heroAttackGeneration
            withAnimation(.easeIn(duration: 0.12)) { heroLunges = true }
            Task {
                try? await Task.sleep(for: .seconds(0.12))
                guard heroAttackGeneration == attackGeneration else { return }
                withAnimation(.linear(duration: 0.05)) { slashShows = true }
                try? await Task.sleep(for: .seconds(0.18))
                guard heroAttackGeneration == attackGeneration else { return }
                withAnimation(.spring(duration: 0.35)) { heroLunges = false }
                withAnimation(.easeOut(duration: 0.2)) { slashShows = false }
            }
            // Two-step pulses need a real suspension between the writes:
            // synchronous set-then-unset coalesces into one transaction and
            // the flash never shows (Code Patrol caught both pulses here).
            enemyFlashGeneration += 1
            let flashGeneration = enemyFlashGeneration
            withAnimation(.linear(duration: 0.05)) { enemyFlashes = true }
            Task {
                try? await Task.sleep(for: .seconds(0.12))
                guard enemyFlashGeneration == flashGeneration else { return }
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
            enemyLungeGeneration += 1
            let lungeGeneration = enemyLungeGeneration
            withAnimation(.easeIn(duration: 0.15)) { enemyLunges = true }
            Task {
                try? await Task.sleep(for: .seconds(0.18))
                guard enemyLungeGeneration == lungeGeneration else { return }
                withAnimation(.spring(duration: 0.4)) { enemyLunges = false }
            }
            withAnimation(.linear(duration: 0.3).delay(0.1)) { partyShakes += 1 }
            // The hero flashes and takes an impact when the enemy's lunge
            // above actually connects.
            heroHitGeneration += 1
            let hitGeneration = heroHitGeneration
            Task {
                try? await Task.sleep(for: .seconds(0.15))
                guard heroHitGeneration == hitGeneration else { return }
                withAnimation(.linear(duration: 0.05)) { heroFlashes = true; impactShows = true }
                try? await Task.sleep(for: .seconds(0.2))
                guard heroHitGeneration == hitGeneration else { return }
                withAnimation(.easeOut(duration: 0.2)) { heroFlashes = false; impactShows = false }
            }
        }
        // An overlay, not a sheet - a sheet can be swiped away or dismissed,
        // which would let the fight race ahead of the Box feedback it's showing.
        .overlay {
            if let pending = pendingCeremony {
                CardCeremonyView(card: pending.card, kind: pending.kind, reduceMotion: reduceMotion)
                    .id(pending.id)
            }
        }
    }

    private var currentFloor: RunState.Floor { runState.floors[runState.floorIndex] }

    private var heroView: some View {
        ZStack(alignment: .bottom) {
            // Ground shadow anchors the hero to the same "stage" as the enemy.
            Ellipse()
                .fill(.black.opacity(0.35))
                .frame(width: heroSize * 0.8, height: 18)
                .blur(radius: 3)
            AvatarSpriteView(size: heroSize, avatarId: avatarId, equipped: equipped)
                // A slow breathing bob so the hero feels alive between turns.
                .phaseAnimator([0.0, -6.0]) { view, offset in
                    view.offset(y: offset)
                } animation: { _ in .easeInOut(duration: 1.2) }
                .brightness(heroFlashes ? 0.8 : 0)
                .offset(x: heroLunges ? 36 : 0)
                .scaleEffect(heroLunges ? 1.08 : 1, anchor: .bottom)
                .modifier(ShakeEffect(animatableData: CGFloat(partyShakes)))
            if impactShows, let impact = SpriteArt.image(named: "fx-impact") {
                Image(uiImage: impact)
                    .resizable()
                    .interpolation(.none)
                    .frame(width: heroSize * 0.6, height: heroSize * 0.6)
                    // Lifted off the bottom edge so the burst lands on the
                    // hero's body, not down in the ground shadow.
                    .padding(.bottom, heroSize * 0.15)
                    .transition(.opacity)
            }
        }
    }

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
                if slashShows, let slash = SpriteArt.image(named: "fx-slash") {
                    Image(uiImage: slash)
                        .resizable()
                        .interpolation(.none)
                        .frame(width: enemySize * 0.6, height: enemySize * 0.6)
                        // Lands on the enemy's body rather than its feet.
                        .padding(.bottom, enemySize * 0.15)
                        .transition(.opacity)
                }
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

    private var enemySize: CGFloat { currentFloor.kind == .boss ? 210 : 170 }

    // Smaller than the enemy on purpose - the tower should look like it
    // outmatches the kid.
    private var heroSize: CGFloat { 130 }

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

    // An escape hatch, not a main action - kept quiet in the corner so it
    // doesn't compete with the fight.
    private var abandonButton: some View {
        HStack {
            Spacer()
            Button {
                confirmingAbandon = true
            } label: {
                Image(systemName: "flag.fill")
                    .foregroundStyle(GameTheme.cream.opacity(0.6))
            }
        }
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
            dealHand()
        }
    }

    private func dealHand() {
        hand = BattleEngine.dealHand(store: gameStore, dealt: runState.dealt, today: today)
    }

    private func grade(card: CardRecord, result: ReviewResult) {
        // One-shot per presentation: a double-tap on Hit/Whiff must not
        // review the card twice.
        guard playingCard != nil else { return }
        playingCard = nil

        // A review that never persisted must not advance the fight - the
        // banner shows the failure and the same card can be played again.
        guard let transition = gameStore.recordReview(cardId: card.id, result: result, on: today) else {
            return
        }

        // No await between the commit above and this mutation - TowerView's
        // resume path only tolerates the ceremony's pause below, not a gap here.
        let outcome = BattleEngine.applyResult(result, card: card, to: &runState)

        guard let kind = transition.ceremony else {
            resolve(outcome)
            return
        }
        presentCeremony(card: card, kind: kind, then: outcome)
    }

    private func resolve(_ outcome: BattleEngine.Outcome?) {
        switch outcome {
        case .victory: celebrateEnemyDefeat()
        case .defeat: onDefeat()
        case nil: dealHand()
        }
    }

    // Box feedback for a Review that changed something worth showing: let the
    // Hit/Whiff impact land first, then the ceremony, then the outcome that
    // was already decided above - enemyDefeated only flips after the
    // ceremony clears, so a lethal Hit reads impact -> ceremony -> enemy down.
    private func presentCeremony(card: CardRecord, kind: CardCeremonyKind, then outcome: BattleEngine.Outcome?) {
        turnLocked = true
        let floorAtGrade = runState.floorIndex
        Task {
            try? await Task.sleep(for: .seconds(0.70))
            withAnimation(.spring(duration: 0.22)) {
                pendingCeremony = PendingCardCeremony(card: card, kind: kind)
            }
            try? await Task.sleep(for: .seconds(kind == .mastered ? 1.40 : 0.90))
            withAnimation(.easeOut(duration: 0.20)) {
                pendingCeremony = nil
            }
            try? await Task.sleep(for: .seconds(0.20))
            turnLocked = false
            // Tower's backgrounding self-heal replays a lethal outcome while
            // this task sleeps; resolving again would skip a floor.
            guard runState.floorIndex == floorAtGrade else { return }
            resolve(outcome)
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

// The Box feedback shown after a Review commits: what changed and where the
// Card sits now on the New/Learning/Solid/Mastered ladder. Kind is pure
// learning-domain data (ReviewEngine.swift) - all copy, colour, and treatment
// mapping lives here so the model stays UI-agnostic.
struct CardCeremonyView: View {
    let card: CardRecord
    let kind: CardCeremonyKind
    var reduceMotion: Bool = false

    @State private var settled = false

    static let stepLabels = ["New", "Learning", "Solid", "Mastered"]
    // Shared with the gold ring overlay so it always hugs cardFrame's edge.
    static let panelCornerRadius: CGFloat = 18

    private struct Style {
        let title: String
        let destination: Int
        let celebratory: Bool
        let strong: Bool
        let panelFace: Color
        let ink: Color
        let phrase: String
    }

    private var style: Style {
        switch kind {
        case .learning:
            return Style(
                title: "Learning", destination: 1, celebratory: false, strong: false,
                panelFace: GameTheme.cream, ink: GameTheme.navy, phrase: "is now Learning"
            )
        case .promoted(let to):
            // Promotions only ever land on Learning (1) or Solid (2);
            // 2 -> 3 is .mastered. Same out-of-range guard as damage(forBox:).
            if !(1...2).contains(to) {
                assertionFailure("CardCeremonyView got promoted(to:) outside 1...2: \(to)")
            }
            let destination = max(1, min(to, 2))
            let title = destination == 1 ? "Learning" : "Solid"
            return Style(
                title: title, destination: destination, celebratory: true, strong: false,
                panelFace: GameTheme.cream, ink: GameTheme.navy, phrase: "promoted to \(title)"
            )
        case .mastered:
            return Style(
                title: "Mastered", destination: 3, celebratory: true, strong: true,
                panelFace: GameTheme.cream, ink: GameTheme.navy, phrase: "mastered"
            )
        case .backToLearning:
            return Style(
                title: "Back to Learning", destination: 1, celebratory: false, strong: false,
                panelFace: GameTheme.navy, ink: GameTheme.cream, phrase: "back to Learning"
            )
        }
    }

    var body: some View {
        ZStack {
            GameTheme.deepNavy.opacity(0.82)
                .ignoresSafeArea()
            panel
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(card.traditional), \(card.jyutping), \(card.english): \(style.phrase)")
        .onAppear {
            // A small settle only - initial scale (0.96) already reads fine,
            // so an ImageRenderer snapshot caught before this runs still
            // shows the full meaning (see CLAUDE.md's ImageRenderer traps).
            guard !reduceMotion else { return }
            withAnimation(.spring(duration: 0.25)) { settled = true }
        }
    }

    private var panel: some View {
        VStack(spacing: 18) {
            Text(style.title)
                .font(GameTheme.title(style.strong ? 30 : 24))
                .foregroundStyle(style.celebratory ? GameTheme.gold : style.ink)
                .multilineTextAlignment(.center)
            Text(card.traditional)
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(style.ink)
                .minimumScaleFactor(0.4)
                .lineLimit(1)
            VStack(spacing: 2) {
                Text(card.jyutping)
                Text(card.english)
            }
            .font(.subheadline)
            .foregroundStyle(style.ink.opacity(0.65))
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .minimumScaleFactor(0.7)
            BoxLadder(
                destination: style.destination, celebratory: style.celebratory,
                strong: style.strong, ink: style.ink,
                risen: settled || reduceMotion
            )
        }
        .padding(28)
        .frame(maxWidth: 340)
        .cardFrame(face: style.panelFace, cornerRadius: Self.panelCornerRadius)
        // Mastered's larger gold border/glow: a supplementary ring outside
        // cardFrame's own border, not `selected`/`gilded` - those mean row
        // selection and the Pick's frame elsewhere and shouldn't be reused
        // for an unrelated "achievement" treatment.
        .overlay(
            RoundedRectangle(cornerRadius: Self.panelCornerRadius)
                .strokeBorder(GameTheme.gold, lineWidth: style.strong ? 5 : 0)
        )
        .shadow(color: style.strong ? GameTheme.gold.opacity(0.75) : .clear, radius: style.strong ? 18 : 0)
        .scaleEffect(reduceMotion || settled ? 1.0 : 0.96)
        .padding(.horizontal, 24)
    }
}

// New/Learning/Solid/Mastered: prior steps read as lit/connected, the
// destination is the one the player should notice. Promotions get a small
// rise on the destination dot; Mastered's emphasis lives on the panel
// border above instead, so its dot stays the same size as any other lit step.
private struct BoxLadder: View {
    let destination: Int
    let celebratory: Bool
    let strong: Bool
    let ink: Color
    let risen: Bool

    var body: some View {
        HStack(spacing: 4) {
            ForEach(CardCeremonyView.stepLabels.indices, id: \.self) { index in
                if index > 0 {
                    Rectangle()
                        .fill(ink.opacity(index <= destination ? 0.6 : 0.2))
                        .frame(height: 3)
                }
                step(index)
            }
        }
    }

    private func step(_ index: Int) -> some View {
        let isDestination = index == destination
        let isLit = index <= destination
        let gold = isDestination && celebratory
        return VStack(spacing: 4) {
            Circle()
                .fill(isLit ? (gold ? GameTheme.gold : ink.opacity(0.75)) : ink.opacity(0.25))
                .frame(width: isDestination ? 18 : 14, height: isDestination ? 18 : 14)
                .overlay(
                    Circle().strokeBorder(GameTheme.gold, lineWidth: gold ? (destination >= 2 ? 3 : 2) : 0)
                )
                .shadow(color: gold ? GameTheme.gold.opacity(0.6) : .clear, radius: gold ? (destination >= 2 ? 6 : 4) : 0)
                .offset(y: gold && !strong ? (risen ? 0 : 8) : 0)
            Text(CardCeremonyView.stepLabels[index])
                .font(.system(size: 10, weight: isDestination ? .bold : .regular))
                .foregroundStyle(isDestination ? ink : ink.opacity(0.5))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity)
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
            HStack(spacing: 2) {
                ForEach(0..<ReviewEngine.damage(forBox: card.box), id: \.self) { _ in
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(GameTheme.gold)
                }
            }
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
