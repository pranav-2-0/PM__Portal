import { Users, Filter, Loader2, AlertCircle, Download, ChevronDown, ChevronUp, BarChart2, RefreshCcw, Trash2, Pencil, Check, X } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import { SkillGroupExport } from './SkillGroupExport';
import { useViewModeOptimization } from '../hooks/useViewModeOptimization';
import {
  useGetEmployeesListQuery,
  useGetPracticeFiltersQuery,
  useGetFilteredEmployeesForSkillUpdateQuery,
  useBulkUpdateEmployeeSkillsMutation,
  useRemoveEmployeeSkillMutation,
  useUpdateSingleEmployeeSkillMutation,
} from '../../../services/pmApi';
import { useState, useEffect, useRef, useMemo } from 'react';

export interface EmployeeTableProps {
  benchOnly?: boolean;
}

// Column picker configuration
type ColKey = 'employee_id'|'name'|'grade'|'practice'|'cu'|'region'|'account'|'skill'|'primary_skill'|'email'|'status'|'current_pm_id'|'joining_date'|'is_new_joiner'|'is_frozen'|'sub_practice'|'location'|'bench_status'|'hire_reason'|'leave_type'|'leave_start_date'|'leave_end_date'|'pm_name'|'pm_email'|'pm_grade'|'pm_practice'|'pm_cu'|'pm_region'|'pm_account'|'pm_skill'|'pm_sub_practice'|'pm_location'|'pm_reportee_count'|'pm_max_capacity'|'pm_leave_type'|'pm_leave_start_date'|'pm_leave_end_date'|'pm_is_active';
interface ColDef { key: ColKey; label: string; always?: boolean; }

export function EmployeeTable({ benchOnly = false }: EmployeeTableProps) {
  const ALL_COLUMNS: ColDef[] = [
    { key: 'employee_id',     label: 'ID',               always: true },
    { key: 'name',            label: 'Name',             always: true },
    { key: 'grade',           label: 'Grade' },
    { key: 'practice',        label: 'Practice' },
    { key: 'cu',              label: 'NEW BU' },
    { key: 'region',          label: 'Region' },
    { key: 'account',         label: 'Account' },
    { key: 'skill',           label: 'Skill' },
    { key: 'primary_skill',   label: 'Primary Skill' },
    { key: 'email',           label: 'Email' },
    { key: 'status',          label: 'Status' },
    { key: 'current_pm_id',   label: 'PM Assignment' },
    { key: 'joining_date',    label: 'Joining Date' },
    { key: 'is_new_joiner',   label: 'New Joiner' },
    { key: 'is_frozen',       label: 'Frozen' },
    { key: 'sub_practice',    label: 'Sub Practice' },
    { key: 'location',        label: 'Location' },
    { key: 'bench_status',    label: 'Bench Status' },
    { key: 'hire_reason',     label: 'Hire Reason' },
    { key: 'leave_type',      label: 'Leave Type' },
    { key: 'leave_start_date',label: 'Leave Start' },
    { key: 'leave_end_date',  label: 'Leave End' },
    // People Manager fields
    { key: 'pm_name',             label: 'PM Name' },
    { key: 'pm_email',            label: 'PM Email' },
    { key: 'pm_grade',            label: 'PM Grade' },
    { key: 'pm_practice',         label: 'PM Practice' },
    { key: 'pm_cu',               label: 'PM NEW BU' },
    { key: 'pm_region',           label: 'PM Region' },
    { key: 'pm_account',          label: 'PM Account' },
    { key: 'pm_skill',            label: 'PM Skill' },
    { key: 'pm_sub_practice',     label: 'PM Sub Practice' },
    { key: 'pm_location',         label: 'PM Location' },
    { key: 'pm_reportee_count',   label: 'PM Reportee Count' },
    { key: 'pm_max_capacity',     label: 'PM Max Capacity' },
  ];

  const DEFAULT_COLS_ALL:   ColKey[] = ['employee_id','name','grade','practice','cu','region','account','skill','status','current_pm_id'];
  const DEFAULT_COLS_BENCH: ColKey[] = ['employee_id','name','grade','practice','cu','region','skill','bench_status'];
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState({
    status: 'active',
    practice: '',
    cu: '',
    region: '',
    grade: '',
    skill: '',
  });
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_COLS_ALL);
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Optimized view mode switching with debouncing to prevent hanging
  const { viewMode, isTransitioning, forceViewModeChange } = useViewModeOptimization({
    debounceMs: 300,
  });

  // Skill selection for skill-wise view
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Skill Management State
  const [updateSkill, setUpdateSkill] = useState('');
  const [updateFilters, setUpdateFilters] = useState({ practice: '', cu: '', region: '', grade: '' });
  const [removeFilters, setRemoveFilters] = useState({ skill: '', practice: '', cu: '', region: '', grade: '' });
  const [skillMsg, setSkillMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [rowsPerSkillGroup, setRowsPerSkillGroup] = useState<number | 'all'>(10);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingSkillValue, setEditingSkillValue] = useState('');

  const { data: response, isLoading } = useGetEmployeesListQuery({
    ...filters,
    page,
    pageSize,
  });

  const { data: filterOpts } = useGetPracticeFiltersQuery();

  // Pre-fetch full dataset in background for skill-wise and update-skills views ONLY when user switches to those views
  // This prevents unnecessary data fetching on initial load
  const { data: bulkResponse, isLoading: bulkLoading, refetch: refetchBulk } = useGetEmployeesListQuery(
    {
      ...filters,
      page: 1,
      pageSize: 10000,
    },
    { skip: viewMode === 'list' } // Only fetch when in skill or update-skills view mode
  );

  // Use the right dataset based on view mode
  const activeResponse = viewMode === 'skill' || viewMode === 'update-skills' ? bulkResponse : response;

  // Skill management mutations
  const [doBulkUpdate, { isLoading: updatingSkill }] = useBulkUpdateEmployeeSkillsMutation();
  const [doRemoveSkill, { isLoading: removingSkill }] = useRemoveEmployeeSkillMutation();
  const [updateSingleSkill, { isLoading: savingSkill }] = useUpdateSingleEmployeeSkillMutation();

  // Preview data - only fetch when in update-skills view
  const hasFilters = updateFilters.practice || updateFilters.cu || updateFilters.region || updateFilters.grade;
  const { data: filteredPreview, isFetching: previewLoading, refetch: refetchFilteredPreview } = useGetFilteredEmployeesForSkillUpdateQuery(
    updateFilters,
    { skip: !hasFilters || viewMode !== 'update-skills' } // Only fetch when in update-skills view and has filters
  );
  const hasRemoveFilters = removeFilters.skill || removeFilters.practice || removeFilters.cu || removeFilters.region || removeFilters.grade;
  const { refetch: refetchRemovePreview } = useGetFilteredEmployeesForSkillUpdateQuery(
    { practice: removeFilters.practice, cu: removeFilters.cu, region: removeFilters.region, grade: removeFilters.grade },
    { skip: !hasRemoveFilters || viewMode !== 'update-skills' } // Only fetch when in update-skills view and has filters
  );

  // Sync visible columns when benchOnly changes
  useEffect(() => {
    setVisibleCols(benchOnly ? DEFAULT_COLS_BENCH : DEFAULT_COLS_ALL);
  }, [benchOnly]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const resetCols = () => setVisibleCols(benchOnly ? DEFAULT_COLS_BENCH : DEFAULT_COLS_ALL);

  // CSV export ΓÇô only exports visible columns
  const exportToCSV = () => {
    if (!employees.length) return;
    const activeCols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
    const headers = activeCols.map(c => c.label);
    const rows = employees.map((emp: any) =>
      activeCols.map(c => {
        const v = emp[c.key];
        if (c.key === 'current_pm_id') return v ? 'Assigned' : 'Unassigned';
        if (c.key === 'is_new_joiner' || c.key === 'is_frozen' || c.key === 'pm_is_active') return v ? 'Yes' : 'No';
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = benchOnly ? 'bench_resources.csv' : 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const employees = (activeResponse?.data || []).filter((emp: any) => {
    if (benchOnly && emp.current_pm_id) return false;
    return true;
  });

  const pagination = activeResponse?.pagination || {
    page: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 1,
  };

  // Show spinner only when the relevant dataset is loading
  const viewIsLoading = viewMode === 'skill' || viewMode === 'update-skills' ? bulkLoading : isLoading;

  // Compute employees grouped by skill (for skill-wise view)
  const employeesBySkill = useMemo(() => {
    const grouped = employees.reduce((acc: Record<string, any[]>, emp: any) => {
      const rawSkill = (emp.skill || emp.primary_skill || 'Unspecified').trim() || 'Unspecified';
      const cleanedSkill = rawSkill
        .replace(/\[\s*\d+\s*\]/g, '')
        .replace(/\(\s*\d+\s*\)/g, '')
        .replace(/^\s*\d{3,}\s*[-:]?\s*/g, '')
        .replace(/\s+\d{3,}\s*$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedSkill = (cleanedSkill || 'Unspecified')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (!acc[normalizedSkill]) acc[normalizedSkill] = [];
      acc[normalizedSkill].push(emp);
      return acc;
    }, {});

    // Filter by skill search
    let skills = Object.entries(grouped)
      .filter(([s]) => s.toLowerCase().includes(skillSearchQuery.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([skill, rows]) => ({ skill, rows }));

    return skills;
  }, [employees, skillSearchQuery]);

  // Get unique skills for tabs
  const uniqueSkills = useMemo(() => {
    return employeesBySkill.map(({ skill }) => skill).sort();
  }, [employeesBySkill]);

  // Auto-select first skill if none selected
  useEffect(() => {
    if (viewMode === 'skill' && uniqueSkills.length > 0 && !selectedSkill) {
      setSelectedSkill(uniqueSkills[0]);
    }
  }, [viewMode, uniqueSkills, selectedSkill]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Handle bulk skill update
  const handleBulkUpdate = async () => {
    if (!updateSkill.trim()) {
      setSkillMsg({ type: 'error', text: 'Please enter a skill to update.' });
      return;
    }
    try {
      const newSkill = updateSkill.trim();
      const result = await doBulkUpdate({ skill: newSkill, ...updateFilters }).unwrap();
      if (!result?.updatedCount) {
        setSkillMsg({ type: 'error', text: 'No employees matched the selected filters. Nothing was updated.' });
        return;
      }

      setSkillMsg({ type: 'success', text: `Skill updated for ${result.updatedCount} employee${result.updatedCount === 1 ? '' : 's'}.` });

      if (hasFilters) {
        try { await refetchFilteredPreview(); } catch {}
      }
      if (hasRemoveFilters) {
        try { await refetchRemovePreview(); } catch {}
      }

      try { await refetchBulk(); } catch {}

      setUpdateSkill('');
      setUpdateFilters({ practice: '', cu: '', region: '', grade: '' });
      setPage(1);
      forceViewModeChange('skill');
      setSkillSearchQuery(newSkill);
      setFilters({
        status: 'active',
        practice: '',
        cu: '',
        region: '',
        grade: '',
        skill: '',
      });
    } catch (err: any) {
      setSkillMsg({ type: 'error', text: 'Update failed: ' + (err?.data?.message || err.message || 'Unknown error') });
    }
  };

  // Handle skill removal (revert to primary skill)
  const handleRemoveSkill = async () => {
    try {
      const result = await doRemoveSkill(removeFilters).unwrap();
      if (!result?.updatedCount) {
        setSkillMsg({ type: 'error', text: 'No employees matched the selected filters. Nothing was reverted.' });
        return;
      }

      setSkillMsg({ type: 'success', text: `Skill reverted to primary skill for ${result.updatedCount} employee${result.updatedCount === 1 ? '' : 's'}.` });

      if (hasFilters) {
        try { await refetchFilteredPreview(); } catch {}
      }
      if (hasRemoveFilters) {
        try { await refetchRemovePreview(); } catch {}
      }

      setRemoveFilters({ skill: '', practice: '', cu: '', region: '', grade: '' });
      try { await refetchBulk(); } catch {}
    } catch (err: any) {
      setSkillMsg({ type: 'error', text: 'Removal failed: ' + (err?.data?.message || err.message || 'Unknown error') });
    }
  };

  // Handle individual skill edit
  const handleSaveSkill = async (employeeId: string) => {
    if (!editingSkillValue.trim()) {
      setEditingSkillId(null);
      return;
    }
    try {
      await updateSingleSkill({ employeeId: employeeId, skill: editingSkillValue.trim() }).unwrap();
      setEditingSkillId(null);
      try { await refetchBulk(); } catch {}
    } catch (err: any) {
      setSkillMsg({ type: 'error', text: 'Failed to update skill: ' + (err?.data?.message || err.message || 'Unknown error') });
    }
  };

  const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="space-y-4">
      {/* Bench summary cards */}
      {benchOnly && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bench</p>
            <p className="text-3xl font-bold text-orange-600">{employees.length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {!benchOnly && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className={selectCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
          <select
            value={filters.practice}
            onChange={e => handleFilterChange('practice', e.target.value)}
            className={`${selectCls} min-w-[130px]`}
          >
            <option value="">All Practices</option>
            {(filterOpts?.practices || []).map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 ml-auto items-center flex-wrap">
          {/* View Mode Toggle Group (List / Skill-wise / Update Skills) */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white">
            <button
              onClick={() => forceViewModeChange('list')}
              disabled={isTransitioning || viewIsLoading}
              className={`px-4 py-2 text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
              title={isTransitioning ? 'Loading data...' : 'Switch to list view'}
            >
              {isTransitioning && viewMode === 'list' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Users size={14} />
              )}
              <span>List</span>
            </button>
            <div className="w-px bg-gray-300" />
            <button
              onClick={() => forceViewModeChange('skill')}
              disabled={isTransitioning || viewIsLoading}
              className={`px-4 py-2 text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'skill'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
              title={isTransitioning ? 'Loading data...' : 'Switch to skill-wise grouping'}
            >
              {isTransitioning && viewMode === 'skill' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <BarChart2 size={14} />
              )}
              <span>Skill-wise</span>
            </button>
            <div className="w-px bg-gray-300" />
            <button
              onClick={() => forceViewModeChange('update-skills')}
              disabled={isTransitioning || viewIsLoading}
              className={`px-4 py-2 text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                viewMode === 'update-skills'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
              title={isTransitioning ? 'Loading data...' : 'Switch to update skills view'}
            >
              {isTransitioning && viewMode === 'update-skills' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              <span>Update Skills</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-4" />

          <button
            onClick={exportToCSV}
            disabled={employees.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Export visible columns to CSV"
          >
            <Download size={14} />
            Export CSV
          </button>

          {/* Column Picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border font-medium transition-colors ${
                showColPicker ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Choose columns"
            >
              <Filter size={14} />
              Columns
              {showColPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-64 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Visible Columns</span>
                  <button
                    onClick={resetCols}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    Reset
                  </button>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {/* Employee section header with Check All toggle */}
                  {(() => {
                    const empCols = ALL_COLUMNS.filter(c => !c.key.startsWith('pm_'));
                    const toggleableCols = empCols.filter(c => !c.always);
                    const allEmpChecked = toggleableCols.every(c => visibleCols.includes(c.key));
                    const toggleAllEmp = () => {
                      if (allEmpChecked) {
                        setVisibleCols(prev => prev.filter(k => !toggleableCols.map(c => c.key).includes(k)));
                      } else {
                        setVisibleCols(prev => [...new Set([...prev, ...toggleableCols.map(c => c.key)])]);
                      }
                    };
                    return (
                      <div className="mb-2 pb-2 border-b border-gray-200">
                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer font-semibold text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={allEmpChecked}
                            onChange={toggleAllEmp}
                            className="rounded"
                          />
                          Employee Fields ({toggleableCols.filter(c => visibleCols.includes(c.key)).length}/{toggleableCols.length})
                        </label>
                      </div>
                    );
                  })()}
                  {ALL_COLUMNS.filter(c => !c.key.startsWith('pm_')).map(col => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        visibleCols.includes(col.key) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        onChange={() => toggleCol(col.key)}
                        disabled={col.always}
                        className="rounded"
                      />
                      <span className={`text-xs ${col.always ? 'text-gray-500 font-medium' : 'text-gray-700'}`}>
                        {col.label}
                        {col.always && ' (always)'}
                      </span>
                    </label>
                  ))}

                  {/* People Manager section header with Check All toggle */}
                  {(() => {
                    const pmCols = ALL_COLUMNS.filter(c => c.key.startsWith('pm_'));
                    const allPmChecked = pmCols.every(c => visibleCols.includes(c.key));
                    const toggleAllPm = () => {
                      if (allPmChecked) {
                        setVisibleCols(prev => prev.filter(k => !pmCols.map(c => c.key).includes(k)));
                      } else {
                        setVisibleCols(prev => [...new Set([...prev, ...pmCols.map(c => c.key)])]);
                      }
                    };
                    return (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer font-semibold text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={allPmChecked}
                            onChange={toggleAllPm}
                            className="rounded"
                          />
                          PM Fields ({pmCols.filter(c => visibleCols.includes(c.key)).length}/{pmCols.length})
                        </label>
                      </div>
                    );
                  })()}
                  {ALL_COLUMNS.filter(c => c.key.startsWith('pm_')).map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                  {visibleCols.length} of {ALL_COLUMNS.length} columns shown
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{visibleCols.length} columns shown</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              benchOnly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {benchOnly ? `${employees.length} records` : `${pagination.totalRecords.toLocaleString()} records`}
          </span>
        </div>

        {viewIsLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={32} />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {benchOnly ? (
              <>
                <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
                <p>No bench resources</p>
                <p className="text-sm mt-1">All employees are assigned to a PM</p>
              </>
            ) : (
              <>
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>No employees found</p>
              </>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr
                    key={emp.employee_id}
                    className={`border-b border-gray-100 transition-colors ${
                      benchOnly ? 'hover:bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => {
                      const v = emp[col.key];
                      let content: any = '';

                      if (col.key === 'employee_id') {
                        content = <span className="text-gray-400 font-mono text-xs">{v}</span>;
                      } else if (col.key === 'grade') {
                        content = <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{v}</span>;
                      } else if (col.key === 'status') {
                        content = (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            v === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {v || 'active'}
                          </span>
                        );
                      } else if (col.key === 'current_pm_id') {
                        content = v ? <span className="text-green-600 font-medium text-xs">Assigned</span> : <span className="text-orange-500 text-xs">Unassigned</span>;
                      } else if (col.key === 'is_new_joiner' || col.key === 'is_frozen' || col.key === 'pm_is_active') {
                        content = <span className="text-xs">{v ? 'Yes' : 'No'}</span>;
                      } else if (col.key === 'skill') {
                        content = (
                          <div className="flex items-center gap-1 group">
                            {(emp.skill && emp.skill !== emp.primary_skill)
                              ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{emp.skill}</span>
                              : <span className="text-gray-300">—</span>}
                            <button
                              onClick={() => { setEditingSkillId(emp.employee_id); setEditingSkillValue(emp.skill || emp.primary_skill || ''); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                              title="Edit skill"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        );
                      } else {
                        content = <span className="text-gray-700 text-xs">{v || '—'}</span>;
                      }

                      return (
                        <td key={col.key} className="px-4 py-3">
                          {editingSkillId === emp.employee_id && col.key === 'skill' ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingSkillValue}
                                onChange={e => setEditingSkillValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveSkill(emp.employee_id); if (e.key === 'Escape') setEditingSkillId(null); }}
                                className="border border-blue-400 rounded px-2 py-0.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button onClick={() => handleSaveSkill(emp.employee_id)} disabled={savingSkill} className="text-green-600 hover:text-green-800">
                                {savingSkill ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              </button>
                              <button onClick={() => setEditingSkillId(null)} className="text-red-400 hover:text-red-600">
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'skill' ? (
          <div className="space-y-4 p-4">
            {/* Skill Tabs */}
            {uniqueSkills.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Select Skill</h3>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {uniqueSkills.map((skill) => {
                    const skillData = employeesBySkill.find(s => s.skill === skill);
                    const count = skillData?.rows.length || 0;
                    return (
                      <button
                        key={skill}
                        onClick={() => setSelectedSkill(skill)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedSkill === skill
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <BarChart2 size={14} />
                        {skill}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          selectedSkill === skill ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Skill Data */}
            {selectedSkill && (() => {
              const skillData = employeesBySkill.find(s => s.skill === selectedSkill);
              if (!skillData) return null;
              const { rows } = skillData;
              const visibleRows = rowsPerSkillGroup === 'all' ? rows : rows.slice(0, rowsPerSkillGroup);

              return (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 md:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-blue-600" />
                        <h3 className="font-semibold text-gray-800">{selectedSkill}</h3>
                        <span className="text-xs text-gray-500">({rows.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Show</span>
                        <select
                          value={rowsPerSkillGroup}
                          onChange={e => setRowsPerSkillGroup(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value="all">All</option>
                        </select>
                        <SkillGroupExport
                          skillName={selectedSkill}
                          rows={rows}
                          columns={ALL_COLUMNS.filter(c => visibleCols.includes(c.key))}
                          isLoading={viewIsLoading}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">ID</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Name</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Grade</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Practice</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Primary Skill</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Updated Skill</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">PM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((emp: any) => (
                            <tr key={`${selectedSkill}-${emp.employee_id}`} className="border-b border-gray-100 hover:bg-gray-50 last:border-b-0">
                              <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{emp.employee_id}</td>
                              <td className="px-4 py-2.5 font-medium text-gray-800">{emp.name}</td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.grade}</span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 text-xs">{emp.practice}</td>
                              <td className="px-4 py-2.5 text-xs">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{emp.primary_skill || '—'}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                {editingSkillId === emp.employee_id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      autoFocus
                                      value={editingSkillValue}
                                      onChange={e => setEditingSkillValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleSaveSkill(emp.employee_id); if (e.key === 'Escape') setEditingSkillId(null); }}
                                      className="border border-blue-400 rounded px-2 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button onClick={() => handleSaveSkill(emp.employee_id)} disabled={savingSkill} className="text-green-600 hover:text-green-800">
                                      {savingSkill ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    </button>
                                    <button onClick={() => setEditingSkillId(null)} className="text-red-400 hover:text-red-600">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 group">
                                    {emp.skill && emp.skill !== emp.primary_skill
                                      ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{emp.skill}</span>
                                      : <span className="text-gray-300">—</span>}
                                    <button
                                      onClick={() => { setEditingSkillId(emp.employee_id); setEditingSkillValue(emp.skill || emp.primary_skill || ''); }}
                                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                      title="Edit skill"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                {emp.current_pm_id ? <span className="text-green-600 font-medium">Assigned</span> : <span className="text-orange-500">Unassigned</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {rowsPerSkillGroup !== 'all' && rows.length > rowsPerSkillGroup && (
                      <p className="text-xs text-gray-400 text-right">
                        Showing {visibleRows.length} of {rows.length}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'update-skills' ? (
          <div className="space-y-4 p-4">
            {/* Update Skills Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCcw size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-gray-800">Update Skills</h3>
              </div>

              {skillMsg && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  skillMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {skillMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Update Skills Form */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <RefreshCcw size={14} className="text-blue-500" /> Update Skills
                  </h4>
                  <p className="text-xs text-gray-500">Set a new skill for employees. Each employee's primary skill is preserved.</p>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Skill *</label>
                    <input
                      value={updateSkill}
                      onChange={e => setUpdateSkill(e.target.value)}
                      placeholder="e.g. Python, Java, Cloud..."
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Practice (optional)</label>
                      <select value={updateFilters.practice} onChange={e => setUpdateFilters(f => ({ ...f, practice: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All Practices</option>
                        {(filterOpts?.practices || []).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Grade (optional)</label>
                      <select value={updateFilters.grade} onChange={e => setUpdateFilters(f => ({ ...f, grade: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All Grades</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">NEW BU (optional)</label>
                      <select value={updateFilters.cu} onChange={e => setUpdateFilters(f => ({ ...f, cu: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All NEW BUs</option>
                        {(filterOpts?.cus || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Region (optional)</label>
                      <select value={updateFilters.region} onChange={e => setUpdateFilters(f => ({ ...f, region: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All Regions</option>
                        {(filterOpts?.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleBulkUpdate}
                    disabled={updatingSkill || !updateSkill.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                    style={{ backgroundColor: '#0070AD' }}
                  >
                    {updatingSkill ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    {updatingSkill ? 'Updating...' : 'Update Skills'}
                  </button>

                  {/* Preview */}
                  {hasFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        {previewLoading
                          ? <><Loader2 size={12} className="animate-spin" /> Loading...</>
                          : <>{filteredPreview?.totalCount ?? 0} employee{(filteredPreview?.totalCount || 0) !== 1 ? 's' : ''} will be updated</>}
                      </p>
                    </div>
                  )}
                </div>

                {/* Remove Updated Skill Form */}
                <div className="bg-red-50 rounded-lg p-4 space-y-3 border border-red-100">
                  <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <Trash2 size={14} /> Remove Updated Skill
                  </h4>
                  <p className="text-xs text-gray-500">Revert the updated skill back to primary skill.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Skill to Remove (optional)</label>
                      <input
                        value={removeFilters.skill}
                        onChange={e => setRemoveFilters(f => ({ ...f, skill: e.target.value }))}
                        placeholder="Leave blank to revert all"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
                      <select value={removeFilters.practice} onChange={e => setRemoveFilters(f => ({ ...f, practice: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All Practices</option>
                        {(filterOpts?.practices || []).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                      <select value={removeFilters.grade} onChange={e => setRemoveFilters(f => ({ ...f, grade: e.target.value }))}
                        className={`${selectCls} w-full`}>
                        <option value="">All Grades</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleRemoveSkill}
                    disabled={removingSkill}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center hover:bg-red-700"
                  >
                    {removingSkill ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {removingSkill ? 'Reverting...' : 'Remove Updated Skill'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filtered Employees Data */}
            {hasFilters && filteredPreview && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-800">Filtered Employees ({filteredPreview.totalCount})</h4>
                  <p className="text-sm text-gray-600 mt-1">Employees matching the update filters above</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => (
                          <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreview.data?.map((emp: any) => (
                        <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-gray-50">
                          {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => {
                            const v = emp[col.key];
                            let content: any = '';

                            if (col.key === 'employee_id') {
                              content = <span className="text-gray-400 font-mono text-xs">{v}</span>;
                            } else if (col.key === 'grade') {
                              content = <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{v}</span>;
                            } else if (col.key === 'status') {
                              content = (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  v === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {v || 'active'}
                                </span>
                              );
                            } else if (col.key === 'current_pm_id') {
                              content = v ? <span className="text-green-600 font-medium text-xs">Assigned</span> : <span className="text-orange-500 text-xs">Unassigned</span>;
                            } else if (col.key === 'is_new_joiner' || col.key === 'is_frozen' || col.key === 'pm_is_active') {
                              content = <span className="text-xs">{v ? 'Yes' : 'No'}</span>;
                            } else {
                              content = <span className="text-gray-700 text-xs">{v || '—'}</span>;
                            }

                            return (
                              <td key={col.key} className="px-4 py-3">
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {viewMode === 'list' && pagination.totalRecords > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalRecords={pagination.totalRecords}
            pageSize={pagination.pageSize}
            onPageChange={p => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onPageSizeChange={s => {
              setPageSize(s);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
