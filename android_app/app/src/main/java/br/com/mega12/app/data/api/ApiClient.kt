package br.com.mega12.app.data.api

import br.com.mega12.app.data.local.PreferencesManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var preferencesManager: PreferencesManager? = null
    private var currentRetrofit: Retrofit? = null
    private var currentUrl: String = ""

    fun init(prefs: PreferencesManager) {
        this.preferencesManager = prefs
    }

    fun getService(): Mega12ApiService {
        val prefs = preferencesManager ?: throw IllegalStateException("ApiClient not initialized!")
        val baseUrl = prefs.serverUrl

        if (currentRetrofit == null || currentUrl != baseUrl) {
            currentUrl = baseUrl

            val authInterceptor = Interceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()

                prefs.authToken?.let { token ->
                    requestBuilder.header("Authorization", "Bearer $token")
                }

                chain.proceed(requestBuilder.build())
            }

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(loggingInterceptor)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            currentRetrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }

        return currentRetrofit!!.create(Mega12ApiService::class.java)
    }

    fun resetClient() {
        currentRetrofit = null
    }
}
