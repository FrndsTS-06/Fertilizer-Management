/**
 * Development-Only Test User Creation Script
 * Fertilizer Shop Management System
 * 
 * Target Account:
 * - Email: admin@fertilizer.test
 * - Password: Test@12345
 * - Role: ADMIN
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { query, closePool } = require('../src/config/db');

// Development-only configuration
const TEST_USER = {
  email: 'admin@fertilizer.test'.toLowerCase(),
  rawPassword: 'Test@12345',
  fullName: 'Test Administrator',
  role: 'ADMIN', // Must match DB CHECK (role IN ('ADMIN', 'STAFF'))
};

async function createTestUser() {
  console.log('----------------------------------------------------');
  console.log('Fertilizer Management System - Development User Setup');
  console.log('----------------------------------------------------');

  // Safety Guard: Prohibit accidental execution against production
  if (config.isProduction || process.env.NODE_ENV === 'production') {
    console.error('❌ SAFETY ABORT: This development script cannot run in production mode.');
    process.exit(1);
  }

  try {
    console.log(`🔒 Hashing password for [${TEST_USER.email}] with bcrypt (10 rounds)...`);
    const passwordHash = await bcrypt.hash(TEST_USER.rawPassword, 10);

    console.log('💾 Upserting user record into PostgreSQL users table...');
    // Idempotent upsert: Creates user if missing, or updates password & ensures active status if already present
    const upsertSql = `
      INSERT INTO users (
        email,
        password_hash,
        full_name,
        role,
        is_active,
        updated_at
      ) VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, full_name, role, is_active, created_at, updated_at;
    `;

    const res = await query(upsertSql, [
      TEST_USER.email,
      passwordHash,
      TEST_USER.fullName,
      TEST_USER.role,
    ]);

    const user = res.rows[0];

    console.log('✅ Test user created / synchronized successfully!\n');
    console.log('📋 Account Details:');
    console.log(`   - User ID:   ${user.id}`);
    console.log(`   - Email:     ${user.email}`);
    console.log(`   - Full Name: ${user.full_name}`);
    console.log(`   - Role:      ${user.role}`);
    console.log(`   - Active:    ${user.is_active ? 'Yes' : 'No'}`);
    console.log(`   - Password:  ${TEST_USER.rawPassword}`);
    console.log('----------------------------------------------------');
    console.log('Ready to log in via POST /api/auth/login or frontend Login.jsx');
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    process.exitCode = 1;
  } finally {
    // Ensure PostgreSQL connection pool releases cleanly
    await closePool();
  }
}

// Execute CLI
createTestUser();

