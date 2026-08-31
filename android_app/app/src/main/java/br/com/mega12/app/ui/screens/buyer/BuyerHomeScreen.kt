package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.ui.components.Mega12Card
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.components.MetricCard
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import br.com.mega12.app.util.NumberFormatUtils

@Composable
fun BuyerHomeScreen(
    viewModel: Mega12ViewModel,
    onNavigateToCalculator: () -> Unit,
    onNavigateToNewOrder: () -> Unit,
    onNavigateToCatalog: () -> Unit,
    onNavigateToDashboard: () -> Unit,
    onNavigateToFinancial: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToUsers: () -> Unit = {},
    onNavigateToSeparation: () -> Unit,
    onLogout: () -> Unit
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val products by viewModel.products.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val metrics by viewModel.dashboardMetrics.collectAsState()

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Mega 12 Compras",
                subtitle = "Olá, ${currentUser?.nome ?: "Comprador"}",
                actions = {
                    if (currentUser?.role == "diretoria") {
                        IconButton(onClick = onNavigateToSettings) {
                            Icon(Icons.Default.Settings, contentDescription = "Configurações", tint = Slate400)
                        }
                    }
                    IconButton(onClick = onNavigateToDashboard) {
                        Icon(Icons.Default.Insights, contentDescription = "Dashboard", tint = Emerald400)
                    }
                    IconButton(onClick = { viewModel.refreshData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar", tint = Color.White)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Sair", tint = Rose500)
                    }
                }
            )
        },
        floatingActionButton = {
            if (currentUser?.role != "conferente") {
                FloatingActionButton(
                    onClick = onNavigateToNewOrder,
                    containerColor = Emerald500,
                    contentColor = Slate900,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Novo Pedido", fontWeight = FontWeight.Bold)
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
            // Ações Rápidas
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Botão Calculadora de Margem
                    Mega12Card(
                        onClick = onNavigateToCalculator,
                        containerColor = Emerald500.copy(alpha = 0.15f),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Icon(
                                imageVector = Icons.Default.Calculate,
                                contentDescription = null,
                                tint = Emerald400,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Calculadora",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Margem & ST",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                            )
                        }
                    }

                    // Botão Catálogo de Produtos
                    Mega12Card(
                        onClick = onNavigateToCatalog,
                        containerColor = Blue500.copy(alpha = 0.15f),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            Icon(
                                imageVector = Icons.Default.GridView,
                                contentDescription = null,
                                tint = Blue500,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Catálogo",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Produtos com Foto",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                            )
                        }
                    }
                }
            }

            // Novas Ações Financeiro e Admin
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Mega12Card(
                        onClick = onNavigateToFinancial,
                        containerColor = Amber500.copy(alpha = 0.15f),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Icon(Icons.Default.Payments, null, tint = Amber500, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("Financeiro", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
                            Text("Contas a Pagar", style = MaterialTheme.typography.labelSmall, color = Slate400)
                        }
                    }

                    if (currentUser?.role == "diretoria") {
                        Mega12Card(
                            onClick = onNavigateToUsers,
                            containerColor = Purple500.copy(alpha = 0.15f),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Icon(Icons.Default.Group, null, tint = Purple500, modifier = Modifier.size(28.dp))
                                Spacer(Modifier.height(8.dp))
                                Text("Equipe", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
                                Text("Gestão Admin", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            }
                        }
                    }
                }
            }

            // Cards de Resumo
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(
                        title = "Investimento Total",
                        value = NumberFormatUtils.formatCurrency(metrics.totalInvestido),
                        subtitle = "${NumberFormatUtils.formatInteger(orders.size)} pedidos",
                        icon = Icons.Default.AttachMoney,
                        containerColor = Slate800,
                        modifier = Modifier.weight(1f)
                    )

                    MetricCard(
                        title = "Lucro Líquido Real",
                        value = NumberFormatUtils.formatCurrency(metrics.lucroReal),
                        subtitle = "Projeção Rede",
                        icon = Icons.Default.Insights,
                        containerColor = Emerald900.copy(alpha = 0.3f),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Cabeçalho Lista de Pedidos
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Últimos Pedidos Lançados",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Text(
                        text = "${NumberFormatUtils.formatInteger(orders.size)} no total",
                        style = MaterialTheme.typography.labelMedium.copy(color = Slate400)
                    )
                }
            }

            // Lista de Pedidos
            if (orders.isEmpty()) {
                item {
                    Mega12Card(
                        containerColor = Slate800,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                                contentDescription = null,
                                tint = Slate600,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Nenhum pedido lançado ainda",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Toque em + Novo Pedido para começar a comprar na viagem.",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate500),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                items(orders) { order ->
                    Mega12Card(
                        containerColor = Slate800,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { /* Implementar clique se necessário */ }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = order.header.numeroPedido.ifEmpty { "PEDIDO" },
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald400
                                    )
                                )
                                Surface(
                                    color = if (order.header.status == "Finalizado") Emerald500.copy(alpha = 0.2f) else Amber500.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = order.header.status,
                                        color = if (order.header.status == "Finalizado") Emerald400 else Amber500,
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = order.header.fornecedor.ifEmpty { "Fornecedor não informado" },
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color.White
                                )
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${NumberFormatUtils.formatInteger(order.items.size)} itens | ${NumberFormatUtils.formatInteger(order.effectiveTotalPecas)} peças",
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                                )
                                Text(
                                    text = NumberFormatUtils.formatCurrency(order.effectiveTotalLiquido),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
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
