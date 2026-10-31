const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool, query, closePool } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Calculate SHA-256 checksum of a file
 * @param {string} filePath
 * @returns {string}
 */
const getFileChecksum = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Ensure schema_migrations audit tracking table exists
 */
const initMigrationTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64) NOT NULL,
      execution_time_ms INT NOT NULL
    );
  `);
};

/**
 * Get list of already applied migrations
 * @returns {Promise<Set<string>>}
 */
const getAppliedMigrations = async () => {
  const result = await query('SELECT version FROM schema_migrations ORDER BY id ASC;');
  return new Set(result.rows.map(row => row.version));
};

/**
 * Inspect migration files and their current status
 * @param {boolean} includeSeed
 * @returns {Promise<Array<{ version: string, filename: string, applied: boolean, checksum: string }>>}
 */
const getMigrationPlan = async (includeSeed = false) => {
  await initMigrationTable();
  const appliedSet = await getAppliedMigrations();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.startsWith('000_')) // exclude rollback
    .sort();

  return files
    .filter(file => includeSeed || !file.includes('004_seed'))
    .map(file => {
      const version = file.split('_')[0];
      const filePath = path.join(MIGRATIONS_DIR, file);
      return {
        version,
        filename: file,
        filePath,
        applied: appliedSet.has(version),
        checksum: getFileChecksum(filePath),
      };
    });
};

/**
 * Apply unapplied migrations in strict order
 * @param {object} options
 * @param {boolean} options.includeSeed - whether to include 004 seed script
 * @returns {Promise<Array<{ version: string, filename: string, durationMs: number }>>}
 */
const applyMigrations = async ({ includeSeed = false } = {}) => {
  await initMigrationTable();
  const plan = await getMigrationPlan(includeSeed);
  const pending = plan.filter(m => !m.applied);

  if (pending.length === 0) {
    console.log('[Migration Runner] Database is already up to date. No pending migrations.');
    return [];
  }

  console.log(`[Migration Runner] Applying ${pending.length} pending migration(s)...`);
  const appliedResults = [];

  for (const m of pending) {
    console.log(`\n➡️  Executing [${m.version}] ${m.filename}...`);
    const sql = fs.readFileSync(m.filePath, 'utf8');
    const start = Date.now();

    // The SQL files already contain BEGIN ... COMMIT blocks.
    // Execute the complete file in a single query invocation.
    await query(sql);

    const durationMs = Date.now() - start;

    // Record applied migration in tracking table
    await query(
      `INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
       VALUES ($1, $2, $3, $4);`,
      [m.version, m.filename, m.checksum, durationMs]
    );

    console.log(`✅ Completed [${m.version}] in ${durationMs}ms`);
    appliedResults.push({ version: m.version, filename: m.filename, durationMs });
  }

  return appliedResults;
};

/**
 * Verify database schema integrity: tables, views, constraints, indexes
 * @returns {Promise<object>}
 */
const verifySchemaIntegrity = async () => {
  // 1. Check Tables
  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'schema_migrations'
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map(r => r.table_name);

  // 2. Check Views
  const viewsRes = await query(`
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  const views = viewsRes.rows.map(r => r.table_name);

  // 3. Check Indexes
  const indexesRes = await query(`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename != 'schema_migrations'
    ORDER BY tablename, indexname;
  `);
  const indexes = indexesRes.rows;

  // 4. Check Foreign Keys
  const fkRes = await query(`
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  const foreignKeys = fkRes.rows;

  // 5. Check Check Constraints
  const checkRes = await query(`
    SELECT 
      tc.table_name, 
      tc.constraint_name, 
      cc.check_clause 
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc 
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
    ORDER BY tc.table_name, tc.constraint_name;
  `);
  const checkConstraints = checkRes.rows;

  return {
    tablesCount: tables.length,
    tables,
    viewsCount: views.length,
    views,
    indexesCount: indexes.length,
    indexes,
    foreignKeysCount: foreignKeys.length,
    foreignKeys,
    checkConstraintsCount: checkConstraints.length,
    checkConstraints,
  };
};

// CLI Entrypoint
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const isStatus = args.includes('--status');
    const isVerify = args.includes('--verify');
    const includeSeed = args.includes('--seed');
    const isApply = args.includes('--apply');

    try {
      if (isStatus) {
        console.log('--- Migration Status ---');
        const plan = await getMigrationPlan(true);
        console.table(plan.map(p => ({
          Version: p.version,
          File: p.filename,
          Status: p.applied ? 'APPLIED' : 'PENDING',
          Checksum: p.checksum.slice(0, 12) + '...',
        })));
      } else if (isVerify) {
        console.log('--- Schema Verification ---');
        const integrity = await verifySchemaIntegrity();
        console.log(`Tables (${integrity.tablesCount}):`, integrity.tables.join(', '));
        console.log(`Views (${integrity.viewsCount}):`, integrity.views.join(', '));
        console.log(`Indexes (${integrity.indexesCount})`);
        console.log(`Foreign Keys (${integrity.foreignKeysCount})`);
        console.log(`Check Constraints (${integrity.checkConstraintsCount})`);
      } else if (isApply) {
        await applyMigrations({ includeSeed });
        const integrity = await verifySchemaIntegrity();
        console.log('\n--- Post-Migration Schema Verification ---');
        console.log(`Tables (${integrity.tablesCount}):`, integrity.tables.join(', '));
        console.log(`Views (${integrity.viewsCount}):`, integrity.views.join(', '));
        console.log(`Indexes (${integrity.indexesCount})`);
      } else {
        console.log('Usage: node src/database/migrate.js [--status | --apply [--seed] | --verify]');
      }
    } catch (err) {
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
    } finally {
      await closePool();
    }
  })();
}

module.exports = {
  getMigrationPlan,
  applyMigrations,
  verifySchemaIntegrity,
  initMigrationTable,
};
