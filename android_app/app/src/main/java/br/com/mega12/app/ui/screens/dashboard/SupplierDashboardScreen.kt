package br.com.mega12.app.ui.screens.dashboard

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun SupplierDashboardScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val suppliers by viewModel.suppliers.collectAsState()
    var selectedSupplier by remember { mutableStateOf<String?>(null) }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Dashboard BI & Barganha"
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "Dossiê de Negociação com Fornecedores",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                )
            }

            // Cards de Métricas
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Volume Comprado", color = Slate400, style = MaterialTheme.typography.bodySmall)
                            Text("R$ 184.500", color = Emerald400, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("ST Médio Acumulado", color = Slate400, style = MaterialTheme.typography.bodySmall)
                            Text("18.5%", color = Amber500, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            // Card de Recomendações Estratégicas de Barganha
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Emerald500.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Lightbulb, contentDescription = null, tint = Emerald400)
                            Text("Recomendações Estratégicas de Barganha", fontWeight = FontWeight.Bold, color = Emerald400)
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text("• Alavancagem de Volume: Volume do fornecedor atingiu R$ 184k. Solicite +3% a +5% de Desconto OFF comercial.", color = Color.White, style = MaterialTheme.typography.bodyMedium)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("• Ampliação de Prazo: Proponha alteração de 30/60/90 para 30/60/90/120 Dias.", color = Color.White, style = MaterialTheme.typography.bodyMedium)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("• Compensação de ST: Solicite bonificação em peças para neutralizar o impacto de ST.", color = Color.White, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
