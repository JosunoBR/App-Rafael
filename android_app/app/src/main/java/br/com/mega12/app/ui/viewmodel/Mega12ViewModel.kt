package br.com.mega12.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.mega12.app.Mega12Application
import br.com.mega12.app.data.model.*
import br.com.mega12.app.data.repository.Mega12Repository
import br.com.mega12.app.domain.FiscalCalculationResult
import br.com.mega12.app.domain.FiscalEngine
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.domain.SeparationResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class Mega12ViewModel : ViewModel() {

    private val repository = Mega12Repository(Mega12Application.instance.preferencesManager)
    val preferencesManager = Mega12Application.instance.preferencesManager

    // Estado do Usuário Autenticado
    private val _currentUser = MutableStateFlow<User?>(repository.getCurrentUser())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // Estado de Carregamento & Notificações
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    // Catálogo de Produtos e Fornecedores
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    private val _suppliers = MutableStateFlow<List<Supplier>>(emptyList())
    val suppliers: StateFlow<List<Supplier>> = _suppliers.asStateFlow()

    // Pedidos do Sistema
    private val _orders = MutableStateFlow<List<PurchaseOrder>>(emptyList())
    val orders: StateFlow<List<PurchaseOrder>> = _orders.asStateFlow()

    // Lançamentos Financeiros (Boletos - Somente Leitura)
    private val _installments = MutableStateFlow<List<PaymentInstallment>>(emptyList())
    val installments: StateFlow<List<PaymentInstallment>> = _installments.asStateFlow()

    // Condições de Pagamento Salvas
    private val _paymentConditions = MutableStateFlow<List<PaymentCondition>>(DEFAULT_PAYMENT_CONDITIONS)
    val paymentConditions: StateFlow<List<PaymentCondition>> = _paymentConditions.asStateFlow()

    // Configuração Fiscal
    private val _fiscalConfig = MutableStateFlow(FiscalEngine.DEFAULT_CONFIG)
    val fiscalConfig: StateFlow<FiscalConfig> = _fiscalConfig.asStateFlow()


    // Estado da Calculadora Rápida do Comprador
    private val _calcPrecoCompra = MutableStateFlow("")
    val calcPrecoCompra: StateFlow<String> = _calcPrecoCompra.asStateFlow()

    private val _calcPdvAlvo = MutableStateFlow("12.00")
    val calcPdvAlvo: StateFlow<String> = _calcPdvAlvo.asStateFlow()

    private val _calcCaixas = MutableStateFlow("10")
    val calcCaixas: StateFlow<String> = _calcCaixas.asStateFlow()

    private val _calcQtdPorCaixa = MutableStateFlow("12")
    val calcQtdPorCaixa: StateFlow<String> = _calcQtdPorCaixa.asStateFlow()

    // Resultados de Cálculo Dinâmico
    private val _fiscalResult = MutableStateFlow<FiscalCalculationResult?>(null)
    val fiscalResult: StateFlow<FiscalCalculationResult?> = _fiscalResult.asStateFlow()

    // Novo Pedido em Construção
    private val _currentDraftOrder = MutableStateFlow(PurchaseOrder())
    val currentDraftOrder: StateFlow<PurchaseOrder> = _currentDraftOrder.asStateFlow()

    // Tema do Aplicativo (Claro, Escuro ou Sistema)
    private val _themeMode = MutableStateFlow(preferencesManager.themeMode)
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    fun setThemeMode(mode: String) {
        preferencesManager.themeMode = mode
        _themeMode.value = mode
    }

    init {
        if (_currentUser.value != null) {
            refreshData()
        }
    }

    fun clearMessages() {
        _errorMessage.value = null
        _successMessage.value = null
    }

    fun login(email: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.login(email, pass)
            _isLoading.value = false
            result.onSuccess { user ->
                _currentUser.value = user
                refreshData()
                onSuccess()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Falha no login"
            }
        }
    }

    fun logout() {
        repository.logout()
        _currentUser.value = null
    }

    fun refreshData() {
        viewModelScope.launch {
            _isLoading.value = true

            // Carregar Configurações Fiscais
            val fiscalRes = repository.getFiscalConfig()
            fiscalRes.onSuccess { _fiscalConfig.value = it }

            // Carregar Produtos
            val prodRes = repository.getProducts()
            prodRes.onSuccess { _products.value = it }

            // Carregar Fornecedores
            val supRes = repository.getSuppliers()
            supRes.onSuccess { _suppliers.value = it }

            // Carregar Pedidos
            val orderRes = repository.getOrders()
            orderRes.onSuccess { _orders.value = it }

            // Carregar Lançamentos Financeiros (Boletos)
            val finRes = repository.getFinancialEntries()
            finRes.onSuccess { _installments.value = it }

            // Carregar Condições de Pagamento Salvas
            val condRes = repository.getPaymentConditions()
            condRes.onSuccess { 
                if (it.isNotEmpty()) {
                    _paymentConditions.value = it
                }
            }

            _isLoading.value = false
        }
    }

    fun updateOrderInspection(updatedOrder: PurchaseOrder, onComplete: ((Boolean) -> Unit)? = null) {
        viewModelScope.launch {
            val currentList = _orders.value.toMutableList()
            val index = currentList.indexOfFirst { it.id == updatedOrder.id }
            if (index != -1) {
                currentList[index] = updatedOrder
                _orders.value = currentList
            }
            val result = repository.saveOrder(updatedOrder)
            result.onSuccess {
                onComplete?.invoke(true)
            }.onFailure {
                _errorMessage.value = "Erro ao salvar conferência no servidor"
                onComplete?.invoke(false)
            }
        }
    }

    fun updateCalcInputs(
        precoCompraStr: String = _calcPrecoCompra.value,
        pdvAlvoStr: String = _calcPdvAlvo.value,
        caixasStr: String = _calcCaixas.value,
        qtdPorCaixaStr: String = _calcQtdPorCaixa.value
    ) {
        _calcPrecoCompra.value = precoCompraStr
        _calcPdvAlvo.value = pdvAlvoStr
        _calcCaixas.value = caixasStr
        _calcQtdPorCaixa.value = qtdPorCaixaStr

        val compra = precoCompraStr.toDoubleOrNull() ?: 0.0
        val pdv = pdvAlvoStr.toDoubleOrNull() ?: 0.0
        val caixas = caixasStr.toIntOrNull() ?: 0
        val qtdPorCaixa = qtdPorCaixaStr.toIntOrNull() ?: 12

        if (compra > 0.0 && pdv > 0.0) {
            _fiscalResult.value = FiscalEngine.calculateItemFiscal(
                precoCompra = compra,
                pdvAlvo = pdv,
                config = _fiscalConfig.value
            )
        } else {
            _fiscalResult.value = null
        }
    }

    fun addItemToDraftOrder(
        descricao: String,
        codigo: String = "",
        codigoInterno: String = "",
        codigoFornecedor: String? = null,
        totalUnidades: Int = 100,
        precoCompra: Double,
        pdvAlvo: Double = 12.00,
        ipiAliquota: Double = 0.0,
        percentualDesconto: Double = 0.0,
        qtdPorCaixa: Int = 12,
        photoUrl: String? = null
    ) {
        val finalCodInterno = codigoInterno.ifEmpty { codigo.ifEmpty { "PRD-${System.currentTimeMillis() % 10000}" } }
        val valorBruto = totalUnidades * precoCompra
        val valorDesc = valorBruto * (percentualDesconto / 100.0)
        val valorIpi = (valorBruto - valorDesc) * (ipiAliquota / 100.0)
        val subtotalLiquido = valorBruto - valorDesc + valorIpi
        val custoEfetivo = if (totalUnidades > 0) subtotalLiquido / totalUnidades else precoCompra

        val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, pdvAlvo, _fiscalConfig.value)
        val sep = SeparationEngine.calculateBoxesSeparation(totalUnidades, qtdPorCaixa)

        val newItem = OrderItem(
            id = UUID.randomUUID().toString(),
            codigoInterno = finalCodInterno,
            codigoFornecedor = codigoFornecedor,
            codigo = finalCodInterno,
            descricao = descricao,
            totalPecas = totalUnidades,
            precoCompraUnitario = precoCompra,
            pdvAlvo = pdvAlvo,
            subtotal = subtotalLiquido,
            ipiAliquota = ipiAliquota,
            percentualDesconto = percentualDesconto,
            custoRealEfetivo = custoEfetivo,
            margemCalculada = fiscal.margemPercentual,
            statusMargem = fiscal.statusMargem.name.lowercase(),
            photoUrl = photoUrl,
            storeDistribution = sep.allocations,
            qtdPorCaixa = qtdPorCaixa
        )

        val updatedItems = _currentDraftOrder.value.items + newItem
        val totalLiq = updatedItems.sumOf { it.subtotal }
        val totalPcs = updatedItems.sumOf { it.totalPecas }

        _currentDraftOrder.value = _currentDraftOrder.value.copy(
            items = updatedItems,
            totalLiquido = totalLiq,
            totalPecas = totalPcs
        )
    }

    fun removeItemFromDraftOrder(itemId: String) {
        val updatedItems = _currentDraftOrder.value.items.filterNot { it.id == itemId }
        val totalLiq = updatedItems.sumOf { it.subtotal }
        val totalPcs = updatedItems.sumOf { it.totalPecas }

        _currentDraftOrder.value = _currentDraftOrder.value.copy(
            items = updatedItems,
            totalLiquido = totalLiq,
            totalPecas = totalPcs
        )
    }

    fun updateDraftOrderItem(
        itemId: String,
        totalUnidades: Int,
        precoCompra: Double,
        pdvAlvo: Double = 12.00,
        ipiAliquota: Double = 0.0,
        percentualDesconto: Double = 0.0,
        qtdPorCaixa: Int = 12
    ) {
        val existing = _currentDraftOrder.value.items.find { it.id == itemId } ?: return
        val valorBruto = totalUnidades * precoCompra
        val valorDesc = valorBruto * (percentualDesconto / 100.0)
        val valorIpi = (valorBruto - valorDesc) * (ipiAliquota / 100.0)
        val subtotalLiquido = valorBruto - valorDesc + valorIpi
        val custoEfetivo = if (totalUnidades > 0) subtotalLiquido / totalUnidades else precoCompra

        val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, pdvAlvo, _fiscalConfig.value)
        val sep = SeparationEngine.calculateBoxesSeparation(totalUnidades, qtdPorCaixa)

        val updatedItem = existing.copy(
            totalPecas = totalUnidades,
            precoCompraUnitario = precoCompra,
            pdvAlvo = pdvAlvo,
            subtotal = subtotalLiquido,
            ipiAliquota = ipiAliquota,
            percentualDesconto = percentualDesconto,
            custoRealEfetivo = custoEfetivo,
            margemCalculada = fiscal.margemPercentual,
            statusMargem = fiscal.statusMargem.name.lowercase(),
            storeDistribution = sep.allocations,
            qtdPorCaixa = qtdPorCaixa
        )

        val updatedItems = _currentDraftOrder.value.items.map {
            if (it.id == itemId) updatedItem else it
        }
        val totalLiq = updatedItems.sumOf { it.subtotal }
        val totalPcs = updatedItems.sumOf { it.totalPecas }

        _currentDraftOrder.value = _currentDraftOrder.value.copy(
            items = updatedItems,
            totalLiquido = totalLiq,
            totalPecas = totalPcs
        )
    }

    fun adjustItemBoxesInDraftOrder(itemId: String, deltaBoxes: Int) {
        val item = _currentDraftOrder.value.items.find { it.id == itemId } ?: return
        val pcsPerBox = if (item.qtdPorCaixa > 0) item.qtdPorCaixa else 12
        val currentBoxes = (item.totalPecas / pcsPerBox).coerceAtLeast(1)
        val newBoxes = (currentBoxes + deltaBoxes).coerceAtLeast(1)
        val newTotalPcs = newBoxes * pcsPerBox

        updateDraftOrderItem(
            itemId = itemId,
            totalUnidades = newTotalPcs,
            precoCompra = item.precoCompraUnitario,
            pdvAlvo = item.pdvAlvo,
            ipiAliquota = item.ipiAliquota,
            percentualDesconto = item.percentualDesconto,
            qtdPorCaixa = pcsPerBox
        )
    }

    fun setFiscalConfig(newConfig: FiscalConfig) {
        _fiscalConfig.value = newConfig
        recalculateDraftOrderFiscal()
    }

    fun recalculateDraftOrderFiscal() {
        val currentItems = _currentDraftOrder.value.items
        val updatedItems = currentItems.map { item ->
            val custoEfetivo = if (item.totalPecas > 0) item.subtotal / item.totalPecas else item.precoCompraUnitario
            val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, item.pdvAlvo, _fiscalConfig.value)
            item.copy(
                custoRealEfetivo = custoEfetivo,
                margemCalculada = fiscal.margemPercentual,
                statusMargem = fiscal.statusMargem.name.lowercase()
            )
        }
        _currentDraftOrder.value = _currentDraftOrder.value.copy(
            items = updatedItems
        )
    }

    fun addCurrentCalcToDraftOrder(descricao: String = "Item Calculado em Viagem", codigo: String = ""): Boolean {
        val compra = _calcPrecoCompra.value.toDoubleOrNull() ?: 0.0
        val pdv = _calcPdvAlvo.value.toDoubleOrNull() ?: 0.0
        val caixas = _calcCaixas.value.toIntOrNull() ?: 10
        val qtdPorCaixa = _calcQtdPorCaixa.value.toIntOrNull() ?: 12

        if (compra <= 0.0 || pdv <= 0.0 || caixas <= 0) {
            _errorMessage.value = "Preencha preço de compra, PDV e caixas válidos"
            return false
        }

        val totalUnidades = caixas * qtdPorCaixa

        addItemToDraftOrder(
            descricao = descricao,
            codigo = codigo,
            totalUnidades = totalUnidades,
            precoCompra = compra,
            pdvAlvo = pdv
        )
        _successMessage.value = "Produto adicionado ao pedido em aberto!"
        return true
    }

    fun loadOrderForEdit(order: PurchaseOrder) {
        _currentDraftOrder.value = order
    }

    fun startNewDraftOrder() {
        _currentDraftOrder.value = PurchaseOrder()
    }

    fun saveDraftOrder(fornecedor: String, condicao: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            if (_currentDraftOrder.value.items.isEmpty()) {
                _errorMessage.value = "Adicione pelo menos um item ao pedido"
                return@launch
            }

            _isLoading.value = true
            val now = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val existing = _currentDraftOrder.value
            val isEditing = existing.id.isNotBlank() && existing.header.numeroPedido.isNotBlank()

            val finalId = if (isEditing) existing.id else UUID.randomUUID().toString()
            val orderNum = if (isEditing) existing.header.numeroPedido else "PED-${String.format("%04d", (_orders.value.size + 1))}"
            val existingStatus = if (isEditing && existing.status.isNotBlank()) existing.status else "Confirmado"
            val existingSepStatus = if (isEditing && existing.separationStatus.isNotBlank()) existing.separationStatus else "Pendente"

            val finalOrder = existing.copy(
                id = finalId,
                header = existing.header.copy(
                    id = finalId,
                    numeroPedido = orderNum,
                    fornecedor = fornecedor,
                    condicaoPagamento = condicao,
                    dataEmissao = existing.header.dataEmissao ?: now,
                    status = existingStatus,
                    totalLiquido = existing.totalLiquido,
                    totalPecas = existing.totalPecas
                ),
                status = existingStatus,
                separationStatus = existingSepStatus,
                createdAt = existing.createdAt ?: now
            )

            val res = repository.saveOrder(finalOrder)
            _isLoading.value = false

            res.onSuccess {
                _successMessage.value = if (isEditing) "Pedido $orderNum atualizado com sucesso!" else "Pedido $orderNum salvo com sucesso!"
                _currentDraftOrder.value = PurchaseOrder() // Limpar rascunho
                refreshData()
                onSuccess()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Erro ao salvar pedido"
            }
        }
    }
}
