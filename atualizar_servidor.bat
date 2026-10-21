@echo off
setlocal
cd /d "%~dp0"
title Mega 12 - Atualizar Servidor Hostinger

echo ========================================================
echo  REDE MEGA 12 - ATUALIZANDO SISTEMA NA HOSTINGER VPS
echo  Servidor: grupomega.cloud (179.199.151.29)
echo ========================================================
echo.

:: 1. Verificar se o Git esta instalado
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Git nao foi encontrado no sistema.
    pause
    exit /b 1
)

:: 2. Enviar alteracoes locais para o GitHub
echo [1/2] Enviando alteracoes locais para o GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao enviar para o GitHub. Verifique conexao ou conflitos.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Conectando ao VPS da Hostinger e aplicando atualizacoes...
echo (Se for solicitada a senha do usuario root, digite-a no prompt)
echo.

ssh -t root@179.199.151.29 "cd /var/www/app-rafael && git fetch origin main && git reset --hard origin/main && cd web && npm install && npm run build && cd ../backend && npm install && pm2 reload mega12-sistema"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCESSO] ATUALIZACAO CONCLUIDA COM SUCESSO!
    echo  O sistema ja esta atualizado em: https://grupomega.cloud
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [AVISO] A conexao SSH automatica nao concluiu.
    echo  Para atualizar diretamente pelo painel Hostinger (hPanel):
    echo  1. Acesse o VPS na Hostinger ^> Terminal do Navegador
    echo  2. Cole e execute o comando abaixo:
    echo.
    echo  cd /var/www/app-rafael ^&^& git fetch origin main ^&^& git reset --hard origin/main ^&^& cd web ^&^& npm install ^&^& npm run build ^&^& cd ../backend ^&^& npm install ^&^& pm2 reload mega12-sistema
    echo ========================================================
)

echo.
pause
