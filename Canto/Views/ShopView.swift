import SwiftUI

// Wallet + real-world treats it buys. Balance is always GameStore.balance()
// (the ledger sum), reloaded after every write so redeem/archive/add can't
// leave a stale number on screen.
struct ShopView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @State private var items: [ShopItem] = []
    @State private var balance = 0
    @State private var pendingRedeem: ShopItem?
    @State private var showingEdit = false

    var body: some View {
        ZStack {
            InnBackground()
            VStack(spacing: 20) {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                balanceView
                List(items) { item in
                    itemRow(item)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Shop")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Edit") { showingEdit = true }
                    .tint(GameTheme.gold)
            }
        }
        .onAppear(perform: reload)
        .confirmationDialog(
            "Spend \(pendingRedeem?.price ?? 0) CantoBux on \(pendingRedeem?.name ?? "")?",
            isPresented: Binding(get: { pendingRedeem != nil }, set: { if !$0 { pendingRedeem = nil } }),
            titleVisibility: .visible
        ) {
            Button("Redeem", action: redeem)
            Button("Cancel", role: .cancel) { pendingRedeem = nil }
        }
        .sheet(isPresented: $showingEdit, onDismiss: reload) {
            ShopEditView()
        }
    }

    private var balanceView: some View {
        HStack(spacing: 10) {
            Image(systemName: "dollarsign.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(GameTheme.gold)
            Text("\(balance)")
                .font(GameTheme.title(44))
                .foregroundStyle(GameTheme.cream)
        }
        .padding(.top, 8)
    }

    private func itemRow(_ item: ShopItem) -> some View {
        HStack {
            Text(item.name)
                .font(GameTheme.title(18))
                .foregroundStyle(GameTheme.navy)
            Spacer()
            let affordable = balance >= item.price
            Button("Redeem (\(item.price))") { pendingRedeem = item }
                .buttonStyle(GameButtonStyle(compact: true))
                .disabled(!affordable)
                .opacity(affordable ? 1 : 0.4)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .cardFrame()
    }

    private func reload() {
        items = gameStore.shopItems(includeArchived: false)
        balance = gameStore.balance()
    }

    private func redeem() {
        guard let item = pendingRedeem else { return }
        pendingRedeem = nil
        gameStore.redeem(item: item)
        reload()
    }
}

// Dad-only: add new items and archive old ones. No password gate - the app
// is single-family and offline, so "dad's edit mode" just means "an extra
// tap away", not access control.
private struct ShopEditView: View {
    @ObservedObject private var gameStore = GameStore.shared
    @Environment(\.dismiss) private var dismiss
    @State private var items: [ShopItem] = []
    @State private var newName = ""
    @State private var newPrice = ""

    var body: some View {
        NavigationStack {
            Form {
                if let lastError = gameStore.lastError {
                    ErrorBanner(message: lastError) { gameStore.clearError() }
                }
                Section("Add item") {
                    TextField("Name", text: $newName)
                    TextField("Price", text: $newPrice)
                        .keyboardType(.numberPad)
                    Button("Add", action: addItem)
                        // Int(newPrice) == nil covers pasted "20.00",
                        // whitespace, and overflow - not just empty.
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty || Int(newPrice) == nil)
                }
                Section("Items") {
                    ForEach(items) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            Text("\(item.price)").foregroundStyle(.secondary)
                        }
                    }
                    .onDelete(perform: archive)
                }
            }
            .navigationTitle("Edit Shop")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear(perform: reload)
        }
    }

    private func reload() {
        items = gameStore.shopItems(includeArchived: false)
    }

    private func addItem() {
        guard let price = Int(newPrice) else { return }
        gameStore.addShopItem(name: newName.trimmingCharacters(in: .whitespaces), price: price)
        // Keep the fields on a rejected add (e.g. price 0) so dad can fix
        // the price without retyping. reportError sets lastError inline
        // on the main thread, so this check is safe right after the call.
        if gameStore.lastError == nil {
            newName = ""
            newPrice = ""
        }
        reload()
    }

    private func archive(at offsets: IndexSet) {
        for index in offsets {
            gameStore.archiveShopItem(id: items[index].id)
        }
        reload()
    }
}
