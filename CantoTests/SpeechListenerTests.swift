import XCTest
@testable import Canto

final class SpeechListenerTests: XCTestCase {
    // Simulator has no mic input and can't answer speech/mic auth prompts
    // headlessly, so start() and real recognition are untested here — only
    // the state/teardown logic that doesn't touch the device is covered.

    func test_initialState_notListeningNoTextNoError() {
        let listener = SpeechListener()
        XCTAssertFalse(listener.isListening)
        XCTAssertEqual(listener.heardText, "")
        XCTAssertNil(listener.errorMessage)
    }

    func test_stop_neverStarted_doesNotCrashOrFireOnFinish() {
        let listener = SpeechListener()
        var fired = false
        listener.onFinish = { _ in fired = true }
        listener.stop()
        XCTAssertFalse(fired)
        XCTAssertFalse(listener.isListening)
    }

    func test_stop_isIdempotent() {
        let listener = SpeechListener()
        listener.stop()
        listener.stop()
        XCTAssertFalse(listener.isListening)
    }

    func test_stop_firesOnFinishWithHeardText() {
        let listener = SpeechListener()
        listener.isListening = true
        listener.heardText = "dog"
        var received: String?
        listener.onFinish = { received = $0 }
        listener.stop()
        XCTAssertEqual(received, "dog")
    }

    func test_stop_trimsHeardTextBeforeFiringOnFinish() {
        let listener = SpeechListener()
        listener.isListening = true
        listener.heardText = " dog \n"
        var received: String?
        listener.onFinish = { received = $0 }
        listener.stop()
        XCTAssertEqual(received, "dog")
    }

    func test_stop_doesNotFireOnFinishForEmptyOrWhitespaceText() {
        let listener = SpeechListener()
        listener.isListening = true
        listener.heardText = "   "
        var fired = false
        listener.onFinish = { _ in fired = true }
        listener.stop()
        XCTAssertFalse(fired)
    }

    // Guards the double-fire path: our own stop() cancels the recognition
    // task, whose error callback re-enters stop(). A second stop() must not
    // re-fire onFinish even though heardText is still non-empty.
    func test_secondStop_doesNotRefireOnFinish() {
        let listener = SpeechListener()
        listener.isListening = true
        listener.heardText = "dog"
        var fireCount = 0
        listener.onFinish = { _ in fireCount += 1 }
        listener.stop()
        listener.stop()
        XCTAssertEqual(fireCount, 1)
    }

    func test_cancel_endsSessionWithoutFiringOnFinish() {
        let listener = SpeechListener()
        listener.isListening = true
        listener.heardText = "dog"
        var fired = false
        listener.onFinish = { _ in fired = true }
        listener.cancel()
        XCTAssertFalse(fired)
        XCTAssertFalse(listener.isListening)
        XCTAssertEqual(listener.heardText, "")
    }

    func test_pauseTimeout_storesInjectedValue() {
        let listener = SpeechListener(pauseTimeout: 3.0)
        XCTAssertEqual(listener.pauseTimeout, 3.0)
    }

    func test_pauseTimeout_defaultsToOnePointFive() {
        let listener = SpeechListener()
        XCTAssertEqual(listener.pauseTimeout, 1.5)
    }
}
