import SwiftUI

// Bare view so DesignSnapshotTests can render it without owning an
// OnlineTranslator or firing a Task (ImageRenderer runs onAppear).
// Lets Kevin's ear pick a jyutping reading per derived Segment for an unmapped
// Pick, since CantoneseSpeaker speaks the characters, not the jyutping -
// audio alone can't prove a derived reading.
struct PickEditorView: View {
    let characters: String
    let segments: [DerivedReading.Segment]
    let onSpeak: (String) -> Void
    let onKeep: (String) -> Void

    @State private var selections: [String]

    init(
        characters: String,
        segments: [DerivedReading.Segment],
        onSpeak: @escaping (String) -> Void,
        onKeep: @escaping (String) -> Void
    ) {
        self.characters = characters
        self.segments = segments
        self.onSpeak = onSpeak
        self.onKeep = onKeep
        _selections = State(initialValue: segments.map { $0.candidates.first ?? "" })
    }

    private var canKeep: Bool {
        Self.canKeep(segments: segments, selections: selections)
    }

    private var joinedJyutping: String {
        Self.joinedJyutping(segments: segments, selections: selections)
    }

    static func hasUnknownSegment(in segments: [DerivedReading.Segment]) -> Bool {
        segments.contains { !$0.isSeparator && $0.candidates.isEmpty }
    }

    static func canKeep(
        segments: [DerivedReading.Segment],
        selections: [String]
    ) -> Bool {
        !hasUnknownSegment(in: segments)
            && !joinedJyutping(segments: segments, selections: selections)
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .isEmpty
    }

    static func joinedJyutping(
        segments: [DerivedReading.Segment],
        selections: [String]
    ) -> String {
        zip(segments, selections)
            .filter { !$0.0.isSeparator && !$0.1.isEmpty }
            .map(\.1)
            .joined(separator: " ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) { segmentViews }
                VStack(alignment: .leading, spacing: 12) { segmentViews }
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
                .disabled(!canKeep)
                .opacity(canKeep ? 1 : 0.4)
            }
        }
    }

    @ViewBuilder
    private var segmentViews: some View {
        ForEach(segments.indices, id: \.self) { index in
            segmentView(segments[index], index: index)
        }
    }

    // A row of plain buttons rather than SwiftUI's Picker: Picker's menu
    // style is UIKit-backed and ImageRenderer draws it as a "no entry"
    // placeholder, the same trap as NavigationStack (see repo CLAUDE.md).
    @ViewBuilder
    private func segmentView(_ segment: DerivedReading.Segment, index: Int) -> some View {
        let selected = selections.indices.contains(index) ? selections[index] : ""
        VStack(spacing: 4) {
            Text(segment.characters)
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(segment.isSeparator ? GameTheme.navy.opacity(0.35) : GameTheme.navy)
            if segment.isSeparator {
                EmptyView()
            } else if segment.candidates.isEmpty {
                Text("?")
                    .font(GameTheme.title(16))
                    .foregroundStyle(GameTheme.red)
            } else {
                VStack(spacing: 2) {
                    ForEach(segment.candidates, id: \.self) { option in
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
