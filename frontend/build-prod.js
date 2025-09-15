const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting production build process...');

try {
  // 1. Install dependencies if node_modules doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // 2. Run the production build
  console.log('Building frontend for production...');
  execSync('npm run build:prod', { stdio: 'inherit' });

  console.log('✅ Frontend build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
