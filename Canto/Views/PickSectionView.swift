import SwiftUI

// StoreKit display data, pre-formatted by whoever owns the product. Kept
// beside the view because it's presentation, not domain persistence.
struct PremiumOffer: Equatable {
    let displayName: String
    let displayPrice: String
    let billingPeriod: String
    let trialText: String?
}

// The one value LookupView hands PickSectionView. Replaces the old
// pick + pickPending pair, whose combinations included impossible states.
enum PickPresentation {
    case hidden
    case checkingAccess
    case checking
    case available(Pick)
    case upsell(PremiumOffer)
    case subscriptionNeedsAttention
    case unavailable
    case unavailableToday
}

// The Google-backed suggestion, pinned above the offline list, plus every
// access/failure card that can stand in for it (ADR 0031). Extracted so
// DesignSnapshotTests can render each state without owning an
// OnlineTranslator or firing a network Task (ImageRenderer runs onAppear).
// "Offline results" in this file's copy always means the bundled dictionary
// Senses below the card — never a diagnosis of subscription state.
struct PickSectionView: View {
    let presentation: PickPresentation
    let selectedSenseId: Int64?
    let keptSenseId: Int64?
    let customKept: Bool
    let onTap: (Sense) -> Void
    let onKeep: (Sense) -> Void
    let onCamera: (Sense) -> Void
    let onSpeakCharacters: (String) -> Void
    let onKeepCustom: (String) -> Void
    var onStartTrial: () -> Void = {}
    var onSubscribe: () -> Void = {}
    var onRestore: () -> Void = {}
    var onManage: () -> Void = {}
    var onRetry: () -> Void = {}

    @State private var showingEditor = false

    var body: some View {
        Group {
            switch presentation {
            case .hidden:
                EmptyView()
            case .checkingAccess:
                statusCard("Checking Pick access…", spinning: true)
            case .checking:
                statusCard("Checking Pick…", spinning: true)
            case .available(let pick):
                availableContent(pick)
            case .upsell(let offer):
                upsellCard(offer)
            case .subscriptionNeedsAttention:
                attentionCard
            case .unavailable:
                unavailableCard
            case .unavailableToday:
                quotaCard
            }
        }
        .padding(.horizontal)
        .padding(.top, 4)
        // Collapse the editor when a new Pick arrives - a fresh unmapped word
        // must not inherit the open editor from the last one (no silent state
        // transitions), and "Keep anyway" stays a deliberate opt-in.
        .onChange(of: currentPickCharacters) { _, _ in showingEditor = false }
    }

    private var currentPickCharacters: String? {
        if case .available(let pick) = presentation { return pick.characters }
        return nil
    }

    @ViewBuilder
    private func availableContent(_ pick: Pick) -> some View {
        VStack(alignment: .leading, spacing: 8) {
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
        }
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
                    segments: pick.derived?.segments ?? [],
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

    private func statusCard(_ message: String, spinning: Bool) -> some View {
        HStack(spacing: 10) {
            if spinning {
                ProgressView()
                    .tint(GameTheme.gold)
            }
            Text(message)
                .font(GameTheme.title(15))
                .foregroundStyle(GameTheme.navy.opacity(0.75))
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
    }

    private func upsellCard(_ offer: PremiumOffer) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            googleBadge
            Text(offer.trialText == nil ? "Unlock Google Pick" : "Try Google Pick")
                .font(GameTheme.title(20))
                .foregroundStyle(GameTheme.navy)
            if let trialText = offer.trialText {
                Text("\(trialText), then \(offer.displayPrice)/\(offer.billingPeriod)")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(GameTheme.navy.opacity(0.75))
            } else {
                Text("\(offer.displayPrice)/\(offer.billingPeriod)")
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(GameTheme.navy.opacity(0.75))
            }
            Text("Includes Reverse Lookup.")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(GameTheme.navy.opacity(0.6))
            HStack(spacing: 10) {
                Button(offer.trialText == nil ? "Subscribe" : "Start free trial") {
                    offer.trialText == nil ? onSubscribe() : onStartTrial()
                }
                .buttonStyle(GameButtonStyle(compact: true))
                Button("Restore", action: onRestore)
                    .font(GameTheme.title(14))
                    .foregroundStyle(GameTheme.navy.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
    }

    private var attentionCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Subscription needs attention")
                .font(GameTheme.title(17))
                .foregroundStyle(GameTheme.navy)
            HStack(spacing: 10) {
                Button("Restore", action: onRestore)
                    .buttonStyle(GameButtonStyle(compact: true))
                Button("Manage", action: onManage)
                    .font(GameTheme.title(14))
                    .foregroundStyle(GameTheme.navy.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
    }

    private var unavailableCard: some View {
        HStack(spacing: 10) {
            Text("Pick unavailable — offline results shown")
                .font(GameTheme.title(14))
                .foregroundStyle(GameTheme.navy.opacity(0.75))
            Spacer(minLength: 0)
            Button("Retry", action: onRetry)
                .buttonStyle(GameButtonStyle(compact: true))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
    }

    // No Retry on purpose: the daily character quota resets on Google's
    // clock, not the player's taps (ADR 0031).
    private var quotaCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Pick unavailable today")
                .font(GameTheme.title(16))
                .foregroundStyle(GameTheme.navy)
            Text("Offline results are still available.")
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundStyle(GameTheme.navy.opacity(0.7))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardFrame()
    }
}
