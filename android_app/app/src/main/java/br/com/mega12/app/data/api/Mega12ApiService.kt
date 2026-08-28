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
}
