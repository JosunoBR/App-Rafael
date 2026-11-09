import SwiftUI

struct FinancialBoletosView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var selectedFilter = "TODOS"

    var filteredInstallments: [PaymentInstallment] {
        switch selectedFilter {
        case "A VENCER":
            return viewModel.installments.filter { $0.status == "A Vencer" }
        case "VENCIDOS":
            return viewModel.installments.filter { $0.status == "Em Atraso" }
        case "PAGOS":
            return viewModel.installments.filter { $0.status == "Pago" }
        default:
            return viewModel.installments
        }
    }

    var totalValor: Double {
        filteredInstallments.reduce(0.0) { $0 + $1.valor }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filtros de Boletos
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["TODOS", "A VENCER", "VENCIDOS", "PAGOS"], id: \.self) { filter in
                            let isSelected = selectedFilter == filter
                            Button(action: { selectedFilter = filter }) {
                                Text(filter)
                                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(UIColor.secondarySystemBackground))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .background(Color.white)

                // Resumo do Total Filtrado
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(filteredInstallments.count) lançamentos filtrados")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                        Text(NumberFormatter.localizedString(from: NSNumber(value: totalValor), number: .currency))
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                    Spacer()
                    Image(systemName: "barcode.viewfinder")
                        .font(.system(size: 28))
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.8))
                }
                .padding(14)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                .padding(14)

                // Lista de Boletos
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(filteredInstallments) { item in
                            installmentCard(item)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Boletos Financeiros")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
        }
    }

    private func installmentCard(_ item: PaymentInstallment) -> some View {
        VStack(spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.fornecedorNome)
                        .font(.system(size: 14, weight: .bold))
                    Text("Ped: \(item.numeroPedido) • Parcela \(item.parcelaNumero)/\(item.totalParcelas)")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(statusLabel(item.status))
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(statusColor(item.status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(item.status).opacity(0.12))
                    .cornerRadius(6)
            }

            Divider()

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Loja Pagadora: \(item.lojaNome)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                    Text("Vencimento: \(item.dataVencimento)")
                        .font(.system(size: 12, weight: .semibold))
                }
                Spacer()
                Text(NumberFormatter.localizedString(from: NSNumber(value: item.valor), number: .currency))
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 1)
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "Pago": return "PAGO"
        case "Em Atraso": return "EM ATRASO"
        default: return "A VENCER"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "Pago": return .green
        case "Em Atraso": return .red
        default: return .orange
        }
    }
}

