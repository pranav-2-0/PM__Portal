const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'pm_alignment', user: 'postgres', password: 'root' });

async function check() {
  const sep = await pool.query('SELECT COUNT(*) as cnt FROM separation_reports');
  const pm = await pool.query('SELECT COUNT(*) as cnt FROM people_managers');
  const emp = await pool.query('SELECT COUNT(*) as cnt FROM employees');
  const skill = await pool.query('SELECT COUNT(*) as cnt FROM skill_repository');
  
  console.log('separation_reports:', sep.rows[0].cnt);
  console.log('people_managers:', pm.rows[0].cnt);
  console.log('employees:', emp.rows[0].cnt);
  console.log('skill_repository:', skill.rows[0].cnt);

  const practices = await pool.query('SELECT DISTINCT practice FROM employees ORDER BY practice');
  console.log('\nDistinct practices in employees:', practices.rows.map(r => r.practice));

  if (parseInt(sep.rows[0].cnt) > 0) {
    const sample = await pool.query('SELECT * FROM separation_reports LIMIT 3');
    console.log('\nSample separation rows:', JSON.stringify(sample.rows, null, 2));
  }
  if (parseInt(pm.rows[0].cnt) > 0) {
    const sample = await pool.query('SELECT employee_id, name, email FROM people_managers LIMIT 3');
    console.log('\nSample PM rows:', JSON.stringify(sample.rows, null, 2));
  }
  await pool.end();
}
check().catch(e => { console.error(e.message); pool.end(); });
