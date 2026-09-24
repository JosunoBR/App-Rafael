package br.com.mega12.app.ui.screens.separation

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.*
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocaSeparationScreen(
    viewModel: Mega12ViewModel,
    onLogout: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val view = LocalView.current

    // Filtra pedidos elegíveis para separação física ou todos os pedidos recentes
    val separationOrders = remember(orders) {
        val eligible = orders.filter { 
            it.status == "Em Separação" || it.status == "Em Distribuição" || it.status == "Aprovado" 
        }
        if (eligible.isNotEmpty()) eligible else orders
    }

    var selectedOrderId by remember(separationOrders) {
        mutableStateOf(separationOrders.firstOrNull()?.id ?: "")
    }

    val activeOrder = remember(orders, selectedOrderId) {
        orders.find { it.id == selectedOrderId } ?: separationOrders.firstOrNull()
    }

    // 20 Lojas oficiais da Rede Mega 12
    val stores = remember { SeparationEngine.DEFAULT_STORES }
    var selectedStoreId by remember { mutableStateOf(stores.first().id) }

    // Diálogo de Avaria
    var showAvariaDialog by remember { mutableStateOf(false) }
    var avariaItemId by remember { mutableStateOf("") }
    var avariaQtdStr by remember { mutableStateOf("1") }
    var avariaUnidade by remember { mutableStateOf("UN") }
    var avariaMotivo by remember { mutableStateOf("Quebra na conferência") }

    val currentAvarias = activeOrder?.inspection?.avarias ?: emptyList()
    val currentChecks = activeOrder?.inspection?.conferenciaLojas ?: emptyMap()

    // Itens com cotas alocadas para a loja selecionada
    val storeItems = remember(activeOrder, selectedStoreId, currentAvarias, currentChecks) {
        if (activeOrder == null) emptyList()
        else {
            activeOrder.items.mapNotNull { item ->
                val rawAlloc = item.storeDistribution[selectedStoreId] ?: 0
                val avariaUnits = currentAvarias
                    .filter { it.itemId == item.id && it.storeId == selectedStoreId }
                    .sumOf { it.quantidade }
                val effectiveUnits = kotlin.math.max(0, rawAlloc - avariaUnits)
                
                if (rawAlloc > 0 || avariaUnits > 0) {
                    val checkKey = "${selectedStoreId}_${item.id}"
                    val checkRecord = currentChecks[checkKey]
                    Triple(item, effectiveUnits, checkRecord)
                } else null
            }
        }
    }

    // Métricas Globais do Pedido Ativo
    val totalItens = activeOrder?.items?.size ?: 0
    val totalPecas = activeOrder?.totalPecas ?: 0
    val totalConferidos = remember(activeOrder, currentChecks) {
        currentChecks.values.count { it.conferido }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Doca & Conferência de Cargas",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                        )
                        Text(
                            text = "Conferente: ${currentUser?.nome ?: "Doca"}",
                            style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontSize = 11.sp)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sair", tint = Rose500)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Slate900)
            )
        },
        floatingActionButton = {
            if (activeOrder != null && activeOrder.items.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = {
                        avariaItemId = activeOrder.items.first().id
                        showAvariaDialog = true
                    },
                    icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Slate900) },
                    text = { Text("Apontar Avaria", fontWeight = FontWeight.Bold, color = Slate900) },
                    containerColor = Amber500
                )
            }
        },
        containerColor = Slate900
    ) { padding ->
        if (activeOrder == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Nenhum pedido aguardando conferência na doca.", color = Slate400)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 1. Seletor do Pedido Ativo
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = activeOrder.header.numeroPedido.ifEmpty { "PEDIDO DE CARGA" },
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 16.sp
                                    )
                                    Text(
                                        text = activeOrder.header.fornecedor.ifEmpty { "Fornecedor Matriz" },
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                                    )
                                }

                                Surface(
                                    color = Emerald500.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = activeOrder.status,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Resumo de Volumes e Conferência
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("$totalPecas Peças Totais", color = Slate300, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("$totalItens Produtos no Pedido", color = Slate300, fontSize = 12.sp)
                                if (currentAvarias.isNotEmpty()) {
                                    Text("${currentAvarias.size} Avarias", color = Rose500, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // 2. Carrossel das 20 Lojas Físicas da Rede Mega 12
                item {
                    Text(
                        text = "Selecione a Loja para Carregamento (20 Filiais)",
                        style = MaterialTheme.typography.labelMedium.copy(color = Slate400, fontWeight = FontWeight.Bold)
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(stores) { store ->
                            val isSelected = store.id == selectedStoreId
                            val storeItemsForStore = activeOrder.items.mapNotNull { item ->
                                val alloc = item.storeDistribution[store.id] ?: 0
                                if (alloc > 0) item else null
                            }
                            val isStoreChecked = storeItemsForStore.isNotEmpty() && storeItemsForStore.all {
                                currentChecks["${store.id}_${it.id}"]?.conferido == true
                            }

                            Card(
                                onClick = { selectedStoreId = store.id },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) Emerald600 else Slate800
                                ),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.border(
                                    width = if (isStoreChecked) 1.5.dp else 0.dp,
                                    color = if (isStoreChecked) Emerald400 else Color.Transparent,
                                    shape = RoundedCornerShape(10.dp)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    if (isStoreChecked) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = if (isSelected) Color.White else Emerald400, modifier = Modifier.size(14.dp))
                                    }
                                    Text(
                                        text = store.name,
                                        color = if (isSelected) Color.White else Slate200,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. Título da Loja Selecionada
                item {
                    val currentStoreObj = stores.find { it.id == selectedStoreId }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Itens Destinados: ${currentStoreObj?.name ?: ""}",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                        )
                        Text(
                            text = "${storeItems.count { it.third?.conferido == true }}/${storeItems.size} Conferidos",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                        )
                    }
                }

                // 4. Lista dos Itens da Loja
                if (storeItems.isEmpty()) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800.copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box(modifier = Modifier.padding(20.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                                Text("Nenhum item com cota alocada para esta loja neste pedido.", color = Slate400, fontSize = 12.sp)
                            }
                        }
                    }
                } else {
                    items(storeItems) { (item, effectiveUnits, checkRecord) ->
                        val isChecked = checkRecord?.conferido == true
                        val checkKey = "${selectedStoreId}_${item.id}"

                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isChecked) Slate800.copy(alpha = 0.9f) else Slate800
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(
                                    width = if (isChecked) 1.dp else 0.dp,
                                    color = if (isChecked) Emerald500.copy(alpha = 0.6f) else Color.Transparent,
                                    shape = RoundedCornerShape(12.dp)
                                )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.descricao.ifEmpty { "Produto ${item.codigoInterno}" },
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 14.sp
                                    )
                                    Text(
                                        text = "Cód: ${item.codigoInterno} • Embalagem: ${item.qtdPorCaixa} pçs/cx",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                    )

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Surface(
                                            color = if (isChecked) Emerald500.copy(alpha = 0.2f) else Slate700,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                text = "$effectiveUnits PEÇAS",
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                                style = MaterialTheme.typography.labelSmall.copy(
                                                    color = if (isChecked) Emerald400 else Color.White,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            )
                                        }

                                        if (checkRecord?.conferenteNome != null) {
                                            Text(
                                                text = "Por: ${checkRecord.conferenteNome}",
                                                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 10.sp)
                                            )
                                        }
                                    }
                                }

                                // Botão de Conferência (Check)
                                Button(
                                    onClick = {
                                        view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                                        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())
                                        val updatedChecks = currentChecks.toMutableMap()

                                        if (isChecked) {
                                            updatedChecks.remove(checkKey)
                                        } else {
                                            updatedChecks[checkKey] = StoreItemCheck(
                                                conferido = true,
                                                conferenteId = currentUser?.id ?: "usr_doca",
                                                conferenteNome = currentUser?.nome ?: "Conferente",
                                                dataHora = now
                                            )
                                        }

                                        val updatedOrder = activeOrder.copy(
                                            inspection = (activeOrder.inspection ?: OrderInspection()).copy(
                                                conferente = currentUser?.nome,
                                                dataConferencia = now,
                                                conferenciaLojas = updatedChecks
                                            )
                                        )

                                        viewModel.updateOrderInspection(updatedOrder)
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (isChecked) Emerald600 else Slate700,
                                        contentColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isChecked) Icons.Default.Check else Icons.Default.Done,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isChecked) "CONFERIDO" else "CONFERIR",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Diálogo de Registro de Avaria
    if (showAvariaDialog && activeOrder != null) {
        val selectedItemObj = activeOrder.items.find { it.id == avariaItemId } ?: activeOrder.items.firstOrNull()

        AlertDialog(
            onDismissRequest = { showAvariaDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Amber500)
                    Text("Apontar Avaria na Doca", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Selecione o produto avariado:", color = Slate400, fontSize = 12.sp)

                    // Seleção de Produto
                    var prodExpanded by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(
                            onClick = { prodExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = selectedItemObj?.descricao?.take(25) ?: "Selecione o produto",
                                color = Color.White,
                                maxLines = 1
                            )
                        }
                        DropdownMenu(
                            expanded = prodExpanded,
                            onDismissRequest = { prodExpanded = false }
                        ) {
                            activeOrder.items.forEach { item ->
                                DropdownMenuItem(
                                    text = { Text(item.descricao) },
                                    onClick = {
                                        avariaItemId = item.id
                                        prodExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Quantidade Avariada
                    OutlinedTextField(
                        value = avariaQtdStr,
                        onValueChange = { avariaQtdStr = it },
                        label = { Text("Quantidade Avariada ($avariaUnidade)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Motivo da Avaria
                    OutlinedTextField(
                        value = avariaMotivo,
                        onValueChange = { avariaMotivo = it },
                        label = { Text("Motivo / Observação") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val qtd = avariaQtdStr.toIntOrNull() ?: 1
                        val storeObj = stores.find { it.id == selectedStoreId }
                        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(Date())

                        val newAvaria = AvariaRecord(
                            id = "av_${System.currentTimeMillis()}",
                            itemId = selectedItemObj?.id ?: "",
                            codigoProduto = selectedItemObj?.codigoInterno ?: "",
                            descricaoProduto = selectedItemObj?.descricao ?: "",
                            storeId = selectedStoreId,
                            nomeLoja = storeObj?.name ?: "",
                            quantidade = qtd,
                            unidadeMedida = avariaUnidade,
                            custoUnitario = selectedItemObj?.precoCompraUnitario ?: 0.0,
                            valorPrejuizoTotal = qtd * (selectedItemObj?.precoCompraUnitario ?: 0.0),
                            motivo = avariaMotivo,
                            conferente = currentUser?.nome ?: "Conferente",
                            dataRegistro = now
                        )

                        val updatedAvarias = currentAvarias + newAvaria
                        val updatedOrder = activeOrder.copy(
                            inspection = (activeOrder.inspection ?: OrderInspection()).copy(
                                possuiAvarias = true,
                                avarias = updatedAvarias
                            )
                        )

                        viewModel.updateOrderInspection(updatedOrder)
                        showAvariaDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Amber500)
                ) {
                    Text("Salvar Avaria", color = Slate900, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAvariaDialog = false }) {
                    Text("Cancelar", color = Slate400)
                }
            },
            containerColor = Slate800
        )
    }
}
