/**
 * Middleware para controle de acesso baseado em papéis (Role-Based Access Control)
 * @param  {...string} allowedRoles - Ex: 'diretoria', 'comprador', 'conferente'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Acesso não autorizado. Identificação do usuário ausente.' 
      });
    }

    const userRole = req.user.role;

    // Diretoria e Administrador Raiz (Root) possuem acesso irrestrito a todas as operações
    const isRoot = req.user.id === 'usr_root' || req.user.email?.toLowerCase() === 'root' || req.user.nome?.toLowerCase() === 'root';
    if (userRole === 'diretoria' || userRole === 'root' || isRoot) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Acesso negado. Seu perfil (${userRole}) não tem permissão para executar esta operação.` 
      });
    }

    return next();
  };
}

/**
 * Middleware para controle de acesso baseado em permissão granular ou papel
 * @param {string} permissionCode - Ex: 'orders:create', 'nav:financial'
 * @param  {...string} allowedRoles - Papéis que possuem acesso por padrão
 */
function requirePermission(permissionCode, ...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Acesso não autorizado. Identificação do usuário ausente.' 
      });
    }

    const userRole = req.user.role;
    const isRoot = req.user.id === 'usr_root' || req.user.email?.toLowerCase() === 'root' || req.user.nome?.toLowerCase() === 'root';
    if (userRole === 'diretoria' || userRole === 'root' || isRoot) {
      return next();
    }

    // Exceção granular configurada diretamente no usuário
    if (req.user.permissions && typeof req.user.permissions === 'object') {
      if (req.user.permissions[permissionCode] === true) {
        return next();
      }
      if (req.user.permissions[permissionCode] === false) {
        return res.status(403).json({ 
          error: `Acesso negado. A permissão "${permissionCode}" está desativada para o seu usuário.` 
        });
      }
    }

    // Fallback de papéis padrão
    if (allowedRoles.length > 0 && allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      error: `Acesso negado. Seu perfil (${userRole}) não possui a permissão "${permissionCode}".` 
    });
  };
}

module.exports = {
  requireRole,
  requirePermission
};
