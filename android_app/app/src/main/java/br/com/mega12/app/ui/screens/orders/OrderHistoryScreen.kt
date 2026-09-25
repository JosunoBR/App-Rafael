package br.com.mega12.app.ui.screens.orders

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavHostController
import br.com.mega12.app.data.model.PurchaseOrder
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.components.ProductThumbnail
import br.com.mega12.app.ui.navigation.Screen
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderHistoryScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val orders by viewModel.orders.collectAsState()
    val isRefreshing by viewModel.isLoading.collectAsState()
    var selectedStatus by remember { mutableStateOf("TODOS") }
    var searchQuery by remember { mutableStateOf("") }
    var selectedOrderForDetail by remember { mutableStateOf<PurchaseOrder?>(null) }
    val context = LocalContext.current

    val currencyFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    }

    val filteredOrders = remember(orders, selectedStatus, searchQuery) {
        orders.filter { order ->
            val matchesStatus = if (selectedStatus == "TODOS") true
            else order.status.equals(selectedStatus, ignoreCase = true)

            val query = searchQuery.trim().lowercase()
            val matchesQuery = if (query.isEmpty()) true
            else {
                order.header.numeroPedido.lowercase().contains(query) ||
                order.header.fornecedor.lowercase().contains(query) ||
                order.items.any { it.descricao.lowercase().contains(query) || it.codigoInterno.lowercase().contains(query) }
            }

            matchesStatus && matchesQuery
        }
    }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Histórico de Pedidos"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Campo de Busca Rápida (Compacto, sem label longo para não quebrar linha nem ocupar espaço)
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar...", color = Slate300, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp)) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Limpar busca", tint = Slate300, modifier = Modifier.size(18.dp))
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                singleLine = true,
                colors = mega12TextFieldColors(containerColor = Slate800),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Chips de Filtro por Status em LazyRow horizontal (sem quebras de linha nem espaços extras)
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(listOf("TODOS", "Em Cotação", "Aprovado", "Em Separação", "Finalizado")) { status ->
                    FilterChip(
                        selected = selectedStatus == status,
                        onClick = { selectedStatus = status },
                        label = { Text(status, fontSize = 12.sp, maxLines = 1) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Emerald500,
                            selectedLabelColor = Slate900,
                            containerColor = Slate800,
                            labelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Lista de Pedidos (Ocupa o espaço logo abaixo dos chips, sem espaço vazio residual)
            if (filteredOrders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.AutoMirrored.Filled.ReceiptLong, contentDescription = null, tint = Slate600, modifier = Modifier.size(54.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Nenhum pedido encontrado.", color = Slate400, fontWeight = FontWeight.Medium)
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    items(filteredOrders, key = { it.finalId }) { order ->
                        val statusBg = when (order.status.lowercase()) {
                            "aprovado" -> Emerald500.copy(alpha = 0.2f)
                            "finalizado" -> Color(0xFF38BDF8).copy(alpha = 0.2f)
                            "em separação", "em separacao" -> Color(0xFFA855F7).copy(alpha = 0.2f)
                            else -> Amber500.copy(alpha = 0.2f)
                        }
                        val statusTextColor = when (order.status.lowercase()) {
                            "aprovado" -> Emerald400
                            "finalizado" -> Color(0xFF38BDF8)
                            "em separação", "em separacao" -> Color(0xFFA855F7)
                            else -> Amber400
                        }

                        Card(
                            onClick = { selectedOrderForDetail = order },
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
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" },
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp,
                                            color = Color.White
                                        )
                                        val temAjusteFiscal = (order.header.valorNotaFiscalEntregue > 0.0) || Math.abs(order.header.ajusteFiscalDiferenca) > 0.001
                                        if (temAjusteFiscal) {
                                            Surface(
                                                color = Amber500.copy(alpha = 0.2f),
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                                                        contentDescription = "Ajuste Fiscal NF",
                                                        tint = Amber400,
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(3.dp))
                                                    val sinal = if (order.header.ajusteFiscalDiferenca > 0) "+" else ""
                                                    Text(
                                                        text = "Ajuste NF $sinal${currencyFormat.format(order.header.ajusteFiscalDiferenca)}",
                                                        color = Amber400,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 10.sp
                                                    )
                                                }
                                            }
                                        }
                                    }
                                    Surface(
                                        color = statusBg,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = order.status.uppercase(),
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = statusTextColor,
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                val fornecedorNome = order.header.fornecedor.ifBlank { "Fornecedor não informado" }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Business,
                                        contentDescription = null,
                                        tint = Slate400,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = fornecedorNome,
                                        color = Slate300,
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 14.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))
                                HorizontalDivider(color = Slate700.copy(alpha = 0.6f), thickness = 1.dp)
                                Spacer(modifier = Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "${order.items.size} itens • ${order.totalPecas} pçs",
                                            color = Slate400,
                                            fontSize = 12.sp
                                        )
                                        if (!order.header.dataPedido.isNullOrBlank()) {
                                            Text(
                                                text = "Data: ${order.header.dataPedido}",
                                                color = Slate500,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = currencyFormat.format(order.totalLiquido),
                                                color = Emerald400,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp
                                            )
                                            Text(
                                                text = "Toque para detalhes",
                                                color = Slate500,
                                                fontSize = 10.sp
                                            )
                                        }

                                        // Botão Editar direto no Card
                                        IconButton(
                                            onClick = {
                                                viewModel.loadOrderForEdit(order)
                                                navController.navigate(Screen.OrderCreation.route)
                                            },
                                            modifier = Modifier.size(36.dp),
                                            colors = IconButtonDefaults.iconButtonColors(containerColor = Slate700)
                                        ) {
                                            Icon(
                                                Icons.Default.Edit,
                                                contentDescription = "Editar Pedido",
                                                tint = Emerald400,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                }
            }
        }

        // Modal Detalhes do Pedido
        selectedOrderForDetail?.let { order ->
            OrderDetailsDialog(
                order = order,
                currencyFormat = currencyFormat,
                onDismiss = { selectedOrderForDetail = null },
                onEditOrder = {
                    viewModel.loadOrderForEdit(order)
                    selectedOrderForDetail = null
                    navController.navigate(Screen.OrderCreation.route)
                },
                onShareWhatsApp = {
                    val sb = StringBuilder()
                    sb.appendLine("📋 *PEDIDO DE COMPRA - REDE MEGA 12*")
                    sb.appendLine("🔢 *Número:* ${order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" }}")
                    sb.appendLine("🏢 *Fornecedor:* ${order.header.fornecedor.ifBlank { "Fornecedor Matriz" }}")
                    if (!order.header.dataPedido.isNullOrBlank()) {
                        sb.appendLine("📅 *Data:* ${order.header.dataPedido}")
                    }
                    if (!order.header.condicaoPagamento.isNullOrBlank()) {
                        sb.appendLine("💳 *Condição:* ${order.header.condicaoPagamento}")
                    }
                    sb.appendLine("📦 *Total de Peças:* ${order.totalPecas}")
                    sb.appendLine("💰 *TOTAL DO PEDIDO: ${currencyFormat.format(order.totalLiquido)}*")
                    sb.appendLine("---")
                    sb.appendLine("*ITENS DO PEDIDO:*")
                    order.items.forEachIndexed { idx, item ->
                        sb.appendLine("${idx + 1}. ${item.descricao} (Cód: ${item.codigoInterno.ifEmpty { item.codigo }})")
                        sb.appendLine("   ${item.totalPecas} un (R$ %.2f/un) -> R$ %.2f".format(item.precoCompraUnitario, item.subtotal))
                    }
                    sb.appendLine("---")
                    sb.appendLine("Gerado via App Mobile Rede Mega 12")

                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, sb.toString())
                        type = "text/plain"
                    }
                    val shareIntent = Intent.createChooser(sendIntent, "Enviar Pedido via WhatsApp")
                    context.startActivity(shareIntent)
                }
            )
        }
    }
}

@Composable
private fun OrderDetailsDialog(
    order: PurchaseOrder,
    currencyFormat: NumberFormat,
    onDismiss: () -> Unit,
    onEditOrder: () -> Unit,
    onShareWhatsApp: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header Dialog
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" },
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                        Text(
                            text = order.header.fornecedor.ifBlank { "Fornecedor Matriz" },
                            style = MaterialTheme.typography.bodyMedium.copy(color = Slate300)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Slate400)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                HorizontalDivider(color = Slate800)
                Spacer(modifier = Modifier.height(10.dp))

                // Conteúdo Rolável
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Informações Gerais
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Status:", color = Slate400, fontSize = 12.sp)
                                Text(order.status.uppercase(), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            if (!order.header.condicaoPagamento.isNullOrBlank()) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Condição Pagamento:", color = Slate400, fontSize = 12.sp)
                                    Text(order.header.condicaoPagamento, color = Color.White, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                                }
                            }
                            if (!order.header.dataPedido.isNullOrBlank()) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Data do Pedido:", color = Slate400, fontSize = 12.sp)
                                    Text(order.header.dataPedido, color = Color.White, fontSize = 12.sp)
                                }
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total de Peças:", color = Slate400, fontSize = 12.sp)
                                Text("${order.totalPecas} un", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total Líquido:", color = Slate400, fontSize = 12.sp)
                                Text(currencyFormat.format(order.totalLiquido), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                            if ((order.header.valorNotaFiscalEntregue > 0.0) || Math.abs(order.header.ajusteFiscalDiferenca) > 0.001) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Ajuste Fiscal NF:", color = Amber400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    val sinal = if (order.header.ajusteFiscalDiferenca > 0) "+" else ""
                                    Text("$sinal${currencyFormat.format(order.header.ajusteFiscalDiferenca)}", color = Amber400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total Final NF:", color = Amber300, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    val nfVal = if (order.header.valorNotaFiscalEntregue > 0.0) order.header.valorNotaFiscalEntregue else (order.totalLiquido + order.header.ajusteFiscalDiferenca)
                                    Text(currencyFormat.format(nfVal), color = Amber300, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                            }
                        }
                    }

                    // Lista de Itens do Pedido
                    Text(
                        text = "Itens do Pedido (${order.items.size})",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )

                    if (order.items.isEmpty()) {
                        Text("Nenhum item lançado neste pedido.", color = Slate500, fontSize = 12.sp)
                    } else {
                        order.items.forEachIndexed { index, item ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Slate800.copy(alpha = 0.7f)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    ProductThumbnail(
                                        imageUrl = item.photoUrl,
                                        contentDescription = item.descricao,
                                        modifier = Modifier.size(46.dp)
                                    )

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${index + 1}. ${item.descricao.ifBlank { "Produto Sem Descrição" }}",
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White,
                                            fontSize = 13.sp
                                        )
                                        val cod = item.codigoInterno.ifEmpty { item.codigo }
                                        if (cod.isNotEmpty()) {
                                            Text("Cód: $cod", color = Slate400, fontSize = 11.sp)
                                        }
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "${item.totalPecas} un x ${currencyFormat.format(item.precoCompraUnitario)}",
                                                color = Slate300,
                                                fontSize = 12.sp
                                            )
                                            Text(
                                                text = currencyFormat.format(item.subtotal),
                                                color = Emerald400,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Botões de Ação Inferiores (Fechar, Editar e WhatsApp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(0.8f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate300),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Fechar")
                    }

                    // Botão Editar Pedido
                    Button(
                        onClick = onEditOrder,
                        modifier = Modifier.weight(1.3f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, tint = Slate900, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Editar Pedido", color = Slate900, fontWeight = FontWeight.Bold)
                    }

                    IconButton(
                        onClick = onShareWhatsApp,
                        modifier = Modifier.size(44.dp),
                        colors = IconButtonDefaults.iconButtonColors(containerColor = Slate800)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "WhatsApp", tint = Emerald400, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
