const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'mega12_super_secret_jwt_key_2026_rf_sec_auth',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  DB_FILENAME: process.env.DB_FILENAME || 'mega12.db'
};
