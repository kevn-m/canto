import SwiftUI

// Bare view so DesignSnapshotTests can render it without owning an
// OnlineTranslator or firing a Task (ImageRenderer runs onAppear).
// Lets Kevin's ear pick a jyutping reading per character for an unmapped
// Pick, since CantoneseSpeaker speaks the characters, not the jyutping -
// audio alone can't prove a derived reading.
struct PickEditorView: View {
    let characters: String
    let onSpeak: (String) -> Void
    let onKeep: (String) -> Void

    private let characterList: [String]
    private let optionsByChar: [String: [String]]
    @State private var selections: [String]

    init(characters: String, candidates: (String) -> [String], onSpeak: @escaping (String) -> Void, onKeep: @escaping (String) -> Void) {
        self.characters = characters
        self.onSpeak = onSpeak
        self.onKeep = onKeep
        let chars = characters.map(String.init)
        characterList = chars
        // One DB read per unique character, reused for seeding and rendering
        // (dedups repeated characters in the Pick too).
        var opts: [String: [String]] = [:]
        for char in Set(chars) { opts[char] = candidates(char) }
        optionsByChar = opts
        _selections = State(initialValue: chars.map { opts[$0]?.first ?? "" })
    }

    private var hasUnknownCharacter: Bool {
        characterList.contains { (optionsByChar[$0] ?? []).isEmpty }
    }

    private var joinedJyutping: String {
        selections.filter { !$0.isEmpty }.joined(separator: " ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                ForEach(Array(characterList.enumerated()), id: \.offset) { index, char in
                    characterSegment(char, index: index)
                }
            }

            Text(joinedJyutping)
                .font(GameTheme.title(16))
                .foregroundStyle(GameTheme.navy.opacity(0.7))

            HStack {
                Button {
                    onSpeak(characters)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(GameTheme.gold)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Speak")

                Spacer()

                Button("Keep") {
                    onKeep(joinedJyutping)
                }
                .buttonStyle(GameButtonStyle(compact: true))
                .disabled(hasUnknownCharacter)
                .opacity(hasUnknownCharacter ? 0.4 : 1)
            }
        }
    }

    // A row of plain buttons rather than SwiftUI's Picker: Picker's menu
    // style is UIKit-backed and ImageRenderer draws it as a "no entry"
    // placeholder, the same trap as NavigationStack (see repo CLAUDE.md).
    @ViewBuilder
    private func characterSegment(_ char: String, index: Int) -> some View {
        let options = optionsByChar[char] ?? []
        let selected = selections.indices.contains(index) ? selections[index] : ""
        VStack(spacing: 4) {
            Text(char)
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(GameTheme.navy)
            if options.isEmpty {
                Text("unknown character")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(GameTheme.red)
            } else {
                VStack(spacing: 2) {
                    ForEach(options, id: \.self) { option in
                        Button {
                            selections[index] = option
                        } label: {
                            Text(option)
                                .font(GameTheme.title(14))
                                .foregroundStyle(selected == option ? GameTheme.gold : GameTheme.navy.opacity(0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}
