package br.com.mega12.app.ui.navigation

import android.net.Uri
import br.com.mega12.app.ui.screens.separation.DocaMode

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ServerConfig : Screen("server_config")
    
    // Módulo Doca (Exclusivo para perfil 'separacao' / 'conferente')
    object DocaHome : Screen("doca_home")
    object DocaSeparation : Screen("doca_separation/{orderId}/{mode}") {
        fun routeFor(orderId: String, mode: DocaMode) = "doca_separation/${Uri.encode(orderId)}/${mode.name}"
    }
    
    // Módulo Comprador & Operação Central
    object BuyerHome : Screen("buyer_home")
    object OrderCreation : Screen("order_creation")
    object OrderHistory : Screen("order_history")
    
    // Financeiro (Somente Leitura)
    object FinancialBoletos : Screen("financial_boletos")
    
    // Consultas Rápidas
    object ProductsCatalog : Screen("products_catalog")
    object Suppliers : Screen("suppliers")

    // Configurações do Sistema
    object Settings : Screen("settings")
}
