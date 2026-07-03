import XCTest
@testable import Canto

final class CantoneseSpeakerTests: XCTestCase {
    // Simulators may lack the zh-HK voice. Init and speak must never crash
    // either way — voiceAvailable just reports which case we're in.
    func test_initAndSpeak_neverCrash() {
        let speaker = CantoneseSpeaker()
        speaker.speak("食")
        _ = speaker.voiceAvailable
    }
}
