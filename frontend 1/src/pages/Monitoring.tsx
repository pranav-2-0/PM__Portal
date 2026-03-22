import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, RefreshCw, ArrowRight, UserCog,
  TrendingUp, CheckCircle, Search, X, ChevronLeft, ChevronRight, UserCheck, Download, Info, Phone, Mail, User, Briefcase
} from 'lucide-react';
import {
  useGetMisalignmentsQuery,
  useGetPMCapacityReportQuery,
  useGetPMsListQuery,
  useOverridePMAssignmentMutation,
} from '../services/pmApi';

interface OverrideModal {
  employeeId: string;
  employeeName: string;
  currentPmName: string;
}

export default function Monitoring() {
  const [misPage, setMisPage] = useState(1);
  const [misPageSize, setMisPageSize] = useState(50);
  const [activeTab, setActiveTab] = useState<'all' | 'WRONG_PRACTICE' | 'WRONG_SUB_PRACTICE' | 'WRONG_CU' | 'WRONG_REGION' | 'WRONG_GRADE' | 'PM_ON_LEAVE' | 'PM_SEPARATED'>('all');

  const tabTypeParam = activeTab === 'all' ? undefined : activeTab;
  const { data: misData, isLoading: misLoading, refetch: refetchMis } = useGetMisalignmentsQuery({ page: misPage, pageSize: misPageSize, type: tabTypeParam });
  const { data: capacityReport } = useGetPMCapacityReportQuery();
  const { data: pmsList } = useGetPMsListQuery({ page: 1, pageSize: 500 } as any);
  const [overridePM, { isLoading: overriding }] = useOverridePMAssignmentMutation();

  const [overrideModal, setOverrideModal] = useState<OverrideModal | null>(null);
  const [selectedPmId, setSelectedPmId] = useState('');
  const [justification, setJustification] = useState('');
  const [pmSearch, setPmSearch] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pmDetailPopup, setPmDetailPopup] = useState<any | null>(null);

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Monitoring</h1>
            <p className="text-gray-600 mt-0.5">Track misalignments, capacity issues, and pending actions</p>
          </div>
        </div>
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
            onClick={() => window.open(`/api/pm/employees/misalignments/export?type=${activeTab}`, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Download size={13} /> Export CSV
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee Details</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Current PM</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">PM Practice / Skill</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mismatches</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <span className="flex items-center gap-1 text-green-700">
                      <UserCheck size={14} />
                      Suggested Correct PM
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {misData.misalignments.map((row: any, i: number) => (
                  <tr key={i} className={`border-b border-gray-100 transition-colors ${
                    row.mismatch_type === 'PM_ON_LEAVE' ? 'bg-yellow-50 hover:bg-yellow-100' :
                    row.mismatch_type === 'PM_SEPARATED' ? 'bg-red-50 hover:bg-red-100' :
                    'hover:bg-red-50'
                  }`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{row.employee_name}</p>
                      <p className="text-xs text-gray-400">{row.employee_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium">{row.emp_practice}</p>
                      {row.emp_sub_practice && <p className="text-xs text-gray-500">{row.emp_sub_practice}</p>}
                      <p className="text-xs text-gray-400">{row.emp_cu} · {row.emp_region}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{row.pm_name}</p>
                      <p className="text-xs text-gray-400">{row.pm_id}</p>
                      {row.mismatch_type === 'PM_ON_LEAVE' && row.leave_end_date && (
                        <span className="text-xs text-yellow-700 font-medium">On leave until {new Date(row.leave_end_date).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium">{row.pm_practice}</p>
                      {row.pm_sub_practice && <p className="text-xs text-gray-500">{row.pm_sub_practice}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.mismatch_type === 'PM_ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                        row.mismatch_type === 'PM_SEPARATED' ? 'bg-red-100 text-red-800' :
                        row.mismatch_type === 'WRONG_SUB_PRACTICE' ? 'bg-orange-100 text-orange-800' :
                        row.mismatch_type === 'WRONG_CU'           ? 'bg-amber-100 text-amber-800' :
                        row.mismatch_type === 'WRONG_REGION'       ? 'bg-amber-100 text-amber-800' :
                        row.mismatch_type === 'WRONG_GRADE'        ? 'bg-rose-100 text-rose-800' :
                        'bg-red-100 text-red-700'
                      }`}>
                        ⚠ {(row.mismatch_type || 'MISMATCH').replace(/_/g, ' ')}
                      </span>
                    </td>
                    {/* Suggested correct PM */}
                    <td className="px-4 py-3">
                      {row.suggested_pm_id ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => setPmDetailPopup(row)}
                            className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-900 hover:underline text-left transition-colors group"
                          >
                            <UserCheck size={14} className="text-green-500 flex-shrink-0" />
                            {row.suggested_pm_name}
                            <Info size={12} className="text-green-400 group-hover:text-green-600 flex-shrink-0" />
                          </button>
                          <button
                            onClick={() => {
                              openOverrideModal(row);
                              setSelectedPmId(row.suggested_pm_id);
                            }}
                            className="text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors text-left"
                          >
                            Use Suggested PM
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No matching PM found</span>
                      )}
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

      {/* PM Detail Popup */}
      {pmDetailPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPmDetailPopup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-100 rounded-xl">
                  <UserCheck size={20} className="text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Suggested PM Details</h3>
                  <p className="text-xs text-gray-500">Best matched People Manager</p>
                </div>
              </div>
              <button onClick={() => setPmDetailPopup(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User size={16} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-semibold text-gray-900">{pmDetailPopup.suggested_pm_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-400 text-xs font-mono flex-shrink-0 w-4 text-center">#</span>
                <div>
                  <p className="text-xs text-gray-500">CGID / Employee ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{pmDetailPopup.suggested_pm_id}</p>
                </div>
              </div>

              {pmDetailPopup.suggested_pm_email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail size={16} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <a href={`mailto:${pmDetailPopup.suggested_pm_email}`} className="text-sm font-medium text-indigo-600 hover:underline">
                      {pmDetailPopup.suggested_pm_email}
                    </a>
                  </div>
                </div>
              )}

              {pmDetailPopup.suggested_pm_phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone size={16} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{pmDetailPopup.suggested_pm_phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Briefcase size={16} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Practice</p>
                  <p className="text-sm font-semibold text-gray-900">{pmDetailPopup.suggested_pm_practice}</p>
                  {pmDetailPopup.suggested_pm_sub_practice && (
                    <p className="text-xs text-gray-500 mt-0.5">{pmDetailPopup.suggested_pm_sub_practice}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 bg-indigo-50 rounded-lg text-center">
                  <p className="text-xs text-indigo-500">Grade</p>
                  <p className="text-sm font-bold text-indigo-800">{pmDetailPopup.suggested_pm_grade || '—'}</p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-blue-500">Region</p>
                  <p className="text-sm font-bold text-blue-800">{pmDetailPopup.suggested_pm_region || '—'}</p>
                </div>
                <div className="p-2.5 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-green-500">Capacity</p>
                  <p className="text-sm font-bold text-green-800">{pmDetailPopup.suggested_pm_reportees}/{pmDetailPopup.suggested_pm_capacity}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setPmDetailPopup(null);
                  openOverrideModal(pmDetailPopup);
                  setSelectedPmId(pmDetailPopup.suggested_pm_id);
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
              >
                Use This PM
              </button>
              <button
                onClick={() => setPmDetailPopup(null)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
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

            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
              <p><span className="text-gray-500 w-28 inline-block">Employee:</span>
                <span className="font-semibold">{overrideModal.employeeName}</span></p>
              <p><span className="text-gray-500 w-28 inline-block">Current PM:</span>
                <span className="font-medium text-red-600">{overrideModal.currentPmName}</span></p>
            </div>

            {/* PM Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Select New PM <span className="text-red-500">*</span>
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
                placeholder="Provide reason for manual PM change (e.g. practice realignment, employee request, capacity issue)..."
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
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
              >
                {overriding ? 'Applying Override...' : 'Confirm Override'}
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
