package br.com.mega12.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
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

                val errorMessage by viewModel.errorMessage.collectAsState()
                val successMessage by viewModel.successMessage.collectAsState()
                val snackbarHostState = remember { SnackbarHostState() }
                val isError = errorMessage != null

                LaunchedEffect(errorMessage, successMessage) {
                    val message = errorMessage ?: successMessage
                    if (!message.isNullOrBlank()) {
                        snackbarHostState.currentSnackbarData?.dismiss()
                        snackbarHostState.showSnackbar(message)
                        viewModel.clearMessages()
                    }
                }

                Box(modifier = Modifier.fillMaxSize()) {
                    NavGraph(
                        navController = navController,
                        viewModel = viewModel,
                        startDestination = startDestination
                    )
                    SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(16.dp)
                    ) { data ->
                        Snackbar(
                            snackbarData = data,
                            containerColor = if (isError) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer,
                            contentColor = if (isError) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
        }
    }
}
