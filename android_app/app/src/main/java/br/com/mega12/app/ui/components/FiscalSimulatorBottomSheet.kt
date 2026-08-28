package br.com.mega12.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.domain.FiscalEngine
import br.com.mega12.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FiscalSimulatorBottomSheet(
    item: OrderItem,
    onDismiss: () -> Unit,
    onApply: (Double, Double) -> Unit
) {
    var precoCompra by remember { mutableStateOf(item.precoCompraUnitario.toString()) }
    var pdvAlvo by remember { mutableStateOf(item.pdvAlvo.toString()) }
    var margemMeta by remember { mutableStateOf(20f) }

    val compraDouble = precoCompra.toDoubleOrNull() ?: 0.0
    val pdvDouble = pdvAlvo.toDoubleOrNull() ?: 0.0
    
    val fiscal = FiscalEngine.calculateItemFiscal(compraDouble, pdvDouble)
    val precoMax = FiscalEngine.calculateMaxPurchasePrice(pdvDouble, margemMeta.toDouble())

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Calculate, contentDescription = null, tint = Emerald600)
                Spacer(Modifier.width(8.dp))
                Text("Engenharia Fiscal", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            
            Text(item.descricao, style = MaterialTheme.typography.bodyMedium, color = Slate500)

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = precoCompra,
                    onValueChange = { precoCompra = it },
                    label = { Text("Compra (R$)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500)
                )
                OutlinedTextField(
                    value = pdvAlvo,
                    onValueChange = { pdvAlvo = it },
                    label = { Text("PDV Alvo (R$)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Emerald500)
                )
            }

            // Simulador de Preço Máximo
            Card(
                colors = CardDefaults.cardColors(containerColor = Blue100.copy(alpha = 0.3f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Blue500.copy(alpha = 0.3f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Simulador de Preço Máximo", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Blue500)
                        Text("Meta: ${margemMeta.toInt()}%", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Blue500)
                    }
                    Slider(
                        value = margemMeta,
                        onValueChange = { margemMeta = it },
                        valueRange = 10f..40f,
                        steps = 5,
                        colors = SliderDefaults.colors(thumbColor = Blue500, activeTrackColor = Blue500)
                    )
                    Text(
                        "Para garantir ${margemMeta.toInt()}% de margem, pague no máximo:",
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate600
                    )
                    Text(
                        "R$ %.2f".format(precoMax),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Blue500
                    )
                }
            }

            // Resultado do Cálculo
            Surface(
                color = Slate900,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("CUSTO REAL", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text("R$ %.2f".format(fiscal.custoRealEfetivo), style = MaterialTheme.typography.titleMedium, color = Amber500, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("MARGEM REAL", style = MaterialTheme.typography.labelSmall, color = Slate400)
                            Text("%.1f%%".format(fiscal.margemPercentual), style = MaterialTheme.typography.titleMedium, color = Emerald400, fontWeight = FontWeight.Bold)
                        }
                    }
                    
                    Divider(color = Slate700)
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (fiscal.isLucrativo) Icons.Default.CheckCircle else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (fiscal.isLucrativo) Emerald500 else Rose500,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (fiscal.isLucrativo) "Produto altamente lucrativo para a rede." else "Atenção: Margem abaixo do esperado ou prejuízo.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White
                        )
                    }
                }
            }

            Button(
                onClick = { onApply(compraDouble, pdvDouble) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Aplicar Valores ao Item", fontWeight = FontWeight.Bold)
            }
        }
    }
}
