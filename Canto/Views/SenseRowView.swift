import SwiftUI

struct SenseRowView: View {
    let sense: Sense

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(sense.traditional)
                .font(.system(size: 40, weight: .bold))
                .foregroundStyle(GameTheme.navy)
            Text(sense.jyutping)
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.navy.opacity(0.7))
            Text(sense.gloss)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(GameTheme.lavender)
                .lineLimit(2)
        }
        .padding(.vertical, 4)
    }
}
