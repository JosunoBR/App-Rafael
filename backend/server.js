const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config/environment');
const { dbPath, getDatabase } = require('./src/config/database');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// 1. Headers de Segurança & Proteção HTTP
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // Mantém compatibilidade com visualização de relatórios e canvas
}));

// 2. Middlewares de Requisição
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Montagem das Rotas da API Modular
app.use('/api', routes);

// 4. Middleware Global de Tratamento de Erros
app.use(errorHandler);

// 5. Inicialização do Servidor
async function bootstrap() {
  try {
    await getDatabase(); // Inicializa SQLite e executa migrações/seed
    app.listen(config.PORT, () => {
      console.log(`🚀 Servidor Backend SQLite da Rede Mega 12 rodando na porta ${config.PORT}`);
      console.log(`🛡️ Segurança: Helmet, JWT e Bcrypt Ativos | Clean Architecture (SRP + DIP + RBAC)`);
      console.log(`📂 Banco de dados SQLite: ${dbPath}`);
    });
  } catch (err) {
    console.error('Falha crítica na inicialização do servidor:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
