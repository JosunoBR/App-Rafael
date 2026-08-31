package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.ui.components.Mega12Card
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import br.com.mega12.app.util.NumberFormatUtils
import coil.compose.AsyncImage
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductCatalogScreen(
    viewModel: Mega12ViewModel,
    isSelectionMode: Boolean = false,
    onNavigateBack: () -> Unit
) {
    val products by viewModel.products.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("Todos") }
    var selectedSupplier by remember { mutableStateOf("Todos") }
    var selectedProductForAdd by remember { mutableStateOf<Product?>(null) }
    
    val categories: List<String> = remember(products) { 
        val list = products.mapNotNull { it.categoria }.distinct().sorted()
        listOf("Todos") + list
    }
    val suppliersList: List<String> = remember(products) {
        val list = products.mapNotNull { it.nomeFornecedor }.distinct().sorted()
        listOf("Todos") + list
    }

    val filteredProducts = products.filter { product ->
        val matchesSearch = product.descricao.contains(searchQuery, ignoreCase = true) || 
                          product.codigo.contains(searchQuery, ignoreCase = true)
        val matchesCategory = selectedCategory == "Todos" || product.categoria == selectedCategory
        val matchesSupplier = selectedSupplier == "Todos" || product.nomeFornecedor == selectedSupplier
        
        matchesSearch && matchesCategory && matchesSupplier
    }

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(Color.White)) {
                TopAppBar(
                    title = { Text(if (isSelectionMode) "Selecionar Produto" else "Catálogo de Produtos", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
                )
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    placeholder = { Text("Buscar por nome ou código...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500),
                    singleLine = true
                )
                
                // Filtros Rápidos (Categorias)
                LazyRow(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(categories) { category: String ->
                        FilterChip(
                            selected = selectedCategory == category,
                            onClick = { selectedCategory = category },
                            label = { Text(category) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Emerald500,
                                selectedLabelColor = Color.White
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = selectedCategory == category,
                                borderColor = Slate200,
                                selectedBorderColor = Emerald600
                            )
                        )
                    }
                }

                // Filtros de Fornecedor
                LazyRow(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(suppliersList) { supplier: String ->
                        FilterChip(
                            selected = selectedSupplier == supplier,
                            onClick = { selectedSupplier = supplier },
                            label = { Text(supplier, fontSize = 11.sp) },
                            leadingIcon = {
                                if (selectedSupplier == supplier) {
                                    Icon(Icons.Default.Check, null, modifier = Modifier.size(12.dp))
                                }
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Slate900,
                                selectedLabelColor = Color.White,
                                selectedLeadingIconColor = Color.White
                            )
                        )
                    }
                }
            }
        },
        containerColor = Slate50
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            gridItems(filteredProducts) { product ->
                ProductGridItem(product = product) {
                    if (isSelectionMode) {
                        selectedProductForAdd = product
                    } else {
                        // Ver detalhes (futuro)
                    }
                }
            }
        }
    }

    // Modal de Quantidade (Paridade Web: 10 pacotes padrão)
    selectedProductForAdd?.let { product ->
        var caixasInput by remember { mutableStateOf("10") }
        AlertDialog(
            onDismissRequest = { selectedProductForAdd = null },
            title = { Text("Adicionar ao Pedido", fontWeight = FontWeight.Black) },
            containerColor = Color.White,
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(product.descricao, style = MaterialTheme.typography.bodyMedium, color = Slate600)
                    OutlinedTextField(
                        value = caixasInput,
                        onValueChange = { caixasInput = it },
                        label = { Text("Quantidade de Caixas") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        suffix = { Text("cx") }
                    )
                    val total = (caixasInput.toIntOrNull() ?: 0) * product.qtdPorPacote
                    Text("Total: ${NumberFormatUtils.formatInteger(total)} unidades", style = MaterialTheme.typography.labelSmall, color = Emerald600, fontWeight = FontWeight.Bold)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.addItemToDraftOrder(
                            descricao = product.descricao,
                            codigo = product.codigo,
                            caixas = caixasInput.toIntOrNull() ?: 1,
                            qtdPorCaixa = product.qtdPorPacote,
                            precoCompra = product.precoUnitarioPadrao,
                            pdvAlvo = product.pdvSugerido,
                            photoUrl = product.fotoUrl
                        )
                        selectedProductForAdd = null
                        onNavigateBack() // Volta para o pedido após adicionar
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600)
                ) { Text("ADICIONAR") }
            }
        )
    }
}

@Composable
fun ProductGridItem(product: Product, onClick: () -> Unit) {
    Mega12Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Column {
            Box(modifier = Modifier.height(120.dp).fillMaxWidth()) {
                AsyncImage(
                    model = product.fotoUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                    contentScale = ContentScale.Crop
                )
                Surface(
                    modifier = Modifier.padding(8.dp).align(Alignment.TopStart),
                    shape = RoundedCornerShape(6.dp),
                    color = Slate900.copy(alpha = 0.7f),
                    contentColor = Color.White
                ) {
                    Text(product.categoria ?: "Geral", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, fontSize = 9.sp)
                }
            }

            Column(modifier = Modifier.padding(10.dp)) {
                Text(product.descricao, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), maxLines = 2, overflow = TextOverflow.Ellipsis, minLines = 2)
                Spacer(Modifier.height(4.dp))
                Text(NumberFormatUtils.formatCurrency(product.precoUnitarioPadrao), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = Emerald600)
                Text("PDV: ${NumberFormatUtils.formatCurrency(product.pdvSugerido)}", style = MaterialTheme.typography.labelSmall, color = Slate400)
            }
        }
    }
}
