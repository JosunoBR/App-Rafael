package br.com.mega12.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

/**
 * Ponto de entrada oficial do Compose Multiplatform no iOS.
 * Retorna um UIViewController nativo que é renderizado diretamente pelo SwiftUI no iPhone.
 */
fun MainViewController(): UIViewController = ComposeUIViewController {
    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF059669)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Rede Mega 12 • Compose Multiplatform iOS",
                color = Color.White
            )
        }
    }
}

