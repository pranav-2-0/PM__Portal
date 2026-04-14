const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pm_alignment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testConnection() {
  console.log('========================================');
  console.log('PostgreSQL Connection Test');
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'pm_alignment'}`);
  console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`  Password: ${'*'.repeat((process.env.DB_PASSWORD || 'root').length)}\n`);

  try {
    console.log('Testing connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!\n');

    // Test 1: Get PostgreSQL version
    console.log('Test 1: PostgreSQL Version');
    const versionResult = await client.query('SELECT version()');
    console.log(`✅ ${versionResult.rows[0].version.split(',')[0]}\n`);

    // Test 2: Get current timestamp
    console.log('Test 2: Database Time');
    const timeResult = await client.query('SELECT NOW()');
    console.log(`✅ Current database time: ${timeResult.rows[0].now}\n`);

    // Test 3: List tables
    console.log('Test 3: Database Tables');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`✅ Tables found: ${tablesResult.rows.length}`);
    if (tablesResult.rows.length > 0) {
      console.log('Tables:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No tables found. Run schema.sql to create tables.');
    }
    console.log('');

    // Test 4: Check configuration
    console.log('Test 4: Configuration Data');
    try {
      const configResult = await client.query('SELECT COUNT(*) FROM configuration');
      const configCount = parseInt(configResult.rows[0].count);
      if (configCount > 0) {
        console.log(`✅ Configuration records: ${configCount}`);
        
        const configs = await client.query('SELECT config_key FROM configuration ORDER BY config_key');
        console.log('Configuration keys:');
        configs.rows.forEach(row => {
          console.log(`  - ${row.config_key}`);
        });
      } else {
        console.log('⚠️  No configuration data found.');
      }
    } catch (err) {
      console.log('⚠️  Configuration table not found. Run schema.sql first.');
    }
    console.log('');

    // Test 5: Count records in main tables
    console.log('Test 5: Data Records');
    const tables = [
      'employees',
      'people_managers',
      'pm_assignments',
      'separation_reports',
      'exceptions'
    ];

    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        const status = count > 0 ? '✅' : '⚪';
        console.log(`${status} ${table}: ${count} records`);
      } catch (err) {
        console.log(`❌ ${table}: Table not found`);
      }
    }

    client.release();
    await pool.end();

    console.log('\n========================================');
    console.log('✅ All Connection Tests Passed!');
    console.log('========================================\n');
    console.log('Database is ready to use.');
    console.log('You can now start the backend server:\n');
    console.log('  cd backend');
    console.log('  npm run dev\n');

  } catch (err) {
    console.log('❌ Database connection error!\n');
    console.log('Error Details:');
    console.log(`  Message: ${err.message}`);
    console.log(`  Code: ${err.code || 'N/A'}\n`);

    console.log('========================================');
    console.log('Troubleshooting Steps:');
    console.log('========================================\n');

    if (err.code === 'ECONNREFUSED') {
      console.log('❌ Connection Refused');
      console.log('   PostgreSQL service is not running.\n');
      console.log('   Solutions:');
      console.log('   1. Check service status:');
      console.log('      Get-Service postgresql*\n');
      console.log('   2. Start the service:');
      console.log('      Start-Service postgresql-x64-15\n');
      console.log('   3. Verify PostgreSQL is installed:');
      console.log('      where psql\n');
    } else if (err.code === '28P01' || err.message.includes('password')) {
      console.log('❌ Authentication Failed');
      console.log('   Password is incorrect.\n');
      console.log('   Solutions:');
      console.log('   1. Check .env file in backend folder');
      console.log('   2. Verify DB_PASSWORD matches PostgreSQL password');
      console.log('   3. Reset password if needed (see POSTGRESQL_SETUP.md)\n');
    } else if (err.code === '3D000') {
      console.log('❌ Database Does Not Exist');
      console.log('   Database "pm_alignment" not found.\n');
      console.log('   Solutions:');
      console.log('   1. Run setup script:');
      console.log('      .\\setup-db.bat\n');
      console.log('   2. Or create manually:');
      console.log('      psql -U postgres -c "CREATE DATABASE pm_alignment;"\n');
    } else if (err.code === '42P01') {
      console.log('❌ Tables Not Found');
      console.log('   Database exists but tables not created.\n');
      console.log('   Solutions:');
      console.log('   1. Run schema.sql:');
      console.log('      psql -U postgres -d pm_alignment -f database/schema.sql\n');
    } else {
      console.log('❌ Unexpected Error');
      console.log('   Check PostgreSQL installation and configuration.\n');
      console.log('   Refer to POSTGRESQL_SETUP.md for detailed instructions.\n');
    }

    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);
