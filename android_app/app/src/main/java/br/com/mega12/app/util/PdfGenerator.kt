package br.com.mega12.app.util

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
import java.util.*

object PdfGenerator {

    fun generateAndShareOrderPdf(context: Context, order: PurchaseOrder) {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        var y = 40f

        // Header
        paint.textSize = 18f
        paint.isFakeBoldText = true
        canvas.drawText("REDE MEGA 12 - ESPELHO DE PEDIDO", 40f, y, paint)
        y += 30f

        paint.textSize = 12f
        paint.isFakeBoldText = false
        canvas.drawText("Pedido: ${order.header.numeroPedido}", 40f, y, paint)
        y += 20f
        canvas.drawText("Fornecedor: ${order.header.fornecedor}", 40f, y, paint)
        y += 20f
        canvas.drawText("Data: ${order.header.dataPedido}", 40f, y, paint)
        y += 30f

        // Table Header
        paint.isFakeBoldText = true
        canvas.drawText("Descrição", 40f, y, paint)
        canvas.drawText("Qtd", 350f, y, paint)
        canvas.drawText("Preço", 420f, y, paint)
        canvas.drawText("Subtotal", 500f, y, paint)
        y += 10f
        canvas.drawLine(40f, y, 550f, y, paint)
        y += 20f

        // Items
        paint.isFakeBoldText = false
        order.items.forEach { item ->
            if (y > 780) { // Simple page break check (not fully implemented for multiple pages here)
                // In a real app, we would start a new page
            }
            canvas.drawText(item.descricao.take(40), 40f, y, paint)
            canvas.drawText(NumberFormatUtils.formatInteger(item.qtdTotalUnidades), 350f, y, paint)
            canvas.drawText(NumberFormatUtils.formatCurrency(item.precoUnitario), 420f, y, paint)
            canvas.drawText(NumberFormatUtils.formatCurrency(item.valorTotalBruto), 500f, y, paint)
            y += 20f
        }

        y += 20f
        canvas.drawLine(40f, y, 550f, y, paint)
        y += 30f

        // Total
        paint.isFakeBoldText = true
        paint.textSize = 14f
        canvas.drawText("TOTAL DO PEDIDO:", 300f, y, paint)
        canvas.drawText(NumberFormatUtils.formatCurrency(order.effectiveTotalLiquido), 450f, y, paint)

        pdfDocument.finishPage(page)

        // Save to file
        val fileName = "Pedido_${order.header.numeroPedido}.pdf"
        val file = File(context.cacheDir, fileName)
        try {
            pdfDocument.writeTo(FileOutputStream(file))
        } catch (e: Exception) {
            e.printStackTrace()
        }
        pdfDocument.close()

        // Share
        shareFile(context, file)
    }

    private fun shareFile(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Compartilhar Pedido"))
    }
}
