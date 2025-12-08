const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying DKU Adventure Rental Management System Setup...\n');

const checks = [
  { name: 'Backend package.json', path: './package.json' },
  { name: 'Backend tsconfig.json', path: './tsconfig.json' },
  { name: 'Backend entry point', path: './src/index.ts' },
  { name: 'Backend types', path: './src/types/index.ts' },
  { name: 'Prisma schema', path: './prisma/schema.prisma' },
  { name: 'Prisma client lib', path: './src/lib/prisma.ts' },
  { name: 'Frontend package.json', path: './client/package.json' },
  { name: 'Frontend tsconfig.json', path: './client/tsconfig.json' },
  { name: 'Vite config', path: './client/vite.config.ts' },
  { name: 'Frontend entry point', path: './client/src/main.tsx' },
  { name: 'Frontend App component', path: './client/src/App.tsx' },
  { name: 'Frontend types', path: './client/src/types/index.ts' },
  { name: 'TailwindCSS config', path: './client/tailwind.config.js' },
  { name: 'Environment example', path: './.env.example' },
  { name: 'Environment file', path: './.env' },
  { name: 'README', path: './README.md' },
  { name: 'Gitignore', path: './.gitignore' },
];

let allPassed = true;

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!exists) allPassed = false;
});

console.log('\n📦 Checking dependencies...\n');

const backendDeps = require('./package.json').dependencies || {};
const backendDevDeps = require('./package.json').devDependencies || {};
const frontendDeps = require('./client/package.json').dependencies || {};
const frontendDevDeps = require('./client/package.json').devDependencies || {};

const requiredBackend = ['express', 'prisma', 'bcrypt', 'jsonwebtoken', 'dotenv', 'cors'];
const requiredFrontend = ['react', 'react-dom', 'zustand', 'axios'];

console.log('Backend dependencies:');
requiredBackend.forEach(dep => {
  const installed = backendDeps[dep] || backendDevDeps[dep];
  console.log(`  ${installed ? '✅' : '❌'} ${dep}`);
  if (!installed) allPassed = false;
});

console.log('\nFrontend dependencies:');
requiredFrontend.forEach(dep => {
  const installed = frontendDeps[dep] || frontendDevDeps[dep];
  console.log(`  ${installed ? '✅' : '❌'} ${dep}`);
  if (!installed) allPassed = false;
});

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ All checks passed! Setup is complete.');
  console.log('\n📝 Next steps:');
  console.log('1. Update .env with your PostgreSQL credentials');
  console.log('2. Run: npm run prisma:migrate');
  console.log('3. Run: npm run dev (backend)');
  console.log('4. Run: npm run client:dev (frontend)');
} else {
  console.log('❌ Some checks failed. Please review the output above.');
  process.exit(1);
}
