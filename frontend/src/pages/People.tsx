// import TabBar from '../components/TabBar';
// import { useState } from 'react';
// import { useGetEmployeesListQuery, useGetNewJoinersListQuery, useFindPMForEmployeeMutation, useAssignPMMutation, useGetSeparationsListQuery } from '../services/pmApi';
// import { useAuth } from '../context/AuthContext';
// import { Users, Search, Filter, Download, Loader2, AlertCircle, UserPlus, CheckCircle2, UserX, AlertTriangle, UploadCloud } from 'lucide-react';
// import Pagination from '../components/Pagination';
// import Table from '../components/Table';
// import { format, differenceInDays } from 'date-fns';

// type TabId = 'employees' | 'bench' | 'new-joiners' | 'separations';

// const TABS: { id: TabId; label: string }[] = [
//   { id: 'employees', label: 'All Employees' },
//   { id: 'bench', label: 'Bench Resources' },
//   { id: 'new-joiners', label: 'New Joiners' },
//   { id: 'separations', label: 'Separations' },
// ];


// // ─── Shared EmployeeTable (used by both All Employees and Bench tabs) ─────────
// function EmployeeTable({ benchOnly = false }: { benchOnly?: boolean }) {
//   const { user, selectedDepartment } = useAuth();
//   const isSuperAdmin = user?.role === 'Super Admin';
  
//   const [filters, setFilters] = useState({
//     status: 'active', practice: '', cu: '', region: '', grade: '', skill: '',
//   });
//   const [page, setPage]       = useState(1);
//   const [pageSize, setPageSize] = useState(50);

//   const { data: response, isLoading, refetch } = useGetEmployeesListQuery({
//     ...filters, page, pageSize,
//     ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
//   });

//   // Apply client-side filters + optional bench filter
//   const employees = (response?.data || []).filter((emp: any) => {
//     if (benchOnly && emp.current_pm_id) return false;
//     if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
//     if (filters.skill && emp.primary_skill &&
//         !emp.primary_skill.toLowerCase().includes(filters.skill.toLowerCase())) return false;
//     return true;
//   });

//   const pagination = response?.pagination || {
//     page: 1, pageSize: 50, totalRecords: 0, totalPages: 1,
//   };

//   const handleFilterChange = (key: string, value: string) => {
//     setFilters(prev => ({ ...prev, [key]: value }));
//     setPage(1);
//   };

//   const exportToCSV = () => {
//     if (!employees.length) return;
//     const headers = benchOnly
//       ? ['ID','Name','Grade','Practice','CU','Region','Skill','Bench Status']
//       : ['ID','Name','Grade','Practice','CU','Region','Account','Skill','Status','PM'];
//     const rows = employees.map((e: any) =>
//       benchOnly
//         ? [e.employee_id,`"${e.name}"`,e.grade,e.practice,e.cu,e.region,e.skill||'',e.bench_status||''].join(',')
//         : [e.employee_id,`"${e.name}"`,e.grade,e.practice,e.cu,e.region,e.account||'',e.skill||'',e.status||'active',e.current_pm_id?'Assigned':'Unassigned'].join(',')
//     );
//     const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement('a');
//     a.href     = url;
//     a.download = benchOnly ? 'bench_resources.csv' : 'employees.csv';
//     a.click();
//   };

//   // Bench summary cards
//   const gradeGroups = benchOnly
//     ? employees.reduce((acc: any, emp: any) => {
//         const g = emp.grade || 'Unknown';
//         acc[g] = (acc[g] || 0) + 1;
//         return acc;
//       }, {})
//     : {};

//   return (
//     <div className="space-y-4">

//       {/* Bench summary cards */}
//       {benchOnly && (
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bench</p>
//             <p className="text-3xl font-bold text-orange-600">{employees.length}</p>
//           </div>
//           {Object.entries(gradeGroups).slice(0, 3).map(([grade, count]: any) => (
//             <div key={grade} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//               <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade {grade}</p>
//               <p className="text-3xl font-bold text-blue-700">{count}</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Filters */}
//       <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
//         {!benchOnly && (
//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
//             <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}
//               className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//               <option value="">All</option>
//             </select>
//           </div>
//         )}
//         {[['practice','Practice'],['cu','CU'],['region','Region'],['grade','Grade']].map(([key, label]) => (
//           <div key={key}>
//             <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
//             <input
//               value={(filters as any)[key]}
//               onChange={e => handleFilterChange(key, e.target.value)}
//               placeholder={`Filter ${label}`}
//               className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
//             />
//           </div>
//         ))}
//         <div className="flex gap-2 ml-auto">
//           <button onClick={() => refetch()}
//             className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
//             <Filter size={14} /> Refresh
//           </button>
//           <button onClick={exportToCSV}
//             className="flex items-center gap-2 px-3 py-2 text-white rounded-lg text-sm"
//             style={{ backgroundColor: '#0070AD' }}>
//             <Download size={14} /> Export
//           </button>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-lg shadow-md overflow-hidden">
//         <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-end">
//           <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
//             benchOnly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
//           }`}>
//             {benchOnly ? `${employees.length} records` : `${pagination.totalRecords.toLocaleString()} records`}
//           </span>
//         </div>

//         {isLoading ? (
//           <div className="flex items-center justify-center h-48">
//             <Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={32} />
//           </div>
//         ) : employees.length === 0 ? (
//           <div className="text-center py-16 text-gray-400">
//             {benchOnly
//               ? <><AlertCircle size={40} className="mx-auto mb-3 opacity-30" /><p>No bench resources</p><p className="text-sm mt-1">All employees are assigned to a PM</p></>
//               : <><Users size={40} className="mx-auto mb-3 opacity-30" /><p>No employees found</p></>}
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-200">
//                   {(benchOnly
//                     ? ['ID','Name','Grade','Practice','CU','Region','Skill','Bench Status']
//                     : ['ID','Name','Grade','Practice','CU','Region','Account','Skill','Status','PM']
//                   ).map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {employees.map((emp: any) => (
//                   <tr key={emp.employee_id}
//                     className={`border-b border-gray-100 transition-colors ${benchOnly ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}>
//                     <td className="px-4 py-3 text-xs text-gray-400 font-mono">{emp.employee_id}</td>
//                     <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
//                     <td className="px-4 py-3">
//                       <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.grade}</span>
//                     </td>
//                     <td className="px-4 py-3 text-gray-600 text-xs">{emp.practice}</td>
//                     <td className="px-4 py-3 text-gray-500 text-xs">{emp.cu}</td>
//                     <td className="px-4 py-3 text-gray-500 text-xs">{emp.region}</td>
//                     {!benchOnly && (
//                       <td className="px-4 py-3 text-gray-500 text-xs">{emp.account || '—'}</td>
//                     )}
//                     <td className="px-4 py-3 text-gray-500 text-xs">{emp.skill || emp.primary_skill || '—'}</td>
//                     {benchOnly ? (
//                       <td className="px-4 py-3">
//                         {emp.bench_status
//                           ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{emp.bench_status}</span>
//                           : <span className="text-gray-400 text-xs">—</span>}
//                       </td>
//                     ) : (
//                       <>
//                         <td className="px-4 py-3">
//                           <span className={`px-2 py-0.5 rounded text-xs font-medium ${
//                             emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
//                           }`}>{emp.status || 'active'}</span>
//                         </td>
//                         <td className="px-4 py-3 text-xs">
//                           {emp.current_pm_id
//                             ? <span className="text-green-600 font-medium">Assigned</span>
//                             : <span className="text-orange-500">Unassigned</span>}
//                         </td>
//                       </>
//                     )}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {pagination.totalRecords > 0 && (
//           <Pagination
//             currentPage={pagination.page}
//             totalPages={pagination.totalPages}
//             totalRecords={pagination.totalRecords}
//             pageSize={pagination.pageSize}
//             onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
//             onPageSizeChange={s => { setPageSize(s); setPage(1); }}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── helpers for rule-flow flags ─────────────────────────────────────────────
// // ─── helpers for rule-flow flags ─────────────────────────────────────────────
// const FLAG_COLORS: Record<string, string> = {
//   Critical: 'bg-red-100 text-red-800 border-red-200',
//   Major:    'bg-orange-100 text-orange-800 border-orange-200',
//   Minor:    'bg-yellow-100 text-yellow-700 border-yellow-200',
// };
// const CONFIDENCE_COLORS: Record<string, string> = {
//   High:       'bg-green-100 text-green-800',
//   Medium:     'bg-yellow-100 text-yellow-800',
//   Low:        'bg-red-100 text-red-800',
//   Unmappable: 'bg-gray-200 text-gray-700',
//   Forced:     'bg-purple-100 text-purple-800',
// };
// const TIER_LABELS: Record<string, string> = {
//   exact:                'Exact match',
//   same_bu_diff_account: 'Same BU, diff account',
//   cross_bu:             'Cross-BU fallback',
//   forced_assignment:    'Forced (Resignation Override)',
// };

// const PATH_LABELS: Record<string, { label: string; color: string }> = {
//   Path1_Perfect:           { label: 'Path 1 — Perfect match',           color: 'bg-green-100 text-green-800' },
//   Path2_SkillFallback:     { label: 'Path 2 — Skill fallback',           color: 'bg-green-100 text-green-700' },
//   Path3_DiffAccount:       { label: 'Path 3 — Diff account',             color: 'bg-yellow-100 text-yellow-800' },
//   Path4_RegionFallback:    { label: 'Path 4 — Region fallback',          color: 'bg-yellow-100 text-yellow-800' },
//   Path5_RegionAccount:     { label: 'Path 5 — Region + account diff',    color: 'bg-orange-100 text-orange-800' },
//   Path6_CrossBU:           { label: 'Path 6 — Cross-BU fallback',        color: 'bg-red-100 text-red-700' },
//   Path7_CrossBUExactSkill: { label: 'Path 7 — Cross-BU, exact skill',    color: 'bg-red-100 text-red-700' },
//   PathF_ForcedAssignment:  { label: '⚠ Forced — Resignation Override',    color: 'bg-purple-100 text-purple-800' },
// };

// // ─── New Joiners tab ─────────────────────────────────────────────────────────
// function NewJoiners() {
//   const { user, selectedDepartment } = useAuth();
//   const isSuperAdmin = user?.role === 'Super Admin';
  
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(50);
//   const { data: response, isLoading } = useGetNewJoinersListQuery({ 
//     page, 
//     pageSize,
//     ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
//   });
//   const [findPM] = useFindPMForEmployeeMutation();
//   const [assignPM] = useAssignPMMutation();
//   const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
//   const [pmMatches, setPmMatches] = useState<any[]>([]);
//   const [flagSummary, setFlagSummary] = useState<any>(null);
//   const [datasetScope, setDatasetScope] = useState<any>(null);
//   const [searching, setSearching] = useState(false);
//   const [selectedMatch, setSelectedMatch] = useState<any>(null);

//   const handleFindPM = async (employee: any) => {
//     setSearching(true); setSelectedEmployee(employee);
//     try {
//       const result = await findPM(employee.employee_id).unwrap();
//       const resultData = result as any;
//       setPmMatches(resultData.matches || []);
//       setFlagSummary(resultData.flag_summary || null);
//       setDatasetScope(resultData.dataset_scope || null);
//       setSelectedMatch(null);
//     }
//     catch (error) { console.error('Error finding PM:', error); }
//     finally { setSearching(false); }
//   };

//   const handleAssign = async (pmId: string, score: number) => {
//     try {
//       await assignPM({ employee_id: selectedEmployee.employee_id, new_pm_id: pmId, assignment_type: 'new_joiner', match_score: score }).unwrap();
//       alert('Recommendation sent for approval.');
//       setSelectedEmployee(null); setPmMatches([]); setSelectedMatch(null);
//     } catch (error: any) { alert('Assignment failed: ' + error.message); }
//   };

//   const newJoiners = response?.data || [];
//   const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

//   const columns = [
//     { header: 'Employee ID', accessor: 'employee_id' as const },
//     { header: 'Name', accessor: 'name' as const },
//     { header: 'Grade', accessor: 'grade' as const },
//     { header: 'Practice', accessor: 'practice' as const },
//     { header: 'CU', accessor: 'cu' as const },
//     { header: 'Actions', accessor: (row: any) => (
//       <button onClick={() => handleFindPM(row)} className="btn-primary text-xs py-1.5 px-3">
//         <Search size={14} className="inline mr-1" /> Find PM
//       </button>
//     )},
//   ];

//   if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin" style={{ color: '#12ABDB' }} size={32} /></div>;

//   return (
//     <div className="space-y-4">
//       <div className="bg-white rounded-lg shadow-md p-6">
//         <h2 className="text-lg font-semibold text-gray-800 mb-4">Unassigned Employees ({pagination.totalRecords || 0})</h2>
//         <Table data={newJoiners} columns={columns} />
//         {pagination.totalRecords > 0 && (
//           <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalRecords={pagination.totalRecords}
//             pageSize={pagination.pageSize} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
//             onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
//         )}
//       </div>

//       {/* PM Matches Modal */}
//       {selectedEmployee && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">

//             {/* Header */}
//             <div className="text-white p-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}>
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h2 className="text-xl font-bold">PM Recommendations</h2>
//                   <p className="text-white/80 text-sm mt-0.5">
//                     {selectedEmployee.name} &middot; {selectedEmployee.employee_id} &middot; {selectedEmployee.practice} &middot; {selectedEmployee.cu}
//                   </p>
//                 </div>
//                 {flagSummary && (
//                   <div className="flex gap-2 text-xs flex-shrink-0 ml-4">
//                     {flagSummary.critical > 0 && (
//                       <span className="px-2 py-1 bg-red-500/80 text-white rounded-full font-semibold">{flagSummary.critical} Critical</span>
//                     )}
//                     {flagSummary.major > 0 && (
//                       <span className="px-2 py-1 bg-orange-400/80 text-white rounded-full font-semibold">{flagSummary.major} Major</span>
//                     )}
//                     {flagSummary.minor > 0 && (
//                       <span className="px-2 py-1 bg-yellow-400/80 text-white rounded-full font-semibold">{flagSummary.minor} Minor</span>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Step 0: Dataset scope warning */}
//             {datasetScope && !datasetScope.is_scoped && (
//               <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2">
//                 <span className="text-red-500 font-bold text-xs mt-0.5">CRITICAL</span>
//                 <div>
//                   <p className="text-xs font-semibold text-red-800">Dataset is not practice-scoped</p>
//                   <p className="text-xs text-red-600 mt-0.5">
//                     {datasetScope.practices_found?.length} practices found: {(datasetScope.practices_found || []).join(', ')}.
//                     Rows with mismatched PM practice are marked Unmappable.
//                   </p>
//                 </div>
//               </div>
//             )}

//             <div className="flex-1 overflow-y-auto p-5">
//               {searching ? (
//                 <div className="flex items-center justify-center py-16">
//                   <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
//                 </div>
//               ) : pmMatches.length === 0 ? (
//                 <div className="text-center py-16 text-gray-500">
//                   <p className="text-3xl mb-3">&#128269;</p>
//                   <p className="font-medium">No suitable PMs found</p>
//                   <p className="text-sm mt-1 text-gray-400">No active PMs in practice &quot;{selectedEmployee.practice}&quot; with available capacity and eligible grade.</p>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

//                   {/* Match cards */}
//                   <div className="lg:col-span-3 space-y-3">
//                     {pmMatches.map((match: any, idx: number) => {
//                       const isSelected = selectedMatch?.pm?.employee_id === match.pm.employee_id;
//                       const confidence: string = match.confidence || 'High';
//                       const tier: string = match.matchTier || 'exact';
//                       const critFlags = (match.flags || []).filter((f: any) => f.severity === 'Critical');
//                       const majorFlags = (match.flags || []).filter((f: any) => f.severity === 'Major');
//                       const minorFlags = (match.flags || []).filter((f: any) => f.severity === 'Minor');
//                       return (
//                         <div key={idx}
//                           className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 shadow-lg bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'}`}
//                           onClick={() => setSelectedMatch(match)}>

//                           {/* Forced Assignment banner */}
//                           {match.forcedAssignment && (
//                             <div className="mb-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center gap-2 text-xs text-purple-800 font-semibold">
//                               <span>⚠</span>
//                               <span>FORCED ASSIGNMENT — PM Resignation Override. All constraints relaxed. Manual review recommended.</span>
//                             </div>
//                           )}

//                           {/* Top row */}
//                           <div className="flex items-start justify-between mb-3">
//                             <div className="flex items-center gap-2 flex-wrap">
//                               <h3 className="font-semibold text-gray-900">{match.pm.name}</h3>
//                               <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{match.pm.grade}</span>
//                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[confidence] || 'bg-gray-100 text-gray-700'}`}>
//                                 {confidence} confidence
//                               </span>
//                               {tier !== 'exact' && (
//                                 <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
//                                   {TIER_LABELS[tier] || tier}
//                                 </span>
//                               )}
//                               {match.path && PATH_LABELS[match.path] && (
//                                 <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PATH_LABELS[match.path].color}`}>
//                                   {PATH_LABELS[match.path].label}
//                                 </span>
//                               )}
//                             </div>
//                             <div className="flex items-center gap-1 ml-2 flex-shrink-0">
//                               <span className="text-base font-bold text-[#0070AD]">{match.score.toFixed(0)}</span>
//                               <span className="text-xs text-gray-400">pts</span>
//                               {isSelected && <CheckCircle2 size={16} className="text-blue-500 ml-1" />}
//                             </div>
//                           </div>

//                           {/* PM detail grid */}
//                           <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
//                             <div><span className="text-gray-400">Practice: </span><span className="font-medium text-gray-700">{match.pm.practice}</span></div>
//                             <div><span className="text-gray-400">BU (CU): </span><span className="font-medium text-gray-700">{match.pm.cu}</span></div>
//                             <div><span className="text-gray-400">Region: </span><span className="font-medium text-gray-700">{match.pm.region}</span></div>
//                             <div><span className="text-gray-400">Account: </span><span className="font-medium text-gray-700">{match.pm.account || '—'}</span></div>
//                             <div><span className="text-gray-400">Skill: </span><span className="font-medium text-gray-700">{match.pm.skill || '—'}</span></div>
//                             <div><span className="text-gray-400">Capacity: </span>
//                               <span className={`font-semibold ${(match.pm.reportee_count ?? 0) >= (match.pm.max_capacity ?? 10) ? 'text-red-600' : 'text-green-600'}`}>
//                                 {match.pm.reportee_count ?? 0}/{match.pm.max_capacity ?? '—'}
//                               </span>
//                             </div>
//                           </div>

//                           {/* Rule-flow flags */}
//                           {(critFlags.length > 0 || majorFlags.length > 0 || minorFlags.length > 0) && (
//                             <div className="space-y-1 mt-2">
//                               {critFlags.map((f: any, i: number) => (
//                                 <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Critical}`}>
//                                   <span className="font-bold mr-1">Critical [{f.code}]:</span>{f.message}
//                                 </div>
//                               ))}
//                               {majorFlags.map((f: any, i: number) => (
//                                 <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Major}`}>
//                                   <span className="font-bold mr-1">Major [{f.code}]:</span>{f.message}
//                                 </div>
//                               ))}
//                               {minorFlags.map((f: any, i: number) => (
//                                 <div key={i} className={`text-xs px-2.5 py-1.5 rounded border ${FLAG_COLORS.Minor}`}>
//                                   <span className="font-bold mr-1">Minor [{f.code}]:</span>{f.message}
//                                 </div>
//                               ))}
//                             </div>
//                           )}

//                           {/* Match reasons */}
//                           {match.reasons?.length > 0 && (
//                             <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2.5 py-1.5">
//                               {match.reasons.join(' · ')}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                   </div>

//                   {/* Right: Pre-approval preview */}
//                   <div className="lg:col-span-2">
//                     <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sticky top-0">
//                       <h3 className="font-semibold text-gray-800 mb-1">Pre-Approval Preview</h3>
//                       <p className="text-xs text-gray-500 mb-4">Click a match card to select, then review before submitting.</p>

//                       {!selectedMatch ? (
//                         <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
//                           Select a match card
//                         </div>
//                       ) : (
//                         <div className="space-y-3">
//                           <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-sm">
//                             <div>
//                               <span className="text-gray-400 text-xs">Employee</span>
//                               <p className="font-medium text-gray-800">{selectedEmployee.name} <span className="text-gray-400 text-xs">({selectedEmployee.employee_id})</span></p>
//                             </div>
//                             <div>
//                               <span className="text-gray-400 text-xs">Recommended PM</span>
//                               <p className="font-medium text-gray-800">{selectedMatch.pm.name} <span className="text-gray-400 text-xs">({selectedMatch.pm.employee_id})</span></p>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <span className="text-gray-400 text-xs">Confidence</span>
//                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONFIDENCE_COLORS[selectedMatch.confidence || 'High']}`}>
//                                 {selectedMatch.confidence || 'High'}
//                               </span>
//                             </div>
//                             <div>
//                               <span className="text-gray-400 text-xs">Score</span>
//                               <p className="font-bold text-[#0070AD]">{selectedMatch.score.toFixed(0)} pts</p>
//                             </div>
//                           </div>

//                           {selectedMatch.reasons?.length > 0 && (
//                             <div className="bg-green-50 rounded-lg p-3">
//                               <p className="text-xs font-semibold text-green-700 mb-1">Why this PM</p>
//                               <ul className="text-xs text-green-700 space-y-0.5">
//                                 {selectedMatch.reasons.map((r: string, i: number) => <li key={i}>&#10003; {r}</li>)}
//                               </ul>
//                             </div>
//                           )}

//                           {(selectedMatch.flags || []).length > 0 && (
//                             <div className="space-y-1">
//                               <p className="text-xs font-semibold text-gray-500">Rule flags</p>
//                               {(selectedMatch.flags || []).map((f: any, i: number) => (
//                                 <div key={i} className={`text-xs px-2 py-1.5 rounded border ${FLAG_COLORS[f.severity] || FLAG_COLORS.Minor}`}>
//                                   <span className="font-bold">{f.severity} [{f.code}]:</span> {f.message}
//                                 </div>
//                               ))}
//                             </div>
//                           )}

//                           <button
//                             onClick={() => handleAssign(selectedMatch.pm.employee_id, selectedMatch.score)}
//                             className="btn-primary w-full"
//                             style={selectedMatch.confidence === 'Low' ? { backgroundColor: '#d97706' } : {}}
//                           >
//                             <UserPlus size={16} className="inline mr-1" />
//                             {selectedMatch.confidence === 'Low' ? 'Send for Approval (Low confidence)' : 'Send for Approval'}
//                           </button>

//                           {selectedMatch.confidence === 'Low' && (
//                             <p className="text-xs text-orange-600 text-center">
//                               Low-confidence match — reviewer should verify flags before approving.
//                             </p>
//                           )}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                 </div>
//               )}
//             </div>

//             <div className="border-t border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
//               {flagSummary && (
//                 <p className="text-xs text-gray-500">
//                   {pmMatches.length} PM{pmMatches.length !== 1 ? 's' : ''} found
//                   {flagSummary.critical > 0 && <span className="text-red-600 font-semibold ml-1">&middot; {flagSummary.critical} critical</span>}
//                   {flagSummary.major > 0 && <span className="text-orange-600 font-semibold ml-1">&middot; {flagSummary.major} major</span>}
//                   {flagSummary.minor > 0 && <span className="text-yellow-600 ml-1">&middot; {flagSummary.minor} minor</span>}
//                 </p>
//               )}
//               <button
//                 onClick={() => { setSelectedEmployee(null); setPmMatches([]); setFlagSummary(null); setDatasetScope(null); }}
//                 className="btn-secondary ml-auto"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Separations tab ─────────────────────────────────────────────────────────
// const PERSON_TYPE_BADGE: Record<string, string> = {
//   pm: 'bg-purple-100 text-purple-800',
//   employee: 'bg-blue-100 text-blue-800',
//   unknown: 'bg-gray-100 text-gray-600',
// };
// const SEP_TYPE_BADGE: Record<string, string> = {
//   Resignation: 'bg-red-100 text-red-800',
//   Retirement: 'bg-purple-100 text-purple-800',
//   Termination: 'bg-orange-100 text-orange-800',
//   'Contract End': 'bg-yellow-100 text-yellow-800',
// };
// const GRADE_OPTIONS = ['A1','A2','A3','A4','B1','B2','C1','C2','D1','D2','E1','E2'];

// function Separations() {
//   const { user, selectedDepartment } = useAuth();
//   const isSuperAdmin = user?.role === 'Super Admin';
  
//   const [filters, setFilters] = useState({ status: '', grade: '', person_type: '' });
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(50);
//   const { data: response, isLoading, refetch } = useGetSeparationsListQuery({ 
//     ...filters, 
//     page, 
//     pageSize,
//     ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
//   });

//   const separations = response?.data || [];
//   const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };
//   const handleFilterChange = (key: string, value: string) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };

//   const exportToCSV = () => {
//     if (!separations.length) return;
//     const headers = ['ID','Name','Grade','Designation','Type','LWD','Reason','Status','Person Type'];
//     const rows = separations.map((s: any) => [s.employee_id, `"${s.person_name || ''}"`, s.grade || '', s.designation || '', s.separation_type || '', s.lwd || '', s.reason || '', s.status || '', s.person_type || ''].join(','));
//     const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a'); a.href = url; a.download = 'separations.csv'; a.click();
//   };

//   const urgent = separations.filter((s: any) => {
//     if (!s.lwd) return false;
//     const days = differenceInDays(new Date(s.lwd), new Date());
//     return days >= 0 && days <= 30;
//   });

//   return (
//     <div className="space-y-4">
//       {urgent.length > 0 && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
//           <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
//           <div><p className="text-sm font-semibold text-red-800">{urgent.length} separation{urgent.length > 1 ? 's' : ''} with LWD within 30 days</p>
//             <p className="text-xs text-red-600 mt-0.5">These employees need immediate PM reassignment</p></div>
//         </div>
//       )}

//       {/* Filters */}
//       <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
//         <div>
//           <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
//           <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//             <option value="">All</option><option value="pending">Pending</option><option value="processed">Processed</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
//           <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//             <option value="">All Grades</option>{GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
//           </select>
//         </div>
//         <div>
//           <label className="block text-xs font-medium text-gray-600 mb-1">Person Type</label>
//           <select value={filters.person_type} onChange={e => handleFilterChange('person_type', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//             <option value="">All Types</option><option value="pm">PM</option><option value="employee">Employee</option><option value="unknown">Unknown</option>
//           </select>
//         </div>
//         <div className="flex gap-2 ml-auto">
//           <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"><Filter size={14} /> Refresh</button>
//           <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0070AD' }}><Download size={14} /> Export</button>
//         </div>
//       </div>

//       <div className="bg-white rounded-lg shadow-md overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
//           <UserX size={18} className="text-red-500" />
//           <h2 className="font-semibold text-gray-800">Separations</h2>
//           <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{pagination.totalRecords}</span>
//         </div>
//         {isLoading ? (
//           <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={32} /></div>
//         ) : separations.length === 0 ? (
//           <div className="text-center py-16 text-gray-400">
//             <UserX size={40} className="mx-auto mb-3 opacity-30" />
//             <p className="font-medium">No separation records found</p>
//             <p className="text-sm mt-1 flex items-center justify-center gap-1"><UploadCloud size={14} /> Upload a separation report to populate records</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-200">
//                   {['ID','Name','Grade','Designation','Type','LWD','Days Left','Reason','Status','Person Type'].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {separations.map((sep: any) => {
//                   const daysLeft = sep.lwd ? differenceInDays(new Date(sep.lwd), new Date()) : null;
//                   const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
//                   return (
//                     <tr key={sep.id} className={`border-b border-gray-100 transition-colors ${isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
//                       <td className="px-4 py-3 text-xs text-gray-400 font-mono">{sep.employee_id}</td>
//                       <td className="px-4 py-3 font-medium text-gray-800">{sep.person_name || '—'}</td>
//                       <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{sep.grade || '—'}</span></td>
//                       <td className="px-4 py-3 text-gray-500 text-xs">{sep.designation || '—'}</td>
//                       <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${SEP_TYPE_BADGE[sep.separation_type] || 'bg-gray-100 text-gray-600'}`}>{sep.separation_type || '—'}</span></td>
//                       <td className="px-4 py-3 text-sm font-mono">{sep.lwd ? format(new Date(sep.lwd), 'dd MMM yyyy') : '—'}</td>
//                       <td className="px-4 py-3">
//                         {daysLeft !== null
//                           ? <span className={`px-2 py-0.5 rounded text-xs font-semibold ${daysLeft < 0 ? 'bg-gray-100 text-gray-500' : daysLeft <= 7 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
//                               {daysLeft < 0 ? 'Past' : `${daysLeft}d`}
//                             </span>
//                           : '—'}
//                       </td>
//                       <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{sep.reason || '—'}</td>
//                       <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${sep.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{sep.status}</span></td>
//                       <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PERSON_TYPE_BADGE[sep.person_type] || PERSON_TYPE_BADGE.unknown}`}>{sep.person_type}</span></td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//         {pagination.totalRecords > 0 && (
//           <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalRecords={pagination.totalRecords}
//             pageSize={pagination.pageSize} onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
//             onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Main page ────────────────────────────────────────────────────────────────
// const TAB_TITLES: Record<TabId, { title: string; sub: string }> = {
//   employees: { title: 'All Employees', sub: 'Browse and filter all employee records' },
//   bench: { title: 'Bench Resources', sub: 'Employees without a People Manager assigned' },
//   'new-joiners': { title: 'New Joiners', sub: 'Assign People Managers to new employees' },
//   separations: { title: 'Separations', sub: 'Track employee separations and LWD timelines' },
// };

// export default function People({ defaultTab }: { defaultTab?: TabId }) {
//   const [activeTab, setActiveTab] = useState<TabId>(defaultTab || 'employees');
//   const { title } = TAB_TITLES[activeTab];
//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
//       </div>
//       <TabBar tabs={TABS} active={activeTab} onChange={t => setActiveTab(t as any)} />
//       {activeTab === 'employees' && <EmployeeTable />}
//       {activeTab === 'bench' && <EmployeeTable benchOnly />}
//       {activeTab === 'new-joiners' && <NewJoiners />}
//       {activeTab === 'separations' && <Separations />}
//     </div>
//   );
// }
import TabBar from '../components/TabBar';
import React, { useMemo, useState } from 'react';
import {
  useGetEmployeesListQuery,
  useGetNewJoinersListQuery,
  useFindPMForEmployeeMutation,
  useAssignPMMutation,
  useGetSeparationsListQuery,
  useGetPracticeFiltersQuery,
  useBulkUpdateEmployeeSkillsMutation,
  useRemoveEmployeeSkillMutation,
  useUpdateSingleEmployeeSkillMutation,
  useGetSkillManagementCoverageQuery,
  useGetFilteredEmployeesForSkillUpdateQuery,
} from '../services/pmApi';
import { Users, Search, Filter, Download, Loader2, AlertCircle, UserPlus, CheckCircle2, UserX, AlertTriangle, UploadCloud, BarChart2, RefreshCcw, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import Table from '../components/Table';
import { format, differenceInDays } from 'date-fns';

const GRADE_OPTIONS = ['A1','A2','A3','A4','B1','B2','C1','C2','D1','D2','E1','E2'];

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
  const [viewMode, setViewMode] = useState<'list' | 'skill'>('list');

  // ── Column picker ──────────────────────────────────────────────────────────
  type ColKey = 'employee_id'|'name'|'grade'|'practice'|'cu'|'region'|'account'|'skill'|'primary_skill'|'new_skill'|'email'|'status'|'current_pm_id'|'joining_date'|'is_new_joiner'|'is_frozen'|'sub_practice'|'location'|'bench_status'|'hire_reason'|'leave_type'|'leave_start_date'|'leave_end_date'|'pm_name'|'pm_email'|'pm_grade'|'pm_practice'|'pm_cu'|'pm_region'|'pm_account'|'pm_skill'|'pm_sub_practice'|'pm_location'|'pm_reportee_count'|'pm_max_capacity'|'pm_leave_type'|'pm_leave_start_date'|'pm_leave_end_date'|'pm_is_active';
  interface ColDef { key: ColKey; label: string; always?: boolean; }
  const ALL_COLUMNS: ColDef[] = [
    { key: 'employee_id',     label: 'ID',               always: true },
    { key: 'name',            label: 'Name',             always: true },
    { key: 'grade',           label: 'Grade' },
    { key: 'practice',        label: 'Practice' },
    { key: 'cu',              label: 'NEW BU' },
    { key: 'region',          label: 'Region' },
    { key: 'account',         label: 'Account' },
    { key: 'primary_skill',   label: 'Primary Skill' },
    { key: 'new_skill',       label: 'New Skill' },
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
    // ── People Manager fields ──────────────────────────────────────────────
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
    { key: 'pm_leave_type',       label: 'PM Leave Type' },
    { key: 'pm_leave_start_date', label: 'PM Leave Start' },
    { key: 'pm_leave_end_date',   label: 'PM Leave End' },
    { key: 'pm_is_active',        label: 'PM Active' },
  ];
  const DEFAULT_COLS_ALL:   ColKey[] = ['employee_id','name','grade','practice','cu','region','account','primary_skill','new_skill','status','current_pm_id'];
  const DEFAULT_COLS_BENCH: ColKey[] = ['employee_id','name','grade','practice','cu','region','primary_skill','new_skill','bench_status'];
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(DEFAULT_COLS_ALL);
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = React.useRef<HTMLDivElement>(null);

  // sync default cols when benchOnly changes
  React.useEffect(() => {
    setVisibleCols(benchOnly ? DEFAULT_COLS_BENCH : DEFAULT_COLS_ALL);
  }, [benchOnly]);

  // close picker on outside click
  React.useEffect(() => {
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

  // CSV export – only exports visible columns, matching the UI exactly
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
  // ───────────────────────────────────────────────────────────────────────────
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const isSkillView = viewMode === 'skill';

  // Skill management state
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [updateSkill, setUpdateSkill]       = useState('');
  const [updateFilters, setUpdateFilters]   = useState({ practice: '', cu: '', region: '', grade: '' });
  const [removeFilters, setRemoveFilters]   = useState({ skill: '', practice: '', cu: '', region: '', grade: '' });
  const [skillMsg, setSkillMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [employeeNameSearchQuery, setEmployeeNameSearchQuery] = useState('');
  const [rowsPerSkillGroup, setRowsPerSkillGroup] = useState<number | 'all'>(10);

  const { data: filterOpts } = useGetPracticeFiltersQuery();
  const practices = filterOpts?.practices?.filter(p => p !== 'All') ?? [];
  const cus       = filterOpts?.cus?.filter(c => c !== 'All') ?? [];
  const regions   = filterOpts?.regions?.filter(r => r !== 'All') ?? [];

  // List view: paginated (50 rows). Skill view: full fetch (10000 rows), pre-fetched
  // in background so the switch is instant once the cache is warm.
  const { data: response, isLoading, isFetching, refetch } = useGetEmployeesListQuery({
    ...filters,
    page,
    pageSize,
  });
  // Pre-fetch the full dataset in background so skill-wise switch is instant
  const { data: bulkResponse, isLoading: bulkLoading, refetch: refetchBulk } = useGetEmployeesListQuery({
    ...filters,
    page: 1,
    pageSize: 10000,
  });
  // Use the right dataset based on viewMode
  const activeResponse = isSkillView ? bulkResponse : response;

  const [doBulkUpdate, { isLoading: updatingSkill }] = useBulkUpdateEmployeeSkillsMutation();
  const [doRemoveSkill, { isLoading: removingSkill }] = useRemoveEmployeeSkillMutation();
  const [updateSingleSkill, { isLoading: savingSkill }] = useUpdateSingleEmployeeSkillMutation();

  const { data: coverage } = useGetSkillManagementCoverageQuery();
  const hasFilters = updateFilters.practice || updateFilters.cu || updateFilters.region || updateFilters.grade;
  const { data: filteredPreview, isFetching: previewLoading, refetch: refetchFilteredPreview } = useGetFilteredEmployeesForSkillUpdateQuery(
    updateFilters,
    { skip: !hasFilters },
  );
  const hasRemoveFilters = removeFilters.skill || removeFilters.practice || removeFilters.cu || removeFilters.region || removeFilters.grade;
  const { data: removePreview, isFetching: removePreviewLoading, refetch: refetchRemovePreview } = useGetFilteredEmployeesForSkillUpdateQuery(
    { practice: removeFilters.practice, cu: removeFilters.cu, region: removeFilters.region, grade: removeFilters.grade },
    { skip: !hasRemoveFilters },
  );

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingSkillValue, setEditingSkillValue] = useState('');
  const [showUpdateResult, setShowUpdateResult] = useState(false);
  const [updateResultData, setUpdateResultData] = useState<{ skill: string; employees: any[] } | null>(null);

  // Apply client-side filters + optional bench filter
  // In skill view, use the bulk pre-fetched dataset; in list view, use the paginated one
  const employees = (activeResponse?.data || []).filter((emp: any) => {
    if (benchOnly && emp.current_pm_id) return false;
    if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
    if (filters.skill) {
      const effectiveSkill = String(emp.skill || emp.primary_skill || '').toLowerCase();
      if (!effectiveSkill.includes(filters.skill.toLowerCase())) return false;
    }
    return true;
  });

  const pagination = activeResponse?.pagination || {
    page: 1, pageSize: 50, totalRecords: 0, totalPages: 1,
  };
  // Show spinner only when the relevant dataset is loading
  const viewIsLoading = isSkillView ? bulkLoading : isLoading;
  const viewIsFetching = isSkillView ? false : isFetching;

  const employeesBySkill = useMemo(() => {
    const grouped = employees.reduce((acc: Record<string, any[]>, emp: any) => {
      const rawSkill = (emp.skill || emp.primary_skill || 'Unspecified').trim() || 'Unspecified';
      const cleanedSkill = rawSkill
        .replace(/\[\s*\d+\s*\]/g, '')      // Appian[0741] -> Appian
        .replace(/\(\s*\d+\s*\)/g, '')      // Appian(0741) -> Appian
        .replace(/^\s*\d{3,}\s*[-:]?\s*/g, '') // 0741-Appian -> Appian
        .replace(/\s+\d{3,}\s*$/g, '')        // Appian 0741 -> Appian
        .replace(/\s+/g, ' ')
        .trim();
      // Normalize to title case for consistent grouping (Java, Python, etc.)
      const normalizedSkill = (cleanedSkill || 'Unspecified')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (!acc[normalizedSkill]) acc[normalizedSkill] = [];
      acc[normalizedSkill].push(emp);
      return acc;
    }, {});

    let result = Object.entries(grouped)
      .map(([skill, rows]) => ({
        skill,
        rows: rows.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || ''))),
      }))
      .sort((a, b) => b.rows.length - a.rows.length || a.skill.localeCompare(b.skill));

    // Filter by skill search query
    if (skillSearchQuery.trim()) {
      const query = skillSearchQuery.toLowerCase().trim();
      result = result.filter(group => group.skill.toLowerCase().includes(query));
    }

    // Filter by employee name search query
    if (employeeNameSearchQuery.trim()) {
      const query = employeeNameSearchQuery.toLowerCase().trim();
      result = result.map(group => ({
        ...group,
        rows: group.rows.filter((emp: any) => emp.name.toLowerCase().includes(query))
      })).filter(group => group.rows.length > 0);
    }

    return result;
  }, [employees, skillSearchQuery, employeeNameSearchQuery]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getApiErrorMessage = (err: any, fallback: string) => {
    return err?.data?.error || err?.error || err?.message || fallback;
  };

  const handleBulkUpdate = async () => {
    if (!updateSkill.trim()) { setSkillMsg({ type: 'error', text: 'Please enter a skill to update.' }); return; }
    try {
      const newSkill = updateSkill.trim();
      const hadUpdateFilters = !!(updateFilters.practice || updateFilters.cu || updateFilters.region || updateFilters.grade);
      const hadRemoveFilters = !!(removeFilters.skill || removeFilters.practice || removeFilters.cu || removeFilters.region || removeFilters.grade);
      const previewEmployees = hadUpdateFilters ? (filteredPreview?.data || []) : [];

      const result = await doBulkUpdate({ skill: newSkill, ...updateFilters }).unwrap();
      if (!result?.updatedCount) {
        setSkillMsg({ type: 'error', text: 'No employees matched the selected filters. Nothing was updated.' });
        return;
      }

      setSkillMsg({ type: 'success', text: `Skill updated for ${result.updatedCount} employee${result.updatedCount === 1 ? '' : 's'}.` });

      // Refresh preview sections only when those queries were active.
      // Calling refetch on skipped queries can throw and show a false "Update failed" message.
      if (hadUpdateFilters) {
        try { await refetchFilteredPreview(); } catch {}
      }
      if (hadRemoveFilters) {
        try { await refetchRemovePreview(); } catch {}
      }

      try { await refetchBulk(); } catch {}

      setUpdateSkill('');
      // Close preview & reset filters after success
      setUpdateFilters({ practice: '', cu: '', region: '', grade: '' });
      // Reset page and show skill-wise data for the updated skill
      setPage(1);
      setViewMode('skill');
      setSkillSearchQuery(newSkill);
      setFilters({
        status: 'active',
        practice: '',
        cu: '',
        region: '',
        grade: '',
        skill: '',
      });

      // Show result modal with updated employees
      const localUpdatedEmployees = previewEmployees.map((emp: any) => ({ ...emp, skill: newSkill }));
      try {
        const latest: any = await refetch();
        const updatedEmployees = (latest?.data?.data || []).filter((emp: any) =>
          emp.skill && emp.skill.toLowerCase() === newSkill.toLowerCase()
        );
        setUpdateResultData({
          skill: newSkill,
          employees: updatedEmployees.length ? updatedEmployees : localUpdatedEmployees,
        });
      } catch {
        setUpdateResultData({ skill: newSkill, employees: localUpdatedEmployees });
      }
      setShowUpdateResult(true);
    } catch (err: any) {
      setSkillMsg({ type: 'error', text: getApiErrorMessage(err, 'Update failed.') });
    }
  };

  const handleRemoveSkill = async () => {
    try {
      const hadUpdateFilters = !!(updateFilters.practice || updateFilters.cu || updateFilters.region || updateFilters.grade);
      const hadRemoveFilters = !!(removeFilters.skill || removeFilters.practice || removeFilters.cu || removeFilters.region || removeFilters.grade);

      const result = await doRemoveSkill(removeFilters).unwrap();
      if (!result?.updatedCount) {
        setSkillMsg({ type: 'error', text: 'No employees matched the selected filters. Nothing was reverted.' });
        return;
      }

      setSkillMsg({ type: 'success', text: `Skill reverted to primary skill for ${result.updatedCount} employee${result.updatedCount === 1 ? '' : 's'}.` });

      if (hadUpdateFilters) {
        try { await refetchFilteredPreview(); } catch {}
      }
      if (hadRemoveFilters) {
        try { await refetchRemovePreview(); } catch {}
      }

      setRemoveFilters({ skill: '', practice: '', cu: '', region: '', grade: '' });
      try { await refetchBulk(); } catch {}
      await refetch();
    } catch (err: any) {
      setSkillMsg({ type: 'error', text: getApiErrorMessage(err, 'Remove failed.') });
    }
  };

  const handleSaveSkill = async (employeeId: string) => {
    try {
      const nextSkill = editingSkillValue.trim();
      if (!nextSkill) {
        alert('Skill cannot be empty.');
        return;
      }
      await updateSingleSkill({ employeeId, skill: nextSkill }).unwrap();
      setEditingSkillId(null);
      setSkillMsg({ type: 'success', text: `Skill updated for employee ${employeeId}.` });
      try { await refetchBulk(); } catch {}
      refetch();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to update skill.');
    }
  };

  const exportSkillGroupToCSV = (skill: string, skillRows: any[]) => {
    if (!skillRows.length) return;

    const headers = benchOnly
      ? ['ID','Name','Grade','Practice','NEW BU','Region','Primary Skill','Bench Status']
      : ['ID','Name','Grade','Practice','NEW BU','Region','Account','Primary Skill','Status','PM'];

    const rows = skillRows.map((e: any) =>
      benchOnly
        ? [e.employee_id, `"${e.name}"`, e.grade, e.practice, e.cu, e.region, e.primary_skill || '', e.bench_status || ''].join(',')
        : [e.employee_id, `"${e.name}"`, e.grade, e.practice, e.cu, e.region, e.account || '', e.primary_skill || '', e.status || 'active', e.current_pm_id ? 'Assigned' : 'Unassigned'].join(',')
    );

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileSkill = (skill || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    a.download = `${fileSkill || 'skill'}_employees.csv`;
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
          {Object.entries(gradeGroups).slice(0, 3).map(([grade, count]: any) => (
            <div key={grade} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade {grade}</p>
              <p className="text-3xl font-bold text-blue-700">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {!benchOnly && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}
              className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
        )}

        {/* Practice dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
          <select value={filters.practice} onChange={e => handleFilterChange('practice', e.target.value)}
            className={`${selectCls} min-w-[130px]`}>
            <option value="">All Practices</option>
            {practices.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* NEW BU dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">NEW BU</label>
          <select value={filters.cu} onChange={e => handleFilterChange('cu', e.target.value)}
            className={`${selectCls} min-w-[130px]`}>
            <option value="">All NEW BUs</option>
            {cus.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Region dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
          <select value={filters.region} onChange={e => handleFilterChange('region', e.target.value)}
            className={`${selectCls} min-w-[120px]`}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Grade dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
          <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)}
            className={`${selectCls} w-28`}>
            <option value="">All Grades</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex gap-2 ml-auto">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('skill')}
              className={`px-3 py-2 text-xs font-medium border-l border-gray-300 transition-colors ${
                viewMode === 'skill' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Skill-wise
            </button>
          </div>
          {/* Skill management toggle */}
          <button onClick={() => { setShowSkillPanel(v => !v); setSkillMsg(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border font-medium transition-colors ${
              showSkillPanel ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            <BarChart2 size={14} />
            Skills
            {showSkillPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            disabled={employees.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    title="Reset to defaults"
                  >
                    <RefreshCcw size={11} /> Reset
                  </button>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {/* ── Employee section header with Check All toggle ── */}
                  {(() => {
                    const empCols = ALL_COLUMNS.filter(c => !c.key.startsWith('pm_'));
                    const toggleableCols = empCols.filter(c => !c.always);
                    const allEmpChecked = toggleableCols.every(c => visibleCols.includes(c.key));
                    const toggleAllEmp = () => {
                      if (allEmpChecked) {
                        // uncheck all toggleable employee cols
                        setVisibleCols(prev => prev.filter(k => !toggleableCols.some(c => c.key === k)));
                      } else {
                        // check all employee cols
                        setVisibleCols(prev => {
                          const toAdd = toggleableCols.filter(c => !prev.includes(c.key)).map(c => c.key);
                          return [...prev, ...toAdd];
                        });
                      }
                    };
                    return (
                      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</p>
                        <button
                          onClick={toggleAllEmp}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {allEmpChecked ? 'Uncheck All' : 'Check All'}
                        </button>
                      </div>
                    );
                  })()}
                  {ALL_COLUMNS.filter(c => !c.key.startsWith('pm_')).map(col => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        col.always ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        disabled={col.always}
                        onChange={() => !col.always && toggleCol(col.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                      {col.always && <span className="ml-auto text-xs text-gray-400 italic">always</span>}
                    </label>
                  ))}

                  {/* ── People Manager section header with Check All toggle ── */}
                  {(() => {
                    const pmCols = ALL_COLUMNS.filter(c => c.key.startsWith('pm_'));
                    const allPmChecked = pmCols.every(c => visibleCols.includes(c.key));
                    const toggleAllPm = () => {
                      if (allPmChecked) {
                        setVisibleCols(prev => prev.filter(k => !pmCols.some(c => c.key === k)));
                      } else {
                        setVisibleCols(prev => {
                          const toAdd = pmCols.filter(c => !prev.includes(c.key)).map(c => c.key);
                          return [...prev, ...toAdd];
                        });
                      }
                    };
                    return (
                      <div className="flex items-center justify-between px-2 pt-3 pb-0.5 border-t border-gray-100 mt-1">
                        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">People Manager</p>
                        <button
                          onClick={toggleAllPm}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {allPmChecked ? 'Uncheck All' : 'Check All'}
                        </button>
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
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

      {/* ── Skill Management Panel ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: showSkillPanel ? 2000 : 0, opacity: showSkillPanel ? 1 : 0 }}
      >
      {true && (
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Skill Management</h3>
          </div>

          {skillMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
              skillMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {skillMsg.text}
            </div>
          )}

          {/* Coverage Summary Card */}
          {coverage && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">📊 Data Coverage</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{coverage.practices}</div>
                  <div className="text-xs text-gray-600">Practices</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{coverage.grades}</div>
                  <div className="text-xs text-gray-600">Grades</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{coverage.cus}</div>
                  <div className="text-xs text-gray-600">BUs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{coverage.regions}</div>
                  <div className="text-xs text-gray-600">Regions</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-700 text-center font-medium">
                Total Active Employees: <span className="text-blue-700 font-bold">{coverage.totalEmployees.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Update Skills Form ── */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <RefreshCcw size={14} className="text-blue-500" /> Update Skills
              </h4>
              <p className="text-xs text-gray-500">Set a new skill for employees. Each employee's original primary skill is preserved and will NOT be overwritten.</p>

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
                    {practices.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade (optional)</label>
                  <select value={updateFilters.grade} onChange={e => setUpdateFilters(f => ({ ...f, grade: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All Grades</option>
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NEW BU (optional)</label>
                  <select value={updateFilters.cu} onChange={e => setUpdateFilters(f => ({ ...f, cu: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All NEW BUs</option>
                    {cus.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region (optional)</label>
                  <select value={updateFilters.region} onChange={e => setUpdateFilters(f => ({ ...f, region: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All Regions</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
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

              {/* Preview of matching employees */}
              {hasFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    {previewLoading
                      ? <><Loader2 size={12} className="animate-spin" /> Loading preview…</>
                      : <>👥 {filteredPreview?.totalCount ?? 0} employee{filteredPreview?.totalCount !== 1 ? 's' : ''} will be updated</>}
                  </p>
                  {!previewLoading && filteredPreview && filteredPreview.totalCount === 0 && (
                    <p className="text-xs text-gray-400 italic">No employees match these filters.</p>
                  )}
                  {!previewLoading && filteredPreview && filteredPreview.totalCount > 0 && (
                    <div className="bg-white border border-gray-200 rounded text-xs max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">ID</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Name</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Primary Skill</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">New Skill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPreview.data.slice(0, 10).map((emp: any) => (
                            <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-blue-50">
                              <td className="px-2 py-1 text-gray-600 font-mono">{emp.employee_id}</td>
                              <td className="px-2 py-1 text-gray-700 font-medium">{emp.name}</td>
                              <td className="px-2 py-1 text-gray-500">{emp.primary_skill || emp.skill || '—'}</td>
                              <td className="px-2 py-1 text-blue-700 font-medium">{updateSkill.trim() || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredPreview.totalCount > 10 && (
                        <p className="px-2 py-1 text-xs text-gray-400 bg-gray-50">…and {filteredPreview.totalCount - 10} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Remove Updated Skill Form ── */}
            <div className="bg-red-50 rounded-lg p-4 space-y-3 border border-red-100">
              <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <Trash2 size={14} /> Remove Updated Skill
              </h4>
              <p className="text-xs text-gray-500">Revert the updated skill back to each employee's original primary skill. Filter to target specific employees.</p>

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
                    {practices.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select value={removeFilters.grade} onChange={e => setRemoveFilters(f => ({ ...f, grade: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All Grades</option>
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NEW BU</label>
                  <select value={removeFilters.cu} onChange={e => setRemoveFilters(f => ({ ...f, cu: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All NEW BUs</option>
                    {cus.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
                  <select value={removeFilters.region} onChange={e => setRemoveFilters(f => ({ ...f, region: e.target.value }))}
                    className={`${selectCls} w-full`}>
                    <option value="">All Regions</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
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

              {/* Preview of matching employees for removal */}
              {hasRemoveFilters && (() => {
                const previewRows = removeFilters.skill
                  ? (removePreview?.data || []).filter((emp: any) =>
                      (emp.skill || '').toLowerCase().includes(removeFilters.skill.toLowerCase())
                    )
                  : (removePreview?.data || []);
                return (
                  <div className="mt-4 pt-4 border-t border-red-200 space-y-2">
                    <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                      {removePreviewLoading
                        ? <><Loader2 size={12} className="animate-spin" /> Loading preview…</>
                        : <>🔄 {previewRows.length} employee{previewRows.length !== 1 ? 's' : ''} will be reverted</>}
                    </p>
                    {!removePreviewLoading && previewRows.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No employees match these filters.</p>
                    )}
                    {!removePreviewLoading && previewRows.length > 0 && (
                      <div className="bg-white border border-red-200 rounded text-xs max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-red-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1 text-left text-gray-600 font-semibold">ID</th>
                              <th className="px-2 py-1 text-left text-gray-600 font-semibold">Name</th>
                              <th className="px-2 py-1 text-left text-gray-600 font-semibold">Primary Skill</th>
                              <th className="px-2 py-1 text-left text-gray-600 font-semibold">New Skill</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.slice(0, 10).map((emp: any) => (
                              <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-red-50">
                                <td className="px-2 py-1 text-gray-600 font-mono">{emp.employee_id}</td>
                                <td className="px-2 py-1 text-gray-700 font-medium">{emp.name}</td>
                                <td className="px-2 py-1 text-indigo-700">{emp.primary_skill || '—'}</td>
                                <td className="px-2 py-1 text-red-700">{emp.updated_skill || (emp.skill !== emp.primary_skill ? emp.skill : '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {previewRows.length > 10 && (
                          <p className="px-2 py-1 text-xs text-gray-400 bg-red-50">…and {previewRows.length - 10} more</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}
      </div>

      {/* ── Update Result Modal ── */}
      {showUpdateResult && updateResultData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">✅ Skill Updated Successfully</h2>
              <button onClick={() => setShowUpdateResult(false)} className="text-white hover:bg-green-700 rounded-full p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 py-3 bg-green-50 border-b border-green-200">
              <p className="text-sm font-semibold text-green-800">
                Skill updated to: <span className="bg-green-200 px-2 py-0.5 rounded">{updateResultData.skill}</span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Grade</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Practice</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Primary Skill</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">New Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {updateResultData.employees.map((emp: any) => (
                    <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-green-50">
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">{emp.employee_id}</td>
                      <td className="px-4 py-2 font-medium text-gray-800 text-xs">{emp.name}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{emp.grade}</span></td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{emp.practice}</td>
                      <td className="px-4 py-2 text-xs"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{emp.primary_skill || '—'}</span></td>
                      <td className="px-4 py-2 text-xs"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">{emp.skill}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowUpdateResult(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Table ── */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{visibleCols.length} columns shown</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            benchOnly ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {benchOnly ? `${employees.length} records` : `${pagination.totalRecords.toLocaleString()} records`}
          </span>
        </div>

        {viewIsLoading ? (
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
          <div className="relative transition-opacity duration-200" style={{ opacity: viewIsFetching ? 0.6 : 1 }}>
            {viewIsFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg pointer-events-none" style={{ minHeight: 120 }}>
                <Loader2 className="animate-spin" style={{ color: '#0070AD' }} size={28} />
              </div>
            )}
            {viewMode === 'list' ? (
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
                  <tr key={emp.employee_id}
                    className={`border-b border-gray-100 transition-colors ${benchOnly ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}>
                    {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => {
                      // ── special renderers ──────────────────────────────
                      if (col.key === 'employee_id') return (
                        <td key={col.key} className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{emp.employee_id}</td>
                      );
                      if (col.key === 'name') return (
                        <td key={col.key} className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{emp.name}</td>
                      );
                      if (col.key === 'grade') return (
                        <td key={col.key} className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.grade}</span>
                        </td>
                      );
                      if (col.key === 'primary_skill') return (
                        <td key={col.key} className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1 group">
                            {(emp.primary_skill || emp.skill)
                              ? <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{emp.primary_skill || emp.skill}</span>
                              : <span className="text-gray-300">—</span>}
                          </div>
                        </td>
                      );
                      if (col.key === 'new_skill' || col.key === 'skill') return (
                        <td key={col.key} className="px-4 py-3 text-xs">
                          {editingSkillId === emp.employee_id ? (
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
                            <div className="flex items-center gap-1 group">
                              {(emp.skill && emp.skill !== emp.primary_skill)
                                ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{emp.skill}</span>
                                : <span className="text-gray-300">—</span>}
                              {
                                <button
                                  onClick={() => { setEditingSkillId(emp.employee_id); setEditingSkillValue(emp.skill || emp.primary_skill || ''); }}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                  title="Edit skill"
                                >
                                  <Pencil size={11} />
                                </button>
                              }
                            </div>
                          )}
                        </td>
                      );
                      if (col.key === 'status') return (
                        <td key={col.key} className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{emp.status || 'active'}</span>
                        </td>
                      );
                      if (col.key === 'current_pm_id') return (
                        <td key={col.key} className="px-4 py-3 text-xs">
                          {emp.current_pm_id
                            ? <span className="text-green-600 font-medium">Assigned</span>
                            : <span className="text-orange-500">Unassigned</span>}
                        </td>
                      );
                      if (col.key === 'bench_status') return (
                        <td key={col.key} className="px-4 py-3">
                          {emp.bench_status
                            ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{emp.bench_status}</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      );
                      if (col.key === 'is_new_joiner' || col.key === 'is_frozen') return (
                        <td key={col.key} className="px-4 py-3 text-xs text-gray-500">
                          {emp[col.key] ? <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Yes</span> : <span className="text-gray-300">No</span>}
                        </td>
                      );
                      if (col.key === 'pm_is_active') return (
                        <td key={col.key} className="px-4 py-3 text-xs">
                          {emp[col.key] === false
                            ? <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">Inactive</span>
                            : emp[col.key] === true
                              ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>
                              : <span className="text-gray-300">—</span>}
                        </td>
                      );
                      if (col.key === 'pm_reportee_count' || col.key === 'pm_max_capacity') return (
                        <td key={col.key} className="px-4 py-3 text-xs text-center text-gray-600">
                          {emp[col.key] ?? '—'}
                        </td>
                      );
                      if (col.key === 'pm_name') return (
                        <td key={col.key} className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                          {emp.pm_name
                            ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>{emp.pm_name}</span>
                            : <span className="text-gray-300">Unassigned</span>}
                        </td>
                      );
                      // ── default plain-text renderer ────────────────────
                      return (
                        <td key={col.key} className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {emp[col.key] ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Bars */}
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              {/* Skill Search Bar */}
              <div className="flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search skills... (e.g., Java, Python, Cloud)"
                  value={skillSearchQuery}
                  onChange={e => setSkillSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {skillSearchQuery && (
                  <button
                    onClick={() => setSkillSearchQuery('')}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Employee Name Search Bar */}
              <div className="flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee name..."
                  value={employeeNameSearchQuery}
                  onChange={e => setEmployeeNameSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {employeeNameSearchQuery && (
                  <button
                    onClick={() => setEmployeeNameSearchQuery('')}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Skills Display */}
            <div className="divide-y divide-gray-200">
            {employeesBySkill.map(({ skill, rows }) => {
              const visibleRows = rowsPerSkillGroup === 'all' ? rows : rows.slice(0, rowsPerSkillGroup);
              return (
              <div key={skill} className="p-4 md:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800">{skill}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportSkillGroupToCSV(skill, rows)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-white rounded"
                      style={{ backgroundColor: '#0070AD' }}
                    >
                      <Download size={12} /> Export
                    </button>
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
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {(benchOnly
                          ? ['ID','Name','Grade','Practice','NEW BU','Region','Primary Skill','New Skill','Bench Status']
                          : ['ID','Name','Grade','Practice','NEW BU','Region','Account','Primary Skill','New Skill','Status','PM']
                        ).map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((emp: any) => (
                        <tr key={`${skill}-${emp.employee_id}`} className="border-b border-gray-100 hover:bg-gray-50 last:border-b-0">
                          <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{emp.employee_id}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{emp.name}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{emp.grade}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">{emp.practice}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{emp.cu}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{emp.region}</td>
                          {!benchOnly && <td className="px-4 py-2.5 text-gray-500 text-xs">{emp.account || '—'}</td>}
                          {/* Primary Skill */}
                          <td className="px-4 py-2.5 text-xs">
                            {(emp.primary_skill || emp.skill)
                              ? <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{emp.primary_skill || emp.skill}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          {/* New Skill (editable) */}
                          <td className="px-4 py-2.5 text-xs">
                            {editingSkillId === emp.employee_id ? (
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
                            )}
                          </td>
                          {benchOnly ? (
                            <td className="px-4 py-2.5">
                              {emp.bench_status
                                ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{emp.bench_status}</span>
                                : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                          ) : (
                            <>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>{emp.status || 'active'}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs">
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
                {rowsPerSkillGroup !== 'all' && rows.length > rowsPerSkillGroup && (
                  <p className="text-xs text-gray-400 text-right">
                    Showing {visibleRows.length} of {rows.length}
                  </p>
                )}
              </div>
            );})}
            </div>
            </div>
        )}
          </div>
        )}

        {!isSkillView && pagination.totalRecords > 0 && (
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
      setDatasetScope((result as any).dataset_scope || null);
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
    { header: 'NEW BU', accessor: 'cu' as const },
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
                            <div><span className="text-gray-400">NEW BU: </span><span className="font-medium text-gray-700">{match.pm.cu}</span></div>
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

// ─── Skill Management tab ────────────────────────────────────────────────────
export function SkillManagement() {
  const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  const { data: filterOpts } = useGetPracticeFiltersQuery();
  const practices = filterOpts?.practices?.filter((p: string) => p !== 'All') ?? [];
  const cus       = filterOpts?.cus?.filter((c: string) => c !== 'All') ?? [];
  const regions   = filterOpts?.regions?.filter((r: string) => r !== 'All') ?? [];

  const { data: coverage } = useGetSkillManagementCoverageQuery();

  // ── Update Skills state ──
  const [updateSkill, setUpdateSkill]     = useState('');
  const [updateFilters, setUpdateFilters] = useState({ practice: '', cu: '', region: '', grade: '' });
  const [updateMsg, setUpdateMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [doBulkUpdate, { isLoading: updatingSkill }] = useBulkUpdateEmployeeSkillsMutation();

  const hasUpdateFilters = updateFilters.practice || updateFilters.cu || updateFilters.region || updateFilters.grade;
  const { data: filteredPreview, isFetching: previewLoading } = useGetFilteredEmployeesForSkillUpdateQuery(
    updateFilters,
    { skip: !hasUpdateFilters },
  );

  const handleBulkUpdate = async () => {
    if (!updateSkill.trim()) { setUpdateMsg({ type: 'error', text: 'Please enter a skill to update.' }); return; }
    try {
      await doBulkUpdate({ skill: updateSkill.trim(), ...updateFilters }).unwrap();
      setUpdateMsg({ type: 'success', text: `Skill updated to "${updateSkill.trim()}" successfully.` });
      setUpdateSkill('');
      setUpdateFilters({ practice: '', cu: '', region: '', grade: '' });
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err?.data?.error || 'Update failed.' });
    }
  };

  // ── Remove Skills state ──
  const [removeFilters, setRemoveFilters] = useState({ skill: '', practice: '', cu: '', region: '', grade: '' });
  const [removeMsg, setRemoveMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [doRemoveSkill, { isLoading: removingSkill }] = useRemoveEmployeeSkillMutation();

  const hasRemoveFilters = removeFilters.skill || removeFilters.practice || removeFilters.cu || removeFilters.region || removeFilters.grade;
  const { data: removePreview, isFetching: removePreviewLoading } = useGetFilteredEmployeesForSkillUpdateQuery(
    { practice: removeFilters.practice, cu: removeFilters.cu, region: removeFilters.region, grade: removeFilters.grade },
    { skip: !hasRemoveFilters },
  );

  const handleRemoveSkill = async () => {
    try {
      await doRemoveSkill(removeFilters).unwrap();
      setRemoveMsg({ type: 'success', text: 'Skill reverted to primary skill successfully.' });
      setRemoveFilters({ skill: '', practice: '', cu: '', region: '', grade: '' });
    } catch (err: any) {
      setRemoveMsg({ type: 'error', text: err?.data?.error || 'Remove failed.' });
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Coverage Summary ── */}
      {coverage && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">📊 Data Coverage</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{coverage.practices}</div>
              <div className="text-xs text-gray-600 mt-1">Practices</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{coverage.grades}</div>
              <div className="text-xs text-gray-600 mt-1">Grades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{coverage.cus}</div>
              <div className="text-xs text-gray-600 mt-1">BUs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{coverage.regions}</div>
              <div className="text-xs text-gray-600 mt-1">Regions</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-700 text-center font-medium">
            Total Active Employees: <span className="text-blue-700 font-bold">{coverage.totalEmployees?.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Update Skills ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <RefreshCcw size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">Update Skills</h3>
          </div>
          <p className="text-xs text-gray-500">Set a new skill for employees. Each employee's original primary skill is preserved and will NOT be overwritten.</p>

          {updateMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
              updateMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {updateMsg.text}
              <button onClick={() => setUpdateMsg(null)} className="ml-2 underline text-xs">Dismiss</button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Skill *</label>
            <input
              value={updateSkill}
              onChange={e => setUpdateSkill(e.target.value)}
              placeholder="e.g. Python, Java, Cloud..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Practice (optional)</label>
              <select value={updateFilters.practice} onChange={e => setUpdateFilters(f => ({ ...f, practice: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Practices</option>
                {practices.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade (optional)</label>
              <select value={updateFilters.grade} onChange={e => setUpdateFilters(f => ({ ...f, grade: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Grades</option>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BU (optional)</label>
              <select value={updateFilters.cu} onChange={e => setUpdateFilters(f => ({ ...f, cu: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All BUs</option>
                {cus.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Region (optional)</label>
              <select value={updateFilters.region} onChange={e => setUpdateFilters(f => ({ ...f, region: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Regions</option>
                {regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Preview of matching employees */}
          {hasUpdateFilters && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200 flex items-center gap-1">
                {previewLoading
                  ? <><Loader2 size={12} className="animate-spin" /> Loading preview…</>
                  : <>👥 {filteredPreview?.totalCount ?? 0} employee{filteredPreview?.totalCount !== 1 ? 's' : ''} will be updated</>}
              </div>
              {!previewLoading && filteredPreview && filteredPreview.totalCount === 0 && (
                <p className="px-3 py-3 text-xs text-gray-400 italic">No employees match these filters.</p>
              )}
              {!previewLoading && filteredPreview && filteredPreview.totalCount > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">ID</th>
                        <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Name</th>
                        <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Primary Skill</th>
                        <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">New Skill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreview.data.slice(0, 10).map((emp: any) => (
                        <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-blue-50">
                          <td className="px-3 py-1.5 text-gray-500 font-mono">{emp.employee_id}</td>
                          <td className="px-3 py-1.5 text-gray-700 font-medium">{emp.name}</td>
                          <td className="px-3 py-1.5 text-gray-500">{emp.primary_skill || emp.skill || '—'}</td>
                          <td className="px-3 py-1.5 text-blue-700 font-medium">{updateSkill.trim() || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPreview.totalCount > 10 && (
                    <p className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50">…and {filteredPreview.totalCount - 10} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleBulkUpdate}
            disabled={updatingSkill || !updateSkill.trim()}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center transition-opacity"
            style={{ backgroundColor: '#0070AD' }}
          >
            {updatingSkill ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            {updatingSkill ? 'Updating...' : 'Update Skills'}
          </button>
        </div>

        {/* ── Remove Skills ── */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-red-100">
            <Trash2 size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-800">Remove Skills</h3>
          </div>
          <p className="text-xs text-gray-500">Revert the updated skill back to each employee's original primary skill. Use filters to target specific employees.</p>

          {removeMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
              removeMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {removeMsg.text}
              <button onClick={() => setRemoveMsg(null)} className="ml-2 underline text-xs">Dismiss</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
              <select value={removeFilters.practice} onChange={e => setRemoveFilters(f => ({ ...f, practice: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Practices</option>
                {practices.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
              <select value={removeFilters.grade} onChange={e => setRemoveFilters(f => ({ ...f, grade: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Grades</option>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BU</label>
              <select value={removeFilters.cu} onChange={e => setRemoveFilters(f => ({ ...f, cu: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All BUs</option>
                {cus.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <select value={removeFilters.region} onChange={e => setRemoveFilters(f => ({ ...f, region: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">All Regions</option>
                {regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleRemoveSkill}
            disabled={removingSkill}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center hover:bg-red-700 transition-colors"
          >
            {removingSkill ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {removingSkill ? 'Reverting...' : 'Remove Updated Skill'}
          </button>

          {/* Preview of employees to be reverted */}
          {hasRemoveFilters && (() => {
            const previewRows = removeFilters.skill
              ? (removePreview?.data || []).filter((emp: any) =>
                  (emp.skill || '').toLowerCase().includes(removeFilters.skill.toLowerCase())
                )
              : (removePreview?.data || []);
            return (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 border-b border-red-200 flex items-center gap-1">
                  {removePreviewLoading
                    ? <><Loader2 size={12} className="animate-spin" /> Loading preview…</>
                    : <>🔄 {previewRows.length} employee{previewRows.length !== 1 ? 's' : ''} will be reverted</>}
                </div>
                {!removePreviewLoading && previewRows.length === 0 && (
                  <p className="px-3 py-3 text-xs text-gray-400 italic">No employees match these filters.</p>
                )}
                {!removePreviewLoading && previewRows.length > 0 && (
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">ID</th>
                          <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Name</th>
                          <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">Primary Skill</th>
                          <th className="px-3 py-1.5 text-left text-gray-600 font-semibold">New Skill</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.slice(0, 10).map((emp: any) => (
                          <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-red-50">
                            <td className="px-3 py-1.5 text-gray-500 font-mono">{emp.employee_id}</td>
                            <td className="px-3 py-1.5 text-gray-700 font-medium">{emp.name}</td>
                            <td className="px-3 py-1.5 text-indigo-700">{emp.primary_skill || '—'}</td>
                            <td className="px-3 py-1.5 text-red-700">{emp.updated_skill || (emp.skill !== emp.primary_skill ? emp.skill : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewRows.length > 10 && (
                      <p className="px-3 py-1.5 text-xs text-gray-400 bg-red-50">…and {previewRows.length - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
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
  const { title, sub } = TAB_TITLES[activeTab];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{sub}</p>
      </div>
      <TabBar tabs={TABS} active={activeTab} onChange={t => setActiveTab(t as any)} />
      {activeTab === 'employees' && <EmployeeTable />}
      {activeTab === 'bench' && <EmployeeTable benchOnly />}
      {activeTab === 'new-joiners' && <NewJoiners />}
      {activeTab === 'separations' && <Separations />}
    </div>
  );
}
