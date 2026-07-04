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
                onVictory: {}, onDefeat: {},
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
                onVictory: {}, onDefeat: {},
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

    func test_forestBattleScreenRenders() {
        var state = TowerEngine.makeFreshRun(biome: .forest)
        state.enemyHP = 5
        snapshot("battle-forest") {
            BattleView(
                runState: .constant(state),
                onVictory: {}, onDefeat: {},
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
                onVictory: {}, onDefeat: {},
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

    func test_runSummaryRenders() {
        var state = TowerEngine.makeFreshRun()
        state.kidDamageDealt = 9
        // No NavigationStack: ImageRenderer draws UIKit-backed containers
        // as a "no entry" placeholder. The bare view is what's under design.
        snapshot("summary-victory") {
            RunSummaryView(state: state, outcome: .victory)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DungeonBackground())
        }
    }
}
