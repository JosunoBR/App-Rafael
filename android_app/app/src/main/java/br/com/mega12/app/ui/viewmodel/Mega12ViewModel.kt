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

    // Todos os Boletos (Financeiro)
    private val _allInstallments = MutableStateFlow<List<PaymentInstallment>>(emptyList())
    val allInstallments: StateFlow<List<PaymentInstallment>> = _allInstallments.asStateFlow()

    // Lista de Usuários (Admin)
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    // Configuração Fiscal
    private val _fiscalConfig = MutableStateFlow(FiscalEngine.DEFAULT_CONFIG)
    val fiscalConfig: StateFlow<FiscalConfig> = _fiscalConfig.asStateFlow()

    // Estado da Calculadora Rápida do Comprador
    private val _calcPrecoCompra = MutableStateFlow("")
    val calcPrecoCompra: StateFlow<String> = _calcPrecoCompra.asStateFlow()

    // --- BI & Dashboard States ---
    data class DashboardMetrics(
        val totalInvestido: Double = 0.0,
        val faturamentoPdv: Double = 0.0,
        val lucroReal: Double = 0.0,
        val margemMedia: Double = 0.0,
        val totalPecas: Int = 0,
        val ticketMedio: Double = 0.0,
        val pedidosCount: Int = 0,
        val monthlyPurchases: Map<String, Double> = emptyMap() // "MM/YY" -> Total
    )

    private val _dashboardMetrics = MutableStateFlow(DashboardMetrics())
    val dashboardMetrics: StateFlow<DashboardMetrics> = _dashboardMetrics.asStateFlow()

    data class SupplierBargainDossier(
        val supplierName: String = "",
        val totalInvestido: Double = 0.0,
        val totalPecas: Int = 0,
        val pedidosCount: Int = 0,
        val ticketMedio: Double = 0.0,
        val margemMedia: Double = 0.0
    )

    private val _selectedSupplierDossier = MutableStateFlow<SupplierBargainDossier?>(null)
    val selectedSupplierDossier: StateFlow<SupplierBargainDossier?> = _selectedSupplierDossier.asStateFlow()
    // -----------------------------

    private val _calcPdvAlvo = MutableStateFlow("")
    val calcPdvAlvo: StateFlow<String> = _calcPdvAlvo.asStateFlow()

    private val _calcCaixas = MutableStateFlow("10")
    val calcCaixas: StateFlow<String> = _calcCaixas.asStateFlow()

    private val _calcQtdPorCaixa = MutableStateFlow("12")
    val calcQtdPorCaixa: StateFlow<String> = _calcQtdPorCaixa.asStateFlow()

    // Resultados de Cálculo Dinâmico
    private val _fiscalResult = MutableStateFlow<FiscalCalculationResult?>(null)
    val fiscalResult: StateFlow<FiscalCalculationResult?> = _fiscalResult.asStateFlow()

    private val _separationResult = MutableStateFlow<SeparationResult?>(null)
    val separationResult: StateFlow<SeparationResult?> = _separationResult.asStateFlow()

    // Novo Pedido em Construção
    private val _currentDraftOrder = MutableStateFlow(PurchaseOrder())
    val currentDraftOrder: StateFlow<PurchaseOrder> = _currentDraftOrder.asStateFlow()

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
            orderRes.onSuccess { 
                _orders.value = it
                _allInstallments.value = it.flatMap { o -> o.installments }
                calculateBI(it)
            }

            // Carregar Usuários se for Admin
            if (_currentUser.value?.role == "diretoria") {
                val usersRes = repository.getUsers()
                usersRes.onSuccess { _users.value = it }
            }

            _isLoading.value = false
        }
    }

    fun updateGlobalFiscal(newConfig: FiscalConfig) {
        viewModelScope.launch {
            _isLoading.value = true
            val res = repository.updateFiscalConfig(newConfig)
            _isLoading.value = false
            if (res.isSuccess) {
                _fiscalConfig.value = newConfig
                _successMessage.value = "Configurações fiscais atualizadas!"
            } else {
                _errorMessage.value = "Falha ao salvar configurações"
            }
        }
    }

    fun saveAvaria(storeId: String, storeName: String, item: OrderItem, qtd: Int, motivo: String) {
        viewModelScope.launch {
            val avaria = AvariaItem(
                storeId = storeId,
                storeName = storeName,
                itemId = item.id,
                itemCodigo = item.codigo,
                itemDescricao = item.descricao,
                quantidade = qtd,
                motivo = motivo,
                timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
            )
            _isLoading.value = true
            val res = repository.saveAvaria(avaria)
            _isLoading.value = false
            if (res.isSuccess) {
                _successMessage.value = "Avaria registrada e sincronizada!"
            } else {
                _errorMessage.value = "Avaria registrada localmente (erro sincronização)"
            }
        }
    }

    fun updateInstallment(id: String, status: String, dataPagamento: String? = null, obs: String? = null) {
        viewModelScope.launch {
            val updates = mutableMapOf<String, Any?>("status" to status)
            if (dataPagamento != null) updates["dataPagamento"] = dataPagamento
            if (obs != null) updates["observacao"] = obs
            
            _isLoading.value = true
            val res = repository.updateInstallment(id, updates)
            _isLoading.value = false
            if (res.isSuccess) {
                refreshData() // Recarregar para ver mudanças
                _successMessage.value = "Status do boleto atualizado!"
            }
        }
    }

    fun saveUser(user: User) {
        viewModelScope.launch {
            _isLoading.value = true
            val res = repository.saveUser(user)
            _isLoading.value = false
            if (res.isSuccess) {
                refreshData()
                _successMessage.value = "Usuário salvo com sucesso!"
            }
        }
    }

    fun deleteUser(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val res = repository.deleteUser(userId)
            _isLoading.value = false
            if (res.isSuccess) {
                refreshData()
                _successMessage.value = "Usuário removido!"
            }
        }
    }

    private fun calculateBI(orderList: List<PurchaseOrder>) {
        if (orderList.isEmpty()) return

        var totalInv = 0.0
        var totalFat = 0.0
        var totalLucro = 0.0
        var totalPcs = 0
        val monthlyMap = mutableMapOf<String, Double>()

        orderList.forEach { order ->
            // Agrupar por Mês/Ano (Fallback: dataPedido -> createdAt)
            val dateStr = order.header.dataPedido.ifEmpty { order.createdAt ?: "" }
            if (dateStr.length >= 7) {
                val monthYear = if (dateStr.contains("-")) {
                    // Formato YYYY-MM-DD
                    dateStr.substring(5, 7) + "/" + dateStr.substring(2, 4)
                } else {
                    "??/??"
                }
                
                val investPedido = order.effectiveTotalLiquido
                monthlyMap[monthYear] = (monthlyMap[monthYear] ?: 0.0) + investPedido
                totalInv += investPedido
            } else {
                // Mesmo sem data, somar no total geral de investimento
                totalInv += order.effectiveTotalLiquido
            }

            order.items.forEach { item ->
                val fatItem = item.qtdTotalUnidades * item.pdvAlvo
                val lucroItem = fatItem - (item.qtdTotalUnidades * (item.custoRealEfetivo ?: item.precoUnitario))
                
                totalFat += fatItem
                totalLucro += lucroItem
                totalPcs += item.qtdTotalUnidades
            }
            
            // Abatimento da ST Global do Lucro Real do Pedido
            val brutoTotal = order.items.sumOf { it.valorTotalBruto }
            val descTotal = (brutoTotal * order.header.percentualDescontoOff) / 100.0
            val stTotal = ((brutoTotal - descTotal) * order.header.aliquotaSt) / 100.0
            totalLucro -= stTotal
        }

        _dashboardMetrics.value = DashboardMetrics(
            totalInvestido = totalInv,
            faturamentoPdv = totalFat,
            lucroReal = totalLucro,
            margemMedia = if (totalFat > 0) (totalLucro / totalFat) * 100 else 0.0,
            totalPecas = totalPcs,
            ticketMedio = if (orderList.isNotEmpty()) totalInv / orderList.size else 0.0,
            pedidosCount = orderList.size,
            monthlyPurchases = monthlyMap.toSortedMap()
        )
    }

    fun selectSupplierForBargain(supplierName: String) {
        val supplierOrders = _orders.value.filter { 
            it.header.fornecedor.equals(supplierName, ignoreCase = true) 
        }

        if (supplierOrders.isEmpty()) {
            _selectedSupplierDossier.value = null
            return
        }

        var totalInv = 0.0
        var totalPcs = 0
        var totalFat = 0.0
        var totalLucro = 0.0

        supplierOrders.forEach { order ->
            val brutoPedido = order.items.sumOf { it.valorTotalBruto }
            val desconto = (brutoPedido * order.header.percentualDescontoOff) / 100.0
            val stVal = ((brutoPedido - desconto) * order.header.aliquotaSt) / 100.0
            
            totalInv += (brutoPedido - desconto + stVal + order.header.valorFreteGlobal)
            totalPcs += order.items.sumOf { it.qtdTotalUnidades }

            order.items.forEach { item ->
                val fat = item.qtdTotalUnidades * item.pdvAlvo
                totalFat += fat
                totalLucro += fat - (item.qtdTotalUnidades * (item.custoRealEfetivo ?: item.precoUnitario))
            }
            totalLucro -= stVal
        }

        _selectedSupplierDossier.value = SupplierBargainDossier(
            supplierName = supplierName,
            totalInvestido = totalInv,
            totalPecas = totalPcs,
            pedidosCount = supplierOrders.size,
            ticketMedio = totalInv / supplierOrders.size,
            margemMedia = if (totalFat > 0) (totalLucro / totalFat) * 100 else 0.0
        )
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

        if (caixas > 0) {
            _separationResult.value = SeparationEngine.calculateBoxesSeparation(
                totalBoxes = caixas,
                packSize = qtdPorCaixa
            )
        } else {
            _separationResult.value = null
        }
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

        addItemToDraftOrder(
            descricao = descricao,
            codigo = codigo,
            caixas = caixas,
            qtdPorCaixa = qtdPorCaixa,
            precoCompra = compra,
            pdvAlvo = pdv
        )
        _successMessage.value = "Produto adicionado ao pedido em aberto!"
        return true
    }

    fun addItemToDraftOrder(
        descricao: String,
        codigo: String,
        caixas: Int,
        qtdPorCaixa: Int,
        precoCompra: Double,
        pdvAlvo: Double,
        photoUrl: String? = null
    ) {
        val totalPecas = caixas * qtdPorCaixa
        val subtotal = totalPecas * precoCompra
        val fiscal = FiscalEngine.calculateItemFiscal(precoCompra, pdvAlvo, _fiscalConfig.value)
        val sep = SeparationEngine.calculateBoxesSeparation(caixas, qtdPorCaixa)

        val newItem = OrderItem(
            id = UUID.randomUUID().toString(),
            codigo = codigo.ifEmpty { "PRD-${System.currentTimeMillis() % 10000}" },
            descricao = descricao,
            qtdPacotes = caixas,
            qtdPorPacote = qtdPorCaixa,
            qtdTotalUnidades = totalPecas,
            precoUnitario = precoCompra,
            pdvAlvo = pdvAlvo,
            valorTotalBruto = subtotal,
            margemPercentual = fiscal.margemPercentual,
            custoRealEfetivo = fiscal.custoRealEfetivo,
            photoUrl = photoUrl,
            separacaoLojas = sep.allocationsBoxes
        )

        val updatedItems = _currentDraftOrder.value.items + newItem
        
        _currentDraftOrder.value = _currentDraftOrder.value.copy(
            items = updatedItems
        )
    }

    fun updateItemSeparation(index: Int, newAllocations: Map<String, Int>) {
        val currentItems = _currentDraftOrder.value.items.toMutableList()
        if (index in currentItems.indices) {
            val item = currentItems[index]
            currentItems[index] = item.copy(separacaoLojas = newAllocations)
            _currentDraftOrder.value = _currentDraftOrder.value.copy(items = currentItems)
        }
    }

    fun updateItemFiscal(index: Int, precoCompra: Double, pdvAlvo: Double) {
        val currentItems = _currentDraftOrder.value.items.toMutableList()
        if (index in currentItems.indices) {
            val item = currentItems[index]
            val fiscal = FiscalEngine.calculateItemFiscal(precoCompra, pdvAlvo, _fiscalConfig.value)
            currentItems[index] = item.copy(
                precoUnitario = precoCompra,
                pdvAlvo = pdvAlvo,
                valorTotalBruto = item.qtdTotalUnidades * precoCompra,
                margemPercentual = fiscal.margemPercentual,
                custoRealEfetivo = fiscal.custoRealEfetivo
            )
            val updatedItems = currentItems.toList()
            _currentDraftOrder.value = _currentDraftOrder.value.copy(
                items = updatedItems
            )
        }
    }

    fun removeItemFromDraft(index: Int) {
        val currentItems = _currentDraftOrder.value.items.toMutableList()
        if (index in currentItems.indices) {
            currentItems.removeAt(index)
            val updatedItems = currentItems.toList()
            _currentDraftOrder.value = _currentDraftOrder.value.copy(
                items = updatedItems
            )
        }
    }

    fun saveDraftOrder(fornecedor: String, condicao: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            if (_currentDraftOrder.value.items.isEmpty()) {
                _errorMessage.value = "Adicione pelo menos um item ao pedido"
                return@launch
            }

            _isLoading.value = true
            val now = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val orderNum = "PED-${String.format("%04d", (_orders.value.size + 1))}"

            val finalOrder = _currentDraftOrder.value.copy(
                id = UUID.randomUUID().toString(),
                header = _currentDraftOrder.value.header.copy(
                    numeroPedido = orderNum,
                    fornecedor = fornecedor,
                    condicaoPagamento = condicao,
                    dataPedido = now,
                    createdAt = now,
                    status = "Aprovado"
                ),
                status = "Aprovado",
                separationStatus = "Pendente",
                createdAt = now,
                totalLiquido = _currentDraftOrder.value.items.sumOf { it.valorTotalBruto },
                totalPecas = _currentDraftOrder.value.items.sumOf { it.qtdTotalUnidades }
            )

            val res = repository.saveOrder(finalOrder)
            _isLoading.value = false

            res.onSuccess {
                _successMessage.value = "Pedido $orderNum salvo com sucesso!"
                _currentDraftOrder.value = PurchaseOrder() // Limpar rascunho
                refreshData()
                onSuccess()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Erro ao salvar pedido"
            }
        }
    }
}
