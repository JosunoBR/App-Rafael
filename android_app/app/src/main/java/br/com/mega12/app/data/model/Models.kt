package br.com.mega12.app.data.model

import com.google.gson.annotations.SerializedName

// Usuário & Autenticação
data class User(
    val id: String = "",
    val nome: String = "",
    val email: String = "",
    val role: String = "",
    val cargo: String? = null,
    val telefone: String? = null,
    val token: String? = null
)

data class LoginRequest(
    val email: String,
    val senha: String
)

data class LoginResponse(
    val success: Boolean,
    val token: String?,
    val user: User?,
    val message: String?
)

// Configuração de Lojas
data class StoreConfig(
    val id: String,
    val name: String,
    val cluster: String, // "A", "B" ou "C"
    val defaultWeight: Double,
    val active: Boolean = true
)

// Parâmetros Fiscais
data class FiscalConfig(
    val icmsAliquota: Double = 0.11,
    val ipiAliquota: Double = 0.00,
    val pisCofinsAliquota: Double = 0.03,
    val custosFixos: Double = 0.26,
    val creditoEntradaICMS: Double = 0.195
)

// Produto
data class Product(
    val id: String = "",
    val codigoInterno: String = "",
    val codigoFornecedor: String? = null,
    val codigoBarras: String? = null,
    val codigo: String = "", // retrocompatibilidade
    val descricao: String = "",
    val categoria: String? = null,
    val subcategoria: String? = null,
    val fornecedorPadraoId: String? = null,
    val fornecedorPadraoNome: String? = null,
    val precoUnitarioPadrao: Double = 0.0,
    val pdvSugerido: Double = 0.0,
    val qtdPorPacote: Int = 12,
    val fotoUrl: String? = null,
    val ncm: String? = null,
    val eanBarcode: String? = null,
    val ativo: Int = 1
)

// Fornecedor
data class Supplier(
    val id: String = "",
    val razaoSocial: String = "",
    val nomeFantasia: String? = null,
    val cnpj: String? = null,
    val vendedorPadrao: String? = null,
    val contatoVendedor: String? = null,
    val condicaoPagamentoPadrao: String? = null,
    val aliquotaStPadrao: Double = 0.0,
    val aliquotaIpiPadrao: Double = 0.0,
    val descontoOffPadrao: Double = 0.0,
    val observacoesDescarga: String? = null
)

// Item do Pedido
data class OrderItem(
    val id: String = "",
    val codigoInterno: String = "",
    val codigoFornecedor: String? = null,
    val codigo: String = "", // retrocompatibilidade
    val descricao: String = "",
    @SerializedName("qtdTotalUnidades", alternate = ["totalPecas", "caixas"])
    val totalPecas: Int = 0,
    @SerializedName("precoUnitario", alternate = ["precoCompraUnitario", "custoUnitario"])
    val precoCompraUnitario: Double = 0.0,
    val pdvAlvo: Double = 12.0,
    @SerializedName("valorTotalLiquido", alternate = ["valorTotalBruto", "subtotal"])
    val subtotal: Double = 0.0,
    val ipiAliquota: Double = 0.0,
    val percentualDesconto: Double = 0.0,
    val custoRealEfetivo: Double = 0.0,
    @SerializedName("margemPercentual", alternate = ["margemCalculada"])
    val margemCalculada: Double = 0.0,
    val statusMargem: String = "boa",
    @SerializedName("fotoUrl", alternate = ["photoUrl"])
    val photoUrl: String? = null,
    @SerializedName("separacaoLojas", alternate = ["storeDistribution"])
    val storeDistribution: Map<String, Int> = emptyMap(),
    val qtdPorCaixa: Int = 1,
    val qtdPorPacote: Int = 1
) {
    val fotoUrl: String?
        get() = photoUrl

    val subtotalEfetivo: Double
        get() = if (subtotal > 0) subtotal else (totalPecas * precoCompraUnitario)
}

// Estruturas de Doca e Conferência
data class StoreItemCheck(
    val conferido: Boolean = false,
    val conferenteId: String? = null,
    val conferenteNome: String? = null,
    val dataHora: String? = null
)

data class AvariaRecord(
    val id: String = "",
    val itemId: String = "",
    val codigoProduto: String = "",
    val descricaoProduto: String = "",
    val storeId: String = "",
    val nomeLoja: String = "",
    val quantidade: Int = 1,
    val unidadeMedida: String = "UN", // "UN", "CX", "PCT"
    val custoUnitario: Double = 0.0,
    val valorPrejuizoTotal: Double = 0.0,
    val motivo: String = "",
    val conferente: String = "",
    val dataRegistro: String = ""
)

data class OrderInspection(
    val conferente: String? = null,
    val dataConferencia: String? = null,
    val possuiAvarias: Boolean = false,
    val avarias: List<AvariaRecord> = emptyList(),
    val conferenciaLojas: Map<String, StoreItemCheck> = emptyMap()
)

// Parcela e Boleto
data class PaymentInstallment(
    val id: String = "",
    val orderId: String? = null,
    val numeroPedido: String? = null,
    val fornecedor: String? = null,
    val descricao: String? = null,
    val lojaNome: String? = null,
    val numeroParcela: Int = 1,
    val totalParcelas: Int = 1,
    val dataVencimento: String = "",
    val valor: Double = 0.0,
    val status: String = "A Vencer", // "A Vencer" | "Vence Hoje" | "Em Atraso" | "Pago"
    val dataPagamento: String? = null,
    val observacao: String? = null,
    val documentoRef: String? = null
) {
    val displayFornecedor: String
        get() = when {
            !fornecedor.isNullOrBlank() -> fornecedor
            !descricao.isNullOrBlank() -> descricao
            !lojaNome.isNullOrBlank() -> "Loja $lojaNome"
            else -> "Fornecedor Geral"
        }

    val displayDocumento: String
        get() = when {
            !numeroPedido.isNullOrBlank() -> numeroPedido
            !documentoRef.isNullOrBlank() -> documentoRef
            !descricao.isNullOrBlank() -> descricao
            else -> "DOC-FIN"
        }
}

// Cabeçalho do Pedido
data class OrderHeader(
    val id: String = "",
    val numeroPedido: String = "",
    val fornecedor: String = "",
    val supplierId: String? = null,
    val vendedor: String? = null,
    val contatoVendedor: String? = null,
    val condicaoPagamento: String? = null,
    val dataEmissao: String? = null,
    val dataPedido: String? = null,
    val dataEntregaPrevista: String? = null,
    val percentualDescontoOff: Double = 0.0,
    val percentualNota: Double = 100.0,
    val aliquotaSt: Double = 0.0,
    val observacoes: String? = null,
    val recebidoMatriz: Boolean = false,
    val status: String = "Em Cotação",
    val totalBruto: Double = 0.0,
    val totalIpi: Double = 0.0,
    val totalDesconto: Double = 0.0,
    val totalLiquido: Double = 0.0,
    val totalGeral: Double = 0.0,
    val valorNotaFiscalEntregue: Double = 0.0,
    val ajusteFiscalDiferenca: Double = 0.0,
    val ajusteFiscalData: String? = null,
    val ajusteFiscalUsuario: String? = null,
    val totalPecas: Int = 0,
    val totalVolumes: Int = 0,
    val createdAt: String? = null
)

// Pedido Completo
data class PurchaseOrder(
    val id: String = "",
    val header: OrderHeader = OrderHeader(),
    val items: List<OrderItem> = emptyList(),
    val installments: List<PaymentInstallment> = emptyList(),
    val inspection: OrderInspection? = null,
    @SerializedName("status")
    val status: String = "Em Cotação",
    @SerializedName("separationStatus")
    val separationStatus: String = "Pendente",
    @SerializedName("totalLiquido")
    val totalLiquido: Double = 0.0,
    @SerializedName("totalPecas")
    val totalPecas: Int = 0,
    val createdAt: String? = null
) {
    val finalId: String
        get() = id.ifBlank { header.id }

    val statusEfetivo: String
        get() = when {
            status.isNotBlank() && status != "Em Cotação" -> status
            header.status.isNotBlank() -> header.status
            else -> status
        }

    val totalLiquidoEfetivo: Double
        get() = when {
            totalLiquido > 0 -> totalLiquido
            header.totalLiquido > 0 -> header.totalLiquido
            header.totalGeral > 0 -> header.totalGeral
            items.isNotEmpty() -> items.sumOf { if (it.subtotal > 0) it.subtotal else (it.totalPecas * it.precoCompraUnitario) }
            header.totalBruto > 0 -> header.totalBruto
            else -> 0.0
        }

    val totalPecasEfetivo: Int
        get() = when {
            totalPecas > 0 -> totalPecas
            header.totalPecas > 0 -> header.totalPecas
            items.isNotEmpty() -> items.sumOf { it.totalPecas }
            header.totalVolumes > 0 -> header.totalVolumes
            else -> 0
        }
}

// Item do Estoque Central (CD)
data class CentralStockItem(
    val id: String = "",
    val productId: String? = null,
    val codigoInterno: String = "",
    val codigoFornecedor: String? = null,
    val codigoBarras: String? = null,
    val descricao: String = "",
    val categoria: String? = null,
    val fotoUrl: String? = null,
    val saldoUnidades: Int = 0,
    val precoUnitario: Double = 0.0,
    val pdvSugerido: Double = 12.0,
    val localizacaoGalpao: String? = "Rua A - Palete 01",
    val fornecedorOrigem: String? = null,
    val updatedAt: String? = null
)

// Lançamento de Avaria
data class AvariaItem(
    val storeId: String,
    val storeName: String,
    val itemCodigo: String,
    val itemDescricao: String,
    val quantidade: Int,
    val motivo: String,
    val timestamp: String
)

// Lançamento Financeiro
data class FinancialEntry(
    val id: String = "",
    val descricao: String = "",
    val categoria: String = "PRODUTOS",
    val fornecedor: String? = null,
    val formaPagamento: String = "BOLETO",
    val parcelaDesc: String = "1/1",
    val dataVencimento: String = "",
    val valor: Double = 0.0,
    val status: String = "A Vencer",
    val dataPagamento: String? = null
)

// Condição de Pagamento Salva
data class PaymentCondition(
    val id: String = "",
    val descricao: String = "",
    val qtdParcelas: Int = 1,
    val parcelasDias: List<Int> = emptyList(),
    val especie: String? = "Boleto",
    val banco: String? = null,
    val ativo: Boolean = true,
    val padrao: Boolean = false,
    val observacao: String? = null
)

val DEFAULT_PAYMENT_CONDITIONS = listOf(
    PaymentCondition(id = "cond_30_60_90", descricao = "30/60/90 Dias", qtdParcelas = 3, parcelasDias = listOf(30, 60, 90), especie = "Boleto", padrao = true),
    PaymentCondition(id = "cond_7_14_21_28", descricao = "7/14/21/28 Dias", qtdParcelas = 4, parcelasDias = listOf(7, 14, 21, 28), especie = "Boleto"),
    PaymentCondition(id = "cond_14_21_28_35_42_49_56", descricao = "14/21/28/35/42/49/56 Dias", qtdParcelas = 7, parcelasDias = listOf(14, 21, 28, 35, 42, 49, 56), especie = "Boleto"),
    PaymentCondition(id = "cond_28_35_42", descricao = "28/35/42 Dias", qtdParcelas = 3, parcelasDias = listOf(28, 35, 42), especie = "Boleto"),
    PaymentCondition(id = "cond_28_35_42_49_56", descricao = "28/35/42/49/56 Dias", qtdParcelas = 5, parcelasDias = listOf(28, 35, 42, 49, 56), especie = "Boleto"),
    PaymentCondition(id = "cond_30_60", descricao = "30/60 Dias", qtdParcelas = 2, parcelasDias = listOf(30, 60), especie = "Boleto"),
    PaymentCondition(id = "cond_30_45_60", descricao = "30/45/60 Dias", qtdParcelas = 3, parcelasDias = listOf(30, 45, 60), especie = "Boleto"),
    PaymentCondition(id = "cond_30_40_50_60", descricao = "30/40/50/60 Dias", qtdParcelas = 4, parcelasDias = listOf(30, 40, 50, 60), especie = "Boleto"),
    PaymentCondition(id = "cond_30_45_60_75_90", descricao = "30/45/60/75/90 Dias", qtdParcelas = 5, parcelasDias = listOf(30, 45, 60, 75, 90), especie = "Boleto"),
    PaymentCondition(id = "cond_30_40_50_60_70_80_90", descricao = "30/40/50/60/70/80/90 Dias", qtdParcelas = 7, parcelasDias = listOf(30, 40, 50, 60, 70, 80, 90), especie = "Boleto"),
    PaymentCondition(id = "cond_30_60_90_120", descricao = "30/60/90/120 Dias", qtdParcelas = 4, parcelasDias = listOf(30, 60, 90, 120), especie = "Boleto"),
    PaymentCondition(id = "cond_30_45_60_75_90_105_120", descricao = "30/45/60/75/90/105/120 Dias", qtdParcelas = 7, parcelasDias = listOf(30, 45, 60, 75, 90, 105, 120), especie = "Boleto"),
    PaymentCondition(id = "cond_30_60_90_120_150", descricao = "30/60/90/120/150 Dias", qtdParcelas = 5, parcelasDias = listOf(30, 60, 90, 120, 150), especie = "Boleto"),
    PaymentCondition(id = "cond_45_60_75_90", descricao = "45/60/75/90 Dias", qtdParcelas = 4, parcelasDias = listOf(45, 60, 75, 90), especie = "Boleto"),
    PaymentCondition(id = "cond_45_60_75_90_105_120", descricao = "45/60/75/90/105/120 Dias", qtdParcelas = 6, parcelasDias = listOf(45, 60, 75, 90, 105, 120), especie = "Boleto"),
    PaymentCondition(id = "cond_30", descricao = "30 Dias (1x)", qtdParcelas = 1, parcelasDias = listOf(30), especie = "Boleto"),
    PaymentCondition(id = "cond_vista", descricao = "100% À Vista (TED/PIX)", qtdParcelas = 1, parcelasDias = listOf(0), especie = "Depósito")
)

