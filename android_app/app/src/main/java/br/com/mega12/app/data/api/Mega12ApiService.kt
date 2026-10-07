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

    // Financeiro (Consulta de Lançamentos & Boletos)
    @GET("financial/entries")
    suspend fun getFinancialEntries(): Response<Map<String, Any>>

    // Condições de Pagamento
    @GET("payment-conditions")
    suspend fun getPaymentConditions(@Query("active") active: Boolean = true): Response<List<PaymentCondition>>

    // Separação & Doca Atômica
    @GET("orders/{id}/separation")
    suspend fun getSeparationState(@Path("id") orderId: String): Response<SeparationStateResponse>

    @PATCH("orders/{id}/separation/checks/{storeId}/{itemId}")
    suspend fun updateSeparationCheck(
        @Path("id") orderId: String,
        @Path("storeId") storeId: String,
        @Path("itemId") itemId: String,
        @Body request: SeparationCheckRequest
    ): Response<SeparationCheckResponse>

    @POST("orders/{id}/separation/damages")
    suspend fun addSeparationDamage(
        @Path("id") orderId: String,
        @Body request: DamageCreateRequest
    ): Response<DamageResponse>

    @DELETE("orders/{id}/separation/damages/{damageId}")
    suspend fun deleteSeparationDamage(
        @Path("id") orderId: String,
        @Path("damageId") damageId: String,
        @Query("expectedVersion") expectedVersion: Int? = null
    ): Response<Map<String, Any>>

    @POST("orders/{id}/send-to-faturamento")
    suspend fun sendToFaturamento(
        @Path("id") orderId: String,
        @Body request: SendToFaturamentoRequest
    ): Response<SendToFaturamentoResponse>
}

