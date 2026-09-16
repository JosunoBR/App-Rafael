package br.com.mega12.app.domain.utils

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import br.com.mega12.app.data.model.PurchaseOrder
import java.io.File
import java.io.FileOutputStream

object PdfExporter {

    fun generateOrderPdf(context: Context, order: PurchaseOrder): File? {
        try {
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4
            val page = pdfDocument.startPage(pageInfo)
            val canvas: Canvas = page.canvas

            val paint = Paint()
            paint.color = Color.BLACK
            paint.textSize = 18f
            paint.isFakeBoldText = true

            // Titulo
            canvas.drawText("REDE MEGA 12 - ESPELHO DO PEDIDO DE COMPRA", 40f, 50f, paint)

            paint.textSize = 12f
            paint.isFakeBoldText = false
            canvas.drawText("Número do Pedido: ${order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" }}", 40f, 80f, paint)
            canvas.drawText("Fornecedor: ${order.header.fornecedor}", 40f, 100f, paint)
            canvas.drawText("Condição de Pagamento: ${order.header.condicaoPagamento}", 40f, 120f, paint)
            canvas.drawText("Vendedor: ${order.header.vendedor ?: "N/I"}", 40f, 140f, paint)

            paint.isFakeBoldText = true
            canvas.drawText("ITENS DO PEDIDO:", 40f, 180f, paint)

            paint.isFakeBoldText = false
            var y = 210f
            order.items.forEachIndexed { index, item ->
                if (y < 780f) {
                    canvas.drawText("${index + 1}. ${item.descricao} | Qtd: ${item.totalPecas} UN | Unit: R$ %.2f | Subtotal: R$ %.2f".format(item.precoCompraUnitario, item.subtotal), 40f, y, paint)
                    y += 20f
                }
            }

            paint.isFakeBoldText = true
            canvas.drawText("TOTAL LÍQUIDO DO PEDIDO: R$ %.2f".format(order.totalLiquido), 40f, y + 20f, paint)

            pdfDocument.finishPage(page)

            val file = File(context.cacheDir, "pedido_${order.header.numeroPedido.ifEmpty { "rascunho" }}.pdf")
            val outputStream = FileOutputStream(file)
            pdfDocument.writeTo(outputStream)
            pdfDocument.close()
            outputStream.close()

            return file
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }

    fun sharePdfViaWhatsApp(context: Context, pdfFile: File) {
        try {
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                pdfFile
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                setPackage("com.whatsapp")
            }

            context.startActivity(Intent.createChooser(intent, "Compartilhar Espelho do Pedido via WhatsApp"))
        } catch (e: Exception) {
            // Fallback se WhatsApp nao estiver instalado
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                pdfFile
            )
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(intent, "Compartilhar Espelho do Pedido"))
        }
    }
}
