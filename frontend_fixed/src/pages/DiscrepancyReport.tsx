import { useState } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle, RefreshCw, ChevronDown, ChevronUp,
  UserX, Users, Activity, Clock, Download, Info, ShieldAlert, TrendingDown, Zap,
} from 'lucide-react';
import {
  useGetDiscrepancyReportQuery,
  useTriggerDiscrepancyReportMutation,
  useLazyGetDiscrepancyDetailsQuery,
} from '../services/pmApi';

// ─── Discrepancy type metadata ────────────────────────────────────────────────
const DISC_TYPES = [
  {
    key:      'no_pm_assigned',
    label:    'No PM Assigned',
    action:   'Assign a PM',
    severity: 'critical',
    icon:     UserX,
    color:    { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', icon: 'text-red-500' },
    note:     'Active employees with no People Manager assigned at all.',
  },
  {
    key:      'wrong_practice',
    label:    'Wrong Practice',
    action:   'Re-align PM',
    severity: 'high',
    icon:     AlertTriangle,
    color:    { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    note:     "Employee's practice does not match PM's practice.",
  },
  {
    key:      'wrong_sub_practice',
    label:    'Wrong Sub-Practice',
    action:   'Optional re-align',
    severity: 'medium',
    icon:     AlertCircle,
    color:    { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', icon: 'text-yellow-500' },
    note:     "Same practice but different sub-practice between employee and PM.",
  },
  {
    key:      'wrong_cu',
    label:    'Wrong CU',
    action:   'Re-align to same CU PM',
    severity: 'high',
    icon:     AlertTriangle,
    color:    { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    note:     'Employee and PM are in different Competency Units (CU). CU alignment is the highest-weighted matching rule.',
  },
  {
    key:      'wrong_region',
    label:    'Wrong Region',
    action:   'Re-align to same region PM',
    severity: 'high',
    icon:     AlertTriangle,
    color:    { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
    note:     'Employee and PM are in different regions.',
  },
  {
    key:      'wrong_grade',
    label:    'Wrong Grade',
    action:   'Reassign to correct grade PM',
    severity: 'high',
    icon:     ShieldAlert,
    color:    { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    note:     'PM must be exactly one grade above the employee. Includes same-grade (worst case) and multi-grade gaps.',
  },
  {
    key:      'same_grade_violation',
    label:    'Same Grade (Subset)',
    action:   'Reassign to senior PM',
    severity: 'high',
    icon:     ShieldAlert,
    color:    { bg: 'bg-rose-50', border: 'border-rose-300', badge: 'bg-rose-100 text-rose-700', icon: 'text-rose-500' },
    note:     'PM and employee share the exact same grade — a subset of Wrong Grade violations.',
  },
  {
    key:      'pm_not_active',
    label:    'PM Not Active',
    action:   'Reassign immediately',
    severity: 'critical',
    icon:     UserX,
    color:    { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', icon: 'text-red-500' },
    note:     'Employee is assigned to a deactivated PM.',
  },
  {
    key:      'pm_overloaded',
    label:    'PM Overloaded',
    action:   'Redistribute reportees',
    severity: 'high',
    icon:     Activity,
    color:    { bg: 'bg-orange-50', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    note:     'PM has reached or exceeded their maximum reportee capacity.',
  },
  {
    key:      'pm_separated',
    label:    'PM Separation Pending',
    action:   'Initiate handover',
    severity: 'critical',
    icon:     TrendingDown,
    color:    { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', icon: 'text-red-500' },
    note:     "PM has a separation record with upcoming or recent LWD (\u2264 90 days).",
  },
  {
    key:      'pm_on_leave',
    label:    'PM On Long Leave',
    action:   'Arrange temporary cover',
    severity: 'medium',
    icon:     Clock,
    color:    { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', icon: 'text-yellow-500' },
    note:     'PM is on leave for more than 30 days.',
  },
];

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };

// ─── Detail column definitions per type ──────────────────────────────────────
const DETAIL_COLS: Record<string, { key: string; label: string }[]> = {
  no_pm_assigned:     [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'grade', label: 'Grade' }, { key: 'location', label: 'Location' }, { key: 'days_since_joining', label: 'Days Since Joining' }],
  wrong_practice:     [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'emp_practice', label: 'Emp Practice' }, { key: 'emp_sub_practice', label: 'Emp Sub-Practice' }, { key: 'pm_practice', label: 'PM Practice' }, { key: 'pm_sub_practice', label: 'PM Sub-Practice' }, { key: 'emp_grade', label: 'Grade' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  wrong_sub_practice:   [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'emp_sub_practice', label: 'Emp Sub-Practice' }, { key: 'pm_sub_practice', label: 'PM Sub-Practice' }, { key: 'emp_grade', label: 'Grade' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  wrong_cu:             [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'emp_cu', label: 'Emp CU' }, { key: 'pm_cu', label: 'PM CU' }, { key: 'emp_grade', label: 'Emp Grade' }, { key: 'pm_grade', label: 'PM Grade' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  wrong_region:         [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'emp_region', label: 'Emp Region' }, { key: 'pm_region', label: 'PM Region' }, { key: 'emp_grade', label: 'Emp Grade' }, { key: 'pm_grade', label: 'PM Grade' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  wrong_grade:          [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'emp_grade', label: 'Emp Grade' }, { key: 'pm_grade', label: 'PM Grade' }, { key: 'grade_gap', label: 'Grade Gap' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  same_grade_violation: [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'emp_grade', label: 'Emp Grade' }, { key: 'pm_grade', label: 'PM Grade' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }],
  pm_not_active:      [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }, { key: 'pm_email', label: 'PM Email' }, { key: 'pm_grade', label: 'PM Grade' }],
  pm_overloaded:      [{ key: 'employee_id', label: 'PM ID' }, { key: 'name', label: 'PM Name' }, { key: 'email', label: 'PM Email' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'grade', label: 'Grade' }, { key: 'reportee_count', label: 'Reportees' }, { key: 'max_capacity', label: 'Max Cap' }, { key: 'utilization_pct', label: 'Util %' }],
  pm_separated:       [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }, { key: 'lwd', label: 'LWD' }, { key: 'separation_type', label: 'Type' }, { key: 'days_until_lwd', label: 'Days Left' }],
  pm_on_leave:        [{ key: 'employee_id', label: 'Emp ID' }, { key: 'name', label: 'Name' }, { key: 'practice', label: 'Practice' }, { key: 'sub_practice', label: 'Sub-Practice' }, { key: 'pm_id', label: 'PM ID' }, { key: 'pm_name', label: 'PM Name' }, { key: 'leave_start_date', label: 'Leave From' }, { key: 'leave_end_date', label: 'Leave To' }, { key: 'leave_days', label: 'Days' }],
};

// ─── Helper: export detail rows to CSV ───────────────────────────────────────
function exportCSV(type: string, data: any[], cols: { key: string; label: string }[]) {
  const headers = cols.map(c => c.label).join(',');
  const rows = data.map(r =>
    cols.map(c => {
      const v = r[c.key] ?? '';
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v);
    }).join(',')
  );
  const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `discrepancy_${type}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Detail panel for one discrepancy type ───────────────────────────────────
function DetailPanel({ typeKey }: { typeKey: string }) {
  const [page, setPage] = useState(1);
  const [fetchDetails, { data, isFetching, error }] = useLazyGetDiscrepancyDetailsQuery();
  const pageSize = 50;

  const load = (p: number) => {
    setPage(p);
    fetchDetails({ type: typeKey, page: p, pageSize });
  };

  const cols = DETAIL_COLS[typeKey] || [];

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      {!data && !isFetching ? (
        <div className="p-4 text-center">
          <button
            onClick={() => load(1)}
            className="px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Load Detail Records
          </button>
        </div>
      ) : isFetching ? (
        <div className="p-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <RefreshCw size={16} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-4 text-red-600 text-sm">Failed to load detail records.</div>
      ) : data && data.count === 0 ? (
        <div className="p-6 text-center text-green-600 text-sm font-medium flex items-center justify-center gap-2">
          <CheckCircle size={16} /> No issues — all clear!
        </div>
      ) : data ? (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs text-gray-500">{data.count} total record{data.count !== 1 ? 's' : ''}</span>
            <button
              onClick={() => exportCSV(typeKey, data.data, cols)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  {cols.map(c => (
                    <th key={c.key} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {cols.map(c => {
                      let val = row[c.key] ?? '—';
                      // Format dates
                      if (c.key.includes('date') || c.key === 'lwd') {
                        val = val && val !== '—' ? new Date(val).toLocaleDateString('en-GB') : '—';
                      }
                      // Highlight days_until_lwd
                      if (c.key === 'days_until_lwd') {
                        const n = parseInt(val);
                        return (
                          <td key={c.key} className="px-3 py-1.5">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${n <= 7 ? 'bg-red-100 text-red-700' : n <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                              {val}
                            </span>
                          </td>
                        );
                      }
                      // Highlight utilization
                      if (c.key === 'utilization_pct') {
                        const n = parseFloat(val);
                        return (
                          <td key={c.key} className="px-3 py-1.5">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${n >= 100 ? 'bg-red-100 text-red-700' : n >= 90 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                              {val}%
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={c.key} className="px-3 py-1.5 text-gray-700 max-w-[180px] truncate" title={String(val)}>{val}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-500">
                Page {page} of {data.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                >Prev</button>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => load(page + 1)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                >Next</button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DiscrepancyReport() {
  const { data: snapshot, isLoading, isError, refetch } = useGetDiscrepancyReportQuery();
  const [triggerGenerate, { isLoading: isGenerating }] = useTriggerDiscrepancyReportMutation();
  const [openType, setOpenType] = useState<string | null>(null);

  const handleRefresh = async () => {
    await triggerGenerate().unwrap();
    refetch();
  };

  const summary = snapshot?.summary ?? {};
  const healthScore = snapshot?.health_score ?? 0;
  const healthColor =
    healthScore >= 90 ? { text: 'text-green-600', bg: 'bg-green-100', ring: 'ring-green-400', label: 'Excellent' } :
    healthScore >= 75 ? { text: 'text-yellow-600', bg: 'bg-yellow-100', ring: 'ring-yellow-400', label: 'Fair' } :
                        { text: 'text-red-600', bg: 'bg-red-100', ring: 'ring-red-400', label: 'Needs Attention' };

  const sortedTypes = [...DISC_TYPES].sort(
    (a, b) => SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] - SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
        <RefreshCw size={24} className="animate-spin" />
        <span className="text-lg">Loading discrepancy report…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 max-w-lg w-full">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Failed to load discrepancy data</p>
            <p className="text-sm text-red-600 mt-0.5">The backend query could not complete. Check server logs for details.</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-semibold shadow"
          style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert size={28} className="text-orange-500" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-800">PM Discrepancy Report</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <Zap size={11} /> Live
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Comprehensive audit of all PM↔Employee assignment issues · Real-time data
              {(snapshot as any)?.last_saved_at && (
                <> · Last saved snapshot: <strong>{new Date((snapshot as any).last_saved_at).toLocaleString()}</strong>
                  {' '}<span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs ml-1">
                    via {((snapshot as any).last_triggered_by || '').replace(/_/g, ' ')}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={handleRefresh}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-semibold disabled:opacity-50 transition-all shadow"
            style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Saving…' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Health Score + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score */}
        <div className={`bg-white rounded-xl shadow-md p-6 flex items-center gap-4 md:col-span-1`}>
          <div className={`w-20 h-20 rounded-full ${healthColor.ring} ring-4 ${healthColor.bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-2xl font-bold ${healthColor.text}`}>{healthScore}%</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Health Score</p>
            <p className={`text-lg font-bold ${healthColor.text}`}>{healthColor.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot?.total_employees?.toLocaleString() || 0} employees · {snapshot?.total_pms?.toLocaleString() || 0} active PMs
            </p>
          </div>
        </div>

        {/* Quick stat tiles */}
        {[
          { label: 'Total Issues', value: summary.total_issues ?? 0, color: 'text-red-600', sub: 'employee-level' },
          { label: 'Critical', value: (summary.no_pm_assigned ?? 0) + (summary.pm_not_active ?? 0) + (summary.pm_separated ?? 0), color: 'text-red-500', sub: 'require immediate action' },
          { label: 'PM Overloaded', value: summary.pm_overloaded ?? 0, color: 'text-orange-500', sub: 'PMs at/over capacity' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-md p-6">
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{s.label}</p>
            <p className={`text-4xl font-bold ${s.color} mt-1`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          This report shows <strong>live data</strong> — counts refresh every time you open this page or click <strong>Refresh</strong>.
          Use <strong>Save Snapshot</strong> to save a point-in-time record for historical comparison.
          Snapshots are also auto-saved after every file upload.
          Expand any category below to view affected records and export them to CSV.
        </p>
      </div>

      {/* Discrepancy type cards */}
      <div className="space-y-3">
        {sortedTypes.map(dt => {
          const count = (summary as any)[dt.key] ?? 0;
          const isOpen = openType === dt.key;
          const Icon = dt.icon;

          return (
            <div key={dt.key} className={`bg-white rounded-xl shadow-sm border ${dt.color.border} overflow-hidden`}>
              <button
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left`}
                onClick={() => setOpenType(isOpen ? null : dt.key)}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg ${dt.color.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={dt.color.icon} />
                </div>

                {/* Label + note */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{dt.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dt.color.badge}`}>
                      {dt.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{dt.note}</p>
                </div>

                {/* Count + chevron */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-2xl font-bold ${count > 0 ? dt.color.icon : 'text-green-600'}`}>
                    {count}
                  </span>
                  {count === 0
                    ? <CheckCircle size={18} className="text-green-500" />
                    : isOpen
                    ? <ChevronUp size={18} className="text-gray-400" />
                    : <ChevronDown size={18} className="text-gray-400" />
                  }
                </div>

                {/* Action badge */}
                {count > 0 && (
                  <span className="text-xs text-gray-500 italic hidden md:inline">→ {dt.action}</span>
                )}
              </button>

              {/* Expandable detail panel */}
              {isOpen && count > 0 && (
                <div className="px-5 pb-4">
                  <DetailPanel typeKey={dt.key} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All-clear banner */}
      {snapshot && (summary.total_issues ?? 0) === 0 && (summary.pm_overloaded ?? 0) === 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-5">
          <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">All assignments look healthy!</p>
            <p className="text-sm text-green-700 mt-0.5">
              No discrepancies detected across {snapshot.total_employees?.toLocaleString()} active employees
              and {snapshot.total_pms?.toLocaleString()} active PMs.
            </p>
          </div>
        </div>
      )}

      {/* Sub-practice note */}
      <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <Users size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">Sub-Practice alignment</strong> is checked only when both the employee
          and their PM have a sub-practice value recorded <em>and</em> they share the same top-level practice.
          Employees with no sub-practice set are excluded from this check.
        </p>
      </div>
    </div>
  );
}
