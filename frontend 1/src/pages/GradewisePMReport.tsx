import { useState } from 'react';
import { ArrowLeft, Download, BarChart3, Users, TrendingUp, ChevronRight, Search, X } from 'lucide-react';
import { useGetGradewisePMCapacityQuery } from '../services/pmApi';
import Pagination from '../components/Pagination';

const DRILL_PAGE_SIZE = 25;

const utilizationColor = (pct: number) => {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 80) return 'bg-orange-400';
  return 'bg-green-500';
};

const utilizationTextColor = (pct: number) => {
  if (pct >= 90) return 'text-red-700 bg-red-100';
  if (pct >= 80) return 'text-orange-700 bg-orange-100';
  return 'text-green-700 bg-green-100';
};

const UtilizationBar = ({ pct }: { pct: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]">
      <div
        className={`h-2 rounded-full transition-all ${utilizationColor(pct)}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${utilizationTextColor(pct)}`}>
      {pct?.toFixed(0) ?? 0}%
    </span>
  </div>
);

export default function GradewisePMReport() {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [search, setSearch]                     = useState('');
  const [filterPractice, setFilterPractice]     = useState('');
  const [filterLocation, setFilterLocation]     = useState('');
  const [filterSkill, setFilterSkill]           = useState('');
  const [filterUtil, setFilterUtil]             = useState(''); // '' | 'over' | 'near' | 'ok'
  const [drillPage, setDrillPage]               = useState(1);

  const { data: overviewData, isLoading: overviewLoading } = useGetGradewisePMCapacityQuery({});
  const { data: drilldownData, isLoading: drilldownLoading } = useGetGradewisePMCapacityQuery(
    { grade: selectedGrade! },
    { skip: !selectedGrade }
  );

  const overview  = overviewData?.grades ?? [];
  const drilldown = drilldownData?.pms   ?? [];

  // Derived filter options from drilldown data
  const practiceOptions  = [...new Set(drilldown.map((r: any) => r.practice).filter(Boolean))].sort() as string[];
  const locationOptions  = [...new Set(drilldown.map((r: any) => r.location).filter(Boolean))].sort() as string[];
  const skillOptions     = [...new Set(drilldown.map((r: any) => r.skill).filter(Boolean))].sort() as string[];

  const clearFilters = () => { setSearch(''); setFilterPractice(''); setFilterLocation(''); setFilterSkill(''); setFilterUtil(''); setDrillPage(1); };
  const hasFilters = !!(search || filterPractice || filterLocation || filterSkill || filterUtil);

  // Apply filters
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

  const totalPMs = overview.reduce((s: number, r: any) => s + (r.total_pms ?? 0), 0);
  const totalCapacity = overview.reduce((s: number, r: any) => s + (r.total_capacity ?? 0), 0);
  const totalReportees = overview.reduce((s: number, r: any) => s + (r.total_reportees ?? 0), 0);
  const overallUtilization = totalCapacity > 0 ? (totalReportees / totalCapacity) * 100 : 0;

  const exportCSV = () => {
    if (selectedGrade && filteredDrilldown.length > 0) {
      const headers = ['PM ID', 'PM Name', 'Email', 'Practice', 'Sub-Practice', 'Location', 'Skill', 'Reportees', 'Max Capacity', 'Utilization %', 'Status'];
      const rows = filteredDrilldown.map((r: any) => [
        r.employee_id, `"${(r.name || '').replace(/"/g, '""')}"`,
        r.email || '',
        r.practice, r.sub_practice || '',
        r.location || '', r.skill || '',
        r.reportee_count, r.max_capacity,
        r.utilization_pct ?? 0, r.status
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradewise_${selectedGrade}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Grade', 'Total PMs', 'Total Capacity', 'Allocated', 'Available', 'Utilization %'];
      const rows = overview.map((r: any) => [
        r.grade, r.total_pms, r.total_capacity, r.total_reportees, r.available_capacity, r.utilization_pct ?? 0
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gradewise_pm_capacity.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {selectedGrade && (
            <button
              onClick={() => { setSelectedGrade(null); clearFilters(); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0070AD] transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-[#0070AD]" size={24} />
              {selectedGrade ? `Grade ${selectedGrade} — PM Drill-down` : 'Gradewise PM Capacity Report'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedGrade
                ? `Individual PMs at grade ${selectedGrade} — ${drilldown.length} PMs`
                : 'Overall PM capacity and utilization grouped by grade'}
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#0070AD] text-white rounded-lg text-sm hover:bg-[#005a8a] transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary stats (overview only) */}
      {!selectedGrade && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <p className={`text-3xl font-bold ${overallUtilization >= 90 ? 'text-red-600' : overallUtilization >= 80 ? 'text-orange-500' : 'text-green-600'}`}>
              {overallUtilization.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Overview Table */}
      {!selectedGrade && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={18} className="text-[#0070AD]" />
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
              <p className="font-medium">No PM data found</p>
              <p className="text-sm mt-1">Upload a GAD report to populate PM records</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Grade</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">Total PMs</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">Total Capacity</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">Allocated</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">Available</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 min-w-[160px]">Utilization</th>
                  <th className="px-2 py-3" />
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
                    <td className="px-6 py-4">
                      <UtilizationBar pct={parseFloat(row.utilization_pct ?? 0)} />
                    </td>
                    <td className="px-2 py-4 text-gray-400">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Drill-down Table */}
      {selectedGrade && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#0070AD]" />
            <h2 className="font-semibold text-gray-800">
              Grade {selectedGrade} — Individual PMs
            </h2>
            <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {filteredDrilldown.length}{hasFilters && drilldown.length !== filteredDrilldown.length ? ` of ${drilldown.length}` : ''} PMs
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
            <select
              value={filterPractice}
              onChange={e => { setFilterPractice(e.target.value); setDrillPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[160px]"
            >
              <option value="">All Practices</option>
              {practiceOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={filterLocation}
              onChange={e => { setFilterLocation(e.target.value); setDrillPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[140px]"
            >
              <option value="">All Locations</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filterSkill}
              onChange={e => { setFilterSkill(e.target.value); setDrillPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] min-w-[140px]"
            >
              <option value="">All Skills</option>
              {skillOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterUtil}
              onChange={e => { setFilterUtil(e.target.value); setDrillPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Utilization</option>
              <option value="over">🔴 Over Capacity (≥90%)</option>
              <option value="near">🟠 Near Capacity (80–89%)</option>
              <option value="ok">🟢 Available (&lt;80%)</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1">
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
              <p className="font-medium">{hasFilters ? 'No PMs match the selected filters' : `No active PMs at grade ${selectedGrade}`}</p>
              {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-[#0070AD] hover:underline">Clear filters</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">PM ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Practice</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Sub-Practice</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Skill</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Reportees</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Max</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[140px]">Utilization</th>
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
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {pm.email
                            ? <a href={`mailto:${pm.email}`} className="text-indigo-600 hover:underline">{pm.email}</a>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{pm.skill || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">{pm.reportee_count}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{pm.max_capacity}</td>
                        <td className="px-4 py-3">
                          <UtilizationBar pct={pct} />
                        </td>
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
