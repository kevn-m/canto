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

    var body: some View {
        HStack {
            SenseRowView(sense: sense)
                .contentShape(Rectangle())
                .onTapGesture { onTap(sense) }
            if sense.id == selectedSenseId, sense.id != keptSenseId {
                Spacer()
                Button { onKeep(sense) } label: {
                    Image(systemName: "checkmark.circle")
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Keep this answer")
            }
            if sense.id == keptSenseId {
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                if CameraPicker.isAvailable {
                    Button { onCamera(sense) } label: {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 22))
                    }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Snap it now")
                }
            }
        }
    }
}
