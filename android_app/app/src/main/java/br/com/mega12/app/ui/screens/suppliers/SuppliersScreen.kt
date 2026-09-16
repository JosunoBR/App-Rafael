package br.com.mega12.app.ui.screens.suppliers

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
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun SuppliersScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val suppliers by viewModel.suppliers.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    val filtered = remember(suppliers, searchQuery) {
        if (searchQuery.isBlank()) suppliers
        else suppliers.filter {
            it.razaoSocial.contains(searchQuery, ignoreCase = true) ||
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
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar por Razão Social, CNPJ ou Vendedor...", color = Slate400) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Emerald400) },
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

            Spacer(modifier = Modifier.height(16.dp))

            if (filtered.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum fornecedor cadastrado.", color = Slate400)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(filtered) { sup ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Slate800),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(
                                    text = sup.razaoSocial,
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                )
                                if (!sup.cnpj.isNullOrBlank()) {
                                    Text("CNPJ: ${sup.cnpj}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    if (!sup.vendedorPadrao.isNullOrBlank()) {
                                        Text("Vendedor: ${sup.vendedorPadrao}", style = MaterialTheme.typography.bodySmall, color = Emerald400)
                                    }
                                    if (!sup.condicaoPagamentoPadrao.isNullOrBlank()) {
                                        Text("Prazo: ${sup.condicaoPagamentoPadrao}", style = MaterialTheme.typography.bodySmall, color = Emerald400)
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
