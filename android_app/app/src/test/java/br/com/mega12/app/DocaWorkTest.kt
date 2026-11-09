package br.com.mega12.app

import br.com.mega12.app.data.model.AvariaRecord
import br.com.mega12.app.data.model.OrderInspection
import br.com.mega12.app.data.model.OrderItem
import br.com.mega12.app.data.model.PurchaseOrder
import br.com.mega12.app.data.model.StoreConfig
import br.com.mega12.app.data.model.StoreItemCheck
import br.com.mega12.app.domain.DocaWork
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class DocaWorkTest {
    @Test
    fun storeAndProductGroupsShareTheSameAllocationAndCheck() {
        val order = PurchaseOrder(
            items = listOf(
                OrderItem(id = "item-1", storeDistribution = mapOf("pg_centro" to 8, "nova" to 5, "reserva" to 0)),
                OrderItem(id = "item-2", storeDistribution = mapOf("pg_centro" to 4))
            ),
            storeConfigs = listOf(StoreConfig("nova", "Loja nova", "A", 5.0)),
            inspection = OrderInspection(
                avarias = listOf(AvariaRecord(itemId = "item-1", storeId = "nova", quantidade = 2)),
                conferenciaLojas = mapOf("nova_item-1" to StoreItemCheck(conferido = true))
            )
        )

        val work = DocaWork(order)
        val storeAllocation = work.byStore.getValue("nova").single()
        val productAllocation = work.byProduct.getValue("item-1").single { it.storeId == "nova" }

        assertSame(storeAllocation, productAllocation)
        assertEquals("Loja nova", productAllocation.storeName)
        assertEquals(3, productAllocation.remainingUnits)
        assertTrue(productAllocation.isChecked)
        assertEquals(3, work.allocations.size)
        assertEquals(1, work.checkedCount)
        assertFalse(work.isComplete)
    }

    @Test
    fun completionRequiresOnlyAllocatedStoreProductPairs() {
        val order = PurchaseOrder(
            items = listOf(OrderItem(id = "item", storeDistribution = mapOf("reserva" to 3, "castro" to 0))),
            inspection = OrderInspection(
                conferenciaLojas = mapOf("reserva_item" to StoreItemCheck(conferido = true))
            )
        )

        assertTrue(DocaWork(order).isComplete)
        assertFalse(DocaWork(PurchaseOrder()).isComplete)
    }
}
