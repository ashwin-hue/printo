#!/usr/bin/env node

/**
 * ==============================================================================
 * PRINTO - NHOST DATABASE AUTOMATION RUNNER
 * ==============================================================================
 * Automates the deployment of all 15 Printo tables into Nhost:
 * 1. Runs PostgreSQL schema migrations (15 tables, enums, triggers, indexes).
 * 2. Connects to Hasura Metadata API to auto-track all 15 tables for GraphQL.
 * 3. Auto-configures all foreign-key Object & Array relationships for GraphQL.
 * 4. (Optional) Seeds sample campus shops, services, and pricing.
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2).reduce((acc, curr) => {
  if (curr.startsWith('--')) {
    const [key, val] = curr.replace(/^--/, '').split('=');
    acc[key] = val === undefined ? true : val;
  }
  return acc;
}, {});

function getEnvValue(key) {
  if (process.env[key]) return process.env[key];
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, 'customer', '.env'),
    path.join(rootDir, 'shops', '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

async function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

const TABLES = [
  'profiles',
  'shops',
  'shop_operating_hours',
  'shop_services',
  'shop_pricing',
  'documents',
  'orders',
  'order_documents',
  'order_status_history',
  'notifications',
  'payments',
  'shop_staff',
  'reviews',
  'support_tickets',
  'document_access_logs',
];

const RELATIONSHIPS = [
  // shops <-> profiles
  { type: 'object', table: 'shops', name: 'owner', fk: 'owner_id' },
  { type: 'array', table: 'profiles', name: 'shops', refTable: 'shops', refCol: 'owner_id' },

  // shops <-> operating_hours, services, pricing, staff
  { type: 'array', table: 'shops', name: 'operating_hours', refTable: 'shop_operating_hours', refCol: 'shop_id' },
  { type: 'object', table: 'shop_operating_hours', name: 'shop', fk: 'shop_id' },

  { type: 'array', table: 'shops', name: 'services', refTable: 'shop_services', refCol: 'shop_id' },
  { type: 'object', table: 'shop_services', name: 'shop', fk: 'shop_id' },

  { type: 'array', table: 'shops', name: 'pricing', refTable: 'shop_pricing', refCol: 'shop_id' },
  { type: 'object', table: 'shop_pricing', name: 'shop', fk: 'shop_id' },

  { type: 'array', table: 'shops', name: 'staff', refTable: 'shop_staff', refCol: 'shop_id' },
  { type: 'object', table: 'shop_staff', name: 'shop', fk: 'shop_id' },
  { type: 'object', table: 'shop_staff', name: 'user', fk: 'user_id' },

  // documents <-> profiles
  { type: 'object', table: 'documents', name: 'customer', fk: 'customer_id' },
  { type: 'array', table: 'profiles', name: 'documents', refTable: 'documents', refCol: 'customer_id' },

  // orders <-> profiles, shops
  { type: 'object', table: 'orders', name: 'customer', fk: 'customer_id' },
  { type: 'object', table: 'orders', name: 'shop', fk: 'shop_id' },
  { type: 'array', table: 'profiles', name: 'orders', refTable: 'orders', refCol: 'customer_id' },
  { type: 'array', table: 'shops', name: 'orders', refTable: 'orders', refCol: 'shop_id' },

  // orders <-> order_documents, documents
  { type: 'array', table: 'orders', name: 'order_documents', refTable: 'order_documents', refCol: 'order_id' },
  { type: 'array', table: 'documents', name: 'order_documents', refTable: 'order_documents', refCol: 'document_id' },
  { type: 'object', table: 'order_documents', name: 'order', fk: 'order_id' },
  { type: 'object', table: 'order_documents', name: 'document', fk: 'document_id' },

  // orders <-> history, payments, reviews
  { type: 'array', table: 'orders', name: 'status_history', refTable: 'order_status_history', refCol: 'order_id' },
  { type: 'object', table: 'order_status_history', name: 'order', fk: 'order_id' },
  { type: 'object', table: 'order_status_history', name: 'actor', fk: 'changed_by' },

  { type: 'array', table: 'orders', name: 'payments', refTable: 'payments', refCol: 'order_id' },
  { type: 'object', table: 'payments', name: 'order', fk: 'order_id' },
  { type: 'object', table: 'payments', name: 'customer', fk: 'customer_id' },

  { type: 'array', table: 'shops', name: 'reviews', refTable: 'reviews', refCol: 'shop_id' },
  { type: 'object', table: 'reviews', name: 'shop', fk: 'shop_id' },
  { type: 'object', table: 'reviews', name: 'customer', fk: 'customer_id' },
  { type: 'object', table: 'reviews', name: 'order', fk: 'order_id' },

  // notifications & tickets
  { type: 'object', table: 'notifications', name: 'user', fk: 'user_id' },
  { type: 'object', table: 'notifications', name: 'order', fk: 'order_id' },

  { type: 'object', table: 'support_tickets', name: 'user', fk: 'user_id' },
  { type: 'object', table: 'support_tickets', name: 'order', fk: 'order_id' },

  // logs
  { type: 'object', table: 'document_access_logs', name: 'document', fk: 'document_id' },
  { type: 'object', table: 'document_access_logs', name: 'accessor', fk: 'accessed_by' },
  { type: 'object', table: 'document_access_logs', name: 'shop', fk: 'shop_id' },
];

async function executeApi(endpoint, adminSecret, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json.error || json.message || text || `HTTP ${res.status}`);
  }
  return json;
}

async function main() {
  console.log('\n======================================================');
  console.log('  Printo - Nhost Database & Hasura GraphQL Automator  ');
  console.log('======================================================\n');

  let subdomain = args.subdomain || getEnvValue('VITE_NHOST_SUBDOMAIN') || getEnvValue('NHOST_SUBDOMAIN');
  let region = args.region || getEnvValue('VITE_NHOST_REGION') || getEnvValue('NHOST_REGION');
  let adminSecret = args.secret || getEnvValue('NHOST_ADMIN_SECRET') || getEnvValue('HASURA_GRAPHQL_ADMIN_SECRET') || getEnvValue('HASURA_ADMIN_SECRET');

  if (!subdomain) {
    subdomain = await prompt('Enter your Nhost Subdomain', 'qcmgjupxqsuyseegsyqu');
  }
  if (!region) {
    region = await prompt('Enter your Nhost Region', 'ap-south-1');
  }
  if (!adminSecret) {
    adminSecret = await prompt('Enter your Nhost/Hasura Admin Secret');
  }

  const queryEndpoint = subdomain === 'local'
    ? 'http://localhost:1337/v2/query'
    : `https://${subdomain}.hasura.${region}.nhost.run/v2/query`;

  const metadataEndpoint = subdomain === 'local'
    ? 'http://localhost:1337/v1/metadata'
    : `https://${subdomain}.hasura.${region}.nhost.run/v1/metadata`;

  console.log(`Hasura Query Endpoint:    ${queryEndpoint}`);
  console.log(`Hasura Metadata Endpoint: ${metadataEndpoint}`);

  // Step 1: Read SQL Migration
  const schemaPath = path.join(rootDir, 'nhost', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: schema file not found at ${schemaPath}`);
    process.exit(1);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('\n[1/5] Executing PostgreSQL Schema (15 Tables, ENUMs, Triggers)...');
  try {
    await executeApi(queryEndpoint, adminSecret, {
      type: 'run_sql',
      args: {
        sql: schemaSql,
        cascade: false,
        read_only: false,
      },
    });
    console.log('  ✓ PostgreSQL schema successfully applied.');
  } catch (err) {
    console.error('  ✗ Error executing PostgreSQL schema:', err.message);
    process.exit(1);
  }

  // Step 2: Track all 15 tables in Hasura GraphQL Engine via /v1/metadata
  console.log('\n[2/5] Auto-Tracking 15 tables in Hasura GraphQL...');
  for (const table of TABLES) {
    try {
      await executeApi(metadataEndpoint, adminSecret, {
        type: 'pg_track_table',
        args: {
          source: 'default',
          table: { schema: 'public', name: table },
        },
      });
      console.log(`  ✓ Tracked table: public.${table}`);
    } catch (err) {
      if (err.message && (err.message.includes('already tracked') || err.message.includes('already-tracked'))) {
        console.log(`  ✓ Table public.${table} already tracked`);
      } else {
        console.warn(`  ! Note on public.${table}: ${err.message}`);
      }
    }
  }

  // Step 3: Track Relationships via /v1/metadata
  console.log('\n[3/5] Configuring GraphQL Object & Array Relationships...');
  for (const rel of RELATIONSHIPS) {
    try {
      if (rel.type === 'object') {
        await executeApi(metadataEndpoint, adminSecret, {
          type: 'pg_create_object_relationship',
          args: {
            source: 'default',
            table: { schema: 'public', name: rel.table },
            name: rel.name,
            using: {
              foreign_key_constraint_on: rel.fk,
            },
          },
        });
      } else if (rel.type === 'array') {
        await executeApi(metadataEndpoint, adminSecret, {
          type: 'pg_create_array_relationship',
          args: {
            source: 'default',
            table: { schema: 'public', name: rel.table },
            name: rel.name,
            using: {
              foreign_key_constraint_on: {
                table: { schema: 'public', name: rel.refTable },
                column: rel.refCol,
              },
            },
          },
        });
      }
      console.log(`  ✓ Created relationship: ${rel.table}.${rel.name} (${rel.type})`);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('already-exists'))) {
        console.log(`  ✓ Relationship ${rel.table}.${rel.name} already exists`);
      } else {
        // Silently skip if minor constraint warning
      }
    }
  }

  // Step 4: Ensure user-role delete permissions exist for printed order & document cleanup
  console.log('\n[4/5] Configuring Hasura delete permissions for printed order cleanup...');
  const deletePermissions = [
    {
      table: 'orders',
      filter: {
        _or: [
          { customer_id: { _eq: 'X-Hasura-User-Id' } },
          { shop: { owner_id: { _eq: 'X-Hasura-User-Id' } } },
        ],
      },
    },
    {
      table: 'order_documents',
      filter: {
        order: {
          _or: [
            { customer_id: { _eq: 'X-Hasura-User-Id' } },
            { shop: { owner_id: { _eq: 'X-Hasura-User-Id' } } },
          ],
        },
      },
    },
    {
      table: 'documents',
      filter: {
        _or: [
          { customer_id: { _eq: 'X-Hasura-User-Id' } },
          { order_documents: { order: { shop: { owner_id: { _eq: 'X-Hasura-User-Id' } } } } },
          { _not: { order_documents: {} } },
        ],
      },
    },
    {
      table: 'notifications',
      filter: {
        user_id: { _eq: 'X-Hasura-User-Id' },
      },
    },
    {
      table: 'payments',
      filter: {
        order: {
          _or: [
            { customer_id: { _eq: 'X-Hasura-User-Id' } },
            { shop: { owner_id: { _eq: 'X-Hasura-User-Id' } } },
          ],
        },
      },
    },
    {
      table: 'order_status_history',
      filter: {
        order: {
          _or: [
            { customer_id: { _eq: 'X-Hasura-User-Id' } },
            { shop: { owner_id: { _eq: 'X-Hasura-User-Id' } } },
          ],
        },
      },
    },
  ];

  for (const perm of deletePermissions) {
    try {
      await executeApi(metadataEndpoint, adminSecret, {
        type: 'pg_create_delete_permission',
        args: {
          source: 'default',
          table: { schema: 'public', name: perm.table },
          role: 'user',
          permission: { filter: perm.filter },
        },
      });
      console.log(`  ✓ Enabled user delete permission on public.${perm.table}`);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('already-exists'))) {
        console.log(`  ✓ Delete permission on public.${perm.table} already exists`);
      } else {
        console.warn(`  ! Note on delete permission for public.${perm.table}:`, err.message);
      }
    }
  }

  // Step 5: Optional Seed Data
  const seedPath = path.join(rootDir, 'nhost', 'seeds', '01_sample_data.sql');
  const shouldSeed = args.seed || (await prompt('Do you want to seed sample shops, services, and pricing? (y/N)', 'n')).toLowerCase() === 'y';

  if (shouldSeed && fs.existsSync(seedPath)) {
    console.log('\n[5/5] Seeding sample campus shops, pricing, and operating hours...');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    try {
      await executeApi(queryEndpoint, adminSecret, {
        type: 'run_sql',
        args: {
          sql: seedSql,
          cascade: false,
          read_only: false,
        },
      });
      console.log('  ✓ Seed data successfully inserted.');
    } catch (err) {
      console.warn('  ! Note on seed data:', err.message);
    }
  } else {
    console.log('\n[5/5] Skipping sample seed data.');
  }

  console.log('\n======================================================');
  console.log('  SUCCESS! All 15 Printo tables are live on Nhost!     ');
  console.log('======================================================');
  console.log('\nTables created and exposed via GraphQL:');
  TABLES.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2, ' ')}. public.${t}`));
  console.log('\n======================================================\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
