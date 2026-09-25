package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.navigation.Screen
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun BuyerHomeScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val installments by viewModel.installments.collectAsState()
    val products by viewModel.products.collectAsState()
    val suppliers by viewModel.suppliers.collectAsState()

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    val emCotacaoCount = orders.count { 
        it.status.equals("Em Cotação", ignoreCase = true) || 
        it.status.equals("Em Cotacao", ignoreCase = true) || 
        it.status.equals("Rascunho", ignoreCase = true)
    }
    val boletosHojeCount = installments.count { 
        it.dataVencimento.startsWith(todayStr) && it.status != "Pago" 
    }
    val boletosVencidosCount = installments.count { 
        (it.status == "Em Atraso" || (it.dataVencimento.isNotBlank() && it.dataVencimento < todayStr)) && it.status != "Pago" 
    }
    val boletosPendentesCount = installments.count { it.status != "Pago" }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Mega 12 Matriz"
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Saudação do Usuário
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
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
                                text = "Olá, ${currentUser?.nome ?: "Comprador"}",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Portal Mobile de Compras & Operação",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate400)
                            )
                        }

                        Surface(
                            color = Emerald500.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = (currentUser?.role ?: "COMPRADOR").uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Emerald400,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }

            // 2. Ação Primária em Destaque: NOVO PEDIDO DE COMPRAS
            item {
                Card(
                    onClick = { navController.navigate(Screen.OrderCreation.route) },
                    colors = CardDefaults.cardColors(containerColor = Emerald600),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Lançar Novo Pedido",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                            Text(
                                text = "Cotação rápida com cálculo automático de margem, IPI e desconto",
                                style = MaterialTheme.typography.bodySmall.copy(color = Emerald100)
                            )
                        }

                        Surface(
                            color = Color.White.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.AddShoppingCart,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                }
            }

            // 3. Grid de Acesso Rápido
            item {
                Text(
                    text = "Operação & Consultas",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Card Histórico de Pedidos
                    HomeQuickActionCard(
                        title = "Meus Pedidos",
                        subtitle = "${orders.size} pedidos",
                        badge = if (emCotacaoCount > 0) "$emCotacaoCount em cotação" else null,
                        badgeColor = Amber500,
                        icon = Icons.Default.FolderOpen,
                        iconColor = Amber400,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.OrderHistory.route) }
                    )

                    // Card Financeiro / Boletos
                    val boletoBadge = when {
                        boletosHojeCount > 0 -> "$boletosHojeCount VENCE HOJE"
                        boletosVencidosCount > 0 -> "$boletosVencidosCount vencidos"
                        else -> null
                    }
                    val boletoBadgeColor = when {
                        boletosHojeCount > 0 -> Rose500
                        boletosVencidosCount > 0 -> Amber500
                        else -> Emerald500
                    }
                    HomeQuickActionCard(
                        title = "Boletos a Pagar",
                        subtitle = "$boletosPendentesCount a pagar",
                        badge = boletoBadge,
                        badgeColor = boletoBadgeColor,
                        icon = Icons.Default.CreditCard,
                        iconColor = Emerald400,
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.FinancialBoletos.route) }
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Card Consulta de Catálogo
                    HomeQuickActionCard(
                        title = "Catálogo",
                        subtitle = "${products.size} produtos",
                        badge = "Consulta",
                        badgeColor = Slate400,
                        icon = Icons.Default.ShoppingBag,
                        iconColor = Color(0xFFA855F7), // Purple
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.ProductsCatalog.route) }
                    )

                    // Card Consulta de Fornecedores
                    HomeQuickActionCard(
                        title = "Fornecedores",
                        subtitle = "${suppliers.size} cadastrados",
                        badge = "WhatsApp",
                        badgeColor = Emerald500,
                        icon = Icons.Default.Business,
                        iconColor = Color(0xFF38BDF8), // Sky Blue
                        modifier = Modifier.weight(1f),
                        onClick = { navController.navigate(Screen.Suppliers.route) }
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeQuickActionCard(
    title: String,
    subtitle: String,
    badge: String? = null,
    badgeColor: Color = Emerald500,
    icon: ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = Slate800),
        shape = RoundedCornerShape(14.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = iconColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(20.dp))
                    }
                }

                if (badge != null) {
                    Surface(
                        color = badgeColor.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = badge,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = badgeColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Slate400,
                    fontSize = 11.sp
                )
            )
        }
    }
}
