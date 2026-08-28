package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.Product
import br.com.mega12.app.data.model.Supplier
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCreationScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val products by viewModel.products.collectAsState()
    val draftOrder by viewModel.currentDraftOrder.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()

    var selectedSupplier by remember { mutableStateOf(suppliers.firstOrNull()?.razaoSocial ?: "Fornecedor Geral") }
    var condicaoPagamento by remember { mutableStateOf("30/60/90 Dias") }

    // Diálogo de Adição de Item
    var showAddItemDialog by remember { mutableStateOf(false) }
    var itemDescricao by remember { mutableStateOf("") }
    var itemCodigo by remember { mutableStateOf("") }
    var itemCaixas by remember { mutableStateOf("5") }
    var itemQtdPorCaixa by remember { mutableStateOf("12") }
    var itemPrecoCompra by remember { mutableStateOf("10.00") }
    var itemPdvAlvo by remember { mutableStateOf("25.00") }

    LaunchedEffect(suppliers) {
        if (selectedSupplier.isEmpty() && suppliers.isNotEmpty()) {
            selectedSupplier = suppliers.first().razaoSocial
        }
    }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Novo Pedido de Compra",
                subtitle = "Lançamento Mobile em Viagem",
                onBackClick = onNavigateBack
            )
        },
        bottomBar = {
            Surface(
                color = Slate800,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "TOTAL LÍQUIDO",
                            style = MaterialTheme.typography.labelMedium.copy(color = Slate400, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "R$ %.2f".format(draftOrder.totalLiquido),
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Emerald400)
                        )
                    }

                    Button(
                        onClick = {
                            viewModel.saveDraftOrder(selectedSupplier, condicaoPagamento) {
                                onNavigateBack()
                            }
                        },
                        enabled = !isLoading && draftOrder.items.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = Slate900, modifier = Modifier.size(20.dp))
                        } else {
                            Text("CONFIRMAR PEDIDO", fontWeight = FontWeight.Bold, color = Slate900)
                        }
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
            // Cabeçalho do Pedido (Fornecedor e Condições)
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Dados do Fornecedor",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = selectedSupplier,
                            onValueChange = { selectedSupplier = it },
                            label = { Text("Nome do Fornecedor / Razão Social", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = condicaoPagamento,
                            onValueChange = { condicaoPagamento = it },
                            label = { Text("Condição de Pagamento (Ex: 30/60/90 Dias)", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Ação Adicionar Item
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Itens do Pedido (${draftOrder.items.size})",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )

                    FilledTonalButton(
                        onClick = { showAddItemDialog = true },
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = Emerald500.copy(alpha = 0.2f),
                            contentColor = Emerald400
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Adicionar Item", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Lista de Itens no Pedido
            if (draftOrder.items.isEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.ShoppingBasket, contentDescription = null, tint = Slate600, modifier = Modifier.size(40.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Nenhum item adicionado ainda", color = Slate400)
                        }
                    }
                }
            } else {
                items(draftOrder.items) { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = item.descricao,
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                )
                                Text(
                                    text = "R$ %.2f".format(item.subtotal),
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Emerald400
                                    )
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${item.caixas} CX (${item.totalPecas} peças) x R$ %.2f".format(item.precoCompraUnitario),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                                )
                                Text(
                                    text = "PDV Alvo: R$ %.2f".format(item.pdvAlvo),
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate400)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Modal de Adicionar Item
        if (showAddItemDialog) {
            AlertDialog(
                onDismissRequest = { showAddItemDialog = false },
                title = { Text("Adicionar Item ao Pedido", color = Color.White) },
                containerColor = Slate800,
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = itemDescricao,
                            onValueChange = { itemDescricao = it },
                            label = { Text("Descrição do Produto", color = Slate400) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Slate700,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = itemCaixas,
                                onValueChange = { itemCaixas = it },
                                label = { Text("Caixas", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemQtdPorCaixa,
                                onValueChange = { itemQtdPorCaixa = it },
                                label = { Text("Qtd/CX", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = itemPrecoCompra,
                                onValueChange = { itemPrecoCompra = it },
                                label = { Text("Compra Unit. (R$)", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = itemPdvAlvo,
                                onValueChange = { itemPdvAlvo = it },
                                label = { Text("PDV Alvo (R$)", color = Slate400) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (itemDescricao.isNotBlank()) {
                                viewModel.addItemToDraftOrder(
                                    descricao = itemDescricao,
                                    codigo = itemCodigo,
                                    caixas = itemCaixas.toIntOrNull() ?: 1,
                                    qtdPorCaixa = itemQtdPorCaixa.toIntOrNull() ?: 12,
                                    precoCompra = itemPrecoCompra.toDoubleOrNull() ?: 0.0,
                                    pdvAlvo = itemPdvAlvo.toDoubleOrNull() ?: 0.0
                                )
                                itemDescricao = ""
                                showAddItemDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                    ) {
                        Text("Adicionar", color = Slate900, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showAddItemDialog = false }) {
                        Text("Cancelar", color = Slate400)
                    }
                }
            )
        }
    }
}
