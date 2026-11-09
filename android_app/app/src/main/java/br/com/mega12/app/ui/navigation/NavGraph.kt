package br.com.mega12.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import br.com.mega12.app.ui.screens.buyer.BuyerHomeScreen
import br.com.mega12.app.ui.screens.buyer.OrderCreationScreen
import br.com.mega12.app.ui.screens.catalog.ProductsCatalogScreen
import br.com.mega12.app.ui.screens.financial.FinancialBoletosScreen
import br.com.mega12.app.ui.screens.login.LoginScreen
import br.com.mega12.app.ui.screens.orders.OrderHistoryScreen
import br.com.mega12.app.ui.screens.separation.DocaSeparationScreen
import br.com.mega12.app.ui.screens.separation.DocaHomeScreen
import br.com.mega12.app.ui.screens.separation.DocaMode
import br.com.mega12.app.ui.screens.settings.ServerConfigScreen
import br.com.mega12.app.ui.screens.suppliers.SuppliersScreen
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import kotlinx.coroutines.delay

@Composable
fun NavGraph(
    navController: NavHostController,
    viewModel: Mega12ViewModel,
    startDestination: String = Screen.Login.route
) {
    val entry by navController.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val isDocaRoute = route == Screen.DocaHome.route || route == Screen.DocaSeparation.route
    LaunchedEffect(isDocaRoute) {
        if (isDocaRoute) {
            while (true) {
                viewModel.refreshSeparationOrders()
                delay(2_500)
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = { role ->
                    if (role.equals("conferente", ignoreCase = true) || role.equals("separacao", ignoreCase = true)) {
                        // Perfil de Separação: Acesso EXCLUSIVO à Doca
                        navController.navigate(Screen.DocaHome.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    } else {
                        // Comprador e Diretoria: Acesso ao Hub de Compras
                        navController.navigate(Screen.BuyerHome.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.ServerConfig.route)
                }
            )
        }

        composable(Screen.ServerConfig.route) {
            ServerConfigScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Módulo Doca (Exclusivo para login 'separacao' / 'conferente')
        composable(Screen.DocaHome.route) {
            DocaHomeScreen(
                viewModel = viewModel,
                onOpenOrder = { orderId, mode ->
                    navController.navigate(Screen.DocaSeparation.routeFor(orderId, mode)) {
                        launchSingleTop = true
                    }
                },
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            Screen.DocaSeparation.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType },
                navArgument("mode") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId").orEmpty()
            val mode = DocaMode.entries.firstOrNull { it.name == backStackEntry.arguments?.getString("mode") }
                ?: DocaMode.STORE
            DocaSeparationScreen(
                viewModel = viewModel,
                orderId = orderId,
                mode = mode,
                onExitOrder = { navController.popBackStack(Screen.DocaHome.route, inclusive = false) }
            )
        }

        // Módulo Comprador & Operação Central
        composable(Screen.BuyerHome.route) {
            BuyerHomeScreen(
                navController = navController,
                viewModel = viewModel
            )
        }

        composable(Screen.OrderCreation.route) {
            OrderCreationScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.OrderHistory.route) {
            OrderHistoryScreen(
                navController = navController,
                viewModel = viewModel
            )
        }

        // Financeiro / Boletos (Somente Leitura)
        composable(Screen.FinancialBoletos.route) {
            FinancialBoletosScreen(
                navController = navController,
                viewModel = viewModel
            )
        }

        // Consultas Rápidas
        composable(Screen.ProductsCatalog.route) {
            ProductsCatalogScreen(
                navController = navController,
                viewModel = viewModel
            )
        }

        composable(Screen.Suppliers.route) {
            SuppliersScreen(
                navController = navController,
                viewModel = viewModel
            )
        }

        // Configurações do Sistema
        composable(Screen.Settings.route) {
            br.com.mega12.app.ui.screens.settings.SettingsScreen(
                navController = navController,
                viewModel = viewModel
            )
        }
    }
}
