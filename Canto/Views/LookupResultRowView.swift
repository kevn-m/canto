import SwiftUI

// Extracted so DesignSnapshotTests can render a row in each selection state
// without the enclosing List/NavigationStack (ImageRenderer draws those as a
// "no entry" placeholder).
struct LookupResultRowView: View {
    let sense: Sense
    let selectedSenseId: Int64?
    let keptSenseId: Int64?
    let onTap: (Sense) -> Void
    let onKeep: (Sense) -> Void
    let onCamera: (Sense) -> Void
    // The Pick layer's rows wear the enchanted frame; dictionary rows never do.
    var enchanted = false

    private var isSelected: Bool { sense.id == selectedSenseId }
    private var isKept: Bool { sense.id == keptSenseId }

    var body: some View {
        HStack(spacing: 10) {
            SenseRowView(sense: sense)
            Spacer(minLength: 0)
            trailing
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .cardFrame(selected: isSelected, enchanted: enchanted)
        .contentShape(Rectangle())
        .onTapGesture { onTap(sense) }
    }

    @ViewBuilder
    private var trailing: some View {
        if isKept {
            HStack(spacing: 10) {
                Label("Added", systemImage: "checkmark.circle.fill")
                    .font(GameTheme.title(14))
                    .foregroundStyle(GameTheme.green)
                if CameraPicker.isAvailable {
                    Button { onCamera(sense) } label: {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(GameTheme.gold)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Snap it now")
                }
            }
        } else if isSelected {
            Button { onKeep(sense) } label: {
                Label("Add", systemImage: "rectangle.stack.badge.plus")
            }
            .buttonStyle(GameButtonStyle(compact: true))
            .accessibilityLabel("Add to deck")
        }
    }
}
