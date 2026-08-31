package br.com.mega12.app.ui.screens.financial

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
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.PaymentInstallment
import br.com.mega12.app.ui.components.Mega12Card
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import br.com.mega12.app.util.NumberFormatUtils
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinancialBoletosScreen(viewModel: Mega12ViewModel, onNavigateBack: () -> Unit) {
    val installments by viewModel.allInstallments.collectAsState()
    var selectedFilter by remember { mutableStateOf("Todos") }
    
    val filteredInstallments = when (selectedFilter) {
        "Pendente" -> installments.filter { it.status == "Pendente" }
        "Pago" -> installments.filter { it.status == "Pago" }
        "Atrasado" -> installments.filter { it.status == "Atrasado" }
        else -> installments
    }

    Scaffold(
        topBar = {
            Column {
                Mega12TopBar(
                    title = "Gestão Financeira",
                    subtitle = "Boletos & Contas a Pagar",
                    onBackClick = onNavigateBack
                )
                androidx.compose.foundation.lazy.LazyRow(
                    modifier = Modifier.fillMaxWidth().background(Slate900).padding(bottom = 8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(listOf("Todos", "Pendente", "Pago", "Atrasado")) { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = { selectedFilter = filter },
                            label = { Text(filter) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Emerald500,
                                selectedLabelColor = Color.White,
                                containerColor = Slate800,
                                labelColor = Slate400
                            ),
                            border = null
                        )
                    }
                }
            }
        },
        containerColor = Slate900
    ) { padding ->
        if (filteredInstallments.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Nenhum boleto encontrado", color = Slate400)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredInstallments) { installment ->
                    BoletoCard(installment = installment) { newStatus ->
                        viewModel.updateInstallment(installment.id, newStatus)
                    }
                }
            }
        }
    }
}

@Composable
fun BoletoCard(installment: PaymentInstallment, onUpdateStatus: (String) -> Unit) {
    val statusColor = when (installment.status) {
        "Pago" -> Emerald500
        "Atrasado" -> Rose500
        else -> Amber500
    }

    Mega12Card(
        modifier = Modifier.fillMaxWidth(),
        containerColor = Slate800
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(
                        "PARCELA ${installment.numeroParcela}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Slate400,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        NumberFormatUtils.formatCurrency(installment.valor),
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Black
                    )
                }
                Surface(
                    color = statusColor.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = installment.status.uppercase(),
                        color = statusColor,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Divider(color = Slate700)
            Spacer(Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Event, null, tint = Slate400, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Vencimento: ${installment.dataVencimento}", style = MaterialTheme.typography.bodySmall, color = Color.White)
            }

            if (installment.documentoRef != null) {
                Spacer(Modifier.height(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Description, null, tint = Slate400, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Ref: ${installment.documentoRef}", style = MaterialTheme.typography.bodySmall, color = Slate400)
                }
            }

            if (installment.status != "Pago") {
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { onUpdateStatus("Pago") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("MARCAR COMO PAGO", fontWeight = FontWeight.Bold)
                }
            } else {
                installment.dataPagamento?.let { 
                    Spacer(Modifier.height(8.dp))
                    Text("Pago em: $it", style = MaterialTheme.typography.labelSmall, color = Emerald400, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
