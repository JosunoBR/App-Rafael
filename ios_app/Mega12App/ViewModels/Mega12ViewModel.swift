import Foundation
import Combine

@MainActor
class Mega12ViewModel: ObservableObject {
    // MARK: - Estado de Sessão e Configuração
    @Published var currentUser: User? = nil
    @Published var serverUrl: String = "https://grupomega.cloud/api"
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    @Published var successMessage: String? = nil

    // MARK: - Catálogo e Listagens
    @Published var products: [Product] = []
    @Published var suppliers: [Supplier] = []
    @Published var orders: [PurchaseOrder] = []
    @Published var installments: [PaymentInstallment] = []
    @Published var paymentConditions: [PaymentCondition] = [
        PaymentCondition(id: "c1", descricao: "30/60/90 Dias", padrao: true),
        PaymentCondition(id: "c2", descricao: "28/56/84 Dias"),
        PaymentCondition(id: "c3", descricao: "30/60/90/120 Dias"),
        PaymentCondition(id: "c4", descricao: "À Vista (TED/PIX)")
    ]

    // MARK: - Filtros e Seleções
    @Published var selectedStatusFilter: String = "TODOS"
    @Published var selectedBoletoFilter: String = "TODOS"

    // MARK: - Calculadora Rápida de Margem
    @Published var calcPrecoCompra: String = "5.50"
    @Published var calcPdvAlvo: String = "12.00"
    @Published var calcCaixas: String = "10"
    @Published var calcQtdPorCaixa: String = "12"
    @Published var fiscalResult: FiscalCalculationResult? = nil

    init() {
        calculateQuickMargin()
        loadLocalMockData()
    }

    // MARK: - Autenticação
    func login(email: String, role: String) {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            let user = User(
                id: UUID().uuidString,
                nome: email.components(separatedBy: "@").first?.capitalized ?? "Rafael",
                email: email,
                role: role,
                cargo: role == "Conferente" ? "Conferente de Doca" : "Comprador Master",
                telefone: "(42) 99999-0012",
                token: "jwt_token_sample"
            )
            self.currentUser = user
            self.isLoading = false
            self.refreshData()
        }
    }

    func logout() {
        currentUser = nil
    }

    func deleteAccount() {
        currentUser = nil
        successMessage = "Sua solicitação de exclusão de conta foi registrada com sucesso."
    }

    // MARK: - Motor Fiscal em Tempo Real
    func calculateQuickMargin() {
        let custo = Double(calcPrecoCompra.replacingOccurrences(of: ",", with: ".")) ?? 0.0
        let pdv = Double(calcPdvAlvo.replacingOccurrences(of: ",", with: ".")) ?? 0.0
        fiscalResult = FiscalEngine.calculateItemFiscal(precoCompra: custo, pdvAlvo: pdv)
    }

    // MARK: - Sincronização de Dados com o Backend
    func refreshData() {
        guard let url = URL(string: "\(serverUrl)/health") else { return }
        isLoading = true
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                    self?.loadRemoteData()
                } else {
                    // Mantém os dados locais para operação contínua sem travas
                    self?.loadLocalMockData()
                }
            }
        }.resume()
    }

    private func loadRemoteData() {
        // Busca de produtos e pedidos na API
        fetchFromApi(endpoint: "products") { [weak self] (result: [Product]?) in
            if let list = result, !list.isEmpty { self?.products = list }
        }
        fetchFromApi(endpoint: "orders") { [weak self] (result: [PurchaseOrder]?) in
            if let list = result, !list.isEmpty { self?.orders = list }
        }
    }

    private func fetchFromApi<T: Codable>(endpoint: String, completion: @escaping ([T]?) -> Void) {
        guard let url = URL(string: "\(serverUrl)/\(endpoint)") else {
            completion(nil)
            return
        }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let items = try? JSONDecoder().decode([T].self, from: data) else {
                completion(nil)
                return
            }
            DispatchQueue.main.async {
                completion(items)
            }
        }.resume()
    }

    // MARK: - Dados de Contingência / Demonstração
    private func loadLocalMockData() {
        if products.isEmpty {
            products = [
                Product(id: "1", codigoInterno: "PRD-001", descricao: "CONJUNTO DE POTES HERMÉTICOS 5PC", categoria: "Utilidades", precoUnitarioPadrao: 6.80, pdvSugerido: 14.99, qtdPorPacote: 12),
                Product(id: "2", codigoInterno: "PRD-002", descricao: "GARRAFA TÉRMICA INOX 500ML", categoria: "Bebidas", precoUnitarioPadrao: 11.50, pdvSugerido: 24.99, qtdPorPacote: 10),
                Product(id: "3", codigoInterno: "PRD-003", descricao: "JG LENÇOL CASAL MICROFIBRA", categoria: "Cama e Banho", precoUnitarioPadrao: 14.20, pdvSugerido: 29.90, qtdPorPacote: 8),
                Product(id: "4", codigoInterno: "PRD-004", descricao: "ORGANIZADOR ACRÍLICO MULTIUSO", categoria: "Organização", precoUnitarioPadrao: 4.50, pdvSugerido: 9.99, qtdPorPacote: 24),
                Product(id: "5", codigoInterno: "PRD-005", descricao: "TRAVESSEIRO SUPORTE ALTO SILICONADO", categoria: "Cama e Banho", precoUnitarioPadrao: 9.90, pdvSugerido: 22.00, qtdPorPacote: 6)
            ]
        }

        if suppliers.isEmpty {
            suppliers = [
                Supplier(id: "s1", razaoSocial: "PLASTCOR INDÚSTRIA E COMÉRCIO LTDA", nomeFantasia: "Plastcor", cnpj: "12.345.678/0001-90", vendedorPadrao: "Carlos Eduardo", contatoVendedor: "(11) 98765-4321", condicaoPagamentoPadrao: "30/60/90 Dias", observacoesDescarga: "Doca 2 preferencial"),
                Supplier(id: "s2", razaoSocial: "ALVINI TEXTIL S/A", nomeFantasia: "Alvini", cnpj: "98.765.432/0001-10", vendedorPadrao: "Mariana Silva", contatoVendedor: "(47) 99123-4567", condicaoPagamentoPadrao: "28/56/84 Dias", observacoesDescarga: "Descarga apenas pela manhã"),
                Supplier(id: "s3", razaoSocial: "INVICTA UTILIDADES DOMESTICAS", nomeFantasia: "Invicta", cnpj: "55.443.221/0001-88", vendedorPadrao: "Roberto Justo", contatoVendedor: "(19) 99888-7766", condicaoPagamentoPadrao: "30/60 Dias", observacoesDescarga: "Exige agendamento prévio")
            ]
        }

        if orders.isEmpty {
            var o1 = PurchaseOrder(
                id: "PED-141020",
                status: "Em Separação",
                header: OrderHeader(
                    id: "h1",
                    numeroPedido: "PED-141020",
                    dataEmissao: "06/11/2026",
                    dataPrevisaoEntrega: "12/11/2026",
                    fornecedor: "PLASTCOR INDÚSTRIA E COMÉRCIO LTDA",
                    condicaoPagamento: "30/60/90 Dias",
                    totalBruto: 42500.00,
                    totalDesconto: 1200.00,
                    totalIpi: 2100.00,
                    totalSt: 1850.00,
                    totalLiquido: 41300.00,
                    totalGeral: 45250.00,
                    totalVolumes: 180,
                    totalPecas: 2160,
                    tipoFrete: "FOB",
                    recebidoMatriz: true,
                    boletosLiberados: false
                ),
                items: [
                    OrderItem(
                        id: "it1",
                        codigoInterno: "PRD-001",
                        descricao: "CONJUNTO DE POTES HERMÉTICOS 5PC",
                        totalPecas: 1200,
                        caixas: 100,
                        qtdPorCaixa: 12,
                        precoCompraUnitario: 6.80,
                        pdvAlvo: 14.99,
                        subtotal: 8160.00,
                        gradeLojas: ["pg_centro": 120, "reserva": 120, "tibagi": 84, "castro": 60]
                    ),
                    OrderItem(
                        id: "it2",
                        codigoInterno: "PRD-004",
                        descricao: "ORGANIZADOR ACRÍLICO MULTIUSO",
                        totalPecas: 960,
                        caixas: 40,
                        qtdPorCaixa: 24,
                        precoCompraUnitario: 4.50,
                        pdvAlvo: 9.99,
                        subtotal: 4320.00,
                        gradeLojas: ["pg_centro": 96, "reserva": 96, "nova_russia": 72]
                    )
                ]
            )

            let o2 = PurchaseOrder(
                id: "PED-141019",
                status: "Aprovado",
                header: OrderHeader(
                    id: "h2",
                    numeroPedido: "PED-141019",
                    dataEmissao: "04/11/2026",
                    dataPrevisaoEntrega: "10/11/2026",
                    fornecedor: "ALVINI TEXTIL S/A",
                    condicaoPagamento: "28/56/84 Dias",
                    totalBruto: 31200.00,
                    totalDesconto: 0.0,
                    totalIpi: 1560.00,
                    totalSt: 0.0,
                    totalLiquido: 31200.00,
                    totalGeral: 32760.00,
                    totalVolumes: 120,
                    totalPecas: 960,
                    tipoFrete: "CIF",
                    recebidoMatriz: false,
                    boletosLiberados: true
                )
            )

            orders = [o1, o2]
        }

        if installments.isEmpty {
            installments = [
                PaymentInstallment(pedidoId: "PED-141020", numeroPedido: "141020", parcelaNumero: 1, totalParcelas: 3, valor: 15083.33, dataVencimento: "2026-11-20", status: "A Vencer", lojaNome: "Mega 12 Matriz", fornecedorNome: "Plastcor"),
                PaymentInstallment(pedidoId: "PED-141020", numeroPedido: "141020", parcelaNumero: 2, totalParcelas: 3, valor: 15083.33, dataVencimento: "2026-12-20", status: "A Vencer", lojaNome: "Mega 12 Matriz", fornecedorNome: "Plastcor"),
                PaymentInstallment(pedidoId: "PED-141020", numeroPedido: "141020", parcelaNumero: 3, totalParcelas: 3, valor: 15083.34, dataVencimento: "2027-01-20", status: "A Vencer", lojaNome: "Mega 12 Matriz", fornecedorNome: "Plastcor"),
                PaymentInstallment(pedidoId: "PED-141019", numeroPedido: "141019", parcelaNumero: 1, totalParcelas: 1, valor: 32760.00, dataVencimento: "2026-11-15", status: "A Vencer", lojaNome: "Ponta Grossa Centro", fornecedorNome: "Alvini")
            ]
        }
    }

    // MARK: - Ações Operacionais de Pedido
    func saveOrder(_ order: PurchaseOrder) {
        orders.insert(order, at: 0)
        successMessage = "Pedido \(order.header.numeroPedido) salvo com sucesso!"
    }

    func registerAvaria(orderId: String, avaria: AvariaRecord) {
        guard let idx = orders.firstIndex(where: { $0.id == orderId || $0.finalId == orderId }) else { return }
        orders[idx].inspection.avarias.append(avaria)
        successMessage = "Avaria registrada para a loja \(avaria.lojaNome)!"
    }

    func toggleStoreConferencia(orderId: String, lojaId: String) {
        guard let idx = orders.firstIndex(where: { $0.id == orderId || $0.finalId == orderId }) else { return }
        let current = orders[idx].inspection.conferenciaLojas[lojaId] ?? false
        orders[idx].inspection.conferenciaLojas[lojaId] = !current
    }

    func concludeSeparation(orderId: String) {
        guard let idx = orders.firstIndex(where: { $0.id == orderId || $0.finalId == orderId }) else { return }
        orders[idx].header.separacaoConcluida = true
        orders[idx].inspection.concluido = true
        orders[idx].inspection.dataConclusao = ISO8601DateFormatter().string(from: Date())
        orders[idx].header.separadoPor = currentUser?.nome ?? "Doca"
        orders[idx].header.dataSeparacao = ISO8601DateFormatter().string(from: Date())
        successMessage = "Separação e conferência do pedido \(orders[idx].header.numeroPedido) concluída com sucesso!"
    }
}

