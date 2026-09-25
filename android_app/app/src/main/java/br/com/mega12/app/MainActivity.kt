package br.com.mega12.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.rememberNavController
import br.com.mega12.app.ui.navigation.NavGraph
import br.com.mega12.app.ui.navigation.Screen
import br.com.mega12.app.ui.theme.Mega12AppTheme
import br.com.mega12.app.ui.viewmodel.Mega12ViewModel

import androidx.compose.foundation.isSystemInDarkTheme
import br.com.mega12.app.data.local.PreferencesManager

class MainActivity : ComponentActivity() {

    private val viewModel: Mega12ViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            val themeMode by viewModel.themeMode.collectAsState()
            val systemInDark = isSystemInDarkTheme()
            val isDarkTheme = when (themeMode) {
                PreferencesManager.THEME_LIGHT -> false
                PreferencesManager.THEME_DARK -> true
                else -> systemInDark
            }

            Mega12AppTheme(darkTheme = isDarkTheme) {
                val navController = rememberNavController()
                val currentUser by viewModel.currentUser.collectAsState()
                val startDestination = if (currentUser != null) {
                    val isSeparacao = (currentUser?.role == "conferente" || currentUser?.role == "separacao")
                    if (isSeparacao) Screen.DocaSeparation.route else Screen.BuyerHome.route
                } else {
                    Screen.Login.route
                }

                NavGraph(
                    navController = navController,
                    viewModel = viewModel,
                    startDestination = startDestination
                )
            }
        }
    }
}
