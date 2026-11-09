import SwiftUI

struct ProductsCatalogView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var searchQuery = ""
    @State private var selectedProduct: Product? = nil

    var filteredProducts: [Product] {
        if searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return viewModel.products
        }
        let q = searchQuery.lowercased()
        return viewModel.products.filter {
            $0.descricao.lowercased().contains(q) ||
            $0.codigoInterno.lowercased().contains(q) ||
            $0.codigo.lowercased().contains(q) ||
            ($0.categoria?.lowercased().contains(q) == true)
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Barra de Busca Rápida
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    TextField("Buscar produto por nome, código ou categoria...", text: $searchQuery)
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
                    Text("\(filteredProducts.count) produtos no catálogo")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 6)

                // Lista de Produtos com Fotos
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredProducts) { prod in
                            productCard(prod)
                        }
                    }
                    .padding(14)
                }
            }
            .navigationTitle("Catálogo de Produtos")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
            .sheet(item: $selectedProduct) { prod in
                productDetailSheet(prod)
            }
        }
    }

    private func productCard(_ prod: Product) -> some View {
        Button(action: { selectedProduct = prod }) {
            HStack(spacing: 14) {
                // Foto do Produto
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(UIColor.secondarySystemBackground))
                        .frame(width: 64, height: 64)

                    if let foto = prod.fotoUrl, !foto.isEmpty, let url = URL(string: foto.starts(with: "http") ? foto : "\(viewModel.serverUrl)/produtos/imagem/\(foto)") {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 64, height: 64)
                                    .cornerRadius(10)
                            default:
                                Image(systemName: "photo.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                    } else {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 24))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(prod.descricao)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    HStack(spacing: 8) {
                        Text("Cód: \(prod.safeCodigoInterno)")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundColor(.secondary)
                        if let cat = prod.categoria {
                            Text("• \(cat)")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                        }
                    }

                    HStack(spacing: 12) {
                        Text("Custo: R$ \(String(format: "%.2f", prod.precoUnitarioPadrao))")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)

                        Text("PDV: R$ \(String(format: "%.2f", prod.pdvSugerido))")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.secondary)
            }
            .padding(12)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }

    private func productDetailSheet(_ prod: Product) -> some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Foto Grande
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(UIColor.secondarySystemBackground))
                            .frame(height: 220)

                        if let foto = prod.fotoUrl, !foto.isEmpty, let url = URL(string: foto.starts(with: "http") ? foto : "\(viewModel.serverUrl)/produtos/imagem/\(foto)") {
                            AsyncImage(url: url) { phase in
                                if let img = phase.image {
                                    img.resizable().aspectRatio(contentMode: .fit).frame(maxHeight: 200)
                                } else {
                                    Image(systemName: "photo").font(.system(size: 40)).foregroundColor(.secondary)
                                }
                            }
                        } else {
                            Image(systemName: "shippingbox.fill")
                                .font(.system(size: 60))
                                .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text(prod.descricao)
                            .font(.system(size: 20, weight: .black))

                        HStack {
                            Text("Código Interno: \(prod.safeCodigoInterno)")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(prod.qtdPorPacote) pçs / pacote")
                                .font(.system(size: 12, weight: .semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(6)
                        }

                        Divider()

                        // Termômetro Tributário do Produto
                        let fiscal = FiscalEngine.calculateItemFiscal(precoCompra: prod.precoUnitarioPadrao, pdvAlvo: prod.pdvSugerido)

                        VStack(spacing: 8) {
                            HStack {
                                Text("Preço de Compra Base:")
                                Spacer()
                                Text("R$ \(String(format: "%.2f", prod.precoUnitarioPadrao))").fontWeight(.bold)
                            }
                            HStack {
                                Text("Custo Real Efetivo (com créditos):")
                                Spacer()
                                Text("R$ \(String(format: "%.2f", fiscal.custoRealEfetivo))").foregroundColor(.secondary)
                            }
                            HStack {
                                Text("Preço de Venda Sugerido (PDV):")
                                Spacer()
                                Text("R$ \(String(format: "%.2f", prod.pdvSugerido))")
                                    .fontWeight(.black)
                                    .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                            }
                            HStack {
                                Text("Margem Real Líquida:")
                                Spacer()
                                Text("\(String(format: "%.1f", fiscal.margemPercentual))% (R$ \(String(format: "%.2f", fiscal.margemRealUnit)) un)")
                                    .fontWeight(.bold)
                                    .foregroundColor(fiscal.isLucrativo ? .green : .red)
                            }
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemBackground))
                        .cornerRadius(12)
                    }
                    .padding(16)
                }
                .padding(16)
            }
            .navigationTitle("Detalhes do Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Concluir") { selectedProduct = nil }
                }
            }
        }
    }
}

