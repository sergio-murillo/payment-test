#!/usr/bin/env node

/**
 * Script to setup environment files from examples
 * This script copies env.example files to .env files
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function setupEnvFile(examplePath, envPath, name) {
  const exampleFullPath = path.join(__dirname, '..', examplePath);
  const envFullPath = path.join(__dirname, '..', envPath);

  if (!fs.existsSync(exampleFullPath)) {
    log(`❌ ${examplePath} not found`, 'red');
    return false;
  }

  if (fs.existsSync(envFullPath)) {
    log(`⚠️  ${envPath} already exists, skipping...`, 'yellow');
    return false;
  }

  try {
    fs.copyFileSync(exampleFullPath, envFullPath);
    log(`✅ Created ${envPath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error creating ${envPath}: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🚀 Setting up environment files...\n', 'blue');

  const results = {
    backend: setupEnvFile(
      'packages/backend/env.example',
      'packages/backend/.env',
      'Backend'
    ),
    frontend: setupEnvFile(
      'packages/frontend/env.example',
      'packages/frontend/.env',
      'Frontend'
    ),
    frontendLocal: setupEnvFile(
      'packages/frontend/env.example',
      'packages/frontend/.env.local',
      'Frontend Local'
    ),
  };

  log('\n✨ Environment setup complete!\n', 'green');
  log('📝 Next steps:', 'blue');
  log('   1. Review and update the .env files if needed');
  log('   2. For production, update with your actual credentials');
  log('   3. Never commit .env files to version control\n');

  const successCount = Object.values(results).filter(Boolean).length;
  if (successCount === 0) {
    log('ℹ️  All environment files already exist or examples not found', 'yellow');
  }
}

main();
