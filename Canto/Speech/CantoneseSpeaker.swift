import AVFoundation

final class CantoneseSpeaker {
    private let synthesizer = AVSpeechSynthesizer()

    // Resolved per access: the user can install the zh-HK voice mid-session
    // (our own alert sends them to Settings) and it must work without relaunch.
    private var voice: AVSpeechSynthesisVoice? { AVSpeechSynthesisVoice(language: "zh-HK") }

    var voiceAvailable: Bool { voice != nil }

    func speak(_ traditional: String) {
        guard let voice else { return }
        // SpeechListener puts the shared session in .record, which mutes
        // playback; claim a playback category or TTS is silent after mic use.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: traditional)
        utterance.voice = voice
        synthesizer.speak(utterance)
    }

    // Card fronts speak the English word. Same .playback claim as
    // speak(_:) and for the same reason.
    func speakEnglish(_ text: String) {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = englishVoice
        synthesizer.speak(utterance)
    }

    // Resolved per call, like `voice`: downloading an Enhanced voice in
    // Settings mid-session must take effect without a relaunch.
    private var englishVoice: AVSpeechSynthesisVoice? {
        let voices = AVSpeechSynthesisVoice.speechVoices()
        let candidates = voices.map {
            EnglishVoiceCandidate(language: $0.language, identifier: $0.identifier, quality: $0.quality.rawValue)
        }
        guard let index = Self.bestEnglishVoiceIndex(among: candidates) else {
            return AVSpeechSynthesisVoice(language: "en-AU") ?? AVSpeechSynthesisVoice(language: "en-US")
        }
        return voices[index]
    }

    struct EnglishVoiceCandidate {
        let language: String
        let identifier: String
        let quality: Int  // AVSpeechSynthesisVoiceQuality.rawValue: 1 default, 2 enhanced, 3 premium
    }

    // Best installed English voice: highest quality first, en-AU as the
    // tiebreak. The novelty (Bahh, Zarvox, ...) and eloquence voices report
    // as English but sound worse than the plain compact voice, so they only
    // win when nothing else is installed.
    static func bestEnglishVoiceIndex(among candidates: [EnglishVoiceCandidate]) -> Int? {
        let english = candidates.indices.filter { candidates[$0].language.hasPrefix("en") }
        let preferred = english.filter { !isLowTier(candidates[$0].identifier) }
        let pool = preferred.isEmpty ? english : preferred
        return pool.max { score(candidates[$0]) < score(candidates[$1]) }
    }

    private static func isLowTier(_ identifier: String) -> Bool {
        identifier.hasPrefix("com.apple.speech.synthesis.voice") || identifier.hasPrefix("com.apple.eloquence")
    }

    private static func score(_ candidate: EnglishVoiceCandidate) -> (Int, Int) {
        (candidate.quality, candidate.language.hasPrefix("en-AU") ? 1 : 0)
    }
}
