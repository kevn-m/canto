import SwiftUI

// The trophy shelf: every catalogue badge, always - earned ones lit full
// colour, unearned ones dark silhouettes of the same sprite. A kid who can't
// read the count still sees exactly which sockets are still empty (Kevin's
// show-don't-label rule).
struct BadgesView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var earned: Set<String>
    private let previewEarned: [String]

    // ImageRenderer (DesignSnapshotTests) never runs onAppear's GameStore
    // read against a seeded database, so a snapshot injects earned ids
    // directly - same shape as BattleView's previewHand.
    init(previewEarned: [String] = []) {
        self.previewEarned = previewEarned
        _earned = State(initialValue: Set(previewEarned))
    }

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 16) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                // Scrolls because the catalogue grows: an unscrollable shelf
                // clips the last row silently on a small phone, hiding the very
                // sockets this screen exists to show.
                ScrollView {
                    BadgeShelf(earned: earned).padding()
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .environment(\.colorScheme, .dark)
        .onAppear {
            // Live play always arrives with previewEarned empty; only an
            // injected preview (snapshot tests) skips the GameStore read.
            if previewEarned.isEmpty {
                earned = Set(gameStore.earnedBadges().map(\.id))
            }
            // The shelf walks the catalogue, so an id the catalogue lost (a
            // rename) is one the kid earned and can no longer see. Say so.
            for id in earned.subtracting(BadgeEngine.all) {
                NSLog("BadgesView: earned badge %@ is not in BadgeEngine.all, so it has no shelf slot", id)
            }
        }
    }
}

// Split out so DesignSnapshotTests can render the shelf bare: ImageRenderer
// lays a ScrollView out as a sliver, the same trap NavigationStack sets.
// Snapshot this, never BadgesView.
struct BadgeShelf: View {
    let earned: Set<String>

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 18), count: 4)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 26) {
            ForEach(BadgeEngine.all, id: \.self) { id in
                BadgeSlotView(id: id, earned: earned.contains(id))
            }
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(GameTheme.brown.opacity(0.35))
                .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(GameTheme.gold.opacity(0.4), lineWidth: 3))
        )
    }
}

// One socket on the shelf. Earned: full-colour sprite, no disc fill behind
// it (the badge art carries its own gold rim, which fought a gold-gradient
// socket). Unearned: a dark disc, the same sprite dimmed and desaturated -
// a silhouette of what's still to come, not a blank.
private struct BadgeSlotView: View {
    let id: String
    let earned: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(earned ? AnyShapeStyle(.clear) : AnyShapeStyle(GameTheme.deepNavy))
                .overlay(Circle().strokeBorder(.black.opacity(0.35), lineWidth: earned ? 0 : 2))
            BadgeSpriteView(id: id, size: 52)
                .opacity(earned ? 1 : 0.25)
                .grayscale(earned ? 0 : 1)
        }
        // Sized by its column, capped at 64: a fixed 64 overflows the ~60pt
        // column on a 375pt-wide phone and the sockets overlap.
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 64)
        .shadow(color: earned ? GameTheme.gold.opacity(0.6) : .clear, radius: 8)
    }
}
