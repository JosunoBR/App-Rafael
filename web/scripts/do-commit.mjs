import { execSync } from 'child_process';

try {
  console.log('Staging web changes...');
  execSync('git add web', { stdio: 'inherit' });

  console.log('Committing...');
  const msg = 'feat: migracao para navegacao web multi-paginas (react-router-dom), modularizacao por dominios e design system desacoplado';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Commit and push completed successfully.');
  process.exit(0);
} catch (err) {
  console.error('Git error:', err);
  process.exit(1);
}
