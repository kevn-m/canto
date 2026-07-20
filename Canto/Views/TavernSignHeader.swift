import SwiftUI

// The screen's name as a wooden sign hung on ropes, centre-aligned — the inn
// screens' replacement for the plain white navigation title. Screens that use
// it set .navigationTitle("") + inline display so the bar doesn't double up.
// Silkscreen (bundled, OFL) draws lowercase as small caps; that's the look.
struct TavernSignHeader: View {
    let title: String

    var body: some View {
        VStack(spacing: -3) {
            HStack(spacing: 74) {
                rope
                rope
            }
            .zIndex(1)
            plank
        }
        .rotationEffect(.degrees(-2))
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isHeader)
    }

    private var rope: some View {
        Capsule()
            .fill(GameTheme.bronze)
            .frame(width: 5, height: 26)
    }

    private var plank: some View {
        Text(title)
            .font(.custom("Silkscreen-Bold", size: 26))
            .foregroundStyle(GameTheme.yellow)
            .shadow(color: .black.opacity(0.6), radius: 0, x: 0, y: 2)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.horizontal, 26)
            .padding(.vertical, 16)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(LinearGradient(
                            colors: [
                                Color(red: 0.48, green: 0.26, blue: 0.16),
                                Color(red: 0.34, green: 0.17, blue: 0.11),
                            ],
                            startPoint: .top, endPoint: .bottom
                        ))
                    VStack(spacing: 12) {
                        ForEach(0..<2, id: \.self) { _ in
                            Rectangle().fill(.black.opacity(0.16)).frame(height: 1.5)
                        }
                    }
                    .padding(.horizontal, 8)
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(Color(red: 0.22, green: 0.11, blue: 0.07), lineWidth: 3)
                    nails
                }
            )
            .shadow(color: .black.opacity(0.45), radius: 6, y: 5)
    }

    private var nails: some View {
        GeometryReader { geo in
            ForEach(0..<4, id: \.self) { index in
                Circle()
                    .fill(GameTheme.gold)
                    .frame(width: 5, height: 5)
                    .position(
                        x: index.isMultiple(of: 2) ? 9 : geo.size.width - 9,
                        y: index < 2 ? 9 : geo.size.height - 9
                    )
            }
        }
    }
}
