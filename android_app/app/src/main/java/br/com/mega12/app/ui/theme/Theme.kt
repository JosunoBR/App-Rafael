package br.com.mega12.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.TextFieldColors

private val DarkColorScheme = darkColorScheme(
    primary = Emerald400,
    onPrimary = Slate900,
    primaryContainer = Emerald900,
    onPrimaryContainer = Emerald100,
    secondary = Slate300,
    onSecondary = Slate900,
    background = Slate900,
    surface = Slate800,
    onBackground = Slate50,
    onSurface = Color.White,
    onSurfaceVariant = Slate200,      // Rótulos e textos secundários claros e nítidos no modo escuro
    surfaceVariant = Slate800,
    outline = Slate600,              // Bordas visíveis sem cansar a visão
    outlineVariant = Slate700
)

private val LightColorScheme = lightColorScheme(
    primary = Emerald600,
    onPrimary = Color.White,
    primaryContainer = Emerald100,
    onPrimaryContainer = Emerald900,
    secondary = Slate700,
    onSecondary = Color.White,
    background = Slate50,
    surface = Color.White,
    onBackground = Slate900,
    onSurface = Slate900,
    onSurfaceVariant = Slate700,
    surfaceVariant = Slate100,
    outline = Slate300,
    outlineVariant = Slate200
)

@Composable
fun Mega12AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = if (darkTheme) Slate900.toArgb() else Slate50.toArgb()
            window.navigationBarColor = if (darkTheme) Slate900.toArgb() else Slate50.toArgb()
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = !darkTheme
            insetsController.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

/**
 * Cores padronizadas para OutlinedTextField com alto contraste e máximo conforto visual
 * tanto em Modo Escuro quanto em Modo Claro.
 */
@Composable
fun mega12TextFieldColors(
    containerColor: Color = Slate800
): TextFieldColors {
    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedLabelColor = Emerald400,
        unfocusedLabelColor = Slate300,
        focusedBorderColor = Emerald400,
        unfocusedBorderColor = Slate600,
        focusedPlaceholderColor = Slate400,
        unfocusedPlaceholderColor = Slate400,
        cursorColor = Emerald400,
        focusedContainerColor = containerColor,
        unfocusedContainerColor = containerColor
    )
}
