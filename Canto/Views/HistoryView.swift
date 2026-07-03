import SwiftUI

struct HistoryView: View {
    private let logStore = LogStore.shared
    @State private var rows: [LookupRecord] = []

    var body: some View {
        List(rows) { row in
            HStack {
                VStack(alignment: .leading) {
                    Text(row.heardText)
                    Text(row.createdAt)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if !row.matched {
                    Text("Miss")
                        .font(.caption)
                        .foregroundStyle(.orange)
                } else if let chosen = row.chosenTraditional {
                    VStack(alignment: .trailing) {
                        Text(chosen)
                        if let jyutping = row.chosenJyutping {
                            Text(jyutping)
                                .font(.caption)
                        }
                    }
                    .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("History")
        .onAppear { rows = logStore.recentLookups() }
    }
}
