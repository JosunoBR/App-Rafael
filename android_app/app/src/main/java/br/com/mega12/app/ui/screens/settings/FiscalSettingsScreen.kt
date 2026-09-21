package br.com.mega12.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun FiscalSettingsScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val config by viewModel.fiscalConfig.collectAsState()

    var icms by remember { mutableStateOf((config.icmsAliquota * 100).toString()) }
    var pisCofins by remember { mutableStateOf((config.pisCofinsAliquota * 100).toString()) }
    var custosFixos by remember { mutableStateOf((config.custosFixos * 100).toString()) }
    var creditoIcms by remember { mutableStateOf((config.creditoEntradaICMS * 100).toString()) }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Configurações Fiscais & Lojas"
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
                    text = "Alíquotas Globais do Motor Fiscal",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                )
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = icms,
                            onValueChange = { icms = it },
                            label = { Text("ICMS Saída (%)", color = Slate400) },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = pisCofins,
                            onValueChange = { pisCofins = it },
                            label = { Text("PIS/COFINS (%)", color = Slate400) },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = custosFixos,
                            onValueChange = { custosFixos = it },
                            label = { Text("Custos Fixos da Operação (%)", color = Slate400) },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = creditoIcms,
                            onValueChange = { creditoIcms = it },
                            label = { Text("Crédito de Entrada ICMS (%)", color = Slate400) },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = { viewModel.refreshData() },
                            colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text("SALVAR PARÂMETROS FISCAIS", fontWeight = FontWeight.Bold, color = Slate900)
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Configuração das Lojas & Clusters",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                )
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("• Cluster A (Pontuação 3.0): Lojas de grande porte (4 filiais)", color = Color.White)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("• Cluster B (Pontuação 2.0): Lojas de médio porte (10 filiais)", color = Color.White)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("• Cluster C (Pontuação 1.5): Lojas de pequeno porte (6 filiais)", color = Color.White)
                    }
                }
            }
        }
    }
}
