const {Pool} = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pm_alignment',
  user: 'postgres',
  password: 'root'
});

(async () => {
  const ids = ['PM001', 'PM003', 'PM007', 'PM009'];
  console.log('Checking if separation PMs exist in database:\n');
  
  for (const id of ids) {
    const result = await pool.query('SELECT employee_id, name FROM people_managers WHERE employee_id = $1', [id]);
    if (result.rows.length > 0) {
      console.log('✅', id, 'exists -', result.rows[0].name);
    } else {
      console.log('❌', id, 'NOT FOUND');
    }
  }
  
  await pool.end();
})();
