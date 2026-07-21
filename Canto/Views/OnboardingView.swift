import SwiftUI

// The one-time first-run sheet (ADR 0023): what the app is, the zh-HK voice
// check, the lookup/battle/rewards tour, and the starter pack offer.
// AppShellView presents it while @AppStorage("hasOnboarded") is false;
// either pack choice ends it.
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
                    case 2:
                        OnboardingLookupPage(onNext: { page = 3 })
                    case 3:
                        OnboardingShortcutPage(onNext: { page = 4 })
                    case 4:
                        OnboardingBattlePage(onNext: { page = 5 })
                    case 5:
                        OnboardingTogetherPage(onNext: { page = 6 })
                    case 6:
                        OnboardingRewardsPage(onNext: { page = 7 })
                    default:
                        OnboardingPackPage(
                            onAdd: { onFinish(true) },
                            onSkip: { onFinish(false) }
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                PageDots(current: page, count: 8)
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
            Text("JyutKeep")
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

// Pick vs offline results, on a mock lookup for "hello". The gilded row is
// the Pick; the plain row is the offline dictionary.
struct OnboardingLookupPage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            VStack(alignment: .leading, spacing: 12) {
                mockRow(characters: "你好", jyutping: "nei5 hou2", gloss: "hello", isPick: true)
                mockRow(characters: "哈囉", jyutping: "haa1 lou3", gloss: "hello (loanword)", isPick: false)
            }
            .padding(.horizontal, 56)
            Text("Look up any word")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            Text("The built-in dictionary answers instantly, even offline. The gold Pick joins it when you're online: the most natural everyday way to say your word, so start there. Tap a row to hear it — Keep collects it as a card.")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.cream.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }

    private func mockRow(characters: String, jyutping: String, gloss: String, isPick: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            if isPick {
                Label("Pick", systemImage: "sparkles")
                    .font(GameTheme.title(12))
                    .foregroundStyle(GameTheme.gold)
            }
            Text(characters)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(GameTheme.navy)
            Text(jyutping)
                .font(GameTheme.title(14))
                .foregroundStyle(GameTheme.navy.opacity(0.7))
            Text(gloss)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(GameTheme.lavender)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .cardFrame(gilded: isPick)
    }
}

// The StartListeningIntent shortcut, sold as a one-time setup: Back Tap on
// any iPhone, the Action Button on 15 Pro and later, Siri on both.
struct OnboardingShortcutPage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            Image(systemName: "hand.tap.fill")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(GameTheme.gold)
            Text("Look up in one tap")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            Text("The JyutKeep Lookup shortcut opens the app already listening. Set it up once:")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.cream.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            VStack(spacing: 12) {
                shortcutRow(
                    symbol: "iphone.radiowaves.left.and.right",
                    title: "Back Tap",
                    path: "Any iPhone. Settings → Accessibility → Touch → Back Tap → Double Tap → JyutKeep Lookup. Then double-tap the back of the phone."
                )
                shortcutRow(
                    symbol: "button.horizontal.top.press",
                    title: "Action Button",
                    path: "iPhone 15 Pro and later. Settings → Action Button → Shortcut → JyutKeep Lookup. Then hold the button."
                )
            }
            .padding(.horizontal, 40)
            Text("Or ask Siri: “Start a lookup in JyutKeep.”")
                .font(GameTheme.title(15))
                .foregroundStyle(GameTheme.cream.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }

    private func shortcutRow(symbol: String, title: String, path: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(GameTheme.lavender)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(GameTheme.title(14))
                    .foregroundStyle(GameTheme.navy)
                Text(path)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(GameTheme.navy.opacity(0.75))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .cardFrame()
    }
}

struct OnboardingBattlePage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            HStack(spacing: 28) {
                sprite(SpriteArt.heroImage(), size: 88)
                sprite(SpriteArt.enemyImage(for: "slime"), size: 66)
            }
            HStack(spacing: 28) {
                gradeMark(symbol: "xmark", color: GameTheme.red, label: "Whiff")
                gradeMark(symbol: "checkmark", color: GameTheme.green, label: "Hit")
            }
            Text("Battle with your words")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            Text("Kept words become attack cards. Hear the English, say it in Cantonese out loud, then flip the card to check. Call it yourself: Hit or Whiff. Hits raise a word's mastery — and mastered words hit harder. A Whiff sends it back to practice. Honest calls are what make you learn.")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.cream.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }

    private func gradeMark(symbol: String, color: Color, label: String) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 26, weight: .heavy))
            .foregroundStyle(GameTheme.cream)
            .frame(width: 54, height: 54)
            .background(Circle().fill(color))
            .overlay(Circle().strokeBorder(.black.opacity(0.3), lineWidth: 2))
            .shadow(color: .black.opacity(0.45), radius: 4, y: 3)
            .accessibilityLabel(label)
    }
}

struct OnboardingTogetherPage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            HStack(alignment: .bottom, spacing: 18) {
                sprite(SpriteArt.heroImage(), size: 64)
                VStack(spacing: 6) {
                    Text("你好")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundStyle(GameTheme.cream)
                    Text("nei5 hou2")
                        .font(GameTheme.title(14))
                        .foregroundStyle(GameTheme.cream.opacity(0.55))
                }
                .padding(18)
                .frame(width: 132, height: 164)
                .cardFrame(face: GameTheme.navy)
                sprite(SpriteArt.image(named: "avatar-mei"), size: 64)
            }
            Text("Better with a grown-up")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            Text("Battles are made for two. The back of every card shows the Jyutping — how the word sounds — so a parent can listen, judge the pronunciation, and call Hit or Whiff together, no character reading needed.")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.cream.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Spacer()
            Button("Next", action: onNext)
                .buttonStyle(GameButtonStyle())
                .padding(.bottom, 16)
        }
    }
}

struct OnboardingRewardsPage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            HStack(spacing: 24) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(GameTheme.gold)
                AvatarSpriteView(
                    size: 88,
                    equipped: [.helmet: "hat-crown", .weapon: "weap-knight-sword"]
                )
            }
            Text("Earn CantoBux")
                .font(GameTheme.title(24))
                .foregroundStyle(GameTheme.cream)
            Text("Every climb pays CantoBux, win or lose. Spend them in the Shop on gear for your hero. Parents: switch on Family rewards in Settings to add real-world treats — ice cream, a park trip, movie night — priced in CantoBux you choose.")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.cream.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
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
