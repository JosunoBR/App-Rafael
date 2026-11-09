import Foundation

struct FiscalEngine {
    static let defaultConfig = FiscalConfig(
        icmsAliquota: 0.11,
        ipiAliquota: 0.00,
        pisCofinsAliquota: 0.03,
        custosFixos: 0.26,
        creditoEntradaICMS: 0.195
    )

    static func calculateItemFiscal(
        precoCompra: Double,
        pdvAlvo: Double,
        config: FiscalConfig = defaultConfig,
        customIcms: Double? = null,
        customIpi: Double? = null,
        customPisCofins: Double? = null,
        customCustosFixos: Double? = null,
        customCreditoEntrada: Double? = null
    ) -> FiscalCalculationResult {
        let icms = customIcms ?? config.icmsAliquota
        let ipi = customIpi ?? config.ipiAliquota
        let pisCofins = customPisCofins ?? config.pisCofinsAliquota
        let custosFixos = customCustosFixos ?? config.custosFixos
        let creditoEntrada = customCreditoEntrada ?? config.creditoEntradaICMS

        let percentualDespesasPdv = icms + pisCofins + custosFixos
        let percentualCreditoEntrada = creditoEntrada

        let safePrecoCompra = max(0.0, precoCompra)
        let safePdvAlvo = max(0.0, pdvAlvo)

        let custoFixoUnit = safePdvAlvo * custosFixos
        let icmsSaidaUnit = safePdvAlvo * icms
        let pisCofinsUnit = safePdvAlvo * pisCofins
        let despesasPdvUnit = safePdvAlvo * percentualDespesasPdv

        let creditoIcmsUnit = safePrecoCompra * percentualCreditoEntrada
        let valorIpiUnit = safePrecoCompra * ipi
        let custoRealEfetivo = max(0.0, (safePrecoCompra + valorIpiUnit) - creditoIcmsUnit)

        let margemRealUnit = safePdvAlvo - despesasPdvUnit - custoRealEfetivo
        let margemPercentual = safePdvAlvo > 0 ? (margemRealUnit / safePdvAlvo) * 100.0 : 0.0

        let status: MarginStatus
        if margemPercentual >= 20.0 {
            status = .excelente
        } else if margemPercentual >= 10.0 {
            status = .boa
        } else if margemPercentual >= 0.0 {
            status = .apertada
        } else {
            status = .prejuizo
        }

        return FiscalCalculationResult(
            precoCompra: safePrecoCompra,
            pdvAlvo: safePdvAlvo,
            percentualDespesasPdv: percentualDespesasPdv,
            percentualCreditoEntrada: percentualCreditoEntrada,
            custosFixosAliquota: custosFixos,
            icmsSaidaAliquota: icms,
            pisCofinsAliquota: pisCofins,
            custoFixoUnit: custoFixoUnit,
            icmsSaidaUnit: icmsSaidaUnit,
            pisCofinsUnit: pisCofinsUnit,
            despesasPdvUnit: despesasPdvUnit,
            creditoIcmsUnit: creditoIcmsUnit,
            custoRealEfetivo: custoRealEfetivo,
            margemRealUnit: margemRealUnit,
            margemPercentual: margemPercentual,
            isLucrativo: margemRealUnit >= 0,
            statusMargem: status
        )
    }
}

