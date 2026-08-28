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

    fun getCurrentUser(): User? = preferencesManager.getUser()

    fun logout() {
        preferencesManager.clearSession()
    }
}
