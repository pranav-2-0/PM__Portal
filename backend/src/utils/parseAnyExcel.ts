import * as XLSX from 'xlsx';
import { Employee, PeopleManager, SeparationReport, SkillRepositoryEntry } from '../types';
import { getFileExtension } from './fileType';

// Add a helper to parse any file type
export function parseAnyExcel(buffer: Buffer, filename: string): any[] {
  const ext = getFileExtension(filename);
  if (ext === '.csv') {
    // Parse CSV
    const text = buffer.toString('utf8');
    return XLSX.utils.sheet_to_json(XLSX.read(text, { type: 'string' }).Sheets.Sheet1);
  }
  // For .xlsx, .xls, .xlsm, .xlsb (if supported by xlsx), etc.
  return XLSX.utils.sheet_to_json(XLSX.read(buffer, { type: 'buffer' }).Sheets.Sheet1);
}
