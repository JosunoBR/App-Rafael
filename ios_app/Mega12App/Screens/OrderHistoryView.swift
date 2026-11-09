import SwiftUI

struct OrderHistoryView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var selectedStatus = "TODOS"
    @State private var searchQuery = ""
    @State private var selectedOrder: PurchaseOrder? = nil

    var filteredOrders: [PurchaseOrder] {
        viewModel.orders.filter { order in
            let matchesStatus = (selectedStatus == "TODOS") || (order.status == selectedStatus)
            let q = searchQuery.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesQuery = q.isEmpty ||
                order.header.numeroPedido.lowercased().contains(q) ||
                order.header.fornecedor.lowercased().contains(q) ||
                order.items.contains { $0.descricao.lowercased().contains(q) }

            return matchesStatus && matchesQuery
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filtros de Status (Esteira)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["TODOS", "Em Cotação", "Aprovado", "Em Separação", "Conferido na Doca"], id: \.self) { st in
                            let isSelected = selectedStatus == st
                            Button(action: { selectedStatus = st }) {
                                Text(st)
                                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(isSelected ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(UIColor.secondarySystemBackground))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .cornerRadius(18)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                }
                .background(Color.white)

                // Barra de Busca
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    TextField("Buscar por número do pedido, fornecedor...", text: $searchQuery)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                .padding(10)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(10)
                .padding(14)

                // Lista de Pedidos
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredOrders) { order in
                            orderCard(order)
                        }
                    }
                    .padding(14)
                }
            }
            .navigationTitle("Histórico de Pedidos")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
            .sheet(item: $selectedOrder) { ord in
                orderDetailSheet(ord)
            }
        }
    }

    private func orderCard(_ order: PurchaseOrder) -> some View {
        Button(action: { selectedOrder = order }) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(order.header.numeroPedido)
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundColor(.primary)
                        Text(order.header.fornecedor)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(order.status)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(statusColor(order.status))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(statusColor(order.status).opacity(0.12))
                        .cornerRadius(6)
                }

                Divider()

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Entrega: \(order.header.dataPrevisaoEntrega)")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                        Text("\(order.header.totalVolumes) Volumes • \(order.header.totalPecas) Peças")
                            .font(.system(size: 11, weight: .medium))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Total do Pedido")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                        Text(NumberFormatter.localizedString(from: NSNumber(value: order.header.totalGeral), number: .currency))
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                }
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 1)
        }
    }

    private func orderDetailSheet(_ order: PurchaseOrder) -> some View {
        NavigationView {
            List {
                Section(header: Text("Informações Gerais")) {
                    HStack {
                        Text("Fornecedor:")
                        Spacer()
                        Text(order.header.fornecedor).fontWeight(.semibold)
                    }
                    HStack {
                        Text("Condição:")
                        Spacer()
                        Text(order.header.condicaoPagamento)
                    }
                    HStack {
                        Text("Status:")
                        Spacer()
                        Text(order.status).fontWeight(.bold).foregroundColor(statusColor(order.status))
                    }
                }

                Section(header: Text("Itens do Pedido (\(order.items.count))")) {
                    ForEach(order.items) { it in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(it.descricao).font(.system(size: 13, weight: .bold))
                                Text("Cód: \(it.codigoInterno) • \(it.caixas) cxs (\(it.totalPecas) pçs)")
                                    .font(.system(size: 11)).foregroundColor(.secondary)
                            }
                            Spacer()
                            Text(NumberFormatter.localizedString(from: NSNumber(value: it.subtotal), number: .currency))
                                .font(.system(size: 13, weight: .bold))
                        }
                    }
                }

                Section(header: Text("Totais Oficiais")) {
                    HStack {
                        Text("Total Bruto:")
                        Spacer()
                        Text(NumberFormatter.localizedString(from: NSNumber(value: order.header.totalBruto), number: .currency))
                    }
                    if order.header.totalSt > 0 {
                        HStack {
                            Text("(+) ST dos Produtos:")
                            Spacer()
                            Text(NumberFormatter.localizedString(from: NSNumber(value: order.header.totalSt), number: .currency))
                                .foregroundColor(.blue)
                        }
                    }
                    HStack {
                        Text("Total Geral:")
                        Spacer()
                        Text(NumberFormatter.localizedString(from: NSNumber(value: order.header.totalGeral), number: .currency))
                            .fontWeight(.black)
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                }
            }
            .navigationTitle(order.header.numeroPedido)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") { selectedOrder = nil }
                }
            }
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "Aprovado": return .green
        case "Em Separação": return .blue
        case "Conferido na Doca": return Color(red: 0.02, green: 0.59, blue: 0.41)
        default: return .orange
        }
    }
}

