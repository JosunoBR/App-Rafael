function ensureUnitLoginSchema(db) {
  db.run(`
    DROP INDEX IF EXISTS idx_unique_unit_login;
    CREATE UNIQUE INDEX idx_unique_unit_login ON users(storeId) WHERE role='unidade' AND ativo=1 AND storeId IS NOT NULL;
    DROP TRIGGER IF EXISTS require_unit_store_insert;
    DROP TRIGGER IF EXISTS require_unit_store_update;
    CREATE TRIGGER require_unit_store_insert BEFORE INSERT ON users
      WHEN NEW.role='unidade' AND NEW.ativo=1 AND (NEW.storeId IS NULL OR NOT EXISTS (SELECT 1 FROM stores WHERE id=NEW.storeId AND active=1))
      BEGIN SELECT RAISE(ABORT, 'Login ativo de unidade exige uma unidade ativa cadastrada.'); END;
    CREATE TRIGGER require_unit_store_update BEFORE UPDATE OF role,storeId,ativo ON users
      WHEN NEW.role='unidade' AND NEW.ativo=1 AND (NEW.storeId IS NULL OR NOT EXISTS (SELECT 1 FROM stores WHERE id=NEW.storeId AND active=1))
      BEGIN SELECT RAISE(ABORT, 'Login ativo de unidade exige uma unidade ativa cadastrada.'); END;
    CREATE TRIGGER IF NOT EXISTS release_disabled_unit_update AFTER UPDATE OF ativo,storeId ON users
      WHEN NEW.role='unidade' AND NEW.ativo=0 AND NEW.storeId IS NOT NULL
      BEGIN UPDATE users SET storeId=NULL WHERE id=NEW.id; END;
    CREATE TRIGGER IF NOT EXISTS release_disabled_unit_insert AFTER INSERT ON users
      WHEN NEW.role='unidade' AND NEW.ativo=0 AND NEW.storeId IS NOT NULL
      BEGIN UPDATE users SET storeId=NULL WHERE id=NEW.id; END;
    UPDATE users SET storeId=NULL WHERE role='unidade' AND ativo=0 AND storeId IS NOT NULL;
  `);
}
module.exports = { ensureUnitLoginSchema };
