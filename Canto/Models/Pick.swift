/// The online engine's suggested answer: Google's characters plus the
/// dictionary rows that give them a human-curated reading. Empty senses
/// means unmapped: show characters + audio only, no Keep.
struct Pick: Equatable {
    let characters: String
    let senses: [Sense]
}
