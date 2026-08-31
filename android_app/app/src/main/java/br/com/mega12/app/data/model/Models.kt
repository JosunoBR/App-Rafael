package br.com.mega12.app.data.model

import com.google.gson.annotations.SerializedName

// --- IDENTIDADE VISUAL & ACESSO (RBAC) ---

data class User(
    @SerializedName("id") val id: String = "",
    @SerializedName("nome") val nome: String = "",
    @SerializedName("email") val email: String = "",
    @SerializedName("role") val role: String = "", // 'diretoria' | 'comprador' | 'conferente' | 'motorista'
    @SerializedName("cargo") val cargo: String? = null,
    @SerializedName("telefone") val telefone: String? = null,
    @SerializedName("ativo") val ativo: Int = 1,
    @SerializedName("token") val token: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
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

// --- CONFIGURAÇÕES DA REDE ---

data class StoreConfig(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("cluster") val cluster: String, // "A" | "B" | "C"
    @SerializedName("defaultWeight") val defaultWeight: Double,
    @SerializedName("active") val active: Boolean = true
)

data class FiscalConfig(
    @SerializedName("icmsAliquota") val icmsAliquota: Double = 0.11,
    @SerializedName("ipiAliquota") val ipiAliquota: Double = 0.00,
    @SerializedName("pisCofinsAliquota") val pisCofinsAliquota: Double = 0.03,
    @SerializedName("custosFixos") val custosFixos: Double = 0.26,
    @SerializedName("creditoEntradaICMS") val creditoEntradaICMS: Double = 0.195
)

// --- CADASTROS BASE ---

data class Product(
    @SerializedName("id") val id: String = "",
    @SerializedName("codigo") val codigo: String = "",
    @SerializedName("descricao") val descricao: String = "",
    @SerializedName("categoria") val categoria: String? = null,
    @SerializedName("fotoUrl") val fotoUrl: String? = null,
    @SerializedName("qtdPorPacote") val qtdPorPacote: Int = 12,
    @SerializedName("precoUnitarioPadrao") val precoUnitarioPadrao: Double = 0.0,
    @SerializedName("pdvSugerido") val pdvSugerido: Double = 0.0,
    @SerializedName("ncm") val ncm: String? = null,
    @SerializedName("eanBarcode") val eanBarcode: String? = null,
    @SerializedName("supplierId") val supplierId: String? = null,
    @SerializedName("nomeFornecedor") val nomeFornecedor: String? = null,
    @SerializedName("ativo") val ativo: Boolean = true,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

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
    @SerializedName("percentualNotaPadrao") val percentualNotaPadrao: Double = 100.0,
    @SerializedName("observacoesDescarga") val observacoesDescarga: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

// --- OPERAÇÃO DE COMPRAS ---

data class OrderHeader(
    @SerializedName("id") val id: String = "",
    @SerializedName("numeroPedido") val numeroPedido: String = "",
    @SerializedName("fornecedor") val fornecedor: String = "",
    @SerializedName("supplierId") val supplierId: String? = null,
    @SerializedName("aliquotaSt") val aliquotaSt: Double = 0.0,
    @SerializedName("vendedor") val vendedor: String = "",
    @SerializedName("contatoVendedor") val contatoVendedor: String? = null,
    @SerializedName("condicaoPagamento") val condicaoPagamento: String = "",
    @SerializedName("dataPedido") val dataPedido: String = "",
    @SerializedName("dataEntregaPrevista") val dataEntregaPrevista: String = "",
    @SerializedName("percentualDescontoOff") val percentualDescontoOff: Double = 0.0,
    @SerializedName("percentualNota") val percentualNota: Double? = 100.0,
    @SerializedName("observacoesDescarga") val observacoesDescarga: String? = null,
    @SerializedName("valorFreteGlobal") val valorFreteGlobal: Double = 0.0,
    @SerializedName("valorOutrasDespesasGlobal") val valorOutrasDespesasGlobal: Double = 0.0,
    @SerializedName("status") val status: String = "Rascunho", // 'Rascunho' | 'Em Cotação' | 'Aprovado' | 'Em Separação' | 'Finalizado'
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

data class OrderItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("codigo") val codigo: String? = null,
    @SerializedName("descricao") val descricao: String = "",
    @SerializedName("fotoUrl") val photoUrl: String? = null,
    @SerializedName("qtdPorPacote") val qtdPorPacote: Int = 12,
    @SerializedName("qtdPacotes") val qtdPacotes: Int = 0,
    @SerializedName("qtdTotalUnidades") val qtdTotalUnidades: Int = 0,
    @SerializedName("precoUnitario") val precoUnitario: Double = 0.0,
    @SerializedName("valorTotalBruto") val valorTotalBruto: Double = 0.0,
    @SerializedName("pdvAlvo") val pdvAlvo: Double = 0.0,
    @SerializedName("custoRealEfetivo") val custoRealEfetivo: Double? = null,
    @SerializedName("margemPercentual") val margemPercentual: Double? = null,
    @SerializedName("separacaoLojas") val separacaoLojas: Map<String, Int> = emptyMap(),
    @SerializedName("separacaoManual") val separacaoManual: Boolean = false,
    @SerializedName("qtdReservaEstoque") val qtdReservaEstoque: Int = 0
)

data class PaymentInstallment(
    @SerializedName("id") val id: String = "",
    @SerializedName("orderId") val orderId: String? = null,
    @SerializedName("numeroPedido") val numeroPedido: String? = null,
    @SerializedName("fornecedor") val fornecedor: String? = null,
    @SerializedName("numeroParcela") val numeroParcela: Int = 1,
    @SerializedName("totalParcelas") val totalParcelas: Int = 1,
    @SerializedName("dataVencimento") val dataVencimento: String = "",
    @SerializedName("valor") val valor: Double = 0.0,
    @SerializedName("valorOriginal") val valorOriginal: Double? = null,
    @SerializedName("status") val status: String = "A Vencer", // 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago'
    @SerializedName("dataPagamento") val dataPagamento: String? = null,
    @SerializedName("observacao") val observacao: String? = null,
    @SerializedName("documentoRef") val documentoRef: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

// --- INSPEÇÃO & AVARIAS ---

data class AvariaItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("itemId") val itemId: String = "",
    @SerializedName("item_codigo") val itemCodigo: String? = null,
    @SerializedName("item_descricao") val itemDescricao: String? = null,
    @SerializedName("store_id") val storeId: String = "",
    @SerializedName("store_name") val storeName: String? = null,
    @SerializedName("quantidade") val quantidade: Int = 0,
    @SerializedName("motivo") val motivo: String = "",
    @SerializedName("timestamp") val timestamp: String = ""
)

data class OrderInspection(
    @SerializedName("conferente") val conferente: String? = null,
    @SerializedName("dataConferencia") val dataConferencia: String? = null,
    @SerializedName("possuiAvarias") val possuiAvarias: Boolean = false,
    @SerializedName("avarias") val avarias: List<AvariaItem> = emptyList()
)

// --- OBJETO RAIZ DO PEDIDO ---

data class PurchaseOrder(
    @SerializedName("id") val id: String = "",
    @SerializedName("header") val header: OrderHeader = OrderHeader(),
    @SerializedName("items") val items: List<OrderItem> = emptyList(),
    @SerializedName("fiscalConfig") val fiscalConfig: FiscalConfig? = null,
    @SerializedName("storeConfigs") val storeConfigs: List<StoreConfig>? = null,
    @SerializedName("inspection") val inspection: OrderInspection? = null,
    @SerializedName("installments") val installments: List<PaymentInstallment> = emptyList(),
    
    // Campos legados para compatibilidade com UI Android (Espelhados no header)
    @SerializedName("status") val status: String = "Rascunho",
    @SerializedName("separation_status") val separationStatus: String = "Pendente",
    @SerializedName("total_liquido") val totalLiquido: Double = 0.0,
    @SerializedName("total_pecas") val totalPecas: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
) {
    // Fallback de cálculos caso o banco retorne zero
    val effectiveTotalLiquido: Double
        get() {
            if (totalLiquido > 0) return totalLiquido
            val bruto = items.sumOf { it.valorTotalBruto }
            val desc = (bruto * header.percentualDescontoOff) / 100.0
            val st = ((bruto - desc) * header.aliquotaSt) / 100.0
            return bruto - desc + st + header.valorFreteGlobal
        }

    val effectiveTotalPecas: Int
        get() = if (totalPecas > 0) totalPecas else items.sumOf { it.qtdTotalUnidades }
}
