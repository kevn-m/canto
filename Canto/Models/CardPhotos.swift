import UIKit

// File-backed storage for card front photos, in Application Support/CardPhotos.
// Pure file ops: failures return nil/false. GameStore.setPhoto is the only
// caller that needs to surface a failure, via its own lastError contract.
struct CardPhotos {
    private static let maxDimension: CGFloat = 1024
    private static let jpegQuality: CGFloat = 0.7

    private let photosDirectory: URL

    init(directory: URL = CardPhotos.defaultDirectory) {
        photosDirectory = directory.appendingPathComponent("CardPhotos")
    }

    private static var defaultDirectory: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    @discardableResult
    func save(image: UIImage, cardId: Int64) -> String? {
        guard let data = normalized(image).jpegData(compressionQuality: Self.jpegQuality) else { return nil }
        guard (try? FileManager.default.createDirectory(at: photosDirectory, withIntermediateDirectories: true)) != nil else {
            return nil
        }
        let filename = "card-\(cardId).jpg"
        do {
            // .atomic: a failed re-take must leave the old photo intact,
            // not truncated - the filename is deterministic per card.
            try data.write(to: photosDirectory.appendingPathComponent(filename), options: .atomic)
            return filename
        } catch {
            return nil
        }
    }

    func load(filename: String) -> UIImage? {
        UIImage(contentsOfFile: photosDirectory.appendingPathComponent(filename).path)
    }

    @discardableResult
    func delete(filename: String) -> Bool {
        (try? FileManager.default.removeItem(at: photosDirectory.appendingPathComponent(filename))) != nil
    }

    // Always redraws at scale 1, capping the longest side at maxDimension -
    // this normalises orientation/scale from the camera or photo library the
    // same way, not just when a downscale happens to be needed.
    private func normalized(_ image: UIImage) -> UIImage {
        guard image.size.width > 0, image.size.height > 0 else { return image }
        let longest = max(image.size.width, image.size.height)
        let scale = longest > Self.maxDimension ? Self.maxDimension / longest : 1
        let newSize = CGSize(width: (image.size.width * scale).rounded(), height: (image.size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: newSize, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}
