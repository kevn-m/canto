import AVFoundation
import XCTest
@testable import Canto

// Runs against the real app bundle (TEST_HOST): catches a wav that fell out
// of project.yml's resources, and one that ships but can't decode.
final class SFXTests: XCTestCase {
    func test_everyEffectShipsAsAPlayableWav() {
        for effect in SFXPlayer.Effect.allCases {
            let url = Bundle.main.url(forResource: effect.rawValue, withExtension: "wav")
                ?? Bundle.main.url(forResource: effect.rawValue, withExtension: "wav", subdirectory: "SFX")
            guard let url else {
                XCTFail("\(effect.rawValue).wav missing from the app bundle")
                continue
            }
            XCTAssertNoThrow(try AVAudioPlayer(contentsOf: url), "\(effect.rawValue).wav does not decode")
        }
    }
}
