package br.com.mega12.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.mega12.app.data.model.FiscalConfig
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalSettingsScreen(viewModel: Mega12ViewModel, onNavigateBack: () -> Unit) {
    val currentConfig by viewModel.fiscalConfig.collectAsState()
    
    var icms by remember(currentConfig) { mutableStateOf((currentConfig.icmsAliquota * 100).toString()) }
    var ipi by remember(currentConfig) { mutableStateOf((currentConfig.ipiAliquota * 100).toString()) }
    var pisCofins by remember(currentConfig) { mutableStateOf((currentConfig.pisCofinsAliquota * 100).toString()) }
    var custosFixos by remember(currentConfig) { mutableStateOf((currentConfig.custosFixos * 100).toString()) }
    var creditoIcms by remember(currentConfig) { mutableStateOf((currentConfig.creditoEntradaICMS * 100).toString()) }

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Configurações da Rede",
                subtitle = "Parâmetros Fiscais & Matriz",
                onBackClick = onNavigateBack
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    val newConfig = FiscalConfig(
                        icmsAliquota = (icms.toDoubleOrNull() ?: 0.0) / 100.0,
                        ipiAliquota = (ipi.toDoubleOrNull() ?: 0.0) / 100.0,
                        pisCofinsAliquota = (pisCofins.toDoubleOrNull() ?: 0.0) / 100.0,
                        custosFixos = (custosFixos.toDoubleOrNull() ?: 0.0) / 100.0,
                        creditoEntradaICMS = (creditoIcms.toDoubleOrNull() ?: 0.0) / 100.0
                    )
                    viewModel.updateGlobalFiscal(newConfig)
                },
                containerColor = Emerald500,
                contentColor = Slate900,
                icon = { Icon(Icons.Default.Save, null) },
                text = { Text("SALVAR ALTERAÇÕES", fontWeight = FontWeight.Bold) }
            )
        },
        containerColor = Slate900
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Parâmetros de Engenharia Fiscal", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
            
            SettingsCard(title = "ICMS Médio de Saída", value = icms, onValueChange = { icms = it }, suffix = "%")
            SettingsCard(title = "IPI Médio (Estimado)", value = ipi, onValueChange = { ipi = it }, suffix = "%")
            SettingsCard(title = "PIS/COFINS (Regime Misto)", value = pisCofins, onValueChange = { pisCofins = it }, suffix = "%")
            SettingsCard(title = "Custos Fixos Operacionais", value = custosFixos, onValueChange = { custosFixos = it }, suffix = "%")
            SettingsCard(title = "Crédito de ICMS na Entrada", value = creditoIcms, onValueChange = { creditoIcms = it }, suffix = "%")
            
            Spacer(Modifier.height(80.dp)) // Espaço para o FAB
        }
    }
}

@Composable
fun SettingsCard(title: String, value: String, onValueChange: (String) -> Unit, suffix: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium, color = Slate400, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.fillMaxWidth(),
                suffix = { Text(suffix, color = Emerald400, fontWeight = FontWeight.Black) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Emerald500,
                    unfocusedBorderColor = Slate700,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }
    }
}
