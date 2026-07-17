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
    static let brown = Color(red: 0.671, green: 0.322, blue: 0.212)     // #AB5236

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
            BrickWall()
            GeometryReader { geo in
                WallTorch()
                    .position(x: geo.size.width * 0.12, y: geo.size.height * 0.22)
                WallTorch()
                    .position(x: geo.size.width * 0.88, y: geo.size.height * 0.22)
                FloorShadow(size: geo.size)
            }
        }
        .ignoresSafeArea()
    }
}

// The inn: a warm wood-panelled room lit from below by a hearth, with two
// lanterns hung on the walls. The safe haven between runs - lookup, history,
// deck, shop and about all rest here. Same PICO-8 palette as the dungeon,
// warmer light, no bricks.
struct InnBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.16, green: 0.10, blue: 0.12),
                    Color(red: 0.30, green: 0.16, blue: 0.11),
                ],
                startPoint: .top, endPoint: .bottom
            )
            PlankWall()
            GeometryReader { geo in
                HangingLantern()
                    .position(x: geo.size.width * 0.13, y: geo.size.height * 0.15)
                HangingLantern()
                    .position(x: geo.size.width * 0.87, y: geo.size.height * 0.15)
                Hearth(size: geo.size)
            }
        }
        .ignoresSafeArea()
    }
}

// Horizontal timber boards with dark seams and staggered joints, warming
// toward the floor where the hearth light reaches.
private struct PlankWall: View {
    var body: some View {
        Canvas { context, size in
            let plankH: CGFloat = 48
            let boardW: CGFloat = 132
            var row = 0
            var y: CGFloat = 0
            while y < size.height {
                let warm = 0.35 + (y / size.height) * 0.65
                let face = row.isMultiple(of: 2) ? 0.05 : 0.09
                context.fill(
                    Path(roundedRect: CGRect(x: 0, y: y + 1.5, width: size.width, height: plankH - 3), cornerRadius: 2),
                    with: .color(GameTheme.gold.opacity(face * warm))
                )
                // dark seam under the board
                context.fill(
                    Path(CGRect(x: 0, y: y + plankH - 2, width: size.width, height: 2)),
                    with: .color(.black.opacity(0.32))
                )
                // staggered vertical joints
                let offset = row.isMultiple(of: 2) ? 0 : boardW / 2
                var x = boardW - offset
                while x < size.width {
                    context.fill(
                        Path(CGRect(x: x, y: y + 4, width: 1.5, height: plankH - 8)),
                        with: .color(.black.opacity(0.24))
                    )
                    x += boardW
                }
                y += plankH
                row += 1
            }
        }
        .allowsHitTesting(false)
    }
}

// A wall lantern: an amber glass box on a short chain, throwing a soft warm
// pool that breathes.
private struct HangingLantern: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(GameTheme.gold.opacity(0.20))
                .frame(width: 155, height: 155)
                .blur(radius: 42)
                .phaseAnimator([1.0, 0.85]) { view, glow in
                    view.opacity(glow)
                } animation: { _ in .easeInOut(duration: 1.4) }
            VStack(spacing: 0) {
                Rectangle()
                    .fill(GameTheme.lavender.opacity(0.5))
                    .frame(width: 2, height: 22)
                lantern
            }
            .offset(y: -22)
        }
        .allowsHitTesting(false)
    }

    private var lantern: some View {
        VStack(spacing: -1) {
            RoundedRectangle(cornerRadius: 1).fill(GameTheme.brown).frame(width: 11, height: 4)
            ZStack {
                RoundedRectangle(cornerRadius: 3)
                    .fill(GameTheme.gold.opacity(0.9))
                    .frame(width: 17, height: 21)
                    .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(GameTheme.brown, lineWidth: 2))
                Ellipse().fill(GameTheme.yellow).frame(width: 6, height: 11)
            }
            RoundedRectangle(cornerRadius: 1).fill(GameTheme.brown).frame(width: 9, height: 3)
        }
    }
}

// The fire we rest beside: a warm pool of light rising from the floor with a
// low flame at its centre.
private struct Hearth: View {
    let size: CGSize

    var body: some View {
        ZStack {
            Ellipse()
                .fill(GameTheme.gold.opacity(0.32))
                .frame(width: size.width * 1.2, height: size.height * 0.62)
                .blur(radius: 70)
                .position(x: size.width / 2, y: size.height * 1.02)
                .phaseAnimator([1.0, 0.88]) { view, glow in
                    view.opacity(glow)
                } animation: { _ in .easeInOut(duration: 1.1) }
            HearthFire()
                .position(x: size.width / 2, y: size.height * 0.97)
        }
        .allowsHitTesting(false)
    }
}

private struct HearthFire: View {
    var body: some View {
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 3)
                .fill(GameTheme.brown)
                .frame(width: 60, height: 12)
            HStack(spacing: -6) {
                flame(width: 16, height: 26)
                flame(width: 22, height: 36)
                flame(width: 15, height: 24)
            }
            .offset(y: -4)
        }
    }

    private func flame(width: CGFloat, height: CGFloat) -> some View {
        ZStack {
            Ellipse().fill(GameTheme.gold).frame(width: width, height: height)
            Ellipse().fill(GameTheme.yellow).frame(width: width * 0.5, height: height * 0.55).offset(y: height * 0.15)
        }
        .phaseAnimator([1.0, 1.15, 0.9]) { view, s in
            view.scaleEffect(x: 2 - s, y: s, anchor: .bottom)
        } animation: { _ in .easeInOut(duration: 0.35) }
    }
}

// Staggered stone courses, mortar-lines only, fading out down the wall so
// the play area stays dark and the sprites stay the brightest thing.
private struct BrickWall: View {
    var body: some View {
        Canvas { context, size in
            let brickW: CGFloat = 72, brickH: CGFloat = 30
            var row = 0
            var y: CGFloat = 0
            while y < size.height {
                let offset = row.isMultiple(of: 2) ? 0 : brickW / 2
                var x = -offset
                var col = 0
                while x < size.width {
                    let rect = CGRect(x: x + 2, y: y + 2, width: brickW - 4, height: brickH - 4)
                    let fade = 1 - (y / size.height) * 0.7
                    // A few catch the torchlight; the (row, col) hash keeps
                    // the pattern stable frame to frame.
                    if (row * 31 + col * 7) % 17 == 0 {
                        context.fill(
                            Path(roundedRect: rect, cornerRadius: 3),
                            with: .color(GameTheme.lavender.opacity(0.06 * fade))
                        )
                    }
                    context.stroke(
                        Path(roundedRect: rect, cornerRadius: 3),
                        with: .color(.black.opacity(0.30 * fade)),
                        lineWidth: 2
                    )
                    x += brickW
                    col += 1
                }
                y += brickH
                row += 1
            }
        }
        .allowsHitTesting(false)
    }
}

// A sconce with a flickering flame and a warm pool of light on the wall.
private struct WallTorch: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(GameTheme.gold.opacity(0.22))
                .frame(width: 190, height: 190)
                .blur(radius: 45)
                .phaseAnimator([1.0, 0.82]) { view, glow in
                    view.opacity(glow)
                } animation: { _ in .easeInOut(duration: 0.9) }
            VStack(spacing: -3) {
                flame
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(red: 0.671, green: 0.322, blue: 0.212))  // P.brn
                    .frame(width: 7, height: 26)
            }
        }
        .allowsHitTesting(false)
    }

    private var flame: some View {
        ZStack {
            Ellipse()
                .fill(GameTheme.gold)
                .frame(width: 16, height: 22)
            Ellipse()
                .fill(GameTheme.yellow)
                .frame(width: 9, height: 13)
                .offset(y: 3)
        }
        .phaseAnimator([1.0, 1.18, 0.92]) { view, s in
            view.scaleEffect(x: 2 - s, y: s, anchor: .bottom)
        } animation: { _ in .easeInOut(duration: 0.35) }
    }
}

// One backdrop per Biome. The tower keeps its hallway; forest and desert
// get their own drawn scenes so the place changes, not just the monsters.
struct BiomeBackground: View {
    let biome: Biome

    var body: some View {
        switch biome {
        case .tower: DungeonBackground()
        case .forest: ForestBackground()
        case .desert: DesertBackground()
        }
    }
}

// A moonlit pine clearing: tree silhouettes down both edges, fireflies
// drifting in the dark.
private struct ForestBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.02, green: 0.30, blue: 0.21), Color(red: 0.01, green: 0.09, blue: 0.08)],
                startPoint: .top, endPoint: .bottom
            )
            TreeLine()
            GeometryReader { geo in
                ForEach(Array([(0.2, 0.30), (0.8, 0.24), (0.32, 0.55), (0.7, 0.62), (0.12, 0.74)].enumerated()), id: \.offset) { index, spot in
                    Firefly(period: 0.8 + Double(index) * 0.23)
                        .position(x: geo.size.width * spot.0, y: geo.size.height * spot.1)
                }
                FloorShadow(size: geo.size)
            }
        }
        .ignoresSafeArea()
    }
}

private struct TreeLine: View {
    var body: some View {
        Canvas { context, size in
            // (x fraction, width, height fraction) per pine, mirrored feel.
            let pines: [(CGFloat, CGFloat, CGFloat)] = [
                (0.04, 90, 0.55), (0.16, 70, 0.38), (0.92, 100, 0.6),
                (0.80, 65, 0.34), (0.55, 55, 0.22), (0.33, 50, 0.18),
            ]
            for (fx, width, fh) in pines {
                let baseX = size.width * fx
                let top = size.height * (1 - fh)
                var path = Path()
                path.move(to: CGPoint(x: baseX, y: top))
                path.addLine(to: CGPoint(x: baseX - width / 2, y: size.height))
                path.addLine(to: CGPoint(x: baseX + width / 2, y: size.height))
                path.closeSubpath()
                context.fill(path, with: .color(.black.opacity(0.30)))
            }
        }
        .allowsHitTesting(false)
    }
}

private struct Firefly: View {
    let period: Double

    var body: some View {
        Circle()
            .fill(GameTheme.yellow)
            .frame(width: 5, height: 5)
            .blur(radius: 1)
            .shadow(color: GameTheme.yellow.opacity(0.9), radius: 6)
            .phaseAnimator([0.15, 1.0]) { view, glow in
                view.opacity(glow)
            } animation: { _ in .easeInOut(duration: period) }
            .allowsHitTesting(false)
    }
}

// Dusk in the dunes: warm sky, a bright moon and stars, sand banking up
// at the bottom.
private struct DesertBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.42, green: 0.16, blue: 0.28), Color(red: 0.12, green: 0.05, blue: 0.10)],
                startPoint: .top, endPoint: .bottom
            )
            GeometryReader { geo in
                Circle()
                    .fill(GameTheme.cream)
                    .frame(width: 46, height: 46)
                    .shadow(color: GameTheme.cream.opacity(0.7), radius: 24)
                    .position(x: geo.size.width * 0.82, y: geo.size.height * 0.10)
                ForEach(Array([(0.12, 0.08), (0.3, 0.16), (0.55, 0.07), (0.68, 0.19), (0.9, 0.30)].enumerated()), id: \.offset) { _, spot in
                    Circle()
                        .fill(GameTheme.cream.opacity(0.8))
                        .frame(width: 3, height: 3)
                        .position(x: geo.size.width * spot.0, y: geo.size.height * spot.1)
                }
                // Dunes: two overlapping sand banks.
                Ellipse()
                    .fill(Color(red: 0.55, green: 0.30, blue: 0.20).opacity(0.5))
                    .frame(width: geo.size.width * 1.6, height: geo.size.height * 0.4)
                    .position(x: geo.size.width * 0.15, y: geo.size.height * 1.02)
                Ellipse()
                    .fill(Color(red: 0.67, green: 0.38, blue: 0.21).opacity(0.4))
                    .frame(width: geo.size.width * 1.5, height: geo.size.height * 0.3)
                    .position(x: geo.size.width * 0.85, y: geo.size.height * 1.04)
                FloorShadow(size: geo.size)
            }
        }
        .ignoresSafeArea()
    }
}

// The darker band the fight stands on; shared by every biome.
private struct FloorShadow: View {
    let size: CGSize

    var body: some View {
        LinearGradient(
            colors: [.clear, .black.opacity(0.45)],
            startPoint: .top, endPoint: .bottom
        )
        .frame(height: size.height * 0.22)
        .position(x: size.width / 2, y: size.height * 0.89)
        .allowsHitTesting(false)
    }
}

// The card face: cream front, gold double border, drop shadow. Used by the
// hand's mini cards and CardPlayView's big card. `selected` brightens the
// border and adds a gold glow so a tapped row reads as picked. `gilded` is
// the Pick layer's frame: a flame-gradient border (yellow → gold → ember)
// with a warm hearth glow, so the conjured answer outshines the inn's plain
// gold dictionary rows. Selection still wins: a tapped gilded row shows the
// same solid-yellow ring as any other.
struct CardFrame: ViewModifier {
    var face: Color = GameTheme.cream
    var cornerRadius: CGFloat = 18
    var selected = false
    var gilded = false

    private var border: AnyShapeStyle {
        if selected { return AnyShapeStyle(GameTheme.yellow) }
        if gilded {
            return AnyShapeStyle(LinearGradient(
                colors: [GameTheme.yellow, GameTheme.gold, Color(red: 0.85, green: 0.25, blue: 0.15)],
                startPoint: .top, endPoint: .bottom
            ))
        }
        return AnyShapeStyle(GameTheme.gold)
    }

    private var glowColor: Color {
        if selected { return GameTheme.gold.opacity(0.7) }
        return gilded ? GameTheme.gold.opacity(0.6) : .black.opacity(0.45)
    }

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(face)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .strokeBorder(border, lineWidth: selected ? 5 : 4)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius - 5)
                            .strokeBorder(
                                (gilded && !selected ? GameTheme.gold : GameTheme.navy).opacity(gilded && !selected ? 0.35 : 0.25),
                                lineWidth: 1.5
                            )
                            .padding(5)
                    )
            )
            .shadow(
                color: glowColor,
                radius: selected ? 10 : (gilded ? 9 : 6),
                y: selected || gilded ? 0 : 5
            )
    }
}

extension View {
    func cardFrame(face: Color = GameTheme.cream, cornerRadius: CGFloat = 18, selected: Bool = false, gilded: Bool = false) -> some View {
        modifier(CardFrame(face: face, cornerRadius: cornerRadius, selected: selected, gilded: gilded))
    }
}

// The one button look for game screens, compact variant: same gold capsule as
// GameButtonStyle at a size that sits inside a card row.
struct GameButtonStyle: ButtonStyle {
    var prominent = true
    var compact = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(GameTheme.title(compact ? 15 : 20))
            .foregroundStyle(prominent ? GameTheme.navy : GameTheme.cream)
            .padding(.horizontal, compact ? 16 : 28)
            .padding(.vertical, compact ? 8 : 12)
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

// Cream rounded field on the dungeon backdrop, matching the card face.
struct GameTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(GameTheme.title(20))
            .foregroundStyle(GameTheme.navy)
            .tint(GameTheme.gold)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                Capsule()
                    .fill(GameTheme.cream)
                    .overlay(Capsule().strokeBorder(GameTheme.gold, lineWidth: 4))
            )
            .shadow(color: .black.opacity(0.4), radius: 4, y: 3)
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

