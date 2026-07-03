import SwiftUI

struct SenseRowView: View {
    let sense: Sense

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(sense.traditional)
                .font(.largeTitle)
            Text(sense.jyutping)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(sense.gloss)
                .font(.caption)
                .foregroundStyle(.tertiary)
                .lineLimit(2)
        }
        .padding(.vertical, 4)
    }
}
