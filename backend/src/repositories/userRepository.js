const { queryAll, queryOne, execute } = require('../config/database');

class UserRepository {
  _hydrate(row) {
    if (!row) return null;
    let permissions = {};
    if (row.permissions) {
      if (typeof row.permissions === 'object') {
        permissions = row.permissions;
      } else {
        try {
          permissions = JSON.parse(row.permissions);
        } catch {
          permissions = {};
        }
      }
    }
    return {
      ...row,
      permissions
    };
  }

  async findAll() {
    const rows = await queryAll(
      "SELECT id, nome, email, role, cargo, telefone, ativo, permissions, createdAt, updatedAt FROM users WHERE LOWER(email) != 'root' AND id != 'usr_root' AND LOWER(nome) != 'root' ORDER BY nome ASC"
    );
    return rows.map(r => this._hydrate(r));
  }

  async findById(id) {
    const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
    return this._hydrate(row);
  }

  async findByEmailOrAlias(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const row = await queryOne(
      `SELECT * FROM users 
       WHERE (
         LOWER(email) = ? 
         OR LOWER(nome) = ? 
         OR id = ?
         OR (id = 'usr_root' AND (? = 'root' OR ? = 'root@mega12.com.br'))
       ) AND ativo = 1`,
      [clean, clean, clean, clean, clean]
    );
    return this._hydrate(row);
  }

  async create(user) {
    const permissionsStr = typeof user.permissions === 'object' 
      ? JSON.stringify(user.permissions) 
      : (user.permissions || '{}');

    const sql = `
      INSERT INTO users (id, nome, email, senha, role, cargo, telefone, ativo, permissions, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(sql, [
      user.id,
      user.nome,
      user.email,
      user.senha,
      user.role,
      user.cargo || '',
      user.telefone || '',
      user.ativo !== undefined ? (user.ativo ? 1 : 0) : 1,
      permissionsStr,
      user.createdAt,
      user.updatedAt
    ]);
    return await this.findById(user.id);
  }

  async update(id, user) {
    const fields = [];
    const params = [];

    if (user.nome !== undefined) { fields.push("nome = ?"); params.push(user.nome); }
    if (user.email !== undefined) { fields.push("email = ?"); params.push(user.email); }
    if (user.senha !== undefined && user.senha !== '') { fields.push("senha = ?"); params.push(user.senha); }
    if (user.role !== undefined) { fields.push("role = ?"); params.push(user.role); }
    if (user.cargo !== undefined) { fields.push("cargo = ?"); params.push(user.cargo); }
    if (user.telefone !== undefined) { fields.push("telefone = ?"); params.push(user.telefone); }
    if (user.ativo !== undefined) { fields.push("ativo = ?"); params.push(user.ativo ? 1 : 0); }
    if (user.permissions !== undefined) {
      fields.push("permissions = ?");
      params.push(typeof user.permissions === 'object' ? JSON.stringify(user.permissions) : (user.permissions || '{}'));
    }

    fields.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, params);
    return await this.findById(id);
  }

  async delete(id) {
    await execute("DELETE FROM users WHERE id = ?", [id]);
    return true;
  }
}

module.exports = new UserRepository();
