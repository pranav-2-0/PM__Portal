import TabBar from '../components/TabBar';
import { useState, useRef, useEffect } from 'react';
import {
  useGetEmployeesListQuery,
  useGetNewJoinersListQuery,
  useFindPMForEmployeeMutation,
  useAssignPMMutation,
  useGetSeparationsListQuery,
} from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import {
  Users, Search, Filter, Download, Loader2, AlertCircle,
  UserPlus, CheckCircle2, UserX, AlertTriangle, UploadCloud,
  SlidersHorizontal, ChevronDown, RotateCcw,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import Table from '../components/Table';
import { format, differenceInDays } from 'date-fns';

type TabId = 'employees' | 'bench' | 'new-joiners' | 'separations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'employees',    label: 'All Employees' },
  { id: 'bench',        label: 'Bench Resources' },
  { id: 'new-joiners',  label: 'New Joiners' },
  { id: 'separations',  label: 'Separations' },
];

// ── Column definitions ────────────────────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  group: string;
  defaultVisible: boolean;
  render?: (emp: any) => React.ReactNode;
}

const ALL_COLUMNS: ColDef[] = [
  // Identity / GAD
  { key: 'employee_id',       label: 'Employee ID',      group: 'Identity',      defaultVisible: true,
    render: e => <span className="text-xs text-gray-400 font-mono">{e.employee_id}</span> },
  { key: 'name',              label: 'Name',             group: 'Identity',      defaultVisible: true,
    render: e => <span className="font-medium text-gray-800">{e.name}</span> },
  { key: 'email',             label: 'Email',            group: 'Identity',      defaultVisible: false,
    render: e => <span className="text-xs text-gray-500">{e.email || '—'}</span> },
  { key: 'grade',             label: 'Grade',            group: 'Identity',      defaultVisible: true,
    render: e => e.grade
      ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{e.grade}</span>
      : <span className="text-gray-400">—</span> },
  { key: 'status',            label: 'Status',           group: 'Identity',      defaultVisible: true,
    render: e => <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{e.status || 'active'}</span> },
  { key: 'joining_date',      label: 'Joining Date',     group: 'Identity',      defaultVisible: false,
    render: e => <span className="text-xs text-gray-500">{e.joining_date ? format(new Date(e.joining_date), 'dd MMM yyyy') : '—'}</span> },
  { key: 'is_new_joiner',     label: 'New Joiner',       group: 'Identity',      defaultVisible: false,
    render: e => e.is_new_joiner
      ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Yes</span>
      : <span className="text-gray-400 text-xs">No</span> },

  // Organisation
  { key: 'practice',          label: 'Practice',         group: 'Organisation',  defaultVisible: true,
    render: e => <span className="text-gray-600 text-xs">{e.practice || '—'}</span> },
  { key: 'sub_practice',      label: 'Sub Practice',     group: 'Organisation',  defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.sub_practice || '—'}</span> },
  { key: 'cu',                label: 'CU',               group: 'Organisation',  defaultVisible: true,
    render: e => <span className="text-gray-500 text-xs">{e.cu || '—'}</span> },
  { key: 'region',            label: 'Region',           group: 'Organisation',  defaultVisible: true,
    render: e => <span className="text-gray-500 text-xs">{e.region || '—'}</span> },
  { key: 'account',           label: 'Account',          group: 'Organisation',  defaultVisible: true,
    render: e => <span className="text-gray-500 text-xs">{e.account || '—'}</span> },
  { key: 'location',          label: 'Location',         group: 'Organisation',  defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.location || '—'}</span> },

  // Skill Report
  { key: 'skill',             label: 'Skill',            group: 'Skill Report',  defaultVisible: true,
    render: e => <span className="text-gray-500 text-xs">{e.skill || '—'}</span> },

  // Bench Report
  { key: 'bench_status',      label: 'Bench Status',     group: 'Bench Report',  defaultVisible: false,
    render: e => e.bench_status
      ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{e.bench_status}</span>
      : <span className="text-gray-400 text-xs">—</span> },
  { key: 'hire_reason',       label: 'Hire Reason',      group: 'Bench Report',  defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.hire_reason || '—'}</span> },
  { key: 'leave_type',        label: 'Leave Type',       group: 'Bench Report',  defaultVisible: false,
    render: e => e.leave_type
      ? <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{e.leave_type}</span>
      : <span className="text-gray-400 text-xs">—</span> },
  { key: 'leave_start_date',  label: 'Leave Start',      group: 'Bench Report',  defaultVisible: false,
    render: e => <span className="text-xs text-gray-500">{e.leave_start_date ? format(new Date(e.leave_start_date), 'dd MMM yyyy') : '—'}</span> },
  { key: 'leave_end_date',    label: 'Leave End',        group: 'Bench Report',  defaultVisible: false,
    render: e => <span className="text-xs text-gray-500">{e.leave_end_date ? format(new Date(e.leave_end_date), 'dd MMM yyyy') : '—'}</span> },
  { key: 'upload_source',     label: 'Upload Source',    group: 'Bench Report',  defaultVisible: false,
    render: e => <span className="text-gray-400 text-xs">{e.upload_source || '—'}</span> },

  // PM Info
  { key: 'pm_assigned',       label: 'PM Status',        group: 'PM Info',       defaultVisible: true,
    render: e => e.current_pm_id
      ? <span className="text-green-600 font-medium text-xs">Assigned</span>
      : <span className="text-orange-500 text-xs">Unassigned</span> },
  { key: 'pm_name',           label: 'PM Name',          group: 'PM Info',       defaultVisible: false,
    render: e => <span className="text-gray-600 text-xs">{e.pm_name || '—'}</span> },
  { key: 'current_pm_id',     label: 'PM ID',            group: 'PM Info',       defaultVisible: false,
    render: e => <span className="text-gray-400 text-xs font-mono">{e.current_pm_id || '—'}</span> },
  { key: 'pm_grade',          label: 'PM Grade',         group: 'PM Info',       defaultVisible: false,
    render: e => e.pm_grade
      ? <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">{e.pm_grade}</span>
      : <span className="text-gray-400 text-xs">—</span> },
  { key: 'pm_email',          label: 'PM Email',         group: 'PM Info',       defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.pm_email || '—'}</span> },
  { key: 'pm_cu',             label: 'PM CU',            group: 'PM Info',       defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.pm_cu || '—'}</span> },
  { key: 'pm_region',         label: 'PM Region',        group: 'PM Info',       defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.pm_region || '—'}</span> },

  // Separation Report
  { key: 'separation_lwd',    label: 'Last Working Day', group: 'Separation',    defaultVisible: false,
    render: e => e.separation_lwd
      ? <span className="text-xs font-mono text-red-600">{format(new Date(e.separation_lwd), 'dd MMM yyyy')}</span>
      : <span className="text-gray-400 text-xs">—</span> },
  { key: 'separation_type',   label: 'Separation Type',  group: 'Separation',    defaultVisible: false,
    render: e => e.separation_type
      ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{e.separation_type}</span>
      : <span className="text-gray-400 text-xs">—</span> },
  { key: 'designation',       label: 'Designation',      group: 'Separation',    defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs">{e.designation || '—'}</span> },
  { key: 'separation_reason', label: 'Sep. Reason',      group: 'Separation',    defaultVisible: false,
    render: e => <span className="text-gray-500 text-xs max-w-[160px] truncate block" title={e.separation_reason}>{e.separation_reason || '—'}</span> },
  { key: 'separation_status', label: 'Sep. Status',      group: 'Separation',    defaultVisible: false,
    render: e => e.separation_status
      ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.separation_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{e.separation_status}</span>
      : <span className="text-gray-400 text-xs">—</span> },
];

const GROUPS = Array.from(new Set(ALL_COLUMNS.map(c => c.group)));
const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));

// Backend CSV key mapping (virtual UI keys → backend DB columns)
const BACKEND_KEY_MAP: Record<string, string> = {
  pm_assigned: 'current_pm_id',
};

// ── Column Picker panel ───────────────────────────────────────────────────────
function ColumnPicker({
  visible, onChange,
}: { visible: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) { next.delete(key); } else { next.add(key); }
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 bg-white"
      >
        <SlidersHorizontal size={14} />
        Columns
        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{visible.size}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-72 max-h-[520px] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <span className="font-semibold text-gray-800 text-sm">Show / Hide Columns</span>
            <div className="flex gap-2">
              <button
                onClick={() => onChange(new Set(ALL_COLUMNS.map(c => c.key)))}
                className="text-xs text-blue-600 hover:underline">All</button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onChange(new Set(DEFAULT_VISIBLE))}
                className="text-xs text-gray-500 hover:underline">Default</button>
            </div>
          </div>
          {GROUPS.map(group => (
            <div key={group} className="px-4 py-2 border-b border-gray-50 last:border-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
              <div className="space-y-1">
                {ALL_COLUMNS.filter(c => c.group === group).map(col => (
                  <label key={col.key}
                    className="flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={visible.has(col.key)}
                      onChange={() => toggle(col.key)}
                      className="accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared EmployeeTable ─────────────────────────────────────────────────────
function EmployeeTable({ benchOnly = false }: { benchOnly?: boolean }) {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [filters, setFilters] = useState({
    status: 'active', practice: '', cu: '', region: '', grade: '', account: '', search: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [exporting, setExporting] = useState(false);

  const { data: response, isLoading, refetch } = useGetEmployeesListQuery({
    ...filters,
    page,
    pageSize,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });

  const employees = (response?.data || []).filter((emp: any) => {
    if (benchOnly && emp.current_pm_id) return false;
    return true;
  });

  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  const INITIAL_FILTERS = {
    status: 'active', practice: '', cu: '', region: '', grade: '', account: '', search: '',
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Reset all filters to defaults and restore default visible columns
  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setVisibleCols(new Set(DEFAULT_VISIBLE));
    setPage(1);
  };

  // Columns currently selected (in definition order)
  const activeCols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  // ── CSV export: mirrors the UI exactly ──────────────────────────────────────
  // Strategy: fetch all records from backend (all real DB columns), then
  // render each cell using the same logic as the UI table → perfect match.
  const exportToCSV = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('authToken');

      // 1. Fetch ALL records (no pagination) from backend with every DB column.
      //    We request all known backend keys so nothing is missing.
      const ALL_BACKEND_KEYS = [
        'employee_id','name','email','grade','practice','sub_practice','cu','region',
        'account','location','skill','status','joining_date','hire_reason','bench_status',
        'leave_type','leave_start_date','leave_end_date','upload_source','is_new_joiner',
        'current_pm_id','pm_name','pm_grade','pm_email','pm_cu','pm_region',
        'separation_lwd','separation_type','designation','separation_reason','separation_status',
      ];

      const params = new URLSearchParams();
      if (filters.status)   params.set('status', filters.status);
      if (filters.practice) params.set('practice', filters.practice);
      if (filters.cu)       params.set('cu', filters.cu);
      if (filters.region)   params.set('region', filters.region);
      if (filters.grade)    params.set('grade', filters.grade);
      if (filters.account)  params.set('account', filters.account);
      if (filters.search)   params.set('search', filters.search);
      params.set('columns', ALL_BACKEND_KEYS.join(','));

      const res = await fetch(`/api/pm/employees/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

      // 2. Parse the raw CSV rows back into row objects keyed by backend column.
      //    Backend returns: header row (backend labels) + data rows.
      const rawCsv = await res.text();
      const rawLines = rawCsv.split('\n').filter(l => l.trim());
      if (rawLines.length < 2) { alert('No data to export.'); return; }

      // Simple CSV parser (handles quoted fields)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === ',' && !inQuotes) {
            result.push(cur); cur = '';
          } else {
            cur += ch;
          }
        }
        result.push(cur);
        return result;
      };

      // Reconstruct row objects from the raw CSV using ALL_BACKEND_KEYS as the key order
      // (backend writes columns in the order requested via the 'columns' param)
      const dataRows: any[] = rawLines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        const obj: any = {};
        ALL_BACKEND_KEYS.forEach((k, i) => { obj[k] = vals[i] ?? ''; });
        return obj;
      });

      // Apply bench filter the same way the UI does
      const filteredRows = benchOnly
        ? dataRows.filter(r => !r.current_pm_id)
        : dataRows;

      // 3. Extract plain-text value per column — mirrors the UI render logic exactly.
      const cellText = (col: ColDef, row: any): string => {
        switch (col.key) {
          case 'joining_date':
          case 'leave_start_date':
          case 'leave_end_date':
          case 'separation_lwd':
            // Backend already returns formatted date strings (YYYY-MM-DD)
            return row[col.key] || '';
          case 'is_new_joiner':
            return row.is_new_joiner === 'Yes' || row.is_new_joiner === true || row.is_new_joiner === 'true' ? 'Yes' : 'No';
          case 'pm_assigned':
            return row.current_pm_id ? 'Assigned' : 'Unassigned';
          case 'status':
            return row.status || 'active';
          default:
            return row[BACKEND_KEY_MAP[col.key] || col.key] ?? '';
        }
      };

      // 4. Build CSV using activeCols (exactly what user sees in the table).
      const escapeCSV = (val: string): string => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const headerRow = activeCols.map(c => escapeCSV(c.label)).join(',');
      const dataRowStrings = filteredRows.map(row =>
        activeCols.map(col => escapeCSV(cellText(col, row))).join(',')
      );

      const csvContent = [headerRow, ...dataRowStrings].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = benchOnly ? 'bench_resources.csv' : 'employees_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Bench summary cards
  const gradeGroups = benchOnly
    ? employees.reduce((acc: any, emp: any) => {
        const g = emp.grade || 'Unknown';
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-4">

      {/* Bench summary cards */}
      {benchOnly && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bench</p>
            <p className="text-3xl font-bold text-orange-600">{employees.length}</p>
          </div>
          {Object.entries(gradeGroups).slice(0, 3).map(([grade, count]: any) => (
            <div key={grade} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade {grade}</p>
              <p className="text-3xl font-bold text-blue-700">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {!benchOnly && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
        )}
        {([['search','Search Name/ID'],['practice','Practice'],['cu','CU'],['region','Region'],['grade','Grade'],['account','Account']] as [string,string][]).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              value={(filters as any)[key]}
              onChange={e => handleFilterChange(key, e.target.value)}
              placeholder={`Filter ${label}`}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />
          </div>
        ))}

        <div className="flex gap-2 ml-auto items-end">
          <button onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <RotateCcw size={14} /> Reset
          </button>
          <ColumnPicker visible={visibleCols} onChange={setVisibleCols} />
          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 text-white rounded-lg text-sm disabled:opacity-60"
            style={{ backgroundColor: '#0070AD' }}>
            {exporting
              ? <><Loader2 size={14} className="animate-spin" /> Exporting…</>
              : <><Download size={14} /> Export All</>}
          </button>
        </div>
      </div>

      {/* Info strip */}
      <p className="text-xs text-gray-400 px-1 flex items-center gap-1.5">
        <SlidersHorizontal size={11} />
        {activeCols.length} of {ALL_COLUMNS.length} columns shown · CSV exports all {pagination.totalRecords.toLocaleString()} matching records with exactly the same columns visible in this table
      </p>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-end">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            benchOnly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {benchOnly
              ? `${employees.length} records`
              : `${pagination.totalRecords.toLocaleString()} records`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={32} />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {benchOnly
              ? <><AlertCircle size={40} className="mx-auto mb-3 opacity-30" /><p>No bench resources</p><p className="text-sm mt-1">All employees are assigned to a PM</p></>
              : <><Users size={40} className="mx-auto mb-3 opacity-30" /><p>No employees found</p></>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {activeCols.map(col => (
                    <th key={col.key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.employee_id}
                    className={`border-b border-gray-100 transition-colors ${benchOnly ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}>
                    {activeCols.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render
                          ? col.render(emp)
                          : <span className="text-gray-500 text-xs">{(emp as any)[col.key] ?? '—'}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalRecords > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalRecords={pagination.totalRecords}
            pageSize={pagination.pageSize}
            onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Helpers for PM matching modal ───────────────────────────────────────────
const FLAG_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  Major:    'bg-orange-100 text-orange-800 border-orange-200',
  Minor:    'bg-yellow-100 text-yellow-700 border-yellow-200',
};
const CONFIDENCE_COLORS: Record<string, string> = {
  High:       'bg-green-100 text-green-800',
  Medium:     'bg-yellow-100 text-yellow-800',
  Low:        'bg-red-100 text-red-800',
  Unmappable: 'bg-gray-200 text-gray-700',
  Forced:     'bg-purple-100 text-purple-800',
};
const TIER_LABELS: Record<string, string> = {
  exact:                'Exact match',
  same_bu_diff_account: 'Same BU, diff account',
  cross_bu:             'Cross-BU fallback',
  forced_assignment:    'Forced (Resignation Override)',
};
const PATH_LABELS: Record<string, { label: string; color: string }> = {
  Path1_Perfect:           { label: 'Path 1 — Perfect match',        color: 'bg-green-100 text-green-800' },
  Path2_SkillFallback:     { label: 'Path 2 — Skill fallback',        color: 'bg-green-100 text-green-700' },
  Path3_DiffAccount:       { label: 'Path 3 — Diff account',          color: 'bg-yellow-100 text-yellow-800' },
  Path4_RegionFallback:    { label: 'Path 4 — Region fallback',       color: 'bg-yellow-100 text-yellow-800' },
  Path5_RegionAccount:     { label: 'Path 5 — Region + account diff', color: 'bg-orange-100 text-orange-800' },
  Path6_CrossBU:           { label: 'Path 6 — Cross-BU fallback',     color: 'bg-red-100 text-red-700' },
  Path7_CrossBUExactSkill: { label: 'Path 7 — Cross-BU, exact skill', color: 'bg-red-100 text-red-700' },
  PathF_ForcedAssignment:  { label: '⚠ Forced — Resignation Override', color: 'bg-purple-100 text-purple-800' },
};

// ─── New Joiners tab ──────────────────────────────────────────────────────────
function NewJoiners() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: response, isLoading } = useGetNewJoinersListQuery({
    page, pageSize,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });
  const [findPM] = useFindPMForEmployeeMutation();
  const [assignPM] = useAssignPMMutation();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [pmMatches, setPmMatches] = useState<any[]>([]);
  const [flagSummary, setFlagSummary] = useState<any>(null);
  const [datasetScope, setDatasetScope] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const handleFindPM = async (employee: any) => {
    setSearching(true); setSelectedEmployee(employee);
    try {
      const result = await findPM(employee.employee_id).unwrap();
      const r = result as any;
      setPmMatches(r.matches || []); setFlagSummary(r.flag_summary || null);
      setDatasetScope(r.dataset_scope || null); setSelectedMatch(null);
    } catch (e) { console.error(e); } finally { setSearching(false); }
  };

  const handleAssign = async (pmId: string, score: number) => {
    try {
      await assignPM({ employee_id: selectedEmployee.employee_id, new_pm_id: pmId, assignment_type: 'new_joiner', match_score: score }).unwrap();
      alert('Recommendation sent for approval.');
      setSelectedEmployee(null); setPmMatches([]); setSelectedMatch(null);
    } catch (e: any) { alert('Assignment failed: ' + e.message); }
  };

  const newJoiners = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };
  const columns = [
    { header: 'Employee ID', accessor: 'employee_id' as const },
    { header: 'Name', accessor: 'name' as const },
    { header: 'Grade', accessor: 'grade' as const },
    { header: 'Practice', accessor: 'practice' as const },
    { header: 'CU', accessor: 'cu' as const },
    { header: 'Actions', accessor: (row: any) => (
      <button onClick={() => handleFindPM(row)} className="btn-primary text-xs py-1.5 px-3">
        <Search size={14} className="inline mr-1" /> Find PM
      </button>
    )},
  ];

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin" style={{ color: '#12ABDB' }} size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Unassigned Employees ({pagination.totalRecords || 0})</h2>
        <Table data={newJoiners} columns={columns} />
        {pagination.totalRecords > 0 && (
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalRecords={pagination.totalRecords}
            pageSize={pagination.pageSize}
            onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="text-white p-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">PM Recommendations</h2>
                  <p className="text-white/80 text-sm mt-0.5">{selectedEmployee.name} · {selectedEmployee.employee_id} · {selectedEmployee.practice} · {selectedEmployee.cu}</p>
                </div>
                {flagSummary && (
                  <div className="flex gap-2 text-xs flex-shrink-0 ml-4">
                    {flagSummary.critical > 0 && <span className="px-2 py-1 bg-red-500/80 text-white rounded-full font-semibold">{flagSummary.critical} Critical</span>}
                    {flagSummary.major > 0 && <span className="px-2 py-1 bg-orange-400/80 text-white rounded-full font-semibold">{flagSummary.major} Major</span>}
                    {flagSummary.minor > 0 && <span className="px-2 py-1 bg-yellow-400/80 text-white rounded-full font-semibold">{flagSummary.minor} Minor</span>}
                  </div>
                )}
              </div>
            </div>
            {datasetScope && !datasetScope.is_scoped && (
              <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2">
                <span className="text-red-500 font-bold text-xs mt-0.5">CRITICAL</span>
                <div>
                  <p className="text-xs font-semibold text-red-800">Dataset is not practice-scoped</p>
                  <p className="text-xs text-red-600 mt-0.5">{datasetScope.practices_found?.length} practices found: {(datasetScope.practices_found || []).join(', ')}. Rows with mismatched PM practice are marked Unmappable.</p>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">
              {searching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
                </div>
              ) : pmMatches.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="font-medium">No suitable PMs found</p>
                  <p className="text-sm mt-1 text-gray-400">No active PMs in practice "{selectedEmployee.practice}" with available capacity and eligible grade.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  <div className="lg:col-span-3 space-y-3">
                    {pmMatches.map((match: any, idx: number) => {
                      const isSelected = selectedMatch?.pm?.employee_id === match.pm.employee_id;
                      const confidence: string = match.confidence || 'High';
                      const tier: string = match.matchTier || 'exact';
                      const critFlags = (match.flags || []).filter((f: any) => f.severity === 'Critical');
                      const majorFlags = (match.flags || []).filter((f: any) => f.severity === 'Major');
                      const minorFlags = (match.flags || []).filter((f: any) => f.severity === 'Minor');
                      return (
                        <div key={idx}
                          className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 shadow-lg bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'}`}
                          onClick={() => setSelectedMatch(match)}>
                          {match.forcedAssignment && (
                            <div className="mb-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center gap-2 text-xs text-purple-800 font-semibold">
                              <span>⚠</span><span>FORCED ASSIGNMENT — PM Resignation Override. All constraints relaxed. Manual review recommended.</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{match.pm.name}</h3>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{match.pm.grade}</span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[confidence] || 'bg-gray-100 text-gray-700'}`}>{confidence} confidence</span>
                              {tier !== 'exact' && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">{TIER_LABELS[tier] || tier}</span>}
                              {match.path && PATH_LABELS[match.path] && <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PATH_LABELS[match.path].color}`}>{PATH_LABELS[match.path].label}</span>}
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <span className="text-base font-bold text-[#0070AD]">{match.score.toFixed(0)}</span>
                              <span className="text-xs text-gray-400">pts</span>
                              {isSelected && <CheckCircle2 size={16} className="text-blue-500 ml-1" />}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                            <div><span className="text-gray-400">Practice: </span><span className="font-medium text-gray-700">{match.pm.practice}</span></div>
                            <div><span className="text-gray-400">BU (CU): </span><span className="font-medium text-gray-700">{match.pm.cu}</span></div>
                            <div><span className="text-gray-400">Region: </span><span className="font-medium text-gray-700">{match.pm.region}</span></div>
                            <div><span className="text-gray-400">Account: </span><span className="font-medium text-gray-700">{match.pm.account || '—'}</span></div>
                            <div><span className="text-gray-400">Skill: </span><span className="font-medium text-gray-700">{match.pm.skill || '—'}</span></div>
                            <div><span className="text-gray-400">Capacity: </span>
                              <span className={`font-semibold ${(match.pm.reportee_count ?? 0) >= (match.pm.max_capacity ?? 10) ? 'text-red-600' : 'text-green-600'}`}>
                                {match.pm.reportee_count ?? 0}/{match.pm.max_capacity ?? '—'}
                              </span>
                            </div>
                          </div>
                          {(critFlags.length + majorFlags.length + minorFlags.length) > 0 && (
                            <div className="space-y-1 mt-2">
                              {critFlags.map((f: any, i: number) => <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Critical}`}><span className="font-bold mr-1">Critical [{f.code}]:</span>{f.message}</div>)}
                              {majorFlags.map((f: any, i: number) => <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Major}`}><span className="font-bold mr-1">Major [{f.code}]:</span>{f.message}</div>)}
                              {minorFlags.map((f: any, i: number) => <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Minor}`}><span className="font-bold mr-1">Minor [{f.code}]:</span>{f.message}</div>)}
                            </div>
                          )}
                          {match.reasons?.length > 0 && <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2.5 py-1.5">{match.reasons.join(' · ')}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sticky top-0">
                      <h3 className="font-semibold text-gray-800 mb-1">Pre-Approval Preview</h3>
                      <p className="text-xs text-gray-500 mb-4">Click a match card to select, then review before submitting.</p>
                      {!selectedMatch ? (
                        <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">Select a match card</div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
                            <div><span className="text-gray-400 text-xs">Employee</span><p className="font-medium text-gray-800">{selectedEmployee.name} <span className="text-gray-400 text-xs">({selectedEmployee.employee_id})</span></p></div>
                            <div><span className="text-gray-400 text-xs">Recommended PM</span><p className="font-medium text-gray-800">{selectedMatch.pm.name} <span className="text-gray-400 text-xs">({selectedMatch.pm.employee_id})</span></p></div>
                            <div className="flex items-center gap-2"><span className="text-gray-400 text-xs">Confidence</span><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[selectedMatch.confidence || 'High']}`}>{selectedMatch.confidence || 'High'}</span></div>
                            <div><span className="text-gray-400 text-xs">Score</span><p className="font-bold text-[#0070AD]">{selectedMatch.score.toFixed(0)} pts</p></div>
                          </div>
                          {selectedMatch.reasons?.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-green-700 mb-1">Why this PM</p>
                              <ul className="text-xs text-green-700 space-y-0.5">{selectedMatch.reasons.map((r: string, i: number) => <li key={i}>✓ {r}</li>)}</ul>
                            </div>
                          )}
                          {(selectedMatch.flags || []).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-500">Rule flags</p>
                              {(selectedMatch.flags || []).map((f: any, i: number) => (
                                <div key={i} className={`text-xs px-2 py-1.5 rounded border ${FLAG_COLORS[f.severity] || FLAG_COLORS.Minor}`}><span className="font-bold">{f.severity} [{f.code}]:</span> {f.message}</div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => handleAssign(selectedMatch.pm.employee_id, selectedMatch.score)}
                            className="btn-primary w-full"
                            style={selectedMatch.confidence === 'Low' ? { backgroundColor: '#d97706' } : {}}>
                            <UserPlus size={16} className="inline mr-1" />
                            {selectedMatch.confidence === 'Low' ? 'Send for Approval (Low confidence)' : 'Send for Approval'}
                          </button>
                          {selectedMatch.confidence === 'Low' && <p className="text-xs text-orange-600 text-center">Low-confidence match — reviewer should verify flags before approving.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
              {flagSummary && (
                <p className="text-xs text-gray-500">
                  {pmMatches.length} PM{pmMatches.length !== 1 ? 's' : ''} found
                  {flagSummary.critical > 0 && <span className="text-red-600 font-semibold ml-1">· {flagSummary.critical} critical</span>}
                  {flagSummary.major > 0 && <span className="text-orange-600 font-semibold ml-1">· {flagSummary.major} major</span>}
                  {flagSummary.minor > 0 && <span className="text-yellow-600 ml-1">· {flagSummary.minor} minor</span>}
                </p>
              )}
              <button onClick={() => { setSelectedEmployee(null); setPmMatches([]); setFlagSummary(null); setDatasetScope(null); }} className="btn-secondary ml-auto">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Separations tab ──────────────────────────────────────────────────────────
const PERSON_TYPE_BADGE: Record<string, string> = {
  pm: 'bg-purple-100 text-purple-800', employee: 'bg-blue-100 text-blue-800', unknown: 'bg-gray-100 text-gray-600',
};
const SEP_TYPE_BADGE: Record<string, string> = {
  Resignation: 'bg-red-100 text-red-800', Retirement: 'bg-purple-100 text-purple-800',
  Termination: 'bg-orange-100 text-orange-800', 'Contract End': 'bg-yellow-100 text-yellow-800',
};
const GRADE_OPTIONS = ['A1','A2','A3','A4','B1','B2','C1','C2','D1','D2','E1','E2'];

function Separations() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [filters, setFilters] = useState({ status: '', grade: '', person_type: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: response, isLoading, refetch } = useGetSeparationsListQuery({
    ...filters, page, pageSize,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });
  const separations = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };
  const handleFilterChange = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };

  const exportToCSV = () => {
    if (!separations.length) return;
    const headers = ['ID','Name','Grade','Designation','Type','LWD','Reason','Status','Person Type'];
    const rows = separations.map((s: any) => [s.employee_id, `"${s.person_name || s.display_name || ''}"`, s.display_grade || s.grade || '', s.display_designation || s.designation || '', s.separation_type || '', s.lwd || '', s.reason || '', s.status || '', s.person_type || ''].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'separations.csv'; a.click();
  };

  const urgent = separations.filter((s: any) => {
    if (!s.lwd) return false;
    const days = differenceInDays(new Date(s.lwd), new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div><p className="text-sm font-semibold text-red-800">{urgent.length} separation{urgent.length > 1 ? 's' : ''} with LWD within 30 days</p>
            <p className="text-xs text-red-600 mt-0.5">These employees need immediate PM reassignment</p></div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option><option value="pending">Pending</option><option value="processed">Processed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
          <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Grades</option>{GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Person Type</label>
          <select value={filters.person_type} onChange={e => handleFilterChange('person_type', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option><option value="pm">PM</option><option value="employee">Employee</option><option value="unknown">Unknown</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"><Filter size={14} /> Refresh</button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0070AD' }}><Download size={14} /> Export</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserX size={18} className="text-red-500" />
          <h2 className="font-semibold text-gray-800">Separations</h2>
          <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{pagination.totalRecords}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={32} /></div>
        ) : separations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserX size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No separation records found</p>
            <p className="text-sm mt-1 flex items-center justify-center gap-1"><UploadCloud size={14} /> Upload a separation report to populate records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ID','Name','Grade','Designation','Type','LWD','Days Left','Reason','Status','Person Type'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {separations.map((sep: any) => {
                  const daysLeft = sep.lwd ? differenceInDays(new Date(sep.lwd), new Date()) : null;
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <tr key={sep.id} className={`border-b border-gray-100 transition-colors ${isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{sep.employee_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{sep.person_name || sep.display_name || '—'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{sep.display_grade || sep.grade || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sep.display_designation || sep.designation || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${SEP_TYPE_BADGE[sep.separation_type] || 'bg-gray-100 text-gray-600'}`}>{sep.separation_type || '—'}</span></td>
                      <td className="px-4 py-3 text-sm font-mono">{sep.lwd ? format(new Date(sep.lwd), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        {daysLeft !== null
                          ? <span className={`px-2 py-0.5 rounded text-xs font-semibold ${daysLeft < 0 ? 'bg-gray-100 text-gray-500' : daysLeft <= 7 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {daysLeft < 0 ? 'Past' : `${daysLeft}d`}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{sep.reason || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${sep.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{sep.status}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PERSON_TYPE_BADGE[sep.person_type] || PERSON_TYPE_BADGE.unknown}`}>{sep.person_type}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalRecords > 0 && (
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalRecords={pagination.totalRecords}
            pageSize={pagination.pageSize}
            onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TAB_TITLES: Record<TabId, { title: string }> = {
  employees:     { title: 'All Employees' },
  bench:         { title: 'Bench Resources' },
  'new-joiners': { title: 'New Joiners' },
  separations:   { title: 'Separations' },
};

export default function People({ defaultTab }: { defaultTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab || 'employees');
  const { title } = TAB_TITLES[activeTab];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      <TabBar tabs={TABS} active={activeTab} onChange={t => setActiveTab(t as any)} />
      {activeTab === 'employees'    && <EmployeeTable />}
      {activeTab === 'bench'        && <EmployeeTable benchOnly />}
      {activeTab === 'new-joiners'  && <NewJoiners />}
      {activeTab === 'separations'  && <Separations />}
    </div>
  );
}
