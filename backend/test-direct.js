// Quick test script to debug the skill update issue
const pool = require('./dist/config/database').default;

async function testSkillUpdate() {
  try {
    console.log('Testing skill update...');
    
    // Get a test employee
    const empResult = await pool.query(
      'SELECT employee_id FROM employees WHERE status = $1 LIMIT 1',
      ['active']
    );
    
    if (empResult.rows.length === 0) {
      console.error('❌ No active employees found');
      return;
    }
    
    const employeeId = empResult.rows[0].employee_id;
    console.log('Using employee:', employeeId);
    
    // Check if primary_skill column exists
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'employees' AND column_name = 'primary_skill'`
    );
    console.log('Primary skill column exists:', colCheck.rows.length > 0);
    
    // Get current employee data
    const before = await pool.query(
      'SELECT employee_id, skill, primary_skill FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    console.log('Before update:', before.rows[0]);
    
    // Try the update
    const testSkill = 'Test Skill ' + Date.now();
    console.log('Updating skill to:', testSkill);
    
    const updateResult = await pool.query(
      'UPDATE employees SET skill = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
      [testSkill, employeeId]
    );
    console.log('Update rowCount:', updateResult.rowCount);
    
    if (updateResult.rowCount === 0) {
      console.error('❌ Update returned 0 rows - employee not found?');
    } else {
      console.log('✅ Update successful');
    }
    
    // Check after update
    const after = await pool.query(
      'SELECT employee_id, skill, primary_skill FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    console.log('After update:', after.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testSkillUpdate();
