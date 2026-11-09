package br.com.mega12.app.domain

import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.data.model.PurchaseOrder
import br.com.mega12.app.data.model.StoreItemCheck

data class DocaAllocation(
    val storeId: String,
    val storeName: String,
    val item: OrderItem,
    val remainingUnits: Int,
    val check: StoreItemCheck?
) {
    val key: String get() = "${storeId}_${item.id}"
    val isChecked: Boolean get() = check?.conferido == true
}

class DocaWork(order: PurchaseOrder) {
    private val storeNames = (SeparationEngine.DEFAULT_STORES + order.storeConfigs.orEmpty())
        .associate { it.id to it.name }
    private val checks = order.inspection?.conferenciaLojas.orEmpty()
    private val damageUnits = order.inspection?.avarias.orEmpty()
        .groupingBy { it.storeId to it.itemId }
        .fold(0) { units, damage -> units + damage.quantidade }

    val allocations = order.items.flatMap { item ->
        item.storeDistribution.orEmpty().mapNotNull { (storeId, quantity) ->
            if (quantity <= 0) return@mapNotNull null
            DocaAllocation(
                storeId = storeId,
                storeName = storeNames[storeId] ?: storeId,
                item = item,
                remainingUnits = (quantity - damageUnits.getOrDefault(storeId to item.id, 0)).coerceAtLeast(0),
                check = checks["${storeId}_${item.id}"]
            )
        }
    }

    val byStore = allocations.groupBy { it.storeId }
    val byProduct = allocations.groupBy { it.item.id }
    val checkedCount = allocations.count { it.isChecked }
    val isComplete = allocations.isNotEmpty() && checkedCount == allocations.size
}
