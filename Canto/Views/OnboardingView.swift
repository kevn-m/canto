import SwiftUI

// The one-time first-run sheet: what the app is, the zh-HK voice check,
// and the starter pack offer (ADR 0023). LookupView presents it while
// @AppStorage("hasOnboarded") is false; either pack choice ends it.
struct OnboardingView: View {
    let speaker: CantoneseSpeaker
    let onFinish: (_ acceptPack: Bool) -> Void

    @State private var page = 0
    @State private var voiceAvailable = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 0) {
                Group {
                    switch page {
                    case 0:
                        OnboardingWelcomePage(onNext: { page = 1 })
                    case 1:
                        OnboardingVoicePage(
                            voiceAvailable: voiceAvailable,
                            onHearSample: { speaker.speak("你好") },
                            onNext: { page = 2 }
                        )
                    default:
                        OnboardingPackPage(
                            onAdd: { onFinish(true) },
                            onSkip: { onFinish(false) }
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                PageDots(current: page, count: 3)
                    .padding(.bottom, 24)
            }
        }
        .onAppear { voiceAvailable = speaker.voiceAvailable }
        // Returning from Settings after downloading the voice must flip the
        // check without a relaunch (the voice resolves per access).
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                voiceAvailable = speaker.voiceAvailable
            }
        }
    }
}

struct OnboardingWelcomePage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 28) {
            Spacer()
            HStack(spacing: 18) {
                sprite(SpriteArt.heroImage(), size: 96)
                sprite(SpriteArt.enemyImage(for: "slime"), size: 72)
            }
            Text("Canto")
                .font(GameTheme.title(40))
                .foregroundStyle(GameTheme.gold)
            Text("Say an English word, hear it in Cantonese, keep it, then battle to remember it.")
                .font(GameTheme.title(20))
                .foregroundStyle(GameTheme.cream)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }
}

struct OnboardingVoicePage: View {
    let voiceAvailable: Bool
    let onHearSample: () -> Void
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 28) {
            Spacer()
            Image(systemName: voiceAvailable ? "speaker.wave.3.fill" : "speaker.slash.fill")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(voiceAvailable ? GameTheme.gold : GameTheme.red)
            if voiceAvailable {
                Text("你好")
                    .font(GameTheme.title(44))
                    .foregroundStyle(GameTheme.cream)
                Text("nei5 hou2 — hello")
                    .font(GameTheme.title(18))
                    .foregroundStyle(GameTheme.cream.opacity(0.7))
                Button("Hear a sample", action: onHearSample)
                    .buttonStyle(GameButtonStyle())
            } else {
                Text("Cantonese voice not installed")
                    .font(GameTheme.title(24))
                    .foregroundStyle(GameTheme.cream)
                    .multilineTextAlignment(.center)
                Text("Download the Cantonese voice in Settings → Accessibility → Spoken Content to hear lookups read aloud.")
                    .font(GameTheme.title(17))
                    .foregroundStyle(GameTheme.cream.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }
}

struct OnboardingPackPage: View {
    let onAdd: () -> Void
    let onSkip: () -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("Start with \(StarterPack.words.count) words?")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
                .multilineTextAlignment(.center)
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(StarterPack.words, id: \.english) { word in
                    sprite(SpriteArt.cardImage(forEnglish: word.english), size: 52)
                }
            }
            .padding(14)
            .cardFrame(face: GameTheme.deepNavy.opacity(0.6), cornerRadius: 14)
            .padding(.horizontal, 24)
            Spacer()
            Button("Add starter words", action: onAdd)
                .buttonStyle(GameButtonStyle())
            Button("Skip", action: onSkip)
                .buttonStyle(GameButtonStyle(prominent: false))
                .padding(.bottom, 16)
        }
    }
}

private struct PageDots: View {
    let current: Int
    let count: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<count, id: \.self) { index in
                Circle()
                    .fill(index == current ? GameTheme.gold : GameTheme.cream.opacity(0.3))
                    .frame(width: 8, height: 8)
            }
        }
    }
}

// Pixel-edged sprite, same treatment as EnemySpriteView.
private func sprite(_ image: UIImage?, size: CGFloat) -> some View {
    Group {
        if let image {
            Image(uiImage: image)
                .resizable()
                .interpolation(.none)
                .scaledToFit()
        } else {
            Color.clear
        }
    }
    .frame(width: size, height: size)
}
