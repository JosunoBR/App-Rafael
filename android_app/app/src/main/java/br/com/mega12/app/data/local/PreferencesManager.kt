package br.com.mega12.app.data.local

import android.content.Context
import android.content.SharedPreferences
import br.com.mega12.app.data.model.User
import com.google.gson.Gson

class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("mega12_app_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_SERVER_URL = "key_server_url"
        private const val KEY_AUTH_TOKEN = "key_auth_token"
        private const val KEY_SAVED_USER = "key_saved_user"
        // IP padrão para desenvolvimento no emulador Android (10.0.2.2 aponta para o localhost da máquina host)
        const val DEFAULT_SERVER_URL = "http://10.0.2.2:3001/api/"
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) {
            val formatted = if (value.endsWith("/")) value else "$value/"
            val withApi = if (formatted.endsWith("api/")) formatted else "${formatted}api/"
            prefs.edit().putString(KEY_SERVER_URL, withApi).apply()
        }

    var authToken: String?
        get() = prefs.getString(KEY_AUTH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_AUTH_TOKEN, value).apply()

    fun saveUser(user: User?) {
        if (user == null) {
            prefs.edit().remove(KEY_SAVED_USER).apply()
        } else {
            prefs.edit().putString(KEY_SAVED_USER, gson.toJson(user)).apply()
        }
    }

    fun getUser(): User? {
        val json = prefs.getString(KEY_SAVED_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clearSession() {
        authToken = null
        saveUser(null)
    }
}
