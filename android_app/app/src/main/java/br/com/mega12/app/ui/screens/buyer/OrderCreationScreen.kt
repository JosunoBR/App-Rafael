package br.com.mega12.app.ui.screens.buyer

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import br.com.mega12.app.data.model.FiscalConfig
import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.data.model.PaymentCondition
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.domain.FiscalEngine
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.components.ProductThumbnail
import br.com.mega12.app.ui.components.ZoomableImageDialog
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreationScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val products by viewModel.products.collectAsState()
    val draftOrder by viewModel.currentDraftOrder.collectAsState()
    val paymentConditions by viewModel.paymentConditions.collectAsState()
    val fiscalConfig by viewModel.fiscalConfig.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale("pt", "BR")) }

    var selectedSupplier by remember { mutableStateOf("") }
    var isSupplierDropdownExpanded by remember { mutableStateOf(false) }
    var condicaoPagamento by remember { mutableStateOf("30/60/90 Dias") }
    var isPaymentDropdownExpanded by remember { mutableStateOf(false) }

    // Lista consolidada de condições de pagamento salvas (BD + padrão do fornecedor + sistema)
    val availablePaymentConditions = remember(paymentConditions, selectedSupplier, suppliers) {
        val list = mutableListOf<PaymentCondition>()
        val seen = mutableSetOf<String>()

        // 1. Condição padrão do fornecedor selecionado no topo
        val supDefault = suppliers.find { it.razaoSocial.equals(selectedSupplier, ignoreCase = true) }?.condicaoPagamentoPadrao
        if (!supDefault.isNullOrBlank()) {
            list.add(PaymentCondition(id = "sup_default", descricao = supDefault, especie = "Fornecedor", padrao = true))
            seen.add(supDefault.trim().lowercase())
        }

        // 2. Condições cadastradas no banco de dados e salvas no sistema
        for (cond in paymentConditions) {
            if (seen.add(cond.descricao.trim().lowercase())) {
                list.add(cond)
            }
        }
        list
    }


    // Estados do Catálogo e Adição
    var showCatalogPicker by remember { mutableStateOf(false) }
    var selectedProductForAdd by remember { mutableStateOf<Product?>(null) }
    var showManualItemDialog by remember { mutableStateOf(false) }

    // Estados de Visão Fiscal e Edição
    var inspectingItemForFiscal by remember { mutableStateOf<OrderItem?>(null) }
    var showFiscalConfigDialog by remember { mutableStateOf(false) }
    var zoomedProductPhoto by remember { mutableStateOf<Pair<String, String>?>(null) }

    val isEditing = draftOrder.header.numeroPedido.isNotBlank()
    val screenTitle = if (isEditing) "Editar ${draftOrder.header.numeroPedido}" else "Novo Pedido de Compras"
    val screenSubtitle = if (isEditing) "Alterar Itens e Condições" else "Cotação em Viagem"

    LaunchedEffect(draftOrder, suppliers) {
        if (draftOrder.header.fornecedor.isNotBlank()) {
            selectedSupplier = draftOrder.header.fornecedor
        } else if (selectedSupplier.isEmpty() && suppliers.isNotEmpty()) {
            selectedSupplier = suppliers.first().razaoSocial
        }
        val cp = draftOrder.header.condicaoPagamento
        if (!cp.isNullOrBlank()) {
            condicaoPagamento = cp
        }
    }

    // Compartilhamento no WhatsApp
    fun shareOrderOnWhatsApp() {
        val supName = selectedSupplier.ifBlank { "Fornecedor Matriz" }
        val sb = StringBuilder()
        sb.appendLine("📋 *PEDIDO DE COMPRA - REDE MEGA 12*")
        sb.appendLine("🏢 Fornecedor: $supName")
        sb.appendLine("📅 Condição: $condicaoPagamento")
        sb.appendLine("📦 Total de Peças: ${draftOrder.totalPecas}")
        sb.appendLine("💰 *TOTAL GERAL: R$ %.2f*".format(draftOrder.totalLiquido))
        sb.appendLine("---")
        sb.appendLine("*ITENS DO PEDIDO:*")
        draftOrder.items.forEachIndexed { idx, item ->
            val desc = item.percentualDesconto
            val ipi = item.ipiAliquota
            sb.appendLine("${idx + 1}. ${item.descricao} (Cód: ${item.codigoInterno})")
            sb.appendLine("   ${item.totalPecas} un (R$ %.2f/un) -> R$ %.2f".format(item.precoCompraUnitario, item.subtotal))
            if (desc > 0 || ipi > 0) {
                sb.appendLine("   Desc: $desc% | IPI: $ipi%")
            }
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

    Scaffold(
        contentWindowInsets = WindowInsets.systemBars,
        topBar = {
            Mega12TopBar(
                title = screenTitle,
                subtitle = screenSubtitle,
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            Surface(
                color = Slate800,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "TOTAL GERAL LÍQUIDO",
                            style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = currencyFormat.format(draftOrder.totalLiquido),
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                        )
                        Text(
                            text = "${draftOrder.totalPecas} peças • ${draftOrder.items.size} itens",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Compartilhar WhatsApp
                        if (draftOrder.items.isNotEmpty()) {
                            IconButton(
                                onClick = { shareOrderOnWhatsApp() },
                                colors = IconButtonDefaults.iconButtonColors(containerColor = Slate700)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Compartilhar", tint = Emerald400)
                            }
                        }

                        // Salvar Pedido
                        Button(
                            onClick = {
                                val supName = selectedSupplier.ifBlank { "Fornecedor Geral" }
                                viewModel.saveDraftOrder(supName, condicaoPagamento) {
                                    onNavigateBack()
                                }
                            },
                            enabled = !isLoading && draftOrder.items.isNotEmpty(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Emerald500,
                                disabledContainerColor = Slate700
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Slate900, modifier = Modifier.size(20.dp))
                            } else {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Slate900)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("SALVAR", fontWeight = FontWeight.Bold, color = Slate900)
                            }
                        }
                    }
                }
            }
        },
        containerColor = Slate900
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Dados do Fornecedor & Condições
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Business, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                            Text(
                                text = "Dados do Fornecedor & Condições",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Seletor de Fornecedor
                        ExposedDropdownMenuBox(
                            expanded = isSupplierDropdownExpanded,
                            onExpandedChange = { isSupplierDropdownExpanded = !isSupplierDropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedSupplier,
                                onValueChange = { selectedSupplier = it },
                                label = { Text("Nome do Fornecedor / Fabricante") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isSupplierDropdownExpanded) },
                                colors = mega12TextFieldColors(containerColor = Slate800),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable, true)
                            )

                            ExposedDropdownMenu(
                                expanded = isSupplierDropdownExpanded,
                                onDismissRequest = { isSupplierDropdownExpanded = false }
                            ) {
                                suppliers.forEach { sup ->
                                    DropdownMenuItem(
                                        text = { Text(sup.razaoSocial) },
                                        onClick = {
                                            selectedSupplier = sup.razaoSocial
                                            if (!sup.condicaoPagamentoPadrao.isNullOrBlank()) {
                                                condicaoPagamento = sup.condicaoPagamentoPadrao
                                            }
                                            isSupplierDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Condição de Pagamento (Dropdown com opções salvas + digitação livre)
                        ExposedDropdownMenuBox(
                            expanded = isPaymentDropdownExpanded,
                            onExpandedChange = { isPaymentDropdownExpanded = !isPaymentDropdownExpanded },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedTextField(
                                value = condicaoPagamento,
                                onValueChange = {
                                    condicaoPagamento = it
                                    isPaymentDropdownExpanded = true
                                },
                                label = { Text("Condição de Pagamento") },
                                placeholder = { Text("Selecione ou digite (Ex: 30/60/90 Dias)") },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Payments,
                                        contentDescription = null,
                                        tint = Emerald400,
                                        modifier = Modifier.size(20.dp)
                                    )
                                },
                                trailingIcon = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (condicaoPagamento.isNotBlank()) {
                                            IconButton(
                                                onClick = {
                                                    condicaoPagamento = ""
                                                    isPaymentDropdownExpanded = true
                                                },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Icon(
                                                    Icons.Default.Clear,
                                                    contentDescription = "Limpar",
                                                    tint = Slate400,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = isPaymentDropdownExpanded)
                                    }
                                },
                                singleLine = true,
                                colors = mega12TextFieldColors(containerColor = Slate800),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(MenuAnchorType.PrimaryEditable, enabled = true)
                            )

                            ExposedDropdownMenu(
                                expanded = isPaymentDropdownExpanded,
                                onDismissRequest = { isPaymentDropdownExpanded = false }
                            ) {
                                val filteredConditions = if (condicaoPagamento.isBlank()) {
                                    availablePaymentConditions
                                } else {
                                    val query = condicaoPagamento.trim().lowercase()
                                    val filtered = availablePaymentConditions.filter { it.descricao.lowercase().contains(query) }
                                    if (filtered.isEmpty()) availablePaymentConditions else filtered
                                }

                                if (filteredConditions.isEmpty()) {
                                    DropdownMenuItem(
                                        text = { Text("Nenhuma condição salva encontrada", color = Slate400, fontSize = 13.sp) },
                                        onClick = { isPaymentDropdownExpanded = false }
                                    )
                                } else {
                                    filteredConditions.forEach { cond ->
                                        val isSelected = cond.descricao.equals(condicaoPagamento.trim(), ignoreCase = true)
                                        val isSupDefault = cond.id == "sup_default"

                                        DropdownMenuItem(
                                            leadingIcon = {
                                                Icon(
                                                    imageVector = when {
                                                        isSupDefault -> Icons.Default.Star
                                                        cond.especie?.contains("Depósito", ignoreCase = true) == true ||
                                                        cond.descricao.contains("Vista", ignoreCase = true) -> Icons.Default.AccountBalance
                                                        else -> Icons.Default.CreditCard
                                                    },
                                                    contentDescription = null,
                                                    tint = when {
                                                        isSupDefault -> Amber500
                                                        isSelected -> Emerald400
                                                        else -> Blue500
                                                    },
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            },
                                            text = {
                                                Column {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text(
                                                            text = cond.descricao,
                                                            color = if (isSelected) Emerald400 else MaterialTheme.colorScheme.onSurface,
                                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                            fontSize = 14.sp
                                                        )
                                                        if (isSupDefault) {
                                                            Spacer(modifier = Modifier.width(6.dp))
                                                            Surface(
                                                                shape = RoundedCornerShape(4.dp),
                                                                color = Amber500.copy(alpha = 0.15f)
                                                            ) {
                                                                Text(
                                                                    text = "Fornecedor",
                                                                    color = Amber500,
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                                )
                                                            }
                                                        } else if (cond.padrao) {
                                                            Spacer(modifier = Modifier.width(6.dp))
                                                            Surface(
                                                                shape = RoundedCornerShape(4.dp),
                                                                color = Emerald400.copy(alpha = 0.15f)
                                                            ) {
                                                                Text(
                                                                    text = "Padrão",
                                                                    color = Emerald400,
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                                )
                                                            }
                                                        }
                                                    }
                                                    val details = buildString {
                                                        if (cond.qtdParcelas > 1) {
                                                            append("${cond.qtdParcelas}x")
                                                        }
                                                        if (!cond.especie.isNullOrBlank()) {
                                                            if (isNotEmpty()) append(" • ")
                                                            append(cond.especie)
                                                        }
                                                        if (!cond.observacao.isNullOrBlank()) {
                                                            if (isNotEmpty()) append(" • ")
                                                            append(cond.observacao)
                                                        }
                                                    }
                                                    if (details.isNotBlank()) {
                                                        Text(
                                                            text = details,
                                                            color = Slate400,
                                                            fontSize = 11.sp
                                                        )
                                                    }
                                                }
                                            },
                                            onClick = {
                                                condicaoPagamento = cond.descricao
                                                isPaymentDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }


                        Spacer(modifier = Modifier.height(10.dp))

                        // Botão de Parâmetros Fiscais da Cotação
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Custos Fixos: ${(fiscalConfig.custosFixos * 100).toInt()}% • ICMS: ${(fiscalConfig.icmsAliquota * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                            )

                            TextButton(
                                onClick = { showFiscalConfigDialog = true },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Icon(Icons.Default.Tune, contentDescription = null, tint = Emerald400, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Ajustar Parâmetros Fiscais", color = Emerald400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // 2. Cabeçalho de Itens & Botões de Ação
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Itens do Pedido (${draftOrder.items.size})",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                        if (draftOrder.items.isNotEmpty()) {
                            Text(
                                text = "${draftOrder.totalPecas} peças • ${currencyFormat.format(draftOrder.totalLiquido)}",
                                style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontSize = 11.sp)
                            )
                        }
                    }

                    // Botão Principal: Abrir Catálogo
                    Button(
                        onClick = { showCatalogPicker = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp), tint = Slate900)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Catálogo", fontWeight = FontWeight.Bold, color = Slate900, fontSize = 13.sp)
                    }
                }
            }

            // 3. Lista de Itens no Pedido
            if (draftOrder.items.isEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = Emerald400, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Nenhum produto no pedido ainda",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Abra o catálogo igual ao sistema web para buscar e ir adicionando produtos com agilidade.",
                                color = Slate400,
                                style = MaterialTheme.typography.bodySmall,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(18.dp))
                            Button(
                                onClick = { showCatalogPicker = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = Slate900)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Abrir Catálogo de Produtos", fontWeight = FontWeight.Bold, color = Slate900)
                            }
                        }
                    }
                }
            } else {
                items(draftOrder.items) { item ->
                    val pcsPerBox = if (item.qtdPorCaixa > 0) item.qtdPorCaixa else 12
                    val boxes = (item.totalPecas / pcsPerBox).coerceAtLeast(1)

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { inspectingItemForFiscal = item }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Foto do Produto no Pedido
                                ProductThumbnail(
                                    imageUrl = item.photoUrl,
                                    contentDescription = item.descricao,
                                    modifier = Modifier.size(52.dp),
                                    onClick = if (!item.photoUrl.isNullOrBlank()) {
                                        { zoomedProductPhoto = Pair(item.photoUrl, item.descricao) }
                                    } else null
                                )

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.descricao,
                                        style = MaterialTheme.typography.titleSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )
                                    val codInt = item.codigoInterno.ifBlank { item.codigo }
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        if (codInt.isNotBlank()) {
                                            Text(
                                                text = "Cód: $codInt",
                                                style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                            )
                                        }
                                        if (!item.codigoFornecedor.isNullOrBlank()) {
                                            Text(
                                                text = "• Ref: ${item.codigoFornecedor}",
                                                style = MaterialTheme.typography.labelSmall.copy(color = Amber400)
                                            )
                                        }
                                        Text(
                                            text = "• PDV: R$ %.2f".format(item.pdvAlvo),
                                            style = MaterialTheme.typography.labelSmall.copy(color = Slate400)
                                        )
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = currencyFormat.format(item.subtotal),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Emerald400
                                        )
                                    )
                                    IconButton(
                                        onClick = { viewModel.removeItemFromDraftOrder(item.id) },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Remover", tint = Rose500, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Controles Rápidos de Caixas e Margem
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Stepper de caixas direto no card
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    IconButton(
                                        onClick = { viewModel.adjustItemBoxesInDraftOrder(item.id, -1) },
                                        modifier = Modifier
                                            .size(28.dp)
                                            .background(Slate700, CircleShape)
                                    ) {
                                        Icon(Icons.Default.Remove, contentDescription = "-1 cx", tint = Color.White, modifier = Modifier.size(14.dp))
                                    }

                                    Surface(
                                        color = Slate900,
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.padding(horizontal = 4.dp)
                                    ) {
                                        Text(
                                            text = "$boxes cx (${item.totalPecas} un)",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }

                                    IconButton(
                                        onClick = { viewModel.adjustItemBoxesInDraftOrder(item.id, 1) },
                                        modifier = Modifier
                                            .size(28.dp)
                                            .background(Slate700, CircleShape)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = "+1 cx", tint = Color.White, modifier = Modifier.size(14.dp))
                                    }
                                }

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "R$ %.2f/un".format(item.precoCompraUnitario),
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                    )

                                    // Toque no badge para abrir a memória de cálculo e poder editar
                                    Box(modifier = Modifier.clickable { inspectingItemForFiscal = item }) {
                                        MarginBadge(margin = item.margemCalculada)
                                    }
                                }
                            }
                        }
                    }
                }

                // Botão de Adicionar Mais Itens ao final da lista
                item {
                    OutlinedButton(
                        onClick = { showCatalogPicker = true },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Emerald400),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Emerald500),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("+ Adicionar Mais Produtos do Catálogo", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // =========================================================================
    // MODAL DE CATÁLOGO COMPLETO (IGUAL AO SITE)
    // =========================================================================
    if (showCatalogPicker) {
        CatalogPickerModal(
            products = products,
            draftItems = draftOrder.items,
            selectedSupplierName = selectedSupplier,
            onDismiss = { showCatalogPicker = false },
            onSelectProduct = { prod ->
                selectedProductForAdd = prod
            },
            onOpenManualItem = {
                showManualItemDialog = true
            },
            totalLiquido = draftOrder.totalLiquido,
            totalPecas = draftOrder.totalPecas
        )
    }

    // =========================================================================
    // DIÁLOGO DE ESCOLHA DE QUANTIDADE / MOTOR FISCAL DO PRODUTO SELECIONADO
    // =========================================================================
    selectedProductForAdd?.let { prod ->
        ProductQuantityDialog(
            product = prod,
            fiscalConfig = fiscalConfig,
            existingItem = draftOrder.items.find {
                it.codigoInterno.equals(prod.codigoInterno, ignoreCase = true) ||
                (it.codigo.isNotBlank() && it.codigo.equals(prod.codigo, ignoreCase = true))
            },
            onDismiss = { selectedProductForAdd = null },
            onConfirm = { boxes, preco, desc, ipi, pdv ->
                val pcsPorCaixa = if (prod.qtdPorPacote > 0) prod.qtdPorPacote else 12
                val totalUnidades = boxes * pcsPorCaixa

                val existing = draftOrder.items.find {
                    it.codigoInterno.equals(prod.codigoInterno, ignoreCase = true) ||
                    (it.codigo.isNotBlank() && it.codigo.equals(prod.codigo, ignoreCase = true))
                }

                if (existing != null) {
                    // Atualiza item existente no pedido
                    viewModel.updateDraftOrderItem(
                        itemId = existing.id,
                        totalUnidades = totalUnidades,
                        precoCompra = preco,
                        pdvAlvo = pdv,
                        ipiAliquota = ipi,
                        percentualDesconto = desc,
                        qtdPorCaixa = pcsPorCaixa
                    )
                } else {
                    // Adiciona novo item ao pedido
                    viewModel.addItemToDraftOrder(
                        descricao = prod.descricao,
                        codigo = prod.codigoInterno.ifBlank { prod.codigo },
                        codigoInterno = prod.codigoInterno.ifBlank { prod.codigo },
                        codigoFornecedor = prod.codigoFornecedor,
                        totalUnidades = totalUnidades,
                        precoCompra = preco,
                        pdvAlvo = pdv,
                        ipiAliquota = ipi,
                        percentualDesconto = desc,
                        qtdPorCaixa = pcsPorCaixa,
                        photoUrl = prod.fotoUrl
                    )
                }
                selectedProductForAdd = null
            }
        )
    }

    // =========================================================================
    // DIÁLOGO DE DETALHAMENTO FISCAL & EDIÇÃO DO ITEM (MEMÓRIA DE CÁLCULO)
    // =========================================================================
    inspectingItemForFiscal?.let { item ->
        ItemFiscalDetailDialog(
            item = item,
            fiscalConfig = fiscalConfig,
            onDismiss = { inspectingItemForFiscal = null },
            onSave = { newBoxes, newPreco, newDesc, newIpi, newPdv ->
                val pcsPorCaixa = if (item.qtdPorCaixa > 0) item.qtdPorCaixa else 12
                val newTotalPcs = newBoxes * pcsPorCaixa
                viewModel.updateDraftOrderItem(
                    itemId = item.id,
                    totalUnidades = newTotalPcs,
                    precoCompra = newPreco,
                    pdvAlvo = newPdv,
                    ipiAliquota = newIpi,
                    percentualDesconto = newDesc,
                    qtdPorCaixa = pcsPorCaixa
                )
                inspectingItemForFiscal = null
            }
        )
    }

    // =========================================================================
    // MODAL DE CONFIGURAÇÃO DOS PARÂMETROS FISCAIS DA COTAÇÃO
    // =========================================================================
    if (showFiscalConfigDialog) {
        FiscalConfigDialog(
            currentConfig = fiscalConfig,
            onDismiss = { showFiscalConfigDialog = false },
            onApply = { newConfig ->
                viewModel.setFiscalConfig(newConfig)
                showFiscalConfigDialog = false
            }
        )
    }

    // =========================================================================
    // DIÁLOGO DE ITEM MANUAL FORA DO CATÁLOGO (CASO PRECISE DIGITAR)
    // =========================================================================
    if (showManualItemDialog) {
        ManualItemDialog(
            fiscalConfig = fiscalConfig,
            onDismiss = { showManualItemDialog = false },
            onConfirm = { desc, cod, caixas, pcsPorCx, preco, descPct, ipi, pdv, foto ->
                val totalUnidades = caixas * pcsPorCx
                viewModel.addItemToDraftOrder(
                    descricao = desc,
                    codigo = cod,
                    codigoInterno = cod,
                    totalUnidades = totalUnidades,
                    precoCompra = preco,
                    pdvAlvo = pdv,
                    ipiAliquota = ipi,
                    percentualDesconto = descPct,
                    qtdPorCaixa = pcsPorCx,
                    photoUrl = foto
                )
                showManualItemDialog = false
            }
        )
    }

    // Modal de Zoom da Foto do Produto
    zoomedProductPhoto?.let { (url, title) ->
        ZoomableImageDialog(
            imageUrl = url,
            title = title,
            onDismiss = { zoomedProductPhoto = null }
        )
    }
}

// =============================================================================
// COMPONENTE: MODAL FULL-SCREEN DO CATÁLOGO (EXPERIÊNCIA IGUAL AO SITE)
// =============================================================================
@Composable
private fun CatalogPickerModal(
    products: List<Product>,
    draftItems: List<OrderItem>,
    selectedSupplierName: String,
    onDismiss: () -> Unit,
    onSelectProduct: (Product) -> Unit,
    onOpenManualItem: () -> Unit,
    totalLiquido: Double,
    totalPecas: Int
) {
    var searchQuery by remember { mutableStateOf("") }
    var filterOnlySelectedSupplier by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf("TODAS") }

    val currencyFormat = remember { NumberFormat.getCurrencyInstance(Locale("pt", "BR")) }

    // Categorias únicas com higienização estrita de strings e prevenção total a nulos
    val categories = remember(products) {
        val uniqueCats = products
            .mapNotNull { it.categoria?.trim() }
            .filter { it.isNotBlank() }
            .distinct()
            .sorted()
        if (uniqueCats.isNotEmpty()) listOf("TODAS") + uniqueCats else emptyList()
    }

    val catalogListState = rememberLazyListState()

    // Reseta a rolagem da lista com segurança ao alternar categorias ou filtros
    LaunchedEffect(selectedCategory, filterOnlySelectedSupplier, searchQuery) {
        try {
            catalogListState.scrollToItem(0)
        } catch (_: Exception) {}
    }

    // Produtos Filtrados com segurança absoluta contra nulos
    val filteredProducts = remember(products, searchQuery, filterOnlySelectedSupplier, selectedCategory) {
        val q = searchQuery.trim().lowercase()
        val cat = selectedCategory.trim().lowercase()
        val supplierFilter = if (filterOnlySelectedSupplier && selectedSupplierName.isNotBlank()) {
            selectedSupplierName.trim().lowercase()
        } else null

        products.filter { prod ->
            val matchSearch = if (q.isBlank()) true else {
                (prod.descricao.lowercase().contains(q)) ||
                (prod.codigoInterno.lowercase().contains(q)) ||
                (prod.codigo.lowercase().contains(q)) ||
                (prod.codigoBarras?.lowercase()?.contains(q) == true) ||
                (prod.eanBarcode?.lowercase()?.contains(q) == true) ||
                (prod.fornecedorPadraoNome?.lowercase()?.contains(q) == true) ||
                (prod.categoria?.lowercase()?.contains(q) == true)
            }

            val matchSupplier = if (supplierFilter == null) true else {
                prod.fornecedorPadraoNome?.lowercase()?.contains(supplierFilter) == true
            }

            val matchCategory = if (cat == "todas" || cat.isBlank()) true else {
                prod.categoria?.trim()?.equals(selectedCategory.trim(), ignoreCase = true) == true
            }

            matchSearch && matchSupplier && matchCategory
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding(),
            color = Slate900
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header do Modal do Catálogo
                Surface(
                    color = Slate800,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                IconButton(
                                    onClick = onDismiss,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = Color.White)
                                }
                                Column {
                                    Text(
                                        text = "Catálogo de Produtos",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )
                                    Text(
                                        text = "${filteredProducts.size} produtos disponíveis",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                    )
                                }
                            }

                            // Contador de itens já no pedido
                            Surface(
                                color = if (draftItems.isNotEmpty()) Emerald500.copy(alpha = 0.2f) else Slate700,
                                shape = RoundedCornerShape(20.dp),
                                border = if (draftItems.isNotEmpty()) androidx.compose.foundation.BorderStroke(1.dp, Emerald500) else null
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = null,
                                        tint = if (draftItems.isNotEmpty()) Emerald400 else Slate400,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "${draftItems.size} no pedido",
                                        color = if (draftItems.isNotEmpty()) Emerald400 else Slate300,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Barra de Pesquisa Rápida
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Buscar no catálogo (nome, código, ref)...", color = Slate300, fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Emerald400) },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { searchQuery = "" }) {
                                        Icon(Icons.Default.Clear, contentDescription = "Limpar", tint = Slate300)
                                    }
                                }
                            },
                            singleLine = true,
                            colors = mega12TextFieldColors(containerColor = Slate900),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Linha de Filtros (Fornecedor e Categorias)
                        if (selectedSupplierName.isNotBlank() || categories.size > 1) {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                // Filtro rápido do fornecedor selecionado no cabeçalho
                                if (selectedSupplierName.isNotBlank()) {
                                    item {
                                        FilterChip(
                                            selected = filterOnlySelectedSupplier,
                                            onClick = { filterOnlySelectedSupplier = !filterOnlySelectedSupplier },
                                            label = {
                                                Text(
                                                    text = "🏢 $selectedSupplierName",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = Emerald500,
                                                selectedLabelColor = Slate900,
                                                containerColor = Slate700,
                                                labelColor = Slate300
                                            )
                                        )
                                    }
                                }

                                // Categorias (exibidas apenas quando existirem opções válidas)
                                if (categories.size > 1) {
                                    items(categories) { cat ->
                                        val isCatSelected = selectedCategory.equals(cat, ignoreCase = true)
                                        FilterChip(
                                            selected = isCatSelected,
                                            onClick = {
                                                selectedCategory = if (isCatSelected && cat != "TODAS") "TODAS" else cat
                                            },
                                            label = { Text(cat, fontSize = 11.sp) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = Emerald500,
                                                selectedLabelColor = Slate900,
                                                containerColor = Slate700,
                                                labelColor = Slate300
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Sub-barra: Botão de Item Manual fora do Catálogo
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Toque em um produto para adicionar",
                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                    )

                    TextButton(
                        onClick = onOpenManualItem,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Emerald400, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Item Fora do Catálogo", color = Emerald400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                // Lista de Produtos do Catálogo
                if (filteredProducts.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.SearchOff, contentDescription = null, tint = Slate600, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Nenhum produto encontrado", color = Slate300, fontWeight = FontWeight.Bold)
                            Text("Tente buscar por outro termo ou cadastre um item avulso", color = Slate500, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(14.dp))
                            OutlinedButton(onClick = onOpenManualItem) {
                                Text("+ Digitar Item Fora do Catálogo", color = Emerald400)
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        state = catalogListState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredProducts) { prod ->
                            val existingInDraft = draftItems.find {
                                (!it.codigoInterno.isNullOrBlank() && it.codigoInterno.equals(prod.codigoInterno, ignoreCase = true)) ||
                                (!it.codigo.isNullOrBlank() && it.codigo.equals(prod.codigo, ignoreCase = true)) ||
                                (!it.id.isNullOrBlank() && it.id.equals(prod.id, ignoreCase = true))
                            }

                            Card(
                                colors = CardDefaults.cardColors(containerColor = Slate800),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelectProduct(prod) }
                                    .then(
                                        if (existingInDraft != null) {
                                            Modifier.border(1.dp, Emerald500.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                        } else Modifier
                                    )
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    // Linha Superior: Descrição e Código
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        // Foto do Produto no Catálogo
                                        ProductThumbnail(
                                            imageUrl = prod.fotoUrl,
                                            contentDescription = prod.descricao,
                                            modifier = Modifier.size(54.dp)
                                        )

                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = prod.descricao,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                fontSize = 14.sp
                                            )
                                            val cod = prod.codigoInterno.ifBlank { prod.codigo }
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "Cód: $cod",
                                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                                )
                                                Text(
                                                    text = "• Emb: ${prod.qtdPorPacote} un/cx",
                                                    style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                )
                                            }
                                            if (!prod.fornecedorPadraoNome.isNullOrBlank()) {
                                                Text(
                                                    text = "🏢 ${prod.fornecedorPadraoNome}",
                                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 10.sp)
                                                )
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // Linha Inferior: Preços e Botão de Ação
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text("Compra:", color = Slate400, fontSize = 11.sp)
                                                Text(
                                                    text = currencyFormat.format(prod.precoUnitarioPadrao),
                                                    fontWeight = FontWeight.Bold,
                                                    color = Emerald400,
                                                    fontSize = 15.sp
                                                )
                                            }
                                            Text(
                                                text = "PDV Sugerido: ${currencyFormat.format(prod.pdvSugerido)}",
                                                style = MaterialTheme.typography.labelSmall.copy(color = Amber400, fontSize = 10.sp)
                                            )
                                        }

                                        // Botão Adicionar ou Indicador de "Já no Pedido"
                                        if (existingInDraft != null) {
                                            val pcsPerBox = if (prod.qtdPorPacote > 0) prod.qtdPorPacote else 12
                                            val boxes = (existingInDraft.totalPecas / pcsPerBox).coerceAtLeast(1)
                                            Button(
                                                onClick = { onSelectProduct(prod) },
                                                colors = ButtonDefaults.buttonColors(containerColor = Slate700),
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Icon(Icons.Default.Check, contentDescription = null, tint = Emerald400, modifier = Modifier.size(14.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("$boxes cx no pedido", color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                            }
                                        } else {
                                            Button(
                                                onClick = { onSelectProduct(prod) },
                                                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = null, tint = Slate900, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Adicionar", color = Slate900, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        item { Spacer(modifier = Modifier.height(10.dp)) }
                    }
                }

                // Barra Inferior Fixa com Resumo do Pedido e Botão Concluir
                Surface(
                    color = Slate800,
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "TOTAL DO PEDIDO",
                                style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            )
                            Text(
                                text = currencyFormat.format(totalLiquido),
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                            )
                            Text(
                                text = "$totalPecas peças • ${draftItems.size} itens",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                            )
                        }

                        Button(
                            onClick = onDismiss,
                            colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Slate900)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Concluir e Ver Pedido", fontWeight = FontWeight.Bold, color = Slate900)
                        }
                    }
                }
            }
        }
    }
}

// =============================================================================
// COMPONENTE: DIÁLOGO DE ESCOLHA DE QUANTIDADE (CAIXAS) E CÁLCULO FISCAL
// =============================================================================
@Composable
private fun ProductQuantityDialog(
    product: Product,
    fiscalConfig: FiscalConfig,
    existingItem: OrderItem?,
    onDismiss: () -> Unit,
    onConfirm: (boxes: Int, precoCompra: Double, descPct: Double, ipiPct: Double, pdv: Double) -> Unit
) {
    val pcsPorCaixa = if (product.qtdPorPacote > 0) product.qtdPorPacote else 12
    val initialBoxes = if (existingItem != null) {
        (existingItem.totalPecas / pcsPorCaixa).coerceAtLeast(1)
    } else 10

    var boxesCount by remember { mutableStateOf(initialBoxes) }
    var precoCompraStr by remember {
        mutableStateOf(
            if (existingItem != null) "%.2f".format(Locale.US, existingItem.precoCompraUnitario)
            else "%.2f".format(Locale.US, product.precoUnitarioPadrao)
        )
    }
    var descStr by remember {
        mutableStateOf(
            if (existingItem != null) existingItem.percentualDesconto.toString() else "0.0"
        )
    }
    var ipiStr by remember {
        mutableStateOf(
            if (existingItem != null) existingItem.ipiAliquota.toString() else "0.0"
        )
    }
    var pdvStr by remember {
        mutableStateOf(
            if (existingItem != null) "%.2f".format(Locale.US, existingItem.pdvAlvo)
            else "%.2f".format(Locale.US, product.pdvSugerido)
        )
    }

    // Cálculos em tempo real
    val totalPcs = boxesCount * pcsPorCaixa
    val preco = precoCompraStr.toDoubleOrNull() ?: 0.0
    val desc = descStr.toDoubleOrNull() ?: 0.0
    val ipi = ipiStr.toDoubleOrNull() ?: 0.0
    val pdv = pdvStr.toDoubleOrNull() ?: 12.0

    val valorBruto = totalPcs * preco
    val valorDesc = valorBruto * (desc / 100.0)
    val valorIpi = (valorBruto - valorDesc) * (ipi / 100.0)
    val subtotal = valorBruto - valorDesc + valorIpi
    val custoEfetivo = if (totalPcs > 0) subtotal / totalPcs else preco
    val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, pdv, fiscalConfig)

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header do Item
                Column {
                    Text(
                        text = product.descricao,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                    )
                    Text(
                        text = "Cód: ${product.codigoInterno.ifBlank { product.codigo }} • Embalagem: $pcsPorCaixa un/caixa",
                        style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                    )
                }

                HorizontalDivider(color = Slate800)

                // 1. Controle de Caixas (Stepper Ergonômico)
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "QUANTIDADE DE CAIXAS",
                        style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        IconButton(
                            onClick = { if (boxesCount > 1) boxesCount-- },
                            modifier = Modifier
                                .size(40.dp)
                                .background(Slate800, CircleShape)
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "-1 cx", tint = Color.White)
                        }

                        Surface(
                            color = Slate800,
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Emerald500),
                            modifier = Modifier.width(110.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "$boxesCount",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text("caixas", fontSize = 11.sp, color = Emerald400, fontWeight = FontWeight.Bold)
                            }
                        }

                        IconButton(
                            onClick = { boxesCount++ },
                            modifier = Modifier
                                .size(40.dp)
                                .background(Slate800, CircleShape)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "+1 cx", tint = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Chips de incremento rápido
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(5, 10, 20, 50).forEach { preset ->
                            Surface(
                                color = if (boxesCount == preset) Emerald500 else Slate800,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { boxesCount = preset }
                            ) {
                                Text(
                                    text = "$preset cx",
                                    color = if (boxesCount == preset) Slate900 else Slate300,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "= $totalPcs peças no total ($boxesCount cx × $pcsPorCaixa un)",
                        color = Slate400,
                        fontSize = 11.sp
                    )
                }

                // 2. Preço de Compra e PDV
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = precoCompraStr,
                        onValueChange = { precoCompraStr = it },
                        label = { Text("Preço Compra (R$)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = pdvStr,
                        onValueChange = { pdvStr = it },
                        label = { Text("PDV Sugerido (R$)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                }

                // 3. Desconto % e IPI %
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = descStr,
                        onValueChange = { descStr = it },
                        label = { Text("Desc %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = ipiStr,
                        onValueChange = { ipiStr = it },
                        label = { Text("IPI %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                }

                // 4. Card de Resultado Fiscal em Tempo Real
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Subtotal Líquido:", color = Slate400, fontSize = 12.sp)
                            Text(
                                text = "R$ %.2f".format(subtotal),
                                color = Emerald400,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Custo Real Efetivo: R$ %.2f/un".format(custoEfetivo), color = Slate400, fontSize = 11.sp)
                            MarginBadge(margin = fiscal.margemPercentual)
                        }
                    }
                }

                // Botões de Ação
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate400),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Cancelar")
                    }

                    Button(
                        onClick = {
                            onConfirm(boxesCount, preco, desc, ipi, pdv)
                        },
                        enabled = boxesCount > 0 && preco > 0,
                        modifier = Modifier.weight(1.5f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Slate900)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (existingItem != null) "Atualizar" else "Adicionar ao Pedido",
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }
                }
            }
        }
    }
}

// =============================================================================
// COMPONENTE: MODAL DE MEMÓRIA DE CÁLCULO FISCAL DETALHADA E EDIÇÃO DO ITEM
// =============================================================================
@Composable
private fun ItemFiscalDetailDialog(
    item: OrderItem,
    fiscalConfig: FiscalConfig,
    onDismiss: () -> Unit,
    onSave: (boxes: Int, precoCompra: Double, descPct: Double, ipiPct: Double, pdv: Double) -> Unit
) {
    val pcsPorCaixa = if (item.qtdPorCaixa > 0) item.qtdPorCaixa else 12
    val initialBoxes = (item.totalPecas / pcsPorCaixa).coerceAtLeast(1)

    var boxesCount by remember { mutableStateOf(initialBoxes) }
    var precoCompraStr by remember { mutableStateOf("%.2f".format(Locale.US, item.precoCompraUnitario)) }
    var pdvStr by remember { mutableStateOf("%.2f".format(Locale.US, item.pdvAlvo)) }
    var descStr by remember { mutableStateOf(item.percentualDesconto.toString()) }
    var ipiStr by remember { mutableStateOf(item.ipiAliquota.toString()) }

    val preco = precoCompraStr.toDoubleOrNull() ?: 0.0
    val pdv = pdvStr.toDoubleOrNull() ?: 12.0
    val desc = descStr.toDoubleOrNull() ?: 0.0
    val ipi = ipiStr.toDoubleOrNull() ?: 0.0
    val totalPcs = boxesCount * pcsPorCaixa

    val valorBruto = totalPcs * preco
    val valorDesc = valorBruto * (desc / 100.0)
    val valorIpi = (valorBruto - valorDesc) * (ipi / 100.0)
    val subtotal = valorBruto - valorDesc + valorIpi
    val custoEfetivo = if (totalPcs > 0) subtotal / totalPcs else preco
    val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, pdv, fiscalConfig)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.92f),
            shape = RoundedCornerShape(20.dp),
            color = Slate900
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
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
                            text = "Memória de Cálculo & Custos",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                        )
                        Text(
                            text = "${item.descricao} (Cód: ${item.codigoInterno.ifBlank { item.codigo }})",
                            style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Slate400)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Tabela Detalhada Passo a Passo
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "DETALHAMENTO DE CUSTOS POR UNIDADE",
                                    style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                                )

                                HorizontalDivider(color = Slate700)

                                // Preço Compra
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Preço Compra Negociado:", color = Slate300, fontSize = 12.sp)
                                    Text("R$ %.2f".format(preco), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }

                                // (-) Crédito ICMS Entrada
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("(-) Crédito ICMS Entrada (${(fiscal.percentualCreditoEntrada * 100).toInt()}%):", color = Emerald400, fontSize = 12.sp)
                                    Text("- R$ %.2f".format(fiscal.creditoIcmsUnit), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }

                                // (+) Custos Fixos de Loja
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("(+) Custos Fixos Loja (${(fiscal.custosFixosAliquota * 100).toInt()}% s/ PDV):", color = Amber400, fontSize = 12.sp)
                                    Text("+ R$ %.2f".format(fiscal.custoFixoUnit), color = Amber400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }

                                // (+) ICMS Saída
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("(+) ICMS Saída (${(fiscal.icmsSaidaAliquota * 100).toInt()}% s/ PDV):", color = Slate300, fontSize = 12.sp)
                                    Text("+ R$ %.2f".format(fiscal.icmsSaidaUnit), color = Slate300, fontSize = 12.sp)
                                }

                                // (+) PIS / COFINS
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("(+) PIS / COFINS (${(fiscal.pisCofinsAliquota * 100).toInt()}% s/ PDV):", color = Slate300, fontSize = 12.sp)
                                    Text("+ R$ %.2f".format(fiscal.pisCofinsUnit), color = Slate300, fontSize = 12.sp)
                                }

                                HorizontalDivider(color = Slate700)

                                // Custo Real Efetivo
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Custo Real Total da Loja:", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("R$ %.2f / un".format(fiscal.custoRealEfetivo), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }

                                // PDV Alvo
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Preço de Venda (PDV Alvo):", color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("R$ %.2f / un".format(pdv), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }

                                // Margem Líquida Unitária
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Lucro Líquido Unitário:", color = Slate300, fontSize = 12.sp)
                                        Text(
                                            text = "R$ %.2f / unidade".format(fiscal.margemRealUnit),
                                            color = if (fiscal.margemRealUnit > 0) Emerald400 else Rose500,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                    MarginBadge(margin = fiscal.margemPercentual)
                                }
                            }
                        }
                    }

                    // 2. Formulário de Edição Imediata do Item
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(
                                    text = "AJUSTAR VALORES DO PRODUTO",
                                    style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                                )

                                // PDV Alvo (Preço de Venda)
                                OutlinedTextField(
                                    value = pdvStr,
                                    onValueChange = { pdvStr = it },
                                    label = { Text("PDV Sugerido de Venda (R$)") },
                                    supportingText = { Text("Aumentar o PDV aumenta a margem na hora", color = Slate300) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    singleLine = true,
                                    colors = mega12TextFieldColors(containerColor = Slate800),
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Preço Compra e Caixas
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = precoCompraStr,
                                        onValueChange = { precoCompraStr = it },
                                        label = { Text("Preço Compra (R$)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        colors = mega12TextFieldColors(containerColor = Slate800),
                                        modifier = Modifier.weight(1f)
                                    )

                                    // Stepper Caixas
                                    Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Qtd Caixas", color = Slate300, fontSize = 11.sp)
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            IconButton(
                                                onClick = { if (boxesCount > 1) boxesCount-- },
                                                modifier = Modifier.size(32.dp).background(Slate700, CircleShape)
                                            ) {
                                                Icon(Icons.Default.Remove, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                            }
                                            Text(
                                                text = "$boxesCount cx",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp
                                            )
                                            IconButton(
                                                onClick = { boxesCount++ },
                                                modifier = Modifier.size(32.dp).background(Slate700, CircleShape)
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }

                                // Desconto e IPI
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = descStr,
                                        onValueChange = { descStr = it },
                                        label = { Text("Desc %") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        colors = mega12TextFieldColors(containerColor = Slate800),
                                        modifier = Modifier.weight(1f)
                                    )

                                    OutlinedTextField(
                                        value = ipiStr,
                                        onValueChange = { ipiStr = it },
                                        label = { Text("IPI %") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        colors = mega12TextFieldColors(containerColor = Slate800),
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Botões de Ação
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate400)
                    ) {
                        Text("Cancelar")
                    }

                    Button(
                        onClick = {
                            onSave(boxesCount, preco, desc, ipi, pdv)
                        },
                        enabled = boxesCount > 0 && preco > 0 && pdv > 0,
                        modifier = Modifier.weight(1.5f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Slate900)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Salvar Alterações", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// =============================================================================
// COMPONENTE: MODAL PARA AJUSTAR PARÂMETROS FISCAIS DA COTAÇÃO
// =============================================================================
@Composable
private fun FiscalConfigDialog(
    currentConfig: FiscalConfig,
    onDismiss: () -> Unit,
    onApply: (FiscalConfig) -> Unit
) {
    var custosFixosStr by remember { mutableStateOf("%.1f".format(Locale.US, currentConfig.custosFixos * 100)) }
    var icmsSaidaStr by remember { mutableStateOf("%.1f".format(Locale.US, currentConfig.icmsAliquota * 100)) }
    var pisCofinsStr by remember { mutableStateOf("%.1f".format(Locale.US, currentConfig.pisCofinsAliquota * 100)) }
    var creditoEntradaStr by remember { mutableStateOf("%.1f".format(Locale.US, currentConfig.creditoEntradaICMS * 100)) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Parâmetros Fiscais da Cotação",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Slate400)
                    }
                }

                Text(
                    text = "Ajuste as alíquotas usadas pelo Motor Fiscal para calcular o custo real e a margem de cada produto:",
                    color = Slate400,
                    style = MaterialTheme.typography.bodySmall
                )

                OutlinedTextField(
                    value = custosFixosStr,
                    onValueChange = { custosFixosStr = it },
                    label = { Text("Custos Fixos de Loja (% s/ PDV)") },
                    supportingText = { Text("Padrão: 26.0%", color = Slate300) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = icmsSaidaStr,
                    onValueChange = { icmsSaidaStr = it },
                    label = { Text("ICMS de Saída (% s/ PDV)") },
                    supportingText = { Text("Padrão: 11.0% ou 19.5%", color = Slate300) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = pisCofinsStr,
                    onValueChange = { pisCofinsStr = it },
                    label = { Text("PIS / COFINS / IR (% s/ PDV)") },
                    supportingText = { Text("Padrão: 3.0% ou 6.0%", color = Slate300) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = creditoEntradaStr,
                    onValueChange = { creditoEntradaStr = it },
                    label = { Text("Crédito ICMS Entrada (% s/ Compra)") },
                    supportingText = { Text("Padrão: 19.5% ou 12.0%", color = Slate300) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = {
                            custosFixosStr = "26.0"
                            icmsSaidaStr = "11.0"
                            pisCofinsStr = "3.0"
                            creditoEntradaStr = "19.5"
                        }
                    ) {
                        Text("Restaurar Padrão", color = Slate400, fontSize = 11.sp)
                    }

                    Button(
                        onClick = {
                            val cf = (custosFixosStr.toDoubleOrNull() ?: 26.0) / 100.0
                            val icms = (icmsSaidaStr.toDoubleOrNull() ?: 11.0) / 100.0
                            val pis = (pisCofinsStr.toDoubleOrNull() ?: 3.0) / 100.0
                            val cred = (creditoEntradaStr.toDoubleOrNull() ?: 19.5) / 100.0

                            onApply(
                                currentConfig.copy(
                                    custosFixos = cf,
                                    icmsAliquota = icms,
                                    pisCofinsAliquota = pis,
                                    creditoEntradaICMS = cred
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Aplicar ao Pedido", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// =============================================================================
// COMPONENTE: MODAL PARA CADASTRAR ITEM FORA DO CATÁLOGO (DIGITAÇÃO MANUAL)
// =============================================================================
@Composable
private fun ManualItemDialog(
    fiscalConfig: FiscalConfig,
    onDismiss: () -> Unit,
    onConfirm: (desc: String, cod: String, caixas: Int, pcsPorCx: Int, preco: Double, descPct: Double, ipiPct: Double, pdv: Double, fotoUrl: String?) -> Unit
) {
    var descricao by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var fotoUrl by remember { mutableStateOf("") }
    var caixasStr by remember { mutableStateOf("10") }
    var pcsPorCxStr by remember { mutableStateOf("12") }
    var precoCompraStr by remember { mutableStateOf("10.00") }
    var descStr by remember { mutableStateOf("0.0") }
    var ipiStr by remember { mutableStateOf("0.0") }
    var pdvStr by remember { mutableStateOf("12.00") }

    val caixas = caixasStr.toIntOrNull() ?: 1
    val pcsPorCx = pcsPorCxStr.toIntOrNull() ?: 12
    val totalPcs = caixas * pcsPorCx
    val preco = precoCompraStr.toDoubleOrNull() ?: 0.0
    val desc = descStr.toDoubleOrNull() ?: 0.0
    val ipi = ipiStr.toDoubleOrNull() ?: 0.0
    val pdv = pdvStr.toDoubleOrNull() ?: 12.0

    val valorBruto = totalPcs * preco
    val valorDesc = valorBruto * (desc / 100.0)
    val valorIpi = (valorBruto - valorDesc) * (ipi / 100.0)
    val subtotal = valorBruto - valorDesc + valorIpi
    val custoEfetivo = if (totalPcs > 0) subtotal / totalPcs else preco
    val fiscal = FiscalEngine.calculateItemFiscal(custoEfetivo, pdv, fiscalConfig)

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Item Fora do Catálogo",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                )

                OutlinedTextField(
                    value = descricao,
                    onValueChange = { descricao = it },
                    label = { Text("Descrição do Produto") },
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = codigo,
                    onValueChange = { codigo = it },
                    label = { Text("Código / Referência (opcional)") },
                    singleLine = true,
                    colors = mega12TextFieldColors(containerColor = Slate900),
                    modifier = Modifier.fillMaxWidth()
                )

                // Campo Foto / Caminho da Imagem com Prévia em Tempo Real
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ProductThumbnail(
                        imageUrl = fotoUrl.ifBlank { null },
                        contentDescription = "Prévia da Foto",
                        modifier = Modifier.size(56.dp)
                    )

                    OutlinedTextField(
                        value = fotoUrl,
                        onValueChange = { fotoUrl = it },
                        label = { Text("Foto / Imagem (URL ou Caminho)") },
                        placeholder = { Text("http://... ou /uploads/...", color = Slate400, fontSize = 11.sp) },
                        singleLine = true,
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        trailingIcon = {
                            if (fotoUrl.isNotBlank()) {
                                IconButton(onClick = { fotoUrl = "" }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Limpar foto", tint = Slate300, modifier = Modifier.size(16.dp))
                                }
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = caixasStr,
                        onValueChange = { caixasStr = it },
                        label = { Text("Qtd Caixas") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = pcsPorCxStr,
                        onValueChange = { pcsPorCxStr = it },
                        label = { Text("Pçs/Caixa") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = precoCompraStr,
                        onValueChange = { precoCompraStr = it },
                        label = { Text("Preço Compra") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = descStr,
                        onValueChange = { descStr = it },
                        label = { Text("Desc %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = ipiStr,
                        onValueChange = { ipiStr = it },
                        label = { Text("IPI %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        colors = mega12TextFieldColors(containerColor = Slate900),
                        modifier = Modifier.weight(1f)
                    )
                }

                // Resultado Fiscal
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("$totalPcs Peças Totais", color = Slate300, fontSize = 12.sp)
                            Text("Subtotal: R$ %.2f".format(subtotal), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Custo Real: R$ %.2f/un".format(custoEfetivo), color = Slate400, fontSize = 11.sp)
                            MarginBadge(margin = fiscal.margemPercentual)
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                        Text("Cancelar", color = Slate400)
                    }
                    Button(
                        onClick = {
                            if (descricao.isNotBlank()) {
                                onConfirm(descricao, codigo, caixas, pcsPorCx, preco, desc, ipi, pdv, fotoUrl.ifBlank { null })
                            }
                        },
                        enabled = descricao.isNotBlank() && preco > 0,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Adicionar", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
