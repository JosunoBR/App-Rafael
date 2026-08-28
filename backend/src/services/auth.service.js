const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const config = require('../config/environment');

class AuthService {
  async login(email, senha) {
    if (!email || !senha) {
      const err = new Error('E-mail e senha são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmailOrAlias(cleanEmail);

    if (!user) {
      const err = new Error('Usuário não encontrado ou inativo.');
      err.statusCode = 401;
      throw err;
    }

    // Verificar se a senha está hasheada com bcrypt
    let isPasswordValid = false;
    const isBcryptHash = user.senha && user.senha.startsWith('$2');

    if (isBcryptHash) {
      isPasswordValid = await bcrypt.compare(senha, user.senha);
    } else {
      // Migração suave: se a senha for texto plano antigo e bater, hasheia imediatamente
      isPasswordValid = (user.senha === senha);
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(senha, 10);
        await userRepository.update(user.id, { senha: hashedPassword });
      }
    }

    if (!isPasswordValid) {
      const err = new Error('Senha incorreta.');
      err.statusCode = 401;
      throw err;
    }

    // Gerar token JWT assinado
    const payload = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    const { senha: _, ...safeUser } = user;
    safeUser.token = token;

    return {
      success: true,
      user: safeUser,
      token
    };
  }

  async hashPassword(plainPassword) {
    if (!plainPassword || plainPassword.trim() === '') {
      throw new Error('Senha não pode ser vazia.');
    }
    return await bcrypt.hash(plainPassword, 10);
  }
}

module.exports = new AuthService();
