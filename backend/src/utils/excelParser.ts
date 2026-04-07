import * as XLSX from 'xlsx';
import { Employee, PeopleManager, SeparationReport, SkillRepositoryEntry } from '../types';

const normalizeId = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeHeader = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Strip Excel error values (#N/A, #REF!, #VALUE!, etc.) — treat them as empty string */
const cleanValue = (v: any): string => {
  const s = String(v ?? '').trim();
  return s.startsWith('#') ? '' : s;
};

// Normalised column names that indicate a sheet contains employee identity data
const EMPLOYEE_ID_NORMALIZED = new Set([
  normalizeHeader('GGID'), normalizeHeader('CGID'), normalizeHeader('Global Id'),
  normalizeHeader('LI/LR ID'), normalizeHeader('PERNR'),
  normalizeHeader('Employee ID'), normalizeHeader('Full Name'),
  normalizeHeader('First Name'), normalizeHeader('NT Login ID'),
  normalizeHeader('NT Login'), normalizeHeader('Candidate ID'),
]);

/**
 * For employee uploads: pick the sheet with the MOST rows that has at least one
 * recognised employee-identity column (GGID, PERNR, Employee ID, etc.).
 * Falls back to SheetNames[0] if nothing matches.
 */
const findEmployeeDataSheet = (workbook: XLSX.WorkBook): { data: any[]; sheetName: string } => {
  let best: { data: any[]; sheetName: string; count: number } | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const hasEmpCol = keys.some(k => EMPLOYEE_ID_NORMALIZED.has(normalizeHeader(k)));
    console.log(`📋 Sheet "${sheetName}": ${rows.length} rows, hasEmployeeIdCol: ${hasEmpCol}`);

    if (hasEmpCol && (!best || rows.length > best.count)) {
      best = { data: rows, sheetName, count: rows.length };
    }
  }

  if (best) {
    console.log(`✅ Auto-selected employee sheet: "${best.sheetName}" (${best.count} rows)`);
    return { data: best.data, sheetName: best.sheetName };
  }

  // Fallback
  const sn = workbook.SheetNames[0];
  console.log(`⚠️  No employee-id sheet found — falling back to first sheet: "${sn}"`);
  return { data: XLSX.utils.sheet_to_json(workbook.Sheets[sn]), sheetName: sn };
};

/**
 * For PM uploads: collect rows from EVERY "PM summary" sheet — i.e. sheets that
 * have both a "PM GGID" column AND a "PM Email ID" (or "PM Grade") column.
 * This is the DCX-*-Summary format.  Sheets that merely have a "PM GGID" column
 * as part of full employee data (like "Base Data") are excluded because they do
 * NOT have a separate "PM Email ID" column.
 * Falls back to the single largest sheet if no matching sheet is found.
 */
const collectPMSheetRows = (workbook: XLSX.WorkBook): { data: any[]; sheetCount: number; isBench: boolean } => {
  const combined: any[] = [];
  let summarySheetCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const hasPmGgid    = keys.some(k => /^PM\s*GGID$/i.test(k.trim()));
    // "PM Email ID" is the reliable discriminator: DCX-* Summary sheets have it,
    // but employee-data sheets (like Base Data) do NOT — they have PM Name/Grade instead.
    const hasPmEmailId = keys.some(k => /^PM\s*Email\s*(ID)?$/i.test(k.trim()));

    if (hasPmGgid && hasPmEmailId) {
      console.log(`📋 PM summary sheet found: "${sheetName}" (${rows.length} rows) — merging`);
      combined.push(...rows);
      summarySheetCount++;
    }
  }

  if (summarySheetCount > 0) {
    console.log(`✅ Merged ${combined.length} rows from ${summarySheetCount} PM-summary sheets`);
    return { data: combined, sheetCount: summarySheetCount, isBench: true };
  }

  // No PM-summary sheet found — fall back to the largest single sheet
  let best: { data: any[]; sheetName: string; count: number } | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    if (rows.length > (best?.count ?? 0)) {
      best = { data: rows, sheetName, count: rows.length };
    }
  }
  const chosen = best ?? { data: XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]), sheetName: workbook.SheetNames[0], count: 0 };
  console.log(`✅ No PM-summary sheets found — using largest sheet: "${chosen.sheetName}" (${chosen.count} rows)`);
  return { data: chosen.data, sheetCount: 1, isBench: false };
};

const getRowValue = (row: Record<string, any>, aliases: string[]): any => {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const key of Object.keys(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return row[key];
    }
  }
  return undefined;
};

export const parseEmployeeExcel = (buffer: Buffer): Employee[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log(`📚 Employee file sheets: ${workbook.SheetNames.join(' | ')}`);

    // Smart sheet selection: pick the largest sheet that has employee-identity columns
    const { data, sheetName } = findEmployeeDataSheet(workbook);
    console.log(`📊 Using sheet "${sheetName}" — ${data.length} rows`);

    if (!data || data.length === 0) {
      throw new Error('Excel file is empty or has no recognisable employee data');
    }

    const parsedData = data.map((row: any) => {
      // PM GGID: identifier of the PM assigned to this employee in the bench file.
      // Note: "People Manager ID" in bench files is a PERNR (SAP ID), not a GGID —
      // it won't match people_managers.employee_id directly.
      // We capture People Manager Email Address separately as _pm_email for email-based resolution.
      const pmGgid = row['PM GGID'] || row['PM Global Id'] || row['PM Global ID'] || row['PM GlobalId'];

      // Capture PM email for cross-file resolution (bench file → people_managers.email lookup)
      const pmEmailForResolution = String(
        row['People Manager Email Address'] || row['Supervisor Email ID'] || ''
      ).trim();
      
      // Extract email — try all common column aliases used in bench/GAD files
      let email = String(
        row['Email']               || row['email']                ||
        row['Email ID']            || row['Email-ID']             ||
        row['EmailId']             || row['Emailid']              ||
        row['Email Address']       || row['Email-Address']        ||
        row['Work Email']          || row['Corporate Email']      ||
        row['Official Email']      || row['Business Email']       ||
        row['NT Login ID']         || row['NT Login']             ||
        row['NT Login Id']         || row['NT_Login_ID']          ||
        row['Emp Email']           || row['Employee Email']       ||
        row['Resource Email']      || row['Manager Email']        ||
        row['E-mail']              || row['E-Mail']               ||
        ''
      ).trim();

      // Always extract GGID/PERNR first so we can use it for fallback email/name
      const ggid = row['GGID'] || row['CGID'] || row['Global Id'] || row['Global ID'] || row['GlobalId'];
      const pernrVal = normalizeId(row['PERNR'] || row['LI/LR ID'] || row['LI LR ID'] || '');
      const employeeIdRaw = normalizeId(ggid || row['Employee ID'] || row['employee_id'] || pernrVal || '');

      // Generate synthetic email from employee_id if none found in file
      if (!email && employeeIdRaw) {
        email = `${employeeIdRaw.toLowerCase()}@capgemini.com`;
      }

      let name = String(
        row['Full Name']        || row['full_name']        ||
        row['Name']             || row['name']             ||
        row['Employee Name']    || row['Resource Name']    ||
        row['Display Name']     ||
        `${row['First Name'] || ''} ${row['Middle Name'] || ''} ${row['Last Name'] || ''}`.trim() || ''
      ).trim();
      if (!name && email && !email.includes('@capgemini.com')) {
        // Generate name from email: alice.johnson@capgemini.com -> Alice Johnson
        name = email.split('@')[0].split('.').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
      }
      if (!name && employeeIdRaw) {
        name = `Employee-${employeeIdRaw}`;
      }
      
      // ── PRACTICE ──
      // Priority:
      //  1. Dedicated "Practice" / "Service Line" / "BU Name" column (top-level org)
      //  2. "Sub Practice" / "Sub BU Name" columns as fallback (some files collapse them)
      // Do NOT put Sub Practice first — it often contains longer sub-practice names
      // that won’t match the top-level practice filter (e.g. "DCX-FS Digital Commerce" ≠ "DCX-FS").
      const practice = String(
        row['Practice']         || row['practice']         ||
        row['Service Line']     || row['ServiceLine']      ||
        row['BU Name']          || row['BUName']           ||
        row['Sub Practice']     || row['Emp Sub-practice'] || row['Sub-practice'] ||
        row['Sub BUName']       || row['Sub BU Name']      ||
        ''
      ).trim();

      // ── CU (Capability Unit / Business Unit) ──
      const cu = String(
        row['CU']               || row['cu']              ||
        row['Organization BU']  || row['NEW BU']          ||
        row['SBU Name']         || row['Business Area']   ||
        row['Organization']     ||
        practice || ''
      ).trim();
      
      const employeeId = employeeIdRaw;
      if (!employeeId) {
        console.log('⚠️  Skipping employee row - missing Employee ID. Row keys:', Object.keys(row));
      }
      
      // ── REGION ──
      // Use employee's own region. Do NOT fall back to PM Region (that is the PM's location).
      const region = String(
        row['Region']               || row['region']              ||
        row['Location Standardization'] ||
        row['Location']             || ''
      ).trim();

      // ── GRADE ── (Unified Grade takes priority as it is the standardised grade)
      const grade = String(
        row['Unified Grade'] || row['Global Grade'] ||
        row['Grade']         || row['grade']         ||
        row['Local Grade']   || ''
      ).trim().toUpperCase();

      // ── SKILL ──
      const skill = String(
        row['Skill']               || row['skill']               ||
        row['Emp Skills']          ||
        row['Primary Skill']       || row['R2D2 - Primary Skill'] ||
        row['Skill Group']         || row['R2D2 - Skill Group']   || ''
      ).trim() || undefined;

      // Determine if new joiner:
      //   1. Explicit "Is New Joiner" = 'Yes' column in the file
      //   2. OR is_new_joiner flag is explicitly true
      //   3. OR joining date is within the last 90 days (recently joined)
      // NOTE: absence of a PM (no pmGgid) does NOT make someone a new joiner —
      //       that just means they are unassigned, which includes all bench employees.
      const joiningDateVal =
        row['Joining Date']          ||
        row['Global Date of Joining'] ||
        row['Most Recent Hire Date']  ||
        row['Local Date of Joining'];
      const joiningDateParsed: Date | undefined = joiningDateVal ? new Date(joiningDateVal) : undefined;
      const isRecentJoiner = joiningDateParsed instanceof Date && !isNaN(joiningDateParsed.getTime())
        ? (Date.now() - joiningDateParsed.getTime()) < (90 * 24 * 60 * 60 * 1000)
        : false;
      const isNewJoiner = row['Is New Joiner'] === 'Yes' || row['is_new_joiner'] === true || isRecentJoiner;

      // ── BENCH-SPECIFIC FIELDS ──
      const subPractice = String(
        row['Sub Practice'] || row['SubPractice'] || row['Sub-practice'] || row['Sub BU Name'] || row['Sub BUName'] || ''
      ).trim() || undefined;

      const locationVal = String(
        row['Location'] || row['Location Standardization'] || row['Work Location'] || row['Office Location'] || ''
      ).trim() || undefined;

      // Leave data (from Bench/GTD Dashboard)
      const leaveType = String(row['Leave Type'] || row['Leave Status'] || '').trim() || undefined;
      const leaveStartRaw = row['Leave Start Date'] || row['Leave From'] || row['Leave Start'];
      const leaveEndRaw   = row['Leave End Date']   || row['Leave To']   || row['Leave End'];
      const leaveStartDate = leaveStartRaw ? new Date(leaveStartRaw) : undefined;
      const leaveEndDate   = leaveEndRaw   ? new Date(leaveEndRaw)   : undefined;
      const benchStatusVal = String(row['Bench Status - Updated'] || row['Bench Status'] || row['Bench_Status'] || '').trim() || undefined;

      // Hire reason (used by GAD to detect new joiners)
      const hireReason = String(row['Original Hire Reason'] || row['Hire Reason'] || '').trim() || undefined;

      return {
        employee_id: employeeId,
        name: name,
        email: email,
        practice: practice,
        cu: cu,
        region: region,
        account: String(row['Account'] || row['account'] || row['Ultimate Account Name'] || row['Account Name'] || '').trim() || undefined,
        skill: skill,
        grade: grade,
        current_pm_id: normalizeId(row['Current PM ID'] || row['current_pm_id'] || pmGgid || '') || undefined,
        _pm_email: pmEmailForResolution || undefined,
        joining_date: joiningDateParsed,
        is_new_joiner: isNewJoiner,
        // Phase-2 fields
        sub_practice: subPractice,
        location: locationVal,
        leave_type: leaveType,
        leave_start_date: (leaveStartDate && !isNaN(leaveStartDate.getTime())) ? leaveStartDate : undefined,
        leave_end_date:   (leaveEndDate   && !isNaN(leaveEndDate.getTime()))   ? leaveEndDate   : undefined,
        bench_status: benchStatusVal,
        hire_reason: hireReason,
        upload_source: 'bench',
      };
    }).filter(emp => !!emp.employee_id);
    
    console.log(`✅ Parsed ${data.length} rows → ${parsedData.length} valid employees`);
    if (parsedData.length < data.length) {
      console.log(`⚠️  ${data.length - parsedData.length} rows skipped (missing Employee ID)`);
    }
    
    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse employee Excel: ${error.message}`);
  }
};

export const parsePMExcel = (buffer: Buffer): PeopleManager[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log(`📚 PM file sheets: ${workbook.SheetNames.join(' | ')}`);

    // Collect rows from ALL sheets that have a PM GGID column (bench format),
    // or fall back to the largest single sheet (PM report format).
    const { data, isBench } = collectPMSheetRows(workbook);

    console.log(`📊 PM file: ${data.length} total rows (isBench: ${isBench})`);

    if (!data || data.length === 0) {
      throw new Error('Excel file is empty');
    }

    const firstRowKeys = Object.keys(data[0]);
    console.log('📋 Detected PM file columns (first sheet):', firstRowKeys.slice(0, 20));

    // ── DETECT FILE FORMAT ──
    // Bench format = PM GGID + employee identity columns co-exist
    const hasPmGgidColumn = firstRowKeys.some(k => /^PM\s*GGID$/i.test(k.trim()));
    const hasEmployeeCols = firstRowKeys.some(k => /^(PERNR|LI\/LR ID|First Name|Last Name|NT Login|Most Recent Hire|Global Date of Joining|Candidate ID|GGID)$/i.test(k.trim()));
    const isBenchFormat   = isBench || (hasPmGgidColumn && hasEmployeeCols);

    console.log(isBenchFormat
      ? '🔍 Bench/Employee format detected — extracting unique PMs from PM columns'
      : '🔍 PM Report format detected — each row is a PM record');

    let parsedData: PeopleManager[];

    if (isBenchFormat) {
      // ── BENCH FORMAT: extract unique PMs from PM-prefixed columns ──
      // Each row is an employee; PM GGID, PM Name, PM Grade, etc. describe their manager.
      const pmMap = new Map<string, PeopleManager>();

      for (const row of data) {
        // PM GGID must be a true GGID — do NOT fall back to PERNR-based columns
        // (People Manager ID and Supervisor Emp ID are SAP PERNR numbers, not GGIDs)
        const pmGgid = normalizeId(
          row['PM GGID'] || row['PM Global Id'] || row['PM Global ID'] || ''
        );
        if (!pmGgid) continue;
        if (pmMap.has(pmGgid)) continue; // already captured this PM

        const pmName  = String(row['PM Name'] || row['People Manager Name'] || row['Supervisor Full Name'] || '').trim();
        const pmEmail = String(row['People Manager Email Address'] || row['PM Email ID'] || row['Supervisor Email ID'] || '').trim();
        const pmGrade = cleanValue(row['PM Grade']).toUpperCase();
        const pmSkill = cleanValue(row['PM Skills']);
        // PM practice: only use PM-specific columns (NOT employee practice columns)
        const pmPractice = cleanValue(row['PM Sub-practice'] || row['PM Practice'] || row['Sub-practice2'] || '');
        const pmRegion = cleanValue(row['PM Region'] || row['PM Location'] || '');
        const pmAccount = cleanValue(row['PM Account Name'] || '');
        // PM CU: no dedicated PM CU column in bench file — use PM Sub-practice
        const pmCu = String(row['PM Sub-practice'] || row['PM Practice'] || pmPractice || '').trim();

        const grade = pmGrade || 'C1';
        let defaultCapacity = 10;
        if (grade.startsWith('E')) defaultCapacity = 25;
        else if (grade.startsWith('D')) defaultCapacity = 15;

        let name = pmName;
        if (!name && pmEmail) {
          name = pmEmail.split('@')[0].split('.').map((p: string) =>
            p.charAt(0).toUpperCase() + p.slice(1)
          ).join(' ');
        }
        if (!name) name = `PM-${pmGgid}`;

        pmMap.set(pmGgid, {
          employee_id:    pmGgid,
          name,
          email:          pmEmail || `${pmGgid}@capgemini.com`,
          practice:       pmPractice,
          cu:             pmCu,
          region:         pmRegion,
          account:        pmAccount || undefined,
          skill:          pmSkill   || undefined,
          grade,
          reportee_count: 0,   // will be recalculated after employee upload
          max_capacity:   defaultCapacity,
          is_active:      true,
        });
      }

      parsedData = Array.from(pmMap.values());
      console.log(`✅ Extracted ${parsedData.length} unique PMs from ${data.length} employee rows`);

    } else {
      // ── PM REPORT FORMAT: each row is a PM ──
      parsedData = data.map((row: any) => {

        const ggid = getRowValue(row, [
          'GGID', 'Global Id', 'Global ID', 'GlobalId',
          'PM GGID', 'PM Global Id', 'PM Global ID', 'PM GlobalId',
          'Employee ID', 'employee_id', 'EmpID', 'Emp ID',
          'Staff ID', 'Resource ID', 'ID', 'Resource GGID',
        ]);

        const emailVal = getRowValue(row, [
          'Email', 'email', 'Email ID', 'PM Email ID', 'Email Address',
          'Work Email', 'Corporate Email', 'PM Email', 'Emailid',
          'Official Email', 'Email-ID',
        ]);

        const gradeVal = getRowValue(row, [
          'PM Grade', 'Grade', 'Unified Grade', 'Global Grade',
          'Local Grade', 'Emp Grade', 'Employee Grade', 'Band',
        ]);

        const skillVal = getRowValue(row, [
          'PM Skills', 'Skill', 'skill', 'Emp Skills',
          'Primary Skill', 'Skills', 'Primary Skills', 'Skill Name',
        ]);

        const practiceVal = getRowValue(row, [
          'PM Sub-practice', 'Practice', 'practice', 'Sub BUName', 'Sub BU Name',
          'Sub-practice', 'Sub Practice', 'SubPractice', 'PM Practice',
          'Department', 'Team', 'Sub BU',
        ]);

        const cuVal = getRowValue(row, [
          'CU', 'cu', 'SBU Name', 'Business Area', 'SBU',
          'Business Unit', 'BU', 'Delivery Unit',
        ]);

        const regionVal = getRowValue(row, [
          'PM Region', 'Region', 'region', 'Location', 'Country',
          'Geography', 'Geo', 'Work Location', 'Office',
        ]);

        const nameVal = getRowValue(row, [
          'PM Name', 'Name', 'name', 'Employee Name', 'Full Name',
          'Resource Name', 'Manager Name', 'Display Name',
        ]);

        const accountVal = getRowValue(row, [
          'PM Account Name', 'Account', 'account', 'Account Name', 'Client', 'Client Name',
        ]);

        const reporteeCountVal = getRowValue(row, [
          'Reportee Count', 'reportee_count', 'Total', 'Reportees',
          'Team Size', 'Headcount', 'Count',
        ]);

        const maxCapacityVal = getRowValue(row, [
          'Max Capacity', 'max_capacity', 'Capacity', 'Max Team Size', 'Max Reportees',
        ]);

        const isActiveVal = getRowValue(row, [
          'Is Active', 'is_active', 'Active', 'Status', 'Active Status',
        ]);

        const employeeId = normalizeId(ggid || '');
        const grade      = String(gradeVal || '').trim().toUpperCase();
        const emailStr   = String(emailVal || '').trim();
        const practice   = String(practiceVal || '').trim();
        const cu         = String(cuVal || practice || '').trim();
        const region     = String(regionVal || '').trim();

        let name = String(nameVal || '').trim();
        if (!name && emailStr) {
          name = emailStr.split('@')[0].split('.').map((p: string) =>
            p.charAt(0).toUpperCase() + p.slice(1)
          ).join(' ');
        }
        if (!name && employeeId) name = `PM-${employeeId}`;

        let defaultCapacity = 10;
        if (grade.startsWith('E')) defaultCapacity = 25;
        else if (grade.startsWith('D')) defaultCapacity = 15;

        if (!employeeId) {
          console.log('⚠️  Skipping row — no Employee ID/GGID found. Row keys:', Object.keys(row));
        }

        return {
          employee_id:    employeeId,
          name:           name || `PM-${employeeId}`,
          email:          emailStr || `${employeeId}@capgemini.com`,
          practice,
          cu,
          region,
          account:        accountVal  ? String(accountVal)  : undefined,
          skill:          skillVal    ? String(skillVal)    : undefined,
          grade,
          reportee_count: parseInt(String(reporteeCountVal || '0')) || 0,
          max_capacity:   parseInt(String(maxCapacityVal   || defaultCapacity)) || defaultCapacity,
          is_active:      isActiveVal !== 'No' && isActiveVal !== false,
        };
      }).filter((pm: any) => {
        if (!pm.employee_id) return false;
        const missing = [];
        if (!pm.practice) missing.push('practice');
        if (!pm.region)   missing.push('region');
        if (!pm.grade)    missing.push('grade');
        if (missing.length) {
          console.log(`ℹ️  PM ${pm.employee_id} included but missing: ${missing.join(', ')}`);
        }
        return true;
      });

      console.log(`✅ Parsed ${data.length} rows → ${parsedData.length} valid PMs`);
      if (parsedData.length < data.length) {
        console.log(`⚠️  ${data.length - parsedData.length} rows skipped (no Employee ID/GGID found)`);
      }
    }

    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse PM Excel: ${error.message}`);
  }
};

/**
 * Case-insensitive, whitespace/punctuation-insensitive column value extractor.
 * Builds a normalised-key → original-key map from the row, then looks up
 * each candidate in that map.  Returns the raw cell value or undefined.
 */
const getColValue = (row: any, candidates: string[]): any => {
  // Build normalised lookup map once per row call
  const normMap: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    normMap[normalizeHeader(key)] = key;
  }
  for (const c of candidates) {
    const orig = normMap[normalizeHeader(c)];
    if (orig !== undefined && row[orig] !== undefined && row[orig] !== null && row[orig] !== '') {
      return row[orig];
    }
  }
  return undefined;
};

export const parseSeparationExcel = (buffer: Buffer): SeparationReport[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📊 Separation file — sheet "${workbook.SheetNames[0]}", ${data.length} rows`);

    if (!data || data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Print first-row headers so we can see exactly what came in
    if (data.length > 0) {
      const headers = Object.keys(data[0] as object);
      console.log(`🔑 Column headers (${headers.length}): ${headers.join(' | ')}`);
    }

    const parsedData = data.map((row: any) => {
      // ── Identity — normalised lookup covers any casing / spacing variant ──
      const rawId = getColValue(row, [
        'CGID', 'CG ID', 'Global Id', 'Global ID', 'GlobalId',
        'GGID', 'PM GGID', 'PM Global Id', 'Resource Global ID',
        'Employee ID', 'Employee Id', 'Emp ID', 'EmpID', 'employee_id',
        'PERNR', 'Person Number',
      ]);

      // ── LWD — also catches any date-like column ──
      const rawLwd = getColValue(row, [
        'Updated Last Working Date', 'LWD', 'Last Working Date',
        'Last Working Day', 'Separation Date', 'Exit Date',
        'Effective Date', 'lwd', 'separation_date',
      ]);

      // ── Name ──
      const personName = cleanValue(
        getColValue(row, ['Employee Name', 'Resource Name', 'Name', 'Full Name', 'Emp Name']) ?? ''
      ) || undefined;

      // ── Designation ──
      const designation = cleanValue(
        getColValue(row, ['Designation', 'Role', 'Title', 'Job Title', 'Position']) ?? ''
      ) || undefined;

      // ── Grade ──
      const grade = cleanValue(
        getColValue(row, ['Global Grade', 'Grade', 'Unified Grade', 'Local Grade', 'Band']) ?? ''
      ).toUpperCase() || undefined;

      // ── Separation type & reason ──
      const separationType = cleanValue(
        getColValue(row, ['Separation Type', 'Sep Type', 'SeparationType', 'Exit Type']) ?? ''
      );
      const reasonText = cleanValue(
        getColValue(row, [
          'Separation Reason', 'Reason', 'Reason As By Employee',
          'Resignation Status', 'Separation', 'reason',
        ]) ?? ''
      );

      // ── Parse LWD date ──
      let lwdDate: Date | undefined;
      if (rawLwd !== undefined && rawLwd !== '') {
        if (rawLwd instanceof Date) {
          lwdDate = rawLwd;
        } else if (typeof rawLwd === 'number') {
          // Excel serial date (days since 1900-01-01, adjusted for leap-year bug)
          lwdDate = new Date((rawLwd - 25569) * 86400 * 1000);
        } else {
          const parsed = new Date(String(rawLwd));
          if (!isNaN(parsed.getTime())) lwdDate = parsed;
        }
      }

      return {
        employee_id: normalizeId(rawId ?? ''),
        lwd: lwdDate,
        reason: reasonText || separationType || undefined,
        separation_type: separationType || undefined,
        person_name: personName,
        grade,
        designation,
      };
    }).filter((sep): sep is { employee_id: string; lwd: Date; reason: any; separation_type: any; person_name: any; grade: any; designation: any } => {
      const ok = !!sep.employee_id && !!sep.lwd && !isNaN((sep.lwd as Date).getTime());
      return ok;
    });

    console.log(`✅ Parsed ${data.length} rows → ${parsedData.length} valid separations`);
    if (parsedData.length === 0 && data.length > 0) {
      // Emit sample of first row so backend logs reveal the real headers
      const sample = data[0] as any;
      console.error('❌ All rows failed filter. Sample row:', JSON.stringify(sample).substring(0, 400));
    } else if (parsedData.length < data.length) {
      console.log(`⚠️  ${data.length - parsedData.length} rows skipped (missing ID, missing/invalid LWD)`);
    }

    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse separation Excel: ${error.message}`);
  }
};

/**
 * Extract unique People Manager records from a GAD Excel file.
 * GAD rows contain PM data inline (People Manager ID, PM Name, PM Grade, etc.).
 * This must be called BEFORE inserting employees so FK constraints are satisfied.
 */
export const extractPMsFromGAD = (buffer: Buffer): import('../types').PeopleManager[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const { data } = findEmployeeDataSheet(workbook);
    if (!data || data.length === 0) return [];

    const pmMap = new Map<string, import('../types').PeopleManager>();

    for (const row of data) {
      // Resolve PM ID — prefer GGID columns over PERNR-based ones
      const pmId = normalizeId(
        row['People Manager ID']   || row['People Manager GGID']  ||
        row['PM GGID']             || row['PM Global Id']          ||
        row['PM Global ID']        || row['Supervisor GGID']       ||
        row['Supervisor ID']       || ''
      );
      if (!pmId || pmMap.has(pmId)) continue;

      const pmName = String(
        row['People Manager Name']      || row['People Manager Full Name'] ||
        row['PM Name']                  || row['Supervisor Full Name']     || ''
      ).trim();

      const pmEmail = String(
        row['People Manager Email Address'] || row['People Manager Email'] ||
        row['PM Email ID']                  || row['Supervisor Email ID']  || ''
      ).trim();

      const pmGrade = cleanValue(
        row['PM Grade'] || row['People Manager Grade'] || row['Supervisor Grade'] || ''
      ).toUpperCase() || 'C1';

      // PM practice: take from the employee row's practice (they share the same org)
      const pmPractice = String(
        row['PM Practice']    || row['PM Sub-practice'] ||
        row['Practice']       || row['Service Line']    ||
        row['BU Name']        || row['BUName']          || ''
      ).trim();

      const pmCu = String(
        row['CU'] || row['Organization BU'] || row['SBU Name'] || pmPractice || ''
      ).trim();

      const pmRegion = String(
        row['PM Region'] || row['Region'] || row['Location Standardization'] || ''
      ).trim();

      let defaultCapacity = 10;
      if (pmGrade.startsWith('E')) defaultCapacity = 25;
      else if (pmGrade.startsWith('D')) defaultCapacity = 15;

      let name = pmName;
      if (!name && pmEmail) {
        name = pmEmail.split('@')[0].split('.').map((p: string) =>
          p.charAt(0).toUpperCase() + p.slice(1)
        ).join(' ');
      }
      if (!name) name = `PM-${pmId}`;

      pmMap.set(pmId, {
        employee_id:    pmId,
        name,
        email:          pmEmail || `${pmId.toLowerCase()}@capgemini.com`,
        practice:       pmPractice,
        cu:             pmCu,
        region:         pmRegion,
        account:        cleanValue(row['Account'] || row['Ultimate Account Name'] || '') || undefined,
        skill:          undefined,
        grade:          pmGrade,
        reportee_count: 0,
        max_capacity:   defaultCapacity,
        is_active:      true,
        sub_practice:   undefined,
        location:       undefined,
        upload_source:  'gad',
      });
    }

    const pms = Array.from(pmMap.values());
    console.log(`✅ GAD: extracted ${pms.length} unique PMs from ${data.length} rows`);
    return pms;
  } catch (error: any) {
    console.error('extractPMsFromGAD error:', error.message);
    return [];
  }
};

/**
 * Parse a GAD (Global Allocation Dashboard) Excel report.
 * The GAD is the master data source for employees + auto-PM identification.
 * Key difference vs bench: upload_source = 'gad'; skill placeholder kept even if missing.
 */
export const parseGADExcel = (buffer: Buffer): Employee[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log(`📚 GAD file sheets: ${workbook.SheetNames.join(' | ')}`);

    const { data, sheetName } = findEmployeeDataSheet(workbook);
    console.log(`📊 GAD: Using sheet "${sheetName}" — ${data.length} rows`);

    if (!data || data.length === 0) {
      throw new Error('GAD Excel file is empty or has no recognisable employee data');
    }

    const parsedData = data.map((row: any) => {
      // ── Identity ──
      const ggid = row['Global Id'] || row['Global ID'] || row['GlobalId'] ||
                   row['GGID'] || row['CGID'] || row['CG ID'];
      const pernrVal = normalizeId(row['PERNR'] || row['Employee ID'] || row['Emp ID'] || '');
      const employeeId = normalizeId(ggid || pernrVal || '');

      // ── Name ──
      let name = String(
        row['Full Name'] || row['Employee Name'] || row['Resource Name'] ||
        `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || ''
      ).trim();
      if (!name && employeeId) name = `Employee-${employeeId}`;

      // ── Email ──
      let email = String(
        row['Email ID'] || row['Email'] || row['Email Address'] || row['Work Email'] ||
        row['Corporate Email'] || row['Official Email'] || row['NT Login ID'] || ''
      ).trim();
      if (!email && employeeId) email = `${employeeId.toLowerCase()}@capgemini.com`;

      // ── Practice & Sub-Practice ──
      const practice = String(
        row['Practice'] || row['Sub Practice'] || row['Sub-practice'] ||
        row['Sub BU Name'] || row['Sub BUName'] || row['Service Line'] || ''
      ).trim();

      const subPractice = String(
        row['Sub Practice'] || row['SubPractice'] || row['Sub Practice 2'] ||
        row['Sub-practice'] || row['Sub BU Name'] || ''
      ).trim() || undefined;

      // ── CU ──
      const cu = String(
        row['CU'] || row['Capability Unit'] || row['Organization BU'] ||
        row['SBU Name'] || row['Business Area'] || practice || ''
      ).trim();

      // ── Region / Location ──
      const region = String(
        row['Region'] || row['Location Standardization'] || row['Location'] || ''
      ).trim();

      const locationVal = String(
        row['Location'] || row['Work Location'] || row['Office Location'] ||
        row['City'] || row['Location Standardization'] || ''
      ).trim() || undefined;

      // ── Grade ──
      const grade = cleanValue(
        row['Unified Grade'] || row['Global Grade'] || row['Grade'] || row['grade'] || row['Local Grade'] || ''
      ).toUpperCase();

      // ── Skill (placeholder: extracted if present, else null — Skill Report upload fills it later) ──
      const skill = cleanValue(
        row['Primary Skill'] || row['R2D2 - Primary Skill'] || row['Skill'] || row['Emp Skills'] ||
        row['Skill Group'] || row['R2D2 - Skill Group'] || ''
      ) || undefined;

      // ── Account ──
      const account = cleanValue(
        row['Account'] || row['Ultimate Account Name'] || row['Account Name'] || ''
      ) || undefined;

      // ── Joining date: prefer CG Start Date for tenure calc ──
      const joiningDateVal =
        row['CG Start Date'] || row['Most Recent Hire Date'] ||
        row['Global Date of Joining'] || row['Date Of Joining'] || row['Joining Date'];
      const joiningDateParsed: Date | undefined = joiningDateVal ? new Date(joiningDateVal) : undefined;

      // ── Hire Reason → is_new_joiner ──
      const hireReason = cleanValue(row['Original Hire Reason'] || row['Hire Reason'] || '');
      const isRecentJoiner = joiningDateParsed instanceof Date && !isNaN(joiningDateParsed.getTime())
        ? (Date.now() - joiningDateParsed.getTime()) < (90 * 24 * 60 * 60 * 1000)
        : false;
      const isNewJoiner = hireReason.toLowerCase() === 'new hire' ||
                          row['Is New Joiner'] === 'Yes' || isRecentJoiner;

      // ── PM ID (direct GGID) + PM email (fallback for resolution) ──
      const pmIdDirect = normalizeId(
        row['People Manager ID']  || row['People Manager GGID'] ||
        row['PM GGID']            || row['PM Global Id']        ||
        row['PM Global ID']       || row['Supervisor GGID']     ||
        row['Supervisor ID']      || ''
      );

      const pmEmailForResolution = String(
        row['People Manager Email Address'] || row['PM Email ID'] ||
        row['Supervisor Email ID'] || ''
      ).trim();

      if (!employeeId) {
        console.log('⚠️  Skipping GAD row — missing ID. Keys:', Object.keys(row).slice(0, 10));
      }

      return {
        employee_id: employeeId,
        name,
        email,
        practice,
        cu,
        region,
        account,
        skill,          // placeholder: may be null; Skill Report fills it in later
        grade,
        // Use direct PM ID if present; otherwise let email-based resolution handle it
        current_pm_id: pmIdDirect || undefined,
        joining_date: (joiningDateParsed && !isNaN(joiningDateParsed.getTime())) ? joiningDateParsed : undefined,
        is_new_joiner: isNewJoiner,
        _pm_email: !pmIdDirect ? (pmEmailForResolution || undefined) : undefined,
        // Phase-2 fields
        sub_practice: subPractice,
        location: locationVal,
        hire_reason: hireReason || undefined,
        upload_source: 'gad' as const,
      };
    }).filter(emp => !!emp.employee_id);

    console.log(`✅ GAD parsed ${data.length} rows → ${parsedData.length} valid employees`);
    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse GAD Excel: ${error.message}`);
  }
};

// All recognised skill column header aliases (normalised, i.e. lowercase alphanum only)
const SKILL_NAME_ALIASES = [
  'skill', 'skillname', 'skillnameprimary', 'empskills',
  'primaryskill', 'primaryskills', 'finalupdatedprimaryskills',
  'r2d2primaryskill', 'skillmapping', 'primaryskillsreceived',
  'previousfilefinalprimaryskills'
];
const SKILL_CLUSTER_ALIASES = [
  'skillcluster', 'cluster', 'skillgroup', 'skillcategory',
  'r2d2skillgroup', 'scuforprimaryskillbadgebox',
  'reportsscuforprimaryskill', 'previousfilescuforprimaryskill',
  'previousfilereportsscuforprimaryskills'
];
const PRACTICE_ALIASES = [
  'practice', 'practicename', 'practicebu', 'pmsubpractice',
  'subbuname', 'subbu', 'subpractice', 'newsubpracticeasof18thfeb26',
  'subpractice2', 'practicetype', 'capabilitygroup', 'capabilitygroupname'
];

// Find the sheet index that contains skill data — pick the sheet with the MOST data rows
// (prevents a small summary/legend sheet from shadowing the main 6000-row data sheet)
const findSkillSheet = (workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; sheetName: string; headerRowIndex: number } | null => {
  let bestMatch: { sheet: XLSX.WorkSheet; sheetName: string; headerRowIndex: number; dataRowCount: number } | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = (rawRows[i] || []).map((c: any) => normalizeHeader(String(c || '')));
      if (row.some(h => SKILL_NAME_ALIASES.includes(h))) {
        const dataRowCount = rawRows.length - (i + 1);
        console.log(`🔍 Candidate skill sheet: "${sheetName}", header row: ${i + 1}, data rows: ${dataRowCount}`);
        if (!bestMatch || dataRowCount > bestMatch.dataRowCount) {
          bestMatch = { sheet, sheetName, headerRowIndex: i, dataRowCount };
        }
        break; // only one header scan per sheet
      }
    }
  }

  if (bestMatch) {
    console.log(`✅ Selected skill sheet: "${bestMatch.sheetName}" (${bestMatch.dataRowCount} data rows)`);
    return { sheet: bestMatch.sheet, sheetName: bestMatch.sheetName, headerRowIndex: bestMatch.headerRowIndex };
  }
  return null;
};

export const getSkillReportHeaders = (buffer: Buffer): Record<string, string[]> => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const result: Record<string, string[]> = {};
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      for (const row of raw.slice(0, 5)) {
        const strs = (row || []).map((c: any) => String(c || '').trim()).filter(Boolean);
        if (strs.length > 2) { result[sheetName] = strs; break; }
      }
    }
    return result;
  } catch { return {}; }
};

export const parseSkillReportExcel = (buffer: Buffer): SkillRepositoryEntry[] => {
  try {
    // dense: true + raw: false gives fastest parse for large files —
    // avoids building JS objects and keeps string coercion.
    const workbook = XLSX.read(buffer, { type: 'buffer', dense: true, raw: false });

    console.log(`📚 Sheet names in file: ${workbook.SheetNames.join(', ')}`);

    // ── Step 1: scan all sheets to find one with skill data ──
    const found = findSkillSheet(workbook);
    if (!found) {
      // No sheet had a recognised skill header - log all sheet first-row headers
      for (const sn of workbook.SheetNames) {
        const s = workbook.Sheets[sn];
        const rows: any[][] = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
        if (rows.length > 0) console.log(`  Sheet "${sn}" row-1:`, (rows[0] || []).map((c: any) => String(c || '').trim()));
      }
      return [];
    }

    const rawRows: any[][] = XLSX.utils.sheet_to_json(found.sheet, { header: 1 }) as any[][];
    const headerRowIndex = found.headerRowIndex;

    // ── Step 2: extract header row ──
    const headerRow = (rawRows[headerRowIndex] || []).map((c: any) => String(c || '').trim());
    console.log(`📊 Sheet "${found.sheetName}" - using row ${headerRowIndex + 1} as headers. Columns: ${headerRow.length}`);
    console.log('📋 Header row:', headerRow);

    const dataRows = rawRows.slice(headerRowIndex + 1);
    console.log(`📊 Data rows to process: ${dataRows.length}`);

    if (dataRows.length === 0) {
      throw new Error(`Sheet "${found.sheetName}" has headers but no data rows`);
    }

    // ── Step 3: build column index map ──
    const colIndex = (aliases: string[]): number => {
      const normalised = new Set(aliases.map(normalizeHeader));
      for (let i = 0; i < headerRow.length; i++) {
        if (normalised.has(normalizeHeader(headerRow[i]))) return i;
      }
      return -1;
    };

    const skillIdx    = colIndex(SKILL_NAME_ALIASES);
    const clusterIdx  = colIndex(SKILL_CLUSTER_ALIASES);
    const practiceIdx = colIndex(PRACTICE_ALIASES);

    console.log(`🔍 Column indices → skill: ${skillIdx}, cluster: ${clusterIdx}, practice: ${practiceIdx}`);

    if (skillIdx === -1) {
      console.warn('⚠️  No skill column found. Actual headers:', headerRow);
      return [];
    }

    // ── Step 4: extract data ──
    const parsedData: SkillRepositoryEntry[] = [];
    for (const row of dataRows) {
      const skillName = String(row[skillIdx] || '').trim().substring(0, 490);
      if (!skillName) continue;
      const practice    = (practiceIdx >= 0 ? String(row[practiceIdx] || '').trim() : '').substring(0, 490);
      const skillCluster = clusterIdx >= 0 ? String(row[clusterIdx] || '').trim().substring(0, 490) : undefined;
      parsedData.push({
        practice: practice || 'All',
        skill_name: skillName,
        skill_cluster: skillCluster || undefined,
      });
    }

    console.log(`✅ Parsed ${dataRows.length} rows → ${parsedData.length} valid skills`);
    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse skill report Excel: ${error.message}`);
  }
};

/**
 * Returns the column headers detected in the first sheet of an Excel/CSV file.
 * Used to generate actionable error messages when an upload produces 0 valid rows.
 */
export const getFileHeaders = (buffer: Buffer): string[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    return data.length > 0 ? Object.keys(data[0]) : [];
  } catch {
    return [];
  }
};
