/**
 * CSV Export Utilities
 * Provides reusable functions for exporting data to CSV format
 */

/**
 * Escapes a value for CSV format (handles commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects to CSV format
 * @param data - Array of records
 * @param headers - Optional array of header names
 * @param columnMapping - Object mapping data keys to column names
 * @returns CSV string
 */
export function convertToCSV(
  data: any[],
  headers: string[],
  columnMapping: Record<string, string>
): string {
  const keys = Object.keys(columnMapping);
  const headerRow = headers.join(',');
  
  const rows = data.map(row =>
    keys.map(key => {
      const value = row[key];
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return escapeCSVValue(value);
    }).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
}

/**
 * Exports CSV data to a file download
 * @param csvContent - CSV string content
 * @param filename - Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports array of records directly to CSV file
 * Combines conversion and download in one call
 * @param data - Array of records to export
 * @param headers - Column headers for CSV
 * @param columnMapping - Mapping of object keys to column names
 * @param filename - Name of the file to download
 */
export function exportToCSV(
  data: any[],
  headers: string[],
  columnMapping: Record<string, string>,
  filename: string
): void {
  if (!data.length) return;
  const csv = convertToCSV(data, headers, columnMapping);
  downloadCSV(csv, filename);
}

/**
 * Predefined column mappings for common entities
 */
export const COLUMN_MAPPINGS = {
  employee: {
    employee_id: 'ID',
    name: 'Name',
    grade: 'Grade',
    practice: 'Practice',
    cu: 'NEW BU',
    region: 'Region',
    account: 'Account',
    skill: 'Skill',
    primary_skill: 'Primary Skill',
    status: 'Status',
    current_pm_id: 'PM Assignment',
    email: 'Email',
    joining_date: 'Joining Date',
  },
  separation: {
    employee_id: 'ID',
    person_name: 'Name',
    grade: 'Grade',
    designation: 'Designation',
    separation_type: 'Type',
    lwd: 'LWD',
    reason: 'Reason',
    status: 'Status',
    person_type: 'Person Type',
  },
  bench: {
    employee_id: 'ID',
    name: 'Name',
    grade: 'Grade',
    practice: 'Practice',
    cu: 'NEW BU',
    region: 'Region',
    primary_skill: 'Primary Skill',
    bench_status: 'Bench Status',
  },
} as const;
