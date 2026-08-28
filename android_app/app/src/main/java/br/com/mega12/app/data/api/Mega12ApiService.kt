package br.com.mega12.app.data.api

import br.com.mega12.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface Mega12ApiService {

    @GET("health")
    suspend fun checkHealth(): Response<Map<String, Any>>

    // Autenticação
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // Produtos
    @GET("products")
    suspend fun getProducts(): Response<List<Product>>

    @POST("products")
    suspend fun saveProduct(@Body product: Product): Response<Map<String, Any>>

    // Fornecedores
    @GET("suppliers")
    suspend fun getSuppliers(): Response<List<Supplier>>

    // Pedidos de Compra
    @GET("orders")
    suspend fun getOrders(): Response<List<PurchaseOrder>>

    @POST("orders")
    suspend fun saveOrder(@Body order: PurchaseOrder): Response<Map<String, Any>>

    @DELETE("orders/{id}")
    suspend fun deleteOrder(@Path("id") orderId: String): Response<Map<String, Any>>

    // Configurações Fiscais
    @GET("config/fiscal")
    suspend fun getFiscalConfig(): Response<FiscalConfig>

    @POST("config/fiscal")
    suspend fun updateFiscalConfig(@Body config: FiscalConfig): Response<Map<String, Any>>

    // Usuários (Admin)
    @GET("users")
    suspend fun getUsers(): Response<List<User>>

    @POST("users")
    suspend fun saveUser(@Body user: User): Response<Map<String, Any>>

    @DELETE("users/{id}")
    suspend fun deleteUser(@Path("id") userId: String): Response<Map<String, Any>>

    // Avarias
    @POST("orders/avarias")
    suspend fun saveAvaria(@Body avaria: AvariaItem): Response<Map<String, Any>>

    // Financeiro
    @PATCH("orders/installments/{id}")
    suspend fun updateInstallment(@Path("id") id: String, @Body updates: Map<String, Any?>): Response<Map<String, Any>>
}
