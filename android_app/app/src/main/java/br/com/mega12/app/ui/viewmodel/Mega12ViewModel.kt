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

            val role = _currentUser.value?.role?.lowercase()
            if (role == "separacao" || role == "conferente") {
                repository.getOrders().onSuccess { orders ->
                    _orders.value = orders.filter { it.status == "Em Separação" }
                }
                _isLoading.value = false
                return@launch
            }

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

    fun refreshSeparationOrdersSilently() {
        viewModelScope.launch {
            repository.getOrders().onSuccess { orders ->
                _orders.value = orders.filter { it.status == "Em Separação" }
            }
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

    fun toggleSeparationCheck(orderId: String, storeId: String, itemId: String, conferido: Boolean) {
        viewModelScope.launch {
            val order = _orders.value.find { it.id == orderId || it.finalId == orderId } ?: return@launch
            val checkKey = "${storeId}_$itemId"
            val currentChecks = order.inspection?.conferenciaLojas ?: emptyMap()
            val oldCheck = currentChecks[checkKey]
            val expectedVersion = order.version

            // 1. Atualização Otimista Imediata
            val optimisticChecks = currentChecks.toMutableMap()
            if (conferido) {
                optimisticChecks[checkKey] = StoreItemCheck(
                    conferido = true,
                    conferenteId = _currentUser.value?.id ?: "usr_app",
                    conferenteNome = _currentUser.value?.nome ?: "Conferente",
                    dataHora = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())
                )
            } else {
                optimisticChecks.remove(checkKey)
            }

            val updatedOrder = order.copy(
                inspection = (order.inspection ?: OrderInspection()).copy(
                    conferenciaLojas = optimisticChecks
                )
            )

            val currentList = _orders.value.toMutableList()
            val idx = currentList.indexOfFirst { it.id == order.id || it.finalId == order.finalId }
            if (idx != -1) {
                currentList[idx] = updatedOrder
                _orders.value = currentList
            }

            // 2. Chamada Atômica à API
            val result = repository.updateSeparationCheck(
                orderId = order.id.ifBlank { order.finalId },
                storeId = storeId,
                itemId = itemId,
                conferido = conferido,
                expectedVersion = expectedVersion
            )

            result.onSuccess { response ->
                // Aplica a nova versão confirmada pelo servidor
                val confirmedList = _orders.value.toMutableList()
                val orderIdx = confirmedList.indexOfFirst { it.id == order.id || it.finalId == order.finalId }
                if (orderIdx != -1) {
                    val finalChecks = (confirmedList[orderIdx].inspection?.conferenciaLojas ?: emptyMap()).toMutableMap()
                    if (response.check.conferido) {
                        finalChecks[checkKey] = response.check
                    } else {
                        finalChecks.remove(checkKey)
                    }
                    confirmedList[orderIdx] = confirmedList[orderIdx].copy(
                        version = response.version,
                        inspection = (confirmedList[orderIdx].inspection ?: OrderInspection()).copy(
                            conferenciaLojas = finalChecks
                        )
                    )
                    _orders.value = confirmedList
                }
            }.onFailure { err ->
                // Rollback otimista em caso de erro
                val rollbackList = _orders.value.toMutableList()
                val rollIdx = rollbackList.indexOfFirst { it.id == order.id || it.finalId == order.finalId }
                if (rollIdx != -1) {
                    val rollChecks = (rollbackList[rollIdx].inspection?.conferenciaLojas ?: emptyMap()).toMutableMap()
                    if (oldCheck != null) rollChecks[checkKey] = oldCheck else rollChecks.remove(checkKey)
                    rollbackList[rollIdx] = rollbackList[rollIdx].copy(
                        inspection = (rollbackList[rollIdx].inspection ?: OrderInspection()).copy(
                            conferenciaLojas = rollChecks
                        )
                    )
                    _orders.value = rollbackList
                }

                if (err is ConcurrencyConflictException) {
                    refreshSeparationOrdersSilently()
                } else {
                    _errorMessage.value = err.message ?: "Erro ao atualizar conferência"
                }
            }
        }
    }

    fun addSeparationDamage(
        orderId: String,
        itemId: String,
        storeId: String,
        quantidade: Int,
        unidadeMedida: String = "UN",
        motivo: String,
        observacao: String? = null,
        onSuccess: (() -> Unit)? = null
    ) {
        viewModelScope.launch {
            val order = _orders.value.find { it.id == orderId || it.finalId == orderId } ?: return@launch
            val expectedVersion = order.version

            val req = DamageCreateRequest(
                itemId = itemId,
                storeId = storeId,
                quantidade = quantidade,
                unidadeMedida = unidadeMedida,
                motivo = motivo,
                observacao = observacao,
                expectedVersion = expectedVersion
            )

            val result = repository.addSeparationDamage(order.id.ifBlank { order.finalId }, req)
            result.onSuccess { res ->
                val currentList = _orders.value.toMutableList()
                val idx = currentList.indexOfFirst { it.id == order.id || it.finalId == order.finalId }
                if (idx != -1 && res.damage != null) {
                    val currentAvarias = (currentList[idx].inspection?.avarias ?: emptyList()) + res.damage
                    currentList[idx] = currentList[idx].copy(
                        version = res.version,
                        inspection = (currentList[idx].inspection ?: OrderInspection()).copy(
                            possuiAvarias = true,
                            avarias = currentAvarias
                        )
                    )
                    _orders.value = currentList
                }
                _successMessage.value = "Avaria registrada com sucesso!"
                onSuccess?.invoke()
            }.onFailure { err ->
                if (err is ConcurrencyConflictException) {
                    refreshSeparationOrdersSilently()
                } else {
                    _errorMessage.value = err.message ?: "Erro ao registrar avaria"
                }
            }
        }
    }

    fun deleteSeparationDamage(orderId: String, damageId: String, onSuccess: (() -> Unit)? = null) {
        viewModelScope.launch {
            val order = _orders.value.find { it.id == orderId || it.finalId == orderId } ?: return@launch
            val expectedVersion = order.version

            val result = repository.deleteSeparationDamage(order.id.ifBlank { order.finalId }, damageId, expectedVersion)
            result.onSuccess {
                val currentList = _orders.value.toMutableList()
                val idx = currentList.indexOfFirst { it.id == order.id || it.finalId == order.finalId }
                if (idx != -1) {
                    val currentAvarias = (currentList[idx].inspection?.avarias ?: emptyList()).filterNot { it.id == damageId }
                    currentList[idx] = currentList[idx].copy(
                        version = (currentList[idx].version ?: 1) + 1,
                        inspection = (currentList[idx].inspection ?: OrderInspection()).copy(
                            possuiAvarias = currentAvarias.isNotEmpty(),
                            avarias = currentAvarias
                        )
                    )
                    _orders.value = currentList
                }
                _successMessage.value = "Avaria excluída com sucesso!"
                onSuccess?.invoke()
            }.onFailure { err ->
                if (err is ConcurrencyConflictException) {
                    refreshSeparationOrdersSilently()
                } else {
                    _errorMessage.value = err.message ?: "Erro ao excluir avaria"
                }
            }
        }
    }

    fun sendOrderToFaturamento(orderId: String, onSuccess: (() -> Unit)? = null) {
        viewModelScope.launch {
            val order = _orders.value.find { it.id == orderId || it.finalId == orderId } ?: return@launch
            val expectedVersion = order.version

            _isLoading.value = true
            val result = repository.sendToFaturamento(order.id.ifBlank { order.finalId }, expectedVersion)
            _isLoading.value = false

            result.onSuccess { res ->
                _successMessage.value = res.message ?: "Pedido encaminhado para Faturamento!"
                refreshData()
                onSuccess?.invoke()
            }.onFailure { err ->
                if (err is ConcurrencyConflictException) {
                    refreshSeparationOrdersSilently()
                } else {
                    _errorMessage.value = err.message ?: "Erro ao encaminhar para faturamento"
                }
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
