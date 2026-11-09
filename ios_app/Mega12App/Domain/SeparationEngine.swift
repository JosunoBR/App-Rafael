import Foundation

struct ClusterTotals: Codable {
    var A: Int = 0
    var B: Int = 0
    var C: Int = 0
}

struct SeparationResult: Codable {
    var allocations: [String: Int] = [:] // lojaId -> unidades
    var allocationsBoxes: [String: Int] = [:] // lojaId -> caixas
    var totalAllocated: Int = 0
    var totalAllocatedBoxes: Int = 0
    var reserveStock: Int = 0
    var reserveStockBoxes: Int = 0
    var targetTotal: Int = 0
    var targetTotalBoxes: Int = 0
    var isBalanced: Bool = true
    var clusterTotals: ClusterTotals = ClusterTotals()
    var clusterTotalsBoxes: ClusterTotals = ClusterTotals()
}

struct SeparationEngine {
    static let defaultReserveStockPercent: Double = 0.10 // 10% de estoque central

    // 20 Lojas Oficiais da Rede Mega 12 com Clusters A, B e C
    static let defaultStores: [StoreConfig] = [
        // Cluster A (8 Lojas - 6.41% cada) -> 51.28%
        StoreConfig(id: "pg_centro", name: "Ponta Grossa Centro", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "reserva", name: "Reserva", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "tibagi", name: "Tibagi", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "nova_russia", name: "Nova Rússia", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "javert", name: "Javert", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "ivai", name: "Ivaí", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "irati_centro", name: "Irati Centro", cluster: "A", defaultWeight: 6.41, active: true),
        StoreConfig(id: "campo_largo", name: "Campo Largo", cluster: "A", defaultWeight: 6.41, active: true),

        // Cluster B (8 Lojas - 4.49% cada) -> 35.92%
        StoreConfig(id: "castro", name: "Castro", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "imbituva", name: "Imbituva", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "santa_paula", name: "Santa Paula", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "prudentopolis", name: "Prudentópolis", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "guarapuava", name: "Guarapuava", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "imbau", name: "Imbaú", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "rio_azul", name: "Rio Azul", cluster: "B", defaultWeight: 4.49, active: true),
        StoreConfig(id: "reboucas", name: "Rebouças", cluster: "B", defaultWeight: 4.49, active: true),

        // Cluster C (4 Lojas - 3.20% cada) -> 12.80%
        StoreConfig(id: "deposito_central", name: "Depósito Central", cluster: "C", defaultWeight: 3.20, active: true),
        StoreConfig(id: "teixeira_soares", name: "Teixeira Soares", cluster: "C", defaultWeight: 3.20, active: true),
        StoreConfig(id: "mallet", name: "Mallet", cluster: "C", defaultWeight: 3.20, active: true),
        StoreConfig(id: "ipiranga", name: "Ipiranga", cluster: "C", defaultWeight: 3.20, active: true)
    ]

    static func calculateBoxesSeparation(
        totalBoxes: Int,
        packSize: Int = 12,
        stores: [StoreConfig] = defaultStores,
        reserveBoxes: Int? = nil
    ) -> SeparationResult {
        let safePackSize = max(1, packSize)
        let defaultReserve = Int(round(Double(totalBoxes) * defaultReserveStockPercent))
        let actualReserve = reserveBoxes ?? defaultReserve
        let safeReserveBoxes = max(0, min(totalBoxes, actualReserve))
        let boxesToDistribute = max(0, totalBoxes - safeReserveBoxes)

        let activeStores = stores.filter { $0.active }
        let totalWeight = activeStores.reduce(0.0) { $0 + $1.defaultWeight }

        var allocationsBoxes: [String: Int] = [:]
        var allocationsUnits: [String: Int] = [:]
        for store in stores {
            allocationsBoxes[store.id] = 0
            allocationsUnits[store.id] = 0
        }

        if boxesToDistribute <= 0 || totalWeight <= 0 || activeStores.isEmpty {
            return SeparationResult(
                allocations: allocationsUnits,
                allocationsBoxes: allocationsBoxes,
                totalAllocated: 0,
                totalAllocatedBoxes: 0,
                reserveStock: totalBoxes * safePackSize,
                reserveStockBoxes: totalBoxes,
                targetTotal: totalBoxes * safePackSize,
                targetTotalBoxes: totalBoxes,
                isBalanced: true
            )
        }

        // Distribuição Proporcional
        var remainingBoxes = boxesToDistribute
        var rawRemainders: [(String, Double)] = []

        for store in activeStores {
            let exactQuota = (store.defaultWeight / totalWeight) * Double(boxesToDistribute)
            let baseQuota = Int(floor(exactQuota))
            allocationsBoxes[store.id] = baseQuota
            remainingBoxes -= baseQuota
            rawRemainders.append((store.id, exactQuota - Double(baseQuota)))
        }

        // Distribuição de Sobras pelos maiores restos
        rawRemainders.sort { $0.1 > $1.1 }
        for i in 0..<max(0, remainingBoxes) {
            let storeId = rawRemainders[i % rawRemainders.count].0
            allocationsBoxes[storeId] = (allocationsBoxes[storeId] ?? 0) + 1
        }

        var totalAllocatedBoxes = 0
        var clusterBoxes = ClusterTotals()

        for store in stores {
            let b = allocationsBoxes[store.id] ?? 0
            allocationsUnits[store.id] = b * safePackSize
            totalAllocatedBoxes += b

            if store.cluster == "A" { clusterBoxes.A += b }
            else if store.cluster == "B" { clusterBoxes.B += b }
            else if store.cluster == "C" { clusterBoxes.C += b }
        }

        let clusterUnits = ClusterTotals(
            A: clusterBoxes.A * safePackSize,
            B: clusterBoxes.B * safePackSize,
            C: clusterBoxes.C * safePackSize
        )

        return SeparationResult(
            allocations: allocationsUnits,
            allocationsBoxes: allocationsBoxes,
            totalAllocated: totalAllocatedBoxes * safePackSize,
            totalAllocatedBoxes: totalAllocatedBoxes,
            reserveStock: safeReserveBoxes * safePackSize,
            reserveStockBoxes: safeReserveBoxes,
            targetTotal: totalBoxes * safePackSize,
            targetTotalBoxes: totalBoxes,
            isBalanced: (totalAllocatedBoxes + safeReserveBoxes) == totalBoxes,
            clusterTotals: clusterUnits,
            clusterTotalsBoxes: clusterBoxes
        )
    }
}

