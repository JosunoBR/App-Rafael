package br.com.mega12.app.ui.screens.suppliers

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun SuppliersScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val suppliers by viewModel.suppliers.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }

    val filtered = remember(suppliers, searchQuery) {
        if (searchQuery.isBlank()) suppliers
        else suppliers.filter {
            it.razaoSocial.contains(searchQuery, ignoreCase = true) ||
            (it.nomeFantasia?.contains(searchQuery, ignoreCase = true) == true) ||
            (it.cnpj?.contains(searchQuery) == true) ||
            (it.vendedorPadrao?.contains(searchQuery, ignoreCase = true) == true)
        }
    }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Fornecedores"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Campo de Busca
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar fornecedor, vendedor ou CNPJ...", color = Slate300, fontSize = 13.sp) },
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
                text = "${filtered.size} fornecedores encontrados (Somente Consulta)",
                style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Emerald400)
                }
            } else if (filtered.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum fornecedor encontrado.", color = Slate400)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filtered) { sup ->
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
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = sup.razaoSocial,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 15.sp
                                        )
                                        if (!sup.nomeFantasia.isNullOrBlank() && sup.nomeFantasia != sup.razaoSocial) {
                                            Text(
                                                text = sup.nomeFantasia,
                                                style = MaterialTheme.typography.bodySmall.copy(color = Emerald400, fontSize = 11.sp)
                                            )
                                        }
                                        Text(
                                            text = "CNPJ: ${sup.cnpj ?: "Não informado"}",
                                            style = MaterialTheme.typography.bodySmall.copy(color = Slate400, fontSize = 11.sp)
                                        )
                                    }

                                    // Botão de Contato Rápido (WhatsApp / Ligação)
                                    val phoneClean = (sup.contatoVendedor ?: "").replace(Regex("[^0-9]"), "")
                                    if (phoneClean.isNotBlank()) {
                                        Button(
                                            onClick = {
                                                val intent = Intent(Intent.ACTION_VIEW).apply {
                                                    data = Uri.parse("https://wa.me/55$phoneClean")
                                                }
                                                context.startActivity(intent)
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("WhatsApp", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Dados comerciais
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Text(
                                        text = "Vendedor: ${sup.vendedorPadrao ?: "Geral"}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Slate300, fontSize = 11.sp)
                                    )
                                    Text(
                                        text = "Prazo: ${sup.condicaoPagamentoPadrao ?: "A combinar"}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Amber400, fontSize = 11.sp)
                                    )
                                    if (sup.aliquotaStPadrao > 0) {
                                        Text(
                                            text = "ST: ${sup.aliquotaStPadrao}%",
                                            style = MaterialTheme.typography.bodySmall.copy(color = Slate300, fontSize = 11.sp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
