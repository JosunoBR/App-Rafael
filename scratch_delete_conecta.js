const initSqlJs = require('./backend/node_modules/sql.js');
const fs = require('fs');
const path = require('path');

async function clean() {
  const SQL = await initSqlJs();
  const dbFile = path.resolve('backend/data/mega12.db');
  if (!fs.existsSync(dbFile)) {
    console.log('DB file does not exist');
    return;
  }
  const db = new SQL.Database(fs.readFileSync(dbFile));
  db.run("DELETE FROM suppliers WHERE razaoSocial = 'CONECTA' OR cnpj = '37.144.240/0001-70'");
  const data = db.export();
  fs.writeFileSync(dbFile, Buffer.from(data));
  console.log('Successfully cleaned CONECTA from suppliers DB');

  const check = db.exec("SELECT id, razaoSocial, cnpj FROM suppliers");
  console.log('Remaining suppliers:', JSON.stringify(check, null, 2));
}

clean().catch(console.error);
