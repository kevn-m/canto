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
            Spacer()
            if flipped {
                gradeButtons
            }
        }
        .padding()
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
                    .font(.system(size: 44))
            }
        }
    }

    private var backFace: some View {
        VStack(spacing: 8) {
            Text(card.traditional)
                .font(.system(size: 96, weight: .bold))
            Text(card.jyutping)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
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
            .font(.system(size: 56, weight: .bold))
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.4)
    }

    private var gradeButtons: some View {
        HStack(spacing: 40) {
            Button { onGraded(.whiff) } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(.red)
            }
            .accessibilityLabel("Whiff")

            Button { onGraded(.hit) } label: {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(.green)
            }
            .accessibilityLabel("Hit")
        }
    }

    private func flip() {
        guard !flipped else { return }
        withAnimation(.spring(duration: 0.5)) { flipped = true }
        // Was the back face's onAppear; with both faces mounted for the
        // flip, the reveal moment lives here instead.
        speaker.speak(card.traditional)
    }
}
