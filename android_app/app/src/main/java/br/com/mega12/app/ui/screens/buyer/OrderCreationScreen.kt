package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.ui.components.*
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import coil.compose.AsyncImage
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreationScreen(
    viewModel: Mega12ViewModel,
    onNavigateToCatalogSelection: () -> Unit,
    onNavigateToMatrix: (Int) -> Unit,
    onNavigateBack: () -> Unit
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val draftOrder by viewModel.currentDraftOrder.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val supplierDossier by viewModel.selectedSupplierDossier.collectAsState()

    var selectedSupplier by remember { mutableStateOf(suppliers.firstOrNull()?.razaoSocial ?: "Fornecedor Geral") }
    var nPedido by remember { mutableStateOf("") }
    
    // Condições de Pagamento (Paridade Web: 1x, 2x... e Dias)
    var parcelas by remember { mutableIntStateOf(1) }
    var prazo by remember { mutableStateOf("30") }

    // Dossiê Automático
    LaunchedEffect(selectedSupplier) { viewModel.selectSupplierForBargain(selectedSupplier) }

    // Estados para BottomSheets
    var showFiscalItem by remember { mutableStateOf<Pair<Int, OrderItem>?>(null) }

    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    
    // Cálculo de Totais Líquidos (Paridade Web)
    val brutoTotal = draftOrder.items.sumOf { it.subtotal }
    val descontoVal = (brutoTotal * draftOrder.header.percentualDescontoOff) / 100.0
    val stVal = ((brutoTotal - descontoVal) * draftOrder.header.aliquotaSt) / 100.0
    val totalInvestimentoLiquido = brutoTotal - descontoVal + stVal
    
    val valorBoleto = if (parcelas > 0) totalInvestimentoLiquido / parcelas else 0.0
    val isBoletoExcedente = valorBoleto > 9999.0

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Novo Pedido",
                subtitle = "Rede Mega 12 • Matriz",
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            Surface(color = Slate900, shadowElevation = 12.dp) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text("TOTAL INVESTIMENTO (LÍQ)", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text(currencyFormatter.format(totalInvestimentoLiquido), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = Emerald400)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (draftOrder.items.isNotEmpty()) {
                                IconButton(
                                    onClick = { 
                                        br.com.mega12.app.util.PdfGenerator.generateAndShareOrderPdf(
                                            br.com.mega12.app.Mega12Application.instance,
                                            draftOrder.copy(header = draftOrder.header.copy(fornecedor = selectedSupplier))
                                        )
                                    },
                                    modifier = Modifier.background(Blue500.copy(alpha = 0.2f), CircleShape)
                                ) {
                                    Icon(Icons.Default.Share, "Compartilhar", tint = Blue500)
                                }
                            }
                            Button(
                                onClick = { viewModel.saveDraftOrder(selectedSupplier, "${parcelas}x $prazo dias") { onNavigateBack() } },
                                enabled = draftOrder.items.isNotEmpty() && !isLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("FECHAR PEDIDO", fontWeight = FontWeight.Black, color = Slate900)
                            }
                        }
                    }
                }
            }
        },
        containerColor = Slate50
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Seção 1: Cabeçalho & Fornecedor
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), border = CardDefaults.outlinedCardBorder()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Business, null, tint = Emerald600, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Dados do Fornecedor", fontWeight = FontWeight.Bold)
                        }
                        
                        OutlinedTextField(
                            value = selectedSupplier,
                            onValueChange = { selectedSupplier = it },
                            label = { Text("Razão Social") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )

                        OutlinedTextField(
                            value = nPedido,
                            onValueChange = { nPedido = it },
                            label = { Text("Nº Pedido (Opcional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            placeholder = { Text("Ex: PED-2026") }
                        )
                    }
                }
            }

            // Seção 2: Dossiê (Se existir)
            supplierDossier?.let { dossier ->
                item { BargainDossierComponent(dossier = dossier) }
            }

            // Seção 3: Condições de Pagamento (Paridade Web)
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = if (isBoletoExcedente) Rose100.copy(alpha = 0.3f) else Emerald100.copy(alpha = 0.1f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isBoletoExcedente) Rose500.copy(alpha = 0.5f) else Emerald500.copy(alpha = 0.2f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Condições de Pagamento", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            if (isBoletoExcedente) {
                                Icon(Icons.Default.Warning, null, tint = Rose500, modifier = Modifier.size(18.dp))
                            }
                        }
                        
                        Spacer(Modifier.height(12.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            // Parcelas
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Parcelas", style = MaterialTheme.typography.labelSmall, color = Slate500)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { if (parcelas > 1) parcelas-- }) { Icon(Icons.Default.Remove, null) }
                                    Text("$parcelas", fontWeight = FontWeight.Black)
                                    IconButton(onClick = { if (parcelas < 12) parcelas++ }) { Icon(Icons.Default.Add, null) }
                                }
                            }
                            // Prazo
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Prazo Médio", style = MaterialTheme.typography.labelSmall, color = Slate500)
                                TextButton(onClick = { /* Dropdown opcional */ }) {
                                    Text("$prazo dias", fontWeight = FontWeight.Bold, color = Slate900)
                                    Icon(Icons.Default.ArrowDropDown, null)
                                }
                            }
                        }

                        if (draftOrder.totalLiquido > 0) {
                            Divider(modifier = Modifier.padding(vertical = 8.dp), color = Slate200)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Valor por Boleto:", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    currencyFormatter.format(valorBoleto),
                                    fontWeight = FontWeight.Black,
                                    color = if (isBoletoExcedente) Color(0xFFE11D48) else Color(0xFF047857)
                                )
                            }
                            if (isBoletoExcedente) {
                                Text("⚠️ Limite de R$ 9.999 excedido. Aumente as parcelas.", style = MaterialTheme.typography.labelSmall, color = Color(0xFFE11D48), fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Seção 4: Itens do Pedido
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Itens do Pedido", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
                    Button(
                        onClick = onNavigateToCatalogSelection,
                        colors = ButtonDefaults.buttonColors(containerColor = Slate900),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) {
                        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("CATÁLOGO", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            itemsIndexed(draftOrder.items) { index, item ->
                OrderProductCard(
                    item = item,
                    onOpenFiscal = { showFiscalItem = index to item },
                    onOpenMatrix = { onNavigateToMatrix(index) },
                    onDelete = { viewModel.removeItemFromDraft(index) }
                )
            }
        }
    }

    // Modal Fiscal
    showFiscalItem?.let { (index, item) ->
        FiscalSimulatorBottomSheet(
            item = item,
            onDismiss = { showFiscalItem = null },
            onApply = { compra, pdv ->
                viewModel.updateItemFiscal(index, compra, pdv)
                showFiscalItem = null
            }
        )
    }
}

@Composable
fun OrderProductCard(
    item: OrderItem,
    onOpenFiscal: () -> Unit,
    onOpenMatrix: () -> Unit,
    onDelete: () -> Unit
) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                // Miniatura
                Box(modifier = Modifier.size(60.dp).clip(RoundedCornerShape(12.dp)).background(Slate100)) {
                    AsyncImage(
                        model = item.photoUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
                
                Spacer(Modifier.width(12.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.descricao, fontWeight = FontWeight.Bold, maxLines = 1, fontSize = 14.sp)
                    Text("Cód: ${item.codigo} • ${item.caixas} CX (${item.totalPecas} un)", style = MaterialTheme.typography.bodySmall, color = Slate500)
                    Spacer(Modifier.height(4.dp))
                    FiscalBadge(marginPercent = item.margemCalculada, status = item.statusMargem)
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Close, null, tint = Slate400, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(Modifier.height(12.dp))
            Divider(color = Slate100)
            Spacer(Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("VALOR TOTAL", style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Text(currencyFormatter.format(item.subtotal), fontWeight = FontWeight.Black, color = Slate900)
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Botão Fiscal
                    FilledTonalIconButton(
                        onClick = onOpenFiscal,
                        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Emerald100, contentColor = Color(0xFF047857)),
                        shape = RoundedCornerShape(10.dp)
                    ) { Icon(Icons.Default.Analytics, null, modifier = Modifier.size(20.dp)) }

                    // Botão Matriz (20 Lojas)
                    FilledTonalIconButton(
                        onClick = onOpenMatrix,
                        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = Blue100, contentColor = Color(0xFF1D4ED8)),
                        shape = RoundedCornerShape(10.dp)
                    ) { 
                        BadgedBox(badge = { if (item.storeDistribution.isNotEmpty()) Badge { Text("${item.storeDistribution.size}") } }) {
                            Icon(Icons.Default.Store, null, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
    }
}
