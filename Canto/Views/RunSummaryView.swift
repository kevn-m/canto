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
                .foregroundStyle(outcome == .victory ? .yellow : .red)
            Text(outcome == .victory ? "Victory!" : "Defeat")
                .font(.largeTitle.bold())

            HStack(spacing: 32) {
                stat(icon: "bolt.fill", value: state.kidDamageDealt)
                stat(icon: "square.stack.3d.up.fill", value: floorsClimbed)
                if state.extensionsTaken > 0 {
                    stat(icon: "door.left.hand.open", value: state.extensionsTaken)
                }
            }

            payoutView

            Text("Come back tomorrow!")
                .font(.title3)
                .foregroundStyle(.secondary)

            NavigationLink("Shop") { ShopView() }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private var payoutView: some View {
        VStack(spacing: 4) {
            HStack(spacing: 8) {
                Image(systemName: "dollarsign.circle.fill").font(.title)
                Text("+\(payout.total)").font(.title.bold())
            }
            .foregroundStyle(.yellow)
            if payout.bossBonus > 0 || payout.extensions > 0 {
                Text("finish +\(payout.finish)"
                    + (payout.bossBonus > 0 ? ", boss +\(payout.bossBonus)" : "")
                    + (payout.extensions > 0 ? ", extensions +\(payout.extensions)" : ""))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func stat(icon: String, value: Int) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.title2)
            Text("\(value)").font(.title2.bold())
        }
    }
}
