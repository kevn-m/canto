import SwiftUI

enum AppTab: Hashable {
    case lookup, climb, deck, shop, settings
}

// The persistent tab shell (ADR 0032). Each tab keeps its own
// NavigationStack so switching away and back preserves the stack. The shell
// owns launch routing (the Action Button intent) and the first-run
// onboarding cover — both are app-level, not Lookup-level, concerns.
struct AppShellView: View {
    @State private var selectedTab: AppTab = .lookup
    @State private var lookupListenRequest = 0
    @AppStorage("hasOnboarded") private var hasOnboarded = false
    @State private var showOnboarding = false
    @State private var speaker = CantoneseSpeaker()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                LookupView(listenRequest: lookupListenRequest)
            }
            .tabItem { Label("Lookup", systemImage: "magnifyingglass") }
            .tag(AppTab.lookup)

            NavigationStack {
                TowerEntryView()
            }
            .tabItem { Label("Climb", systemImage: "shield.lefthalf.filled") }
            .tag(AppTab.climb)

            NavigationStack {
                DeckView()
            }
            .tabItem { Label("Deck", systemImage: "rectangle.stack.fill") }
            .tag(AppTab.deck)

            NavigationStack {
                ShopView()
            }
            .tabItem { Label("Shop", systemImage: "cart.fill") }
            .tag(AppTab.shop)

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape.fill") }
            .tag(AppTab.settings)
        }
        .tint(GameTheme.gold)
        // The inn/dungeon art is dark regardless of system setting; without
        // this, light mode draws black nav titles and a light glass tab bar
        // over the artwork. (iOS 26's glass bar ignores UITabBarAppearance
        // backgroundColor, so dark chrome is the lever, not appearance.)
        .preferredColorScheme(.dark)
        .onAppear {
            // Checked before routeLaunchIntent consumes the flag: an Action
            // Button launch goes straight to the mic and the sheet waits for
            // the next ordinary launch.
            if !hasOnboarded, !LaunchIntent.shared.shouldStartListening {
                showOnboarding = true
            }
            routeLaunchIntent()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                routeLaunchIntent()
            }
        }
        // With openAppWhenRun, iOS foregrounds the app BEFORE running
        // perform(), so the flag can be set after scenePhase already went
        // .active — watching the flag itself covers that ordering.
        .onChange(of: LaunchIntent.shared.shouldStartListening) { _, requested in
            if requested {
                routeLaunchIntent()
            }
        }
        // Settings' "Show intro again" flips the flag back; re-present the cover.
        .onChange(of: hasOnboarded) { _, onboarded in
            if !onboarded {
                showOnboarding = true
            }
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView(speaker: speaker) { acceptPack in
                if acceptPack {
                    GameStore.shared.addStarterCards(StarterPack.words)
                    // No silent transitions: the coin marks the Deck filling.
                    SFXPlayer.shared.play(.coin)
                }
                hasOnboarded = true
                showOnboarding = false
            }
        }
    }

    // The intent wins over onboarding; the sheet returns next launch because
    // hasOnboarded stays false. The yield lets the tab selection render
    // before the microphone request changes.
    @MainActor
    private func routeLaunchIntent() {
        guard LaunchIntent.shared.consume() else { return }
        showOnboarding = false
        selectedTab = .lookup
        Task { @MainActor in
            await Task.yield()
            lookupListenRequest &+= 1
        }
    }
}
