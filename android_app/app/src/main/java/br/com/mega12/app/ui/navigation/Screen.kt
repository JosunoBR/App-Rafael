package br.com.mega12.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ServerConfig : Screen("server_config")
    
    // Módulo Comprador & Operação Central
    object BuyerHome : Screen("buyer_home")
    object QuickCalculator : Screen("quick_calculator")
    object OrderCreation : Screen("order_creation")
    object ProductsCatalog : Screen("products_catalog")
    object Suppliers : Screen("suppliers")
    object OrderHistory : Screen("order_history")
    
    // Módulo Separação, Doca & Galpão
    object SeparationList : Screen("separation_list")
    object SeparationDetail : Screen("separation_detail/{orderId}") {
        fun createRoute(orderId: String) = "separation_detail/$orderId"
    }
    object CentralStock : Screen("central_stock")
    
    // Gestão, BI & Financeiro
    object SupplierDashboard : Screen("supplier_dashboard")
    object FinancialBoletos : Screen("financial_boletos")
    
    // Cadastros Fiscais & Sistema
    object UsersManagement : Screen("users_management")
    object FiscalSettings : Screen("fiscal_settings")
}
