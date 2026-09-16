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
import androidx.navigation.NavHostController
import br.com.mega12.app.data.model.PaymentInstallment
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun FinancialBoletosScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val installmentsList = remember {
        listOf(
            PaymentInstallment(id = "1", numeroPedido = "PED-0012", fornecedor = "Alumínios Brasil", numeroParcela = 1, totalParcelas = 3, dataVencimento = "2026-09-30", valor = 4500.00, status = "A Vencer"),
            PaymentInstallment(id = "2", numeroPedido = "PED-0012", fornecedor = "Alumínios Brasil", numeroParcela = 2, totalParcelas = 3, dataVencimento = "2026-10-30", valor = 4500.00, status = "A Vencer"),
            PaymentInstallment(id = "3", numeroPedido = "PED-0010", fornecedor = "Plásticos Parana", numeroParcela = 1, totalParcelas = 1, dataVencimento = "2026-09-16", valor = 2800.00, status = "Vence Hoje")
        )
    }

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
            Text("Vencimentos de Boletos & Faturas", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White))

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(installmentsList) { inst ->
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
                            Column {
                                Text(inst.fornecedor ?: "Fornecedor", fontWeight = FontWeight.Bold, color = Color.White)
                                Text("Pedido: ${inst.numeroPedido} (${inst.numeroParcela}/${inst.totalParcelas})", style = MaterialTheme.typography.bodySmall, color = Slate400)
                                Text("Vencimento: ${inst.dataVencimento}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("R$ %.2f".format(inst.valor), fontWeight = FontWeight.Bold, color = Emerald400)
                                Surface(
                                    color = if (inst.status == "Vence Hoje") Amber500.copy(alpha = 0.2f) else Emerald500.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = inst.status,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            color = if (inst.status == "Vence Hoje") Amber500 else Emerald400,
                                            fontWeight = FontWeight.Bold
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
