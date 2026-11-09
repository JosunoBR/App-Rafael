package br.com.mega12.app.ui.screens.separation

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.mega12.app.domain.DocaWork
import br.com.mega12.app.ui.components.OrdersLoadError
import br.com.mega12.app.ui.components.SeparationSkeletonScreen
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocaHomeScreen(
    viewModel: Mega12ViewModel,
    onOpenOrder: (String, DocaMode) -> Unit,
    onLogout: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val loadFailed by viewModel.ordersLoadFailed.collectAsState()
    val availableOrders = remember(orders) {
        orders.filter { it.status == "Em Separação" && it.finalId.isNotBlank() }
    }
    var selectedOrderId by rememberSaveable { mutableStateOf<String?>(null) }
    val selectedOrder = availableOrders.firstOrNull { it.finalId == selectedOrderId }

    LaunchedEffect(selectedOrderId, selectedOrder) {
        if (selectedOrderId != null && selectedOrder == null && !isLoading && !loadFailed) {
            selectedOrderId = null
        }
    }

    Scaffold(
        topBar = {
            DocaBrandedTopBar(
                title = "Doca & Conferência",
                subtitle = "Conferente: ${currentUser?.nome ?: "Doca"}",
                actions = {
                    IconButton(onClick = viewModel::retryOrders, enabled = !isLoading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar pedidos", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Encerrar sessão", tint = Rose500)
                    }
                }
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        if (isLoading && availableOrders.isEmpty() && !loadFailed) {
            Box(Modifier.padding(padding)) { SeparationSkeletonScreen() }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text("Pedidos disponíveis", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        "Toque em um pedido para escolher como separar.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                if (loadFailed) item { OrdersLoadError(isLoading, viewModel::retryOrders) }
                if (availableOrders.isEmpty() && !loadFailed) item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Inventory2, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("Nenhum pedido liberado para separação.")
                    }
                }
                items(availableOrders, key = { it.finalId }) { order ->
                    val work = remember(order) { DocaWork(order) }
                    Card(
                        onClick = { selectedOrderId = order.finalId },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Surface(
                                    color = Emerald500.copy(alpha = 0.16f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(19.dp))
                                    }
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(order.header.numeroPedido.ifBlank { "Pedido" }, fontWeight = FontWeight.Bold)
                                    Text(order.header.fornecedor.ifBlank { "Fornecedor não informado" }, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                            Text(
                                "${work.byProduct.size} produtos • ${work.byStore.size} lojas",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                            if (work.allocations.isNotEmpty()) {
                                LinearProgressIndicator(
                                    progress = { work.checkedCount.toFloat() / work.allocations.size },
                                    modifier = Modifier.fillMaxWidth().height(5.dp),
                                    color = if (work.isComplete) Blue500 else Emerald500,
                                    trackColor = MaterialTheme.colorScheme.outlineVariant
                                )
                                Text(
                                    "${work.checkedCount} de ${work.allocations.size} cotas conferidas",
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (selectedOrder != null) {
        AlertDialog(
            onDismissRequest = { selectedOrderId = null },
            title = { Text("Como deseja separar?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(selectedOrder.header.numeroPedido, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    DocaModeOption(DocaMode.STORE, Icons.Default.Storefront, "Escolha uma loja e veja seus produtos.") {
                        selectedOrderId = null
                        onOpenOrder(selectedOrder.finalId, DocaMode.STORE)
                    }
                    DocaModeOption(DocaMode.PRODUCT, Icons.Default.Inventory2, "Escolha um produto e veja a quantidade de cada loja.") {
                        selectedOrderId = null
                        onOpenOrder(selectedOrder.finalId, DocaMode.PRODUCT)
                    }
                }
            },
            confirmButton = { TextButton(onClick = { selectedOrderId = null }) { Text("Cancelar") } },
            containerColor = MaterialTheme.colorScheme.surface
        )
    }
}

@Composable
private fun DocaModeOption(mode: DocaMode, icon: ImageVector, description: String, onClick: () -> Unit) {
    OutlinedCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.outlinedCardColors(
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = MaterialTheme.colorScheme.onSurface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Column {
                Text(mode.label, fontWeight = FontWeight.Bold)
                Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
