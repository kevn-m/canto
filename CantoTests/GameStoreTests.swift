import XCTest
import GRDB
import UIKit
@testable import Canto

final class GameStoreTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("GameStoreTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    // Reads reviews.count directly from the sqlite file: GameStore's public
    // API has no getter for it, and adding one just for this assertion would
    // be surface area the game never needs.
    private func reviewCount() throws -> Int {
        let queue = try DatabaseQueue(path: tempDir.appendingPathComponent("game.sqlite").path)
        return try queue.read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM reviews") ?? 0
        }
    }

    // MARK: - syncDeck

    func test_syncDeck_importsOnlyLookupsWithChosenSense() {
        let log = LogStore(directory: tempDir)
        log.record(heard: "nothing chosen", matched: false, viaVoice: false)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let deck = store.deck()
        XCTAssertEqual(deck.count, 1)
        XCTAssertEqual(deck[0].traditional, "食")
    }

    // A custom Keep (Slice 6, no dictionary sense) reaches the Deck the same
    // way a normal Keep does - syncDeck only cares about the denormalised pair.
    func test_syncDeck_importsCustomKeptLookup() {
        let log = LogStore(directory: tempDir)
        let id = log.record(heard: "unmapped word", matched: true, viaVoice: false)
        log.setChosenCustom(lookupId: id!, traditional: "冇譜", jyutping: "mou5 pou2")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let deck = store.deck()
        XCTAssertEqual(deck.count, 1)
        XCTAssertEqual(deck[0].traditional, "冇譜")
        XCTAssertEqual(deck[0].jyutping, "mou5 pou2")
    }

    func test_syncDeck_duplicateTraditionalJyutpingCollapseToOneCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "eat again", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 1)
    }

    func test_syncDeck_safeToRunTwiceWithNoNewLookups() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 1)
    }

    func test_syncDeck_checkpointAdvancesSoLaterSyncOnlyImportsNewLookups() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        XCTAssertEqual(store.deck().count, 1)

        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, 2)
    }

    func test_syncDeck_createsCardStateOnNewCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")

        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 0)
        XCTAssertEqual(entry.dueOn, "1970-01-01")
    }

    // MARK: - addStarterCards

    func test_addStarterCards_runningTwiceAddsNothing() {
        let store = GameStore(directory: tempDir)
        store.addStarterCards(StarterPack.words)
        XCTAssertEqual(store.deck().count, StarterPack.words.count)

        store.addStarterCards(StarterPack.words)
        XCTAssertEqual(store.deck().count, StarterPack.words.count)
    }

    func test_addStarterCards_laterNaturalKeepOfAStarterWordDoesNotDuplicate() {
        let store = GameStore(directory: tempDir)
        store.addStarterCards(StarterPack.words)

        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        store.syncDeck(from: log)

        XCTAssertEqual(store.deck().count, StarterPack.words.count)
    }

    func test_addStarterCards_startsEveryCardInBoxZero() {
        let store = GameStore(directory: tempDir)
        store.addStarterCards(StarterPack.words)

        for entry in store.deck() {
            XCTAssertEqual(entry.box, 0)
            XCTAssertEqual(entry.dueOn, "1970-01-01")
        }
    }

    // MARK: - recordReview

    func test_recordReview_hitClimbsBoxAndAppendsReviewRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        let transition = store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04")

        XCTAssertEqual(transition, ReviewTransition(result: .hit, oldBox: 0, newBox: 1))
        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 1)
        XCTAssertEqual(entry.dueOn, "2026-07-05")
        XCTAssertEqual(try reviewCount(), 1)
    }

    // A card already at Solid (box 2) is the only starting point that reaches
    // Mastered on a Hit - the transition it returns must say so exactly.
    func test_recordReview_solidCardHitReturnsExactTransitionToMastered() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04") // 0 -> 1
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-05") // 1 -> 2

        let transition = store.recordReview(cardId: cardId, result: .hit, on: "2026-07-08") // 2 -> 3

        XCTAssertEqual(transition, ReviewTransition(result: .hit, oldBox: 2, newBox: 3))
    }

    // A card already at Mastered (box 3) whiffing must report the exact
    // Back to Learning transition, not just a truthy write.
    func test_recordReview_masteredCardWhiffReturnsExactTransitionToLearning() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04") // 0 -> 1
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-05") // 1 -> 2
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-08") // 2 -> 3

        let transition = store.recordReview(cardId: cardId, result: .whiff, on: "2026-07-15") // 3 -> 1

        XCTAssertEqual(transition, ReviewTransition(result: .whiff, oldBox: 3, newBox: 1))
    }

    func test_recordReview_whiffDropsBoxAndStaysDueTodayAndAppendsReviewRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04")
        store.recordReview(cardId: cardId, result: .whiff, on: "2026-07-05")

        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 1)
        XCTAssertEqual(entry.dueOn, "2026-07-05")
        XCTAssertEqual(try reviewCount(), 2)
    }

    // MARK: - dueCards / nextCards / benching

    func test_benchedCards_excludedFromDueAndNextCards() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.setBenched(cardId: cardId, true)

        XCTAssertTrue(store.dueCards(on: "2026-07-04", excluding: []).isEmpty)
        XCTAssertTrue(store.nextCards(excluding: [], limit: 3).isEmpty)
    }

    func test_setBenchedBatch_updatesOnlyGivenCards() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "drink", traditional: "飲", jyutping: "jam2")
        makeChosenLookup(log, heard: "lion", traditional: "獅子", jyutping: "si1 zi2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let ids = store.deck().map(\.id)

        store.setBenched(cardIds: [ids[0], ids[1]], true)

        XCTAssertEqual(store.deck().map(\.benched), [true, true, false])
    }

    // Presets rewrite EVERY bench flag so each one lands a predictable
    // layout: "Drill weaker" must also unbench a weak card the kid had
    // manually benched, or the drill would silently skip it.
    func test_applyBenchPreset_drillWeaker_benchesMasteredAndUnbenchesTheRest() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "drink", traditional: "飲", jyutping: "jam2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let ids = store.deck().map(\.id)
        masterCard(store, cardId: ids[0])
        store.setBenched(cardId: ids[1], true)

        store.applyBenchPreset(.drillWeaker)

        XCTAssertEqual(store.deck().map(\.benched), [true, false])
    }

    func test_applyBenchPreset_drillMastered_benchesEverythingBelowMastered() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "drink", traditional: "飲", jyutping: "jam2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let ids = store.deck().map(\.id)
        masterCard(store, cardId: ids[0])
        store.setBenched(cardId: ids[0], true)

        store.applyBenchPreset(.drillMastered)

        XCTAssertEqual(store.deck().map(\.benched), [false, true])
    }

    // The undo for the presets and any manual benching.
    func test_applyBenchPreset_wholeDeck_unbenchesEveryCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "drink", traditional: "飲", jyutping: "jam2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        store.applyBenchPreset(.drillMastered)

        store.applyBenchPreset(.wholeDeck)

        XCTAssertEqual(store.deck().map(\.benched), [false, false])
    }

    // Three hits climb New -> Learning -> Solid -> Mastered.
    private func masterCard(_ store: GameStore, cardId: Int64) {
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-01")
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-02")
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-03")
    }

    func test_dueCards_returnsUnbenchedDueCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        let due = store.dueCards(on: "2026-07-04", excluding: [])
        XCTAssertEqual(due.count, 1)
        XCTAssertEqual(due[0].traditional, "食")
    }

    func test_dueCards_carriesPhotoFilenameFromSetPhoto() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        store.setPhoto(cardId: cardId, filename: "card-\(cardId).jpg")

        let due = store.dueCards(on: "2026-07-04", excluding: [])
        XCTAssertEqual(due.first?.photoFilename, "card-\(cardId).jpg")
    }

    // MARK: - deleteCard

    func test_deleteCard_cascadesReviewsAndCardStates() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04")

        store.deleteCard(cardId: cardId)

        XCTAssertTrue(store.deck().isEmpty)
        XCTAssertEqual(try reviewCount(), 0)
        let stateCount = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM card_states WHERE card_id = ?", arguments: [cardId]) ?? 0
        }
        XCTAssertEqual(stateCount, 0)
    }

    func test_deleteCard_refusesWhileRunUnfinished() {
        let store = GameStore(directory: tempDir)
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.startRun(on: ReviewEngine.todayString(), state: makeRunState())

        store.deleteCard(cardId: cardId)

        XCTAssertEqual(store.deck().count, 1)
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
    }

    // A Run abandoned on a past day is unresumable, so it must not lock deck
    // cleanup forever - only TODAY's unfinished Run blocks a delete.
    func test_deleteCard_allowedDespiteUnfinishedRunFromAnotherDay() {
        let store = GameStore(directory: tempDir)
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.startRun(on: "2000-01-01", state: makeRunState())

        store.deleteCard(cardId: cardId)

        XCTAssertTrue(store.deck().isEmpty)
    }

    // The slice's real behaviour: a committed delete removes the photo file
    // from disk, not just the DB rows.
    func test_deleteCard_removesPhotoFileFromDisk() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id

        let photos = CardPhotos(directory: tempDir)
        let filename = photos.save(image: makeSmallImage(), cardId: cardId)!
        store.setPhoto(cardId: cardId, filename: filename)
        XCTAssertNotNil(photos.load(filename: filename))

        store.deleteCard(cardId: cardId)

        XCTAssertNil(photos.load(filename: filename))
    }

    func test_deleteCard_onUnknownIdIsANoOp() {
        let store = GameStore(directory: tempDir)

        store.deleteCard(cardId: 99999)

        drainMainQueue()
        XCTAssertNil(store.lastError)
        XCTAssertTrue(store.deck().isEmpty)
    }

    private func makeSmallImage() -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4)).image { context in
            UIColor.red.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 4, height: 4))
        }
    }

    func test_deleteCard_thenReKeepRecreatesAsFreshCard() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04")

        store.deleteCard(cardId: cardId)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        store.syncDeck(from: log)

        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 0)
    }

    // MARK: - resetEverything

    // The gear rows are wiped, so what's equipped must go too - it lives in
    // meta, and a stale key leaves the hero wearing a hat the kid doesn't own.
    func test_resetEverything_unequipsGearItJustDeleted() {
        let store = GameStore(directory: tempDir)
        store.credit(Balance.gearPriceHat, reason: "test")
        XCTAssertTrue(store.buyGear(id: "hat-crown"))
        store.equip(slot: .helmet, id: "hat-crown")
        XCTAssertEqual(store.equippedGear()[.helmet], "hat-crown")

        store.resetEverything(clearing: LogStore(directory: tempDir))

        XCTAssertTrue(store.ownedGear().isEmpty)
        XCTAssertNil(store.equippedGear()[.helmet], "a reset hero must not wear gear it no longer owns")
    }

    // This exact bug - clearing a table but leaving its meta pointer behind -
    // has shipped twice. Every equipped_* slot and avatar_id must go, not just
    // the ones that existed when this test was last touched.
    func test_resetEverything_clearsAvatarIdAndEveryEquippedSlot() {
        let store = GameStore(directory: tempDir)
        store.credit(GearCatalog.all.reduce(0) { $0 + $1.price }, reason: "test")
        for item in GearCatalog.all {
            XCTAssertTrue(store.buyGear(id: item.id))
            store.equip(slot: item.slot, id: item.id)
        }
        store.setAvatar(id: "avatar-scout")
        XCTAssertEqual(store.avatarId(), "avatar-scout")
        for slot in GearSlot.allCases {
            XCTAssertNotNil(store.equippedGear()[slot], "\(slot) should be equipped before reset")
        }

        store.resetEverything(clearing: LogStore(directory: tempDir))

        XCTAssertNil(store.avatarId(), "a reset must go back to the legacy kid sprite")
        for slot in GearSlot.allCases {
            XCTAssertNil(store.equippedGear()[slot], "\(slot) must not survive a reset")
        }
    }

    // A reset zeroes the wallet, so a surviving badge row would mean the kid
    // re-grinds the same threshold and gets paid nothing for it, forever.
    func test_resetEverything_clearsBadgesSoTheyCanBeEarnedAgain() {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        XCTAssertEqual(store.finishRun(id: runId, state: makeRunState(enemyHP: 0)), ["first-run", "first-victory"])

        store.resetEverything(clearing: LogStore(directory: tempDir))

        let secondRun = store.startRun(on: "2026-07-05", state: makeRunState())!
        XCTAssertEqual(
            store.finishRun(id: secondRun, state: makeRunState(enemyHP: 0)), ["first-run", "first-victory"],
            "a fresh start must be able to re-earn the badges it just wiped"
        )
        XCTAssertEqual(store.balance(), Balance.runFinishPay + Balance.bossBonusPay + Balance.badgePay * 2)
    }

    func test_resetEverything_wipesDeckHistoryLedgerRunsAndPhotosButKeepsShopItems() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let cardId = store.deck().first!.id
        store.recordReview(cardId: cardId, result: .hit, on: "2026-07-04")
        store.credit(10, reason: "run_finish")
        store.addShopItem(name: "Ice cream", price: 20)
        store.startRun(on: "2026-07-04", state: makeRunState())
        let photos = CardPhotos(directory: tempDir)
        let filename = photos.save(image: makeSmallImage(), cardId: cardId)!
        store.setPhoto(cardId: cardId, filename: filename)

        store.resetEverything(clearing: log)

        XCTAssertTrue(store.deck().isEmpty)
        XCTAssertEqual(try reviewCount(), 0)
        XCTAssertEqual(store.balance(), 0)
        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        XCTAssertNil(photos.load(filename: filename))
        XCTAssertTrue(log.recentLookups().isEmpty)
        XCTAssertEqual(store.shopItems(includeArchived: true).count, 1, "shop_items survive a reset")
    }

    // The checkpoint reset is what stops syncDeck from re-importing the whole
    // history back in right after a reset.
    func test_resetEverything_resetsCheckpointSoSyncDeckOnlyImportsFutureLookups() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        store.resetEverything(clearing: log)
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        store.syncDeck(from: log)

        let deck = store.deck()
        XCTAssertEqual(deck.count, 1)
        XCTAssertEqual(deck[0].traditional, "狗")
    }

    // log.sqlite is cleared before game.sqlite is touched, so a log-clear
    // failure must leave the deck/checkpoint alone rather than resetting
    // game.sqlite and silently resurrecting history on the next sync.
    func test_resetEverythingWhenLogClearFails_leavesGameDatabaseUntouchedAndSetsLastError() throws {
        let unwritableLogDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("GameStoreTests-unwritable-log-\(UUID().uuidString)")
        try "not a directory".write(to: unwritableLogDir, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: unwritableLogDir) }
        let unwritableLog = LogStore(directory: unwritableLogDir)
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        store.resetEverything(clearing: unwritableLog)

        XCTAssertEqual(store.deck().count, 1, "game.sqlite must stay intact when the log clear fails")
        XCTAssertEqual(store.lastError, "Couldn't reset — try again.")
    }

    // MARK: - Ledger

    func test_balance_isSumOfLedgerAndCreditAdds() {
        let store = GameStore(directory: tempDir)
        XCTAssertEqual(store.balance(), 0)

        store.credit(10, reason: "run_finish")
        store.credit(5, reason: "boss_bonus")

        XCTAssertEqual(store.balance(), 15)
    }

    func test_redeem_decrementsBalanceExactlyOnceWhenAffordable() {
        let store = GameStore(directory: tempDir)
        store.credit(30, reason: "run_finish")
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!

        XCTAssertTrue(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 10)
    }

    func test_redeem_refusesAndWritesNothingWhenBalanceTooLow() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!

        XCTAssertFalse(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 0)
    }

    // MARK: - Shop

    func test_shopItem_addAndArchiveRoundTrip() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Ice cream", price: 20)
        XCTAssertEqual(store.shopItems(includeArchived: false).count, 1)

        let item = store.shopItems(includeArchived: false).first!
        store.archiveShopItem(id: item.id)

        XCTAssertTrue(store.shopItems(includeArchived: false).isEmpty)
        XCTAssertEqual(store.shopItems(includeArchived: true).count, 1)
        XCTAssertTrue(store.shopItems(includeArchived: true).first!.archived)
    }

    // MARK: - reviewedCardIds

    func test_reviewedCardIds_filtersByDate() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id
        let dogId = store.deck().first { $0.traditional == "狗" }!.id

        // recordReview always stamps reviewed_at with the real clock, not the
        // "on:" scheduling date, so seed rows directly to control the date.
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [eatId, "kid", "hit", "2026-07-04T10:00:00Z"]
            )
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [dogId, "dad", "hit", "2026-07-04T11:00:00Z"]
            )
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [dogId, "kid", "hit", "2026-07-03T09:00:00Z"]
            )
        }

        XCTAssertEqual(store.reviewedCardIds(on: "2026-07-04"), [eatId], "the dad row is ignored")
        XCTAssertEqual(store.reviewedCardIds(on: "2026-07-03"), [dogId])
    }

    // reviewed_at is UTC but the queried day is local. East of UTC, an
    // early-morning review's UTC date is still yesterday - a date-prefix
    // match would drop it and let a resumed Run re-review the card.
    // Honest limit: on a UTC-configured machine local == UTC, so this can't
    // distinguish range- from prefix-matching there. It bites on the AEST
    // machine this suite actually runs on.
    func test_reviewedCardIds_includesEarlyMorningReviewAcrossUTCBoundary() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first!.id

        let localMidnight = ReviewEngine.startOfLocalDay("2026-07-04")!
        let oneAMLocal = ISO8601DateFormatter().string(from: localMidnight.addingTimeInterval(3600))

        try rawGameQueue(in: tempDir).write { db in
            try db.execute(
                sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (?, ?, ?, ?)",
                arguments: [eatId, "kid", "hit", oneAMLocal]
            )
        }

        XCTAssertEqual(store.reviewedCardIds(on: "2026-07-04"), [eatId])
        XCTAssertTrue(store.reviewedCardIds(on: "2026-07-03").isEmpty)
    }

    // MARK: - Runs

    private func makeRunState(enemyHP: Int = 7) -> RunState {
        RunState(
            floors: [RunState.Floor(kind: .fight, enemyName: "slime", maxHP: 7)],
            floorIndex: 0, enemyHP: enemyHP, partyHP: 5,
            dealt: [], damageDealt: 0, extensionsTaken: 0
        )
    }

    func test_run_startSaveTodaysRunRoundTrip() {
        let store = GameStore(directory: tempDir)

        let runId = store.startRun(on: "2026-07-04", state: makeRunState())
        XCTAssertNotNil(runId)

        store.saveRun(id: runId!, state: makeRunState(enemyHP: 4))

        let fetched = store.todaysRun(on: "2026-07-04")
        XCTAssertEqual(fetched?.id, runId)
        XCTAssertEqual(fetched?.state.enemyHP, 4)
    }

    // Resume must be unambiguous: one unfinished run at a time. Finished
    // runs don't block - that's the next test.
    func test_startRun_refusesWhileAnUnfinishedRunExists() {
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
        XCTAssertNil(store.startRun(on: "2026-07-04", state: makeRunState()))
    }

    // Kevin removed the one-Run-per-day rule: play again immediately, and
    // every finished run pays. Farming is accepted - the shop is dad-gated.
    func test_startRun_allowedAgainAfterFinishing_andEachRunPays() {
        let store = GameStore(directory: tempDir)
        let first = store.startRun(on: "2026-07-04", state: makeRunState())!
        store.finishRun(id: first, state: makeRunState(enemyHP: 0))
        let paidOnce = store.balance()
        XCTAssertGreaterThan(paidOnce, 0)

        let second = store.startRun(on: "2026-07-04", state: makeRunState())
        XCTAssertNotNil(second)
        XCTAssertNotEqual(second, first)
        store.finishRun(id: second!, state: makeRunState(enemyHP: 0))

        // The run payout repeats every finish, but first-run/first-victory
        // are one-shot badges already earned by the first finish - farming
        // pays run+boss twice, not the badge bonus twice.
        let runAndBossPay = Balance.runFinishPay + Balance.bossBonusPay
        XCTAssertEqual(store.balance(), paidOnce + runAndBossPay)
    }

    func test_finishRun_marksFinished() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!

        store.finishRun(id: runId, state: makeRunState(enemyHP: 0))

        // A finished run is history: todaysRun (resume) no longer sees it.
        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        let finished = try rawGameQueue(in: tempDir).read { db in
            try Bool.fetchOne(db, sql: "SELECT finished FROM runs WHERE id = ?", arguments: [runId])
        }
        XCTAssertEqual(finished, true)
    }

    func test_finishedRunDates_onlyIncludesFinishedRunsAndDedupsSameDate() {
        let store = GameStore(directory: tempDir)
        let unfinished = store.startRun(on: "2026-07-05", state: makeRunState())!
        _ = unfinished

        let first = store.startRun(on: "2026-07-04", state: makeRunState())!
        store.finishRun(id: first, state: makeRunState(enemyHP: 0))
        let second = store.startRun(on: "2026-07-04", state: makeRunState())!
        store.finishRun(id: second, state: makeRunState(enemyHP: 0))

        XCTAssertEqual(store.finishedRunDates(), ["2026-07-04"])
    }

    func test_earnedBadges_returnsWhatFinishRunAwardedInOrder() {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!

        let newBadges = store.finishRun(id: runId, state: makeRunState(enemyHP: 0))

        XCTAssertEqual(Set(store.earnedBadges().map(\.id)), Set(newBadges))
    }

    func test_earnedBadges_isEmptyOnAFreshDatabase() {
        let store = GameStore(directory: tempDir)

        XCTAssertEqual(store.earnedBadges().count, 0)
    }

    // MARK: - abandonRun

    func test_abandonRun_deletesUnfinishedRowAndPaysNothing() {
        let store = GameStore(directory: tempDir)
        let id = store.startRun(on: "2026-07-04", state: makeRunState())!
        let balanceBefore = store.balance()

        store.abandonRun(id: id)

        XCTAssertNil(store.todaysRun(on: "2026-07-04"), "abandoned run must not resume")
        XCTAssertEqual(store.balance(), balanceBefore, "abandoning pays nothing")
    }

    // Same finished = 0 guard as saveRun/finishRun: a Run that already paid
    // out is history, and abandon must not be able to erase it.
    func test_abandonRun_cannotDeleteAFinishedRun() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        store.finishRun(id: runId, state: makeRunState(enemyHP: 0))

        store.abandonRun(id: runId)

        let survivingRows = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM runs WHERE id = ?", arguments: [runId]) ?? 0
        }
        XCTAssertEqual(survivingRows, 1, "a finished run's paid history is never deleted")
    }

    // MARK: - finishRun payout

    func test_finishRun_paysFinishAndBossBonusExactlyOnce() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        let victoryState = makeRunState(enemyHP: 0) // partyHP: 5, from makeRunState default

        // This is also this store's first finish and first victory, so the
        // one-shot badges pay alongside the run payout - see the Badges
        // section below for badge-focused assertions.
        let firstBadges = store.finishRun(id: runId, state: victoryState)
        XCTAssertEqual(Set(firstBadges), ["first-run", "first-victory"])
        let expectedBalance = Balance.runFinishPay + Balance.bossBonusPay + Balance.badgePay * firstBadges.count
        XCTAssertEqual(store.balance(), expectedBalance)

        // Same id, mirroring TowerView's self-healing load path re-calling
        // finishRun on an already-finished run - must not double-pay.
        XCTAssertEqual(store.finishRun(id: runId, state: victoryState), [])
        XCTAssertEqual(store.balance(), expectedBalance)

        let reasons = try rawGameQueue(in: tempDir).read { db in
            try String.fetchAll(db, sql: "SELECT reason FROM bux_ledger ORDER BY id")
        }
        XCTAssertEqual(reasons, ["run_finish", "boss_bonus", "badge:first-run", "badge:first-victory"])
    }

    func test_finishRun_defeatStillPaysRunFinishPay() {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        var defeatState = makeRunState(enemyHP: 3)
        defeatState.partyHP = 0

        // A defeat still finishes a run, so first-run pays alongside it.
        let badges = store.finishRun(id: runId, state: defeatState)

        XCTAssertEqual(badges, ["first-run"])
        XCTAssertEqual(store.balance(), Balance.runFinishPay + Balance.badgePay)
    }

    // MARK: - Badges

    private func makeBossRunState(enemyHP: Int = 0) -> RunState {
        RunState(
            floors: [RunState.Floor(kind: .boss, enemyName: "dragon", maxHP: Balance.bossHP)],
            floorIndex: 0, enemyHP: enemyHP, partyHP: 5,
            dealt: [], damageDealt: 0, extensionsTaken: 0
        )
    }

    func test_finishRun_awardsFirstRunBadgeAndCreditsItExactlyOnce() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        var defeatState = makeRunState(enemyHP: 3)
        defeatState.partyHP = 0

        let newBadges = store.finishRun(id: runId, state: defeatState)

        XCTAssertEqual(newBadges, ["first-run"])
        XCTAssertEqual(store.balance(), Balance.runFinishPay + Balance.badgePay)
        let badgeRows = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM badges WHERE badge_id = 'first-run'") ?? 0
        }
        XCTAssertEqual(badgeRows, 1)
        let ledgerRows = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM bux_ledger WHERE reason = 'badge:first-run'") ?? 0
        }
        XCTAssertEqual(ledgerRows, 1)
    }

    // Re-finishing the same run (TowerView's self-heal path) must not
    // double-award or double-credit - the changesCount > 0 guard covers both
    // the payout and the badge together, in one transaction.
    func test_finishRun_reFinishingSameRunAwardsBadgeOnlyOnce() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        let victoryState = makeRunState(enemyHP: 0)

        XCTAssertEqual(store.finishRun(id: runId, state: victoryState), ["first-run", "first-victory"])
        XCTAssertEqual(store.finishRun(id: runId, state: victoryState), [], "already-finished re-entry pays nothing new")

        let balanceAfterOnce = Balance.runFinishPay + Balance.bossBonusPay + Balance.badgePay * 2
        XCTAssertEqual(store.balance(), balanceAfterOnce)
        let badgeCount = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM badges") ?? 0
        }
        XCTAssertEqual(badgeCount, 2)
    }

    // A badge already earned on an earlier run must not be re-awarded (and
    // re-credited) just because its threshold is still satisfied later.
    func test_finishRun_doesNotReAwardAnAlreadyEarnedBadgeOnALaterRun() {
        let store = GameStore(directory: tempDir)
        let first = store.startRun(on: "2026-07-04", state: makeRunState())!
        // makeRunState's default partyHP (5) makes this a victory too, so the
        // first finish earns both one-shot badges - the second finish below
        // is the part under test.
        XCTAssertEqual(Set(store.finishRun(id: first, state: makeRunState(enemyHP: 3))), ["first-run", "first-victory"])

        let second = store.startRun(on: "2026-07-04", state: makeRunState())!
        let newBadges = store.finishRun(id: second, state: makeRunState(enemyHP: 3))

        XCTAssertEqual(newBadges, [], "finishedRuns >= 1 is still true, but first-run is already owned")
    }

    // Beating a biome's boss on THIS finishing run earns that biome's badge -
    // forward-only, no scan of historical state_json (see BadgeEngine).
    func test_finishRun_bossBadgeKeysOffThisRunsBossFloor() {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeBossRunState())!

        let newBadges = store.finishRun(id: runId, state: makeBossRunState(enemyHP: 0))

        XCTAssertTrue(newBadges.contains("boss-tower"))
    }

    // rich-100 must key off the running MAX of the wallet, not the balance at
    // finish time - a kid who earned 120 then spent down to 20 still earned it.
    func test_finishRun_richHundredUsesRunningMaxNotCurrentBalance() {
        let store = GameStore(directory: tempDir)
        store.credit(120, reason: "run_finish")
        store.credit(-100, reason: "redeem:test")
        XCTAssertEqual(store.balance(), 20)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!

        let newBadges = store.finishRun(id: runId, state: makeRunState(enemyHP: 3))

        XCTAssertTrue(newBadges.contains("rich-100"))
    }

    // A device db created at schema v3 (pre-badges) must migrate to v4 with
    // its wallet balance and box progress completely unchanged - the
    // migration only CREATEs the new badges/gear tables.
    func test_schemaV3_migratesToV4WithoutTouchingExistingData() throws {
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: """
                CREATE TABLE cards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  traditional TEXT NOT NULL, jyutping TEXT NOT NULL, english TEXT NOT NULL,
                  photo_filename TEXT, benched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
                  UNIQUE(traditional, jyutping)
                )
                """)
            try db.execute(sql: """
                CREATE TABLE card_states (
                  card_id INTEGER NOT NULL REFERENCES cards(id),
                  player TEXT NOT NULL CHECK (player IN ('dad','kid')),
                  box INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 3),
                  due_on TEXT NOT NULL DEFAULT '1970-01-01',
                  PRIMARY KEY (card_id, player)
                )
                """)
            try db.execute(sql: """
                CREATE TABLE reviews (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  card_id INTEGER NOT NULL, player TEXT NOT NULL,
                  result TEXT NOT NULL CHECK (result IN ('hit','whiff')), reviewed_at TEXT NOT NULL
                )
                """)
            try db.execute(sql: """
                CREATE TABLE bux_ledger (
                  id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL,
                  reason TEXT NOT NULL, created_at TEXT NOT NULL
                )
                """)
            try db.execute(sql: """
                CREATE TABLE runs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT, run_date TEXT NOT NULL,
                  state_json TEXT NOT NULL, finished INTEGER NOT NULL DEFAULT 0
                )
                """)
            try db.execute(sql: "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")

            try db.execute(
                sql: "INSERT INTO cards (id, traditional, jyutping, english, created_at) VALUES (1, ?, ?, ?, ?)",
                arguments: ["食", "sik6", "eat", "2026-07-01"]
            )
            try db.execute(
                sql: "INSERT INTO card_states (card_id, player, box, due_on) VALUES (1, 'kid', 3, '2026-07-10')"
            )
            try db.execute(sql: "INSERT INTO reviews (card_id, player, result, reviewed_at) VALUES (1, 'kid', 'hit', ?)",
                            arguments: ["2026-07-01T00:00:00Z"])
            try db.execute(sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (30, 'run_finish', ?)",
                            arguments: ["2026-07-01T00:00:00Z"])
            try db.execute(sql: "INSERT INTO bux_ledger (amount, reason, created_at) VALUES (-10, 'redeem:test', ?)",
                            arguments: ["2026-07-02T00:00:00Z"])
            try db.execute(sql: "PRAGMA user_version = 3")
        }

        let store = GameStore(directory: tempDir)

        XCTAssertEqual(store.balance(), 20, "the wallet must survive the migration unchanged")
        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 3, "box progress must survive the migration unchanged")
        let (version, badgesTableExists, gearTableExists) = try rawGameQueue(in: tempDir).read { db in
            (
                try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0,
                try Bool.fetchOne(db, sql: "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type = 'table' AND name = 'badges'") ?? false,
                try Bool.fetchOne(db, sql: "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type = 'table' AND name = 'gear'") ?? false
            )
        }
        XCTAssertEqual(version, 5)
        XCTAssertTrue(badgesTableExists)
        XCTAssertTrue(gearTableExists)
    }

    // A device db created at schema v4 has 'equipped_hat' in meta - the wallet
    // paid for that hat, so the migration must move the pointer to
    // 'equipped_helmet' rather than losing it.
    func test_schemaV4_migratesToV5MovingEquippedHatToEquippedHelmet() throws {
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try Self.createV4Schema(db)
            try db.execute(
                sql: "INSERT INTO gear (gear_id, acquired_at) VALUES ('hat-cap', ?)", arguments: ["2026-07-01"])
            try db.execute(
                sql: "INSERT INTO meta (key, value) VALUES ('equipped_hat', 'hat-cap')")
            try db.execute(sql: "PRAGMA user_version = 4")
        }

        let store = GameStore(directory: tempDir)

        XCTAssertEqual(store.equippedGear()[.helmet], "hat-cap")
        let (version, oldKeyRow) = try rawGameQueue(in: tempDir).read { db in
            (
                try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0,
                try String.fetchOne(db, sql: "SELECT value FROM meta WHERE key = 'equipped_hat'")
            )
        }
        XCTAssertEqual(version, 5)
        XCTAssertNil(oldKeyRow, "no equipped_hat key survives the migration")
    }

    // An empty v4 db has nothing to migrate - the zero-row UPDATE must still
    // be a harmless no-op, and the schema must still land on version 5.
    func test_schemaV4_emptyDbMigrationStillLandsOnVersion5() throws {
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try Self.createV4Schema(db)
            try db.execute(sql: "PRAGMA user_version = 4")
        }

        let store = GameStore(directory: tempDir)

        XCTAssertNil(store.equippedGear()[.helmet])
        let version = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0
        }
        XCTAssertEqual(version, 5)
    }

    private static func createV4Schema(_ db: Database) throws {
        try db.execute(sql: """
            CREATE TABLE cards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              traditional TEXT NOT NULL, jyutping TEXT NOT NULL, english TEXT NOT NULL,
              photo_filename TEXT, benched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
              UNIQUE(traditional, jyutping)
            )
            """)
        try db.execute(sql: """
            CREATE TABLE card_states (
              card_id INTEGER NOT NULL REFERENCES cards(id),
              player TEXT NOT NULL CHECK (player IN ('dad','kid')),
              box INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 3),
              due_on TEXT NOT NULL DEFAULT '1970-01-01',
              PRIMARY KEY (card_id, player)
            )
            """)
        try db.execute(sql: """
            CREATE TABLE reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER NOT NULL, player TEXT NOT NULL,
              result TEXT NOT NULL CHECK (result IN ('hit','whiff')), reviewed_at TEXT NOT NULL
            )
            """)
        try db.execute(sql: """
            CREATE TABLE bux_ledger (
              id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL,
              reason TEXT NOT NULL, created_at TEXT NOT NULL
            )
            """)
        try db.execute(sql: """
            CREATE TABLE shop_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
              price INTEGER NOT NULL, archived INTEGER NOT NULL DEFAULT 0
            )
            """)
        try db.execute(sql: """
            CREATE TABLE runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT, run_date TEXT NOT NULL,
              state_json TEXT NOT NULL, finished INTEGER NOT NULL DEFAULT 0
            )
            """)
        try db.execute(sql: "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        try db.execute(sql: "CREATE TABLE badges (badge_id TEXT PRIMARY KEY, earned_at TEXT NOT NULL)")
        try db.execute(sql: "CREATE TABLE gear (gear_id TEXT PRIMARY KEY, acquired_at TEXT NOT NULL)")
    }

    func test_nextCards_ordersBySoonestDueAndRespectsLimit() {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        makeChosenLookup(log, heard: "dog", traditional: "狗", jyutping: "gau2")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)
        let eatId = store.deck().first { $0.traditional == "食" }!.id

        // A hit pushes 食 to due 2026-07-05; 狗 stays at the 1970 epoch.
        store.recordReview(cardId: eatId, result: .hit, on: "2026-07-04")

        let one = store.nextCards(excluding: [], limit: 1)
        XCTAssertEqual(one.map(\.traditional), ["狗"])

        let two = store.nextCards(excluding: [], limit: 3)
        XCTAssertEqual(two.map(\.traditional), ["狗", "食"])
    }

    // MARK: - Failure contract (ADR 0009)

    // Mid-query errors hop to the main queue (reportError), so give the
    // main runloop a beat before asserting on lastError.
    private func drainMainQueue() {
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
    }

    func test_deckAndDueCards_skipAndReportCorruptBoxRow() throws {
        let log = LogStore(directory: tempDir)
        makeChosenLookup(log, heard: "eat", traditional: "食", jyutping: "sik6")
        let store = GameStore(directory: tempDir)
        store.syncDeck(from: log)

        // Plant a box the CHECK constraint would normally reject, as a
        // migration bug or pre-CHECK db would.
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: "PRAGMA ignore_check_constraints = 1")
            try db.execute(sql: "UPDATE card_states SET box = 9 WHERE player = 'kid'")
        }

        XCTAssertTrue(store.dueCards(on: "2026-07-04", excluding: []).isEmpty)
        XCTAssertTrue(store.deck().isEmpty)
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
    }

    func test_todaysRun_clearsCorruptRowSoAFreshRunCanStart() throws {
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))

        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: "UPDATE runs SET state_json = 'not json'")
        }

        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
    }

    func test_finishRun_paysExtensionRowForClearedExtensionFloor() throws {
        let store = GameStore(directory: tempDir)
        var state = makeRunState(enemyHP: 0)
        state.floors.append(RunState.Floor(kind: .extensionFight, enemyName: "slime", maxHP: 7))
        state.floorIndex = 1
        state.extensionsTaken = 1
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!

        let badges = store.finishRun(id: runId, state: state)

        XCTAssertEqual(Set(badges), ["first-run", "first-victory"])
        XCTAssertEqual(
            store.balance(),
            Balance.runFinishPay + Balance.bossBonusPay + Balance.extensionPay + Balance.badgePay * badges.count
        )
        let extensionAmount = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT amount FROM bux_ledger WHERE reason = 'extension'")
        }
        XCTAssertEqual(extensionAmount, Balance.extensionPay)
    }

    // A finished row is paid history: todaysRun never reads it, so even a
    // corrupt one is invisible - never deleted, never an error, and never
    // in the way of the next run.
    func test_todaysRun_ignoresFinishedRowsEvenCorruptOnes() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        store.finishRun(id: runId, state: makeRunState(enemyHP: 0))

        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: "UPDATE runs SET state_json = 'not json'")
        }

        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
        let survivingRows = try rawGameQueue(in: tempDir).read { db in
            try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM runs WHERE id = ?", arguments: [runId])
        }
        XCTAssertEqual(survivingRows, 1, "paid history is never deleted")
    }

    func test_saveRun_cannotRewriteAFinishedRunsSnapshot() throws {
        let store = GameStore(directory: tempDir)
        let runId = store.startRun(on: "2026-07-04", state: makeRunState())!
        let finalState = makeRunState(enemyHP: 0)
        store.finishRun(id: runId, state: finalState)

        store.saveRun(id: runId, state: makeRunState(enemyHP: 99))

        let storedJSON = try rawGameQueue(in: tempDir).read { db in
            try String.fetchOne(db, sql: "SELECT state_json FROM runs WHERE id = ?", arguments: [runId])
        }
        let stored = try JSONDecoder().decode(RunState.self, from: storedJSON!.data(using: .utf8)!)
        XCTAssertEqual(stored, finalState, "the snapshot backs what the ledger already paid")
    }

    // A device db created at schema v1 carries run_date UNIQUE inside the
    // runs table definition - opening the store must shed it, or the first
    // "climb again" INSERT explodes on a phone while passing in every test
    // against a fresh db.
    func test_schemaV1_migratesToAllowRepeatRunsOnOneDay() throws {
        // The raw queue runs before any GameStore has created the directory.
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: """
                CREATE TABLE runs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_date TEXT NOT NULL UNIQUE,
                  state_json TEXT NOT NULL,
                  finished INTEGER NOT NULL DEFAULT 0
                )
                """)
            try db.execute(
                sql: "INSERT INTO runs (run_date, state_json, finished) VALUES (?, ?, 1)",
                arguments: ["2026-07-04", "{}"]
            )
            try db.execute(sql: "PRAGMA user_version = 1")
        }

        let store = GameStore(directory: tempDir)

        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()),
                        "yesterday's schema must not block a second run today")
        let (version, rows) = try rawGameQueue(in: tempDir).read { db in
            (try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0,
             try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM runs WHERE run_date = '2026-07-04'") ?? 0)
        }
        XCTAssertEqual(version, 5)
        XCTAssertEqual(rows, 2, "the v1 row survived the rebuild alongside the new one")
    }

    // A device db created at schema v2 still carries a dad row per card and
    // whatever box progress either player had. Opening the store must be a
    // fresh start: dad's rows gone, every remaining box reset to New.
    func test_schemaV2_migratesToSinglePlayerFreshStart() throws {
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: """
                CREATE TABLE cards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  traditional TEXT NOT NULL, jyutping TEXT NOT NULL, english TEXT NOT NULL,
                  photo_filename TEXT, benched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
                  UNIQUE(traditional, jyutping)
                )
                """)
            try db.execute(
                sql: "INSERT INTO cards (id, traditional, jyutping, english, created_at) VALUES (1, ?, ?, ?, ?)",
                arguments: ["食", "sik6", "eat", "2026-07-01"]
            )
            try db.execute(sql: """
                CREATE TABLE card_states (
                  card_id INTEGER NOT NULL REFERENCES cards(id),
                  player TEXT NOT NULL CHECK (player IN ('dad','kid')),
                  box INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 3),
                  due_on TEXT NOT NULL DEFAULT '1970-01-01',
                  PRIMARY KEY (card_id, player)
                )
                """)
            try db.execute(
                sql: "INSERT INTO card_states (card_id, player, box, due_on) VALUES (1, 'dad', 2, '2026-07-08')"
            )
            try db.execute(
                sql: "INSERT INTO card_states (card_id, player, box, due_on) VALUES (1, 'kid', 3, '2026-07-10')"
            )
            try db.execute(sql: "PRAGMA user_version = 2")
        }

        let store = GameStore(directory: tempDir)

        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 0, "fresh start resets progress, dad's or kid's")
        XCTAssertEqual(entry.dueOn, "1970-01-01")
        let (version, dadRows) = try rawGameQueue(in: tempDir).read { db in
            (try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0,
             try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM card_states WHERE player = 'dad'") ?? 0)
        }
        XCTAssertEqual(version, 5)
        XCTAssertEqual(dadRows, 0, "dad's rows are gone, not just ignored")
    }

    // A device still on schema v1 (it skipped the v2 release) jumps 1 -> 3 in
    // one open. It must ALSO get the fresh start - dad's rows gone, boxes reset -
    // not silently keep old progress because only the v1 block ran.
    func test_schemaV1_migratesDirectlyToSinglePlayerFreshStart() throws {
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: """
                CREATE TABLE cards (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  traditional TEXT NOT NULL, jyutping TEXT NOT NULL, english TEXT NOT NULL,
                  photo_filename TEXT, benched INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
                  UNIQUE(traditional, jyutping)
                )
                """)
            try db.execute(
                sql: "INSERT INTO cards (id, traditional, jyutping, english, created_at) VALUES (1, ?, ?, ?, ?)",
                arguments: ["食", "sik6", "eat", "2026-07-01"]
            )
            try db.execute(sql: """
                CREATE TABLE card_states (
                  card_id INTEGER NOT NULL REFERENCES cards(id),
                  player TEXT NOT NULL CHECK (player IN ('dad','kid')),
                  box INTEGER NOT NULL DEFAULT 0 CHECK (box BETWEEN 0 AND 3),
                  due_on TEXT NOT NULL DEFAULT '1970-01-01',
                  PRIMARY KEY (card_id, player)
                )
                """)
            try db.execute(
                sql: "INSERT INTO card_states (card_id, player, box, due_on) VALUES (1, 'dad', 2, '2026-07-08')"
            )
            try db.execute(
                sql: "INSERT INTO card_states (card_id, player, box, due_on) VALUES (1, 'kid', 3, '2026-07-10')"
            )
            // v1's runs table still carries the run_date UNIQUE the v1 block sheds.
            try db.execute(sql: """
                CREATE TABLE runs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_date TEXT NOT NULL UNIQUE,
                  state_json TEXT NOT NULL,
                  finished INTEGER NOT NULL DEFAULT 0
                )
                """)
            try db.execute(sql: "PRAGMA user_version = 1")
        }

        let store = GameStore(directory: tempDir)

        let entry = store.deck().first!
        XCTAssertEqual(entry.box, 0, "a v1 device that skipped v2 still gets the fresh start")
        XCTAssertEqual(entry.dueOn, "1970-01-01")
        let (version, dadRows) = try rawGameQueue(in: tempDir).read { db in
            (try Int.fetchOne(db, sql: "PRAGMA user_version") ?? 0,
             try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM card_states WHERE player = 'dad'") ?? 0)
        }
        XCTAssertEqual(version, 5)
        XCTAssertEqual(dadRows, 0, "dad's rows are gone, not just ignored")
    }

    // Decodes fine but would trap floors[floorIndex] - same recovery as
    // undecodable JSON: clear the row so the day isn't dead.
    func test_todaysRun_clearsStructurallyInvalidRowSoAFreshRunCanStart() throws {
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))

        var bad = makeRunState()
        bad.floorIndex = 99
        let json = String(data: try JSONEncoder().encode(bad), encoding: .utf8)!
        try rawGameQueue(in: tempDir).write { db in
            try db.execute(sql: "UPDATE runs SET state_json = ?", arguments: [json])
        }

        XCTAssertNil(store.todaysRun(on: "2026-07-04"))
        drainMainQueue()
        XCTAssertNotNil(store.lastError)
        XCTAssertNotNil(store.startRun(on: "2026-07-04", state: makeRunState()))
    }

    func test_redeem_refusesArchivedItemAndReportsIt() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")
        store.addShopItem(name: "Ice cream", price: 20)
        let item = store.shopItems(includeArchived: false).first!
        store.archiveShopItem(id: item.id)

        XCTAssertFalse(store.redeem(item: item))
        XCTAssertEqual(store.balance(), 100)
        XCTAssertNotNil(store.lastError)
    }

    func test_addShopItem_refusesNonPositivePrice() {
        let store = GameStore(directory: tempDir)
        store.addShopItem(name: "Free money", price: -5)

        XCTAssertTrue(store.shopItems(includeArchived: true).isEmpty)
        XCTAssertNotNil(store.lastError)
    }

    func test_recordReview_unknownCardReturnsNilWritesNoReviewAndSetsLastError() throws {
        let store = GameStore(directory: tempDir)
        // The nil return is what stops BattleView advancing the fight.
        XCTAssertNil(store.recordReview(cardId: 999, result: .hit, on: "2026-07-04"))
        XCTAssertEqual(try reviewCount(), 0)
        XCTAssertNotNil(store.lastError)
    }

    func test_clearError_resetsLastError() throws {
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)
        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.lastError)

        store.clearError()
        XCTAssertNil(store.lastError)
    }

    func test_writeFailureOnUnwritablePath_setsLastErrorInsteadOfCrashing() throws {
        // Point "directory" at a plain file, so FileManager can't create a
        // directory there and GameStore's open fails - mirrors
        // LogStoreTests' unwritable-path test but GameStore must surface the
        // failure via lastError instead of swallowing it.
        try "not a directory".write(to: tempDir, atomically: true, encoding: .utf8)

        let store = GameStore(directory: tempDir)
        XCTAssertNotNil(store.lastError)

        let redeemed = store.redeem(item: ShopItem(id: 1, name: "Ice cream", price: 5, archived: false))
        XCTAssertFalse(redeemed)
        XCTAssertNotNil(store.lastError)
        XCTAssertEqual(store.balance(), 0)
    }

    // MARK: - Gear

    func test_buyGear_debitsBalanceExactlyOnceAndInsertsGearRow() {
        let store = GameStore(directory: tempDir)
        store.credit(30, reason: "run_finish")

        XCTAssertTrue(store.buyGear(id: "hat-cap"))
        XCTAssertEqual(store.balance(), 30 - Balance.gearPriceHat)
        XCTAssertEqual(store.ownedGear(), ["hat-cap"])
    }

    func test_buyGear_doubleBuyIsRefusedAndDoesNotDoubleCharge() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")
        XCTAssertTrue(store.buyGear(id: "hat-cap"))
        let balanceAfterFirstBuy = store.balance()

        XCTAssertFalse(store.buyGear(id: "hat-cap"))
        XCTAssertEqual(store.balance(), balanceAfterFirstBuy)
    }

    func test_buyGear_insufficientBalanceSetsLastErrorAndLeavesWalletUntouched() {
        let store = GameStore(directory: tempDir)
        store.credit(5, reason: "run_finish")

        XCTAssertFalse(store.buyGear(id: "hat-cap"))
        XCTAssertEqual(store.balance(), 5)
        XCTAssertNotNil(store.lastError)
        XCTAssertTrue(store.ownedGear().isEmpty)
    }

    func test_buyGear_unknownIdIsRefused() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")

        XCTAssertFalse(store.buyGear(id: "hat-nonexistent"))
        XCTAssertEqual(store.balance(), 100)
        XCTAssertNotNil(store.lastError)
    }

    func test_equip_refusesGearNotOwned() {
        let store = GameStore(directory: tempDir)

        store.equip(slot: .helmet, id: "hat-cap")

        XCTAssertNotNil(store.lastError)
        XCTAssertNil(store.equippedGear()[.helmet])
    }

    func test_equip_persistsAcrossFreshGameStoreReopeningSameDirectory() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")
        store.buyGear(id: "hat-cap")
        store.equip(slot: .helmet, id: "hat-cap")

        let reopened = GameStore(directory: tempDir)
        XCTAssertEqual(reopened.equippedGear()[.helmet], "hat-cap")
    }

    func test_equip_nilUnequips() {
        let store = GameStore(directory: tempDir)
        store.credit(100, reason: "run_finish")
        store.buyGear(id: "hat-cap")
        store.equip(slot: .helmet, id: "hat-cap")

        store.equip(slot: .helmet, id: nil)

        XCTAssertNil(store.equippedGear()[.helmet])
    }

    // MARK: - Avatar

    func test_setAvatar_acceptsACatalogueId() {
        let store = GameStore(directory: tempDir)

        store.setAvatar(id: "avatar-nova")

        XCTAssertEqual(store.avatarId(), "avatar-nova")
        XCTAssertNil(store.lastError)
    }

    func test_setAvatar_rejectsAnUnknownIdAndLeavesTheCurrentPickUntouched() {
        let store = GameStore(directory: tempDir)
        store.setAvatar(id: "avatar-scout")

        store.setAvatar(id: "avatar-nonexistent")

        XCTAssertNotNil(store.lastError)
        XCTAssertEqual(store.avatarId(), "avatar-scout")
    }

    // The picker's first cell is the shipped kid, and it has no catalogue id - it
    // IS "no avatar_id row". Picking it must clear the row, or the player can
    // switch away from the kid and never get back, which is what shipped.
    func test_setAvatar_nilGoesBackToTheShippedKid() {
        let store = GameStore(directory: tempDir)
        store.setAvatar(id: "avatar-scout")
        XCTAssertEqual(store.avatarId(), "avatar-scout")

        store.setAvatar(id: nil)

        XCTAssertNil(store.avatarId(), "picking the kid must clear avatar_id, not no-op")
        XCTAssertNil(store.lastError)
    }

    // MARK: - Family rewards

    func test_familyRewardsEnabled_defaultsToFalseOnFreshDatabase() {
        let store = GameStore(directory: tempDir)
        XCTAssertFalse(store.familyRewardsEnabled())
    }

    func test_familyRewardsEnabled_persistsToggle() {
        let store = GameStore(directory: tempDir)
        store.setFamilyRewardsEnabled(true)

        XCTAssertTrue(store.familyRewardsEnabled())

        let reopened = GameStore(directory: tempDir)
        XCTAssertTrue(reopened.familyRewardsEnabled())
    }
}
