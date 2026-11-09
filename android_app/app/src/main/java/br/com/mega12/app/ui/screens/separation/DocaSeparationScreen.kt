package br.com.mega12.app.ui.screens.separation

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import br.com.mega12.app.data.model.PurchaseOrder
import br.com.mega12.app.domain.DocaAllocation
import br.com.mega12.app.domain.DocaWork
import br.com.mega12.app.ui.components.OrdersLoadError
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocaSeparationScreen(
    viewModel: Mega12ViewModel,
    orderId: String,
    mode: DocaMode,
    onExitOrder: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val user by viewModel.currentUser.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val loadFailed by viewModel.ordersLoadFailed.collectAsState()
    val isWorking by viewModel.docaOperationInProgress.collectAsState()
    val order = orders.firstOrNull { it.finalId == orderId && it.status == "Em Separação" && !it.header.separacaoConcluida }

    if (order == null) {
        Scaffold(
            topBar = { DocaOrderTopBar("Pedido", mode.label, onExitOrder) },
            containerColor = MaterialTheme.colorScheme.background
        ) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when {
                    loadFailed -> OrdersLoadError(isLoading, viewModel::retryOrders)
                    isLoading -> LinearProgressIndicator(Modifier.fillMaxWidth())
                    else -> Text("Este pedido não está mais disponível para separação.")
                }
            }
        }
        return
    }

    val work = remember(order) { DocaWork(order) }
    val groups = if (mode == DocaMode.STORE) work.byStore else work.byProduct
    val groupName = if (mode == DocaMode.STORE) "loja" else "produto"
    var selectedGroupId by rememberSaveable(orderId, mode) { mutableStateOf<String?>(null) }
    val currentGroupId = selectedGroupId?.takeIf(groups::containsKey) ?: groups.keys.firstOrNull()
    val currentGroup = groups[currentGroupId].orEmpty()
    var damageKey by rememberSaveable(orderId, mode) { mutableStateOf<String?>(null) }
    val damageAllocation = work.allocations.firstOrNull { it.key == damageKey }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val view = LocalView.current
    val busy = isWorking || isLoading

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            DocaGroupDrawer(
                mode = mode,
                groups = groups,
                currentGroupId = currentGroupId,
                onClose = { scope.launch { drawerState.close() } },
                onSelect = { groupId ->
                    selectedGroupId = groupId
                    scope.launch { drawerState.close() }
                }
            )
        }
    ) {
        Scaffold(
            topBar = { DocaOrderTopBar(order.header.numeroPedido.ifBlank { "Pedido" }, mode.label, onExitOrder) },
            containerColor = MaterialTheme.colorScheme.background
        ) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 12.dp)
            ) {
                if (loadFailed) OrdersLoadError(isLoading, viewModel::retryOrders)
                if (currentGroup.isEmpty()) {
                    Text(
                        "Nenhuma cota disponível para este pedido.",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    val checkedInGroup = currentGroup.count { it.isChecked }
                    val groupComplete = checkedInGroup == currentGroup.size
                    Surface(
                        color = if (groupComplete) DocaCompletedBlue else MaterialTheme.colorScheme.surface,
                        contentColor = if (groupComplete) Color.White else MaterialTheme.colorScheme.onSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, if (groupComplete) Blue500 else MaterialTheme.colorScheme.outlineVariant),
                        shadowElevation = 2.dp
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 6.dp, top = 4.dp, bottom = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (groupComplete) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                                    }
                                    Text(
                                        currentGroup.first().groupLabel(mode),
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Text(
                                    "$checkedInGroup de ${currentGroup.size} conferidos",
                                    color = if (groupComplete) Blue100 else MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                            FilledTonalButton(
                                onClick = { scope.launch { drawerState.open() } },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = if (groupComplete) Color.White.copy(alpha = 0.2f) else Emerald500.copy(alpha = 0.15f),
                                    contentColor = if (groupComplete) Color.White else MaterialTheme.colorScheme.primary
                                )
                            ) {
                                Text("Trocar $groupName")
                            }
                        }
                    }

                    key(currentGroupId) {
                        LazyColumn(
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(currentGroup, key = { it.key }) { allocation ->
                                DocaAllocationCard(
                                    allocation = allocation,
                                    mode = mode,
                                    canCheck = !busy && (!allocation.isChecked || allocation.check?.conferenteId == user?.id),
                                    canReportDamage = !busy && allocation.remainingUnits > 0,
                                    onCheck = {
                                        view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                                        viewModel.toggleSeparationCheck(orderId, allocation.storeId, allocation.item.id, !allocation.isChecked)
                                    },
                                    onReportDamage = { damageKey = allocation.key }
                                )
                            }
                        }
                    }
                    DocaOrderProgress(
                        order = order,
                        work = work,
                        busy = busy,
                        onFinish = { viewModel.concludeSeparation(orderId, onSuccess = onExitOrder) }
                    )
                }
            }
        }
    }

    if (damageAllocation != null) {
        key(damageAllocation.key) {
            DocaDamageDialog(
                allocation = damageAllocation,
                isSaving = isWorking,
                onDismiss = { damageKey = null },
                onSave = { quantity, reason ->
                    viewModel.addSeparationDamage(
                        orderId = orderId,
                        itemId = damageAllocation.item.id,
                        storeId = damageAllocation.storeId,
                        quantidade = quantity,
                        motivo = reason,
                        observacao = reason,
                        onSuccess = { damageKey = null }
                    )
                }
            )
        }
    }
}

private fun DocaAllocation.productLabel(): String =
    item.descricao.orEmpty().ifBlank { item.safeCodigoInterno.ifBlank { "Produto" } }

private fun DocaAllocation.groupLabel(mode: DocaMode): String =
    if (mode == DocaMode.STORE) storeName else productLabel()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DocaOrderTopBar(title: String, modeLabel: String, onExitOrder: () -> Unit) {
    DocaBrandedTopBar(
        title = title,
        subtitle = modeLabel,
        navigationIcon = {
            IconButton(onClick = onExitOrder) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar aos pedidos")
            }
        },
        actions = {
            TextButton(onClick = onExitOrder) { Text("Sair do pedido", fontWeight = FontWeight.SemiBold) }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DocaGroupDrawer(
    mode: DocaMode,
    groups: Map<String, List<DocaAllocation>>,
    currentGroupId: String?,
    onClose: () -> Unit,
    onSelect: (String) -> Unit
) {
    var query by rememberSaveable { mutableStateOf("") }
    val visibleGroups = groups.entries.filter { (_, group) ->
        val row = group.first()
        row.groupLabel(mode).contains(query.trim(), ignoreCase = true) ||
            (mode == DocaMode.PRODUCT && row.item.safeCodigoInterno.contains(query.trim(), ignoreCase = true))
    }
    ModalDrawerSheet(
        drawerContainerColor = MaterialTheme.colorScheme.background,
        drawerContentColor = MaterialTheme.colorScheme.onBackground,
        drawerShape = RoundedCornerShape(topEnd = 14.dp, bottomEnd = 14.dp),
        modifier = Modifier.widthIn(max = 320.dp).statusBarsPadding()
    ) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (mode == DocaMode.STORE) Icons.Default.Storefront else Icons.Default.Inventory2,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    if (mode == DocaMode.STORE) "Lojas & Filiais" else "Produtos do Pedido",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.Close, contentDescription = "Fechar seleção", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(if (mode == DocaMode.STORE) "Buscar loja" else "Buscar produto ou código") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = mega12TextFieldColors()
            )
            LazyColumn(contentPadding = PaddingValues(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (visibleGroups.isEmpty()) item { Text("Nenhum resultado.") }
                items(visibleGroups, key = { it.key }) { (id, group) ->
                    val done = group.count { it.isChecked }
                    val complete = done == group.size
                    val selected = id == currentGroupId
                    Card(
                        onClick = { onSelect(id) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        border = when {
                            selected -> BorderStroke(2.dp, if (complete) Color.White else MaterialTheme.colorScheme.primary)
                            complete -> BorderStroke(1.dp, Blue500)
                            else -> null
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = when {
                                complete -> DocaCompletedBlue
                                selected -> MaterialTheme.colorScheme.primaryContainer
                                else -> MaterialTheme.colorScheme.surface
                            },
                            contentColor = when {
                                complete -> Color.White
                                selected -> MaterialTheme.colorScheme.onPrimaryContainer
                                else -> MaterialTheme.colorScheme.onSurface
                            }
                        )
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(group.first().groupLabel(mode), fontWeight = FontWeight.SemiBold)
                            Text(
                                if (complete) "Concluído • $done de ${group.size}" else "$done de ${group.size} conferidos",
                                color = when {
                                    complete -> Blue100
                                    selected -> MaterialTheme.colorScheme.onPrimaryContainer
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                },
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DocaAllocationCard(
    allocation: DocaAllocation,
    mode: DocaMode,
    canCheck: Boolean,
    canReportDamage: Boolean,
    onCheck: () -> Unit,
    onReportDamage: () -> Unit
) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, if (allocation.isChecked) Emerald500 else MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.outlinedCardColors(
            containerColor = if (allocation.isChecked) Emerald500.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    if (mode == DocaMode.STORE) allocation.productLabel() else allocation.storeName,
                    fontWeight = FontWeight.Bold
                )
                if (mode == DocaMode.STORE && allocation.item.safeCodigoInterno.isNotBlank()) {
                    Text("Cód. ${allocation.item.safeCodigoInterno}", style = MaterialTheme.typography.bodySmall)
                }
                Surface(
                    color = if (allocation.isChecked) Emerald600 else Slate700,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        "${allocation.remainingUnits} peças",
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                allocation.check?.conferenteNome?.let {
                    Text("Por $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Button(
                onClick = onCheck,
                enabled = canCheck,
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (allocation.isChecked) Emerald600 else Slate700,
                    contentColor = Color.White,
                    disabledContainerColor = if (allocation.isChecked) Emerald600 else Slate700.copy(alpha = 0.45f),
                    disabledContentColor = Color.White
                )
            ) {
                if (allocation.isChecked) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                }
                Text(if (allocation.isChecked) "Conferido" else "Conferir", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            }
            IconButton(onClick = onReportDamage, enabled = canReportDamage) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = "Apontar avaria",
                    tint = if (canReportDamage) Amber500 else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
                )
            }
        }
    }
}

@Composable
private fun DocaOrderProgress(order: PurchaseOrder, work: DocaWork, busy: Boolean, onFinish: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        LinearProgressIndicator(
            progress = { work.checkedCount.toFloat() / work.allocations.size },
            modifier = Modifier.fillMaxWidth().height(5.dp),
            color = Blue500,
            trackColor = MaterialTheme.colorScheme.outlineVariant
        )
        Text("${work.checkedCount} de ${work.allocations.size} cotas conferidas no pedido", style = MaterialTheme.typography.bodySmall)
        if (work.isComplete) {
            Button(
                onClick = onFinish,
                enabled = !busy && order.status == "Em Separação",
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald500, contentColor = Slate900)
            ) {
                Text("Finalizar separação")
            }
        }
    }
}

@Composable
private fun DocaDamageDialog(
    allocation: DocaAllocation,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onSave: (Int, String) -> Unit
) {
    var quantityText by rememberSaveable { mutableStateOf("1") }
    var reason by rememberSaveable { mutableStateOf("Quebra na conferência") }
    val quantity = quantityText.toIntOrNull()
    val isValidQuantity = quantity != null && quantity in 1..allocation.remainingUnits
    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = Amber500)
                Text("Apontar avaria")
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("${allocation.productLabel()} • ${allocation.storeName}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = quantityText,
                    onValueChange = { quantityText = it },
                    label = { Text("Peças avariadas") },
                    supportingText = { Text("Disponíveis nesta cota: ${allocation.remainingUnits}") },
                    isError = !isValidQuantity,
                    enabled = !isSaving,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = mega12TextFieldColors()
                )
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Motivo") },
                    enabled = !isSaving,
                    colors = mega12TextFieldColors()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { quantity?.let { onSave(it, reason.trim()) } },
                enabled = !isSaving && isValidQuantity && reason.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Amber500, contentColor = Slate900)
            ) {
                Text(if (isSaving) "Salvando…" else "Salvar avaria")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !isSaving) { Text("Cancelar") } },
        containerColor = MaterialTheme.colorScheme.surface
    )
}
