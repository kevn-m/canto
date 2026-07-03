import AVFoundation

final class CantoneseSpeaker {
    private let synthesizer = AVSpeechSynthesizer()

    // Resolved per access: the user can install the zh-HK voice mid-session
    // (our own alert sends them to Settings) and it must work without relaunch.
    private var voice: AVSpeechSynthesisVoice? { AVSpeechSynthesisVoice(language: "zh-HK") }

    var voiceAvailable: Bool { voice != nil }

    func speak(_ traditional: String) {
        guard let voice else { return }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: traditional)
        utterance.voice = voice
        synthesizer.speak(utterance)
    }
}
