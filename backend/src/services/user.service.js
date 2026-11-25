const userRepository = require('../repositories/userRepository');
const authService = require('./auth.service');
const { queryOne, queryAll, withTransaction } = require('../config/database');
async function validateStoreBinding(role, storeId, userId = null) {
  if (role !== 'unidade') return null;
  if (typeof storeId !== 'string' || !storeId || !await queryOne('SELECT id FROM stores WHERE id=? AND active=1', [storeId])) {
    const error = new Error('Selecione uma unidade ativa para este usuário.'); error.statusCode = 400; throw error;
  }
  const occupied = await queryOne("SELECT id FROM users WHERE role='unidade' AND ativo=1 AND storeId=? AND (? IS NULL OR id<>?)", [storeId, userId, userId]);
  if (occupied) { const error = new Error('Esta unidade já possui um login vinculado. Escolha outra unidade.'); error.statusCode = 409; throw error; }
  return storeId;
}

function unitPermissions(role, permissions = {}) {
  if (role !== 'unidade') return permissions;
  const allowed = ['nav:store_portal','units:submit','units:view_goals','nav:near_expiry'];
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions) || Object.entries(permissions).some(([key,value]) => !allowed.includes(key) || typeof value !== 'boolean')) {
    const error = new Error('O perfil Unidade aceita apenas permissões da operação da própria loja.'); error.statusCode = 400; throw error;
  }
  return permissions;
}

class UserService {
  async availableStores(excludeUserId = null) {
    return queryAll(`SELECT s.id,s.name,s.active FROM stores s WHERE s.active=1 AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.role='unidade' AND u.ativo=1 AND u.storeId=s.id AND (? IS NULL OR u.id<>?)
    ) ORDER BY s.name`, [excludeUserId, excludeUserId]);
  }

  async listUsers() {
    return await userRepository.findAll();
  }

  async getUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    const { senha: _, ...safeUser } = user;
    return safeUser;
  }

  async createUser(userData) {
    if (!userData.nome || !userData.email || !userData.senha || !userData.role) { const error = new Error('Nome, e-mail, senha e perfil são obrigatórios.'); error.statusCode = 400; throw error; }
    const hashedPassword = await authService.hashPassword(userData.senha);
    return withTransaction(async () => {
    if (!userData.nome || !userData.email || !userData.senha || !userData.role) {
      const err = new Error('Nome, e-mail, senha e perfil (role) são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = await userRepository.findByEmailOrAlias(cleanEmail);
    if (existing) {
      const err = new Error('Já existe um usuário cadastrado com este e-mail.');
      err.statusCode = 400;
      throw err;
    }

    const storeId = userData.ativo === false || userData.ativo === 0 ? null : await validateStoreBinding(userData.role, userData.storeId);
    const now = new Date().toISOString();

    const newUser = {
      id: userData.id || ('usr_' + Date.now()),
      nome: userData.nome.trim(),
      email: cleanEmail,
      senha: hashedPassword,
      role: userData.role,
      storeId,
      cargo: userData.cargo?.trim() || '',
      telefone: userData.telefone?.trim() || '',
      ativo: userData.ativo !== undefined ? userData.ativo : 1,
      permissions: unitPermissions(userData.role, userData.permissions || {}),
      createdAt: now,
      updatedAt: now
    };

    const saved = await userRepository.create(newUser);
    const { senha: _, ...safeUser } = saved;
    return safeUser;
    });
  }

  async updateUser(id, updateData) {
    const hashedUpdatePassword = updateData.senha && updateData.senha.trim() !== '' ? await authService.hashPassword(updateData.senha) : null;
    return withTransaction(async () => {
    if (id === 'usr_root') {
      const err = new Error('O usuário raiz (root) do sistema é reservado e protegido.');
      err.statusCode = 403;
      throw err;
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const dataToUpdate = { ...updateData };
    dataToUpdate.permissions = unitPermissions(updateData.role ?? existing.role, updateData.permissions ?? (updateData.role === 'unidade' && existing.role !== 'unidade' ? {} : existing.permissions));
    const effectiveActive = updateData.ativo ?? existing.ativo;
    if (effectiveActive !== false && effectiveActive !== 0 && (updateData.role === 'unidade' || (existing.role === 'unidade' && updateData.role === undefined))) {
      dataToUpdate.storeId = await validateStoreBinding('unidade', updateData.storeId ?? existing.storeId, id);
    } else {
      dataToUpdate.storeId = null;
    }

    if (updateData.email) {
      dataToUpdate.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.senha && updateData.senha.trim() !== '') {
      dataToUpdate.senha = hashedUpdatePassword;
    } else {
      delete dataToUpdate.senha;
    }

    const updated = await userRepository.update(id, dataToUpdate);
    const { senha: _, ...safeUser } = updated;
    return safeUser;
    });
  }

  async updatePermissions(id, permissions) {
    if (id === 'usr_root') {
      const err = new Error('O usuário raiz (root) possui acesso irrestrito por design.');
      err.statusCode = 403;
      throw err;
    }

    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      const err = new Error('O campo permissions deve ser um objeto válido.');
      err.statusCode = 400;
      throw err;
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const updated = await userRepository.update(id, { permissions: unitPermissions(existing.role, permissions) });
    const { senha: _, ...safeUser } = updated;
    return safeUser;
  }

  async deleteUser(id) {
    if (id === 'usr_root') {
      const err = new Error('O usuário raiz (root) do sistema não pode ser removido.');
      err.statusCode = 403;
      throw err;
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    await userRepository.delete(id);
    return { success: true, message: 'Usuário removido com sucesso.' };
  }
}

module.exports = new UserService();
