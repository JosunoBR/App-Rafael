package br.com.mega12.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.api.ApiClient
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun ServerConfigScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    var serverUrl by remember { mutableStateOf(viewModel.preferencesManager.serverUrl) }
    var savedMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Configuração do Servidor",
                subtitle = "IP da API Backend",
                onBackClick = onNavigateBack
            )
        },
        contentWindowInsets = WindowInsets.systemBars,
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp)
        ) {
            Text(
                text = "Endereço da API Backend",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Informe o endereço IP do computador onde o backend Node.js está rodando.",
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { 
                    serverUrl = it
                    savedMessage = null
                },
                label = { Text("URL Base da API") },
                singleLine = true,
                colors = mega12TextFieldColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Presets Rápidos
            Text(
                text = "Atalhos rápidos de conexão:",
                style = MaterialTheme.typography.labelMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { serverUrl = "http://grupomega.cloud/api/" },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Emerald400),
                    modifier = Modifier.weight(1.2f)
                ) {
                    Text("Nuvem Hostinger", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { serverUrl = "http://10.0.2.2:3001/api/" },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Local PC", fontSize = 11.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (savedMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Emerald500.copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = savedMessage ?: "",
                        color = Emerald400,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Button(
                onClick = {
                    viewModel.preferencesManager.serverUrl = serverUrl
                    ApiClient.resetClient()
                    viewModel.refreshData()
                    savedMessage = "Servidor atualizado! Conectado a $serverUrl"
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text(
                    text = "SALVAR CONFIGURAÇÃO",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                )
            }
        }
    }
}
