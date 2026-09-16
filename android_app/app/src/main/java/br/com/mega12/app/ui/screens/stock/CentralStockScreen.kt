package br.com.mega12.app.ui.screens.stock

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
import br.com.mega12.app.data.model.CentralStockItem
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun CentralStockScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val stockItems = remember {
        listOf(
            CentralStockItem(id = "1", codigoInterno = "PRD-1001", descricao = "Panela de Alumínio Reforçada 24cm", saldoUnidades = 450, precoUnitario = 18.50, localizacaoGalpao = "Rua A - Palete 04"),
            CentralStockItem(id = "2", codigoInterno = "PRD-1002", descricao = "Conjunto de Copos de Vidro 6 Unidades", saldoUnidades = 1200, precoUnitario = 12.00, localizacaoGalpao = "Rua B - Palete 12"),
            CentralStockItem(id = "3", codigoInterno = "PRD-1003", descricao = "Jarra de Suco 2L com Tampa", saldoUnidades = 320, precoUnitario = 8.50, localizacaoGalpao = "Rua C - Palete 01")
        )
    }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Depósito / Estoque CD"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text("Estoque Central do Galpão (Matriz)", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White))

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(stockItems) { item ->
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
                                Text(item.descricao, fontWeight = FontWeight.Bold, color = Color.White)
                                Surface(
                                    color = Emerald500.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "${item.saldoUnidades} UN",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Cód: ${item.codigoInterno} | Local: ${item.localizacaoGalpao}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                        }
                    }
                }
            }
        }
    }
}
