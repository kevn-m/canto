import SwiftUI

// Shown for today's finished Run, whether just now (from TowerView's fight
// loop) or on a later reopen (loaded from GameStore). Displays the payout
// GameStore.finishRun already banked - this view never credits bux itself.
// Kid can't read, so icons and numbers carry the meaning, not sentences.
struct RunSummaryView: View {
    let state: RunState
    let outcome: BattleEngine.Outcome

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
                stat(icon: "bolt.fill", value: state.kidDamageDealt)
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
}
