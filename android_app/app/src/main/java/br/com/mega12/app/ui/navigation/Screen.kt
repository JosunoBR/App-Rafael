package br.com.mega12.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ServerConfig : Screen("server_config")
    
    // Módulo Comprador
    object BuyerHome : Screen("buyer_home")
    object QuickCalculator : Screen("quick_calculator")
    object OrderCreation : Screen("order_creation")
    object ProductCatalog : Screen("product_catalog")
    object SeparationMatrix : Screen("separation_matrix/{itemIndex}") {
        fun createRoute(index: Int) = "separation_matrix/$index"
    }
    
    // BI / Dashboard
    object ExecutiveDashboard : Screen("executive_dashboard")
    
    // Módulo Separação / Doca
    object SeparationList : Screen("separation_list")
    object SeparationDetail : Screen("separation_detail/{orderId}") {
        fun createRoute(orderId: String) = "separation_detail/$orderId"
    }

    // Novos Módulos Paridade Web
    object FinancialBoletos : Screen("financial_boletos")
    object GlobalSettings : Screen("global_settings")
    object UserManagement : Screen("user_management")
}
