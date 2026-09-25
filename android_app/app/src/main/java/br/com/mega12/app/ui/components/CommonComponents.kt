package br.com.mega12.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.mega12.app.Mega12Application
import br.com.mega12.app.domain.MarginStatus
import br.com.mega12.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Mega12TopBar(
    title: String,
    subtitle: String? = null,
    onBackClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    TopAppBar(
        title = {
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = Slate400
                        )
                    )
                }
            }
        },
        navigationIcon = {
            if (onBackClick != null) {
                IconButton(onClick = onBackClick) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Voltar",
                        tint = Color.White
                    )
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Slate900
        )
    )
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    subtitle: String? = null,
    icon: ImageVector? = null,
    containerColor: Color = Slate800,
    contentColor: Color = Color.White,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = Slate400,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                )
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = contentColor.copy(alpha = 0.8f),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = contentColor
                )
            )
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = Slate400
                    )
                )
            }
        }
    }
}

@Composable
fun MarginBadge(
    margin: Double,
    modifier: Modifier = Modifier
) {
    val status = when {
        margin >= 20.0 -> MarginStatus.EXCELENTE
        margin >= 10.0 -> MarginStatus.BOA
        margin > 0.0 -> MarginStatus.APERTADA
        else -> MarginStatus.PREJUIZO
    }
    MarginBadge(marginPercent = margin, status = status, modifier = modifier)
}

@Composable
fun MarginBadge(
    marginPercent: Double,
    status: MarginStatus,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor, label) = when (status) {
        MarginStatus.EXCELENTE -> Triple(Emerald100, Emerald800, "Excelente")
        MarginStatus.BOA -> Triple(Blue100, Blue500, "Boa")
        MarginStatus.APERTADA -> Triple(Amber100, Amber500, "Apertada")
        MarginStatus.PREJUIZO -> Triple(Rose100, Rose500, "Prejuízo")
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "%.1f%% ($label)".format(marginPercent),
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.Bold,
                color = textColor
            )
        )
    }
}

/**
 * Resolve URL relativa de imagem para a URL completa do servidor backend
 */
fun resolveProductImageUrl(fotoUrl: String?, serverBaseUrl: String? = null): String? {
    if (fotoUrl.isNullOrBlank()) return null
    val trimmed = fotoUrl.trim()
    if (trimmed.startsWith("http://", ignoreCase = true) ||
        trimmed.startsWith("https://", ignoreCase = true) ||
        trimmed.startsWith("data:image", ignoreCase = true) ||
        trimmed.startsWith("file://", ignoreCase = true) ||
        trimmed.startsWith("content://", ignoreCase = true)
    ) {
        return trimmed
    }

    val base = serverBaseUrl ?: try {
        Mega12Application.instance.preferencesManager.serverUrl
    } catch (e: Exception) {
        "http://10.0.2.2:3001/api/"
    }

    val serverHost = base.trimEnd('/')
        .removeSuffix("/api")
        .removeSuffix("/")

    val cleanPath = if (trimmed.startsWith("/")) trimmed else "/$trimmed"
    return "$serverHost$cleanPath"
}

/**
 * Thumbnail para fotos de produtos no Catálogo e Itens do Pedido
 */
@Composable
fun ProductThumbnail(
    imageUrl: String?,
    contentDescription: String? = null,
    modifier: Modifier = Modifier.size(56.dp),
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(8.dp),
    serverBaseUrl: String? = null,
    onClick: (() -> Unit)? = null
) {
    val resolvedUrl = resolveProductImageUrl(imageUrl, serverBaseUrl)

    val clickModifier = if (onClick != null) {
        Modifier.clickable { onClick() }
    } else Modifier

    Surface(
        modifier = modifier
            .clip(shape)
            .then(clickModifier),
        shape = shape,
        color = Slate800
    ) {
        if (resolvedUrl.isNullOrBlank()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.ShoppingBag,
                    contentDescription = contentDescription,
                    tint = Slate500,
                    modifier = Modifier.size(24.dp)
                )
            }
        } else {
            coil.compose.SubcomposeAsyncImage(
                model = resolvedUrl,
                contentDescription = contentDescription,
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = Emerald400
                        )
                    }
                },
                error = {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Image,
                            contentDescription = contentDescription,
                            tint = Slate500,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            )
        }
    }
}

/**
 * Diálogo de Zoom e Visualização em Alta Resolução da Foto do Produto
 */
@Composable
fun ZoomableImageDialog(
    imageUrl: String?,
    title: String? = null,
    onDismiss: () -> Unit
) {
    val resolvedUrl = resolveProductImageUrl(imageUrl) ?: return

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Slate900),
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = title ?: "Foto do Produto",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 14.sp,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Slate400)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                coil.compose.SubcomposeAsyncImage(
                    model = resolvedUrl,
                    contentDescription = title,
                    contentScale = androidx.compose.ui.layout.ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 350.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    loading = {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Emerald400)
                        }
                    },
                    error = {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(150.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.BrokenImage, contentDescription = null, tint = Slate500, modifier = Modifier.size(40.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Imagem não pôde ser carregada", color = Slate400, fontSize = 12.sp)
                            }
                        }
                    }
                )
            }
        }
    }
}
