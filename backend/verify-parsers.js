/**
 * Quick verification script for parser fixes.
 * Checks: 
 *  1. Bench file → findEmployeeDataSheet picks "Bench Base Data"
 *  2. PM Report → collectPMSheetRows merges all DCX-* sheets → unique PMs
 *  3. PM email column exists in bench file for _pm_email capture
 */
const XLSX = require('xlsx');
const path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');

const benchFile = path.join(DOCS, 'GTD Bench Dashboard - 27-Jan-26.xlsx');
const pmFile    = path.join(DOCS, "People Manager Report 25th Nov'25.xlsx");

const normalize = k => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const EMP_ID_COLS = new Set(['ggid','cgid','globalid','liLrid','pernr','employeeid','fullname','firstname','ntloginid']);

console.log('=== 1. Bench File — Employee Sheet Selection ===');
const wbBench = XLSX.readFile(benchFile);
let bestBench = null;
for (const sn of wbBench.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wbBench.Sheets[sn]);
  if (!rows.length) continue;
  const hasEmpCol = Object.keys(rows[0]).some(k => EMP_ID_COLS.has(normalize(k)));
  if (hasEmpCol && (!bestBench || rows.length > bestBench.count)) {
    bestBench = { sn, count: rows.length };
  }
}
console.log('Selected sheet:', bestBench ? `"${bestBench.sn}" (${bestBench.count} rows)` : 'NONE');
const benchRows = XLSX.utils.sheet_to_json(wbBench.Sheets['Bench Base Data']);
const pmEmailCol = Object.keys(benchRows[0]).find(k => /people manager email/i.test(k));
console.log('PM email column:', pmEmailCol || 'NOT FOUND');
if (pmEmailCol) console.log('Sample PM email:', benchRows[0][pmEmailCol]);

console.log('\n=== 2. PM Report — collectPMSheetRows ===');
const wbPM = XLSX.readFile(pmFile);
const pmMap = new Map();
let sheetsFound = 0;
let totalRows = 0;
for (const sn of wbPM.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wbPM.Sheets[sn]);
  if (!rows.length) continue;
  const hasPmGgid    = Object.keys(rows[0]).some(k => /^PM\s*GGID$/i.test(k.trim()));
  // "PM Email ID" is the key discriminator - DCX-* Summary sheets have it; Base Data does NOT
  const hasPmEmailId = Object.keys(rows[0]).some(k => /^PM\s*Email\s*(ID)?$/i.test(k.trim()));
  if (!hasPmGgid || !hasPmEmailId) continue;
  sheetsFound++;
  totalRows += rows.length;
  console.log(`  Merging sheet "${sn}": ${rows.length} rows`);
  for (const row of rows) {
    const pmGgid = String(row['PM GGID'] || '').trim();
    if (pmGgid && !pmMap.has(pmGgid)) {
      pmMap.set(pmGgid, {
        name: row['PM Email ID'] || '',
        skill: row['PM Skills'] || '',
        grade: String(row['PM Grade'] || '').startsWith('#') ? '' : String(row['PM Grade'] || ''),
        practice: String(row['PM Sub-practice'] || '').startsWith('#') ? '' : String(row['PM Sub-practice'] || ''),
        region: row['PM Region'] || '',
      });
    }
  }
}
console.log(`Sheets with PM GGID: ${sheetsFound} | Total rows merged: ${totalRows} | Unique PMs: ${pmMap.size}`);
const pmList = Array.from(pmMap.entries());
console.log('\nSample PMs:');
pmList.slice(0, 5).forEach(([id, pm]) =>
  console.log(`  GGID:${id} | email:${pm.name} | grade:${pm.grade} | practice:${pm.practice}`)
);
