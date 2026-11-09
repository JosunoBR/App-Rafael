plugins {
    alias(libs.plugins.kotlin.multiplatform).apply(false)
}

// Configuração do Módulo iOS com Kotlin Multiplatform
kotlin {
    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "Mega12AppShared"
            isStatic = true
        }
    }
    
    sourceSets {
        commonMain.dependencies {
            // Compose Multiplatform e Coroutines
            implementation(libs.kotlinx.coroutines.core)
        }
    }
}

