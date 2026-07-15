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
            .font(GameTheme.title(12))
            .foregroundStyle(GameTheme.sky)
    }

    @ViewBuilder
    private func unmappedRow(_ pick: Pick) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    googleBadge
                    Text(pick.characters)
                        .font(.system(size: pick.characters.count > 8 ? 26 : 40, weight: .bold))
                        .foregroundStyle(GameTheme.navy)
                        .fixedSize(horizontal: false, vertical: true)
                    if let derived = pick.derived, derived.hasAnyReading {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(derived.joined)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .italic()
                                .foregroundStyle(GameTheme.lavender)
                            Text("unconfirmed — check by ear before keeping")
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .foregroundStyle(GameTheme.lavender.opacity(0.7))
                        }
                    } else {
                        Text("No reading yet")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(GameTheme.lavender)
                    }
                }
                Spacer()
                Button {
                    onSpeakCharacters(pick.characters)
                } label: {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(GameTheme.gold)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Speak")

                if customKept {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(GameTheme.green)
                } else {
                    Button("Keep anyway") {
                        showingEditor.toggle()
                    }
                    .buttonStyle(GameButtonStyle(compact: true))
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
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
        .contentShape(Rectangle())
        .onTapGesture { onSpeakCharacters(pick.characters) }
    }

    private var pendingRow: some View {
        HStack(spacing: 10) {
            ProgressView()
                .tint(GameTheme.gold)
            Text("Checking Google…")
                .font(GameTheme.title(15))
                .foregroundStyle(GameTheme.cream.opacity(0.7))
        }
    }

    private var offlineMarker: some View {
        Text("Offline — not checked against Google")
            .font(GameTheme.title(14))
            .foregroundStyle(GameTheme.cream.opacity(0.55))
    }
}
