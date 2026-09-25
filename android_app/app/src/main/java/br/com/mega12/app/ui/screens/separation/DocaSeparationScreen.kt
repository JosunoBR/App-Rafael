package br.com.mega12.app.ui.screens.separation

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.R
import br.com.mega12.app.data.model.*
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import kotlinx.coroutines.launch
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
        mutableStateOf(separationOrders.firstOrNull()?.finalId ?: "")
    }

    val activeOrder = remember(orders, selectedOrderId) {
        orders.find { it.finalId == selectedOrderId || it.id == selectedOrderId } ?: separationOrders.firstOrNull()
    }

    // 20 Lojas oficiais da Rede Mega 12
    val stores = remember { SeparationEngine.DEFAULT_STORES }
    var selectedStoreId by remember { mutableStateOf(stores.first().id) }

    // Estado do Menu Lateral Retrátil de Lojas e Dropdown de Pedidos
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    var isOrderDropdownExpanded by remember { mutableStateOf(false) }

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

    // Contagem de lojas com 100% dos produtos conferidos
    val completedStoresCount = remember(activeOrder, currentChecks) {
        if (activeOrder == null) 0
        else stores.count { store ->
            val itemsForStore = activeOrder.items.filter { (it.storeDistribution[store.id] ?: 0) > 0 }
            itemsForStore.isNotEmpty() && itemsForStore.all {
                currentChecks["${store.id}_${it.id}"]?.conferido == true
            }
        }
    }

    // Métricas Globais do Pedido Ativo
    val totalItens = activeOrder?.items?.size ?: 0
    val totalPecas = activeOrder?.totalPecas ?: 0
    val totalConferidos = remember(activeOrder, currentChecks) {
        currentChecks.values.count { it.conferido }
    }


    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Slate900,
                modifier = Modifier.width(320.dp)
            ) {
                // Cabeçalho do Menu Retrátil
                Surface(
                    color = Slate800,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Storefront,
                                    contentDescription = null,
                                    tint = Emerald400,
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "Lojas & Filiais",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                )
                            }
                            IconButton(onClick = { coroutineScope.launch { drawerState.close() } }) {
                                Icon(Icons.Default.Close, contentDescription = "Fechar Menu", tint = Slate400)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Progresso Geral de Lojas 100% Conferidas
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "$completedStoresCount de ${stores.size} lojas concluídas",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = if (completedStoresCount == stores.size) Blue500 else Emerald400,
                                    fontWeight = FontWeight.SemiBold
                                )
                            )
                            if (stores.isNotEmpty()) {
                                Text(
                                    text = "${(completedStoresCount * 100) / stores.size}%",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = Slate300,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        LinearProgressIndicator(
                            progress = { if (stores.isEmpty()) 0f else (completedStoresCount.toFloat() / stores.size.toFloat()) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = Blue500,
                            trackColor = Slate700
                        )
                    }
                }

                // Lista Vertical das 20 Filiais
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(stores) { store ->
                        val isSelected = store.id == selectedStoreId
                        val itemsForStore = activeOrder?.items?.filter { (it.storeDistribution[store.id] ?: 0) > 0 } ?: emptyList()
                        val hasItems = itemsForStore.isNotEmpty()
                        val totalStoreItems = itemsForStore.size
                        val checkedStoreItems = itemsForStore.count { currentChecks["${store.id}_${it.id}"]?.conferido == true }
                        val isStoreFullyChecked = hasItems && checkedStoreItems == totalStoreItems

                        // Comportamento: Ficar fixo em azul quando todos os produtos da loja forem conferidos!
                        val cardBg = when {
                            isStoreFullyChecked -> Color(0xFF1D4ED8) // Azul fixo de conclusão (Blue 700)
                            isSelected -> Slate800
                            else -> Slate800.copy(alpha = 0.6f)
                        }

                        Surface(
                            onClick = {
                                selectedStoreId = store.id
                                coroutineScope.launch { drawerState.close() }
                            },
                            color = cardBg,
                            shape = RoundedCornerShape(10.dp),
                            border = when {
                                isSelected -> BorderStroke(2.dp, if (isStoreFullyChecked) Color.White else Emerald400)
                                isStoreFullyChecked -> BorderStroke(1.dp, Blue500)
                                else -> null
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(
                                        imageVector = when {
                                            isStoreFullyChecked -> Icons.Default.CheckCircle
                                            hasItems && checkedStoreItems > 0 -> Icons.Default.Pending
                                            hasItems -> Icons.Default.Store
                                            else -> Icons.Default.Block
                                        },
                                        contentDescription = null,
                                        tint = when {
                                            isStoreFullyChecked -> Color.White
                                            isSelected -> Emerald400
                                            hasItems && checkedStoreItems > 0 -> Amber500
                                            else -> Slate400
                                        },
                                        modifier = Modifier.size(20.dp)
                                    )

                                    Column {
                                        Text(
                                            text = store.name,
                                            color = Color.White,
                                            fontWeight = if (isSelected || isStoreFullyChecked) FontWeight.Bold else FontWeight.Medium,
                                            fontSize = 13.sp
                                        )
                                        val statusText = when {
                                            !hasItems -> "Sem cota neste pedido"
                                            isStoreFullyChecked -> "Todos os $totalStoreItems itens conferidos"
                                            else -> "$checkedStoreItems de $totalStoreItems itens conferidos"
                                        }
                                        Text(
                                            text = statusText,
                                            color = if (isStoreFullyChecked) Blue100 else Slate400,
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                if (isStoreFullyChecked) {
                                    Surface(
                                        color = Color.White.copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = "CONCLUÍDO",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                        )
                                    }
                                } else if (hasItems) {
                                    Text(
                                        text = "$checkedStoreItems/$totalStoreItems",
                                        color = if (isSelected) Emerald400 else Slate400,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu de Lojas", tint = Color.White)
                        }
                    },
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                color = Slate800,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(2.dp)) {
                                    Image(
                                        painter = painterResource(id = R.drawable.logomega12),
                                        contentDescription = "Logo Mega 12",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = "Doca & Conferência",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                                )
                                Text(
                                    text = "Conferente: ${currentUser?.nome ?: "Doca"}",
                                    style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontSize = 11.sp)
                                )
                            }
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
            contentWindowInsets = WindowInsets.systemBars,
            floatingActionButton = {
                if (activeOrder != null && activeOrder.items.isNotEmpty()) {
                    ExtendedFloatingActionButton(
                        onClick = {
                            avariaItemId = activeOrder.items.first().id
                            showAvariaDialog = true
                        },
                        icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Slate900) },
                        text = { Text("Apontar Avaria", fontWeight = FontWeight.Bold, color = Slate900) },
                        containerColor = Amber500,
                        modifier = Modifier.navigationBarsPadding()
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
                    // 1. Seletor de Pedido em Dropdown Interativo
                    item {
                        Card(
                            onClick = { isOrderDropdownExpanded = true },
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                Text(
                                                    text = activeOrder.header.numeroPedido.ifEmpty { "PEDIDO DE CARGA" },
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    fontSize = 17.sp
                                                )
                                                Icon(
                                                    imageVector = if (isOrderDropdownExpanded) Icons.Default.ArrowDropUp else Icons.Default.ArrowDropDown,
                                                    contentDescription = "Selecionar Pedido",
                                                    tint = Emerald400,
                                                    modifier = Modifier.size(24.dp)
                                                )
                                            }
                                            Text(
                                                text = "${activeOrder.header.fornecedor.ifEmpty { "Fornecedor Matriz" }} • Toque para alternar pedido",
                                                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
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

                                // Dropdown Menu com pedidos liberados
                                DropdownMenu(
                                    expanded = isOrderDropdownExpanded,
                                    onDismissRequest = { isOrderDropdownExpanded = false },
                                    modifier = Modifier.background(Slate800)
                                ) {
                                    Text(
                                        text = "PEDIDOS LIBERADOS PARA SEPARAÇÃO",
                                        color = Slate400,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                                    )
                                    HorizontalDivider(color = Slate700)

                                    separationOrders.forEach { order ->
                                        val isSelectedOrder = order.finalId == activeOrder.finalId || order.id == activeOrder.id
                                        DropdownMenuItem(
                                            leadingIcon = {
                                                Icon(
                                                    Icons.Default.ReceiptLong,
                                                    contentDescription = null,
                                                    tint = if (isSelectedOrder) Emerald400 else Slate400
                                                )
                                            },
                                            text = {
                                                Column {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text(
                                                            text = order.header.numeroPedido.ifEmpty { "PEDIDO #${order.id.takeLast(5)}" },
                                                            fontWeight = if (isSelectedOrder) FontWeight.Bold else FontWeight.SemiBold,
                                                            color = if (isSelectedOrder) Emerald400 else Color.White,
                                                            fontSize = 14.sp
                                                        )
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Surface(
                                                            color = if (order.status == "Em Separação") Emerald500.copy(alpha = 0.2f) else Slate700,
                                                            shape = RoundedCornerShape(4.dp)
                                                        ) {
                                                            Text(
                                                                text = order.status,
                                                                color = if (order.status == "Em Separação") Emerald400 else Slate300,
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                            )
                                                        }
                                                    }
                                                    Text(
                                                        text = "${order.header.fornecedor} • ${order.totalPecas} peças • ${order.items.size} itens",
                                                        color = Slate400,
                                                        fontSize = 11.sp
                                                    )
                                                }
                                            },
                                            onClick = {
                                                selectedOrderId = order.finalId.ifBlank { order.id }
                                                isOrderDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 2. Painel Compacto da Loja Selecionada (Fixo em Azul quando 100% conferida)
                    item {
                        val currentStoreObj = stores.find { it.id == selectedStoreId }
                        val isCurrentStoreChecked = storeItems.isNotEmpty() && storeItems.all { it.third?.conferido == true }
                        val conferidosCount = storeItems.count { it.third?.conferido == true }
                        val totalLoja = storeItems.size

                        Card(
                            colors = CardDefaults.cardColors(
                                // Fica fixo em azul quando todos os produtos da loja forem conferidos!
                                containerColor = if (isCurrentStoreChecked) Color(0xFF1E40AF) else Slate800
                            ),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(
                                width = if (isCurrentStoreChecked) 1.5.dp else 1.dp,
                                color = if (isCurrentStoreChecked) Blue500 else Slate700
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        if (isCurrentStoreChecked) {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                        Text(
                                            text = currentStoreObj?.name ?: "Loja Selecionada",
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 15.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(3.dp))
                                    Text(
                                        text = if (isCurrentStoreChecked) {
                                            "✓ Todos os $totalLoja itens 100% conferidos nesta filial"
                                        } else if (totalLoja > 0) {
                                            "$conferidosCount de $totalLoja itens conferidos"
                                        } else {
                                            "Nenhum item com cota alocada para esta filial"
                                        },
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isCurrentStoreChecked) Blue100 else Slate400,
                                            fontSize = 12.sp,
                                            fontWeight = if (isCurrentStoreChecked) FontWeight.SemiBold else FontWeight.Normal
                                        )
                                    )
                                }

                                // Botão para abrir o menu lateral retrátil de lojas
                                FilledTonalButton(
                                    onClick = { coroutineScope.launch { drawerState.open() } },
                                    colors = ButtonDefaults.filledTonalButtonColors(
                                        containerColor = if (isCurrentStoreChecked) Color.White.copy(alpha = 0.2f) else Emerald500.copy(alpha = 0.15f),
                                        contentColor = if (isCurrentStoreChecked) Color.White else Emerald400
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.FormatListBulleted,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Lojas ($completedStoresCount/${stores.size})",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
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
                        colors = mega12TextFieldColors(containerColor = Slate800),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Motivo da Avaria
                    OutlinedTextField(
                        value = avariaMotivo,
                        onValueChange = { avariaMotivo = it },
                        label = { Text("Motivo / Observação") },
                        colors = mega12TextFieldColors(containerColor = Slate800),
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
