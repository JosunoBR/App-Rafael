@echo off
chcp 65001 >nul
echo ========================================================
echo  🚀 ATUALIZANDO SISTEMA REDE MEGA 12 NA HOSTINGER VPS
echo  Servidor: grupomega.cloud (179.199.151.29)
echo ========================================================
echo.

echo [1/3] Enviando alterações locais para o GitHub...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] Git push retornou código diferente de zero. Verifique se há commits pendentes.
)

echo.
echo [2/3] Conectando ao VPS e aplicando atualizações...
ssh root@179.199.151.29 "cd /var/www/app-rafael && git fetch origin main && git reset --hard origin/main && cd web && npm install && npm run build && cd ../backend && npm install && pm2 reload mega12-sistema"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  ✔ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!
    echo  O sistema já está atualizado em: https://grupomega.cloud
    echo ========================================================
) else (
    echo.
    echo [ERRO] Ocorreu uma falha ao atualizar o servidor VPS.
)

echo.
pause
