import XCTest
@testable import Canto

@MainActor
final class StartListeningIntentTests: XCTestCase {
    override func tearDown() {
        _ = LaunchIntent.shared.consume()
        super.tearDown()
    }

    func test_shouldStartListening_defaultsToFalse() {
        XCTAssertFalse(LaunchIntent.shared.consume())
    }

    func test_consume_isOneShot() {
        LaunchIntent.shared.shouldStartListening = true
        XCTAssertTrue(LaunchIntent.shared.consume())
        XCTAssertFalse(LaunchIntent.shared.consume())
    }

    func test_perform_setsShouldStartListeningFlag() async throws {
        let intent = StartListeningIntent()
        _ = try await intent.perform()
        XCTAssertTrue(LaunchIntent.shared.consume())
    }
}
