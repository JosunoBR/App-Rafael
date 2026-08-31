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
    val categoria: String = "",
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
    @SerializedName("precoUnitario", alternate = ["precoCompraUnitario"])
    val precoCompraUnitario: Double = 0.0,
    val pdvAlvo: Double = 12.0,
    @SerializedName("valorTotalBruto", alternate = ["subtotal"])
    val subtotal: Double = 0.0,
    @SerializedName("margemPercentual", alternate = ["margemCalculada"])
    val margemCalculada: Double = 0.0,
    val statusMargem: String = "boa",
    @SerializedName("fotoUrl", alternate = ["photoUrl"])
    val photoUrl: String? = null,
    @SerializedName("separacaoLojas", alternate = ["storeDistribution"])
    val storeDistribution: Map<String, Int> = emptyMap(),
    val qtdPorCaixa: Int = 1
)

// Cabeçalho do Pedido
data class OrderHeader(
    val numeroPedido: String = "",
    val fornecedor: String = "",
    val supplierId: String? = null,
    val vendedor: String? = null,
    val contatoVendedor: String? = null,
    val condicaoPagamento: String? = null,
    val dataEmissao: String? = null,
    val dataEntregaPrevista: String? = null,
    val percentualDescontoOff: Double = 0.0,
    val percentualNota: Double = 100.0,
    val aliquotaSt: Double = 0.0,
    val observacoes: String? = null
)

// Pedido Completo
data class PurchaseOrder(
    val id: String = "",
    val header: OrderHeader = OrderHeader(),
    val items: List<OrderItem> = emptyList(),
    val status: String = "Em Cotação",
    val separationStatus: String = "Pendente",
    val totalLiquido: Double = 0.0,
    val totalPecas: Int = 0,
    val createdAt: String? = null
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
