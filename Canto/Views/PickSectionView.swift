import SwiftUI

// The Google-backed suggestion, pinned above the offline list. Extracted so
// DesignSnapshotTests can render each state without owning an
// OnlineTranslator or firing a network Task (ImageRenderer runs onAppear).
struct PickSectionView: View {
    let pick: Pick?
    let pickPending: Bool
    let selectedSenseId: Int64?
    let keptSenseId: Int64?
    let customKept: Bool
    let onTap: (Sense) -> Void
    let onKeep: (Sense) -> Void
    let onCamera: (Sense) -> Void
    let onSpeakCharacters: (String) -> Void
    let readingCandidates: (String) -> [String]
    let onKeepCustom: (String) -> Void

    @State private var showingEditor = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if pickPending {
                pendingRow
            } else if let pick {
                if pick.senses.isEmpty {
                    unmappedRow(pick)
                } else {
                    ForEach(pick.senses) { sense in
                        VStack(alignment: .leading, spacing: 4) {
                            googleBadge
                            LookupResultRowView(
                                sense: sense,
                                selectedSenseId: selectedSenseId,
                                keptSenseId: keptSenseId,
                                onTap: onTap,
                                onKeep: onKeep,
                                onCamera: onCamera
                            )
                        }
                    }
                }
            } else {
                offlineMarker
            }
        }
        .padding(.horizontal)
        .padding(.top, 4)
        // Collapse the editor when a new Pick arrives - a fresh unmapped word
        // must not inherit the open editor from the last one (no silent state
        // transitions), and "Keep anyway" stays a deliberate opt-in.
        .onChange(of: pick?.characters) { _, _ in showingEditor = false }
    }

    private var googleBadge: some View {
        Label("Google", systemImage: "globe")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.blue)
    }

    @ViewBuilder
    private func unmappedRow(_ pick: Pick) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    googleBadge
                    Text(pick.characters)
                        .font(.largeTitle)
                    Text("No reading yet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    onSpeakCharacters(pick.characters)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Speak")

                if customKept {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                } else {
                    Button("Keep anyway") {
                        showingEditor.toggle()
                    }
                    .buttonStyle(.borderless)
                }
            }

            if showingEditor, !customKept {
                PickEditorView(
                    characters: pick.characters,
                    candidates: readingCandidates,
                    onSpeak: onSpeakCharacters,
                    onKeep: { jyutping in
                        onKeepCustom(jyutping)
                        showingEditor = false
                    }
                )
            }
        }
    }

    private var pendingRow: some View {
        HStack(spacing: 8) {
            ProgressView()
            Text("Checking Google…")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var offlineMarker: some View {
        Text("Offline — not checked against Google")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
