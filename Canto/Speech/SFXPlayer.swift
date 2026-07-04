import AVFoundation

// Plays the bundled chiptune effects (generated in art/sfx, copied into
// Resources/SFX). Effects are cosmetic: a missing or unplayable file is
// NSLog'd and skipped, never surfaced.
final class SFXPlayer {
    static let shared = SFXPlayer()

    enum Effect: String, CaseIterable {
        case hit, whiff, flip, victory, defeat, coin
        case enemyDown = "enemy-down"
    }

    private var players: [Effect: AVAudioPlayer] = [:]

    // Serialise on main (the reportError pattern): callers include Tasks
    // that may resume off the main thread, and `players` isn't locked.
    func play(_ effect: Effect) {
        DispatchQueue.main.async { self.playOnMain(effect) }
    }

    private func playOnMain(_ effect: Effect) {
        // Same claim as CantoneseSpeaker: the mic session leaves the
        // category in .record, which mutes playback.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        guard let player = player(for: effect) else { return }
        player.currentTime = 0
        player.play()
    }

    private func player(for effect: Effect) -> AVAudioPlayer? {
        if let cached = players[effect] { return cached }
        guard let url = Bundle.main.url(forResource: effect.rawValue, withExtension: "wav")
            ?? Bundle.main.url(forResource: effect.rawValue, withExtension: "wav", subdirectory: "SFX") else {
            NSLog("SFXPlayer: missing effect \(effect.rawValue)")
            return nil
        }
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            player.volume = 0.5
            player.prepareToPlay()
            players[effect] = player
            return player
        } catch {
            NSLog("SFXPlayer: cannot load \(effect.rawValue): \(error)")
            return nil
        }
    }
}
