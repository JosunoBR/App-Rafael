#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 INICIANDO DEPLOY COMPLETO - REDE MEGA 12"
echo "Servidor: grupomega.cloud"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive

# 1. Atualização do Sistema
echo "📦 Atualizando repositórios do sistema..."
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx build-essential ufw

# 2. Instalação do Node.js 20 LTS
if ! command -v node >/dev/null 2>&1; then
    echo "⚡ Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✔ Node.js $(node -v) e NPM $(npm -v) prontos."

# 3. Instalação do PM2
if ! command -v pm2 >/dev/null 2>&1; then
    echo "⚙ Instalando PM2..."
    npm install -g pm2
fi

# 4. Clone ou Atualização do Repositório
TARGET_DIR="/var/www/app-rafael"
if [ ! -d "$TARGET_DIR/.git" ]; then
    echo "📥 Clonando repositório para $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    git clone https://github.com/JosunoBR/App-Rafael.git "$TARGET_DIR"
else
    echo "🔄 Atualizando repositório existente..."
    cd "$TARGET_DIR"
    git fetch origin main
    git reset --hard origin/main
fi

# 5. Compilação do Frontend Web (React / Vite)
echo "💻 Instalando dependências e compilando Frontend Web..."
cd "$TARGET_DIR/web"
npm install
npm run build

# 6. Instalação de Dependências do Backend
echo "⚡ Instalando dependências do Backend..."
cd "$TARGET_DIR/backend"
npm install

# 7. Restaurar Banco de Dados e Mídias (se o tarball de migração estiver em /tmp)
mkdir -p "$TARGET_DIR/backend/data"
if [ -f "/tmp/mega12_migration.tar.gz" ]; then
    echo "🗄️ Restaurando banco de dados e imagens do Railway..."
    tar -xzf /tmp/mega12_migration.tar.gz -C "$TARGET_DIR/backend/data"
    echo "✔ Dados restaurados com sucesso!"
fi

# Garantir permissões
chown -R root:root "$TARGET_DIR"

# 8. Configurar e Iniciar Serviço no PM2
echo "🚀 Iniciando aplicação com PM2..."
cd "$TARGET_DIR/backend"
pm2 delete mega12-sistema >/dev/null 2>&1 || true
pm2 start server.js --name "mega12-sistema" --time
pm2 save
pm2 startup systemd -u root --hp /root --force || true

# 9. Configuração do Nginx (Proxy Reverso)
echo "🌐 Configurando Nginx para grupomega.cloud..."
cat << 'EOF' > /etc/nginx/sites-available/grupomega.cloud
server {
    listen 80;
    listen [::]:80;
    server_name grupomega.cloud www.grupomega.cloud;

    client_max_body_size 100M;

    # Cabeçalhos de Segurança
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Frame-Options SAMEORIGIN;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
}
EOF

ln -sf /etc/nginx/sites-available/grupomega.cloud /etc/nginx/sites-enabled/grupomega.cloud
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 10. Firewall Básico (UFW)
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
echo "y" | ufw enable || true

echo "=========================================="
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "Aplicação rodando em: http://179.199.151.29"
echo "=========================================="
