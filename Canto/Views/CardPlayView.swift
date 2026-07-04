import SwiftUI

// Front -> flip -> grade for one card. The kid can't read yet, so the front
// prompt is spoken (speakEnglish) and icon-only; Jyutping only shows on the
// back, for dad.
struct CardPlayView: View {
    let card: CardRecord
    var onGraded: (ReviewResult) -> Void

    @State private var speaker = CantoneseSpeaker()
    @State private var flipped = false

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

    // Card art is family photos (Slice 6); CardRecord carries no photo yet,
    // so the front always shows the characters big until that slice wires
    // a photo-aware fetch through here.
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
                Text(card.traditional)
                    .font(.system(size: 96, weight: .bold))
                Button { speaker.speakEnglish(card.english) } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 44))
                }
            }
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
