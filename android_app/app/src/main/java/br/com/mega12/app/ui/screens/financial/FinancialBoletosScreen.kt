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
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun FinancialBoletosScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val installments by viewModel.installments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("TODOS") }

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
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
                            text = "R$ %.2f".format(totalValorFiltrado),
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
                                        text = inst.fornecedor ?: "Fornecedor Matriz",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 14.sp
                                    )
                                    Text(
                                        text = "Pedido: ${inst.numeroPedido} (${inst.numeroParcela}/${inst.totalParcelas})",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                    )
                                    Text(
                                        text = "Vencimento: ${inst.dataVencimento}",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            color = if (isVencido) Rose400 else if (isHoje) Amber400 else Slate400,
                                            fontWeight = if (isHoje || isVencido) FontWeight.Bold else FontWeight.Normal,
                                            fontSize = 11.sp
                                        )
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "R$ %.2f".format(inst.valor),
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
