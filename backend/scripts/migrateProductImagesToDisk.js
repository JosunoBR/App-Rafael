/**
 * Script de Migração: Fotos de Produtos de Base64 (SQLite) para Disco Persistente
 * 
 * Execução sob demanda (Opção 2):
 *   node backend/scripts/migrateProductImagesToDisk.js
 *   ou no Railway CLI:
 *   railway run npm run migrate-images
 */

const fs = require('fs');
const path = require('path');
const { getDatabase, flushDatabaseToDisk, dbPath } = require('../src/config/database');

async function runMigration() {
  console.log('================================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO DE FOTOS DOS PRODUTOS: SQLite -> Disco');
  console.log('================================================================\n');

  const startTime = Date.now();
  const db = await getDatabase();

  const dataDir = process.env.DB_DIR || path.resolve(__dirname, '../data');
  const productImagesDir = path.join(dataDir, 'produtos');
  if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
    console.log(`📁 Diretório de fotos criado: ${productImagesDir}`);
  }

  const initialDbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  console.log(`📊 Tamanho inicial do SQLite (${path.basename(dbPath)}): ${(initialDbSize / (1024 * 1024)).toFixed(2)} MB`);

  // 1. Localizar produtos com fotos em Base64
  const queryProducts = db.exec("SELECT id, codigo, codigoInterno, descricao, fotoUrl FROM products WHERE fotoUrl LIKE 'data:image/%'");
  
  if (!queryProducts || queryProducts.length === 0 || queryProducts[0].values.length === 0) {
    console.log('✅ Nenhum produto com imagem em Base64 encontrado.');
    console.log('   O catálogo já está 100% otimizado com fotos em disco!');
    return;
  }

  const cols = queryProducts[0].columns;
  const idIdx = cols.indexOf('id');
  const codIdx = cols.indexOf('codigo');
  const codIntIdx = cols.indexOf('codigoInterno');
  const descIdx = cols.indexOf('descricao');
  const fotoIdx = cols.indexOf('fotoUrl');

  const productsToMigrate = queryProducts[0].values;
  console.log(`🔍 Encontrados ${productsToMigrate.length} produto(s) com fotos em Base64 para migrar.\n`);

  let migratedCount = 0;
  let totalBytesSaved = 0;

  for (let i = 0; i < productsToMigrate.length; i++) {
    const row = productsToMigrate[i];
    const id = row[idIdx];
    const codigo = row[codIdx] || row[codIntIdx] || id;
    const descricao = row[descIdx] || 'Sem descrição';
    const oldBase64 = row[fotoIdx];

    try {
      const match = oldBase64.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.*)$/i);
      if (!match) {
        console.warn(`⚠️ [${i + 1}/${productsToMigrate.length}] Formato Base64 não reconhecido para o produto ${codigo}. Pulando.`);
        continue;
      }

      let ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const buffer = Buffer.from(match[2], 'base64');
      const safeId = String(id || codigo).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `prod_${safeId}_${Date.now()}_${i}.${ext}`;
      const targetPath = path.join(productImagesDir, filename);

      fs.writeFileSync(targetPath, buffer);

      const newUrl = `/api/products/images/${filename}`;
      const savedBytes = oldBase64.length - newUrl.length;
      totalBytesSaved += Math.max(0, savedBytes);

      // Atualiza tabela products
      db.run("UPDATE products SET fotoUrl = ? WHERE id = ?", [newUrl, id]);

      // Atualiza tabelas relacionadas onde a foto possa estar replicada
      try {
        db.run("UPDATE stock_items SET fotoUrl = ? WHERE (codigo = ? OR codigoInterno = ?) AND fotoUrl LIKE 'data:image/%'", [newUrl, codigo, codigo]);
      } catch (_) {}

      try {
        db.run("UPDATE order_items SET fotoUrl = ? WHERE (codigo = ? OR codigoInterno = ?) AND fotoUrl LIKE 'data:image/%'", [newUrl, codigo, codigo]);
      } catch (_) {}

      migratedCount++;
      if (migratedCount % 20 === 0 || migratedCount === productsToMigrate.length) {
        console.log(`  ✓ [${migratedCount}/${productsToMigrate.length}] Migrado: ${codigo} - ${descricao.substring(0, 30)} -> ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Erro ao migrar produto ${codigo}:`, err.message);
    }
  }

  console.log(`\n💾 Persistindo alterações e executando VACUUM no SQLite para liberar espaço...`);
  flushDatabaseToDisk();

  try {
    db.run("VACUUM");
    flushDatabaseToDisk();
    console.log(`🧹 VACUUM executado com sucesso!`);
  } catch (vacErr) {
    console.warn(`Aviso ao rodar VACUUM:`, vacErr.message);
  }

  const finalDbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  const freedBytes = initialDbSize - finalDbSize;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n================================================================');
  console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log(`⏱️ Tempo total: ${elapsed}s`);
  console.log(`📦 Produtos migrados: ${migratedCount} de ${productsToMigrate.length}`);
  console.log(`🖼️ Arquivos salvos em disco: ${productImagesDir}`);
  console.log(`📊 Espaço Base64 removido: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📉 Tamanho SQLite antes: ${(initialDbSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📉 Tamanho SQLite depois: ${(finalDbSize / (1024 * 1024)).toFixed(2)} MB`);
  if (freedBytes > 0) {
    console.log(`✨ Redução direta no arquivo .db: ${(freedBytes / (1024 * 1024)).toFixed(2)} MB liberados!`);
  }
  console.log('================================================================\n');
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Falha fatal na migração:', err);
    process.exit(1);
  });
