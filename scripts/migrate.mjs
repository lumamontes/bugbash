import { execSync } from 'child_process';

try {
  execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
} catch (e) {
  console.error('Migration failed');
  process.exit(1);
}

// Force exit since drizzle-kit may leave the pg connection pool open
process.exit(0);
