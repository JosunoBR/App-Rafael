const { spawn, exec } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const webDir = path.join(rootDir, 'web');

console.log('================================================================');
console.log('           REDE MEGA 12 - SERVIDOR UNIFICADO');
console.log('================================================================\n');

// 1. Iniciar Backend
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('[1/2] Iniciando Backend API (Porta 3001)...');
const backend = spawn(npmCmd, ['start'], {
  cwd: backendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[BACKEND]\x1b[0m ${data.toString()}`);
});
backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[BACKEND AVISO]\x1b[0m ${data.toString()}`);
});

// 2. Iniciar Frontend
console.log('[2/2] Iniciando Frontend Web (Vite)...');
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: webDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data.toString()}`);
});
frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[FRONTEND AVISO]\x1b[0m ${data.toString()}`);
});

// 3. Abrir navegador automaticamente
setTimeout(() => {
  const startCmd = isWin ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  exec(`${startCmd} http://localhost:5173`);
  console.log('\n\x1b[32m================================================================\x1b[0m');
  console.log('\x1b[32m>>> Sistema aberto no navegador: http://localhost:5173\x1b[0m');
  console.log('\x1b[36m>>> Backend API: http://localhost:3001/api/health\x1b[0m');
  console.log('\x1b[33m>>> Pressione Ctrl+C nesta tela para encerrar o sistema.\x1b[0m');
  console.log('\x1b[32m================================================================\x1b[0m\n');
}, 3000);

let exiting = false;
const cleanExit = () => {
  if (exiting) return;
  exiting = true;
  console.log('\nEncerrando todos os servidores...');
  if (isWin) {
    if (backend.pid) exec(`taskkill /pid ${backend.pid} /T /F 2>nul`);
    if (frontend.pid) exec(`taskkill /pid ${frontend.pid} /T /F 2>nul`);
  } else {
    backend.kill();
    frontend.kill();
  }
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
