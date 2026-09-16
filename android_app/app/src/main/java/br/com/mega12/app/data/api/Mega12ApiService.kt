package br.com.mega12.app.data.api

import br.com.mega12.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface Mega12ApiService {

    @GET("health")
    suspend fun checkHealth(): Response<Map<String, Any>>

    // Autenticação & Usuários
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("users")
    suspend fun getUsers(): Response<List<User>>

    @POST("users")
    suspend fun saveUser(@Body user: User): Response<Map<String, Any>>

    // Produtos
    @GET("products")
    suspend fun getProducts(): Response<List<Product>>

    @POST("products")
    suspend fun saveProduct(@Body product: Product): Response<Map<String, Any>>

    @DELETE("products/{id}")
    suspend fun deleteProduct(@Path("id") productId: String): Response<Map<String, Any>>

    // Fornecedores
    @GET("suppliers")
    suspend fun getSuppliers(): Response<List<Supplier>>

    @POST("suppliers")
    suspend fun saveSupplier(@Body supplier: Supplier): Response<Map<String, Any>>

    @DELETE("suppliers/{id}")
    suspend fun deleteSupplier(@Path("id") supplierId: String): Response<Map<String, Any>>

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
    suspend fun saveFiscalConfig(@Body config: FiscalConfig): Response<Map<String, Any>>

    // Estoque Central
    @GET("stock")
    suspend fun getStock(): Response<List<CentralStockItem>>

    @POST("stock")
    suspend fun saveStockItem(@Body item: CentralStockItem): Response<Map<String, Any>>
}
