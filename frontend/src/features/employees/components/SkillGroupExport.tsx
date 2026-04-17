import { Download } from 'lucide-react';

interface SkillGroupExportProps {
  skillName: string;
  rows: any[];
  columns: { key: string; label: string }[];
  isLoading?: boolean;
}

/**
 * Reusable CSV export button for individual skill groups
 * Handles formatting and download for skill category data
 */
export function SkillGroupExport({ skillName, rows, columns, isLoading = false }: SkillGroupExportProps) {
  const handleExport = () => {
    if (!rows.length) return;

    // Prepare headers
    const headers = columns.map(c => {
      if (c.key === 'skill') return 'Primary Skill';
      return c.label;
    });

    // Prepare rows with proper CSV formatting
    const csvRows = rows.map(row =>
      columns.map(col => {
        let value = row[col.key];

        if (col.key === 'skill') {
          value = row.primary_skill;
        }

        if (col.key === 'primary_skill') {
          value = (row.skill && row.skill !== row.primary_skill) ? row.skill : '';
        }

        // Handle boolean values
        if (col.key === 'is_new_joiner' || col.key === 'is_frozen' || col.key === 'pm_is_active') {
          return value ? 'Yes' : 'No';
        }

        // Handle PM assignment
        if (col.key === 'current_pm_id') {
          return value ? 'Assigned' : 'Unassigned';
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Escape quotes and handle commas
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join(',')
    );

    // Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${skillName.replace(/\s+/g, '_')}_employees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading || !rows.length}
      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5"
      title={!rows.length ? 'No data to export' : `Export ${rows.length} row(s) as CSV`}
    >
      <Download size={13} />
      <span>Export</span>
    </button>
  );
}
