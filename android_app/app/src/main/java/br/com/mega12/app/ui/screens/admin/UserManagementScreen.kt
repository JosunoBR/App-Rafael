package br.com.mega12.app.ui.screens.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.mega12.app.data.model.User
import br.com.mega12.app.ui.components.Mega12Card
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(viewModel: Mega12ViewModel, onNavigateBack: () -> Unit) {
    val users by viewModel.users.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Gestão de Equipe",
                subtitle = "Usuários & Permissões",
                onBackClick = onNavigateBack
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Emerald500,
                contentColor = Slate900
            ) { Icon(Icons.Default.Add, "Adicionar Usuário") }
        },
        containerColor = Slate900
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(users) { user ->
                UserCard(user = user) {
                    viewModel.deleteUser(user.id)
                }
            }
        }

        if (showAddDialog) {
            AddUserDialog(
                onDismiss = { showAddDialog = false },
                onConfirm = { name, email, role ->
                    viewModel.saveUser(User(nome = name, email = email, role = role))
                    showAddDialog = false
                }
            )
        }
    }
}

@Composable
fun UserCard(user: User, onDelete: () -> Unit) {
    Mega12Card(
        modifier = Modifier.fillMaxWidth(),
        containerColor = Slate800
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    color = Slate700
                ) {
                    Icon(Icons.Default.Person, null, tint = Slate400, modifier = Modifier.padding(8.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(user.nome, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(user.email, style = MaterialTheme.typography.labelSmall, color = Slate400)
                    Surface(
                        color = if (user.role == "diretoria") Purple500.copy(alpha = 0.2f) else Blue500.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Text(
                            user.role.uppercase(),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (user.role == "diretoria") Purple500 else Blue500,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, null, tint = Rose500)
            }
        }
    }
}

@Composable
fun AddUserDialog(onDismiss: () -> Unit, onConfirm: (String, String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("comprador") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Novo Usuário", color = Color.White) },
        containerColor = Slate800,
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("Nome Completo") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                )
                OutlinedTextField(
                    value = email, onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                )
                Text("Nível de Acesso", style = MaterialTheme.typography.labelSmall, color = Slate400)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("comprador", "conferente", "diretoria").forEach { r ->
                        FilterChip(
                            selected = role == r,
                            onClick = { role = r },
                            label = { Text(r) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Emerald500)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(name, email, role) }, colors = ButtonDefaults.buttonColors(containerColor = Emerald500)) {
                Text("CRIAR CONTA", color = Slate900, fontWeight = FontWeight.Bold)
            }
        }
    )
}
