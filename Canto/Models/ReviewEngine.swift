import Foundation

enum ReviewResult: String, Equatable {
    case hit, whiff
}

// What a committed Review changed about a Card's Box, and what that means for
// the player. The explicit (result, oldBox, newBox) cases are load-bearing: a
// generic oldBox < newBox would misclassify Whiff 0 -> 1 as a promotion, and
// oldBox != newBox can't choose the right tone for a demotion.
struct ReviewTransition: Equatable {
    let result: ReviewResult
    let oldBox: Int
    let newBox: Int

    var ceremony: CardCeremonyKind? {
        switch (result, oldBox, newBox) {
        case (.hit, 0, 1): return .promoted(to: 1)
        case (.hit, 1, 2): return .promoted(to: 2)
        case (.hit, 2, 3): return .mastered
        case (.whiff, 0, 1): return .learning
        case (.whiff, 2, 1), (.whiff, 3, 1): return .backToLearning
        default: return nil
        }
    }
}

enum CardCeremonyKind: Equatable {
    case learning
    case promoted(to: Int)
    case mastered
    case backToLearning
}

// Pure Leitner logic: no database, no UI. "today" is always passed in
// (local Calendar YYYY-MM-DD, computed once per screen appearance) so a
// review never depends on the current instant and stays testable.
struct ReviewEngine {
    // Boxes: 0 New, 1 Learning, 2 Solid, 3 Mastered
    static let intervals = [0, 1, 3, 7]          // days until due again, by box

    static func nextBox(from box: Int, result: ReviewResult) -> Int {
        switch result {
        case .hit:   return min(box + 1, 3)
        case .whiff: return 1                    // always drops to Learning
        }
    }

    static func nextDueDate(box: Int, result: ReviewResult, today: String) -> String {
        result == .whiff ? today                 // stays due; tomorrow's Run re-deals it
                          : addDays(intervals[nextBox(from: box, result: result)], to: today)
    }

    static func damage(forBox box: Int) -> Int {
        guard Balance.damageByBox.indices.contains(box) else {
            assertionFailure("ReviewEngine.damage got an out-of-range box: \(box)")
            return Balance.damageByBox[max(0, min(box, Balance.damageByBox.count - 1))]
        }
        return Balance.damageByBox[box]
    }

    // Due cards most-overdue first, but at most two per hand when a
    // not-yet-due card can take the third slot - three chronically whiffed
    // words must not deal the exact same hand every fight. Dedup against
    // already-dealt cards is the caller's job (RunState.dealt).
    static func hand(due: [CardRecord], soonest: [CardRecord]) -> [CardRecord] {
        let dueCap = soonest.isEmpty ? 3 : 2
        return Array((due.prefix(dueCap) + soonest + due.dropFirst(dueCap)).prefix(3))
    }

    // "Today" for screens: computed once per screen appearance and passed
    // into the logic, so midnight can't split a Run (see context doc).
    static func todayString(now: Date = Date()) -> String {
        dateFormatter.string(from: now)
    }

    // The instant a local YYYY-MM-DD day begins - GameStore converts local
    // days to UTC ranges with it, from this one formatter.
    static func startOfLocalDay(_ date: String) -> Date? {
        dateFormatter.date(from: date)
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter
    }()

    // Internal so StreakEngine walks days on this same calendar/formatter
    // instead of building a second notion of a day.
    static func addDays(_ days: Int, to dateString: String) -> String {
        guard let date = dateFormatter.date(from: dateString),
              let newDate = dateFormatter.calendar.date(byAdding: .day, value: days, to: date) else {
            assertionFailure("ReviewEngine.addDays got an unparsable date: \(dateString)")
            return dateString
        }
        return dateFormatter.string(from: newDate)
    }
}
