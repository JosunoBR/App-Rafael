const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
process.env.DB_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'mega12-unit-login-'));process.env.DB_FILENAME='test.db';
const db=require('../src/config/database'),users=require('../src/services/user.service'),repo=require('../src/repositories/userRepository');
(async()=>{
  let server;
  try{
    for(const id of ['unit_a','unit_b']) await db.execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)',[id,id,id,'A',1]);
    const input=(id,storeId)=>({id,nome:id,email:id+'@example.invalid',senha:'test-isolated-password',role:'unidade',storeId});
    const a=await users.createUser(input('unit_login_a','unit_a'));
    assert.equal(a.storeId,'unit_a');
    assert.ok(!(await users.availableStores()).some(s=>s.id==='unit_a'));
    assert.ok((await users.availableStores(a.id)).some(s=>s.id==='unit_a'));
    await assert.rejects(()=>users.createUser(input('duplicate','unit_a')),e=>e.statusCode===409);
    await assert.rejects(()=>users.createUser(input('missing',null)),e=>e.statusCode===400);
    await users.updateUser(a.id,{ativo:0});assert.equal((await repo.findById(a.id)).storeId,null);
    assert.ok((await users.availableStores()).some(s=>s.id==='unit_a'));
    const b=await users.createUser(input('unit_login_b','unit_a'));
    await assert.rejects(()=>users.updateUser(a.id,{ativo:1,storeId:'unit_a'}),e=>e.statusCode===409);
    await assert.rejects(()=>users.updateUser(a.id,{ativo:1}),e=>e.statusCode===400);
    await users.updateUser(a.id,{ativo:1,storeId:'unit_b'});
    const concurrency=await Promise.allSettled([users.createUser(input('concurrent_1','unit_a')),users.createUser(input('concurrent_2','unit_a'))]);
    assert.ok(concurrency.every(r=>r.status==='rejected'));
    await assert.rejects(()=>db.execute("INSERT INTO users(id,nome,email,senha,role,ativo,storeId,createdAt,updatedAt) VALUES('bypass','bypass','bypass@example.invalid','invalid','unidade',1,'unit_a','now','now')"));
    const express=require('express'),jwt=require('jsonwebtoken'),config=require('../src/config/environment');const app=express();app.use(express.json());app.use('/users',require('../src/routes/user.routes'));app.use('/closings',require('../src/routes/storeClosings.routes'));
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
    const oldToken=jwt.sign({id:b.id,role:'unidade',storeId:'unit_a'},config.JWT_SECRET,{expiresIn:'2m'});
    await users.deleteUser(b.id);assert.ok((await users.availableStores()).some(s=>s.id==='unit_a'));
    assert.equal((await fetch(base+'/closings',{headers:{Authorization:'Bearer '+oldToken}})).status,401,'Excluir deve invalidar o token antigo.');
    const results=await Promise.allSettled([users.createUser(input('race_1','unit_a')),users.createUser(input('race_2','unit_a'))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.statusCode===409).length,1);
    const root=jwt.sign({id:'usr_root'},config.JWT_SECRET,{expiresIn:'2m'});const r=await fetch(base+'/users/available-stores',{headers:{Authorization:'Bearer '+root}});assert.equal(r.status,200);assert.deepEqual(await r.json(),[]);
    const activeToken=jwt.sign({id:a.id},config.JWT_SECRET,{expiresIn:'2m'});await users.updateUser(a.id,{ativo:0});assert.equal((await fetch(base+'/closings',{headers:{Authorization:'Bearer '+activeToken}})).status,401);
    console.log('Login/unidade: vínculo obrigatório e exclusivo, edição, concorrência, restrição no SQLite, liberação por desativação/exclusão, reativação e invalidação da sessão verificados.');
  }finally{if(server)await new Promise(r=>server.close(r));db.flushDatabaseToDisk();}
})().catch(e=>{console.error(e);process.exitCode=1});
