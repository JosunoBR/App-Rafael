package br.com.mega12.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.ui.components.Mega12Card
import br.com.mega12.app.ui.components.MetricCard
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import br.com.mega12.app.util.NumberFormatUtils
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExecutiveDashboardScreen(viewModel: Mega12ViewModel, onNavigateBack: () -> Unit) {
    val metrics by viewModel.dashboardMetrics.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Painel Executivo", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                        Text("Business Intelligence • Rede Mega 12", style = MaterialTheme.typography.bodySmall, color = Emerald600)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Slate50
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            item {
                Text(
                    "Resumo do Período (2026)",
                    style = MaterialTheme.typography.labelLarge,
                    color = Slate500,
                    fontWeight = FontWeight.Bold
                )
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    LocalMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Total Compras",
                        value = NumberFormatUtils.formatCurrency(metrics.totalInvestido),
                        subtitle = "${NumberFormatUtils.formatInteger(metrics.pedidosCount)} pedidos",
                        icon = Icons.Default.ShoppingCart,
                        iconColor = Emerald500
                    )
                    LocalMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Ticket Médio",
                        value = NumberFormatUtils.formatCurrency(metrics.ticketMedio),
                        subtitle = "Média por cotação",
                        icon = Icons.Default.PriceCheck,
                        iconColor = Blue500
                    )
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    LocalMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Faturamento PDV",
                        value = NumberFormatUtils.formatCurrency(metrics.faturamentoPdv),
                        subtitle = "Projetado 20 lojas",
                        icon = Icons.AutoMirrored.Filled.TrendingUp,
                        iconColor = Blue500
                    )
                    LocalMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Lucro Real",
                        value = NumberFormatUtils.formatCurrency(metrics.lucroReal),
                        subtitle = "Líquido final",
                        icon = Icons.AutoMirrored.Filled.ReceiptLong,
                        iconColor = Emerald600,
                        highlight = true
                    )
                }
            }

            item {
                Mega12Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PieChart, contentDescription = null, tint = Emerald500, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Rentabilidade Real da Rede", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        }
                        
                        Spacer(Modifier.height(16.dp))
                        
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                NumberFormatUtils.formatPercentRaw(metrics.margemMedia),
                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                                color = if (metrics.margemMedia >= 20) Emerald600 else Amber500
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "após impostos e custos fixos",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate500,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        
                        Spacer(Modifier.height(12.dp))
                        
                        LinearProgressIndicator(
                            progress = { (metrics.margemMedia / 40f).toFloat().coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth().height(8.dp),
                            color = Emerald500,
                            trackColor = Slate100,
                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                        )
                    }
                }
            }

            // Novo Detalhamento por Cluster (Paridade Web)
            item {
                Text(
                    "Volume de Compras por Mês",
                    style = MaterialTheme.typography.labelLarge,
                    color = Slate500,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            item {
                MonthlyPurchasesChart(metrics.monthlyPurchases)
            }

            item {
                Text(
                    "Rateio por Porte de Loja (Clusters)",
                    style = MaterialTheme.typography.labelLarge,
                    color = Slate500,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ClusterProgressCard(
                        label = "Cluster A (8 Lojas Grandes)",
                        percent = 51.3,
                        color = Emerald500,
                        units = (metrics.totalPecas * 0.513).toInt()
                    )
                    ClusterProgressCard(
                        label = "Cluster B (8 Lojas Médias)",
                        percent = 35.9,
                        color = Blue500,
                        units = (metrics.totalPecas * 0.359).toInt()
                    )
                    ClusterProgressCard(
                        label = "Cluster C (4 Lojas/CD)",
                        percent = 12.8,
                        color = Purple500,
                        units = (metrics.totalPecas * 0.128).toInt()
                    )
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "VOLUME TOTAL ACUMULADO",
                            style = MaterialTheme.typography.labelSmall,
                            color = Emerald400,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            NumberFormatUtils.formatInteger(metrics.totalPecas),
                            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                            color = Color.White
                        )
                        Text(
                            "Peças movimentadas em toda a rede Mega 12",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate400
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MonthlyPurchasesChart(data: Map<String, Double>) {
    val maxVal = (data.values.maxOrNull() ?: 1.0).coerceAtLeast(1.0)
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().height(150.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Bottom
            ) {
                // Se não houver dados, mostrar placeholder
                if (data.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Aguardando dados históricos...", color = Slate400, style = MaterialTheme.typography.labelSmall)
                    }
                }

                data.forEach { (label, value) ->
                    val barHeight = (value / maxVal).toFloat()
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .fillMaxHeight(barHeight.coerceIn(0.05f, 1f))
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(if (barHeight >= 0.8f) Emerald500 else Blue500)
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            label,
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 9.sp,
                            color = Slate500,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ClusterProgressCard(label: String, percent: Double, color: Color, units: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text("${percent}%", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = color)
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { (percent / 100).toFloat() },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = color,
                trackColor = color.copy(alpha = 0.1f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Spacer(Modifier.height(4.dp))
            Text("${NumberFormatUtils.formatInteger(units)} unidades projetadas", style = MaterialTheme.typography.labelSmall, color = Slate400)
        }
    }
}

@Composable
fun LocalMetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    iconColor: Color,
    highlight: Boolean = false
) {
    Card(
        modifier = modifier.height(120.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (highlight) Emerald50 else Color.White
        ),
        border = if (highlight) CardDefaults.outlinedCardBorder(enabled = true).copy(width = 2.dp, brush = androidx.compose.ui.graphics.SolidColor(Emerald500)) else CardDefaults.outlinedCardBorder()
    ) {
        Column(
            modifier = Modifier.padding(12.dp).fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = Slate500, fontWeight = FontWeight.Bold)
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(16.dp))
            }
            Column {
                Text(
                    value,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold, fontSize = 15.sp),
                    color = if (highlight) Emerald700 else Slate900,
                    maxLines = 1
                )
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Slate400, maxLines = 1)
            }
        }
    }
}
