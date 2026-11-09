package br.com.mega12.app

interface Platform {
    val name: String
    val isIOS: Boolean
}

expect fun getPlatform(): Platform

