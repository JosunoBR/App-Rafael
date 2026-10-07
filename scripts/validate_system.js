const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function runStep(name, command, cwd = ROOT_DIR) {
  console.log(`\n===============================================================`);
  console.log(`▶ EXECUTANDO: ${name}`);
  console.log(`  Comando: ${command}`);
  console.log(`  Diretório: ${cwd}`);
  console.log(`===============================================================`);
  const start = Date.now();
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: process.env
    });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ [SUCESSO] ${name} concluído em ${duration}s`);
    return true;
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`❌ [FALHA] ${name} falhou após ${duration}s`);
    return false;
  }
}

async function main() {
  console.log('🚀 INICIANDO BATERIA UNIFICADA DE VALIDAÇÃO (WEB, BACKEND, ANDROID)');
  const results = {};

  // 1. Lint Web
  results['Lint Web (Oxlint)'] = runStep(
    '1. Lint Web (Oxlint)',
    'npx oxlint --quiet',
    path.join(ROOT_DIR, 'web')
  );

  // 2. Build Web
  results['Build Web (TSC + Vite)'] = runStep(
    '2. Build Web (TSC + Vite)',
    'npm run build',
    path.join(ROOT_DIR, 'web')
  );

  // 3. Testes do Backend
  results['Testes Backend (Pipeline)'] = runStep(
    '3. Testes Backend - Esteira 5 Etapas',
    'node tests/test_pipeline_5_stages.js',
    path.join(ROOT_DIR, 'backend')
  );

  results['Testes Backend (Integridade Financeira)'] = runStep(
    '4. Testes Backend - Integridade Financeira',
    'node tests/test_financial_integrity.js',
    path.join(ROOT_DIR, 'backend')
  );

  results['Testes Backend (Governança de Doca)'] = runStep(
    '5. Testes Backend - Governança de Doca e Ruptura',
    'node tests/test_dock_shortage_governance.js',
    path.join(ROOT_DIR, 'backend')
  );

  // 4. Build Android
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? '.\\gradlew.bat assembleDebug' : './gradlew assembleDebug';
  results['Build Android (assembleDebug)'] = runStep(
    '6. Build Android (assembleDebug)',
    gradlewCmd,
    path.join(ROOT_DIR, 'android_app')
  );

  console.log('\n===============================================================');
  console.log('📊 PAINEL CONSOLIDADO DE QUALIDADE');
  console.log('===============================================================');
  let hasFailures = false;
  for (const [step, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${step}: ${passed ? 'APROVADO' : 'REPROVADO'}`);
    if (!passed) hasFailures = true;
  }
  console.log('===============================================================');

  if (hasFailures) {
    console.error('⚠️ Foram encontradas falhas na esteira de validação. Verifique os logs acima.');
    process.exit(1);
  } else {
    console.log('🎉 TODAS AS VALIDAÇÕES PASSARAM COM 100% DE SUCESSO!');
    process.exit(0);
  }
}

main();
