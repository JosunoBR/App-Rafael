import SwiftUI

struct BuyerHomeView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @State private var showNewOrder = false
    @State private var showCatalog = false
    @State private var showSuppliers = false
    @State private var showBoletos = false
    @State private var showHistory = false
    @State private var showDoca = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    // Header de Saudação Corporativa
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Olá, \(viewModel.currentUser?.nome ?? "Rafael")")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.white)
                            Text("Perfil: \(viewModel.currentUser?.role ?? "Comprador") • 20 Lojas Integradas")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color(red: 0.65, green: 0.90, blue: 0.77))
                        }
                        Spacer()
                        Button(action: { viewModel.logout() }) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .padding(10)
                                .background(Color.white.opacity(0.2))
                                .clipShape(Circle())
                        }
                    }
                    .padding(20)
                    .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                    .cornerRadius(18)
                    .shadow(color: Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.25), radius: 10, x: 0, y: 5)

                    // 1. Resumo da Esteira Operacional (Cards Horizontais)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("ESTEIRA DE PEDIDOS MATRIZ")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        HStack(spacing: 12) {
                            metricBadge(title: "Em Cotação", count: viewModel.orders.filter { $0.status == "Em Cotação" }.count, color: .orange)
                            metricBadge(title: "Em Separação", count: viewModel.orders.filter { $0.status == "Em Separação" }.count, color: .blue)
                            metricBadge(title: "Conferidos", count: viewModel.orders.filter { $0.status == "Conferido na Doca" }.count, color: .green)
                        }
                    }

                    // 2. Resumo Financeiro Rápido
                    VStack(alignment: .leading, spacing: 10) {
                        Text("FINANCEIRO • BOLETOS DAS 20 LOJAS")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        HStack(spacing: 12) {
                            let aVencer = viewModel.installments.filter { $0.status != "Pago" }.count
                            let totalVal = viewModel.installments.filter { $0.status != "Pago" }.reduce(0.0) { $0 + $1.valor }

                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("\(aVencer) Boletos Pendentes")
                                        .font(.system(size: 14, weight: .bold))
                                    Text(NumberFormatter.localizedString(from: NSNumber(value: totalVal), number: .currency))
                                        .font(.system(size: 16, weight: .black, design: .rounded))
                                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                }
                                Spacer()
                                Button(action: { showBoletos = true }) {
                                    Text("Ver Todos")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                }
                            }
                            .padding(14)
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                        }
                    }

                    // 3. Atalhos Operacionais Principais
                    VStack(alignment: .leading, spacing: 10) {
                        Text("AÇÕES DO COMPRADOR")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        VStack(spacing: 12) {
                            actionButton(
                                title: "Novo Pedido de Compras",
                                subtitle: "Grade das 20 lojas, termômetro e rateio de caixas",
                                icon: "cart.badge.plus",
                                badge: "Lançamento",
                                action: { showNewOrder = true }
                            )

                            actionButton(
                                title: "Catálogo de Produtos",
                                subtitle: "Visualizar fotos, histórico e preços de venda",
                                icon: "photo.stack.fill",
                                badge: "\(viewModel.products.count) Itens",
                                action: { showCatalog = true }
                            )

                            actionButton(
                                title: "Histórico de Pedidos",
                                subtitle: "Consultar esteira, romaneios e pedidos emitidos",
                                icon: "doc.text.magnifyingglass",
                                badge: "\(viewModel.orders.count) Pedidos",
                                action: { showHistory = true }
                            )

                            actionButton(
                                title: "Diretório de Fornecedores",
                                subtitle: "Contatos de representantes e condições comerciais",
                                icon: "building.2.fill",
                                badge: "\(viewModel.suppliers.count) Ativos",
                                action: { showSuppliers = true }
                            )

                            if viewModel.currentUser?.role == "Diretoria" || viewModel.currentUser?.role == "Conferente" {
                                actionButton(
                                    title: "Conferência de Doca (CD)",
                                    subtitle: "Romaneio digital por galpão e apontamento de avarias",
                                    icon: "barcode.viewfinder",
                                    badge: "Galpão",
                                    action: { showDoca = true }
                                )
                            }
                        }
                    }
                }
                .padding(16)
            }
            .navigationTitle("Mega 12 Matriz")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea())
            .sheet(isPresented: $showNewOrder) {
                OrderCreationView(viewModel: viewModel)
            }
            .sheet(isPresented: $showCatalog) {
                ProductsCatalogView(viewModel: viewModel)
            }
            .sheet(isPresented: $showSuppliers) {
                SuppliersView(viewModel: viewModel)
            }
            .sheet(isPresented: $showBoletos) {
                FinancialBoletosView(viewModel: viewModel)
            }
            .sheet(isPresented: $showHistory) {
                OrderHistoryView(viewModel: viewModel)
            }
            .sheet(isPresented: $showDoca) {
                DocaSeparationView(viewModel: viewModel)
            }
        }
    }

    private func metricBadge(title: String, count: Int, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundColor(color)
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }

    private func actionButton(title: String, subtitle: String, icon: String, badge: String, action: @escaping () -> Void) -> some View {
        Button(action: {
            let gen = UIImpactFeedbackGenerator(style: .light)
            gen.impactOccurred()
            action()
        }) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.12))
                        .frame(width: 48, height: 48)
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.primary)
                        Spacer()
                        Text(badge)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.1))
                            .cornerRadius(4)
                    }
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
        }
    }
}

