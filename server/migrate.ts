import { pool } from './db';
import fs from 'fs/promises';
import path from 'path';

async function runMigrations() {
  try {
    const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    // Sort files to ensure they run in order
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of sqlFiles) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      await pool.query(sql);
      console.log(`Completed migration: ${file}`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations(); 