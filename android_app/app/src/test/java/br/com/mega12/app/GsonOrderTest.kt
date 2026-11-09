package br.com.mega12.app

import br.com.mega12.app.data.model.PurchaseOrder
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Test

class GsonOrderTest {
    @Test
    fun readsOrderListWithWholeAndFractionalVolumes() {
        val response = """
            [
                {
                    "id": "order-1",
                    "totalVolumes": 1119.5,
                    "totalPecas": 72,
                    "header": { "totalVolumes": 1119.5, "totalPecas": 72 },
                    "items": [{ "qtdTotalUnidades": 72, "qtdNoPacote": 16, "qtdPacotes": 4.5 }]
                },
                {
                    "id": "order-2",
                    "totalVolumes": 4,
                    "totalPecas": 48,
                    "header": { "totalVolumes": 4, "totalPecas": 48 }
                }
            ]
        """.trimIndent()

        val orders = Gson().fromJson(response, object : TypeToken<List<PurchaseOrder>>() {})

        assertEquals(listOf("order-1", "order-2"), orders.map { it.id })
        assertEquals(listOf(1119.5, 4.0), orders.map { it.topTotalVolumes })
        assertEquals(listOf(1119.5, 4.0), orders.map { it.header.totalVolumes })
        assertEquals(72, orders.first().totalPecas)
        val item = orders.first().items.single()
        assertEquals(72, item.totalPecas)
        assertEquals(16, item.qtdPorCaixa)
        val savedItem = Gson().toJsonTree(item).asJsonObject
        assertEquals(4.5, savedItem.get("qtdPacotes").asDouble, 0.0)
        assertEquals(16, savedItem.get("qtdNoPacote").asInt)
    }
}
