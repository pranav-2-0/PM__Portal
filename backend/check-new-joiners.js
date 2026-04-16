const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'pm_alignment', user: 'postgres', password: 'postgres' });

async function diagnose() {
  try {
    console.log('=== NEW JOINERS DIAGNOSTIC ===\n');

    // 1. Check total employees
    const empCount = await pool.query('SELECT COUNT(*) as cnt FROM employees');
    console.log('✓ Total employees in DB:', empCount.rows[0].cnt);

    // 2. Check how many have joining_date set
    const withDate = await pool.query(
      `SELECT COUNT(*) as cnt FROM employees WHERE joining_date IS NOT NULL`
    );
    console.log('✓ Employees WITH joining_date:', withDate.rows[0].cnt);

    // 3. Check is_new_joiner flag distribution
    const flagDist = await pool.query(
      `SELECT is_new_joiner, COUNT(*) as cnt FROM employees GROUP BY is_new_joiner ORDER BY is_new_joiner`
    );
    console.log('✓ is_new_joiner flag distribution:');
    flagDist.rows.forEach(r => console.log(`  - ${r.is_new_joiner}: ${r.cnt}`));

    // 4. Check employees marked as new joiners
    const newJoiners = await pool.query(
      `SELECT COUNT(*) as cnt FROM employees 
       WHERE COALESCE(is_new_joiner, false) = true
       AND COALESCE(is_frozen, false) = false
       AND LOWER(COALESCE(status, 'active')) = 'active'`
    );
    console.log('\n✓ New joiners (matching backend query):', newJoiners.rows[0].cnt);

    // 5. Sample new joiners if any exist
    if (parseInt(newJoiners.rows[0].cnt) > 0) {
      const sample = await pool.query(
        `SELECT employee_id, name, joining_date, is_new_joiner, current_pm_id, grade, practice 
         FROM employees 
         WHERE COALESCE(is_new_joiner, false) = true
         LIMIT 5`
      );
      console.log('\n✓ Sample new joiners:');
      sample.rows.forEach(r => {
        console.log(`  - ${r.employee_id} | ${r.name} | joined: ${r.joining_date?.toISOString().split('T')[0] || 'NULL'} | practice: ${r.practice}`);
      });
    } else {
      console.log('\n⚠️  NO new joiners found in database!');
    }

    // 6. Check date range of employees
    const dateRange = await pool.query(
      `SELECT 
         MIN(joining_date) as oldest, 
         MAX(joining_date) as newest,
         COUNT(*) as count
       FROM employees WHERE joining_date IS NOT NULL`
    );
    const oldest = dateRange.rows[0].oldest;
    const newest = dateRange.rows[0].newest;
    console.log(`\n✓ Joining date range: ${oldest?.toISOString().split('T')[0]} → ${newest?.toISOString().split('T')[0]}`);

    // 7. Calculate which dates are within last 90 days
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    console.log(`  Today: ${today.toISOString().split('T')[0]}`);
    console.log(`  90 days ago: ${ninetyDaysAgo.toISOString().split('T')[0]}`);

    // 8. Check how many employees joined in last 90 days
    const recent = await pool.query(
      `SELECT COUNT(*) as cnt FROM employees 
       WHERE joining_date >= NOW() - INTERVAL '90 days'
       AND joining_date IS NOT NULL`
    );
    console.log(`  Employees joined in last 90 days: ${recent.rows[0].cnt}`);

    // 9. Check upload sources
    const sources = await pool.query(
      `SELECT upload_source, COUNT(*) as cnt FROM employees GROUP BY upload_source`
    );
    console.log('\n✓ Upload sources:');
    sources.rows.forEach(r => console.log(`  - ${r.upload_source || 'NULL'}: ${r.cnt}`));

    // 10. Check if there are any practice values
    const practices = await pool.query(
      `SELECT DISTINCT practice FROM employees WHERE practice IS NOT NULL ORDER BY practice`
    );
    console.log('\n✓ Distinct practices in employees:', practices.rows.length);
    if (practices.rows.length > 0) {
      console.log('  Practices:', practices.rows.map(r => r.practice).join(', '));
    }

    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('\nTo get new joiners data:');
    console.log('1. Upload a GAD or Bench file with employees having joining_date in last 90 days');
    console.log('2. OR mark is_new_joiner = true explicitly in the file');
    console.log('3. OR ensure hire_reason = "New Hire" in the Excel file (for GAD)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

diagnose();
