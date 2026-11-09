const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const userRepository = require('../repositories/userRepository');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Acesso não autorizado. Token de autenticação não fornecido.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded && decoded.id) {
      try {
        const dbUser = await userRepository.findById(decoded.id);
        if (dbUser) {
          if (dbUser.ativo === 0) {
            return res.status(401).json({ 
              error: 'Usuário desativado pelo administrador. Contate o suporte.' 
            });
          }
          // Garante permissões, cargo e dados sempre atualizados em tempo real direto do banco
          decoded.permissions = dbUser.permissions || {};
          decoded.role = dbUser.role || decoded.role;
          decoded.nome = dbUser.nome || decoded.nome;
          decoded.email = dbUser.email || decoded.email;
        }
      } catch (dbErr) {
        console.warn('[authMiddleware] Falha ao consultar usuário no banco:', dbErr.message);
      }
    }
    req.user = decoded;
    return next();
  } catch (err) {
    // Se o token for inválido ou expirado
    return res.status(401).json({ 
      error: 'Token de autenticação inválido ou expirado. Por favor faça login novamente.' 
    });
  }
}

// Middleware opcional (se houver token decodifica, mas não bloqueia a requisição)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded && decoded.id) {
        try {
          const dbUser = await userRepository.findById(decoded.id);
          if (dbUser) {
            if (dbUser.ativo === 0) {
              return res.status(401).json({ 
                error: 'Usuário desativado pelo administrador.' 
              });
            }
            decoded.permissions = dbUser.permissions || {};
            decoded.role = dbUser.role || decoded.role;
            decoded.nome = dbUser.nome || decoded.nome;
            decoded.email = dbUser.email || decoded.email;
          }
        } catch {}
      }
      req.user = decoded;
    } catch {
      // Ignora erro no opcional
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth
};
