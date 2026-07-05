import SwiftUI

struct HistoryView: View {
    private let logStore = LogStore.shared
    @State private var rows: [LookupRecord] = []

    var body: some View {
        ZStack {
            InnBackground()
            List(rows) { row in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.heardText)
                            .font(GameTheme.title(18))
                            .foregroundStyle(GameTheme.cream)
                        Text(row.createdAt)
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(GameTheme.cream.opacity(0.5))
                    }
                    Spacer()
                    if !row.matched {
                        Text("Miss")
                            .font(GameTheme.title(13))
                            .foregroundStyle(GameTheme.gold)
                    } else if let chosen = row.chosenTraditional {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(chosen)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(GameTheme.cream)
                            if let jyutping = row.chosenJyutping {
                                Text(jyutping)
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(GameTheme.cream.opacity(0.55))
                            }
                        }
                    }
                }
                .padding(.vertical, 6)
                .listRowBackground(Color.clear)
                .listRowSeparatorTint(GameTheme.cream.opacity(0.12))
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("History")
        .onAppear { rows = logStore.recentLookups() }
    }
}
