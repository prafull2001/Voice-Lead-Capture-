import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

/**
 * Gets the database instance, creating it if necessary
 * @returns {Database.Database} SQLite database instance
 */
export function getDatabase() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || './data/calendar.db';

    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    logger.info('Database connected', { path: dbPath });
  }
  return db;
}

/**
 * Initializes the database with schema
 */
export function initializeDatabase() {
  const database = getDatabase();

  const migrationPath = join(__dirname, 'migrations', '001_initial.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  database.exec(migration);

  logger.info('Database initialized');
}

/**
 * Closes the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

export default {
  getDatabase,
  initializeDatabase,
  closeDatabase,
};
