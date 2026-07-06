// A card as ReviewEngine sees it. GameStore extends this with box state read
// from card_states; this shape is what the pure review logic needs today.
struct CardRecord: Identifiable, Hashable {
    let id: Int64
    let traditional: String
    let jyutping: String
    let english: String
    let box: Int
    let dueOn: String
    let photoFilename: String?

    // Explicit init (not the synthesized memberwise one) so existing call
    // sites that predate photos can omit photoFilename and still compile.
    init(id: Int64, traditional: String, jyutping: String, english: String, box: Int, dueOn: String, photoFilename: String? = nil) {
        self.id = id
        self.traditional = traditional
        self.jyutping = jyutping
        self.english = english
        self.box = box
        self.dueOn = dueOn
        self.photoFilename = photoFilename
    }
}
