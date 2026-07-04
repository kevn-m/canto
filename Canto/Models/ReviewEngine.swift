import Foundation

enum ReviewResult: String {
    case hit, whiff
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

    // Due cards most-overdue first; if fewer than 3, fill ahead of schedule
    // with the soonest-due cards. Ordering and dedup against already-dealt
    // cards are the caller's job (RunState.dealt) - this just concatenates.
    static func hand(due: [CardRecord], soonest: [CardRecord]) -> [CardRecord] {
        Array((due + soonest).prefix(3))
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

    private static func addDays(_ days: Int, to dateString: String) -> String {
        guard let date = dateFormatter.date(from: dateString),
              let newDate = dateFormatter.calendar.date(byAdding: .day, value: days, to: date) else {
            assertionFailure("ReviewEngine.addDays got an unparsable date: \(dateString)")
            return dateString
        }
        return dateFormatter.string(from: newDate)
    }
}
