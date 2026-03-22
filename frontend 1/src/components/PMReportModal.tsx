import { useGetPMDetailReportQuery } from '../services/pmApi';
import {
  X, Download, Loader2, UserCog, Users, AlertTriangle,
  Calendar, CheckCircle, Clock, TrendingUp, TrendingDown,
  Briefcase, MapPin, Award, Mail
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface PMReportModalProps {
  pmId: string;
  pmName: string;
  onClose: () => void;
}

export default function PMReportModal({ pmId, pmName, onClose }: PMReportModalProps) {
  const { data, isLoading, isError } = useGetPMDetailReportQuery(pmId);

  /* ── helpers ── */
  const getUtilColor = (u: number) => {
    if (u >= 90) return 'text-red-600 bg-red-100';
    if (u >= 80) return 'text-orange-600 bg-orange-100';
    if (u >= 50) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const exportToCSV = () => {
    if (!data) return;
    const { pm, reportees, separation, pendingAssignments } = data;
    const rows: string[][] = [];

    // PM summary block
    rows.push(['=== PEOPLE MANAGER REPORT ===']);
    rows.push(['Generated', new Date().toISOString()]);
    rows.push([]);
    rows.push(['PM ID', pm.employee_id]);
    rows.push(['Name', pm.name]);
    rows.push(['Email', pm.email]);
    rows.push(['Practice', pm.practice]);
    rows.push(['CU', pm.cu]);
    rows.push(['Region', pm.region]);
    rows.push(['Grade', pm.grade]);
    rows.push(['Primary Skill', pm.skill || '-']);
    rows.push(['Reportee Count', pm.reportee_count]);
    rows.push(['Max Capacity', pm.max_capacity]);
    rows.push(['Utilization %', `${data.utilization}%`]);
    rows.push(['Status', pm.is_active ? 'Active' : 'Inactive']);

    if (separation) {
      rows.push([]);
      rows.push(['=== SEPARATION RECORD ===']);
      rows.push(['Last Working Day', format(new Date(separation.lwd), 'dd-MMM-yyyy')]);
      rows.push(['Reason', separation.reason || '-']);
      rows.push(['Status', separation.status]);
    }

    rows.push([]);
    rows.push(['=== REPORTEES ===']);
    rows.push(['Employee ID', 'Name', 'Email', 'Practice', 'CU', 'Region', 'Grade', 'Skill', 'New Joiner']);
    reportees.forEach(r => rows.push([
      r.employee_id, r.name, r.email, r.practice, r.cu, r.region,
      r.grade, r.skill || '-', r.is_new_joiner ? 'Yes' : 'No'
    ]));

    if (pendingAssignments.length > 0) {
      rows.push([]);
      rows.push(['=== PENDING ASSIGNMENTS ===']);
      rows.push(['Assignment ID', 'Employee', 'Grade', 'Skill', 'Type', 'Match Score']);
      pendingAssignments.forEach(a => rows.push([
        a.id, a.employee_name, a.employee_grade, a.employee_skill || '-',
        a.assignment_type, a.match_score ?? '-'
      ]));
    }

    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PM_Report_${pm.employee_id}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    /* ── backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: 'linear-gradient(135deg,#12ABDB 0%,#0070AD 100%)' }}>
          <div className="flex items-center gap-3 text-white">
            <UserCog className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">PM Report — {pmName}</h2>
              <p className="text-sm opacity-80">ID: {pmId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              disabled={isLoading || !data}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 text-white rounded-md transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-md transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {isLoading && (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
              <span className="ml-2 text-gray-600">Loading PM report…</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>Failed to load PM report. The PM may not exist or the server is unavailable.</p>
            </div>
          )}

          {data && (
            <>
              {/* ── Separation Warning ── */}
              {data.separation && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-800">⚠️ Separation on Record</p>
                    <p className="text-sm text-orange-700">
                      Last Working Day: <strong>{format(new Date(data.separation.lwd), 'dd MMM yyyy')}</strong>
                      {' '}({differenceInDays(new Date(data.separation.lwd), new Date())} days remaining)
                      {data.separation.reason && ` · Reason: ${data.separation.reason}`}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {data.reportees.length} reportees will need reassignment.
                    </p>
                  </div>
                </div>
              )}

              {/* ── PM Profile Card ── */}
              <div className="bg-gray-50 rounded-lg p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-800 break-all">{data.pm.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Practice / CU</p>
                    <p className="text-sm font-medium text-gray-800">{data.pm.practice}</p>
                    <p className="text-xs text-gray-500">{data.pm.cu}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Region</p>
                    <p className="text-sm font-medium text-gray-800">{data.pm.region}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Grade / Skill</p>
                    <p className="text-sm font-medium text-gray-800">{data.pm.grade}</p>
                    <p className="text-xs text-gray-500">{data.pm.skill || '—'}</p>
                  </div>
                </div>
              </div>

              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Reportees</p>
                  <p className="text-3xl font-bold text-gray-800">{data.reportees.length}</p>
                  <p className="text-xs text-gray-400">of {data.pm.max_capacity} max</p>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Utilization</p>
                  <p className={`text-3xl font-bold ${getUtilColor(data.utilization).split(' ')[0]}`}>
                    {data.utilization}%
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {data.utilization >= 80
                      ? <TrendingUp className="w-3 h-3 text-red-500" />
                      : <TrendingDown className="w-3 h-3 text-green-500" />}
                    <span className="text-xs text-gray-400">
                      {data.utilization >= 90 ? 'Over capacity' : data.utilization >= 80 ? 'High' : data.utilization >= 50 ? 'Optimal' : 'Under-utilized'}
                    </span>
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">New Joiners</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {data.reportees.filter(r => r.is_new_joiner).length}
                  </p>
                  <p className="text-xs text-gray-400">in team</p>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Pending Assign.</p>
                  <p className="text-3xl font-bold text-orange-600">{data.pendingAssignments.length}</p>
                  <p className="text-xs text-gray-400">awaiting approval</p>
                </div>
              </div>

              {/* ── Utilization Bar ── */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Capacity Utilization</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getUtilColor(data.utilization)}`}>
                    {data.reportees.length} / {data.pm.max_capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      data.utilization >= 90 ? 'bg-red-500' :
                      data.utilization >= 80 ? 'bg-orange-400' :
                      data.utilization >= 50 ? 'bg-green-500' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(data.utilization, 100)}%` }}
                  />
                </div>
              </div>

              {/* ── Distribution Row ── */}
              {(data.gradeDistribution.length > 0 || data.practiceDistribution.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.gradeDistribution.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Reportees by Grade</p>
                      <div className="space-y-2">
                        {data.gradeDistribution.map(g => {
                          const pct = data.reportees.length > 0 ? Math.round((parseInt(g.count) / data.reportees.length) * 100) : 0;
                          return (
                            <div key={g.grade} className="flex items-center gap-2">
                              <span className="text-xs w-10 font-medium text-gray-600">{g.grade}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="bg-[#0070AD] h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">{g.count} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {data.practiceDistribution.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Reportees by Practice</p>
                      <div className="space-y-2">
                        {data.practiceDistribution.map(p => {
                          const pct = data.reportees.length > 0 ? Math.round((parseInt(p.count) / data.reportees.length) * 100) : 0;
                          return (
                            <div key={p.practice} className="flex items-center gap-2">
                              <span className="text-xs w-28 truncate font-medium text-gray-600" title={p.practice}>{p.practice || '—'}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="bg-[#12ABDB] h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">{p.count} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Reportees Table ── */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
                  <Users className="w-4 h-4 text-[#0070AD]" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Reportees ({data.reportees.length})
                  </h3>
                </div>
                {data.reportees.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No active reportees assigned to this PM.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Employee ID', 'Name', 'Practice', 'CU', 'Grade', 'Skill', 'New Joiner'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.reportees.map(r => (
                          <tr key={r.employee_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs text-gray-600">{r.employee_id}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium text-gray-800">{r.name}</div>
                              <div className="text-xs text-gray-400">{r.email}</div>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{r.practice}</td>
                            <td className="px-4 py-2 text-gray-600">{r.cu}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{r.grade}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{r.skill || '—'}</td>
                            <td className="px-4 py-2 text-center">
                              {r.is_new_joiner
                                ? <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">New</span>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Pending Assignments ── */}
              {data.pendingAssignments.length > 0 && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b bg-orange-50">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-semibold text-orange-700">
                      Pending Assignments ({data.pendingAssignments.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Employee', 'Grade', 'Skill', 'Type', 'Match Score', 'Raised On'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.pendingAssignments.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <div className="font-medium text-gray-800">{a.employee_name}</div>
                              <div className="text-xs text-gray-400">{a.employee_id}</div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{a.employee_grade}</span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{a.employee_skill || '—'}</td>
                            <td className="px-4 py-2">
                              <span className="text-xs font-medium capitalize text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                                {a.assignment_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {a.match_score != null
                                ? <span className="font-semibold text-green-700">{parseFloat(a.match_score).toFixed(1)}%</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-2 text-gray-500 text-xs">
                              {format(new Date(a.created_at), 'dd MMM yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {data && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50 text-xs text-gray-400">
            <span>Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {data.pm.is_active ? 'Active PM' : 'Inactive PM'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                {data.reportees.length} reportee{data.reportees.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
