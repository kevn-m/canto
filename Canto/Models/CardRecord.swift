// A card as ReviewEngine sees it. GameStore (Slice 1) extends this with
// per-player box state read from card_states; this shape is what the pure
// review logic needs today.
struct CardRecord: Identifiable, Hashable {
    let id: Int64
    let traditional: String
    let jyutping: String
    let english: String
    let box: Int
    let dueOn: String
}
