import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, UserX, AlertCircle,
  UserPlus, Download, RefreshCw, ClipboardList, Filter, ExternalLink, User,
} from 'lucide-react';
import {
  useGetGADAnalysisSummaryQuery,
  useGetCorrectlyMappedEmployeesQuery,
  useGetSameGradeExceptionsQuery,
  useGetProposedPMsQuery,
  useGetUnmappedEmployeesQuery,
  useConfirmAutoGeneratePMsMutation,
  useGetPracticeFiltersQuery,
  useGetPMsListQuery,
} from '../services/pmApi';

type TabType = 'correct' | 'unmapped' | 'same_grade' | 'proposed';

const TABS: { id: TabType; label: string; color: string; activeClass: string }[] = [
  { id: 'correct',    label: '✅ Correctly Mapped',   color: 'text-green-700',  activeClass: 'border-green-500 text-green-700' },
  { id: 'unmapped',   label: '🔴 Not Mapped',          color: 'text-orange-700', activeClass: 'border-orange-500 text-orange-700' },
  { id: 'same_grade', label: '🟡 Same Grade as PM',    color: 'text-yellow-700', activeClass: 'border-yellow-500 text-yellow-700' },
  { id: 'proposed',   label: '🔵 Proposed New PMs',    color: 'text-blue-700',   activeClass: 'border-blue-500 text-blue-700' },
];

interface StatCardProps {
  label: string;
  count: number | string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  onClick: () => void;
  active: boolean;
}

function StatCard({ label, count, sub, icon, bg, text, onClick, active }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 cursor-pointer transition-all ${bg} border-2 ${active ? 'border-current shadow-md scale-[1.02]' : 'border-transparent hover:shadow-sm hover:scale-[1.01]'} ${text}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/60`}>{icon}</div>
        <span className="text-3xl font-bold">{count}</span>
      </div>
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm ${className}`}>{children}</td>;
}
function GradeBadge({ grade, color = 'gray' }: { grade?: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700', green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700', blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${colors[color] || colors.gray}`}>
      {grade || '—'}
    </span>
  );
}

function Pagination({ pagination, page, setPage }: { pagination: any; page: number; setPage: (p: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1 text-sm text-gray-500">
      <span>Page {pagination.page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.totalRecords} records</span>
      <div className="flex gap-2">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">← Prev</button>
        <button onClick={() => setPage(Math.min(pagination.totalPages, page + 1))} disabled={page >= pagination.totalPages}
          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

export default function GADAnalysis() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('correct');
  const [page, setPage] = useState(1);
  const [practice, setPractice] = useState('');
  const [pmFilter, setPmFilter] = useState('');      // selected PM employee_id
  const [pmSearch, setPmSearch] = useState('');      // typeahead text
  const [confirmApply, setConfirmApply] = useState(false);
  const PAGE_SIZE = 50;

  const { data: filtersData } = useGetPracticeFiltersQuery();
  const practiceList = filtersData?.practices ?? [];

  // Fetch PM list for the PM filter dropdown (up to 1000)
  const { data: pmListData } = useGetPMsListQuery({ page: 1, pageSize: 1000 } as any);
  const allPMs: any[] = pmListData?.data ?? [];
  const filteredPMs = useMemo(() => {
    const q = pmSearch.toLowerCase();
    return q
      ? allPMs.filter((p: any) => p.name?.toLowerCase().includes(q) || p.employee_id?.toLowerCase().includes(q))
      : allPMs;
  }, [allPMs, pmSearch]);

  const practiceParam = practice && practice !== 'All' ? practice : undefined;
  const pmIdParam     = pmFilter  || undefined;

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useGetGADAnalysisSummaryQuery(
    (practiceParam || pmIdParam)
      ? { practice: practiceParam, pmId: pmIdParam }
      : undefined
  );
  const { data: correctData,   isLoading: correctLoading   } = useGetCorrectlyMappedEmployeesQuery({ page, pageSize: PAGE_SIZE, practice: practiceParam, pmId: pmIdParam }, { skip: activeTab !== 'correct' });
  const { data: unmappedData,  isLoading: unmappedLoading  } = useGetUnmappedEmployeesQuery({ page, pageSize: PAGE_SIZE, practice: practiceParam }, { skip: activeTab !== 'unmapped' });
  const { data: sameGradeData, isLoading: sameGradeLoading } = useGetSameGradeExceptionsQuery({ page, pageSize: PAGE_SIZE, practice: practiceParam, pmId: pmIdParam }, { skip: activeTab !== 'same_grade' });
  const { data: proposedData,  isLoading: proposedLoading  } = useGetProposedPMsQuery({ page, pageSize: PAGE_SIZE, practice: practiceParam }, { skip: activeTab !== 'proposed' });
  const [applyPMs, { isLoading: applyingPMs }] = useConfirmAutoGeneratePMsMutation();

  const switchTab = (tab: TabType) => { setActiveTab(tab); setPage(1); };
  const handlePracticeChange = (p: string) => { setPractice(p); setPage(1); refetchSummary(); };
  const handlePMChange = (id: string) => { setPmFilter(id); setPage(1); refetchSummary(); };
  const clearFilters = () => { setPractice(''); setPmFilter(''); setPmSearch(''); setPage(1); refetchSummary(); };
  const dl = (basePath: string, extra: Record<string, string> = {}) => {
    const url = new URL(basePath, window.location.origin);
    if (practiceParam) url.searchParams.set('practice', practiceParam);
    if (pmIdParam) url.searchParams.set('pm_id', pmIdParam);
    Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
    window.open(url.toString(), '_blank');
  };

  const handleApplyPMs = async () => {
    try {
      const result: any = await applyPMs().unwrap();
      setConfirmApply(false);
      refetchSummary();
      alert(`✅ Done! ${result.inserted ?? 0} new PMs added, ${result.updated ?? 0} updated.`);
    } catch (e: any) {
      alert('❌ Error: ' + (e.message || e.error));
    }
  };

  const summaryCards = [
    { id: 'correct'    as TabType, label: 'Correctly Mapped',  count: summary?.correctly_mapped  ?? '—', sub: 'Valid PM, no exceptions',           icon: <CheckCircle size={20}/>,  bg: 'bg-green-50',  text: 'text-green-700',  link: undefined },
    { id: 'unmapped'   as TabType, label: 'Not Mapped',         count: summary?.not_mapped        ?? '—', sub: 'No PM assigned',                   icon: <UserX size={20}/>,         bg: 'bg-orange-50', text: 'text-orange-700', link: undefined },
    { id: 'same_grade' as TabType, label: 'Same Grade as PM',   count: summary?.same_grade        ?? '—', sub: 'PM must be exactly 1 grade above',  icon: <AlertCircle size={20}/>,   bg: 'bg-yellow-50', text: 'text-yellow-700', link: undefined },
    { id: 'proposed'   as TabType, label: 'Proposed New PMs',   count: summary?.proposed_pms      ?? '—', sub: 'C1+ eligible, ≥1yr tenure',         icon: <UserPlus size={20}/>,      bg: 'bg-blue-50',   text: 'text-blue-700',   link: undefined },
  ];

  const incorrectCount = summary?.incorrectly_mapped ?? '—';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <ClipboardList className="text-indigo-700" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GAD Analysis Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">Click a card to explore each category · Download CSV per section</p>
          </div>
        </div>
        <button onClick={() => refetchSummary()}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm text-gray-600">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border rounded-xl px-4 py-3 shadow-sm">
        <Filter size={16} className="text-indigo-500 flex-shrink-0" />

        {/* Practice filter */}
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">Practice:</label>
        <div className="relative">
          <select
            value={practice || ''}
            onChange={e => handlePracticeChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:border-indigo-400 transition-colors min-w-[180px]"
          >
            <option value="">All Practices</option>
            {practiceList.filter(p => p !== 'All').map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
        </div>

        {/* PM filter */}
        <label className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2">
          <User size={13} className="inline mr-1 text-indigo-400" />People Manager:
        </label>
        <div className="relative flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Search PM name or ID…"
            value={pmSearch}
            onChange={e => { setPmSearch(e.target.value); if (!e.target.value) setPmFilter(''); }}
            className="pl-3 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[200px]"
          />
          {pmSearch && filteredPMs.length > 0 && !pmFilter && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto min-w-[280px]">
              {filteredPMs.slice(0, 30).map((pm: any) => (
                <button
                  key={pm.employee_id}
                  onClick={() => { setPmFilter(pm.employee_id); setPmSearch(pm.name); handlePMChange(pm.employee_id); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between gap-2"
                >
                  <span className="font-medium text-gray-800 truncate">{pm.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{pm.employee_id} · {pm.practice}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active filter badges + clear */}
        {(practice || pmFilter) && (
          <div className="flex items-center gap-2 ml-1">
            {practice && (
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">{practice}</span>
            )}
            {pmFilter && (
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                <User size={10} /> {pmSearch || pmFilter}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕ Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {/* ── Incorrectly Mapped redirect banner ── */}
      <div
        onClick={() => navigate('/monitoring')}
        className="flex items-center justify-between mb-4 px-5 py-3.5 bg-red-50 border-2 border-red-200 rounded-xl cursor-pointer hover:border-red-400 hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60 text-red-700"><AlertTriangle size={20}/></div>
          <div>
            <p className="font-semibold text-sm text-red-700">Incorrectly Mapped</p>
            <p className="text-xs text-red-500 opacity-80">Wrong practice / PM on leave · Full details, suggested PMs &amp; override actions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-3xl font-bold text-red-700">{incorrectCount}</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg">
            <ExternalLink size={13}/> View in Monitoring
          </div>
        </div>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {summaryCards.map(c => (
            <StatCard key={c.id} {...c} onClick={() => switchTab(c.id)} active={activeTab === c.id} />
          ))}
        </div>
      )}

      {/* ── Tab Panel ── */}
      <div className="bg-white rounded-xl shadow-sm border">

        {/* Tab Bar */}
        <div className="flex border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id ? `${t.activeClass} border-current` : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ═══════════════════════════════════════ CORRECTLY MAPPED */}
          {activeTab === 'correct' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-green-700">{correctData?.count ?? 0}</span> employees with valid PM assignment and no open exceptions
                </p>
                <button onClick={() => dl('/api/pm/analysis/correctly-mapped', { format: 'csv' })}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  <Download size={14}/> Download CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b">
                    <Th>Emp ID</Th><Th>Name</Th><Th>Grade</Th><Th>Practice</Th>
                    <Th>Sub-Practice</Th><Th>Region</Th><Th>PM Name</Th><Th>PM Grade</Th>
                  </tr></thead>
                  <tbody>
                    {correctLoading ? (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
                    ) : !correctData?.data?.length ? (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">No correctly mapped employees found</td></tr>
                    ) : correctData.data.map((r: any) => (
                      <tr key={r.employee_id} className="border-b hover:bg-green-50/40">
                        <Td className="text-gray-400 text-xs font-mono">{r.employee_id}</Td>
                        <Td className="font-medium text-gray-900">{r.name}</Td>
                        <Td><GradeBadge grade={r.grade} /></Td>
                        <Td className="text-gray-600">{r.practice}</Td>
                        <Td className="text-gray-500 text-xs">{r.sub_practice || '—'}</Td>
                        <Td className="text-gray-500">{r.region}</Td>
                        <Td className="text-green-700 font-medium">{r.pm_name || '—'}</Td>
                        <Td><GradeBadge grade={r.pm_grade} color="green" /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={correctData?.pagination} page={page} setPage={setPage} />
            </div>
          )}

          {/* ═══════════════════════════════════════ NOT MAPPED */}
          {activeTab === 'unmapped' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-orange-700">{unmappedData?.count ?? 0}</span> active employees with no PM assigned
                </p>
                <button onClick={() => dl('/api/pm/employees/unmapped', { format: 'csv' })}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                  <Download size={14}/> Download CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b">
                    <Th>Emp ID</Th><Th>Name</Th><Th>Grade</Th><Th>Practice</Th>
                    <Th>Sub-Practice</Th><Th>Region</Th><Th>Skill</Th>
                  </tr></thead>
                  <tbody>
                    {unmappedLoading ? (
                      <tr><td colSpan={7} className="py-10 text-center text-gray-400">Loading…</td></tr>
                    ) : !unmappedData?.data?.length ? (
                      <tr><td colSpan={7} className="py-10 text-center text-gray-400">All employees are mapped 🎉</td></tr>
                    ) : unmappedData.data.map((r: any) => (
                      <tr key={r.employee_id} className="border-b hover:bg-orange-50/40">
                        <Td className="text-gray-400 text-xs font-mono">{r.employee_id}</Td>
                        <Td className="font-medium text-gray-900">{r.name}</Td>
                        <Td><GradeBadge grade={r.grade} /></Td>
                        <Td className="text-gray-600">{r.practice}</Td>
                        <Td className="text-gray-500 text-xs">{r.sub_practice || '—'}</Td>
                        <Td className="text-gray-500">{r.region}</Td>
                        <Td className="text-gray-500 text-xs">{r.skill || '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={unmappedData?.pagination} page={page} setPage={setPage} />
            </div>
          )}

          {/* ═══════════════════════════════════════ SAME GRADE */}
          {activeTab === 'same_grade' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-yellow-700">{sameGradeData?.count ?? 0}</span> employees have the same grade as their PM (PM must be exactly 1 grade above)
                </p>
                <button onClick={() => dl('/api/pm/analysis/same-grade', { format: 'csv' })}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">
                  <Download size={14}/> Download CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b">
                    <Th>Employee</Th><Th>Emp Grade</Th><Th>Practice</Th><Th>Sub-Practice</Th>
                    <Th>Region</Th><Th>PM Name</Th><Th>PM Grade</Th><Th>Detected</Th>
                  </tr></thead>
                  <tbody>
                    {sameGradeLoading ? (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
                    ) : !sameGradeData?.data?.length ? (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">No same-grade exceptions found 🎉</td></tr>
                    ) : sameGradeData.data.map((r: any) => (
                      <tr key={r.exception_id} className="border-b hover:bg-yellow-50/40">
                        <Td className="font-medium text-gray-900">{r.employee_name}</Td>
                        <Td><GradeBadge grade={r.employee_grade} color="yellow" /></Td>
                        <Td className="text-gray-600">{r.practice}</Td>
                        <Td className="text-gray-500 text-xs">{r.sub_practice || '—'}</Td>
                        <Td className="text-gray-500">{r.region}</Td>
                        <Td className="text-gray-700">{r.pm_name || '—'}</Td>
                        <Td><GradeBadge grade={r.pm_grade} color="yellow" /></Td>
                        <Td className="text-gray-400 text-xs">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={sameGradeData?.pagination} page={page} setPage={setPage} />
            </div>
          )}

          {/* ═══════════════════════════════════════ PROPOSED PMs */}
          {activeTab === 'proposed' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-blue-700">{proposedData?.count ?? 0}</span> C1+ employees with ≥1 year tenure who are not yet People Managers
                </p>
                <div className="flex gap-2">
                  <button onClick={() => dl('/api/pm/analysis/proposed-pms', { format: 'csv' })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <Download size={14}/> Download CSV
                  </button>
                  <button onClick={() => setConfirmApply(true)} disabled={!proposedData?.count || proposedData.count === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-40">
                    <UserPlus size={14}/> Apply as PMs
                  </button>
                </div>
              </div>

              {/* Confirmation Banner */}
              {confirmApply && (
                <div className="mb-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">Confirm: Add {proposedData?.count} employees to People Managers?</p>
                    <p className="text-xs text-indigo-600 mt-0.5">They will be inserted into the PM list with grade-based max capacity. This cannot be undone automatically.</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmApply(false)}
                      className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleApplyPMs} disabled={applyingPMs}
                      className="px-4 py-1.5 bg-indigo-700 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50 min-w-[90px]">
                      {applyingPMs ? 'Applying…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b">
                    <Th>Emp ID</Th><Th>Name</Th><Th>Grade</Th><Th>Practice</Th>
                    <Th>Sub-Practice</Th><Th>Region</Th><Th>Skill</Th>
                    <Th>Tenure</Th><Th>Max Capacity</Th>
                  </tr></thead>
                  <tbody>
                    {proposedLoading ? (
                      <tr><td colSpan={9} className="py-10 text-center text-gray-400">Loading…</td></tr>
                    ) : !proposedData?.data?.length ? (
                      <tr><td colSpan={9} className="py-10 text-center text-gray-400">No PM candidates at this time</td></tr>
                    ) : proposedData.data.map((r: any) => (
                      <tr key={r.employee_id} className="border-b hover:bg-blue-50/40">
                        <Td className="text-gray-400 text-xs font-mono">{r.employee_id}</Td>
                        <Td className="font-medium text-gray-900">{r.name}</Td>
                        <Td><GradeBadge grade={r.grade} color="blue" /></Td>
                        <Td className="text-gray-600">{r.practice}</Td>
                        <Td className="text-gray-500 text-xs">{r.sub_practice || '—'}</Td>
                        <Td className="text-gray-500">{r.region}</Td>
                        <Td className="text-gray-500 text-xs">{r.skill || '—'}</Td>
                        <Td className="font-semibold text-blue-700">{r.tenure_years} yr{r.tenure_years !== 1 ? 's' : ''}</Td>
                        <Td className="text-center">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">{r.proposed_max_capacity}</span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={proposedData?.pagination} page={page} setPage={setPage} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
