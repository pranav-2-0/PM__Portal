import { useState, useMemo } from 'react';
import { useGetPMsListQuery, useGetPracticeFiltersQuery, useGetPMReportSummaryQuery } from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from '../utils/rbac';
import {
  FileText, Filter, Download, Loader2, UserCog, Users, AlertTriangle,
  TrendingUp, Calendar, ChevronDown, ChevronUp, Search, RefreshCw, Award,
  Briefcase, MapPin, Activity, Eye
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import Pagination from '../components/Pagination';
import PMReportModal from '../components/PMReportModal';

/* ─── helpers ────────────────────────────────────────────────── */
const utilColor = (u: number) => {
  if (u >= 100) return { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: 'Over capacity' };
  if (u >= 80)  return { bar: 'bg-orange-400',  badge: 'bg-orange-100 text-orange-700', label: 'High'          };
  if (u >= 50)  return { bar: 'bg-green-500',   badge: 'bg-green-100 text-green-700',  label: 'Optimal'       };
  return              { bar: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700',    label: 'Under-utilised' };
};

const lwdUrgency = (lwd: string) => {
  const days = differenceInDays(new Date(lwd), new Date());
  if (days < 0)  return { cls: 'bg-gray-100 text-gray-600',   label: 'Past LWD'              };
  if (days <= 7) return { cls: 'bg-red-100 text-red-700',     label: `${days}d — Critical!`  };
  if (days <= 30)return { cls: 'bg-orange-100 text-orange-700', label: `${days}d — Urgent`   };
  return               { cls: 'bg-yellow-100 text-yellow-700', label: `${days}d remaining`   };
};

/* ─── component ──────────────────────────────────────────────── */
type ViewFilter = 'all' | 'allocated' | 'unallocated' | 'incorrect';

export default function PMReport() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.role);

  const [filters, setFilters] = useState({
    is_active: 'true', practice: '', cu: '', region: '', grade: '', skill: ''
  });
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(50);
  const [selectedPM, setSelectedPM] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy]       = useState<'name' | 'utilization' | 'reportee_count'>('name');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [activeView, setActiveView] = useState<ViewFilter>('all');

  const { data: response, isLoading, refetch } = useGetPMsListQuery({
    is_active:   filters.is_active,
    practice:    filters.practice,
    cu:          filters.cu,
    region:      filters.region,
    grade:       filters.grade,
    skill:       filters.skill,
    view_filter: activeView !== 'all' ? activeView : undefined,
    page,
    pageSize,
    ...(isSuperAdminUser && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });

  const { data: filterOptions } = useGetPracticeFiltersQuery();
  const { data: reportSummary } = useGetPMReportSummaryQuery({
    is_active: filters.is_active,
    practice:  filters.practice,
    cu:        filters.cu,
    region:    filters.region,
    grade:     filters.grade,
    skill:     filters.skill,
    ...(isSuperAdminUser && selectedDepartment ? { department_id: selectedDepartment } : {}),
  });

  const pms        = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  /* ── derived summary stats (from current page data + pagination total) ── */
  const stats = useMemo(() => {
    const separating   = pms.filter(pm => pm.separation_lwd).length;
    const critical     = pms.filter(pm => pm.separation_lwd && differenceInDays(new Date(pm.separation_lwd), new Date()) <= 30 && differenceInDays(new Date(pm.separation_lwd), new Date()) >= 0).length;
    const overCapacity = pms.filter(pm => (pm.utilization ?? 0) >= 100).length;
    const totalReportees = pms.reduce((s, pm) => s + (pm.reportee_count || 0), 0);
    const avgUtil = pms.length > 0
      ? Math.round(pms.reduce((s, pm) => s + (pm.utilization ?? 0), 0) / pms.length)
      : 0;
    return { separating, critical, overCapacity, totalReportees, avgUtil };
  }, [pms]);

  /* ── client-side sort ── */
  const sorted = useMemo(() => {
    return [...pms].sort((a, b) => {
      let va: any = a[sortBy] ?? '';
      let vb: any = b[sortBy] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [pms, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
      : <ChevronDown className="w-3 h-3 inline opacity-30" />;

  const setFilter = (k: string, v: string) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); setActiveView('all'); };
  const handleViewChange = (view: ViewFilter) => { setActiveView(prev => prev === view ? 'all' : view); setPage(1); };

  /* ── export ── */
  const exportCSV = () => {
    if (!pms.length) return;
    const headers = [
      'GGID', 'Name', 'Email', 'Grade', 'Practice', 'CU', 'Region', 'Primary Skill',
      'Reportees', 'Max Capacity', 'Utilization %', 'Separation LWD', 'Separation Status', 'Status'
    ];
    const rows = pms.map(pm => [
      pm.employee_id, pm.name, pm.email, pm.grade, pm.practice, pm.cu, pm.region, pm.skill || '',
      pm.reportee_count, pm.max_capacity, pm.utilization ?? '',
      pm.separation_lwd ? format(new Date(pm.separation_lwd), 'yyyy-MM-dd') : '',
      pm.separation_status || '',
      pm.is_active ? 'Active' : 'Inactive',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `PM_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  /* ─────────────────── render ─────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-[#0070AD]" />
            PM Report
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Comprehensive view across all People Managers — skill, grade, practice, CU mapping
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#0070AD] text-white rounded-md hover:bg-[#005a8a] transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-500 font-medium">Reportees (page)</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.totalReportees}</p>
          <p className="text-xs text-gray-400 mt-1">Across {pms.length} PMs shown</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Avg Utilization</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.avgUtil}%</p>
          <p className="text-xs text-gray-400 mt-1">Across page</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Over Capacity</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overCapacity}</p>
          <p className="text-xs text-gray-400 mt-1">≥ 100% utilization</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-gray-500 font-medium">Separating Soon</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
          <p className="text-xs text-gray-400 mt-1">LWD within 30 days</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filters.is_active}
              onChange={e => setFilter('is_active', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
          {/* Practice */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
            <select
              value={filters.practice}
              onChange={e => setFilter('practice', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Practices</option>
              {filterOptions?.practices?.filter(p => p !== 'All').map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {/* CU */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CU</label>
            <select
              value={filters.cu}
              onChange={e => setFilter('cu', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All CUs</option>
              {filterOptions?.cus?.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
            <input
              type="text"
              value={filters.grade}
              onChange={e => setFilter('grade', e.target.value)}
              placeholder="e.g. D1, C2"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
          {/* Skill */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Skill</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={filters.skill}
                onChange={e => setFilter('skill', e.target.value)}
                placeholder="Search skill..."
                className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
              />
            </div>
          </div>
          {/* Region */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
            <select
              value={filters.region}
              onChange={e => setFilter('region', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Regions</option>
              {filterOptions?.regions?.filter(r => r !== 'All').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── View Filter Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleViewChange('all')}
          className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
            activeView === 'all' ? 'border-gray-700 ring-2 ring-gray-200' : 'border-transparent hover:border-gray-200'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Total PMs</p>
          <p className="text-2xl font-bold text-gray-800">{reportSummary?.totalPMs?.toLocaleString() ?? pagination.totalRecords}</p>
          <p className="text-xs text-gray-400 mt-1">{activeView === 'all' ? '✓ Showing all' : 'Click to show all'}</p>
        </button>
        <button
          onClick={() => handleViewChange('allocated')}
          className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
            activeView === 'allocated' ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent hover:border-green-200'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Allocated PMs</p>
          <p className="text-2xl font-bold text-green-600">{reportSummary?.allocatedPMs ?? '—'}</p>
          <p className="text-xs text-green-400 mt-1">{activeView === 'allocated' ? '✓ Filtered' : 'Have ≥1 reportee'}</p>
        </button>
        <button
          onClick={() => handleViewChange('unallocated')}
          className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
            activeView === 'unallocated' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-blue-200'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Unallocated PMs</p>
          <p className="text-2xl font-bold text-blue-600">{reportSummary?.unallocatedPMs ?? '—'}</p>
          <p className="text-xs text-blue-400 mt-1">{activeView === 'unallocated' ? '✓ Filtered' : 'No reportees yet'}</p>
        </button>
        <button
          onClick={() => handleViewChange('incorrect')}
          className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
            activeView === 'incorrect' ? 'border-red-500 ring-2 ring-red-200' : 'border-transparent hover:border-red-200'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Incorrect Mappings</p>
          <p className="text-2xl font-bold text-red-600">{reportSummary?.incorrectMappings ?? '—'}</p>
          <p className="text-xs text-red-400 mt-1">{activeView === 'incorrect' ? '✓ Filtered' : 'Practice/skill mismatch'}</p>
        </button>
      </div>

      {/* ── Critical Alerts ── */}
      {stats.critical > 0 && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800">
            <strong>{stats.critical} PM{stats.critical > 1 ? 's' : ''}</strong> on this page have LWD within
            30 days — their reportees will need reassignment soon.
          </p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {activeView !== 'all' && (
          <div className={`flex items-center justify-between px-6 py-3 text-sm font-medium border-b ${
            activeView === 'allocated'   ? 'bg-green-50 text-green-700 border-green-200' :
            activeView === 'unallocated' ? 'bg-blue-50  text-blue-700  border-blue-200'  :
                                           'bg-red-50   text-red-700   border-red-200'
          }`}>
            <span>
              {activeView === 'allocated'   && 'Showing Allocated PMs only (reportee count > 0)'}
              {activeView === 'unallocated' && 'Showing Unallocated PMs only (no reportees yet)'}
              {activeView === 'incorrect'   && 'Showing PMs with Incorrect Mappings (practice / skill mismatch)'}
              {' — '}{pagination.totalRecords} PM{pagination.totalRecords !== 1 ? 's' : ''} found
            </span>
            <button onClick={() => handleViewChange(activeView)} className="ml-4 underline hover:no-underline">
              ✕ Clear filter
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-[#0070AD]" />
            <span className="ml-2 text-gray-500">Loading PM Report…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No People Managers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {Object.values(filters).some(v => v && v !== 'true')
                ? 'Try adjusting the filters above.'
                : 'Upload the People Manager Feed first from the Data Upload page.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort('name')}>
                      PM <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" /> Grade
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Practice
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Region
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Skill</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <button className="flex items-center gap-1 mx-auto" onClick={() => toggleSort('reportee_count')}>
                      <Users className="w-3 h-3" /> Reportees <SortIcon col="reportee_count" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort('utilization')}>
                      <Activity className="w-3 h-3" /> Utilization <SortIcon col="utilization" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> LWD / Separation
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(pm => {
                  const util    = pm.utilization ?? 0;
                  const uColors = utilColor(util);
                  return (
                    <tr key={pm.employee_id} className="hover:bg-blue-50/30 transition-colors">

                      {/* PM Name + ID + email */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{pm.name || '—'}</div>
                        <div className="text-xs text-gray-400 font-mono">{pm.employee_id}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[180px]" title={pm.email}>{pm.email}</div>
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                          {pm.grade || '—'}
                        </span>
                      </td>

                      {/* Practice */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[130px]">
                        <span className="truncate block" title={pm.practice}>{pm.practice || '—'}</span>
                      </td>

                      {/* CU */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[110px]">
                        <span className="truncate block" title={pm.cu}>{pm.cu || '—'}</span>
                      </td>

                      {/* Region */}
                      <td className="px-4 py-3 text-gray-600 text-xs">{pm.region || '—'}</td>

                      {/* Skill */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px]">
                        <span className="truncate block" title={pm.skill}>{pm.skill || '—'}</span>
                      </td>

                      {/* Reportees */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-gray-700">{pm.reportee_count}</span>
                        <span className="text-gray-400 text-xs"> / {pm.max_capacity}</span>
                      </td>

                      {/* Utilization bar */}
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${uColors.bar}`}
                              style={{ width: `${Math.min(util, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${uColors.badge}`}>
                            {util}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{uColors.label}</p>
                      </td>

                      {/* Separation LWD */}
                      <td className="px-4 py-3">
                        {pm.separation_lwd ? (() => {
                          const urg = lwdUrgency(pm.separation_lwd);
                          return (
                            <div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                <span className="text-xs text-gray-700 font-medium">
                                  {format(new Date(pm.separation_lwd), 'dd MMM yyyy')}
                                </span>
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${urg.cls}`}>
                                {urg.label}
                              </span>
                            </div>
                          );
                        })() : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedPM({ id: pm.employee_id, name: pm.name || pm.employee_id })}
                          className="inline-flex items-center justify-center w-8 h-8 text-white rounded-md transition-colors shadow-sm hover:shadow hover:scale-110"
                          style={{ background: 'linear-gradient(135deg,#12ABDB 0%,#0070AD 100%)' }}
                          title={`View report for ${pm.name || pm.employee_id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* PM Detail Modal */}
      {selectedPM && (
        <PMReportModal
          pmId={selectedPM.id}
          pmName={selectedPM.name}
          onClose={() => setSelectedPM(null)}
        />
      )}
    </div>
  );
}
