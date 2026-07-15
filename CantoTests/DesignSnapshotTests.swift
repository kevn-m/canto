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

    func test_cardFrontRenders() {
        snapshot("card-front") {
            CardPlayView(card: sampleCards[1]) { _ in }
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

    func test_pickMappedRenders() {
        let sense = Sense(row: [
            "id": 1, "traditional": "驚", "simplified": nil, "jyutping": "geng1",
            "pinyin": nil, "gloss": "scared", "source": 0, "popularity": 5,
        ])
        snapshotOnInn("pick-mapped") {
            PickSectionView(
                pick: Pick(characters: "驚", senses: [sense], derived: nil),
                pickPending: false, selectedSenseId: nil, keptSenseId: nil, customKept: false,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
                readingCandidates: { _ in [] }, onKeepCustom: { _ in }
            )
            .padding()
        }
    }

    func test_pickUnmappedRenders() {
        snapshotOnInn("pick-unmapped") {
            PickSectionView(
                pick: Pick(
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
                ),
                pickPending: false, selectedSenseId: nil, keptSenseId: nil, customKept: false,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
                readingCandidates: { _ in [] }, onKeepCustom: { _ in }
            )
            .padding()
        }
    }

    func test_pickUnmappedGapRenders() {
        snapshotOnInn("pick-unmapped-gap") {
            PickSectionView(
                pick: Pick(
                    characters: "食飯X",
                    senses: [],
                    derived: DerivedReading(segments: [
                        .init(characters: "食飯", candidates: ["sik6 faan6"], isSeparator: false),
                        .init(characters: "X", candidates: [], isSeparator: false),
                    ])
                ),
                pickPending: false, selectedSenseId: nil, keptSenseId: nil, customKept: false,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
                readingCandidates: { _ in [] }, onKeepCustom: { _ in }
            )
            .padding()
        }
    }

    func test_pickUnmappedNoReadingRenders() {
        snapshotOnInn("pick-unmapped-no-reading") {
            PickSectionView(
                pick: Pick(
                    characters: "X",
                    senses: [],
                    derived: DerivedReading(segments: [
                        .init(characters: "X", candidates: [], isSeparator: false),
                    ])
                ),
                pickPending: false, selectedSenseId: nil, keptSenseId: nil, customKept: false,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
                readingCandidates: { _ in [] }, onKeepCustom: { _ in }
            )
            .padding()
        }
    }

    func test_pickOfflineMarkerRenders() {
        snapshotOnInn("pick-offline") {
            PickSectionView(
                pick: nil,
                pickPending: false, selectedSenseId: nil, keptSenseId: nil, customKept: false,
                onTap: { _ in }, onKeep: { _ in }, onCamera: { _ in }, onSpeakCharacters: { _ in },
                readingCandidates: { _ in [] }, onKeepCustom: { _ in }
            )
            .padding()
        }
    }

    func test_pickEditorRenders() {
        snapshotOnInn("pick-editor") {
            PickEditorView(
                characters: "冇譜",
                candidates: { char in char == "冇" ? ["mou5"] : ["pou2"] },
                onSpeak: { _ in },
                onKeep: { _ in }
            )
            .padding(16)
            .cardFrame()
            .padding()
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
    // a sliver (the same trap as BadgeShelf above). A mix of owned/equipped/
    // unowned/unaffordable so every card state shows in one render.
    func test_gearShelfRendersMixedOwnedEquippedAndUnaffordableState() {
        snapshot("gear-shelf") {
            ZStack {
                InnBackground()
                GearShelf(
                    owned: ["hat-cap", "pal-cat"], equipped: [.helmet: "hat-cap"],
                    balance: 10, onBuy: { _ in }, onToggleEquip: { _ in }
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
}
