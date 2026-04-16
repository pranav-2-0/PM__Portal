import TabBar from '../components/TabBar';
import { useState, useMemo } from 'react';
import { useGetPMsListQuery, useGetPracticeFiltersQuery, useGetPMReportSummaryQuery, useGetGradewisePMCapacityQuery } from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENT_ID_TO_PRACTICE } from '../constants/practices';
import {
  FileText, Filter, Download, Loader2, UserCog, Users, AlertTriangle,
  TrendingUp, Calendar, ChevronDown, ChevronUp, Search, RefreshCw, Award,
  Briefcase, MapPin, Activity, Eye, X
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import Pagination from '../components/Pagination';
import PMReportModal from '../components/PMReportModal';

type TabId = 'pm-report' | 'gradewise';

const PM_TABS = [
  { id: 'pm-report', label: 'PM Report' },
  { id: 'gradewise', label: 'Gradewise Capacity' },
];


// ─── helpers ──────────────────────────────────────────────────────────────────
const utilColor = (u: number) => {
  if (u >= 100) return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Over capacity' };
  if (u >= 80)  return { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', label: 'High' };
  if (u >= 50)  return { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'Optimal' };
  return { bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700', label: 'Under-utilised' };
};

const lwdUrgency = (lwd: string) => {
  const days = differenceInDays(new Date(lwd), new Date());
  if (days < 0)   return { cls: 'bg-gray-100 text-gray-600', label: 'Past LWD' };
  if (days <= 7)  return { cls: 'bg-red-100 text-red-700', label: `${days}d — Critical!` };
  if (days <= 30) return { cls: 'bg-orange-100 text-orange-700', label: `${days}d — Urgent` };
  return { cls: 'bg-yellow-100 text-yellow-700', label: `${days}d remaining` };
};

// ─── PM Report tab ────────────────────────────────────────────────────────────
type ViewFilter = 'all' | 'allocated' | 'unallocated' | 'incorrect';

function PMReportTab() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const selectedDepartmentLabel = isSuperAdmin && selectedDepartment ? DEPARTMENT_ID_TO_PRACTICE[selectedDepartment] : null;
  
  const [filters, setFilters] = useState({ is_active: 'true', practice: '', cu: '', region: '', grade: '', skill: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedPM, setSelectedPM] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'reportee_count'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeView, setActiveView] = useState<ViewFilter>('all');

  const { data: response, isLoading, refetch } = useGetPMsListQuery({ 
    ...filters, 
    view_filter: activeView !== 'all' ? activeView : undefined, 
    page, 
    pageSize,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });
  const { data: filterOptions } = useGetPracticeFiltersQuery();
  const { data: reportSummary } = useGetPMReportSummaryQuery({ 
    ...filters,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });

  const pms = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  const stats = useMemo(() => {
    const critical = pms.filter(pm => pm.separation_lwd && differenceInDays(new Date(pm.separation_lwd), new Date()) >= 0 && differenceInDays(new Date(pm.separation_lwd), new Date()) <= 30).length;
    const overCapacity = pms.filter(pm => (pm.utilization ?? 0) >= 100).length;
    const totalReportees = pms.reduce((s, pm) => s + (pm.reportee_count || 0), 0);
    const avgUtil = pms.length > 0 ? Math.round(pms.reduce((s, pm) => s + (pm.utilization ?? 0), 0) / pms.length) : 0;
    return { critical, overCapacity, totalReportees, avgUtil };
  }, [pms]);

  const sorted = useMemo(() => [...pms].sort((a, b) => {
    let va: any = (a as any)[sortBy] ?? ''; let vb: any = (b as any)[sortBy] ?? '';
    if (typeof va === 'string') va = va.toLowerCase(); if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1; if (va > vb) return sortDir === 'asc' ? 1 : -1; return 0;
  }), [pms, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } };
  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : <ChevronDown className="w-3 h-3 inline opacity-30" />;
  const setFilter = (k: string, v: string) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); setActiveView('all'); };
  const handleViewChange = (view: ViewFilter) => { setActiveView(prev => prev === view ? 'all' : view); setPage(1); };

  const exportCSV = () => {
    if (!pms.length) return;
    const headers = ['GGID','Name','Email','Grade','Practice','CU','Region','Skill','Reportees','Max Capacity','Utilization %','Separation LWD','Status'];
    const rows = pms.map(pm => [pm.employee_id, pm.name, pm.email, pm.grade, pm.practice, pm.cu, pm.region, pm.skill || '', pm.reportee_count, (pm.spec_capacity_cap ?? pm.max_capacity ?? 10), pm.utilization ?? '', pm.separation_lwd ? format(new Date(pm.separation_lwd), 'yyyy-MM-dd') : '', pm.is_active ? 'Active' : 'Inactive']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `PM_Report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      {selectedDepartmentLabel && (
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Showing data for department: <span className="ml-2 font-semibold">{selectedDepartmentLabel}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"><RefreshCw className="w-4 h-4" /> Refresh</button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm" style={{ backgroundColor: '#0070AD' }}><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-green-600" /><p className="text-xs text-gray-500">Reportees (page)</p></div><p className="text-2xl font-bold text-green-700">{stats.totalReportees}</p></div>
        <div className="bg-white rounded-lg shadow-sm border p-4"><div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-blue-600" /><p className="text-xs text-gray-500">Avg Utilization</p></div><p className="text-2xl font-bold text-blue-700">{stats.avgUtil}%</p></div>
        <div className="bg-white rounded-lg shadow-sm border p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-red-500" /><p className="text-xs text-gray-500">Over Capacity</p></div><p className="text-2xl font-bold text-red-600">{stats.overCapacity}</p></div>
        <div className="bg-white rounded-lg shadow-sm border p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-500" /><p className="text-xs text-gray-500">Separating Soon</p></div><p className="text-2xl font-bold text-orange-600">{stats.critical}</p></div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-gray-500" /><h3 className="font-semibold text-gray-700 text-sm">Filters</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={filters.is_active} onChange={e => setFilter('is_active', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]">
              <option value="true">Active</option><option value="false">Inactive</option><option value="">All</option></select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
            <select value={filters.practice} onChange={e => setFilter('practice', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]">
              <option value="">All Practices</option>{filterOptions?.practices?.filter((p: string) => p !== 'All').map((p: string) => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">CU</label>
            <select value={filters.cu} onChange={e => setFilter('cu', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]">
              <option value="">All CUs</option>{filterOptions?.cus?.filter((c: string) => c !== 'All').map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
            <input type="text" value={filters.grade} onChange={e => setFilter('grade', e.target.value)} placeholder="e.g. D1, C2" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Skill</label>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" /><input type="text" value={filters.skill} onChange={e => setFilter('skill', e.target.value)} placeholder="Search skill..." className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]" /></div></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
            <select value={filters.region} onChange={e => setFilter('region', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]">
              <option value="">All Regions</option>{filterOptions?.regions?.filter((r: string) => r !== 'All').map((r: string) => <option key={r} value={r}>{r}</option>)}</select></div>
        </div>
      </div>

      {/* View filter pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([['all','Total PMs','gray',reportSummary?.totalPMs ?? pagination.totalRecords],['allocated','Allocated PMs','green',reportSummary?.allocatedPMs ?? '—'],['unallocated','Unallocated PMs','blue',reportSummary?.unallocatedPMs ?? '—'],['incorrect','Incorrect Mappings','red',reportSummary?.incorrectMappings ?? '—']] as any[]).map(([view, label, color, val]) => (
          <button key={view} onClick={() => handleViewChange(view as ViewFilter)}
            className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${activeView === view ? `border-${color}-500 ring-2 ring-${color}-200` : 'border-transparent'}`}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold text-${color === 'gray' ? 'gray-800' : `${color}-600`}`}>{val}</p>
          </button>
        ))}
      </div>

      {/* Alert */}
      {stats.critical > 0 && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800"><strong>{stats.critical} PM{stats.critical > 1 ? 's' : ''}</strong> on this page have LWD within 30 days — their reportees will need reassignment soon.</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 animate-spin text-[#0070AD]" /></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16"><UserCog className="w-14 h-14 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No People Managers found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><button className="flex items-center gap-1" onClick={() => toggleSort('name')}>PM <SortIcon col="name" /></button></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><div className="flex items-center gap-1"><Award className="w-3 h-3" /> Grade</div></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><div className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Practice</div></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Region</div></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Skill</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"><button className="flex items-center gap-1 mx-auto" onClick={() => toggleSort('reportee_count')}><Users className="w-3 h-3" /> Reportees <SortIcon col="reportee_count" /></button></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><button className="flex items-center gap-1" onClick={() => toggleSort('utilization')}><Activity className="w-3 h-3" /> Utilization <SortIcon col="utilization" /></button></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> LWD</div></th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(pm => {
                  const util = pm.utilization ?? 0; const uColors = utilColor(util);
                  return (
                    <tr key={pm.employee_id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3"><div className="font-semibold text-gray-800">{pm.name || '—'}</div><div className="text-xs text-gray-400 font-mono">{pm.employee_id}</div><div className="text-xs text-gray-400 truncate max-w-[180px]">{pm.email}</div></td>
                      <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{pm.grade || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[130px]"><span className="truncate block">{pm.practice || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[110px]"><span className="truncate block">{pm.cu || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{pm.region || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px]"><span className="truncate block">{pm.skill || '—'}</span></td>
                      <td className="px-4 py-3 text-center"><span className="font-bold text-gray-700">{pm.reportee_count}</span><span className="text-gray-400 text-xs"> / {(pm.spec_capacity_cap ?? pm.max_capacity ?? 10)}</span></td>
                      <td className="px-4 py-3 min-w-[140px]"><div className="flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${uColors.bar}`} style={{ width: `${Math.min(util, 100)}%` }} /></div><span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${uColors.badge}`}>{util}%</span></div><p className="text-xs text-gray-400 mt-0.5">{uColors.label}</p></td>
                      <td className="px-4 py-3">{pm.separation_lwd ? (() => { const urg = lwdUrgency(pm.separation_lwd); return <div><div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" /><span className="text-xs text-gray-700 font-medium">{format(new Date(pm.separation_lwd), 'dd MMM yyyy')}</span></div><span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${urg.cls}`}>{urg.label}</span></div>; })() : <span className="text-xs text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-center"><button onClick={() => setSelectedPM({ id: pm.employee_id, name: pm.name || pm.employee_id })} className="inline-flex items-center justify-center w-8 h-8 text-white rounded-md shadow-sm hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg,#12ABDB 0%,#0070AD 100%)' }}><Eye className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalRecords > 0 && (
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalRecords={pagination.totalRecords} pageSize={pagination.pageSize}
            onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
        )}
      </div>
      {selectedPM && <PMReportModal pmId={selectedPM.id} pmName={selectedPM.name} onClose={() => setSelectedPM(null)} />}
    </div>
  );
}

// ─── Gradewise Capacity tab ───────────────────────────────────────────────────
const utilizationColor = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500';
const utilizationTextColor = (pct: number) => pct >= 90 ? 'text-red-700 bg-red-100' : pct >= 80 ? 'text-orange-700 bg-orange-100' : 'text-green-700 bg-green-100';

const UtilizationBar = ({ pct }: { pct: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]"><div className={`h-2 rounded-full transition-all ${utilizationColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${utilizationTextColor(pct)}`}>{pct?.toFixed(0) ?? 0}%</span>
  </div>
);
const DRILL_PAGE_SIZE = 25;

function GradewiseTab() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const selectedDepartmentLabel = isSuperAdmin && selectedDepartment ? DEPARTMENT_ID_TO_PRACTICE[selectedDepartment] : null;
  
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPractice, setFilterPractice] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterUtil, setFilterUtil] = useState('');
  const [drillPage, setDrillPage] = useState(1);

  const { data: overviewData, isLoading: overviewLoading } = useGetGradewisePMCapacityQuery(
    isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}
  );
  const { data: drilldownData, isLoading: drilldownLoading } = useGetGradewisePMCapacityQuery(
    { 
      grade: selectedGrade!,
      ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
    },
    { skip: !selectedGrade }
  );

  const overview  = overviewData?.grades ?? [];
  const drilldown = drilldownData?.pms   ?? [];

  const practiceOptions = [...new Set(drilldown.map((r: any) => r.practice).filter(Boolean))].sort() as string[];
  const locationOptions = [...new Set(drilldown.map((r: any) => r.location).filter(Boolean))].sort() as string[];
  const skillOptions    = [...new Set(drilldown.map((r: any) => r.skill).filter(Boolean))].sort()    as string[];

  const clearFilters = () => {
    setSearch(''); setFilterPractice(''); setFilterLocation('');
    setFilterSkill(''); setFilterUtil(''); setDrillPage(1);
  };
  const hasFilters = !!(search || filterPractice || filterLocation || filterSkill || filterUtil);

  const filteredDrilldown = drilldown.filter((pm: any) => {
    const pct = parseFloat(pm.utilization_pct ?? 0);
    if (search && !pm.name?.toLowerCase().includes(search.toLowerCase()) && !pm.employee_id?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPractice && pm.practice !== filterPractice) return false;
    if (filterLocation && pm.location !== filterLocation) return false;
    if (filterSkill    && pm.skill    !== filterSkill)    return false;
    if (filterUtil === 'over' && pct < 90)                return false;
    if (filterUtil === 'near' && (pct < 80 || pct >= 90)) return false;
    if (filterUtil === 'ok'   && pct >= 80)               return false;
    return true;
  });

  const drillTotalPages = Math.max(1, Math.ceil(filteredDrilldown.length / DRILL_PAGE_SIZE));
  const pagedDrilldown  = filteredDrilldown.slice((drillPage - 1) * DRILL_PAGE_SIZE, drillPage * DRILL_PAGE_SIZE);

  const totalPMs        = overview.reduce((s: number, r: any) => s + (r.total_pms      ?? 0), 0);
  const totalCapacity   = overview.reduce((s: number, r: any) => s + (r.total_capacity  ?? 0), 0);
  const totalReportees  = overview.reduce((s: number, r: any) => s + (r.total_reportees ?? 0), 0);
  const overallUtil     = totalCapacity > 0 ? (totalReportees / totalCapacity) * 100 : 0;

  const exportCSV = () => {
    if (selectedGrade && filteredDrilldown.length > 0) {
      const headers = ['PM ID','PM Name','Email','Practice','Sub-Practice','Location','Skill','Reportees','Max Capacity','Utilization %','Status'];
      const rows = filteredDrilldown.map((r: any) =>
        [r.employee_id, `"${(r.name||'').replace(/"/g,'""')}"`, r.email||'', r.practice, r.sub_practice||'', r.location||'', r.skill||'', r.reportee_count, r.max_capacity, r.utilization_pct??0, r.status].join(',')
      );
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `gradewise_${selectedGrade}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Grade','Total PMs','Total Capacity','Allocated','Available','Utilization %'];
      const rows    = overview.map((r: any) =>
        [r.grade, r.total_pms, r.total_capacity, r.total_reportees, r.available_capacity, r.utilization_pct??0].join(',')
      );
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'gradewise_pm_capacity.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {selectedDepartmentLabel && (
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Showing data for department: <span className="ml-2 font-semibold">{selectedDepartmentLabel}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedGrade && (
            <button
              onClick={() => { setSelectedGrade(null); clearFilters(); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0070AD]"
            >
              ← Back
            </button>
          )}
          {selectedGrade && (
            <span className="text-sm text-gray-600 font-medium">
              Grade {selectedGrade} — {drilldown.length} PMs
            </span>
          )}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm"
          style={{ backgroundColor: '#0070AD' }}
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary cards — overview only */}
      {!selectedGrade && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Active PMs</p>
            <p className="text-3xl font-bold text-gray-800">{totalPMs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Capacity</p>
            <p className="text-3xl font-bold text-gray-800">{totalCapacity.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Allocated Reportees</p>
            <p className="text-3xl font-bold text-blue-700">{totalReportees.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overall Utilization</p>
            <p className={`text-3xl font-bold ${overallUtil >= 90 ? 'text-red-600' : overallUtil >= 80 ? 'text-orange-500' : 'text-green-600'}`}>
              {overallUtil.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Overview table */}
      {!selectedGrade && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={18} style={{ color: '#0070AD' }} />
            <h2 className="font-semibold text-gray-800">Capacity by Grade</h2>
            <span className="text-xs text-gray-400 ml-1">Click a row to drill down</span>
          </div>

          {overviewLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : overview.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No PM data found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Grade','Total PMs','Total Capacity','Allocated','Available','Utilization',''].map(h => (
                    <th key={h} className="px-6 py-3 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.map((row: any) => (
                  <tr
                    key={row.grade}
                    onClick={() => { setSelectedGrade(row.grade); clearFilters(); }}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-[#0070AD] text-white">
                        {row.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800">{row.total_pms}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{row.total_capacity}</td>
                    <td className="px-6 py-4 text-right text-blue-700 font-medium">{row.total_reportees}</td>
                    <td className="px-6 py-4 text-right text-green-700 font-medium">{row.available_capacity}</td>
                    <td className="px-6 py-4"><UtilizationBar pct={parseFloat(row.utilization_pct ?? 0)} /></td>
                    <td className="px-2 py-4 text-gray-400">&#8250;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Drilldown table */}
      {selectedGrade && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: '#0070AD' }} />
            <h2 className="font-semibold text-gray-800">Grade {selectedGrade} — Individual PMs</h2>
            <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {filteredDrilldown.length} PMs
            </span>
          </div>

          {/* Filter bar */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name / ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setDrillPage(1); }}
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] w-48"
              />
            </div>
            <select value={filterPractice} onChange={e => { setFilterPractice(e.target.value); setDrillPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[160px]">
              <option value="">All Practices</option>
              {practiceOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setDrillPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[140px]">
              <option value="">All Locations</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filterSkill} onChange={e => { setFilterSkill(e.target.value); setDrillPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[140px]">
              <option value="">All Skills</option>
              {skillOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterUtil} onChange={e => { setFilterUtil(e.target.value); setDrillPage(1); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD]">
              <option value="">All Utilization</option>
              <option value="over">Over Capacity (90%+)</option>
              <option value="near">Near Capacity (80-89%)</option>
              <option value="ok">Available (&lt;80%)</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {drilldownLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : filteredDrilldown.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>{hasFilters ? 'No PMs match filters' : `No active PMs at grade ${selectedGrade}`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['PM ID','Name','Practice','Sub-Practice','Location','Email','Skill','Reportees','Max','Utilization'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedDrilldown.map((pm: any, i: number) => {
                    const pct = parseFloat(pm.utilization_pct ?? 0);
                    return (
                      <tr
                        key={pm.employee_id ?? i}
                        className={`border-b border-gray-100 transition-colors ${
                          pct >= 90 ? 'bg-red-50 hover:bg-red-100' :
                          pct >= 80 ? 'bg-orange-50 hover:bg-orange-100' :
                          'hover:bg-green-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{pm.employee_id}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{pm.name}</td>
                        <td className="px-4 py-3 text-gray-600">{pm.practice}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pm.sub_practice || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pm.location || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          {pm.email
                            ? <a href={`mailto:${pm.email}`} className="text-indigo-600 hover:underline">{pm.email}</a>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pm.skill || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">{pm.reportee_count}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{(pm.spec_capacity_cap ?? pm.max_capacity ?? 10)}</td>
                        <td className="px-4 py-3"><UtilizationBar pct={pct} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {drillTotalPages > 1 && (
                <Pagination
                  currentPage={drillPage}
                  totalPages={drillTotalPages}
                  totalRecords={filteredDrilldown.length}
                  pageSize={DRILL_PAGE_SIZE}
                  onPageChange={setDrillPage}
                  onPageSizeChange={() => {}}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PMManagement() {
  const [activeTab, setActiveTab] = useState<TabId>('pm-report');
  const titles: Record<TabId, { title: string; sub: string }> = {
    'pm-report': { title: 'People Managers', sub: 'Manage and report on all People Managers' },
    'gradewise': { title: 'Gradewise PM Capacity', sub: 'PM capacity and utilization by grade level' },
  };
  const { title } = titles[activeTab];
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><FileText className="w-8 h-8 text-[#0070AD]" />{title}</h1></div>
      <TabBar tabs={PM_TABS} active={activeTab} onChange={id => setActiveTab(id as TabId)} />
      {activeTab === 'pm-report' && <PMReportTab />}
      {activeTab === 'gradewise' && <GradewiseTab />}
    </div>
  );
}
