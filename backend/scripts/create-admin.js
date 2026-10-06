#!/usr/bin/env node
/**
 * QUIKOOO Platform - CLI Script to create a SUPER_ADMIN user
 * Usage: node scripts/create-admin.js --email X --mobile Y --password Z --name N
 */

const bcrypt = require('bcrypt');
const { pool } = require('../src/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        params[key] = val;
      } else {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          params[key] = nextArg;
          i++;
        } else {
          params[key] = true;
        }
      }
    }
  }

  return {
    email: params.email ? String(params.email).trim().toLowerCase() : undefined,
    mobile: params.mobile ? String(params.mobile).trim() : (params.phone ? String(params.phone).trim() : undefined),
    password: params.password ? String(params.password) : undefined,
    name: params.name ? String(params.name).trim() : (params.fullName ? String(params.fullName).trim() : (params['full-name'] ? String(params['full-name']).trim() : undefined)),
  };
}

async function main() {
  const { email, mobile, password, name } = parseArgs();

  if (!email || !mobile || !password || !name) {
    console.error('Error: Missing required arguments.');
    console.error('Usage: node scripts/create-admin.js --email <email> --mobile <mobile> --password <password> --name <name>');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  try {
    // 1. Refuse if user already exists
    const checkQuery = `
      SELECT id, email, phone FROM users
      WHERE (email IS NOT NULL AND LOWER(email) = LOWER($1)) OR phone = $2
    `;
    const checkRes = await pool.query(checkQuery, [email, mobile]);
    if (checkRes.rows.length > 0) {
      console.error(`Refused: User already exists with email '${email}' or mobile '${mobile}'.`);
      await pool.end();
      process.exit(1);
    }

    // 2. Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Create SUPER_ADMIN record
    const insertQuery = `
      INSERT INTO users (
        email,
        phone,
        password_hash,
        full_name,
        role,
        is_active,
        is_verified,
        metadata
      ) VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', true, true, $5::jsonb)
      RETURNING id, email, phone, full_name, role
    `;
    const metadata = JSON.stringify({ created_by: 'cli_create_admin' });
    await pool.query(insertQuery, [email, mobile, passwordHash, name, metadata]);

    // 4. Print nothing secret except success line
    console.log(`[Success] SUPER_ADMIN created successfully for ${email}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(`[Error] Failed to create admin: ${err.message}`);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

main();
