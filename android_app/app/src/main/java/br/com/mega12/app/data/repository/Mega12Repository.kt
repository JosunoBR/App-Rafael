package br.com.mega12.app.data.repository

import br.com.mega12.app.data.api.ApiClient
import br.com.mega12.app.data.local.PreferencesManager
import br.com.mega12.app.data.model.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import retrofit2.Response

class Mega12Repository(private val preferencesManager: PreferencesManager) {

    private val api get() = ApiClient.getService()

    private fun apiErrorMessage(response: Response<*>, fallback: String): String {
        val rawBody = runCatching { response.errorBody()?.string() }.getOrNull()
        val serverMessage = rawBody?.let { body ->
            runCatching {
                val json = JSONObject(body)
                json.optString("error").ifBlank { json.optString("message") }
            }.getOrNull()
        }
        return serverMessage?.takeIf { it.isNotBlank() }
            ?: "$fallback (código ${response.code()}). Nenhuma alteração foi salva."
    }

    suspend fun checkHealth(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = api.checkHealth()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun login(email: String, pass: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = api.login(LoginRequest(email, pass))
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                val user = body.user!!.copy(token = body.token)
                preferencesManager.authToken = body.token
                preferencesManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Credenciais inválidas"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUsers(): Result<List<User>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getUsers()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Erro ao buscar usuários"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveUser(user: User): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.saveUser(user)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao salvar usuário"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProducts(): Result<List<Product>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getProducts()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Erro ao buscar produtos da API"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveProduct(product: Product): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.saveProduct(product)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao salvar produto"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteProduct(productId: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteProduct(productId)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao excluir produto"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSuppliers(): Result<List<Supplier>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSuppliers()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Erro ao buscar fornecedores da API"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveSupplier(supplier: Supplier): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.saveSupplier(supplier)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao salvar fornecedor"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteSupplier(supplierId: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteSupplier(supplierId)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao excluir fornecedor"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getOrders(): Result<List<PurchaseOrder>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getOrders()
            if (response.isSuccessful && response.body() != null) {
                val normalizedList = response.body()!!.map { order ->
                    val finalId = order.id.ifBlank { order.header.id }
                    val finalNum = order.topNumeroPedido?.takeIf { it.isNotBlank() } ?: order.header.numeroPedido
                    val finalForn = order.topFornecedor?.takeIf { it.isNotBlank() } ?: order.header.fornecedor
                    val finalVend = order.topVendedor ?: order.header.vendedor
                    val finalContatoVend = order.topContatoVendedor ?: order.header.contatoVendedor
                    val finalCond = order.topCondicaoPagamento?.takeIf { it.isNotBlank() } ?: order.header.condicaoPagamento
                    val finalForma = order.topFormaPagamento ?: order.header.formaPagamento
                    val finalFrete = order.topTipoFrete ?: order.header.tipoFrete
                    val finalDataPed = order.topDataPedido ?: order.topDataEmissao ?: order.header.dataPedido
                    val finalDataEmis = order.topDataEmissao ?: order.topDataPedido ?: order.header.dataEmissao
                    val finalDataEntr = order.topDataEntregaPrevista ?: order.header.dataEntregaPrevista
                    val finalObs = order.topObservacoes ?: order.header.observacoes
                    val rawStatus = order.status.ifBlank { order.header.status }
                    val finalStatus = if (rawStatus.isBlank() || rawStatus.equals("Confirmado", ignoreCase = true)) "Em Cotação" else rawStatus
                    val finalSepStatus = order.separationStatus.ifBlank { order.header.separationStatus ?: "Pendente" }

                    val totalLiq = if (order.totalLiquido > 0) order.totalLiquido else if (order.header.totalLiquido > 0) order.header.totalLiquido else (order.topTotalGeral ?: 0.0)
                    val totalPcs = if (order.totalPecas > 0) order.totalPecas else order.header.totalPecas

                    val effectiveHeader = order.header.copy(
                        id = finalId,
                        numeroPedido = finalNum,
                        fornecedor = finalForn,
                        supplierId = order.topSupplierId ?: order.header.supplierId,
                        vendedor = finalVend ?: "",
                        contatoVendedor = finalContatoVend ?: "",
                        condicaoPagamento = finalCond,
                        formaPagamento = finalForma ?: "Boleto",
                        tipoFrete = finalFrete ?: "CIF",
                        dataPedido = finalDataPed ?: "",
                        dataEmissao = finalDataEmis ?: "",
                        dataEntregaPrevista = finalDataEntr ?: "",
                        observacoes = finalObs ?: "",
                        status = finalStatus,
                        totalLiquido = totalLiq,
                        totalPecas = totalPcs,
                        totalBruto = order.topTotalBruto ?: order.header.totalBruto,
                        totalIpi = order.topTotalIpi ?: order.header.totalIpi,
                        totalDesconto = order.topTotalDesconto ?: order.header.totalDesconto,
                        totalGeral = order.topTotalGeral ?: order.header.totalGeral,
                        totalVolumes = order.topTotalVolumes ?: order.header.totalVolumes,
                        recebidoMatriz = order.topRecebidoMatriz ?: order.header.recebidoMatriz,
                        recebidoPor = order.topRecebidoPor ?: order.header.recebidoPor,
                        dataRecebimentoMatriz = order.topDataRecebimentoMatriz ?: order.header.dataRecebimentoMatriz,
                        numeroNotaFiscal = order.topNumeroNotaFiscal ?: order.header.numeroNotaFiscal,
                        boletosLiberados = order.topBoletosLiberados ?: order.header.boletosLiberados,
                        boletosLiberadosPor = order.topBoletosLiberadosPor ?: order.header.boletosLiberadosPor,
                        boletosLiberadosEm = order.topBoletosLiberadosEm ?: order.header.boletosLiberadosEm,
                        distribuicaoConcluida = order.topDistribuicaoConcluida ?: order.header.distribuicaoConcluida,
                        separacaoConcluida = order.topSeparacaoConcluida ?: order.header.separacaoConcluida,
                        valorNotaFiscalEntregue = order.topValorNotaFiscalEntregue ?: order.header.valorNotaFiscalEntregue,
                        ajusteFiscalDiferenca = order.topAjusteFiscalDiferenca ?: order.header.ajusteFiscalDiferenca
                    )

                    val fixedItems = order.items.map { itm ->
                        if (itm.subtotal <= 0 && itm.totalPecas > 0 && itm.precoCompraUnitario > 0) {
                            itm.copy(subtotal = itm.totalPecas * itm.precoCompraUnitario)
                        } else itm
                    }

                    order.copy(
                        id = finalId,
                        header = effectiveHeader,
                        status = finalStatus,
                        separationStatus = finalSepStatus,
                        totalLiquido = totalLiq,
                        totalPecas = totalPcs,
                        items = fixedItems
                    )
                }
                Result.success(normalizedList)
            } else {
                Result.failure(Exception("Erro ao buscar pedidos da API"))
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveOrder(order: PurchaseOrder): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.saveOrder(order)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou o salvamento do pedido")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteOrder(orderId: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteOrder(orderId)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao cancelar pedido"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFiscalConfig(): Result<FiscalConfig> = withContext(Dispatchers.IO) {
        try {
            val response = api.getFiscalConfig()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.success(FiscalConfig()) // Fallback padrão
            }
        } catch (e: Exception) {
            Result.success(FiscalConfig()) // Fallback padrão
        }
    }

    suspend fun saveFiscalConfig(config: FiscalConfig): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.saveFiscalConfig(config)
            if (response.isSuccessful) Result.success(true) else Result.failure(Exception("Erro ao salvar parâmetros fiscais"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFinancialEntries(): Result<List<PaymentInstallment>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getFinancialEntries()
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val dataList = body["data"] as? List<Map<String, Any>> ?: emptyList()
                val installments = dataList.map { item ->
                    val rawVenc = item["dataVencimento"]?.toString()?.trim() ?: ""
                    val normalizedVenc = if (rawVenc.length == 10 && rawVenc[2] == '/' && rawVenc[5] == '/') {
                        val parts = rawVenc.split('/')
                        if (parts.size == 3) "${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}" else rawVenc
                    } else if (rawVenc.length >= 10 && rawVenc.contains('-')) {
                        rawVenc.substring(0, 10)
                    } else {
                        rawVenc
                    }

                    val forn = (item["fornecedor"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["descricao"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["favorecido"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["lojaNome"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: "Fornecedor Geral"

                    val docRef = (item["numeroPedido"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["documentoRef"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["numeroDocumento"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: (item["descricao"]?.toString())?.takeIf { it.isNotBlank() }
                        ?: "DOC-${item["id"]?.toString()?.takeLast(5) ?: "FIN"}"

                    val numParc = (item["parcelaNumero"] as? Number)?.toInt()
                        ?: (item["numeroParcela"] as? Number)?.toInt()
                        ?: 1

                    val totParc = (item["parcelaTotal"] as? Number)?.toInt()
                        ?: (item["totalParcelas"] as? Number)?.toInt()
                        ?: 1

                    PaymentInstallment(
                        id = item["id"]?.toString() ?: "",
                        orderId = item["orderId"]?.toString(),
                        numeroPedido = docRef,
                        fornecedor = forn,
                        descricao = item["descricao"]?.toString(),
                        lojaNome = item["lojaNome"]?.toString(),
                        numeroParcela = numParc,
                        totalParcelas = totParc,
                        dataVencimento = normalizedVenc,
                        valor = (item["valor"] as? Number)?.toDouble() ?: 0.0,
                        status = item["status"]?.toString() ?: "A Vencer",
                        dataPagamento = item["dataPagamento"]?.toString(),
                        observacao = item["observacao"]?.toString(),
                        documentoRef = item["documentoRef"]?.toString()
                    )
                }
                Result.success(installments)
            } else {
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.success(emptyList())
        }
    }

    suspend fun getPaymentConditions(): Result<List<PaymentCondition>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getPaymentConditions()
            if (response.isSuccessful && response.body() != null) {
                val list = response.body()!!
                if (list.isNotEmpty()) {
                    Result.success(list)
                } else {
                    Result.success(DEFAULT_PAYMENT_CONDITIONS)
                }
            } else {
                Result.success(DEFAULT_PAYMENT_CONDITIONS)
            }
        } catch (e: Exception) {
            Result.success(DEFAULT_PAYMENT_CONDITIONS)
        }
    }

    suspend fun getSeparationState(orderId: String): Result<SeparationStateResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSeparationState(orderId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Erro ao carregar estado de separação (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateSeparationCheck(
        orderId: String,
        storeId: String,
        itemId: String,
        conferido: Boolean,
        expectedVersion: Int?
    ): Result<SeparationCheckResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.updateSeparationCheck(
                orderId,
                storeId,
                itemId,
                SeparationCheckRequest(conferido = conferido, expectedVersion = expectedVersion)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else if (response.code() == 409) {
                Result.failure(ConcurrencyConflictException("Conflito de versão: o pedido foi alterado por outro operador."))
            } else if (response.code() == 403) {
                Result.failure(Exception("Apenas quem conferiu ou a Diretoria pode desmarcar este item."))
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou a atualização da conferência")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addSeparationDamage(orderId: String, request: DamageCreateRequest): Result<DamageResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.addSeparationDamage(orderId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else if (response.code() == 409) {
                Result.failure(ConcurrencyConflictException("Conflito de versão: o pedido foi alterado por outro operador."))
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou o registro da avaria")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteSeparationDamage(orderId: String, damageId: String, expectedVersion: Int?): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteSeparationDamage(orderId, damageId, expectedVersion)
            if (response.isSuccessful) {
                Result.success(true)
            } else if (response.code() == 409) {
                Result.failure(ConcurrencyConflictException("Conflito de versão: o pedido foi alterado por outro operador."))
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou a exclusão da avaria")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun concludeSeparation(orderId: String, expectedVersion: Int?, observacoes: String? = null): Result<ConcludeSeparationResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.concludeSeparation(orderId, ConcludeSeparationRequest(expectedVersion = expectedVersion, observacoes = observacoes))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else if (response.code() == 409) {
                Result.failure(ConcurrencyConflictException("Conflito de versão: o pedido foi alterado por outro operador."))
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou a conclusão da separação")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendToFaturamento(orderId: String, expectedVersion: Int?): Result<SendToFaturamentoResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.sendToFaturamento(orderId, SendToFaturamentoRequest(expectedVersion = expectedVersion))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else if (response.code() == 409) {
                Result.failure(ConcurrencyConflictException("Conflito de versão: o pedido foi alterado por outro operador."))
            } else {
                Result.failure(Exception(apiErrorMessage(response, "O servidor recusou o envio para faturamento")))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentUser(): User? = preferencesManager.getUser()

    fun logout() {
        preferencesManager.clearSession()
    }
}
