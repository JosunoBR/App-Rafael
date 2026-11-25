import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GOALS_PLAYWRIGHT_PATH || 'playwright');
const fixturePath = fileURLToPath(new URL(`../__width-fixture-${process.pid}.tsx`, import.meta.url));
const fixture = `import React, { useState } from 'react'; import { createRoot } from 'react-dom/client'; import '/src/index.css';
  import { ResizableTable } from '/src/shared/components/ResizableTable.tsx';
  localStorage.setItem('mega12_user', JSON.stringify({id: new URLSearchParams(location.search).get('user') || 'width-a'}));
  function Fixture() {
    const [extra, setExtra] = useState(false); const [value,setValue] = useState('');
    return <div style={{maxWidth:800}}><button onClick={()=>setExtra(!extra)}>Alternar coluna</button><div style={{overflow:'auto'}}>
      <ResizableTable resizeId="grouped-check" className="w-full border-collapse" data-testid="grouped"><thead><tr>
        <th rowSpan={2} data-resize-key="name" className="sticky left-0 bg-white" style={{width:180}}>Unidade</th>
        <th rowSpan={2} data-resize-key="code" className="sticky bg-white" style={{left:180,width:100}}>Código</th>
        <th colSpan={extra ? 3 : 2}>Vendas</th></tr><tr><th data-resize-key="2025">2025</th><th data-resize-key="2026">2026</th>{extra && <th data-resize-key="2027">2027</th>}</tr></thead>
      <tbody><tr><th className="sticky left-0 bg-white">Castro</th><td className="sticky bg-white" style={{left:180}}>ABC</td><td><input aria-label="Valor" value={value} onChange={e=>setValue(e.target.value)} /></td><td>200</td>{extra && <td>300</td>}</tr></tbody>
      <tfoot><tr><th colSpan={2}>Total</th><td>100</td><td>200</td>{extra && <td>300</td>}</tr></tfoot></ResizableTable>
    </div><div style={{overflow:'auto'}}><ResizableTable resizeId="independent-check" data-testid="independent"><thead><tr><th>Unidade</th><th>Saldo</th></tr></thead><tbody><tr><td>Castro</td><td>50</td></tr></tbody></ResizableTable></div></div>;
  } createRoot(document.getElementById('root')).render(<Fixture />);`;
fs.writeFileSync(fixturePath, fixture);
const vite = await createServer({ root: fileURLToPath(new URL('..',import.meta.url)), server: { host: '127.0.0.1', port: 0 }, plugins: [{ name:'table-width-fixture',
  configureServer(server) { server.middlewares.use(async (req,res,next) => { if (req.url.startsWith('/width-test')) { res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/width-test',`<html><body><div id="root"></div><script type="module" src="/__width-fixture-${process.pid}.tsx"></script></body></html>`)); } else next(); }); },
}] });
let browser;
try {
  await vite.listen(); browser = await chromium.launch({ channel:'msedge',headless:true });
  const page = await browser.newPage({ viewport:{width:1000,height:700} });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${vite.httpServer.address().port}/width-test`;
  await page.goto(url);
  const table=page.getByTestId('grouped'), header=table.getByRole('columnheader',{name:'Unidade',exact:true}), grip=header.getByRole('separator');
  const original=(await header.boundingBox()).width;
  const move=async(delta, finish='up')=>{ const box=await grip.boundingBox();const x=box.x+5,y=box.y+10;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta,y,{steps:6});if(finish==='escape')await page.keyboard.press('Escape');await page.mouse.up(); };
  await move(90);
  const custom=(await header.boundingBox()).width;
  assert.ok(Math.abs(custom-original-90)<2);
  assert.equal(await table.locator('colgroup col').count(),4,'Cabeçalho com rowspan e colspan deve resolver quatro colunas.');
  assert.ok(Math.abs(Number.parseFloat(await table.locator('tbody td').first().evaluate(el=>el.style.left))-custom)<2,'As colunas congeladas devem acompanhar a nova largura.');
  await page.getByLabel('Valor').fill('123');
  assert.ok(Math.abs((await header.boundingBox()).width-custom)<2,'Editar uma célula não pode perder a largura.');
  await page.getByRole('button',{name:'Alternar coluna'}).click();
  assert.equal(await table.locator('colgroup col').count(),5);
  assert.ok(Math.abs((await header.boundingBox()).width-custom)<2,'Adicionar colunas deve preservar as larguras existentes.');
  assert.equal(await page.getByTestId('independent').getAttribute('data-column-widths'),null,'Preferências são separadas por tabela.');
  await page.reload();assert.ok(Math.abs((await header.boundingBox()).width-custom)<2);
  await move(-40,'escape');assert.ok(Math.abs((await header.boundingBox()).width-custom)<2,'Escape deve cancelar o ajuste.');
  await move(-70);assert.ok(Math.abs((await header.boundingBox()).width-custom+70)<2,'Deve ser possível diminuir a largura.');
  const smaller=(await header.boundingBox()).width;
  await grip.dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',button:0,clientX:100,clientY:20,bubbles:true});
  await grip.dispatchEvent('pointermove',{pointerId:7,pointerType:'touch',clientX:120,clientY:20,bubbles:true});
  await grip.dispatchEvent('pointerup',{pointerId:7,pointerType:'touch',clientX:120,clientY:20,bubbles:true});
  assert.ok(Math.abs((await header.boundingBox()).width-smaller-20)<2,'O ajuste deve aceitar toque.');
  await page.goto(url+'?user=width-b');
  assert.equal(await table.getAttribute('data-column-widths'),null,'Outro usuário deve começar com suas próprias preferências.');
  await page.goto(url);
  await grip.dblclick();assert.equal(await table.getAttribute('data-column-widths'),null,'Duplo clique deve restaurar o ajuste automático.');
  assert.deepEqual(errors,[]);
  console.log('Larguras: arraste, redução, toque, cancelamento, cabeçalhos agrupados, colunas congeladas, atualização de linhas/colunas, persistência, isolamento por usuário/tabela e restauração verificados no navegador local.');
} finally { if(browser)await browser.close();await vite.close(); fs.unlinkSync(fixturePath); }
