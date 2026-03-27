const XLSX = require('xlsx');
const path = require('path');

// Test the GAD PM template
const file = '../templates/GAD_People_Managers_Template.csv';

try {
  const workbook = XLSX.read(require('fs').readFileSync(file), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('========================================');
  console.log('Testing GAD PM Template Parser');
  console.log('========================================\n');
  console.log('Total rows in file:', data.length);
  
  // Simulate parser logic
  const parsed = data.map((row) => {
    const ggid = row['GGID'] || row['Global Id'] || row['PM GGID'];
    const pmEmail = row['Email ID'] || row['PM Email ID'];
    
    const grade = String(row['Grade'] || row['grade'] || row['PM Grade'] || row['Unified Grade'] || row['Global Grade'] || row['Local Grade'] || '').trim().toUpperCase();
    let maxCapacity = 10;
    if (grade.startsWith('D')) {
      maxCapacity = 15;
    }
    
    // Extract name from email if not provided
    const email = String(row['Email'] || row['email'] || pmEmail || '').trim();
    let name = String(row['Name'] || row['name'] || row['Employee Name'] || '').trim();
    if (!name && email) {
      name = email.split('@')[0].split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    
    const practice = String(row['Practice'] || row['practice'] || row['PM Sub-practice'] || row['Sub BUName'] || '').trim();
    const cu = String(row['CU'] || row['cu'] || row['SBU Name'] || row['Business Area'] || practice || '').trim();
    
    return {
      employee_id: String(row['Employee ID'] || row['employee_id'] || ggid || '').trim(),
      name: name,
      email: email,
      practice: practice,
      cu: cu,
      region: String(row['Region'] || row['region'] || row['PM Region'] || row['Location'] || '').trim(),
      skill: row['Skill'] || row['skill'] || row['PM Skills'] || row['Emp Skills'] || undefined,
      grade: grade,
      reportee_count: parseInt(row['Reportee Count'] || row['reportee_count'] || row['Total'] || '0'),
      max_capacity: parseInt(row['Max Capacity'] || row['max_capacity'] || maxCapacity),
      is_active: row['Is Active'] !== 'No' && row['is_active'] !== false,
    };
  }).filter(pm => pm.employee_id && pm.email && pm.practice && pm.region && pm.grade);
  
  console.log('✅ Valid PM records after filtering:', parsed.length);
  console.log('\nSample parsed record:');
  console.log(JSON.stringify(parsed[0], null, 2));
  
  console.log('\n📋 All parsed records:');
  parsed.forEach((pm, idx) => {
    console.log(`${idx + 1}. ${pm.employee_id} - ${pm.name} (${pm.grade}) - ${pm.practice} - ${pm.region}`);
  });
  
} catch(e) {
  console.log('❌ ERROR:', e.message);
  console.log(e.stack);
}
