package br.com.mega12.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import br.com.mega12.app.ui.screens.buyer.BuyerHomeScreen
import br.com.mega12.app.ui.screens.buyer.OrderCreationScreen
import br.com.mega12.app.ui.screens.catalog.ProductsCatalogScreen
import br.com.mega12.app.ui.screens.financial.FinancialBoletosScreen
import br.com.mega12.app.ui.screens.login.LoginScreen
import br.com.mega12.app.ui.screens.orders.OrderHistoryScreen
import br.com.mega12.app.ui.screens.separation.DocaSeparationScreen
import br.com.mega12.app.ui.screens.settings.ServerConfigScreen
import br.com.mega12.app.ui.screens.suppliers.SuppliersScreen
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

@Composable
fun NavGraph(
    navController: NavHostController,
    viewModel: Mega12ViewModel,
    startDestination: String = Screen.Login.route
) {
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
                        navController.navigate(Screen.DocaSeparation.route) {
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
        composable(Screen.DocaSeparation.route) {
            DocaSeparationScreen(
                viewModel = viewModel,
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
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
    }
}
