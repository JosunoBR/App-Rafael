@echo off
title Mega 12 - Sistema de Gestao (Servidor Unificado)

echo ================================================================
echo           REDE MEGA 12 - INICIALIZADOR DO SISTEMA
echo ================================================================
echo.

:: 1. Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no seu computador!
    echo Por favor, baixe e instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Verificar dependencias do Backend
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo [1/2] Instalando pacotes do backend, aguarde...
    call npm install
)

:: 3. Verificar dependencias do Frontend Web
cd /d "%~dp0web"
if not exist "node_modules" (
    echo [2/2] Instalando pacotes do frontend, aguarde...
    call npm install
)

:: 4. Iniciar tudo em uma unica janela
cd /d "%~dp0"
node runner.js
