package br.com.mega12.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import br.com.mega12.app.ui.theme.Slate700
import br.com.mega12.app.ui.theme.Slate800

@Composable
fun ShimmerBrush(): Brush {
    val shimmerColors = listOf(
        Slate800,
        Slate700.copy(alpha = 0.6f),
        Slate800
    )

    val transition = rememberInfiniteTransition(label = "shimmer_transition")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_anim"
    )

    return Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnim, y = translateAnim)
    )
}

@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    height: Dp = 20.dp,
    shapeRadius: Dp = 8.dp
) {
    val brush = ShimmerBrush()
    Box(
        modifier = modifier
            .height(height)
            .clip(RoundedCornerShape(shapeRadius))
            .background(brush)
    )
}

@Composable
fun HomeSkeletonScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Banner Cockpit
        SkeletonBox(modifier = Modifier.fillMaxWidth(), height = 120.dp, shapeRadius = 16.dp)

        // Resumo de Pendências (4 cards)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            SkeletonBox(modifier = Modifier.weight(1f), height = 80.dp, shapeRadius = 12.dp)
            SkeletonBox(modifier = Modifier.weight(1f), height = 80.dp, shapeRadius = 12.dp)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            SkeletonBox(modifier = Modifier.weight(1f), height = 80.dp, shapeRadius = 12.dp)
            SkeletonBox(modifier = Modifier.weight(1f), height = 80.dp, shapeRadius = 12.dp)
        }

        // Ação Primária
        SkeletonBox(modifier = Modifier.fillMaxWidth(), height = 90.dp, shapeRadius = 16.dp)

        // Grade de Atalhos
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SkeletonBox(modifier = Modifier.weight(1f), height = 110.dp, shapeRadius = 16.dp)
            SkeletonBox(modifier = Modifier.weight(1f), height = 110.dp, shapeRadius = 16.dp)
        }
    }
}

@Composable
fun SeparationSkeletonScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Seletor de Pedido
        SkeletonBox(modifier = Modifier.fillMaxWidth(), height = 70.dp, shapeRadius = 12.dp)

        // Abas de Lojas
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(4) {
                SkeletonBox(modifier = Modifier.width(80.dp), height = 40.dp, shapeRadius = 10.dp)
            }
        }

        // Itens
        repeat(4) {
            SkeletonBox(modifier = Modifier.fillMaxWidth(), height = 90.dp, shapeRadius = 14.dp)
        }
    }
}
