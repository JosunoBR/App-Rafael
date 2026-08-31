package br.com.mega12.app.util

import java.text.NumberFormat
import java.util.Locale

object NumberFormatUtils {
    private val localeBr = Locale("pt", "BR")
    
    private val currencyFormatter = NumberFormat.getCurrencyInstance(localeBr)
    private val numberFormatter = NumberFormat.getInstance(localeBr)
    private val integerFormatter = NumberFormat.getIntegerInstance(localeBr)
    private val percentFormatter = NumberFormat.getPercentInstance(localeBr).apply {
        minimumFractionDigits = 1
        maximumFractionDigits = 1
    }

    fun formatCurrency(value: Double): String = currencyFormatter.format(value)
    
    fun formatNumber(value: Double, fractionDigits: Int = 2): String {
        numberFormatter.minimumFractionDigits = fractionDigits
        numberFormatter.maximumFractionDigits = fractionDigits
        return numberFormatter.format(value)
    }

    fun formatInteger(value: Long): String = integerFormatter.format(value)
    fun formatInteger(value: Int): String = integerFormatter.format(value.toLong())

    fun formatPercent(value: Double): String {
        // NumberFormat.getPercentInstance assumes 1.0 = 100%. 
        // If the value is already in 0-100 range (e.g. 25.5 for 25.5%), we need to divide by 100.
        return percentFormatter.format(value / 100.0)
    }
    
    fun formatPercentRaw(value: Double): String {
        return "%.1f%%".format(localeBr, value)
    }
}
