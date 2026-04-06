const XLSX = require('xlsx');
const path = require('path');

const files = [
  '../docs/People Manager Report 25th Nov\'25.xlsx',
  '../docs/GTD Bench Dashboard - 27-Jan-26.xlsx',
  '../docs/SeperationDetails - 2026-01-05.xlsx'
];

files.forEach(file => {
  try {
    const wb = XLSX.readFile(file);
    
    console.log('\n========================================');
    console.log('FILE:', path.basename(file));
    console.log('ALL SHEETS:', wb.SheetNames.join(' | '));
    
    // Show all sheets with row counts
    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`\n  --- Sheet: "${sheetName}" (${data.length} rows) ---`);
      if (data[0]) {
        console.log('  COLUMNS:', Object.keys(data[0]).slice(0, 15).join(', '));
        console.log('  SAMPLE ROW:', JSON.stringify(data[0], null, 2).split('\n').slice(0, 8).join('\n'));
      }
    });
  } catch(e) {
    console.log('\nERROR reading', file, ':', e.message);
  }
});
