import SwiftUI

// The Slay-the-Spire zoom: one Deck card up close, wearing the same tier
// frame and crest it wears in battle. Unlike CardPlayView there's no flip -
// this is a reference card, so both languages show at once and each has its
// own speaker. Photo attach and benching live here; the deck row tap opens it.
struct DeckCardDetailView: View {
    let entry: DeckEntry
    var onToggleBench: () -> Void
    var onPhoto: () -> Void

    @State private var speaker = CantoneseSpeaker()
    private let photos = CardPhotos()

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 24) {
                Spacer()
                cardFace
                statusLine
                Spacer()
                actions
            }
            .padding()
        }
        .onAppear { SFXPlayer.shared.play(.flip) }
    }

    private var cardFace: some View {
        VStack(spacing: 18) {
            art
            speakRow(spacing: 10) {
                speaker.speakEnglish(entry.english)
            } label: {
                Text(entry.english)
                    .font(GameTheme.title(34))
                    .foregroundStyle(GameTheme.navy)
                    .minimumScaleFactor(0.4)
                    .lineLimit(1)
            }
            speakRow(spacing: 12) {
                speaker.speak(entry.traditional)
            } label: {
                VStack(spacing: 4) {
                    // With no art the characters are the face - let them fill
                    // the space the sprite would have taken.
                    Text(entry.traditional)
                        .font(.system(size: hasArt ? 52 : 96, weight: .bold))
                        .foregroundStyle(GameTheme.navy)
                        .minimumScaleFactor(0.4)
                        .lineLimit(1)
                    Text(entry.jyutping)
                        .font(.system(size: 16, weight: .medium, design: .rounded))
                        .foregroundStyle(GameTheme.navy.opacity(0.55))
                }
            }
        }
        .padding(28)
        .frame(width: 320, height: 440)
        .cardFrame(tier: GameTheme.boxFrameTier(forBox: entry.box))
        .overlay(alignment: .top) {
            CardTierCrest(box: entry.box, size: 32)
                .offset(y: -16)
        }
    }

    private var hasArt: Bool {
        entry.photoFilename != nil || SpriteArt.cardImage(forEnglish: entry.english) != nil
    }

    @ViewBuilder
    private var art: some View {
        if let filename = entry.photoFilename, let uiImage = photos.load(filename: filename) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 150)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        } else if let sprite = SpriteArt.cardImage(forEnglish: entry.english) {
            Image(uiImage: sprite)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(maxHeight: 150)
        }
    }

    // Text with its speaker; tapping either speaks, matching battle's
    // tap-the-card convention.
    private func speakRow(spacing: CGFloat, action: @escaping () -> Void, @ViewBuilder label: () -> some View) -> some View {
        HStack(spacing: spacing) {
            label()
            Image(systemName: "speaker.wave.2.fill")
                .font(.system(size: 22))
                .foregroundStyle(GameTheme.gold)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: action)
    }

    private var statusLine: some View {
        VStack(spacing: 6) {
            Text(boxName)
                .foregroundStyle(GameTheme.boxFrameTier(forBox: entry.box) ?? GameTheme.cream)
            if entry.benched {
                Text("Benched — sits out battles")
                    .foregroundStyle(GameTheme.lavender)
            }
        }
        .font(GameTheme.title(15))
    }

    private var boxName: String {
        CardCeremonyView.stepLabels[min(max(entry.box, 0), 3)]
    }

    private var actions: some View {
        HStack(spacing: 14) {
            Button(entry.benched ? "Unbench" : "Bench", action: onToggleBench)
                .buttonStyle(GameButtonStyle(prominent: false, compact: true))
            Button(entry.photoFilename == nil ? "Add Photo" : "Photo", action: onPhoto)
                .buttonStyle(GameButtonStyle(prominent: false, compact: true))
        }
        .padding(.bottom, 28)
    }
}
