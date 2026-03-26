const XLSX = require('xlsx');
const fs = require('fs');

console.log('========================================');
console.log('Testing GAD Employee Template Parser');
console.log('========================================\n');

// Test Employee Template
const empFile = '../templates/GAD_Employees_Template.csv';
try {
  const wb = XLSX.readFile(empFile);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('Total rows in employee file:', data.length);
  
  const parsed = data.map((row) => {
    const ggid = row['GGID'] || row['Global Id'];
    const pmGgid = row['PM GGID'] || row['PM Global Id'];
    
    // Extract name from email if not provided
    const email = String(row['Email'] || row['email'] || row['Email ID'] || '').trim();
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
      skill: row['Skill'] || row['skill'] || row['Emp Skills'] || undefined,
      grade: String(row['Grade'] || row['grade'] || row['Unified Grade'] || row['Global Grade'] || row['Local Grade'] || '').trim().toUpperCase(),
      current_pm_id: row['Current PM ID'] || row['current_pm_id'] || pmGgid || undefined,
      is_new_joiner: row['Is New Joiner'] === 'Yes' || row['is_new_joiner'] === true || !pmGgid,
    };
  }).filter(emp => emp.employee_id && emp.email);
  
  console.log('✅ Valid employee records after filtering:', parsed.length);
  console.log('\nSample parsed record:');
  console.log(JSON.stringify(parsed[0], null, 2));
  
  if (parsed.length === 0) {
    console.log('\n❌ NO RECORDS PASSED VALIDATION!');
    console.log('Checking first raw row:');
    console.log(JSON.stringify(data[0], null, 2));
  }
  
} catch(e) {
  console.log('❌ ERROR parsing employees:', e.message);
}

console.log('\n========================================');
console.log('Testing GAD Separation Template Parser');
console.log('========================================\n');

// Test Separation Template
const sepFile = '../templates/GAD_Separations_Template.csv';
try {
  const wb = XLSX.readFile(sepFile);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('Total rows in separation file:', data.length);
  
  const parsed = data.map((row) => {
    const ggid = row['GGID'] || row['Global Id'];
    let lwdDate;
    
    const lwdValue = row['LWD'] || row['lwd'] || row['Updated Last Working Date'];
    if (lwdValue) {
      if (typeof lwdValue === 'number') {
        lwdDate = new Date((lwdValue - 25569) * 86400 * 1000);
      } else {
        lwdDate = new Date(lwdValue);
      }
    }
    
    return {
      employee_id: String(row['Employee ID'] || row['employee_id'] || ggid || '').trim(),
      lwd: lwdDate,
      reason: row['Reason'] || row['reason'] || row['Separation Type'] || row['Reason As By Employee'] || undefined,
    };
  }).filter(sep => sep.employee_id && sep.lwd && !isNaN(sep.lwd.getTime()));
  
  console.log('✅ Valid separation records after filtering:', parsed.length);
  if (parsed.length > 0) {
    console.log('\nSample parsed record:');
    console.log(JSON.stringify(parsed[0], null, 2));
  }
  
  if (parsed.length === 0) {
    console.log('\n❌ NO RECORDS PASSED VALIDATION!');
    console.log('Checking first raw row:');
    console.log(JSON.stringify(data[0], null, 2));
  }
  
} catch(e) {
  console.log('❌ ERROR parsing separations:', e.message);
}
