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
        CardRecord(id: 2, traditional: "獅子", jyutping: "si1 zi2", english: "lion", box: 1, dueOn: "2026-01-01"),
        CardRecord(id: 3, traditional: "大象", jyutping: "daai6 zoeng6", english: "elephant", box: 2, dueOn: "2026-01-01"),
    ]

    private func snapshot(_ name: String, @ViewBuilder content: () -> some View) {
        let view = content()
            .frame(width: 393, height: 760)
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
                pick: Pick(characters: "驚", senses: [sense]),
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
                pick: Pick(characters: "冇譜", senses: []),
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
}
