package br.com.mega12.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ServerConfig : Screen("server_config")
    
    // Módulo Doca (Exclusivo para perfil 'separacao' / 'conferente')
    object DocaSeparation : Screen("doca_separation")
    
    // Módulo Comprador & Operação Central
    object BuyerHome : Screen("buyer_home")
    object OrderCreation : Screen("order_creation")
    object OrderHistory : Screen("order_history")
    
    // Financeiro (Somente Leitura)
    object FinancialBoletos : Screen("financial_boletos")
    
    // Consultas Rápidas
    object ProductsCatalog : Screen("products_catalog")
    object Suppliers : Screen("suppliers")
}
