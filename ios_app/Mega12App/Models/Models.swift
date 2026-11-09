import Foundation

// MARK: - Usuário e Sessão
struct User: Identifiable, Codable {
    var id: String = ""
    var nome: String = ""
    var email: String = ""
    var role: String = ""
    var cargo: String? = nil
    var telefone: String? = nil
    var token: String? = nil
}

struct LoginResponse: Codable {
    var success: Bool
    var token: String?
    var user: User?
    var message: String?
}

// MARK: - Configuração de Lojas e Clusters
struct StoreConfig: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var cluster: String // "A", "B" ou "C"
    var defaultWeight: Double
    var active: Bool = true
}

// MARK: - Parâmetros Fiscais
struct FiscalConfig: Codable {
    var icmsAliquota: Double = 0.11
    var ipiAliquota: Double = 0.00
    var pisCofinsAliquota: Double = 0.03
    var custosFixos: Double = 0.26
    var creditoEntradaICMS: Double = 0.195
}

enum MarginStatus: String, Codable {
    case excelente = "EXCELENTE"
    case boa = "BOA"
    case apertada = "APERTADA"
    case prejuizo = "PREJUIZO"
    
    var colorName: String {
        switch self {
        case .excelente: return "green"
        case .boa: return "blue"
        case .apertada: return "orange"
        case .prejuizo: return "red"
        }
    }
}

struct FiscalCalculationResult: Codable {
    var precoCompra: Double = 0.0
    var pdvAlvo: Double = 0.0
    var percentualDespesasPdv: Double = 0.0
    var percentualCreditoEntrada: Double = 0.0
    var custosFixosAliquota: Double = 0.26
    var icmsSaidaAliquota: Double = 0.11
    var pisCofinsAliquota: Double = 0.03
    var custoFixoUnit: Double = 0.0
    var icmsSaidaUnit: Double = 0.0
    var pisCofinsUnit: Double = 0.0
    var despesasPdvUnit: Double = 0.0
    var creditoIcmsUnit: Double = 0.0
    var custoRealEfetivo: Double = 0.0
    var margemRealUnit: Double = 0.0
    var margemPercentual: Double = 0.0
    var isLucrativo: Bool = true
    var statusMargem: MarginStatus = .boa
}

// MARK: - Produto
struct Product: Identifiable, Codable {
    var id: String = ""
    var codigoInterno: String = ""
    var codigoFornecedor: String? = nil
    var codigoBarras: String? = nil
    var codigo: String = ""
    var descricao: String = ""
    var categoria: String? = nil
    var subcategoria: String? = nil
    var fornecedorPadraoId: String? = nil
    var fornecedorPadraoNome: String? = nil
    var precoUnitarioPadrao: Double = 0.0
    var pdvSugerido: Double = 0.0
    var qtdPorPacote: Int = 12
    var fotoUrl: String? = nil
    var ncm: String? = nil
    var eanBarcode: String? = nil
    var ativo: Int = 1

    var safeCodigoInterno: String {
        if !codigoInterno.isEmpty { return codigoInterno }
        if !codigo.isEmpty { return codigo }
        return id
    }
}

// MARK: - Fornecedor
struct Supplier: Identifiable, Codable {
    var id: String = ""
    var razaoSocial: String = ""
    var nomeFantasia: String? = nil
    var cnpj: String? = nil
    var vendedorPadrao: String? = nil
    var contatoVendedor: String? = nil
    var condicaoPagamentoPadrao: String? = nil
    var aliquotaStPadrao: Double = 0.0
    var aliquotaIpiPadrao: Double = 0.0
    var descontoOffPadrao: Double = 0.0
    var observacoesDescarga: String? = nil
}

// MARK: - Condição de Pagamento
struct PaymentCondition: Identifiable, Codable, Hashable {
    var id: String
    var descricao: String
    var especie: String? = nil
    var padrao: Bool = false
}

// MARK: - Item do Pedido
struct OrderItem: Identifiable, Codable {
    var id: String = UUID().uuidString
    var codigoInterno: String = ""
    var codigoFornecedor: String? = nil
    var codigo: String = ""
    var descricao: String = ""
    var totalPecas: Int = 0
    var caixas: Int = 0
    var qtdPorCaixa: Int = 12
    var precoCompraUnitario: Double = 0.0
    var pdvAlvo: Double = 12.0
    var subtotal: Double = 0.0
    var ipiAliquota: Double = 0.0
    var valorIpi: Double = 0.0
    var aliquotaSt: Double = 0.0
    var valorSt: Double = 0.0
    var percentualDesconto: Double = 0.0
    var fotoUrl: String? = nil
    var gradeLojas: [String: Int] = [:] // id_loja -> unidades
}

// MARK: - Cabeçalho do Pedido
struct OrderHeader: Codable {
    var id: String = ""
    var numeroPedido: String = ""
    var dataEmissao: String = ""
    var dataPrevisaoEntrega: String = ""
    var fornecedor: String = ""
    var condicaoPagamento: String = "30/60/90 Dias"
    var totalBruto: Double = 0.0
    var totalDesconto: Double = 0.0
    var totalIpi: Double = 0.0
    var totalSt: Double = 0.0
    var totalLiquido: Double = 0.0
    var totalGeral: Double = 0.0
    var totalVolumes: Int = 0
    var totalPecas: Int = 0
    var tipoFrete: String = "FOB"
    var recebidoMatriz: Bool = false
    var boletosLiberados: Bool = false
}

// MARK: - Avaria e Inspeção
struct AvariaRecord: Identifiable, Codable {
    var id: String = UUID().uuidString
    var itemId: String
    var itemDescricao: String
    var lojaId: String
    var lojaNome: String
    var quantidade: Int
    var unidade: String // UN ou CX
    var motivo: String
    var fotoUrl: String?
    var dataRegistro: String
}

struct OrderInspection: Codable {
    var avarias: [AvariaRecord] = []
    var conferenciaLojas: [String: Bool] = [:] // lojaId -> conferido
    var concluido: Bool = false
    var conferenteNome: String?
    var dataConclusao: String?
}

// MARK: - Pedido de Compra Completo
struct PurchaseOrder: Identifiable, Codable {
    var id: String = ""
    var finalId: String { id.isEmpty ? header.id : id }
    var status: String = "Em Cotação"
    var header: OrderHeader = OrderHeader()
    var items: [OrderItem] = []
    var inspection: OrderInspection = OrderInspection()
}

// MARK: - Parcela Financeira (Boleto)
struct PaymentInstallment: Identifiable, Codable {
    var id: String = UUID().uuidString
    var pedidoId: String = ""
    var numeroPedido: String = ""
    var parcelaNumero: Int = 1
    var totalParcelas: Int = 1
    var valor: Double = 0.0
    var dataVencimento: String = ""
    var dataPagamento: String? = nil
    var status: String = "A Vencer" // "Pago", "A Vencer", "Em Atraso"
    var lojaNome: String = ""
    var fornecedorNome: String = ""
    var linhaDigitavel: String? = nil
}

