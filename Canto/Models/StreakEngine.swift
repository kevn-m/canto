import Foundation

// Consecutive local dates ending today (or yesterday, so an unplayed today
// doesn't show 0 mid-morning) that each have a finished Run. Reuses
// ReviewEngine.addDays so this can never disagree with run_date's calendar.
enum StreakEngine {
    // dates: DISTINCT run_date values of finished runs, any order.
    // today: ReviewEngine.todayString() - the same format run_date is written in.
    static func length(dates: Set<String>, today: String) -> Int {
        var cursor = dates.contains(today) ? today : ReviewEngine.addDays(-1, to: today)
        var count = 0
        while dates.contains(cursor) {
            count += 1
            // addDays hands back its input on an unparsable date, and in Release
            // its assertionFailure is a no-op - so a bad date would spin here
            // forever, hanging the screen. Stop instead.
            let previous = ReviewEngine.addDays(-1, to: cursor)
            guard previous != cursor else { break }
            cursor = previous
        }
        return count
    }
}
