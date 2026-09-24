package br.com.mega12.app.ui.screens.buyer

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.domain.FiscalEngine
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreationScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val products by viewModel.products.collectAsState()
    val draftOrder by viewModel.currentDraftOrder.collectAsState()
    val fiscalConfig by viewModel.fiscalConfig.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    var selectedSupplier by remember { mutableStateOf("") }
    var isSupplierDropdownExpanded by remember { mutableStateOf(false) }
    var condicaoPagamento by remember { mutableStateOf("30/60/90 Dias") }

    // Diálogo de Adição de Item
    var showAddItemDialog by remember { mutableStateOf(false) }
    var itemDescricao by remember { mutableStateOf("") }
    var itemCodigoInterno by remember { mutableStateOf("") }
    var itemCodigoFornecedor by remember { mutableStateOf("") }
    var itemCaixas by remember { mutableStateOf("10") }
    var itemQtdPorCaixa by remember { mutableStateOf("12") }
    var itemPrecoCompra by remember { mutableStateOf("10.00") }
    var itemIpiStr by remember { mutableStateOf("0.0") }
    var itemDescStr by remember { mutableStateOf("0.0") }
    var itemPdvAlvo by remember { mutableStateOf("12.00") }

    LaunchedEffect(suppliers) {
        if (selectedSupplier.isEmpty() && suppliers.isNotEmpty()) {
            selectedSupplier = suppliers.first().razaoSocial
        }
    }

    // Função de Compartilhamento no WhatsApp
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
        topBar = {
            Mega12TopBar(
                title = "Novo Pedido de Compras",
                subtitle = "Cotação em Viagem",
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            Surface(
                color = Slate800,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
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
                            text = "R$ %.2f".format(draftOrder.totalLiquido),
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                        )
                        Text(
                            text = "${draftOrder.totalPecas} peças • ${draftOrder.items.size} itens",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Botão Compartilhar WhatsApp
                        if (draftOrder.items.isNotEmpty()) {
                            IconButton(
                                onClick = { shareOrderOnWhatsApp() },
                                colors = IconButtonDefaults.iconButtonColors(containerColor = Slate700)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Compartilhar", tint = Emerald400)
                            }
                        }

                        // Botão Salvar Pedido
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
                                label = { Text("Nome do Fornecedor / Fabricante", color = Slate400) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isSupplierDropdownExpanded) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().menuAnchor()
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

                        OutlinedTextField(
                            value = condicaoPagamento,
                            onValueChange = { condicaoPagamento = it },
                            label = { Text("Condição de Pagamento (Ex: 30/60/90 Dias)", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // 2. Cabeçalho de Itens & Botão Adicionar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Itens do Pedido (${draftOrder.items.size})",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )

                    Button(
                        onClick = { showAddItemDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp), tint = Slate900)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Adicionar Item", fontWeight = FontWeight.Bold, color = Slate900)
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
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Slate600, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Nenhum item adicionado ao pedido", color = Slate300, fontWeight = FontWeight.Bold)
                            Text("Toque em '+ Adicionar Item' acima para incluir produtos", color = Slate500, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            } else {
                items(draftOrder.items) { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
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
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "R$ %.2f".format(item.subtotal),
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

                            Spacer(modifier = Modifier.height(6.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${item.totalPecas} un (R$ %.2f/un)".format(item.precoCompraUnitario),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400, fontSize = 12.sp)
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (item.percentualDesconto > 0) {
                                        Text(text = "Desc: ${item.percentualDesconto}%", color = Emerald400, fontSize = 11.sp)
                                    }
                                    if (item.ipiAliquota > 0) {
                                        Text(text = "IPI: ${item.ipiAliquota}%", color = Amber400, fontSize = 11.sp)
                                    }
                                    MarginBadge(margin = item.margemCalculada)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Modal de Adicionar Item com Motor Fiscal em Tempo Real
        if (showAddItemDialog) {
            val caixas = itemCaixas.toIntOrNull() ?: 1
            val pcsPorCx = itemQtdPorCaixa.toIntOrNull() ?: 12
            val totalPcs = caixas * pcsPorCx
            val precoCompra = itemPrecoCompra.toDoubleOrNull() ?: 0.0
            val ipi = itemIpiStr.toDoubleOrNull() ?: 0.0
            val desc = itemDescStr.toDoubleOrNull() ?: 0.0
            val pdv = itemPdvAlvo.toDoubleOrNull() ?: 12.0

            val valorBruto = totalPcs * precoCompra
            val valorDesc = valorBruto * (desc / 100.0)
            val valorIpi = (valorBruto - valorDesc) * (ipi / 100.0)
            val subtotalCalculado = valorBruto - valorDesc + valorIpi
            val custoEfetivo = if (totalPcs > 0) subtotalCalculado / totalPcs else precoCompra
            val fiscalPreview = FiscalEngine.calculateItemFiscal(custoEfetivo, pdv, fiscalConfig)

            AlertDialog(
                onDismissRequest = { showAddItemDialog = false },
                title = { Text("Adicionar Item com Motor Fiscal", color = Color.White, fontWeight = FontWeight.Bold) },
                containerColor = Slate800,
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Chips de Produtos do Catálogo
                        if (products.isNotEmpty()) {
                            Text("Selecionar do Catálogo:", color = Slate400, style = MaterialTheme.typography.labelSmall)
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(products.take(6)) { prod ->
                                    Surface(
                                        color = Slate700,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.clickable {
                                            itemDescricao = prod.descricao
                                            itemCodigoInterno = prod.codigoInterno.ifBlank { prod.codigo }
                                            itemCodigoFornecedor = prod.codigoFornecedor ?: ""
                                            itemQtdPorCaixa = prod.qtdPorPacote.toString()
                                            itemPrecoCompra = "%.2f".format(prod.precoUnitarioPadrao).replace(',', '.')
                                        }
                                    ) {
                                        Text(
                                            text = prod.descricao.take(18) + "...",
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                        )
                                    }
                                }
                            }
                        }

                        OutlinedTextField(
                            value = itemDescricao,
                            onValueChange = { itemDescricao = it },
                            label = { Text("Descrição do Produto", color = Slate400) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Caixas e Peças por Caixa
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = itemCaixas,
                                onValueChange = { itemCaixas = it },
                                label = { Text("Qtd Caixas") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemQtdPorCaixa,
                                onValueChange = { itemQtdPorCaixa = it },
                                label = { Text("Pçs/Caixa") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Preço de Compra, Desconto e IPI
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = itemPrecoCompra,
                                onValueChange = { itemPrecoCompra = it },
                                label = { Text("Preço Compra") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemDescStr,
                                onValueChange = { itemDescStr = it },
                                label = { Text("Desc %") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemIpiStr,
                                onValueChange = { itemIpiStr = it },
                                label = { Text("IPI %") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Card com o Resultado Fiscal em Tempo Real
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate900),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("$totalPcs Peças Totais", color = Slate300, fontSize = 12.sp)
                                    Text("Subtotal: R$ %.2f".format(subtotalCalculado), color = Emerald400, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Custo Real: R$ %.2f/un".format(custoEfetivo), color = Slate400, fontSize = 11.sp)
                                    MarginBadge(margin = fiscalPreview.margemPercentual)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (itemDescricao.isNotBlank()) {
                                viewModel.addItemToDraftOrder(
                                    descricao = itemDescricao,
                                    codigo = itemCodigoInterno,
                                    codigoInterno = itemCodigoInterno,
                                    codigoFornecedor = itemCodigoFornecedor.ifBlank { null },
                                    totalUnidades = totalPcs,
                                    precoCompra = precoCompra,
                                    pdvAlvo = pdv,
                                    ipiAliquota = ipi,
                                    percentualDesconto = desc,
                                    qtdPorCaixa = pcsPorCx
                                )
                                itemDescricao = ""
                                itemCodigoInterno = ""
                                itemCodigoFornecedor = ""
                                showAddItemDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Adicionar ao Pedido", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAddItemDialog = false }) {
                        Text("Cancelar", color = Slate400)
                    }
                }
            )
        }
    }
}
