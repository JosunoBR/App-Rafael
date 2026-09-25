package br.com.mega12.app.ui.screens.financial

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import br.com.mega12.app.data.model.PaymentInstallment
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun FinancialBoletosScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val installments by viewModel.installments.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("TODOS") }

    val ordersMap = remember(orders) {
        val map = mutableMapOf<String, br.com.mega12.app.data.model.PurchaseOrder>()
        orders.forEach { o ->
            if (o.header.id.isNotBlank()) map[o.header.id] = o
            if (o.id.isNotBlank()) map[o.id] = o
            if (o.header.numeroPedido.isNotBlank()) map[o.header.numeroPedido] = o
        }
        map
    }

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    val currencyFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    }

    val filteredInstallments = remember(installments, selectedFilter, todayStr) {
        when (selectedFilter) {
            "HOJE" -> installments.filter { it.dataVencimento.startsWith(todayStr) && it.status != "Pago" }
            "VENCIDOS" -> installments.filter { 
                it.status == "Em Atraso" || (it.dataVencimento < todayStr && it.status != "Pago") 
            }
            "A VENCER" -> installments.filter { it.status == "A Vencer" || it.status == "Pendente" }
            "PAGOS" -> installments.filter { it.status == "Pago" }
            else -> installments
        }
    }

    val totalValorFiltrado = filteredInstallments.sumOf { it.valor }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Financeiro / Boletos"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Card de Resumo de Vencimentos (Somente Leitura)
            Card(
                colors = CardDefaults.cardColors(containerColor = Slate800),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TOTAL NESTA VISÃO",
                            style = MaterialTheme.typography.labelSmall.copy(color = Slate400, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = currencyFormat.format(totalValorFiltrado),
                            style = MaterialTheme.typography.titleLarge.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "${filteredInstallments.size} títulos listados (Somente Consulta)",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                        )
                    }

                    Surface(
                        color = Slate700,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Proteção de Baixa",
                            tint = Slate400,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Filtros Rápidos de Status
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                listOf("TODOS", "HOJE", "A VENCER", "VENCIDOS").forEach { filter ->
                    val isSelected = selectedFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedFilter = filter },
                        label = {
                            Text(
                                text = filter,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 11.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = if (filter == "HOJE") Amber500 else Emerald500,
                            selectedLabelColor = Slate900,
                            containerColor = Slate800,
                            labelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Lista de Títulos
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Emerald400)
                }
            } else if (filteredInstallments.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum boleto encontrado para este filtro.", color = Slate400)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filteredInstallments) { inst ->
                        val isHoje = inst.dataVencimento.startsWith(todayStr)
                        val isVencido = inst.dataVencimento < todayStr && inst.status != "Pago"

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = inst.displayFornecedor,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 14.sp
                                    )
                                    val docLabel = if (inst.numeroPedido?.startsWith("PED-") == true) "Pedido" else "Doc"
                                    Text(
                                        text = "$docLabel: ${inst.displayDocumento} (${inst.numeroParcela}/${inst.totalParcelas})",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                    )

                                    val linkedOrder = remember(inst, ordersMap) {
                                        val oId = inst.orderId
                                        if (!oId.isNullOrBlank() && ordersMap.containsKey(oId)) {
                                            ordersMap[oId]
                                        } else {
                                            val numPed = inst.numeroPedido ?: ""
                                            if (numPed.isNotBlank() && ordersMap.containsKey(numPed)) {
                                                ordersMap[numPed]
                                            } else null
                                        }
                                    }
                                    val ajusteDiff = linkedOrder?.header?.ajusteFiscalDiferenca ?: 0.0
                                    val temAjuste = (linkedOrder?.header?.valorNotaFiscalEntregue ?: 0.0) > 0.0 || Math.abs(ajusteDiff) > 0.001

                                    if (temAjuste) {
                                        Surface(
                                            color = Amber500.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(4.dp),
                                            modifier = Modifier.padding(vertical = 2.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.ReceiptLong,
                                                    contentDescription = "Ajuste Fiscal NF",
                                                    tint = Amber400,
                                                    modifier = Modifier.size(12.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                val sinal = if (ajusteDiff > 0) "+" else ""
                                                Text(
                                                    text = "Ajuste NF: $sinal${currencyFormat.format(ajusteDiff)}",
                                                    style = MaterialTheme.typography.labelSmall.copy(
                                                        color = Amber400,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 10.sp
                                                    )
                                                )
                                            }
                                        }
                                    }
                                    val vencBr = if (inst.dataVencimento.length == 10 && inst.dataVencimento.contains('-')) {
                                        val p = inst.dataVencimento.split('-')
                                        if (p.size == 3) "${p[2]}/${p[1]}/${p[0]}" else inst.dataVencimento
                                    } else inst.dataVencimento
                                    Text(
                                        text = "Vencimento: $vencBr",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isVencido) Rose400 else if (isHoje) Amber400 else Slate400,
                                            fontWeight = if (isHoje || isVencido) FontWeight.Bold else FontWeight.Normal,
                                            fontSize = 11.sp
                                        )
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = currencyFormat.format(inst.valor),
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald400,
                                        fontSize = 15.sp
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Surface(
                                        color = when {
                                            inst.status == "Pago" -> Emerald500.copy(alpha = 0.2f)
                                            isHoje -> Amber500.copy(alpha = 0.2f)
                                            isVencido -> Rose500.copy(alpha = 0.2f)
                                            else -> Slate700
                                        },
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = when {
                                                inst.status == "Pago" -> "PAGO"
                                                isHoje -> "VENCE HOJE"
                                                isVencido -> "VENCIDO"
                                                else -> inst.status.uppercase()
                                            },
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = when {
                                                    inst.status == "Pago" -> Emerald400
                                                    isHoje -> Amber500
                                                    isVencido -> Rose400
                                                    else -> Slate300
                                                },
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 9.sp
                                            )
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
}
