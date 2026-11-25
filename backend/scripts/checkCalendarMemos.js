const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(),'mega12-calendar-memos-'));
process.env.DB_FILENAME = 'memos.db';
process.env.NODE_ENV = 'test';
const db = require('../src/config/database');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../src/config/environment');

async function main() {
  for (const id of ['memo_a','memo_b']) await db.execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)',[id,id,id,'A',1]);
  const now = new Date().toISOString();
  for (const [id, role, name, storeId] of [['memo_director','diretoria','Diretora de teste',null],['memo_finance','faturamento','Root',null],['memo_unit','unidade','Operador','memo_a']]) {
    await db.execute('INSERT INTO users(id,nome,email,senha,role,storeId,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)',[id,name,`${id}@example.test`,'unused-test-password',role,storeId,now,now]);
  }
  const app = express(); app.use(express.json()); app.use('/calendar-memos',require('../src/routes/calendarMemos.routes'));
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const call = async (actor, url, method='GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/calendar-memos${url}`,{ method,headers:{...(actor ? {Authorization:`Bearer ${jwt.sign({id:actor},config.JWT_SECRET,{expiresIn:'5m'})}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body) });
    return {status:response.status,data:await response.json()};
  };
  try {
    assert.equal((await call(null,'?month=2026-11')).status,401);
    for (const actor of ['memo_finance','memo_unit']) {
      assert.equal((await call(actor,'?month=2026-11')).status,403);
      assert.equal((await call(actor,'/memo_a/2026-11-03')).status,403);
      assert.equal((await call(actor,'/memo_a/2026-11-03','PUT',{content:'Indevido',version:0})).status,403);
    }
    let result = await call('memo_director','/memo_a/2026-11-03'); assert.equal(result.status,200); assert.equal(result.data.version,0);
    result = await call('memo_director','/memo_a/2026-11-03','PUT',{content:'  Avaliação do atendimento.\nEquipe cumpriu as orientações.  ',version:0});
    assert.equal(result.status,200);assert.equal(result.data.content,'Avaliação do atendimento.\nEquipe cumpriu as orientações.');assert.equal(result.data.authorName,'Diretora de teste');assert.equal(result.data.version,1);
    assert.equal((await call('usr_root','/memo_b/2026-11-03')).data.content,'','A avaliação de uma unidade não pode aparecer em outra.');
    assert.equal((await call('usr_root','/memo_a/2026-11-04')).data.content,'','A avaliação pertence somente à data escolhida.');
    assert.equal((await call('usr_root','?month=2026-11&storeId=memo_b')).data.length,0);
    assert.equal((await call('usr_root','?month=2026-11')).data.length,1);
    const concurrent = await Promise.all(['Revisão A','Revisão B'].map(content=>call('usr_root','/memo_a/2026-11-03','PUT',{content,version:1})));
    assert.deepEqual(concurrent.map(item=>item.status).sort(),[200,409]);
    assert.equal((await db.queryOne('SELECT COUNT(*) AS n FROM store_daily_memos')).n,2,'Texto anterior deve ser preservado com autor e data.');
    assert.equal((await db.queryOne('SELECT content FROM store_daily_memos WHERE version=1')).content,'Avaliação do atendimento.\nEquipe cumpriu as orientações.');
    for (const [url,body] of [['/memo_a/2026-02-30',{content:'Inválido',version:0}],['/memo_a/2026-11-05',{content:'a'.repeat(10001),version:0}],['/memo_a/2026-11-05',{content:'   ',version:0}],['/memo_a/2026-11-05',{content:'Texto',version:'0'}]]) assert.equal((await call('usr_root',url,'PUT',body)).status,400);
    assert.equal((await call('usr_root','/missing/2026-11-05','PUT',{content:'Texto',version:0})).status,404);
    assert.equal((await call('usr_root','?month=2026-13')).status,400);
    await db.execute('UPDATE stores SET name=?,active=0 WHERE id=?',['Unidade renomeada','memo_a']);
    result=await call('usr_root','/memo_a/2026-11-03');assert.equal(result.data.storeName,'Unidade renomeada');assert.equal(result.data.version,2);
    result=await call('usr_root','/memo_a/2026-11-03','PUT',{content:'',version:2});assert.equal(result.status,200);assert.equal(result.data.version,3);
    assert.equal((await call('usr_root','?month=2026-11')).data.length,0,'Texto limpo não deve deixar indicação de memorando ativo.');
    assert.equal((await db.queryOne('SELECT COUNT(*) AS n FROM store_daily_memos')).n,3,'Limpar o texto não pode apagar o histórico de revisões.');
    const stores=await db.queryAll('SELECT * FROM stores');
    await require('../src/repositories/fiscalRepository').updateStores(stores.filter(store=>store.id!=='memo_a'));
    assert.ok(await db.queryOne('SELECT id FROM stores WHERE id=?',['memo_a']),'Unidade com avaliação deve ser preservada e inativada.');
    await new Promise(resolve=>setTimeout(resolve,250));
    db.flushDatabaseToDisk();const SQL=await require('sql.js')();const disk=new SQL.Database(fs.readFileSync(db.dbPath));assert.equal(disk.exec('SELECT COUNT(*) FROM store_daily_memos')[0].values[0][0],3);disk.close();
    assert.deepEqual(await db.queryAll('PRAGMA foreign_key_check'),[]);
    console.log('Memorandos: persistência, unidade/data, autoria, versões, concorrência, permissões exclusivas da diretoria/root, validações, limpeza e preservação de unidades históricas verificados em banco temporário.');
  } finally { await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
