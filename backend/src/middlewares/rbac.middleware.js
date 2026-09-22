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

module.exports = {
  requireRole
};
