import SwiftUI

// Front -> flip -> grade for one card. The kid can't read yet, so the front
// prompt is spoken (speakEnglish) and icon-only; Jyutping only shows on the
// back, for dad.
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

    // Card art is family photos: the front shows the attached photo when one
    // resolves, else the characters big. The back always shows characters +
    // Jyutping, photo or not.
    @ViewBuilder
    private var cardFace: some View {
        if flipped {
            VStack(spacing: 8) {
                Text(card.traditional)
                    .font(.system(size: 96, weight: .bold))
                Text(card.jyutping)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .onAppear { speaker.speak(card.traditional) }
        } else {
            VStack(spacing: 20) {
                frontArt
                Button { speaker.speakEnglish(card.english) } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 44))
                }
            }
        }
    }

    @ViewBuilder
    private var frontArt: some View {
        if let filename = card.photoFilename, let uiImage = photos.load(filename: filename) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 240)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        } else {
            Text(card.traditional)
                .font(.system(size: 96, weight: .bold))
        }
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
        flipped = true
    }
}
