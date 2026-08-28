const userService = require('../services/user.service');

class UserController {
  async list(req, res, next) {
    try {
      const users = await userService.listUsers();
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUser(req.params.id);
      return res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      return res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      return res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await userService.deleteUser(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
