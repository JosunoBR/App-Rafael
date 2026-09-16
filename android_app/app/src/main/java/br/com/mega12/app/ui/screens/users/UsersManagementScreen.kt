package br.com.mega12.app.ui.screens.users

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
import br.com.mega12.app.data.model.User
import br.com.mega12.app.ui.components.Mega12AppShell
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun UsersManagementScreen(
    navController: NavHostController,
    viewModel: Mega12ViewModel
) {
    val usersList = remember {
        listOf(
            User(id = "1", nome = "Rafael (Diretoria)", email = "diretoria@mega12.com.br", role = "diretoria", cargo = "Diretor Executivo"),
            User(id = "2", nome = "Comprador de Viagens", email = "compras@mega12.com.br", role = "comprador", cargo = "Comprador Sênior"),
            User(id = "3", nome = "Conferente da Doca", email = "separacao@mega12.com.br", role = "separacao", cargo = "Conferente"),
            User(id = "4", nome = "Gerente de Depósito", email = "deposito@mega12.com.br", role = "deposito", cargo = "Encarregado CD")
        )
    }

    Mega12AppShell(
        navController = navController,
        viewModel = viewModel,
        title = "Gestão de Usuários (RBAC)"
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "Usuários e Perfis de Acesso",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(usersList) { user ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(user.nome, fontWeight = FontWeight.Bold, color = Color.White)
                                Text(user.email, style = MaterialTheme.typography.bodySmall, color = Slate400)
                            }

                            Surface(
                                color = when (user.role) {
                                    "diretoria" -> Amber500.copy(alpha = 0.2f)
                                    "comprador" -> Purple500.copy(alpha = 0.2f)
                                    "deposito" -> Blue500.copy(alpha = 0.2f)
                                    else -> Emerald500.copy(alpha = 0.2f)
                                },
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = user.role.uppercase(),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = when (user.role) {
                                            "diretoria" -> Amber500
                                            "comprador" -> Purple500
                                            "deposito" -> Blue500
                                            else -> Emerald400
                                        },
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
