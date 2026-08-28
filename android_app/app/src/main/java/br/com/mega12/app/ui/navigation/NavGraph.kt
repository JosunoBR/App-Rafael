package br.com.mega12.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import br.com.mega12.app.ui.screens.buyer.BuyerHomeScreen
import br.com.mega12.app.ui.screens.buyer.OrderCreationScreen
import br.com.mega12.app.ui.screens.buyer.ProductCatalogScreen
import br.com.mega12.app.ui.screens.buyer.QuickCalculatorScreen
import br.com.mega12.app.ui.screens.buyer.SeparationMatrixScreen
import br.com.mega12.app.ui.screens.dashboard.ExecutiveDashboardScreen
import br.com.mega12.app.ui.screens.admin.UserManagementScreen
import br.com.mega12.app.ui.screens.financial.FinancialBoletosScreen
import br.com.mega12.app.ui.screens.settings.GlobalSettingsScreen
import br.com.mega12.app.ui.screens.login.LoginScreen
import br.com.mega12.app.ui.screens.separation.SeparationDetailScreen
import br.com.mega12.app.ui.screens.separation.SeparationListScreen
import br.com.mega12.app.ui.screens.settings.ServerConfigScreen
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
                    if (role == "conferente") {
                        navController.navigate(Screen.SeparationList.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.BuyerHome.route) {
                            popUpTo(0) { inclusive = true }
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

        composable(Screen.BuyerHome.route) {
            BuyerHomeScreen(
                viewModel = viewModel,
                onNavigateToCalculator = { navController.navigate(Screen.QuickCalculator.route) },
                onNavigateToNewOrder = { navController.navigate(Screen.OrderCreation.route) },
                onNavigateToCatalog = { navController.navigate(Screen.ProductCatalog.route + "/false") },
                onNavigateToDashboard = { navController.navigate(Screen.ExecutiveDashboard.route) },
                onNavigateToFinancial = { navController.navigate(Screen.FinancialBoletos.route) },
                onNavigateToSettings = { navController.navigate(Screen.GlobalSettings.route) },
                onNavigateToUsers = { navController.navigate(Screen.UserManagement.route) },
                onNavigateToSeparation = { navController.navigate(Screen.SeparationList.route) },
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.QuickCalculator.route) {
            QuickCalculatorScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.OrderCreation.route) {
            OrderCreationScreen(
                viewModel = viewModel,
                onNavigateToCatalogSelection = { 
                    navController.navigate(Screen.ProductCatalog.route + "/true") 
                },
                onNavigateToMatrix = { index ->
                    navController.navigate(Screen.SeparationMatrix.createRoute(index))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.SeparationMatrix.route,
            arguments = listOf(navArgument("itemIndex") { type = NavType.IntType })
        ) { backStackEntry ->
            val index = backStackEntry.arguments?.getInt("itemIndex") ?: 0
            val draft by viewModel.currentDraftOrder.collectAsState()
            val item = draft.items.getOrNull(index)
            
            if (item != null) {
                SeparationMatrixScreen(
                    item = item,
                    onNavigateBack = { navController.popBackStack() },
                    onSave = { newAllocations ->
                        viewModel.updateItemSeparation(index, newAllocations)
                        navController.popBackStack()
                    }
                )
            }
        }

        composable(
            route = Screen.ProductCatalog.route + "/{isSelection}",
            arguments = listOf(navArgument("isSelection") { type = NavType.BoolType })
        ) { backStackEntry ->
            val isSelection = backStackEntry.arguments?.getBoolean("isSelection") ?: false
            ProductCatalogScreen(
                viewModel = viewModel,
                isSelectionMode = isSelection,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.ExecutiveDashboard.route) {
            ExecutiveDashboardScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.SeparationList.route) {
            SeparationListScreen(
                viewModel = viewModel,
                onNavigateToDetail = { orderId ->
                    navController.navigate(Screen.SeparationDetail.createRoute(orderId))
                },
                onNavigateBack = {
                    viewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.SeparationDetail.route,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType })
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            SeparationDetailScreen(
                orderId = orderId,
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.FinancialBoletos.route) {
            FinancialBoletosScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.GlobalSettings.route) {
            GlobalSettingsScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.UserManagement.route) {
            UserManagementScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
