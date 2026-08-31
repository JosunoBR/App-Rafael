#!/usr/bin/env bash

# ================================================================
#           REDE MEGA 12 - EXECUTÁVEL DIRETO PARA MAC (Finder)
# ================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

clear
echo "================================================================"
echo "           REDE MEGA 12 - SERVIDOR UNIFICADO (macOS)"
echo "================================================================"
echo ""

# 1. Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[AVISO] Node.js não foi detectado neste MacBook."
    echo ""
    echo "Para rodar o sistema, instale o Node.js:"
    echo "1. Se houver o instalador na pasta 'Instalador_Node_Mac', abra e instale."
    echo "2. Ou baixe direto em: https://nodejs.org/"
    echo ""
    read -p "Pressione Enter para fechar..."
    exit 1
fi

# 2. Verificar dependências do Backend
if [ ! -d "backend/node_modules" ]; then
    echo "[1/2] Preparando dependências do Backend (aguarde alguns segundos)..."
    cd backend && npm install && cd ..
fi

# 3. Verificar dependências do Frontend
if [ ! -d "web/node_modules" ]; then
    echo "[2/2] Preparando dependências do Frontend (aguarde alguns segundos)..."
    cd web && npm install && cd ..
fi

# 4. Iniciar tudo
echo ""
echo "Iniciando sistema..."
node runner.js
