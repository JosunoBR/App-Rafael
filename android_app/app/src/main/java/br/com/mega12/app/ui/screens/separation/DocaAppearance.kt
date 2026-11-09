package br.com.mega12.app.ui.screens.separation

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import br.com.mega12.app.R

internal val DocaCompletedBlue = Color(0xFF1E40AF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DocaBrandedTopBar(
    title: String,
    subtitle: String,
    navigationIcon: @Composable () -> Unit = {},
    actions: @Composable RowScope.() -> Unit = {}
) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.size(36.dp)
                ) {
                    Image(
                        painter = painterResource(R.drawable.logomega12),
                        contentDescription = "Logo Mega 12",
                        modifier = Modifier.fillMaxSize().padding(2.dp)
                    )
                }
                Column {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        },
        navigationIcon = navigationIcon,
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            titleContentColor = MaterialTheme.colorScheme.onBackground
        )
    )
}
