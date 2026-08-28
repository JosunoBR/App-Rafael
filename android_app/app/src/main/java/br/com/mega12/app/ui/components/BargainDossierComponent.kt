package br.com.mega12.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import java.text.NumberFormat
import java.util.*

@Composable
fun BargainDossierComponent(dossier: Mega12ViewModel.SupplierBargainDossier) {
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

    Mega12Card(
        modifier = Modifier.fillMaxWidth(),
        containerColor = Slate900
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Emerald500.copy(alpha = 0.2f)
                ) {
                    Icon(
                        Icons.Default.Handshake,
                        contentDescription = null,
                        tint = Emerald400,
                        modifier = Modifier.padding(6.dp).size(20.dp)
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        "DOSSIÊ DE BARGANHA",
                        style = MaterialTheme.typography.labelSmall,
                        color = Emerald400,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        dossier.supplierName,
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BargainStat(
                    modifier = Modifier.weight(1f),
                    label = "Investido",
                    value = currencyFormatter.format(dossier.totalInvestido),
                    icon = Icons.Default.Payments
                )
                BargainStat(
                    modifier = Modifier.weight(1f),
                    label = "Peças",
                    value = "${dossier.totalPecas}",
                    icon = Icons.Default.Inventory2
                )
            }

            Spacer(Modifier.height(8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BargainStat(
                    modifier = Modifier.weight(1f),
                    label = "Pedidos",
                    value = "${dossier.pedidosCount}",
                    icon = Icons.Default.History
                )
                BargainStat(
                    modifier = Modifier.weight(1f),
                    label = "Margem Média",
                    value = String.format("%.1f%%", dossier.margemMedia),
                    icon = Icons.Default.Percent
                )
            }
            
            Spacer(Modifier.height(12.dp))
            
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Emerald900.copy(alpha = 0.5f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Emerald800)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Lightbulb, contentDescription = null, tint = Amber500, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Use o volume de ${dossier.totalPecas} peças para negociar descontos OFF e melhores prazos.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Emerald100
                    )
                }
            }
        }
    }
}

@Composable
fun BargainStat(modifier: Modifier, label: String, value: String, icon: ImageVector) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = Color.White.copy(alpha = 0.05f),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                Spacer(Modifier.width(4.dp))
                Text(label, style = MaterialTheme.typography.labelSmall, color = Slate400)
            }
            Text(value, style = MaterialTheme.typography.bodyMedium, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}
