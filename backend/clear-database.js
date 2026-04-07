const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pm_alignment',
  user: 'postgres',
  password: 'postgres'
});

(async () => {
  try {
    console.log('🗑️  Clearing all tables in database...\n');
    
    // Delete in correct order to avoid foreign key violations
    await pool.query('DELETE FROM audit_logs');
    console.log('✅ Cleared audit_logs');
    
    await pool.query('DELETE FROM approval_workflows');
    console.log('✅ Cleared approval_workflows');
    
    await pool.query('DELETE FROM exceptions');
    console.log('✅ Cleared exceptions');
    
    await pool.query('DELETE FROM pm_assignments');
    console.log('✅ Cleared pm_assignments');
    
    await pool.query('DELETE FROM separation_reports');
    console.log('✅ Cleared separation_reports');
    
    await pool.query('DELETE FROM employees');
    console.log('✅ Cleared employees');
    
    await pool.query('DELETE FROM people_managers');
    console.log('✅ Cleared people_managers');
    
    await pool.query('DELETE FROM skill_repository');
    console.log('✅ Cleared skill_repository');
    
    await pool.query('DELETE FROM configuration');
    console.log('✅ Cleared configuration');
    
    console.log('\n✅ Database completely cleared! Ready for fresh upload.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
})();
