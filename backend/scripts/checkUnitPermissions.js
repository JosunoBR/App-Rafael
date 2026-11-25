const assert=require('node:assert/strict');
const {requirePermission,requireRole}=require('../src/middlewares/rbac.middleware');
function status(middleware,permissions={},name='Operador'){let result=200;middleware({user:{id:'unit-account',role:'unidade',nome:name,permissions}},{status(code){result=code;return this},json(){return this}},()=>{});return result;}
for(const code of ['nav:store_portal','units:submit','units:view_goals','nav:near_expiry']){
 assert.equal(status(requirePermission(code)),200);
 assert.equal(status(requirePermission(code),{[code]:false}),403);
}
for(const code of ['financial:view','financial:pay_entry','nav:units_conference','goals:manage','nav:units_bi','orders:create']) {
 assert.equal(status(requirePermission(code),{[code]:true}),403);
 assert.equal(status(requirePermission(code),{[code]:true},'Root'),403);
}
assert.equal(status(requireRole('diretoria'),{},'Root'),403);
console.log('Perfil Unidade: padrões operacionais, bloqueios individuais e rejeição de elevação administrativa verificados.');
