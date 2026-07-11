import SwiftUI

// Shown for today's finished Run, whether just now (from TowerView's fight
// loop) or on a later reopen (loaded from GameStore). Displays the payout
// GameStore.finishRun already banked - this view never credits bux itself.
// Kid can't read, so icons and numbers carry the meaning, not sentences.
struct RunSummaryView: View {
    let state: RunState
    let outcome: BattleEngine.Outcome
    var newBadges: [String] = []

    // Defeat happens mid-floor, so the current floor wasn't cleared.
    private var floorsClimbed: Int {
        outcome == .victory ? state.floors.count : state.floorIndex
    }

    private var payout: RunState.PayoutBreakdown { state.payoutBreakdown() }

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: outcome == .victory ? "trophy.fill" : "heart.slash.fill")
                .font(.system(size: 72))
                .foregroundStyle(outcome == .victory ? GameTheme.yellow : GameTheme.red)
                .shadow(color: (outcome == .victory ? GameTheme.gold : GameTheme.red).opacity(0.6), radius: 18)
                // A little celebratory rock so the trophy isn't a static icon.
                .phaseAnimator(outcome == .victory ? [-4.0, 4.0] : [0.0]) { view, angle in
                    view.rotationEffect(.degrees(angle))
                } animation: { _ in .easeInOut(duration: 0.9) }
            Text(outcome == .victory ? "Victory!" : "Defeat")
                .font(GameTheme.title(40))
                .foregroundStyle(GameTheme.cream)

            HStack(spacing: 32) {
                stat(icon: "bolt.fill", value: state.damageDealt)
                stat(icon: "square.stack.3d.up.fill", value: floorsClimbed)
                if state.extensionsTaken > 0 {
                    stat(icon: "door.left.hand.open", value: state.extensionsTaken)
                }
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 28)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(GameTheme.deepNavy.opacity(0.7))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(GameTheme.gold.opacity(0.5), lineWidth: 2))
            )

            payoutView

            if !newBadges.isEmpty {
                badgesView
            }

            Text("Come back tomorrow!")
                .font(GameTheme.title(18))
                .foregroundStyle(GameTheme.cream.opacity(0.6))

            NavigationLink("Shop") { ShopView() }
                .buttonStyle(GameButtonStyle())
        }
        .padding()
    }

    private var payoutView: some View {
        VStack(spacing: 4) {
            HStack(spacing: 8) {
                Image(systemName: "dollarsign.circle.fill").font(.title)
                Text("+\(payout.total)").font(GameTheme.title(30))
            }
            .foregroundStyle(GameTheme.yellow)
            .shadow(color: GameTheme.gold.opacity(0.7), radius: 10)
            if payout.bossBonus > 0 || payout.extensions > 0 {
                Text("finish +\(payout.finish)"
                    + (payout.bossBonus > 0 ? ", boss +\(payout.bossBonus)" : "")
                    + (payout.extensions > 0 ? ", extensions +\(payout.extensions)" : ""))
                    .font(.caption)
                    .foregroundStyle(GameTheme.cream.opacity(0.55))
            }
        }
    }

    private func stat(icon: String, value: Int) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.title2).foregroundStyle(GameTheme.gold)
            Text("\(value)").font(GameTheme.title(22)).foregroundStyle(GameTheme.cream)
        }
    }

    // Its own visual row, not folded into the payout text: a badge is an
    // achievement, not a bux line item.
    private var badgesView: some View {
        HStack(spacing: 14) {
            ForEach(Array(newBadges.enumerated()), id: \.offset) { index, badgeId in
                BadgePopView(badgeId: badgeId, delay: Double(index) * 0.4)
            }
        }
        .padding(.vertical, 4)
    }
}

// One newly earned badge, popping in with a spring after its stagger delay
// so several badges don't all slam in at once. Sprite art ships in Slice 6;
// SF Symbol stands in until then.
private struct BadgePopView: View {
    let badgeId: String
    let delay: Double

    @State private var visible = false

    var body: some View {
        Image(systemName: "rosette")
            .font(.system(size: 40))
            .foregroundStyle(GameTheme.gold)
            .shadow(color: GameTheme.gold.opacity(0.6), radius: 8)
            .scaleEffect(visible ? 1 : 0.01)
            .opacity(visible ? 1 : 0)
            // The stagger is the animation's own delay, not a slept Task:
            // onAppear flips the state at once (so a static render shows the
            // badge), and only the spring is deferred.
            .onAppear {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.55).delay(delay)) {
                    visible = true
                }
            }
    }
}
