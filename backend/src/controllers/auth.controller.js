const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;
      const result = await authService.login(email, senha);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getUserProfile(req.user.id);
      return res.json({
        success: true,
        valid: true,
        user
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const result = await authService.renewToken(req.user.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
