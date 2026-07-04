import SwiftUI

// Front -> flip -> grade for one card. The front shows and speaks the
// English word; Jyutping only shows on the back, for dad.
struct CardPlayView: View {
    let card: CardRecord
    var onGraded: (ReviewResult) -> Void

    @State private var speaker = CantoneseSpeaker()
    @State private var flipped = false
    private let photos = CardPhotos()

    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            cardFace
                .contentShape(Rectangle())
                .onTapGesture(perform: flip)
            if !flipped {
                Text("Tap to flip")
                    .font(GameTheme.title(16))
                    .foregroundStyle(GameTheme.cream.opacity(0.6))
            }
            Spacer()
            if flipped {
                gradeButtons
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DungeonBackground())
        .onAppear { speaker.speakEnglish(card.english) }
    }

    // The front is the English side: photo or sprite over the written word.
    // The back always shows characters + Jyutping. Both faces stay mounted
    // so the flip can rotate between them.
    private var cardFace: some View {
        ZStack {
            frontFace
                .opacity(flipped ? 0 : 1)
                .rotation3DEffect(.degrees(flipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))
            backFace
                .opacity(flipped ? 1 : 0)
                .rotation3DEffect(.degrees(flipped ? 0 : -180), axis: (x: 0, y: 1, z: 0))
        }
    }

    private var frontFace: some View {
        VStack(spacing: 20) {
            frontArt
            Button { speaker.speakEnglish(card.english) } label: {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(GameTheme.gold)
            }
        }
        .padding(28)
        .frame(width: 320, height: 440)
        .cardFrame()
    }

    private var backFace: some View {
        VStack(spacing: 12) {
            Text(card.traditional)
                .font(.system(size: 96, weight: .bold))
                .foregroundStyle(GameTheme.cream)
                .minimumScaleFactor(0.4)
            Text(card.jyutping)
                .font(.caption)
                .foregroundStyle(GameTheme.cream.opacity(0.55))
        }
        .padding(28)
        .frame(width: 320, height: 440)
        .cardFrame(face: GameTheme.navy)
    }

    @ViewBuilder
    private var frontArt: some View {
        if let filename = card.photoFilename, let uiImage = photos.load(filename: filename) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 200)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        } else if let sprite = SpriteArt.cardImage(forEnglish: card.english) {
            Image(uiImage: sprite)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(maxHeight: 200)
        }
        Text(card.english)
            .font(GameTheme.title(48))
            .foregroundStyle(GameTheme.navy)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.4)
    }

    private var gradeButtons: some View {
        HStack(spacing: 40) {
            gradeButton(symbol: "xmark", color: GameTheme.red, label: "Whiff") { onGraded(.whiff) }
            gradeButton(symbol: "checkmark", color: GameTheme.green, label: "Hit") { onGraded(.hit) }
        }
    }

    private func gradeButton(symbol: String, color: Color, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 40, weight: .heavy))
                .foregroundStyle(GameTheme.cream)
                .frame(width: 84, height: 84)
                .background(Circle().fill(color))
                .overlay(Circle().strokeBorder(.black.opacity(0.3), lineWidth: 3))
                .shadow(color: .black.opacity(0.45), radius: 5, y: 4)
        }
        .accessibilityLabel(label)
    }

    private func flip() {
        guard !flipped else { return }
        SFXPlayer.shared.play(.flip)
        withAnimation(.spring(duration: 0.5)) { flipped = true }
        // Was the back face's onAppear; with both faces mounted for the
        // flip, the reveal moment lives here instead.
        speaker.speak(card.traditional)
    }
}
