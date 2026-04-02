import TabBar from '../components/TabBar';
import { useState } from 'react';
import { useGetEmployeesListQuery, useGetNewJoinersListQuery, useFindPMForEmployeeMutation, useAssignPMMutation, useGetSeparationsListQuery } from '../services/pmApi';
import { Users, Search, Filter, Download, Loader2, AlertCircle, UserPlus, Award, CheckCircle2, UserX, AlertTriangle, UploadCloud } from 'lucide-react';
import Pagination from '../components/Pagination';
import Table from '../components/Table';
import { format, differenceInDays } from 'date-fns';

type TabId = 'employees' | 'bench' | 'new-joiners' | 'separations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'employees', label: 'All Employees' },
  { id: 'bench', label: 'Bench Resources' },
  { id: 'new-joiners', label: 'New Joiners' },
  { id: 'separations', label: 'Separations' },
];


// ─── Shared EmployeeTable (used by both All Employees and Bench tabs) ─────────
function EmployeeTable({ benchOnly = false }: { benchOnly?: boolean }) {
  const [filters, setFilters] = useState({
    status: 'active', practice: '', cu: '', region: '', grade: '', skill: '',
  });
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: response, isLoading, refetch } = useGetEmployeesListQuery({
    ...filters, page, pageSize,
  });

  // Apply client-side filters + optional bench filter
  const employees = (response?.data || []).filter((emp: any) => {
    if (benchOnly && emp.current_pm_id) return false;
    if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
    if (filters.skill && emp.primary_skill &&
        !emp.primary_skill.toLowerCase().includes(filters.skill.toLowerCase())) return false;
    return true;
  });

  const pagination = response?.pagination || {
    page: 1, pageSize: 50, totalRecords: 0, totalPages: 1,
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const exportToCSV = () => {
    if (!employees.length) return;
    const headers = benchOnly
      ? ['ID','Name','Grade','Practice','CU','Region','Skill','Bench Status']
      : ['ID','Name','Grade','Practice','CU','Region','Account','Skill','Status','PM'];
    const rows = employees.map((e: any) =>
      benchOnly
        ? [e.employee_id,`"${e.name}"`,e.grade,e.practice,e.cu,e.region,e.skill||'',e.bench_status||''].join(',')
        : [e.employee_id,`"${e.name}"`,e.grade,e.practice,e.cu,e.region,e.account||'',e.skill||'',e.status||'active',e.current_pm_id?'Assigned':'Unassigned'].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = benchOnly ? 'bench_resources.csv' : 'employees.csv';
    a.click();
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
        {[['practice','Practice'],['cu','CU'],['region','Region'],['grade','Grade']].map(([key, label]) => (
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
        <div className="flex gap-2 ml-auto">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Filter size={14} /> Refresh
          </button>
          <button onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 text-white rounded-lg text-sm"
            style={{ backgroundColor: '#0070AD' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-end">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            benchOnly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {benchOnly ? `${employees.length} records` : `${pagination.totalRecords.toLocaleString()} records`}
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
                  {(benchOnly
                    ? ['ID','Name','Grade','Practice','CU','Region','Skill','Bench Status']
                    : ['ID','Name','Grade','Practice','CU','Region','Account','Skill','Status','PM']
                  ).map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.employee_id}
                    className={`border-b border-gray-100 transition-colors ${benchOnly ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{emp.employee_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{emp.practice}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{emp.cu}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{emp.region}</td>
                    {!benchOnly && (
                      <td className="px-4 py-3 text-gray-500 text-xs">{emp.account || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-gray-500 text-xs">{emp.skill || emp.primary_skill || '—'}</td>
                    {benchOnly ? (
                      <td className="px-4 py-3">
                        {emp.bench_status
                          ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{emp.bench_status}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{emp.status || 'active'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {emp.current_pm_id
                            ? <span className="text-green-600 font-medium">Assigned</span>
                            : <span className="text-orange-500">Unassigned</span>}
                        </td>
                      </>
                    )}
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

// ─── helpers for rule-flow flags ─────────────────────────────────────────────
// ─── helpers for rule-flow flags ─────────────────────────────────────────────
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
  Path1_Perfect:           { label: 'Path 1 — Perfect match',           color: 'bg-green-100 text-green-800' },
  Path2_SkillFallback:     { label: 'Path 2 — Skill fallback',           color: 'bg-green-100 text-green-700' },
  Path3_DiffAccount:       { label: 'Path 3 — Diff account',             color: 'bg-yellow-100 text-yellow-800' },
  Path4_RegionFallback:    { label: 'Path 4 — Region fallback',          color: 'bg-yellow-100 text-yellow-800' },
  Path5_RegionAccount:     { label: 'Path 5 — Region + account diff',    color: 'bg-orange-100 text-orange-800' },
  Path6_CrossBU:           { label: 'Path 6 — Cross-BU fallback',        color: 'bg-red-100 text-red-700' },
  Path7_CrossBUExactSkill: { label: 'Path 7 — Cross-BU, exact skill',    color: 'bg-red-100 text-red-700' },
  PathF_ForcedAssignment:  { label: '⚠ Forced — Resignation Override',    color: 'bg-purple-100 text-purple-800' },
};

// ─── New Joiners tab ─────────────────────────────────────────────────────────
function NewJoiners() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: response, isLoading } = useGetNewJoinersListQuery({ page, pageSize });
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
      setPmMatches(result.matches || []);
      setFlagSummary(result.flag_summary || null);
      setDatasetScope(result.dataset_scope || null);
      setSelectedMatch(null);
    }
    catch (error) { console.error('Error finding PM:', error); }
    finally { setSearching(false); }
  };

  const handleAssign = async (pmId: string, score: number) => {
    try {
      await assignPM({ employee_id: selectedEmployee.employee_id, new_pm_id: pmId, assignment_type: 'new_joiner', match_score: score }).unwrap();
      alert('Recommendation sent for approval.');
      setSelectedEmployee(null); setPmMatches([]); setSelectedMatch(null);
    } catch (error: any) { alert('Assignment failed: ' + error.message); }
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
            pageSize={pagination.pageSize} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>

      {/* PM Matches Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="text-white p-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">PM Recommendations</h2>
                  <p className="text-white/80 text-sm mt-0.5">
                    {selectedEmployee.name} &middot; {selectedEmployee.employee_id} &middot; {selectedEmployee.practice} &middot; {selectedEmployee.cu}
                  </p>
                </div>
                {flagSummary && (
                  <div className="flex gap-2 text-xs flex-shrink-0 ml-4">
                    {flagSummary.critical > 0 && (
                      <span className="px-2 py-1 bg-red-500/80 text-white rounded-full font-semibold">{flagSummary.critical} Critical</span>
                    )}
                    {flagSummary.major > 0 && (
                      <span className="px-2 py-1 bg-orange-400/80 text-white rounded-full font-semibold">{flagSummary.major} Major</span>
                    )}
                    {flagSummary.minor > 0 && (
                      <span className="px-2 py-1 bg-yellow-400/80 text-white rounded-full font-semibold">{flagSummary.minor} Minor</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 0: Dataset scope warning */}
            {datasetScope && !datasetScope.is_scoped && (
              <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2">
                <span className="text-red-500 font-bold text-xs mt-0.5">CRITICAL</span>
                <div>
                  <p className="text-xs font-semibold text-red-800">Dataset is not practice-scoped</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {datasetScope.practices_found?.length} practices found: {(datasetScope.practices_found || []).join(', ')}.
                    Rows with mismatched PM practice are marked Unmappable.
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5">
              {searching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
                </div>
              ) : pmMatches.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-3xl mb-3">&#128269;</p>
                  <p className="font-medium">No suitable PMs found</p>
                  <p className="text-sm mt-1 text-gray-400">No active PMs in practice &quot;{selectedEmployee.practice}&quot; with available capacity and eligible grade.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                  {/* Match cards */}
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
                          className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 shadow-lg bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'}`}
                          onClick={() => setSelectedMatch(match)}>

                          {/* Forced Assignment banner */}
                          {match.forcedAssignment && (
                            <div className="mb-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center gap-2 text-xs text-purple-800 font-semibold">
                              <span>⚠</span>
                              <span>FORCED ASSIGNMENT — PM Resignation Override. All constraints relaxed. Manual review recommended.</span>
                            </div>
                          )}

                          {/* Top row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{match.pm.name}</h3>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{match.pm.grade}</span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[confidence] || 'bg-gray-100 text-gray-700'}`}>
                                {confidence} confidence
                              </span>
                              {tier !== 'exact' && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                                  {TIER_LABELS[tier] || tier}
                                </span>
                              )}
                              {match.path && PATH_LABELS[match.path] && (
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PATH_LABELS[match.path].color}`}>
                                  {PATH_LABELS[match.path].label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <span className="text-base font-bold text-[#0070AD]">{match.score.toFixed(0)}</span>
                              <span className="text-xs text-gray-400">pts</span>
                              {isSelected && <CheckCircle2 size={16} className="text-blue-500 ml-1" />}
                            </div>
                          </div>

                          {/* PM detail grid */}
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

                          {/* Rule-flow flags */}
                          {(critFlags.length > 0 || majorFlags.length > 0 || minorFlags.length > 0) && (
                            <div className="space-y-1 mt-2">
                              {critFlags.map((f: any, i: number) => (
                                <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Critical}`}>
                                  <span className="font-bold mr-1">Critical [{f.code}]:</span>{f.message}
                                </div>
                              ))}
                              {majorFlags.map((f: any, i: number) => (
                                <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Major}`}>
                                  <span className="font-bold mr-1">Major [{f.code}]:</span>{f.message}
                                </div>
                              ))}
                              {minorFlags.map((f: any, i: number) => (
                                <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Minor}`}>
                                  <span className="font-bold mr-1">Minor [{f.code}]:</span>{f.message}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Match reasons */}
                          {match.reasons?.length > 0 && (
                            <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2.5 py-1.5">
                              {match.reasons.join(' · ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Pre-approval preview */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sticky top-0">
                      <h3 className="font-semibold text-gray-800 mb-1">Pre-Approval Preview</h3>
                      <p className="text-xs text-gray-500 mb-4">Click a match card to select, then review before submitting.</p>

                      {!selectedMatch ? (
                        <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                          Select a match card
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
                            <div>
                              <span className="text-gray-400 text-xs">Employee</span>
                              <p className="font-medium text-gray-800">{selectedEmployee.name} <span className="text-gray-400 text-xs">({selectedEmployee.employee_id})</span></p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Recommended PM</span>
                              <p className="font-medium text-gray-800">{selectedMatch.pm.name} <span className="text-gray-400 text-xs">({selectedMatch.pm.employee_id})</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">Confidence</span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[selectedMatch.confidence || 'High']}`}>
                                {selectedMatch.confidence || 'High'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Score</span>
                              <p className="font-bold text-[#0070AD]">{selectedMatch.score.toFixed(0)} pts</p>
                            </div>
                          </div>

                          {selectedMatch.reasons?.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-green-700 mb-1">Why this PM</p>
                              <ul className="text-xs text-green-700 space-y-0.5">
                                {selectedMatch.reasons.map((r: string, i: number) => <li key={i}>&#10003; {r}</li>)}
                              </ul>
                            </div>
                          )}

                          {(selectedMatch.flags || []).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-gray-500">Rule flags</p>
                              {(selectedMatch.flags || []).map((f: any, i: number) => (
                                <div key={i} className={`text-xs px-2 py-1.5 rounded border ${FLAG_COLORS[f.severity] || FLAG_COLORS.Minor}`}>
                                  <span className="font-bold">{f.severity} [{f.code}]:</span> {f.message}
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleAssign(selectedMatch.pm.employee_id, selectedMatch.score)}
                            className="btn-primary w-full"
                            style={selectedMatch.confidence === 'Low' ? { backgroundColor: '#d97706' } : {}}
                          >
                            <UserPlus size={16} className="inline mr-1" />
                            {selectedMatch.confidence === 'Low' ? 'Send for Approval (Low confidence)' : 'Send for Approval'}
                          </button>

                          {selectedMatch.confidence === 'Low' && (
                            <p className="text-xs text-orange-600 text-center">
                              Low-confidence match — reviewer should verify flags before approving.
                            </p>
                          )}
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
                  {flagSummary.critical > 0 && <span className="text-red-600 font-semibold ml-1">&middot; {flagSummary.critical} critical</span>}
                  {flagSummary.major > 0 && <span className="text-orange-600 font-semibold ml-1">&middot; {flagSummary.major} major</span>}
                  {flagSummary.minor > 0 && <span className="text-yellow-600 ml-1">&middot; {flagSummary.minor} minor</span>}
                </p>
              )}
              <button
                onClick={() => { setSelectedEmployee(null); setPmMatches([]); setFlagSummary(null); setDatasetScope(null); }}
                className="btn-secondary ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Separations tab ─────────────────────────────────────────────────────────
const PERSON_TYPE_BADGE: Record<string, string> = {
  pm: 'bg-purple-100 text-purple-800',
  employee: 'bg-blue-100 text-blue-800',
  unknown: 'bg-gray-100 text-gray-600',
};
const SEP_TYPE_BADGE: Record<string, string> = {
  Resignation: 'bg-red-100 text-red-800',
  Retirement: 'bg-purple-100 text-purple-800',
  Termination: 'bg-orange-100 text-orange-800',
  'Contract End': 'bg-yellow-100 text-yellow-800',
};
const GRADE_OPTIONS = ['A1','A2','A3','A4','B1','B2','C1','C2','D1','D2','E1','E2'];

function Separations() {
  const [filters, setFilters] = useState({ status: '', grade: '', person_type: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: response, isLoading, refetch } = useGetSeparationsListQuery({ ...filters, page, pageSize });

  const separations = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };
  const handleFilterChange = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };

  const exportToCSV = () => {
    if (!separations.length) return;
    const headers = ['ID','Name','Grade','Designation','Type','LWD','Reason','Status','Person Type'];
    const rows = separations.map((s: any) => [s.employee_id, `"${s.person_name || ''}"`, s.grade || '', s.designation || '', s.separation_type || '', s.lwd || '', s.reason || '', s.status || '', s.person_type || ''].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'separations.csv'; a.click();
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

      {/* Filters */}
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
                      <td className="px-4 py-3 font-medium text-gray-800">{sep.person_name || '—'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{sep.grade || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sep.designation || '—'}</td>
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
            pageSize={pagination.pageSize} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TAB_TITLES: Record<TabId, { title: string; sub: string }> = {
  employees: { title: 'All Employees', sub: 'Browse and filter all employee records' },
  bench: { title: 'Bench Resources', sub: 'Employees without a People Manager assigned' },
  'new-joiners': { title: 'New Joiners', sub: 'Assign People Managers to new employees' },
  separations: { title: 'Separations', sub: 'Track employee separations and LWD timelines' },
};

export default function People({ defaultTab }: { defaultTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab || 'employees');
  const { title } = TAB_TITLES[activeTab];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      </div>
      <TabBar tabs={TABS} active={activeTab} onChange={t => setActiveTab(t as any)} />
      {activeTab === 'employees' && <EmployeeTable />}
      {activeTab === 'bench' && <EmployeeTable benchOnly />}
      {activeTab === 'new-joiners' && <NewJoiners />}
      {activeTab === 'separations' && <Separations />}
    </div>
  );
}
