package br.com.mega12.app.ui.screens.buyer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.domain.SeparationEngine
import br.com.mega12.app.domain.SeparationResult
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.util.NumberFormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeparationMatrixScreen(
    item: OrderItem,
    onNavigateBack: () -> Unit,
    onSave: (Map<String, Int>) -> Unit
) {
    // Estado local para edições na tela
    var reserveStockBoxes by remember { mutableStateOf((item.qtdPacotes * 0.1).toInt()) }
    var currentResult by remember { 
        mutableStateOf(SeparationEngine.calculateBoxesSeparation(item.qtdPacotes, item.qtdPorPacote, reserveBoxes = reserveStockBoxes)) 
    }
    
    // Mapa mutável para edições manuais por loja (caixas)
    val manualAllocations = remember { mutableStateMapOf<String, Int>().apply {
        currentResult.allocationsBoxes.forEach { entry -> put(entry.key, entry.value) }
    } }

    // Recalcular resultado quando mudar a reserva ou alocações manuais
    fun refreshResult() {
        val totalAllocated = manualAllocations.values.sum()
        val reserve = maxOf(0, item.qtdPacotes - totalAllocated)
        // Aqui simulamos um SeparationResult baseado nos inputs manuais
        currentResult = currentResult.copy(
            allocationsBoxes = manualAllocations.toMap(),
            allocations = manualAllocations.mapValues { it.value * item.qtdPorPacote },
            totalAllocatedBoxes = totalAllocated,
            totalAllocated = totalAllocated * item.qtdPorPacote,
            reserveStockBoxes = reserve,
            reserveStock = reserve * item.qtdPorPacote,
            isBalanced = totalAllocated <= item.qtdPacotes,
            isOverAllocated = totalAllocated > item.qtdPacotes
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Grade das 20 Lojas", fontWeight = FontWeight.Bold)
                        Text("${item.descricao} • ${NumberFormatUtils.formatInteger(item.qtdPacotes)} CX total", style = MaterialTheme.typography.bodySmall, color = Slate500)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) }
                },
                actions = {
                    TextButton(onClick = { 
                        onSave(currentResult.allocations) 
                    }, enabled = !currentResult.isOverAllocated) {
                        Text("SALVAR", fontWeight = FontWeight.Black, color = Emerald600)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Slate50
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            // Bloco CD / Reserva
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Amber100.copy(alpha = 0.2f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Amber500.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warehouse, contentDescription = null, tint = Amber500)
                            Spacer(Modifier.width(8.dp))
                            Text("Reserva CD / Matriz", fontWeight = FontWeight.Bold, color = Slate800)
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(0, 10, 20, 30).forEach { pct ->
                                FilterChip(
                                    selected = false,
                                    onClick = {
                                        val res = (item.qtdPacotes * (pct / 100.0)).toInt()
                                        val newResult = SeparationEngine.calculateBoxesSeparation(item.qtdPacotes, item.qtdPorPacote, reserveBoxes = res)
                                        manualAllocations.clear()
                                        newResult.allocationsBoxes.forEach { (k, v) -> manualAllocations[k] = v }
                                        refreshResult()
                                    },
                                    label = { Text("$pct%") }
                                )
                            }
                        }
                    }
                }
            }

            // Barra de Validação
            item {
                Surface(
                    color = if (currentResult.isOverAllocated) Rose100 else Emerald100,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (currentResult.isOverAllocated) Icons.Default.Warning else Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = if (currentResult.isOverAllocated) Rose500 else Emerald600
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (currentResult.isOverAllocated) "Alocação excedida! Remova ${NumberFormatUtils.formatInteger(currentResult.totalAllocatedBoxes - item.qtdPacotes)} cx."
                            else "Alocado: ${NumberFormatUtils.formatInteger(currentResult.totalAllocatedBoxes)} cx | No CD: ${NumberFormatUtils.formatInteger(currentResult.reserveStockBoxes)} cx",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (currentResult.isOverAllocated) Color(0xFF9F1239) else Color(0xFF065F46)
                        )
                    }
                }
            }

            // Lojas por Cluster
            val clusters = listOf("A" to Emerald500, "B" to Blue500, "C" to Purple500)
            clusters.forEach { (clusterName, clusterColor) ->
                item {
                    Text(
                        "Cluster $clusterName",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Black,
                        color = clusterColor,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                val storesInCluster = SeparationEngine.DEFAULT_STORES.filter { it.cluster == clusterName }
                items(storesInCluster) { store ->
                    val boxes = manualAllocations[store.id] ?: 0
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = CardDefaults.outlinedCardBorder()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(store.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                IconButton(
                                    onClick = { 
                                        if (boxes > 0) {
                                            manualAllocations[store.id] = boxes - 1
                                            refreshResult()
                                        }
                                    },
                                    modifier = Modifier.size(32.dp).background(Slate100, RoundedCornerShape(8.dp))
                                ) { Icon(Icons.Default.Remove, null, modifier = Modifier.size(16.dp)) }
                                
                                Text(
                                    NumberFormatUtils.formatInteger(boxes),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.widthIn(min = 24.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )

                                IconButton(
                                    onClick = { 
                                        manualAllocations[store.id] = boxes + 1
                                        refreshResult()
                                    },
                                    modifier = Modifier.size(32.dp).background(Slate100, RoundedCornerShape(8.dp))
                                ) { Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp)) }
                            }
                        }
                    }
                }
            }
        }
    }
}
