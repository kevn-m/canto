import XCTest
import UIKit
@testable import Canto

final class CardPhotosTests: XCTestCase {
    var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("CardPhotosTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        super.tearDown()
    }

    private func makeImage(width: CGFloat, height: CGFloat) -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: width, height: height)).image { context in
            UIColor.red.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }
    }

    func test_save_downscalesToAtMost1024OnLongestSideAndRoundTrips() throws {
        let photos = CardPhotos(directory: tempDir)
        let big = makeImage(width: 2000, height: 1500)

        let filename = try XCTUnwrap(photos.save(image: big, cardId: 1))
        XCTAssertEqual(filename, "card-1.jpg")

        let loaded = try XCTUnwrap(photos.load(filename: filename))
        XCTAssertLessThanOrEqual(max(loaded.size.width, loaded.size.height), 1024)
        // Aspect ratio preserved: 2000x1500 (4:3) scaled down.
        XCTAssertEqual(loaded.size.width, 1024, accuracy: 1)
        XCTAssertEqual(loaded.size.height, 768, accuracy: 1)
    }

    func test_save_leavesSmallImageAtOriginalSize() throws {
        let photos = CardPhotos(directory: tempDir)
        let small = makeImage(width: 200, height: 100)

        let filename = try XCTUnwrap(photos.save(image: small, cardId: 2))
        let loaded = try XCTUnwrap(photos.load(filename: filename))

        XCTAssertEqual(loaded.size.width, 200, accuracy: 1)
        XCTAssertEqual(loaded.size.height, 100, accuracy: 1)
    }

    func test_delete_removesTheFile() throws {
        let photos = CardPhotos(directory: tempDir)
        let filename = try XCTUnwrap(photos.save(image: makeImage(width: 100, height: 100), cardId: 3))
        XCTAssertNotNil(photos.load(filename: filename))

        photos.delete(filename: filename)

        XCTAssertNil(photos.load(filename: filename))
    }

    func test_load_missingFileReturnsNil() {
        let photos = CardPhotos(directory: tempDir)
        XCTAssertNil(photos.load(filename: "does-not-exist.jpg"))
    }
}
