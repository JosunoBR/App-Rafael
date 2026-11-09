import SwiftUI

struct SuppliersView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var searchQuery = ""

    var filteredSuppliers: [Supplier] {
        if searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return viewModel.suppliers
        }
        let q = searchQuery.lowercased()
        return viewModel.suppliers.filter {
            $0.razaoSocial.lowercased().contains(q) ||
            ($0.nomeFantasia?.lowercased().contains(q) == true) ||
            ($0.cnpj?.contains(q) == true) ||
            ($0.vendedorPadrao?.lowercased().contains(q) == true)
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Barra de Busca
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    TextField("Buscar fornecedor, representante ou CNPJ...", text: $searchQuery)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    if !searchQuery.isEmpty {
                        Button(action: { searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(12)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
                .padding(14)

                HStack {
                    Text("\(filteredSuppliers.count) fornecedores cadastrados")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 6)

                // Lista de Fornecedores
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredSuppliers) { sup in
                            supplierCard(sup)
                        }
                    }
                    .padding(14)
                }
            }
            .navigationTitle("Fornecedores")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
        }
    }

    private func supplierCard(_ sup: Supplier) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: "building.2.fill")
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(sup.razaoSocial)
                        .font(.system(size: 14, weight: .bold))
                        .lineLimit(1)
                    if let cnpj = sup.cnpj {
                        Text("CNPJ: \(cnpj)")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
            }

            Divider()

            VStack(alignment: .leading, spacing: 6) {
                if let vendedor = sup.vendedorPadrao {
                    HStack {
                        Image(systemName: "person.circle")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                        Text("Vendedor: \(vendedor)")
                            .font(.system(size: 12))
                        if let tel = sup.contatoVendedor {
                            Spacer()
                            Text(tel)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                        }
                    }
                }

                if let cond = sup.condicaoPagamentoPadrao {
                    HStack {
                        Image(systemName: "creditcard")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                        Text("Prazo Padrão: \(cond)")
                            .font(.system(size: 12))
                    }
                }

                if let obs = sup.observacoesDescarga {
                    HStack(alignment: .top) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                        Text("Descarga: \(obs)")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 1)
    }
}

