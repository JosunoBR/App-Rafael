package br.com.mega12.app.ui.screens.catalog

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
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.NumberFormat
import java.util.Locale

@Composable
fun ProductsCatalogScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val products by viewModel.products.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var zoomedProductPhoto by remember { mutableStateOf<Pair<String, String>?>(null) }

    val currencyFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    }

    val filteredProducts = remember(products, searchQuery) {
        if (searchQuery.isBlank()) products
        else {
            val q = searchQuery.trim().lowercase()
            products.filter {
                (it.descricao.lowercase().contains(q)) ||
                (it.codigoInterno.lowercase().contains(q)) ||
                (it.codigo.lowercase().contains(q)) ||
                (it.codigoBarras?.lowercase()?.contains(q) == true) ||
                (it.eanBarcode?.lowercase()?.contains(q) == true) ||
                (it.categoria?.lowercase()?.contains(q) == true)
            }
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
            // Barra de Busca Rápida (Foco em Agilidade)
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar por nome, código ou EAN...", color = Slate300, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Emerald400) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Limpar", tint = Slate300)
                        }
                    }
                },
                singleLine = true,
                colors = mega12TextFieldColors(containerColor = Slate800),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "${filteredProducts.size} produtos encontrados (Somente Consulta)",
                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Lista de Produtos
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Emerald400)
                }
            } else if (filteredProducts.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum produto encontrado.", color = Slate400)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filteredProducts) { prod ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Miniatura da Foto com Zoom ao Clicar
                                    br.com.mega12.app.ui.components.ProductThumbnail(
                                        imageUrl = prod.fotoUrl,
                                        contentDescription = prod.descricao,
                                        modifier = Modifier.size(62.dp),
                                        onClick = if (!prod.fotoUrl.isNullOrBlank()) {
                                            { zoomedProductPhoto = Pair(prod.fotoUrl, prod.descricao) }
                                        } else null
                                    )

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = prod.descricao,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 14.sp
                                        )
                                        val cod = prod.codigoInterno.ifBlank { prod.codigo }
                                        Text(
                                            text = "Cód: $cod • Emb: ${prod.qtdPorPacote} pçs/cx",
                                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                        )
                                        val forn = prod.fornecedorPadraoNome ?: ""
                                        if (forn.isNotBlank()) {
                                            Text(
                                                text = "Fornecedor: $forn",
                                                style = MaterialTheme.typography.bodySmall.copy(color = Slate300, fontSize = 11.sp)
                                            )
                                        }
                                        if (!prod.categoria.isNullOrBlank()) {
                                            Text(
                                                text = "Categoria: ${prod.categoria}",
                                                style = MaterialTheme.typography.bodySmall.copy(color = Slate500, fontSize = 10.sp)
                                            )
                                        }
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            text = currencyFormat.format(prod.precoUnitarioPadrao),
                                            fontWeight = FontWeight.Bold,
                                            color = Emerald400,
                                            fontSize = 15.sp
                                        )
                                        Text(
                                            text = "PDV: ${currencyFormat.format(prod.pdvSugerido)}",
                                            style = MaterialTheme.typography.labelSmall.copy(color = Amber400, fontSize = 10.sp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Modal de Visualização da Foto em Zoom
        zoomedProductPhoto?.let { (url, title) ->
            br.com.mega12.app.ui.components.ZoomableImageDialog(
                imageUrl = url,
                title = title,
                onDismiss = { zoomedProductPhoto = null }
            )
        }
    }
}
