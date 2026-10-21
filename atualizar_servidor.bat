@echo off
setlocal enabledelayedexpansion
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
    echo Por favor, instale o Git para continuar.
    echo.
    pause
    exit /b 1
)

:: 2. Verificar se ha alteracoes locais pendentes de commit
for /f "tokens=*" %%i in ('git status --porcelain') do (
    set HAS_CHANGES=1
)

if defined HAS_CHANGES (
    echo [AVISO] Existem arquivos modificados localmente que ainda nao foram commitados:
    git status -s
    echo.
    set /p AUTO_COMMIT="Deseja comitar e enviar essas alteracoes agora? (S/N): "
    if /i "!AUTO_COMMIT!"=="S" (
        set /p MSG_COMMIT="Digite a mensagem do commit (ou ENTER para 'atualizacao do sistema'): "
        if "!MSG_COMMIT!"=="" set MSG_COMMIT=atualizacao do sistema
        git add -A
        git commit -m "!MSG_COMMIT!"
    )
)

:: 3. Enviar alteracoes locais para o GitHub
echo.
echo [1/2] Enviando alteracoes locais para o GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo  [ERRO] Falha ao enviar para o GitHub.
    echo  Verifique sua conexao ou se ha conflitos pendentes.
    echo ========================================================
    echo.
    pause
    exit /b %errorlevel%
)

:: 4. Conectar na Hostinger via SSH com a chave configurada e atualizar o VPS
echo.
echo [2/2] Conectando ao VPS da Hostinger e aplicando atualizacoes...
echo       - Sincronizando repositorio no servidor...
echo       - Compilando Frontend Web (React / Vite)...
echo       - Atualizando dependencias e recarregando PM2...
echo.

set SSH_KEY_OPT=
if exist "%USERPROFILE%\.ssh\id_ed25519" (
    set SSH_KEY_OPT=-i "%USERPROFILE%\.ssh\id_ed25519"
)

ssh %SSH_KEY_OPT% -o StrictHostKeyChecking=accept-new root@179.199.151.29 "cd /var/www/app-rafael && git fetch origin main && git reset --hard origin/main && cd web && npm install --no-audit --no-fund --loglevel=error && npm run build && cd ../backend && npm install --no-audit --no-fund --loglevel=error && pm2 reload mega12-sistema"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCESSO] SISTEMA ATUALIZADO COM SUCESSO!
    echo.
    echo  - Frontend Web compilado e publicado
    echo  - Backend Node.js recarregado no PM2
    echo  - Acesse o sistema em: https://grupomega.cloud
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [AVISO] Ocorreu uma instabilidade na conexao com o VPS.
    echo  Se necessario, acesse o Terminal do Navegador na Hostinger
    echo  e execute o comando manual:
    echo.
    echo  cd /var/www/app-rafael ^&^& git fetch origin main ^&^& git reset --hard origin/main ^&^& cd web ^&^& npm install ^&^& npm run build ^&^& cd ../backend ^&^& npm install ^&^& pm2 reload mega12-sistema
    echo ========================================================
)

echo.
pause
