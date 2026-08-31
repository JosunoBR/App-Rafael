package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.ui.components.MarginBadge
import br.com.mega12.app.ui.components.Mega12TopBar
import br.com.mega12.app.ui.components.MetricCard
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import br.com.mega12.app.util.NumberFormatUtils

@Composable
fun QuickCalculatorScreen(
    viewModel: Mega12ViewModel,
    onNavigateBack: () -> Unit
) {
    val precoCompra by viewModel.calcPrecoCompra.collectAsState()
    val pdvAlvo by viewModel.calcPdvAlvo.collectAsState()
    val caixas by viewModel.calcCaixas.collectAsState()
    val qtdPorCaixa by viewModel.calcQtdPorCaixa.collectAsState()

    val fiscalResult by viewModel.fiscalResult.collectAsState()
    val separationResult by viewModel.separationResult.collectAsState()

    Scaffold(
        topBar = {
            Mega12TopBar(
                title = "Termômetro de Margem",
                subtitle = "Calculadora Rápida em Viagens",
                onBackClick = onNavigateBack
            )
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
            // Inputs de Preço e Volume
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate800),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Valores da Negociação",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = precoCompra,
                                onValueChange = { viewModel.updateCalcInputs(precoCompraStr = it) },
                                label = { Text("Preço Compra (R$)", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )

                            OutlinedTextField(
                                value = pdvAlvo,
                                onValueChange = { viewModel.updateCalcInputs(pdvAlvoStr = it) },
                                label = { Text("PDV Alvo (R$)", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = caixas,
                                onValueChange = { viewModel.updateCalcInputs(caixasStr = it) },
                                label = { Text("Total Caixas", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )

                            OutlinedTextField(
                                value = qtdPorCaixa,
                                onValueChange = { viewModel.updateCalcInputs(qtdPorCaixaStr = it) },
                                label = { Text("Qtd/Caixa", color = Slate400, fontSize = 12.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Emerald500,
                                    unfocusedBorderColor = Slate700,
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Resultado Fiscal / Termômetro
            if (fiscalResult != null) {
                val res = fiscalResult!!
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (res.isLucrativo) Emerald900.copy(alpha = 0.4f) else Rose500.copy(alpha = 0.2f)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "TERMÔMETRO DE MARGEM",
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (res.isLucrativo) Emerald400 else Rose500
                                    )
                                )
                                MarginBadge(marginPercent = res.margemPercentual, status = res.statusMargem)
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(text = "Custo Real Efetivo", style = MaterialTheme.typography.labelMedium.copy(color = Slate400))
                                    Text(
                                        text = NumberFormatUtils.formatCurrency(res.custoRealEfetivo),
                                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = Color.White)
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(text = "Lucro Líquido Unitário", style = MaterialTheme.typography.labelMedium.copy(color = Slate400))
                                    Text(
                                        text = NumberFormatUtils.formatCurrency(res.margemRealUnit),
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = if (res.isLucrativo) Emerald400 else Rose500
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = Slate700)
                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = "Composição: ICMS 11% + PIS/COFINS 3% + Custos Fixos 26% (Total 40%) - Crédito ICMS 19.5%",
                                style = MaterialTheme.typography.labelMedium.copy(color = Slate400, fontSize = 11.sp)
                            )
                        }
                    }
                }
            }

            // Grade de Rateio para as 20 Lojas
            if (separationResult != null) {
                val sep = separationResult!!
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate800),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Store, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Distribuição 20 Lojas",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = Color.White)
                                    )
                                }
                                Text(
                                    text = "${NumberFormatUtils.formatInteger(sep.totalAllocatedBoxes)} CX (${NumberFormatUtils.formatInteger(sep.totalAllocated)} UN)",
                                    style = MaterialTheme.typography.labelMedium.copy(color = Emerald400, fontWeight = FontWeight.Bold)
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "Estoque Central Reserva: ${NumberFormatUtils.formatInteger(sep.reserveStockBoxes)} CX (${NumberFormatUtils.formatInteger(sep.reserveStock)} UN)",
                                style = MaterialTheme.typography.bodyMedium.copy(color = Amber500)
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Resumo dos Clusters
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster A", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${NumberFormatUtils.formatInteger(sep.clusterTotalsBoxes.A)} CX", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster B", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${NumberFormatUtils.formatInteger(sep.clusterTotalsBoxes.B)} CX", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Surface(
                                    color = Slate900,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("Cluster C", color = Slate400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text("${NumberFormatUtils.formatInteger(sep.clusterTotalsBoxes.C)} CX", color = Color.White, fontWeight = FontWeight.Bold)
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
