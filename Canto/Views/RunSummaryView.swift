import SwiftUI

// Shown for today's finished Run, whether just now (from TowerView's fight
// loop) or on a later reopen (loaded from GameStore). No CantoBux here yet -
// payouts are Slice 5's wiring. Kid can't read, so icons and numbers carry
// the meaning, not sentences.
struct RunSummaryView: View {
    let state: RunState
    let outcome: BattleEngine.Outcome

    // Defeat happens mid-floor, so the current floor wasn't cleared.
    private var floorsClimbed: Int {
        outcome == .victory ? state.floors.count : state.floorIndex
    }

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

            Text("Come back tomorrow!")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private func stat(icon: String, value: Int) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.title2)
            Text("\(value)").font(.title2.bold())
        }
    }
}
