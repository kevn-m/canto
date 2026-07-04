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

    // MARK: - English voice ranking
    //
    // The ranking exists so the kid hears the best English voice the phone
    // has, not the compact robot default. Quality outranks accent; the
    // novelty voices never beat a real one.

    private typealias Candidate = CantoneseSpeaker.EnglishVoiceCandidate

    private func pick(_ candidates: [Candidate]) -> Candidate? {
        CantoneseSpeaker.bestEnglishVoiceIndex(among: candidates).map { candidates[$0] }
    }

    private func voice(_ language: String, _ identifier: String, quality: Int) -> Candidate {
        Candidate(language: language, identifier: identifier, quality: quality)
    }

    func test_enhancedBeatsDefault_evenWhenDefaultIsAU() {
        let picked = pick([
            voice("en-AU", "com.apple.voice.compact.en-AU.Karen", quality: 1),
            voice("en-US", "com.apple.voice.enhanced.en-US.Samantha", quality: 2),
        ])
        XCTAssertEqual(picked?.identifier, "com.apple.voice.enhanced.en-US.Samantha")
    }

    func test_premiumBeatsEnhanced() {
        let picked = pick([
            voice("en-US", "com.apple.voice.enhanced.en-US.Samantha", quality: 2),
            voice("en-GB", "com.apple.voice.premium.en-GB.Serena", quality: 3),
        ])
        XCTAssertEqual(picked?.identifier, "com.apple.voice.premium.en-GB.Serena")
    }

    func test_auWinsTheTie_atEqualQuality() {
        let picked = pick([
            voice("en-US", "com.apple.voice.enhanced.en-US.Samantha", quality: 2),
            voice("en-AU", "com.apple.voice.enhanced.en-AU.Karen", quality: 2),
            voice("en-GB", "com.apple.voice.enhanced.en-GB.Daniel", quality: 2),
        ])
        XCTAssertEqual(picked?.identifier, "com.apple.voice.enhanced.en-AU.Karen")
    }

    func test_noveltyAndEloquenceVoices_loseToAnyRealVoice() {
        let picked = pick([
            voice("en-US", "com.apple.speech.synthesis.voice.Zarvox", quality: 1),
            voice("en-US", "com.apple.eloquence.en-US.Eddy", quality: 1),
            voice("en-US", "com.apple.voice.compact.en-US.Samantha", quality: 1),
        ])
        XCTAssertEqual(picked?.identifier, "com.apple.voice.compact.en-US.Samantha")
    }

    func test_noveltyVoiceIsUsed_whenItIsAllThereIs() {
        let picked = pick([
            voice("zh-HK", "com.apple.voice.compact.zh-HK.Sinji", quality: 1),
            voice("en-US", "com.apple.speech.synthesis.voice.Albert", quality: 1),
        ])
        XCTAssertEqual(picked?.identifier, "com.apple.speech.synthesis.voice.Albert")
    }

    func test_noEnglishVoice_meansNoPick() {
        let picked = pick([voice("zh-HK", "com.apple.voice.compact.zh-HK.Sinji", quality: 1)])
        XCTAssertNil(picked)
    }
}
