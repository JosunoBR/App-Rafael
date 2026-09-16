package br.com.mega12.app.ui.screens.catalog

import androidx.compose.foundation.background
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
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsCatalogScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val products by viewModel.products.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }

    // Campos do formulário
    var desc by remember { mutableStateOf("") }
    var codInt by remember { mutableStateOf("") }
    var codForn by remember { mutableStateOf("") }
    var ean by remember { mutableStateOf("") }
    var preco by remember { mutableStateOf("") }
    var pdv by remember { mutableStateOf("12.00") }
    var qtdPacote by remember { mutableStateOf("12") }

    val filteredProducts = remember(products, searchQuery) {
        if (searchQuery.isBlank()) products
        else products.filter {
            it.descricao.contains(searchQuery, ignoreCase = true) ||
            it.codigoInterno.contains(searchQuery, ignoreCase = true) ||
            (it.codigoBarras?.contains(searchQuery, ignoreCase = true) == true)
        }
    }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Catálogo de Produtos"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Barra de Busca & Botão Adicionar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Buscar por código, EAN ou nome...", color = Slate400) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Emerald400) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Emerald500,
                        unfocusedBorderColor = Slate700,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )

                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = Emerald500,
                    contentColor = Slate900,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.size(52.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Adicionar Produto")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Lista de Produtos
            if (filteredProducts.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (products.isEmpty()) "Carregando catálogo..." else "Nenhum produto encontrado.",
                        color = Slate400,
                        fontWeight = FontWeight.Medium
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(filteredProducts) { prod ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = prod.descricao,
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text("Cód: ${prod.codigoInterno}", style = MaterialTheme.typography.bodySmall, color = Emerald400)
                                        if (!prod.codigoBarras.isNullOrBlank()) {
                                            Text("EAN: ${prod.codigoBarras}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                                        }
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "R$ %.2f".format(prod.precoUnitarioPadrao),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Emerald400
                                        )
                                    )
                                    Text(
                                        text = "PDV: R$ %.2f".format(prod.pdvSugerido),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Slate400
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Dialog Novo Produto
        if (showAddDialog) {
            AlertDialog(
                onDismissRequest = { showAddDialog = false },
                title = { Text("Cadastrar Novo Produto", color = Color.White) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = desc,
                            onValueChange = { desc = it },
                            label = { Text("Descrição do Produto") },
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = codInt,
                            onValueChange = { codInt = it },
                            label = { Text("Código Interno") },
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = preco,
                            onValueChange = { preco = it },
                            label = { Text("Preço de Custo (R$)") },
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = pdv,
                            onValueChange = { pdv = it },
                            label = { Text("PDV Alvo (R$)") },
                            singleLine = true
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            showAddDialog = false
                            viewModel.refreshData()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("SALVAR", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAddDialog = false }) {
                        Text("CANCELAR", color = Slate400)
                    }
                },
                containerColor = Slate800
            )
        }
    }
}
