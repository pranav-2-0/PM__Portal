import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, RefreshCw, ArrowRight, UserCog,
  TrendingUp, CheckCircle, Search, X, ChevronLeft, ChevronRight, UserCheck, Download, Mail, User, Briefcase
} from 'lucide-react';
import {
  useGetMisalignmentsQuery,
  useGetPMCapacityReportQuery,
  useGetPMsListQuery,
  useGetPMDetailReportQuery,
  useOverridePMAssignmentMutation,
} from '../services/pmApi';

interface OverrideModal {
  employeeId: string;
  employeeName: string;
  currentPmName: string;
  isPMResigned: boolean;
  isForcedSuggestion: boolean;
}

export default function Monitoring() {
  const [misPage, setMisPage] = useState(1);
  const [misPageSize, setMisPageSize] = useState(50);
  const [activeTab, setActiveTab] = useState<'all' | 'WRONG_PRACTICE' | 'WRONG_SUB_PRACTICE' | 'WRONG_CU' | 'WRONG_REGION' | 'WRONG_GRADE' | 'PM_ON_LEAVE' | 'PM_SEPARATED'>('all');
  const [csvDownloading, setCsvDownloading] = useState(false);

  const tabTypeParam = activeTab === 'all' ? undefined : activeTab;
  const { data: misData, isLoading: misLoading, refetch: refetchMis } = useGetMisalignmentsQuery({ page: misPage, pageSize: misPageSize, type: tabTypeParam });
  const misCount = misData?.count ?? 0;
  const { data: capacityReport } = useGetPMCapacityReportQuery();
  const { data: pmsList } = useGetPMsListQuery({ page: 1, pageSize: 10000 } as any);
  const [overridePM, { isLoading: overriding }] = useOverridePMAssignmentMutation();

  const [overrideModal, setOverrideModal] = useState<OverrideModal | null>(null);
  const [selectedPmId, setSelectedPmId] = useState('');
  const [justification, setJustification] = useState('');
  const [pmSearch, setPmSearch] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pmDetailPopup, setPmDetailPopup] = useState<any | null>(null);
  const { data: currentPmReport } = useGetPMDetailReportQuery(pmDetailPopup?.pm_id ?? '', {
    skip: !pmDetailPopup || (pmDetailPopup.detailType !== 'currentPm' && pmDetailPopup.modalMode !== 'compare'),
  });
  const { data: suggestedPmReport } = useGetPMDetailReportQuery(pmDetailPopup?.suggested_pm_id ?? '', {
    skip: !pmDetailPopup || (pmDetailPopup.detailType !== 'suggestedPm' && pmDetailPopup.modalMode !== 'compare'),
  });
  const [showDirectReportees, setShowDirectReportees] = useState(false);

  const openDetailPopup = (row: any, type: 'employee' | 'currentPm' | 'suggestedPm') => {
    setPmDetailPopup({ ...row, modalMode: 'detail', detailType: type });
    setShowDirectReportees(false);
  };

  const getBestStatus = (employeeValue: any, currentValue: any, suggestedValue: any) => {
    const emp = `${employeeValue || ''}`.trim().toLowerCase();
    const cur = `${currentValue || ''}`.trim().toLowerCase();
    const sug = `${suggestedValue || ''}`.trim().toLowerCase();

    if (emp && cur && sug && emp === cur && cur === sug) {
      return { label: 'All', bg: 'bg-sky-50 text-sky-700', border: 'border-sky-100' };
    }
    if (cur && sug && cur === sug) {
      return { label: '= Both', bg: 'bg-sky-50 text-sky-700', border: 'border-sky-100' };
    }
    if (sug && emp && sug === emp) {
      return { label: '✓ Suggested', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' };
    }
    if (cur && emp && cur === emp) {
      return { label: 'Current', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-100' };
    }
    return { label: '✓ Suggested', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' };
  };

  const formatCapacity = (row: any, type: 'current' | 'suggested') => {
    if (type === 'current') {
      const currentPm = capacityReport?.find((pm: any) => pm.employee_id === row.pm_id || pm.employee_id === row.pm_id);
      const reportees = currentPm?.reportee_count ?? currentPm?.reportees ?? row.pm_reportees ?? row.pm_reportee_count ?? row.reportee_count;
      const capacity = currentPm?.max_capacity ?? currentPm?.capacity ?? row.pm_capacity ?? row.pm_max_capacity ?? row.max_capacity ?? 10;
      return reportees != null || capacity != null ? `${reportees ?? '—'}/${capacity ?? '—'}` : '—';
    }
    const reportees = row.suggested_pm_reportees ?? row.suggested_pm_reportee_count;
    const capacity = row.suggested_pm_capacity ?? row.suggested_pm_max_capacity;
    return reportees != null || capacity != null ? `${reportees ?? '—'}/${capacity ?? '—'}` : '—';
  };

  const normalizeId = (id: any) => id == null ? '' : String(id).trim();

  const findPmById = (pmId: any) => {
    const normalizedId = normalizeId(pmId);
    if (!normalizedId) return null;

    const allPmSources = [
      ...(pmsList?.data || []),
      ...(capacityReport || []),
      ...(misData?.misalignments || []),
    ];

    return allPmSources.find((pm: any) => {
      const candidate = normalizeId(pm.employee_id || pm.pm_id || pm.suggested_pm_id || pm.id);
      return candidate === normalizedId;
    }) || null;
  };

  const getPmField = (row: any, source: 'pm' | 'suggested_pm', field: string) => {
    const pmId = source === 'pm' ? row.pm_id : row.suggested_pm_id;
    const lookup = findPmById(pmId);
    const fallback = row[`${source}_${field}`] ?? row[field] ?? row[`${field}`] ?? 'Not provided';
    return lookup?.[field] ?? fallback ?? 'Not provided';
  };

  const currentPmEmployees = currentPmReport?.reportees || [];
  const suggestedPmEmployees = suggestedPmReport?.reportees || [];

  const getReporteeName = (emp: any) => emp.name || emp.employee_name || emp.emp_name || emp.emp_display_name || 'Not provided';
  const getReporteeId = (emp: any) => emp.employee_id || emp.id || '—';

  // ── CSV export ────────────────────────────────────────────────────────────────
  const downloadCSV = async () => {
    setCsvDownloading(true);
    try {
      const typeParam = activeTab === 'all' ? '' : `&type=${activeTab}`;
      const url = `/api/pm/employees/misalignments/export?_=${Date.now()}${typeParam}`;

      // Use AbortController with a 5-minute timeout for large exports (5000+ rows)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { 'Accept': 'text/csv' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
      }

      // Stream the response body so large files don't block the UI
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } else {
        chunks.push(new Uint8Array(await res.arrayBuffer()));
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'text/csv;charset=utf-8;' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = objectUrl;
      a.download = `misalignments_${activeTab || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert('CSV export timed out. Try filtering by a specific mismatch type (e.g. Wrong Practice) to reduce the dataset size.');
      } else {
        alert('CSV download failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setCsvDownloading(false);
    }
  };

  // Capacity breaches: PMs at >= 100% utilization
  const overCapacity = (capacityReport || []).filter(
    (pm: any) => pm.reportee_count >= pm.max_capacity
  );
  const nearCapacity = (capacityReport || []).filter(
    (pm: any) => {
      const pct = pm.reportee_count / pm.max_capacity;
      return pct >= 0.85 && pct < 1.0;
    }
  );

  const filteredPMs = (pmsList?.data || []).filter((pm: any) =>
    pm.name?.toLowerCase().includes(pmSearch.toLowerCase()) ||
    pm.employee_id?.toLowerCase().includes(pmSearch.toLowerCase())
  );

  const openOverrideModal = (row: any) => {
    setOverrideModal({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      currentPmName: row.pm_name,
      isPMResigned: row.mismatch_type === 'PM_SEPARATED',
      isForcedSuggestion: !!row.suggested_pm_forced,
    });
    setSelectedPmId('');
    setJustification('');
    setPmSearch('');
    setOverrideStatus(null);
  };

  const handleOverride = async () => {
    if (!overrideModal || !selectedPmId || !justification.trim()) return;
    try {
      const result = await overridePM({
        employeeId: overrideModal.employeeId,
        newPmId: selectedPmId,
        justification: justification.trim(),
      }).unwrap();
      setOverrideStatus({ success: true, message: result.message });
      refetchMis();
      setMisPage(1);
      setTimeout(() => {
        setOverrideModal(null);
        setOverrideStatus(null);
      }, 2000);
    } catch (err: any) {
      setOverrideStatus({ success: false, message: err?.data?.error || 'Override failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div></div>
        <button
          onClick={() => refetchMis()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SummaryCard
          label="Misaligned Employees"
          value={misData?.count ?? 0}
          icon={AlertTriangle}
          color="bg-red-500"
          description="Wrong practice · PM on leave / resigned"
        />
        <SummaryCard
          label="Capacity Breaches"
          value={overCapacity.length}
          icon={TrendingUp}
          color="bg-orange-500"
          description="PMs at or above max capacity"
        />
      </div>

      {/* Misalignments Panel */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCog size={20} className="text-red-500" />
            <h2 className="text-xl font-semibold text-gray-800">PM Misalignments</h2>
            <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              {misData?.count ?? 0}
            </span>
            {(misData?.unmappedCount ?? 0) > 0 && (
              <span className="ml-1 px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                {misData!.unmappedCount} unmapped
              </span>
            )}
          </div>
          <button
            onClick={downloadCSV}
            disabled={csvDownloading}
            title={misCount > 1000 ? `Exporting ${misCount} rows — may take 30–60s` : 'Export to CSV'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            {csvDownloading
              ? <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Downloading{misCount > 1000 ? ` ${misCount} rows…` : '…'}
                </span>
              : 'Export CSV'
            }
          </button>
        </div>

        {/* 5-tab filter */}
        <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200 pb-3">
          {([
            { key: 'all', label: 'All Issues' },
            { key: 'WRONG_PRACTICE', label: 'Wrong Practice' },
            { key: 'WRONG_SUB_PRACTICE', label: 'Wrong Sub-Practice' },
            { key: 'WRONG_CU',           label: 'Wrong CU' },
            { key: 'WRONG_REGION',       label: 'Wrong Region' },
            { key: 'WRONG_GRADE',        label: 'Wrong Grade' },
            { key: 'PM_ON_LEAVE', label: 'PM On Leave' },
            { key: 'PM_SEPARATED', label: 'PM Resigned' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setMisPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Employees whose current PM is misaligned by <strong>Practice</strong>, <strong>Sub-Practice</strong>, or the PM is <strong>On Leave / Resigned</strong>. Use <strong>Override PM</strong>
          to reassign with an audit-logged justification.
        </p>

        {misLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : !misData?.misalignments?.length ? (
          <div className="text-center py-10 text-gray-500">
            <CheckCircle size={40} className="mx-auto mb-2 text-green-400" />
            <p className="font-medium">No misalignments detected</p>
            <p className="text-sm mt-1">All employees are aligned with their PM's practice, CU, and region.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current PM</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mismatch</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Suggested PM</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Suggested Reason</th>
                </tr>
              </thead>
              <tbody>
                {misData.misalignments.map((row: any, i: number) => (
                  <tr key={i} className={`bg-white border-b border-slate-200 transition-colors hover:bg-slate-50 ${
                    row.mismatch_type === 'PM_ON_LEAVE' ? 'hover:bg-yellow-50' :
                    row.mismatch_type === 'PM_SEPARATED' ? 'hover:bg-red-50' :
                    ''
                  }`}>
                    <td className="px-5 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => openDetailPopup(row, 'employee')}
                        className="text-left w-full"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 hover:text-blue-700 hover:underline transition-colors">{row.employee_name}</p>
                          <p className="text-xs text-slate-400">{row.employee_id}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => openDetailPopup(row, 'currentPm')}
                        className="text-left w-full"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 hover:text-blue-700 hover:underline transition-colors">{row.pm_name}</p>
                          <p className="text-xs text-slate-400">{row.pm_id}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        row.mismatch_type === 'PM_ON_LEAVE' ? 'bg-amber-100 text-amber-800' :
                        row.mismatch_type === 'PM_SEPARATED' ? 'bg-rose-100 text-rose-700' :
                        row.mismatch_type === 'WRONG_SUB_PRACTICE' ? 'bg-orange-100 text-orange-800' :
                        row.mismatch_type === 'WRONG_CU'           ? 'bg-amber-100 text-amber-800' :
                        row.mismatch_type === 'WRONG_REGION'       ? 'bg-amber-100 text-amber-800' :
                        row.mismatch_type === 'WRONG_GRADE'        ? 'bg-rose-100 text-rose-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <AlertTriangle size={14} />
                        {(row.mismatch_type || 'MISMATCH').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => openDetailPopup(row, 'suggestedPm')}
                          className="text-left w-full"
                        >
                          <p className="font-semibold text-slate-900 hover:text-blue-700 hover:underline transition-colors">{row.suggested_pm_name || '—'}</p>
                          <p className="text-xs text-slate-400">{row.suggested_pm_id || '—'}</p>
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-slate-500">{row.suggested_pm_forced ? 'Forced suggested PM' : 'Best match available'}</p>
                        <button
                          onClick={() => setPmDetailPopup({ ...row, modalMode: 'compare' })}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Compare
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {misData?.pagination && misData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 mt-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>
                Showing {((misPage - 1) * misPageSize) + 1}–{Math.min(misPage * misPageSize, misData.pagination.totalRecords)} of <strong>{misData.pagination.totalRecords}</strong> misalignments
              </span>
              <select
                value={misPageSize}
                onChange={e => { setMisPageSize(Number(e.target.value)); setMisPage(1); }}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {[25, 50, 100, 200].map(s => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMisPage(1)}
                disabled={misPage === 1}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setMisPage(p => Math.max(1, p - 1))}
                disabled={misPage === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, misData.pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(misPage - 2, misData.pagination.totalPages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setMisPage(p)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      p === misPage
                        ? 'bg-[#0070AD] text-white border-[#0070AD]'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setMisPage(p => Math.min(misData.pagination.totalPages, p + 1))}
                disabled={misPage === misData.pagination.totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setMisPage(misData.pagination.totalPages)}
                disabled={misPage === misData.pagination.totalPages}
                className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Capacity Breaches */}
      {(overCapacity.length > 0 || nearCapacity.length > 0) && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800">Capacity Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Over capacity */}
            {overCapacity.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Over Capacity ({overCapacity.length})
                </p>
                <div className="space-y-2">
                  {overCapacity.map((pm: any, i: number) => (
                    <CapacityRow key={i} pm={pm} variant="over" />
                  ))}
                </div>
              </div>
            )}
            {/* Near capacity */}
            {nearCapacity.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                  Near Capacity 85%+ ({nearCapacity.length})
                </p>
                <div className="space-y-2">
                  {nearCapacity.map((pm: any, i: number) => (
                    <CapacityRow key={i} pm={pm} variant="near" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickLink to="/settings" label="Adjust Matching Weights" color="blue" />
        <QuickLink to="/gad-analysis" label="View GAD Analysis" color="blue" />
      </div>

      {/* Detail / Comparison Popup */}
      {pmDetailPopup && (
        <div className="fixed inset-0 z-50 overflow-auto no-scrollbar bg-black/50 p-4" onClick={() => setPmDetailPopup(null)}>
          <div className={`mx-auto w-full ${pmDetailPopup.modalMode === 'compare' ? 'max-w-4xl' : 'max-w-3xl'} max-h-[calc(100vh-3rem)] overflow-hidden rounded-[28px] bg-white shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {pmDetailPopup.modalMode === 'compare' ? 'PM Alignment Comparison' :
                    pmDetailPopup.detailType === 'employee' ? 'Employee Details' :
                    pmDetailPopup.detailType === 'currentPm' ? 'Current PM Details' : 'Suggested PM Details'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {pmDetailPopup.modalMode === 'compare'
                    ? 'Compare employee, current PM and suggested PM side by side.'
                    : 'View full profile information for the selected person.'}
                </p>
              </div>
              <button onClick={() => setPmDetailPopup(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {pmDetailPopup.modalMode === 'compare' ? (
              <div className="overflow-hidden">
                <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
                  <div className="rounded-[24px] bg-blue-50 border border-blue-100 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Employee</p>
                    <p className="mt-4 text-lg font-bold text-slate-900">{pmDetailPopup.employee_name}</p>
                    <p className="mt-2 text-sm text-slate-500">{pmDetailPopup.employee_id}</p>
                  </div>
                  <div className="rounded-[24px] bg-amber-50 border border-amber-100 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Current PM</p>
                    <p className="mt-4 text-lg font-bold text-slate-900">{pmDetailPopup.pm_name}</p>
                    <p className="mt-2 text-sm text-slate-500">{pmDetailPopup.pm_id}</p>
                  </div>
                  <div className="rounded-[24px] bg-emerald-50 border border-emerald-100 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Suggested PM</p>
                    <p className="mt-4 text-lg font-bold text-slate-900">{pmDetailPopup.suggested_pm_name}</p>
                    <p className="mt-2 text-sm text-slate-500">{pmDetailPopup.suggested_pm_id}</p>
                  </div>
                </div>
                <div className="overflow-y-auto no-scrollbar px-6 pb-6" style={{ maxHeight: '52vh' }}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Field</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current PM</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suggested PM</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Best</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        ['Practice', pmDetailPopup.emp_practice, pmDetailPopup.pm_practice, pmDetailPopup.suggested_pm_practice],
                        ['Region', pmDetailPopup.emp_region, pmDetailPopup.pm_region, pmDetailPopup.suggested_pm_region],
                        ['BU (CU)', pmDetailPopup.emp_cu, pmDetailPopup.pm_cu, pmDetailPopup.suggested_pm_cu],
                        ['Account', pmDetailPopup.emp_account, pmDetailPopup.pm_account, pmDetailPopup.suggested_pm_account],
                        ['Skill', pmDetailPopup.emp_skill, pmDetailPopup.pm_skill, pmDetailPopup.suggested_pm_skill],
                        ['Capacity', 'N/A', formatCapacity(pmDetailPopup, 'current'), formatCapacity(pmDetailPopup, 'suggested')],
                      ].map(([field, empValue, currentValue, suggestedValue], idx) => {
                        const best = getBestStatus(empValue, currentValue, suggestedValue);
                        return (
                          <tr key={idx} className="bg-white">
                            <td className="px-4 py-4 text-sm font-semibold text-slate-700">{field}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{empValue || '—'}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{currentValue || '—'}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{suggestedValue || '—'}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${best.bg} ${best.border}`}>
                                {best.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 pb-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Employees under current and suggested PM</h3>
                        <p className="text-xs text-slate-500">Toggle reportee lists for both PMs in this comparison view.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDirectReportees(prev => !prev)}
                        className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        {showDirectReportees ? 'Hide Direct Reportees' : 'Show Direct Reportees'}
                      </button>
                    </div>

                    {showDirectReportees && (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <section className="rounded-3xl bg-white p-5 shadow-sm">
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-slate-900">Current PM Reportees</p>
                            <p className="text-xs text-slate-500">{currentPmEmployees.length} found in current dataset</p>
                          </div>
                          {currentPmEmployees.length > 0 ? currentPmEmployees.map((emp: any, idx: number) => (
                            <div key={idx} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-3">
                              <p className="text-sm font-semibold text-slate-900">{getReporteeName(emp)}</p>
                              <p className="text-xs text-slate-500">{getReporteeId(emp)}</p>
                              {(emp.emp_practice || emp.practice || emp.emp_sub_practice || emp.practice || emp.emp_grade || emp.grade) && (
                                <p className="text-xs text-slate-500 mt-2">
                                  {emp.emp_practice || emp.practice ? (emp.emp_practice || emp.practice) : ''}
                                  {emp.emp_sub_practice ? ` / ${emp.emp_sub_practice}` : ''}
                                  {emp.emp_grade || emp.grade ? ` • ${emp.emp_grade || emp.grade}` : ''}
                                </p>
                              )}
                            </div>
                          )) : (
                            <p className="text-sm text-slate-500">No reportees found for current PM in the current dataset.</p>
                          )}
                        </section>
                        <section className="rounded-3xl bg-white p-5 shadow-sm">
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-slate-900">Suggested PM Reportees</p>
                            <p className="text-xs text-slate-500">{suggestedPmEmployees.length} found in current dataset</p>
                          </div>
                          {suggestedPmEmployees.length > 0 ? suggestedPmEmployees.map((emp: any, idx: number) => (
                            <div key={idx} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-3">
                              <p className="text-sm font-semibold text-slate-900">{getReporteeName(emp)}</p>
                              <p className="text-xs text-slate-500">{getReporteeId(emp)}</p>
                              {(emp.emp_practice || emp.practice || emp.emp_sub_practice || emp.practice || emp.emp_grade || emp.grade) && (
                                <p className="text-xs text-slate-500 mt-2">
                                  {emp.emp_practice || emp.practice ? (emp.emp_practice || emp.practice) : ''}
                                  {emp.emp_sub_practice ? ` / ${emp.emp_sub_practice}` : ''}
                                  {emp.emp_grade || emp.grade ? ` • ${emp.emp_grade || emp.grade}` : ''}
                                </p>
                              )}
                            </div>
                          )) : (
                            <p className="text-sm text-slate-500">No reportees found for suggested PM in the current dataset.</p>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                  <button
                    onClick={() => {
                      setPmDetailPopup(null);
                      openOverrideModal(pmDetailPopup);
                      setSelectedPmId(pmDetailPopup.suggested_pm_id);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Use Suggested PM
                  </button>
                  <button
                    onClick={() => setPmDetailPopup(null)}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto no-scrollbar px-6 pb-6" style={{ maxHeight: '70vh' }}>
                <div className="bg-blue-600 px-6 py-7 text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
                      {pmDetailPopup.modalMode === 'compare'
                        ? '?'
                        : pmDetailPopup.detailType === 'employee'
                          ? (pmDetailPopup.employee_name || 'U').charAt(0).toUpperCase()
                          : (pmDetailPopup.detailType === 'currentPm' ? (pmDetailPopup.pm_name || 'P') : (pmDetailPopup.suggested_pm_name || 'S')).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Profile</p>
                      <p className="mt-2 text-xl font-semibold">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.employee_name : pmDetailPopup.detailType === 'currentPm' ? pmDetailPopup.pm_name : pmDetailPopup.suggested_pm_name}</p>
                      <p className="text-sm text-slate-100 mt-1">ID: {pmDetailPopup.detailType === 'employee' ? pmDetailPopup.employee_id : pmDetailPopup.detailType === 'currentPm' ? pmDetailPopup.pm_id : pmDetailPopup.suggested_pm_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 bg-slate-50 px-6 py-6">
                  <section className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                      <Mail size={18} className="text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.employee_email : pmDetailPopup.detailType === 'currentPm' ? getPmField(pmDetailPopup, 'pm', 'email') : getPmField(pmDetailPopup, 'suggested_pm', 'email')}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                      <Briefcase size={18} className="text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Organization Information</h3>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Practice</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_practice : pmDetailPopup.detailType === 'currentPm' ? pmDetailPopup.pm_practice : pmDetailPopup.suggested_pm_practice || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Sub-Practice</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_sub_practice || 'Not provided' : pmDetailPopup.detailType === 'currentPm' ? getPmField(pmDetailPopup, 'pm', 'sub_practice') : getPmField(pmDetailPopup, 'suggested_pm', 'sub_practice')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Region</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_region : pmDetailPopup.detailType === 'currentPm' ? pmDetailPopup.pm_region : pmDetailPopup.suggested_pm_region || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">BU / CU</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_cu : pmDetailPopup.detailType === 'currentPm' ? getPmField(pmDetailPopup, 'pm', 'cu') : getPmField(pmDetailPopup, 'suggested_pm', 'cu')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Account</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_account || 'Not provided' : pmDetailPopup.detailType === 'currentPm' ? getPmField(pmDetailPopup, 'pm', 'account') : getPmField(pmDetailPopup, 'suggested_pm', 'account')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Grade</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_grade || 'Not provided' : pmDetailPopup.detailType === 'currentPm' ? getPmField(pmDetailPopup, 'pm', 'grade') : getPmField(pmDetailPopup, 'suggested_pm', 'grade')}</p>
                      </div>
                      {pmDetailPopup.detailType !== 'employee' && (
                        <div>
                          <p className="text-xs text-slate-500">Capacity</p>
                          <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'currentPm' ? formatCapacity(pmDetailPopup, 'current') : formatCapacity(pmDetailPopup, 'suggested')}</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                      <UserCheck size={18} className="text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Skills & Competencies</h3>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-slate-500">Skill</p>
                      <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.detailType === 'employee' ? pmDetailPopup.emp_skill || 'Not provided' : pmDetailPopup.detailType === 'currentPm' ? pmDetailPopup.pm_skill || 'Not provided' : pmDetailPopup.suggested_pm_skill || 'Not provided'}</p>
                    </div>
                  </section>

                  {(pmDetailPopup.detailType === 'currentPm' || pmDetailPopup.detailType === 'suggestedPm') && (
                    <section className="rounded-3xl bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-3">
                          <User size={18} className="text-blue-600" />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Employees Under This PM</h3>
                            <p className="text-xs text-slate-500">Show all reportees available in the current dataset.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDirectReportees(prev => !prev)}
                          className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          {showDirectReportees ? 'Hide Direct Reportees' : 'Show Direct Reportees'}
                        </button>
                      </div>
                      {showDirectReportees && (
                        <div className="mt-4 space-y-3">
                          {(pmDetailPopup.detailType === 'currentPm' ? currentPmEmployees : suggestedPmEmployees).length > 0 ?
                            (pmDetailPopup.detailType === 'currentPm' ? currentPmEmployees : suggestedPmEmployees).map((emp: any, idx: number) => (
                              <div key={idx} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-900">{getReporteeName(emp)}</p>
                                <p className="text-xs text-slate-500">{getReporteeId(emp)}</p>
                                {(emp.emp_practice || emp.practice || emp.emp_grade || emp.grade) && (
                                  <p className="text-xs text-slate-500 mt-2">
                                    {emp.emp_practice || emp.practice ? (emp.emp_practice || emp.practice) : ''}
                                    {emp.emp_sub_practice ? ` / ${emp.emp_sub_practice}` : ''}
                                    {emp.emp_grade || emp.grade ? ` • ${emp.emp_grade || emp.grade}` : ''}
                                  </p>
                                )}
                              </div>
                            )) : (
                              <p className="text-sm text-slate-500">No direct reportees found in the current dataset.</p>
                            )}
                        </div>
                      )}
                    </section>
                  )}

                  {pmDetailPopup.detailType === 'employee' && (
                    <section className="rounded-3xl bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                        <User size={18} className="text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-900">Employment Information</h3>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs text-slate-500">Current PM</p>
                        <p className="text-sm font-semibold text-slate-900">{pmDetailPopup.pm_name || 'Not provided'}</p>
                      </div>
                    </section>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-200 px-6 py-5">
                  <button
                    onClick={() => setPmDetailPopup(null)}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Override PM Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Override PM Assignment</h3>
              <button onClick={() => setOverrideModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* §2 Resignation Override mandatory warning */}
            {overrideModal.isPMResigned && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700">PM Resigned — Reassignment Mandatory</p>
                  <p className="text-red-600 mt-0.5 text-xs">
                    Per spec §2 (isPMResigned=TRUE), a new People Manager <strong>must</strong> be assigned.
                    {overrideModal.isForcedSuggestion && (
                      <span className="block mt-1">
                        ⚡ The suggested PM is a <strong>Forced Suggested PM</strong> (§4 Constraint Relaxation) — no strictly-matched PM exists. Review the suggested PM carefully before confirming.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
              <p><span className="text-gray-500 w-28 inline-block">Employee:</span>
                <span className="font-semibold">{overrideModal.employeeName}</span></p>
              <p><span className="text-gray-500 w-28 inline-block">Current PM:</span>
                <span className="font-medium text-red-600">{overrideModal.currentPmName}</span>
                {overrideModal.isPMResigned && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded font-semibold">RESIGNED</span>
                )}
              </p>
            </div>

            {/* PM Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Select New PM <span className="text-red-500">*</span>
                {overrideModal.isPMResigned && (
                  <span className="ml-2 text-xs font-normal text-orange-600">(Mandatory — PM has resigned)</span>
                )}
              </label>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={pmSearch}
                  onChange={e => setPmSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={selectedPmId}
                onChange={e => setSelectedPmId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                size={5}
              >
                <option value="">— Select a PM —</option>
                {filteredPMs.slice(0, 50).map((pm: any) => (
                  <option key={pm.employee_id} value={pm.employee_id}>
                    {pm.name} ({pm.employee_id}) · {pm.practice} · {pm.reportee_count}/{pm.max_capacity}
                  </option>
                ))}
              </select>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder={overrideModal.isPMResigned
                  ? "PM has resigned — provide reassignment justification (e.g. reassigning to closest-match PM per §4 constraint relaxation)..."
                  : "Provide reason for manual PM change (e.g. practice realignment, employee request, capacity issue)..."}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">This will be recorded in the audit trail.</p>
            </div>

            {/* Status */}
            {overrideStatus && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                overrideStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {overrideStatus.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {overrideStatus.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleOverride}
                disabled={!selectedPmId || !justification.trim() || overriding}
                className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 ${
                  overrideModal.isPMResigned
                    ? 'bg-red-600 hover:bg-red-700'
                    : ''
                }`}
                style={overrideModal.isPMResigned ? {} : { background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
              >
                {overriding
                  ? 'Applying Override...'
                  : overrideModal.isPMResigned
                    ? 'Confirm Mandatory Reassignment'
                    : 'Confirm Override'}
              </button>
              <button
                onClick={() => setOverrideModal(null)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function SummaryCard({
  label, value, icon: Icon, color, description, linkTo
}: {
  label: string; value: number; icon: any; color: string; description: string; linkTo?: string;
}) {
  const card = (
    <div className={`bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow cursor-pointer`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className={`${color} p-2 rounded-lg`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{description}</p>
      {linkTo && (
        <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: '#12ABDB' }}>
          View all <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
  return linkTo ? <Link to={linkTo}>{card}</Link> : card;
}

function CapacityRow({ pm, variant }: { pm: any; variant: 'over' | 'near' }) {
  const pct = Math.round((pm.reportee_count / pm.max_capacity) * 100);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      variant === 'over' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{pm.name}</p>
        <p className="text-xs text-gray-500">{pm.practice} · {pm.grade}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${variant === 'over' ? 'text-red-600' : 'text-orange-600'}`}>
          {pm.reportee_count}/{pm.max_capacity}
        </p>
        <p className="text-xs text-gray-500">{pct}%</p>
      </div>
    </div>
  );
}

function QuickLink({ to, label, count, color }: { to: string; label: string; count?: number; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  };
  const textColorMap: Record<string, string> = {
    yellow: 'text-yellow-700', purple: 'text-purple-700', blue: 'text-blue-700',
  };
  return (
    <Link
      to={to}
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${colorMap[color]}`}
    >
      <span className={`font-semibold text-sm ${textColorMap[color]}`}>{label}</span>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-white shadow-sm ${textColorMap[color]}`}>
            {count}
          </span>
        )}
        <ArrowRight size={16} className={textColorMap[color]} />
      </div>
    </Link>
  );
}
