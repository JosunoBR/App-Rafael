package br.com.mega12.app.domain.utils

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import br.com.mega12.app.R
import br.com.mega12.app.data.model.PurchaseOrder
import java.io.File
import java.io.FileOutputStream
import java.text.NumberFormat
import java.util.Locale

object PdfExporter {

    fun generateOrderPdf(context: Context, order: PurchaseOrder): File? {
        try {
            val pdfDocument = PdfDocument()
            // A4 Landscape: 842 pt x 595 pt
            val pageInfo = PdfDocument.PageInfo.Builder(842, 595, 1).create()
            val page = pdfDocument.startPage(pageInfo)
            val canvas: Canvas = page.canvas

            val currencyFormat = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
            val paint = Paint()
            paint.isAntiAlias = true

            // 1. CABEÇALHO SUPERIOR (Logo + Título + Badge)
            try {
                val bitmap = BitmapFactory.decodeResource(context.resources, R.drawable.logomega12)
                val scaled = android.graphics.Bitmap.createScaledBitmap(bitmap, 40, 40, true)
                canvas.drawBitmap(scaled, 30f, 12f, paint)
            } catch (e: Exception) {
                e.printStackTrace()
            }

            paint.color = Color.parseColor("#0F172A")
            paint.textSize = 14f
            paint.isFakeBoldText = true
            canvas.drawText("MEGA 12 • PEDIDO DE COMPRA COMERCIAL", 80f, 30f, paint)

            paint.color = Color.parseColor("#059669")
            paint.textSize = 8.5f
            paint.isFakeBoldText = true
            canvas.drawText("ALS 10 BAZAR E BRINQUEDOS LTDA • AUTORIZAÇÃO OFICIAL DE FORNECIMENTO", 80f, 45f, paint)

            // Badge do Pedido (Canto Superior Direito)
            paint.color = Color.parseColor("#0F172A")
            canvas.drawRoundRect(580f, 10f, 812f, 55f, 6f, 6f, paint)

            paint.color = Color.WHITE
            paint.textSize = 11f
            paint.isFakeBoldText = true
            val pedNum = order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" }
            canvas.drawText("PEDIDO Nº $pedNum", 595f, 28f, paint)

            paint.textSize = 8f
            paint.isFakeBoldText = false
            paint.color = Color.parseColor("#CBD5E1")
            val dataEmissao = order.header.dataEmissao ?: order.header.dataPedido ?: ""
            canvas.drawText("Emissão: $dataEmissao | Status: ${order.status.uppercase()}", 595f, 43f, paint)

            // 2. BANNER DE ALERTA OBRIGATÓRIO (Âmbar/Amarelo Oficial ALS 10)
            paint.color = Color.parseColor("#FEF3C7")
            canvas.drawRoundRect(30f, 62f, 812f, 82f, 5f, 5f, paint)

            paint.color = Color.parseColor("#B45309")
            paint.textSize = 8.5f
            paint.isFakeBoldText = true
            canvas.drawText("! ATENÇÃO OBRIGATÓRIA: AGENDAR ENTREGA COM ROBERTA: (42) 9 9136-5009 | DESCARREGAMENTO POR CONTA DO FORNECEDOR", 40f, 75f, paint)

            // 3. CARDS DE DADOS: COMPRADOR & FORNECEDOR (Lado a Lado)
            // Card Comprador (Esquerda)
            paint.color = Color.parseColor("#F8FAFC")
            canvas.drawRoundRect(30f, 90f, 410f, 170f, 6f, 6f, paint)

            paint.color = Color.parseColor("#0F172A")
            paint.textSize = 9f
            paint.isFakeBoldText = true
            canvas.drawText("DADOS DO COMPRADOR (MATRIZ)", 42f, 107f, paint)

            paint.isFakeBoldText = false
            paint.color = Color.parseColor("#334155")
            paint.textSize = 8f
            canvas.drawText("Razão Social: ALS 10 BAZAR E BRINQUEDOS LTDA", 42f, 122f, paint)
            canvas.drawText("CNPJ: 43.123.456/0001-89  |  IE: 90.876.543-21", 42f, 135f, paint)
            canvas.drawText("Endereço: Av. Principal, 1000 - Ponta Grossa / PR", 42f, 148f, paint)
            canvas.drawText("Contato: compras@mega12.com.br", 42f, 161f, paint)

            // Card Fornecedor (Direita)
            paint.color = Color.parseColor("#F8FAFC")
            canvas.drawRoundRect(425f, 90f, 812f, 170f, 6f, 6f, paint)

            paint.color = Color.parseColor("#0F172A")
            paint.textSize = 9f
            paint.isFakeBoldText = true
            canvas.drawText("DADOS DO FORNECEDOR & CONDIÇÕES", 437f, 107f, paint)

            paint.isFakeBoldText = false
            paint.color = Color.parseColor("#334155")
            paint.textSize = 8f
            val forn = order.header.fornecedor.ifBlank { "Fornecedor Matriz" }
            val vend = order.header.vendedor ?: "N/I"
            val cond = (order.header.condicaoPagamento ?: "").ifBlank { "30/60/90 Dias" }
            val frete = "CIF (Por conta do Fornecedor)"

            canvas.drawText("Fornecedor: $forn", 437f, 122f, paint)
            canvas.drawText("Vendedor: $vend  |  Condição: $cond", 437f, 135f, paint)
            canvas.drawText("Tipo de Frete: $frete", 437f, 148f, paint)
            if (!order.header.observacoes.isNullOrBlank()) {
                canvas.drawText("Obs: ${order.header.observacoes.take(45)}", 437f, 161f, paint)
            }

            // 4. TABELA DE ITENS (CABEÇALHO VERDE EMERALD)
            paint.color = Color.parseColor("#059669")
            canvas.drawRect(30f, 180f, 812f, 200f, paint)

            paint.color = Color.WHITE
            paint.textSize = 8.5f
            paint.isFakeBoldText = true
            canvas.drawText("#", 38f, 193f, paint)
            canvas.drawText("CÓDIGO", 65f, 193f, paint)
            canvas.drawText("DESCRIÇÃO DO PRODUTO", 150f, 193f, paint)
            canvas.drawText("EMB", 510f, 193f, paint)
            canvas.drawText("QTD CX", 560f, 193f, paint)
            canvas.drawText("TOTAL PEÇAS", 620f, 193f, paint)
            canvas.drawText("PREÇO UNIT", 695f, 193f, paint)
            canvas.drawText("SUBTOTAL", 755f, 193f, paint)

            // LINHAS DOS ITENS
            paint.isFakeBoldText = false
            paint.textSize = 8f
            var y = 214f

            order.items.forEachIndexed { index, item ->
                if (y < 520f) {
                    val pcsPerBox = if (item.qtdPorCaixa > 0) item.qtdPorCaixa else 12
                    val boxes = (item.totalPecas / pcsPerBox).coerceAtLeast(1)
                    val cod = item.safeCodigoInterno
                    val desc = item.descricao.take(55)
                    val unit = currencyFormat.format(item.precoCompraUnitario)
                    val sub = currencyFormat.format(item.subtotalEfetivo)

                    if (index % 2 == 1) {
                        paint.color = Color.parseColor("#F8FAFC")
                        canvas.drawRect(30f, y - 10f, 812f, y + 4f, paint)
                    }

                    paint.color = Color.parseColor("#334155")
                    canvas.drawText("${index + 1}", 38f, y, paint)
                    canvas.drawText(cod.take(12), 65f, y, paint)
                    canvas.drawText(desc, 150f, y, paint)
                    canvas.drawText("${pcsPerBox}un/cx", 510f, y, paint)
                    canvas.drawText("$boxes cx", 560f, y, paint)
                    canvas.drawText("${item.totalPecas} un", 620f, y, paint)
                    canvas.drawText(unit, 695f, y, paint)
                    canvas.drawText(sub, 755f, y, paint)

                    paint.color = Color.parseColor("#E2E8F0")
                    canvas.drawLine(30f, y + 4f, 812f, y + 4f, paint)

                    y += 16f
                }
            }

            // 5. RODAPÉ E TOTAIS CONSOLIDADOS
            paint.color = Color.parseColor("#0F172A")
            canvas.drawRect(30f, y + 8f, 812f, y + 38f, paint)

            paint.color = Color.WHITE
            paint.textSize = 10.5f
            paint.isFakeBoldText = true
            canvas.drawText("RESUMO CONSOLIDADO DO PEDIDO:", 42f, y + 26f, paint)
            canvas.drawText("Total Itens: ${order.items.size}   |   Total Peças: ${order.totalPecas} un", 280f, y + 26f, paint)
            canvas.drawText("TOTAL GERAL: ${currencyFormat.format(order.totalLiquidoEfetivo)}", 620f, y + 26f, paint)

            pdfDocument.finishPage(page)

            val fileName = "Pedido_${pedNum}_${forn.replace(" ", "_")}.pdf"
            val file = File(context.cacheDir, fileName)
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

    fun shareOrderPdfToWhatsApp(context: Context, order: PurchaseOrder) {
        val pdfFile = generateOrderPdf(context, order) ?: return
        try {
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                pdfFile
            )

            val currencyFormat = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
            val summaryText = buildString {
                appendLine("📋 *PEDIDO DE COMPRA - REDE MEGA 12*")
                appendLine("🔢 *Número:* ${order.header.numeroPedido.ifEmpty { "PED-RASCUNHO" }}")
                appendLine("🏢 *Fornecedor:* ${order.header.fornecedor.ifBlank { "Fornecedor Matriz" }}")
                appendLine("💰 *TOTAL: ${currencyFormat.format(order.totalLiquidoEfetivo)}*")
                appendLine("📄 Segue em anexo o Espelho do Pedido em PDF.")
            }

            val whatsappIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, summaryText)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                setPackage("com.whatsapp")
            }

            context.startActivity(whatsappIntent)
        } catch (e: Exception) {
            try {
                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    pdfFile
                )
                val chooserIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(chooserIntent, "Encaminhar Pedido em PDF"))
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }
}
