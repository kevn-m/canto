import AppIntents

/// One-shot flag: the intent can cold-launch the app or foreground an
/// already-running one, so LookupView checks this on both onAppear and
/// scenePhase changes. consume() clears it so a later ordinary foreground
/// doesn't re-trigger the mic.
// @MainActor: perform() runs on the AppIntents runtime's executor while the
// view reads this flag on the main actor — same-actor isolation, not luck.
@MainActor @Observable final class LaunchIntent {
    static let shared = LaunchIntent()

    var shouldStartListening = false

    func consume() -> Bool {
        defer { shouldStartListening = false }
        return shouldStartListening
    }
}

struct StartListeningIntent: AppIntent {
    static let title: LocalizedStringResource = "JyutKeep Lookup"
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        LaunchIntent.shared.shouldStartListening = true
        return .result()
    }
}

struct CantoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartListeningIntent(),
            phrases: [
                "JyutKeep Lookup with \(.applicationName)",
                "Start a lookup in \(.applicationName)"
            ],
            shortTitle: "JyutKeep Lookup",
            systemImageName: "mic.fill"
        )
    }
}
