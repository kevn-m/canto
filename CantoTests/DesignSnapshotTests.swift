import SwiftUI
import XCTest
@testable import Canto

// Renders the game screens to PNGs so a design pass can be eyeballed
// without hand-navigating a simulator. Not pixel-comparison tests - they
// only assert the screens render at all; the PNGs land in the temp
// directory (path printed as SNAPSHOT_DIR) for a human/agent to look at.
@MainActor
final class DesignSnapshotTests: XCTestCase {
    private static let outputDir: URL = {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("canto-snapshots")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        print("SNAPSHOT_DIR: \(dir.path)")
        return dir
    }()

    private let sampleCards = [
        CardRecord(id: 1, traditional: "食", jyutping: "sik6", english: "eat", box: 0, dueOn: "2026-01-01"),
        CardRecord(id: 2, traditional: "獅子", jyutping: "si1 zi2", english: "lion", box: 3, dueOn: "2026-01-01"),
        CardRecord(id: 3, traditional: "大象", jyutping: "daai6 zoeng6", english: "elephant", box: 2, dueOn: "2026-01-01"),
    ]

    // One card per Box, New through Mastered, for the frame-tier fixtures.
    private let tierCards = [
        CardRecord(id: 20, traditional: "新", jyutping: "san1", english: "new", box: 0, dueOn: "2026-01-01"),
        CardRecord(id: 21, traditional: "學", jyutping: "hok6", english: "learning", box: 1, dueOn: "2026-01-01"),
        CardRecord(id: 22, traditional: "穩", jyutping: "wan2", english: "solid", box: 2, dueOn: "2026-01-01"),
        CardRecord(id: 23, traditional: "精通", jyutping: "zing1 tung1", english: "mastered", box: 3, dueOn: "2026-01-01"),
    ]

    // width defaults to an iPhone 17; pass 375 to check an SE-class phone,
    // where a grid that fits at 393 can still overlap.
    private func snapshot(_ name: String, width: CGFloat = 393, @ViewBuilder content: () -> some View) {
        let view = content()
            .frame(width: width, height: 760)
            .environment(\.colorScheme, .dark)
        let renderer = ImageRenderer(content: view)
        render(name, renderer)
    }

    // The lookup/pick rows are cream cards designed to sit on the inn
    // backdrop (the safe haven, not the battle dungeon); rendering them on the
    // default (white) canvas hides the cream text and misjudges contrast, so
    // these snapshot on the real background.
    private func snapshotOnInn(_ name: String, @ViewBuilder content: () -> some View) {
        let view = VStack { content() }
            .frame(width: 393, height: 760)
            .background(InnBackground())
            .environment(\.colorScheme, .dark)
        let renderer = ImageRenderer(content: view)
        render(name, renderer)
    }

    private func render<V: View>(_ name: String, _ renderer: ImageRenderer<V>) {
        renderer.scale = 2
        guard let image = renderer.uiImage, let data = image.pngData() else {
            XCTFail("\(name) failed to render")
            return
        }
        let url = Self.outputDir.appendingPathComponent("\(name).png")
        XCTAssertNoThrow(try data.write(to: url))
    }

    func test_battleScreenRenders() {
        var state = TowerEngine.makeFreshRun()
        state.enemyHP = 5
        state.partyHP = 4
        snapshot("battle") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards
            )
        }
    }

    // The two attack tiers with new visuals, pinned mid-strike: the Solid
    // lightning strike and the Mastered flame-wrapped-in-lightning strike
    // (Boxes 0/1 reuse fx-slash).
    func test_lightningStrikeRenders() {
        var state = TowerEngine.makeFreshRun()
        state.enemyHP = 5
        snapshot("battle-lightning-strike") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards,
                previewAttackFX: 2
            )
        }
    }

    func test_flameStrikeRenders() {
        var state = TowerEngine.makeFreshRun()
        state.enemyHP = 5
        snapshot("battle-flame-strike") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards,
                previewAttackFX: 3
            )
        }
    }

    func test_bossBattleScreenRenders() {
        var state = TowerEngine.makeFreshRun()
        state.floorIndex = 2
        state.enemyHP = 9
        snapshot("battle-boss") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards
            )
        }
    }

    func test_handCardsRender() {
        snapshot("hand") {
            HStack(spacing: -6) {
                ForEach(Array(sampleCards.enumerated()), id: \.element.id) { index, card in
                    HandCardView(card: card)
                        .rotationEffect(.degrees(Double(index - 1) * 5))
                        .offset(y: abs(Double(index) - 1) * 10)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DungeonBackground())
        }
    }

    func test_handCardTiersRender() {
        snapshot("hand-tiers") {
            HStack(spacing: -6) {
                ForEach(tierCards) { card in
                    HandCardView(card: card)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DungeonBackground())
        }
    }

    func test_cardFrontRenders() {
        snapshot("card-front") {
            CardPlayView(card: sampleCards[1]) { _ in }
        }
    }

    func test_cardFrontTierRenders() {
        snapshot("card-front-tier") {
            CardPlayView(card: tierCards[2]) { _ in }
        }
    }

    func test_cardFrontForestBiomeRenders() {
        snapshot("card-front-forest") {
            CardPlayView(card: sampleCards[1], biome: .forest) { _ in }
        }
    }

    func test_forestBattleScreenRenders() {
        var state = TowerEngine.makeFreshRun(biome: .forest)
        state.enemyHP = 5
        snapshot("battle-forest") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards
            )
        }
    }

    func test_desertBattleScreenRenders() {
        var state = TowerEngine.makeFreshRun(biome: .desert)
        state.floorIndex = 2
        state.enemyHP = 10
        snapshot("battle-desert") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards
            )
        }
    }

    func test_towerLockedRenders() {
        snapshot("tower-locked") {
            TowerLockedView(deckSize: 6)
        }
    }

    func test_towerMapRenders() {
        snapshot("tower-map") {
            VStack(spacing: 28) {
                TowerMapView(floors: TowerEngine.baseFloors, currentIndex: 0)
                BiomePickerView(selection: .constant(.tower))
                Button("Start") {}
                    .buttonStyle(GameButtonStyle())
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DungeonBackground())
        }
    }

    func test_lookupRowSelectedNotKeptRenders() {
        let sense = Sense(row: [
            "id": 1, "traditional": "食", "simplified": nil, "jyutping": "sik6",
            "pinyin": nil, "gloss": "eat", "source": 0, "popularity": 5,
        ])
        snapshotOnInn("lookup-row-selected") {
            LookupResultRowView(
                sense: sense, selectedSenseId: 1, keptSenseId: nil,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }
            )
            .padding()
        }
    }

    func test_lookupRowKeptRenders() {
        let sense = Sense(row: [
            "id": 1, "traditional": "食", "simplified": nil, "jyutping": "sik6",
            "pinyin": nil, "gloss": "eat", "source": 0, "popularity": 5,
        ])
        snapshotOnInn("lookup-row-kept") {
            LookupResultRowView(
                sense: sense, selectedSenseId: 1, keptSenseId: 1,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }
            )
            .padding()
        }
    }

    private func pickSection(_ presentation: PickPresentation, customKept: Bool = false) -> some View {
        PickSectionView(
            presentation: presentation,
            selectedSenseId: nil, keptSenseId: nil, customKept: customKept,
            onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
            onKeepCustom: { _ in }
        )
        .padding()
    }

    func test_pickMappedRenders() {
        let sense = Sense(row: [
            "id": 1, "traditional": "驚", "simplified": nil, "jyutping": "geng1",
            "pinyin": nil, "gloss": "scared", "source": 0, "popularity": 5,
        ])
        snapshotOnInn("pick-mapped") {
            pickSection(.available(Pick(characters: "驚", senses: [sense], derived: nil)))
        }
    }

    func test_pickUnmappedRenders() {
        snapshotOnInn("pick-unmapped") {
            pickSection(.available(Pick(
                characters: "我想食飯，我仲想飲水",
                senses: [],
                derived: DerivedReading(segments: [
                    .init(characters: "我想", candidates: ["ngo5 soeng2"], isSeparator: false),
                    .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
                    .init(characters: "，", candidates: [], isSeparator: true),
                    .init(characters: "我", candidates: ["ngo5"], isSeparator: false),
                    .init(characters: "仲想", candidates: ["zung6 soeng2"], isSeparator: false),
                    .init(characters: "飲水", candidates: ["jam2 seoi2"], isSeparator: false),
                ])
            )))
        }
    }

    func test_pickUnmappedGapRenders() {
        snapshotOnInn("pick-unmapped-gap") {
            pickSection(.available(Pick(
                characters: "食飯X",
                senses: [],
                derived: DerivedReading(segments: [
                    .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
                    .init(characters: "X", candidates: [], isSeparator: false),
                ])
            )))
        }
    }

    func test_pickUnmappedNoReadingRenders() {
        snapshotOnInn("pick-unmapped-no-reading") {
            pickSection(.available(Pick(
                characters: "X",
                senses: [],
                derived: DerivedReading(segments: [
                    .init(characters: "X", candidates: [], isSeparator: false),
                ])
            )))
        }
    }

    // The bare results column, not LookupContentView: ImageRenderer draws
    // TextField as a no-entry placeholder and ScrollView as a sliver
    // (verified 2026-07-17), so the header and scroll chrome are gated on
    // device instead. The fixtures are static — not listening, no arriving
    // Pick — so frame zero is the design.
    private struct LookupFixture: View {
        var inlineError: String?
        var result: LookupResult?
        var presentation: PickPresentation = .hidden

        // Same dedup as LookupView.displayedSenses: the list hides what the
        // Pick already pins.
        private var displayedSenses: [Sense] {
            let base = result?.senses ?? []
            guard case .available(let pick) = presentation, !pick.senses.isEmpty else { return base }
            let pinnedIds = Set(pick.senses.map(\.id))
            return base.filter { !pinnedIds.contains($0.id) }
        }

        var body: some View {
            ZStack {
                InnBackground()
                VStack(spacing: 0) {
                    if let inlineError {
                        Text(inlineError)
                            .font(GameTheme.title(14))
                            .foregroundStyle(GameTheme.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 24)
                            .padding(.top, 6)
                    }
                    LookupResultsColumn(
                        result: result,
                        displayedSenses: displayedSenses,
                        showMoreVisible: !(result?.senses.isEmpty ?? true),
                        presentation: presentation,
                        selectedSenseId: nil, keptSenseId: nil, customKept: false,
                        onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in },
                        onSpeakCharacters: { _ in }, onKeepCustom: { _ in }
                    )
                    Spacer(minLength: 0)
                }
            }
        }
    }

    private var offlineSenses: [Sense] {
        [
            Sense(row: [
                "id": 1, "traditional": "食", "simplified": nil, "jyutping": "sik6",
                "pinyin": nil, "gloss": "to eat", "source": 0, "popularity": 5,
            ]),
            Sense(row: [
                "id": 2, "traditional": "食嘢", "simplified": nil, "jyutping": "sik6 je5",
                "pinyin": nil, "gloss": "to eat something", "source": 0, "popularity": 4,
            ]),
        ]
    }

    private var eatResult: LookupResult {
        LookupResult(senses: offlineSenses, isWordFallback: false)
    }

    private var mappedPick: Pick {
        Pick(characters: "食", senses: [offlineSenses[0]], derived: nil)
    }

    private var unmappedPick: Pick {
        Pick(
            characters: "我想食飯",
            senses: [],
            derived: DerivedReading(segments: [
                .init(characters: "我想", candidates: ["ngo5 soeng2"], isSeparator: false),
                .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
            ])
        )
    }

    private var trialOffer: PremiumOffer {
        PremiumOffer(
            displayName: "JyutKeep Plus", displayPrice: "A$2.99",
            billingPeriod: "month", trialText: "1 week free"
        )
    }

    private var subscribeOffer: PremiumOffer {
        PremiumOffer(
            displayName: "JyutKeep Plus", displayPrice: "A$2.99",
            billingPeriod: "month", trialText: nil
        )
    }

    func test_lookupIdleRenders() {
        snapshot("lookup-idle") { LookupFixture() }
    }

    func test_lookupCheckingAccessRenders() {
        snapshot("lookup-checking-access") {
            LookupFixture(result: eatResult, presentation: .checkingAccess)
        }
    }

    func test_lookupCheckingRenders() {
        snapshot("lookup-checking") {
            LookupFixture(result: eatResult, presentation: .checking)
        }
    }

    func test_lookupPickMappedRenders() {
        snapshot("lookup-pick-mapped") {
            LookupFixture(result: eatResult, presentation: .available(mappedPick))
        }
    }

    func test_lookupPickUnmappedRenders() {
        snapshot("lookup-pick-unmapped") {
            LookupFixture(
                result: LookupResult(senses: [], isWordFallback: false),
                presentation: .available(unmappedPick)
            )
        }
    }

    func test_lookupTrialUpsellRenders() {
        snapshot("lookup-trial-upsell") {
            LookupFixture(result: eatResult, presentation: .upsell(trialOffer))
        }
    }

    func test_lookupSubscribeUpsellRenders() {
        snapshot("lookup-subscribe-upsell") {
            LookupFixture(result: eatResult, presentation: .upsell(subscribeOffer))
        }
    }

    func test_lookupSubscriptionAttentionRenders() {
        snapshot("lookup-subscription-attention") {
            LookupFixture(result: eatResult, presentation: .subscriptionNeedsAttention)
        }
    }

    func test_lookupNetworkUnavailableRenders() {
        snapshot("lookup-network-unavailable") {
            LookupFixture(result: eatResult, presentation: .unavailable)
        }
    }

    func test_lookupQuotaUnavailableRenders() {
        snapshot("lookup-quota-unavailable") {
            LookupFixture(result: eatResult, presentation: .unavailableToday)
        }
    }

    func test_lookupNoOfflineResultsRenders() {
        snapshot("lookup-no-offline-results") {
            LookupFixture(
                result: LookupResult(senses: [], isWordFallback: false),
                presentation: .unavailable
            )
        }
    }

    func test_lookupInputTooLongRendersOnASmallPhone() {
        snapshot("lookup-input-too-long-375", width: 375) {
            LookupFixture(inlineError: "Keep the lookup under 60 characters.")
        }
    }

    // The unmapped editor at the narrowest phone still sold. The editor's
    // open state lives inside PickSectionView, so this renders the editor
    // component directly — same approach as the 393-width editor tests.
    func test_lookupPickUnmappedLongEditorRendersOnASmallPhone() {
        snapshot("lookup-pick-unmapped-long-375", width: 375) {
            ZStack {
                InnBackground()
                PickEditorView(
                    characters: "我想食飯，我仲想飲水",
                    segments: [
                        .init(characters: "我想", candidates: ["ngo5 soeng2"], isSeparator: false),
                        .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
                        .init(characters: "，", candidates: [], isSeparator: true),
                        .init(characters: "我", candidates: ["ngo5"], isSeparator: false),
                        .init(characters: "仲想", candidates: ["zung6 soeng2"], isSeparator: false),
                        .init(characters: "飲水", candidates: ["jam2 seoi2"], isSeparator: false),
                    ],
                    onSpeak: { _ in },
                    onKeep: { _ in }
                )
                .padding(16)
                .cardFrame()
                .padding()
            }
        }
    }

    func test_pickEditorRenders() {
        snapshotOnInn("pick-editor") {
            PickEditorView(
                characters: "食飯，飲水",
                segments: [
                    .init(characters: "食飯", candidates: ["sik6 faan6", "zi6 faan6"], isSeparator: false),
                    .init(characters: "，", candidates: [], isSeparator: true),
                    .init(characters: "飲水", candidates: ["jam2 seoi2"], isSeparator: false),
                ],
                onSpeak: { _ in },
                onKeep: { _ in }
            )
            .padding(16)
            .cardFrame()
            .padding()
        }
    }

    func test_pickEditorLongSentenceRenders() {
        snapshotOnInn("pick-editor-long") {
            PickEditorView(
                characters: "我想食飯，我仲想飲水",
                segments: [
                    .init(characters: "我想", candidates: ["ngo5 soeng2"], isSeparator: false),
                    .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
                    .init(characters: "，", candidates: [], isSeparator: true),
                    .init(characters: "我", candidates: ["ngo5"], isSeparator: false),
                    .init(characters: "仲想", candidates: ["zung6 soeng2"], isSeparator: false),
                    .init(characters: "飲水", candidates: ["jam2 seoi2"], isSeparator: false),
                ],
                onSpeak: { _ in },
                onKeep: { _ in }
            )
            .padding(16)
            .cardFrame()
            .padding()
        }
    }

    func test_pickEditorSavedReading_excludesSeparatorSegments() {
        let segments: [DerivedReading.Segment] = [
            .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
            .init(characters: "，", candidates: [], isSeparator: true),
            .init(characters: "飲水", candidates: ["jam2 seoi2"], isSeparator: false),
        ]

        XCTAssertEqual(
            PickEditorView.joinedJyutping(
                segments: segments,
                selections: ["sik6 faan6", "", "jam2 seoi2"]
            ),
            "sik6 faan6 jam2 seoi2"
        )
    }

    func test_pickEditorKeepGate_ignoresSeparatorsButBlocksUnknownOrEmptyReadings() {
        let matched: DerivedReading.Segment = .init(
            characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false
        )
        let separator: DerivedReading.Segment = .init(
            characters: "，", candidates: [], isSeparator: true
        )
        let unknown: DerivedReading.Segment = .init(
            characters: "X", candidates: [], isSeparator: false
        )

        XCTAssertFalse(PickEditorView.hasUnknownSegment(in: [separator]))
        XCTAssertTrue(PickEditorView.hasUnknownSegment(in: [separator, unknown]))
        XCTAssertFalse(PickEditorView.canKeep(segments: [], selections: []))
        XCTAssertFalse(PickEditorView.canKeep(segments: [separator], selections: [""]))
        XCTAssertFalse(PickEditorView.canKeep(segments: [unknown], selections: [""]))
        XCTAssertTrue(
            PickEditorView.canKeep(
                segments: [matched, separator], selections: ["sik6 faan6", ""]
            )
        )
    }

    // Bare pages on the inn backdrop, not OnboardingView itself: the
    // container's voice check reads the simulator's installed voices, which
    // would make the rendered state machine-dependent.
    func test_onboardingWelcomeRenders() {
        snapshot("onboarding-welcome") {
            ZStack {
                InnBackground()
                OnboardingWelcomePage(onNext: {})
            }
        }
    }

    func test_onboardingVoiceRendersBothStates() {
        snapshot("onboarding-voice-available") {
            ZStack {
                InnBackground()
                OnboardingVoicePage(voiceAvailable: true, onHearSample: {}, onNext: {})
            }
        }
        snapshot("onboarding-voice-missing") {
            ZStack {
                InnBackground()
                OnboardingVoicePage(voiceAvailable: false, onHearSample: {}, onNext: {})
            }
        }
    }

    func test_onboardingLookupRenders() {
        snapshot("onboarding-lookup") {
            ZStack {
                InnBackground()
                OnboardingLookupPage(onNext: {})
            }
        }
    }

    func test_onboardingBattleRenders() {
        snapshot("onboarding-battle") {
            ZStack {
                InnBackground()
                OnboardingBattlePage(onNext: {})
            }
        }
    }

    func test_onboardingTogetherRenders() {
        snapshot("onboarding-together") {
            ZStack {
                InnBackground()
                OnboardingTogetherPage(onNext: {})
            }
        }
    }

    func test_onboardingRewardsRenders() {
        snapshot("onboarding-rewards") {
            ZStack {
                InnBackground()
                OnboardingRewardsPage(onNext: {})
            }
        }
    }

    // The longest page copy on the narrowest phone still sold - render at
    // 375 and check nothing clips or crowds the dots.
    func test_onboardingBattleRendersOnASmallPhone() {
        snapshot("onboarding-battle-small", width: 375) {
            ZStack {
                InnBackground()
                OnboardingBattlePage(onNext: {})
            }
        }
    }

    func test_onboardingPackRenders() {
        snapshot("onboarding-pack") {
            ZStack {
                InnBackground()
                OnboardingPackPage(onAdd: {}, onSkip: {})
            }
        }
    }

    // The pack grid on the narrowest phone still sold: five 52pt sprite
    // columns fit at 393 but can crowd at 375 - render it and look.
    func test_onboardingPackRendersOnASmallPhone() {
        snapshot("onboarding-pack-small", width: 375) {
            ZStack {
                InnBackground()
                OnboardingPackPage(onAdd: {}, onSkip: {})
            }
        }
    }

    func test_innBackgroundRenders() {
        snapshot("inn-background") {
            InnBackground()
        }
    }

    func test_settingsScreenRenders() {
        // No NavigationStack: ImageRenderer draws UIKit-backed containers
        // as a "no entry" placeholder. The bare view is what's under design.
        snapshot("settings") {
            SettingsView()
        }
    }

    func test_runSummaryRenders() {
        var state = TowerEngine.makeFreshRun()
        state.damageDealt = 9
        // No NavigationStack: ImageRenderer draws UIKit-backed containers
        // as a "no entry" placeholder. The bare view is what's under design.
        snapshot("summary-victory") {
            RunSummaryView(state: state, outcome: .victory)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DungeonBackground())
        }
    }

    func test_runSummaryWithNewBadgesRenders() {
        var state = TowerEngine.makeFreshRun()
        state.damageDealt = 9
        snapshot("summary-badges") {
            RunSummaryView(state: state, outcome: .victory, newBadges: ["first-run", "first-victory", "streak-3"])
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DungeonBackground())
        }
    }

    private static let mixedEarned: Set<String> = [
        "first-run", "first-victory", "boss-tower", "streak-3", "hits-50",
    ]

    // The bare shelf, not BadgesView: ImageRenderer lays its ScrollView out as
    // a sliver. Mixed earned/unearned so the lit-vs-silhouette contrast shows -
    // all-earned or all-unearned would hide it.
    func test_badgesShelfRendersMixedEarnedState() {
        snapshot("badges-shelf") {
            ZStack {
                InnBackground()
                BadgeShelf(earned: Self.mixedEarned).padding()
            }
        }
    }

    // The narrowest phone still sold: the sockets have ~60pt of column here,
    // so a fixed-width socket overlaps its neighbour. Render it and look.
    func test_badgesShelfRendersOnASmallPhone() {
        snapshot("badges-shelf-small", width: 375) {
            ZStack {
                InnBackground()
                BadgeShelf(earned: Self.mixedEarned).padding()
            }
        }
    }

    // A tapped socket: the detail card pinned above the shelf, the selected
    // socket ringed. One earned and one unearned selection, so both faces of
    // the card get looked at.
    func test_badgeDetailCardRendersForEarnedAndUnearned() {
        snapshot("badges-detail") {
            ZStack {
                InnBackground()
                VStack(spacing: 16) {
                    BadgeDetailCard(id: "streak-7", earned: true)
                    BadgeDetailCard(id: "boss-desert", earned: false)
                    BadgeShelf(earned: Self.mixedEarned, selected: "streak-7")
                }
                .padding()
            }
        }
    }

    // The streak ornament at toolbar scale: the count must read as a badge
    // ON the flame, not as one more tappable toolbar button.
    func test_streakFlameChipRenders() {
        snapshot("streak-chip") {
            ZStack {
                DungeonBackground()
                HStack(spacing: 24) {
                    StreakFlameChip(streak: 2)
                    StreakFlameChip(streak: 14)
                    StreakFlameChip(streak: 365)
                }
            }
            .frame(height: 120)
        }
    }

    // Bare GearShelf, not ShopView: ImageRenderer lays its ScrollView out as
    // a sliver (the same trap as BadgeShelf above). Two sets, not the whole
    // catalogue - the full shelf is far taller than the frame and renders as
    // a mid-crop. A mix of owned/equipped/previewed/unowned/unaffordable so
    // every card state shows in one render.
    func test_gearShelfRendersMixedOwnedEquippedAndUnaffordableState() {
        snapshot("gear-shelf") {
            ZStack {
                InnBackground()
                GearShelf(
                    owned: ["hat-cap", "helm-knight"], equipped: [.helmet: "hat-cap"],
                    previewed: [.chest: "chest-knight"],
                    balance: 10, onBuy: { _ in }, onToggleEquip: { _ in }, onPreview: { _ in },
                    sets: Array(GearCatalog.sets.prefix(2))
                )
                .padding()
            }
        }
    }

    // The hero wearing a full knight kit plus a companion, on the same 64px
    // grid as the battle screen - the Shop's preview and the battle hero
    // share this view.
    func test_heroWearingGearRenders() {
        snapshot("hero-geared") {
            ZStack {
                InnBackground()
                AvatarSpriteView(
                    size: 130, avatarId: "avatar-scout",
                    equipped: [
                        .helmet: "helm-knight", .chest: "chest-knight", .leggings: "legs-knight",
                        .weapon: "weap-knight-sword", .offhand: "off-knight-shield", .companion: "pal-dragonling",
                    ]
                )
            }
        }
    }

    // Same gear, shown on the actual battle screen (not just the bare hero)
    // so the composition reads correctly against the dungeon backdrop too.
    func test_battleScreenWithGearRenders() {
        var state = TowerEngine.makeFreshRun()
        state.enemyHP = 5
        state.partyHP = 4
        snapshot("battle-geared") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {}, onAbandon: {},
                previewHand: sampleCards, previewAvatarId: "avatar-scout",
                previewEquipped: [.helmet: "helm-knight", .companion: "pal-dragonling"]
            )
        }
    }

    // Bare AvatarGrid, not the AvatarPickerView sheet: ImageRenderer draws
    // NavigationStack as a "no entry" placeholder, the same trap as
    // GearShelf/BadgeShelf above.
    func test_avatarPickerRenders() {
        snapshot("avatar-picker") {
            ZStack {
                InnBackground()
                AvatarGrid()
                    .padding()
            }
        }
    }

    // Card ceremony: the Box feedback shown after a Review commits. The
    // Hit/Whiff 0->1 pair (promoted-to-learning vs learning) both land on
    // "Learning" but must read differently - gold celebratory vs subdued.
    private var ceremonyCard: CardRecord { sampleCards[0] }

    func test_cardCeremonyPromotedToLearningRenders() {
        snapshot("ceremony-promoted-learning") {
            CardCeremonyView(card: ceremonyCard, kind: .promoted(to: 1), previewSettled: true)
        }
    }

    // Level-up fixtures use the card whose box actually produces the kind
    // (ReviewTransition's table), so the old->new frame flash in the PNG is
    // one the game can really show: bronze->jade, jade->gold.
    func test_cardCeremonyPromotedToSolidRenders() {
        snapshot("ceremony-promoted-solid") {
            CardCeremonyView(card: tierCards[1], kind: .promoted(to: 2), previewSettled: true)
        }
    }

    func test_cardCeremonyMasteredRenders() {
        snapshot("ceremony-mastered") {
            CardCeremonyView(card: tierCards[2], kind: .mastered, previewSettled: true)
        }
    }

    func test_cardCeremonyLearningRenders() {
        snapshot("ceremony-learning") {
            CardCeremonyView(card: ceremonyCard, kind: .learning)
        }
    }

    func test_cardCeremonyBackToLearningRenders() {
        snapshot("ceremony-back-to-learning") {
            CardCeremonyView(card: ceremonyCard, kind: .backToLearning)
        }
    }

    func test_cardCeremonyMasteredRendersOnASmallPhone() {
        snapshot("ceremony-mastered-375", width: 375) {
            CardCeremonyView(card: tierCards[2], kind: .mastered, previewSettled: true)
        }
    }

    func test_cardCeremonyBackToLearningRendersOnASmallPhone() {
        snapshot("ceremony-back-to-learning-375", width: 375) {
            CardCeremonyView(card: ceremonyCard, kind: .backToLearning)
        }
    }

    func test_cardCeremonyReduceMotionRenders() {
        snapshot("ceremony-reduce-motion") {
            CardCeremonyView(card: ceremonyCard, kind: .promoted(to: 1), reduceMotion: true)
        }
    }

    private func deckEntry(
        id: Int64, traditional: String, jyutping: String, english: String,
        benched: Bool = false, box: Int, dueOn: String = "2026-01-01"
    ) -> DeckEntry {
        DeckEntry(
            id: id, traditional: traditional, jyutping: jyutping, english: english,
            photoFilename: nil, benched: benched, box: box, dueOn: dueOn
        )
    }

    // The deck zoom card: battle frame + crest, both languages with speakers,
    // box/due status. A past-due date so the status reads "ready to battle".
    func test_deckCardDetailMasteredRenders() {
        snapshot("deck-detail-mastered") {
            DeckCardDetailView(
                entry: deckEntry(id: 1, traditional: "獅子", jyutping: "si1 zi2", english: "lion", box: 3),
                onToggleBench: {}, onPhoto: {}
            )
        }
    }

    func test_deckCardDetailBenchedRenders() {
        snapshot("deck-detail-benched") {
            DeckCardDetailView(
                entry: deckEntry(id: 2, traditional: "食", jyutping: "sik6", english: "eat", benched: true, box: 0, dueOn: "2099-01-01"),
                onToggleBench: {}, onPhoto: {}
            )
        }
    }

    // A word with no sprite: the characters carry the face alone.
    func test_deckCardDetailNoSpriteRenders() {
        snapshot("deck-detail-no-sprite") {
            DeckCardDetailView(
                entry: deckEntry(id: 3, traditional: "哲學", jyutping: "zit3 hok6", english: "philosophy", box: 1),
                onToggleBench: {}, onPhoto: {}
            )
        }
    }

    // Bare DeckRows, not DeckView: ImageRenderer draws List as a placeholder.
    // Sprite, no-sprite, and benched rows so all three thumbnail states show.
    func test_deckRowsRender() {
        snapshotOnInn("deck-rows") {
            VStack(spacing: 18) {
                DeckRow(entry: deckEntry(id: 1, traditional: "獅子", jyutping: "si1 zi2", english: "lion", box: 3))
                DeckRow(entry: deckEntry(id: 2, traditional: "哲學", jyutping: "zit3 hok6", english: "philosophy", box: 1))
                DeckRow(entry: deckEntry(id: 3, traditional: "食", jyutping: "sik6", english: "eat", benched: true, box: 0))
            }
            .padding(24)
        }
    }

    // The three shipped hats, redrawn onto the Rig as helmet layers. They kept
    // their ids so the wallet's gear rows still resolve, which means a future
    // redraw could silently put one back off the head - LOOK at this one.
    func test_shippedHatsSitOnBothAvatars() {
        snapshotOnInn("avatar-hats") {
            VStack(spacing: 20) {
                ForEach(["avatar-scout", "avatar-nova"], id: \.self) { avatar in
                    HStack(spacing: 12) {
                        ForEach(["hat-cap", "hat-crown", "hat-wizard"], id: \.self) { hat in
                            AvatarSpriteView(size: 96, avatarId: avatar, equipped: [.helmet: hat])
                        }
                    }
                }
            }
        }
    }

    // The bundled Silkscreen font is the sign's whole look: if it silently
    // fails to load, .custom falls back to system and every heading changes
    // without a build error. So this asserts the font, then LOOK at the PNG.
    func test_tavernSignHeadersRender() {
        XCTAssertNotNil(UIFont(name: "Silkscreen-Bold", size: 12), "bundled Silkscreen-Bold failed to load")
        snapshotOnInn("tavern-sign-headers") {
            VStack(spacing: 44) {
                TavernSignHeader(title: "Deck")
                TavernSignHeader(title: "Shop")
                TavernSignHeader(title: "Settings")
                TavernSignHeader(title: "Choose Hero")
            }
        }
    }
}
