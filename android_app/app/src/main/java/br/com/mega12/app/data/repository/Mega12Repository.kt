package br.com.mega12.app.data.repository

import br.com.mega12.app.data.api.ApiClient
import br.com.mega12.app.data.local.PreferencesManager
import br.com.mega12.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class Mega12Repository(private val preferencesManager: PreferencesManager) {

    private val api get() = ApiClient.getService()

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
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Erro ao buscar pedidos da API"))
            }
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
                Result.failure(Exception("Erro ao salvar pedido no servidor"))
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
                    PaymentInstallment(
                        id = item["id"]?.toString() ?: "",
                        orderId = item["orderId"]?.toString(),
                        numeroPedido = item["numeroPedido"]?.toString() ?: item["numeroDocumento"]?.toString() ?: "",
                        fornecedor = item["fornecedor"]?.toString() ?: item["favorecido"]?.toString() ?: "Fornecedor",
                        numeroParcela = (item["numeroParcela"] as? Number)?.toInt() ?: 1,
                        totalParcelas = (item["totalParcelas"] as? Number)?.toInt() ?: 1,
                        dataVencimento = item["dataVencimento"]?.toString() ?: "",
                        valor = (item["valor"] as? Number)?.toDouble() ?: 0.0,
                        status = item["status"]?.toString() ?: "A Vencer",
                        dataPagamento = item["dataPagamento"]?.toString(),
                        observacao = item["observacao"]?.toString()
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

    fun getCurrentUser(): User? = preferencesManager.getUser()

    fun logout() {
        preferencesManager.clearSession()
    }
}
