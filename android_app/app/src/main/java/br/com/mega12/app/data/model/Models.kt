package br.com.mega12.app.data.model

import com.google.gson.annotations.SerializedName

// Usuário & Autenticação
data class User(
    @SerializedName("id") val id: String = "",
    @SerializedName("nome") val nome: String = "",
    @SerializedName("email") val email: String = "",
    @SerializedName("role") val role: String = "",
    @SerializedName("cargo") val cargo: String? = null,
    @SerializedName("telefone") val telefone: String? = null,
    @SerializedName("token") val token: String? = null
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("senha") val senha: String
)

data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String?,
    @SerializedName("user") val user: User?,
    @SerializedName("message") val message: String?
)

// Configuração de Lojas
data class StoreConfig(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("cluster") val cluster: String, // "A", "B" ou "C"
    @SerializedName("defaultWeight") val defaultWeight: Double,
    @SerializedName("active") val active: Boolean = true
)

// Parâmetros Fiscais
data class FiscalConfig(
    @SerializedName("icmsAliquota") val icmsAliquota: Double = 0.11,
    @SerializedName("ipiAliquota") val ipiAliquota: Double = 0.00,
    @SerializedName("pisCofinsAliquota") val pisCofinsAliquota: Double = 0.03,
    @SerializedName("custosFixos") val custosFixos: Double = 0.26,
    @SerializedName("creditoEntradaICMS") val creditoEntradaICMS: Double = 0.195
)

// Produto
data class Product(
    @SerializedName("id") val id: String = "",
    @SerializedName("codigo") val codigo: String = "",
    @SerializedName("descricao") val descricao: String = "",
    @SerializedName("categoria") val categoria: String = "",
    @SerializedName("subcategoria") val subcategoria: String? = null,
    @SerializedName("fornecedorPadraoId") val fornecedorPadraoId: String? = null,
    @SerializedName("fornecedorPadraoNome") val fornecedorPadraoNome: String? = null,
    @SerializedName("precoUnitarioPadrao") val precoUnitarioPadrao: Double = 0.0,
    @SerializedName("pdvSugerido") val pdvSugerido: Double = 0.0,
    @SerializedName("qtdPorPacote") val qtdPorPacote: Int = 12,
    @SerializedName("fotoUrl") val fotoUrl: String? = null,
    @SerializedName("ncm") val ncm: String? = null,
    @SerializedName("eanBarcode") val eanBarcode: String? = null,
    @SerializedName("ativo") val ativo: Int = 1
)

// Fornecedor
data class Supplier(
    @SerializedName("id") val id: String = "",
    @SerializedName("razaoSocial") val razaoSocial: String = "",
    @SerializedName("nomeFantasia") val nomeFantasia: String? = null,
    @SerializedName("cnpj") val cnpj: String? = null,
    @SerializedName("vendedorPadrao") val vendedorPadrao: String? = null,
    @SerializedName("contatoVendedor") val contatoVendedor: String? = null,
    @SerializedName("condicaoPagamentoPadrao") val condicaoPagamentoPadrao: String? = null,
    @SerializedName("aliquotaStPadrao") val aliquotaStPadrao: Double = 0.0,
    @SerializedName("aliquotaIpiPadrao") val aliquotaIpiPadrao: Double = 0.0,
    @SerializedName("descontoOffPadrao") val descontoOffPadrao: Double = 0.0,
    @SerializedName("observacoesDescarga") val observacoesDescarga: String? = null
)

// Item do Pedido (Alinhado com Web/Backend JSON)
data class OrderItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("codigo") val codigo: String = "",
    @SerializedName("descricao") val descricao: String = "",
    @SerializedName("qtdPacotes") val caixas: Int = 0,
    @SerializedName("qtdPorPacote") val qtdPorCaixa: Int = 12,
    @SerializedName("qtdTotalUnidades") val totalPecas: Int = 0,
    @SerializedName("precoUnitario") val precoCompraUnitario: Double = 0.0,
    @SerializedName("pdvAlvo") val pdvAlvo: Double = 0.0,
    @SerializedName("custoRealEfetivo") val custoRealEfetivo: Double? = null,
    @SerializedName("valorTotalBruto") val subtotal: Double = 0.0,
    @SerializedName("margemPercentual") val margemCalculada: Double = 0.0,
    @SerializedName("statusMargem") val statusMargem: String = "boa",
    @SerializedName("photoUrl") val photoUrl: String? = null,
    @SerializedName("separacaoLojas") val storeDistribution: Map<String, Int> = emptyMap()
)

// Cabeçalho do Pedido
data class OrderHeader(
    @SerializedName("id") val id: String? = null,
    @SerializedName("numeroPedido") val numeroPedido: String = "",
    @SerializedName("fornecedor") val fornecedor: String = "",
    @SerializedName("supplierId") val supplierId: String? = null,
    @SerializedName("vendedor") val vendedor: String? = null,
    @SerializedName("contatoVendedor") val contatoVendedor: String? = null,
    @SerializedName("condicaoPagamento") val condicaoPagamento: String? = null,
    @SerializedName("dataEmissao") val dataEmissao: String? = null,
    @SerializedName("dataEntregaPrevista") val dataEntregaPrevista: String? = null,
    @SerializedName("percentualDescontoOff") val percentualDescontoOff: Double = 0.0,
    @SerializedName("percentualNota") val percentualNota: Double = 100.0,
    @SerializedName("aliquotaSt") val aliquotaSt: Double = 0.0,
    @SerializedName("observacoes") val observacoes: String? = null
)

// Parcelas de Pagamento
data class PaymentInstallment(
    @SerializedName("id") val id: String = "",
    @SerializedName("orderId") val orderId: String = "",
    @SerializedName("numeroParcela") val numeroParcela: Int = 1,
    @SerializedName("valor") val valor: Double = 0.0,
    @SerializedName("dataVencimento") val dataVencimento: String = "",
    @SerializedName("status") val status: String = "Pendente", // "Pendente", "Pago", "Atrasado"
    @SerializedName("dataPagamento") val dataPagamento: String? = null,
    @SerializedName("observacao") val observacao: String? = null,
    @SerializedName("documentoRef") val documentoRef: String? = null
)

// Pedido Completo
data class PurchaseOrder(
    @SerializedName("id") val id: String = "",
    @SerializedName("header") val header: OrderHeader = OrderHeader(),
    @SerializedName("items") val items: List<OrderItem> = emptyList(),
    @SerializedName("installments") val installments: List<PaymentInstallment> = emptyList(),
    @SerializedName("status") val status: String = "Em Cotação",
    @SerializedName("separationStatus") val separationStatus: String = "Pendente",
    @SerializedName("totalLiquido") val totalLiquido: Double = 0.0,
    @SerializedName("totalPecas") val totalPecas: Int = 0,
    @SerializedName("createdAt") val createdAt: String? = null
)

// Lançamento de Avaria
data class AvariaItem(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("itemCodigo") val itemCodigo: String,
    @SerializedName("itemDescricao") val itemDescricao: String,
    @SerializedName("quantidade") val quantidade: Int,
    @SerializedName("motivo") val motivo: String,
    @SerializedName("timestamp") val timestamp: String
)
