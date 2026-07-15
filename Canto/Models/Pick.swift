/// The online engine's suggested answer: Google's characters plus the
/// dictionary rows that give them a human-curated reading. Empty senses
/// means unmapped: show an unconfirmed Derived reading and require the editor
/// before Keep.
struct Pick: Equatable {
    let characters: String
    let senses: [Sense]
    let derived: DerivedReading?
}
