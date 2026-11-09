package br.com.mega12.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import br.com.mega12.app.R
import br.com.mega12.app.ui.navigation.Screen
import br.com.mega12.app.ui.theme.*
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel
import kotlinx.coroutines.launch

data class NavigationItem(
    val title: String,
    val route: String,
    val icon: ImageVector,
    val section: String,
    val allowedRoles: List<String>
)

val ALL_NAVIGATION_ITEMS = listOf(
    // 1. OPERAÇÃO
    NavigationItem("Início", Screen.BuyerHome.route, Icons.Default.Home, "OPERAÇÃO", listOf("diretoria", "comprador")),
    NavigationItem("Novo Pedido", Screen.OrderCreation.route, Icons.Default.ShoppingCart, "OPERAÇÃO", listOf("diretoria", "comprador")),
    NavigationItem("Meus Pedidos", Screen.OrderHistory.route, Icons.Default.FolderOpen, "OPERAÇÃO", listOf("diretoria", "comprador")),

    // 2. FINANCEIRO
    NavigationItem("Boletos (Consulta)", Screen.FinancialBoletos.route, Icons.Default.CreditCard, "FINANCEIRO", listOf("diretoria", "comprador")),

    // 3. CONSULTAS RÁPIDAS
    NavigationItem("Catálogo de Produtos", Screen.ProductsCatalog.route, Icons.Default.ShoppingBag, "CONSULTAS RÁPIDAS", listOf("diretoria", "comprador")),
    NavigationItem("Fornecedores", Screen.Suppliers.route, Icons.Default.Business, "CONSULTAS RÁPIDAS", listOf("diretoria", "comprador")),

    // 4. SISTEMA
    NavigationItem("Configurações", Screen.Settings.route, Icons.Default.Settings, "SISTEMA", listOf("diretoria", "comprador", "separacao", "conferente"))
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Mega12AppShell(
    navController: NavHostController,
    viewModel: Mega12ViewModel,
    title: String = "Rede Mega 12",
    content: @Composable (PaddingValues) -> Unit
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val userRole = currentUser?.role ?: "diretoria"
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.BuyerHome.route

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    // Filtra itens permitidos para a Role do usuário (RBAC)
    val availableItems = remember(userRole) {
        ALL_NAVIGATION_ITEMS.filter { item ->
            item.allowedRoles.contains(userRole) || (userRole == "conferente" && item.allowedRoles.contains("separacao"))
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.background,
                drawerContentColor = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.width(300.dp)
            ) {
                // Cabecalho Drawer
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(20.dp)
                ) {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(40.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(3.dp)) {
                                    Image(
                                        painter = painterResource(id = R.drawable.logomega12),
                                        contentDescription = "Logo Mega 12",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = "Mega 12 Matriz",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                )
                                Text(
                                    text = currentUser?.nome ?: "Usuário",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Surface(
                            color = Emerald500.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "PERFIL: ${userRole.uppercase()}",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Emerald400,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // Subgrupos de Navegação
                val grouped = availableItems.groupBy { it.section }
                
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(vertical = 12.dp, horizontal = 8.dp)
                ) {
                    grouped.forEach { (section, items) ->
                        Text(
                            text = section,
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            ),
                            modifier = Modifier.padding(start = 12.dp, top = 12.dp, bottom = 6.dp)
                        )

                        items.forEach { item ->
                            val isSelected = currentRoute == item.route
                            NavigationDrawerItem(
                                icon = {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = item.title,
                                        tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                },
                                label = {
                                    Text(
                                        text = item.title,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                    )
                                },
                                selected = isSelected,
                                onClick = {
                                    scope.launch { drawerState.close() }
                                    if (currentRoute != item.route) {
                                        navController.navigate(item.route) {
                                            launchSingleTop = true
                                        }
                                    }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                    unselectedContainerColor = Color.Transparent
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                    // Botao Sair
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.ExitToApp, contentDescription = "Sair", tint = Rose500) },
                        label = { Text("Sair da Conta", color = Rose500, fontWeight = FontWeight.Bold) },
                        selected = false,
                        onClick = {
                            scope.launch { drawerState.close() }
                            viewModel.logout()
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        },
                        colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent),
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }
    ) {
        Scaffold(
            contentWindowInsets = WindowInsets.systemBars,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            text = title,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(
                                imageVector = Icons.Default.Menu,
                                contentDescription = "Abrir Menu",
                                tint = MaterialTheme.colorScheme.onBackground
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background
                    )
                )
            },
            containerColor = MaterialTheme.colorScheme.background
        ) { paddingValues ->
            content(paddingValues)
        }
    }
}
