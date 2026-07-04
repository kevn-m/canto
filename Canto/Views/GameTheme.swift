import SwiftUI

// The battle system's shared look: PICO-8 palette (matching the sprites),
// the dungeon backdrop, card frames, chunky HP bars and buttons. Pure
// presentation - no game rules live here.
enum GameTheme {
    // Colours lifted from art/reference-sheet/sprites.js
    static let navy = Color(red: 0.114, green: 0.169, blue: 0.326)      // #1D2B53
    static let deepNavy = Color(red: 0.055, green: 0.078, blue: 0.165)
    static let cream = Color(red: 1.0, green: 0.945, blue: 0.910)       // #FFF1E8
    static let gold = Color(red: 1.0, green: 0.639, blue: 0.0)          // #FFA300
    static let yellow = Color(red: 1.0, green: 0.925, blue: 0.153)      // #FFEC27
    static let red = Color(red: 1.0, green: 0.0, blue: 0.302)           // #FF004D
    static let green = Color(red: 0.0, green: 0.894, blue: 0.212)       // #00E436
    static let sky = Color(red: 0.161, green: 0.678, blue: 1.0)         // #29ADFF
    static let lavender = Color(red: 0.514, green: 0.463, blue: 0.612)  // #83769C

    static func title(_ size: CGFloat) -> Font {
        .system(size: size, weight: .heavy, design: .rounded)
    }
}

// The dungeon: a dark gradient with two soft torch glows so sprites and
// gold frames pop. Sits behind every tower/battle screen.
struct DungeonBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [GameTheme.navy, GameTheme.deepNavy],
                startPoint: .top, endPoint: .bottom
            )
            Circle()
                .fill(GameTheme.gold.opacity(0.14))
                .frame(width: 300, height: 300)
                .blur(radius: 70)
                .offset(x: -130, y: -230)
            Circle()
                .fill(GameTheme.lavender.opacity(0.18))
                .frame(width: 260, height: 260)
                .blur(radius: 60)
                .offset(x: 150, y: 120)
        }
        .ignoresSafeArea()
    }
}

// The card face: cream front, gold double border, drop shadow. Used by the
// hand's mini cards and CardPlayView's big card.
struct CardFrame: ViewModifier {
    var face: Color = GameTheme.cream

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(face)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .strokeBorder(GameTheme.gold, lineWidth: 4)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 13)
                            .strokeBorder(GameTheme.navy.opacity(0.25), lineWidth: 1.5)
                            .padding(5)
                    )
            )
            .shadow(color: .black.opacity(0.45), radius: 6, y: 5)
    }
}

extension View {
    func cardFrame(face: Color = GameTheme.cream) -> some View {
        modifier(CardFrame(face: face))
    }
}

// A chunky segment-capped HP bar with the number spelled out - readable
// across the table by a kid who can't read words but can read bars.
struct GameHPBar: View {
    let icon: String
    let value: Int
    let max: Int
    let fill: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(fill)
                .frame(width: 22)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(GameTheme.deepNavy)
                        .overlay(Capsule().strokeBorder(.black.opacity(0.5), lineWidth: 2))
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [fill, fill.opacity(0.65)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .frame(width: geo.size.width * fraction)
                        .padding(3)
                }
            }
            .frame(height: 20)
            Text("\(Swift.max(value, 0))/\(max)")
                .font(GameTheme.title(15))
                .foregroundStyle(GameTheme.cream)
                .monospacedDigit()
                .frame(minWidth: 44, alignment: .trailing)
        }
    }

    private var fraction: CGFloat {
        guard max > 0 else { return 0 }
        return CGFloat(Swift.max(Swift.min(value, max), 0)) / CGFloat(max)
    }
}

// The one button look for game screens: gold capsule, navy text, springy press.
struct GameButtonStyle: ButtonStyle {
    var prominent = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(GameTheme.title(20))
            .foregroundStyle(prominent ? GameTheme.navy : GameTheme.cream)
            .padding(.horizontal, 28)
            .padding(.vertical, 12)
            .background(
                Capsule().fill(
                    prominent
                        ? AnyShapeStyle(LinearGradient(colors: [GameTheme.yellow, GameTheme.gold], startPoint: .top, endPoint: .bottom))
                        : AnyShapeStyle(GameTheme.navy.opacity(0.8))
                )
            )
            .overlay(Capsule().strokeBorder(.black.opacity(0.3), lineWidth: 2))
            .shadow(color: .black.opacity(0.4), radius: 4, y: 3)
            .scaleEffect(configuration.isPressed ? 0.93 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}
