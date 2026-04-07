import React, { useState } from 'react';
import { useGeneratePracticeReportQuery, useGetPracticeFiltersQuery } from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Download, 
  Filter, 
  TrendingUp, 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle,
  Clock,
  Award
} from 'lucide-react';

const PracticeReports: React.FC = () => {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  
  const [filters, setFilters] = useState({
    practice: 'All',
    cu: 'All',
    region: 'All',
  });

  const { data: filterOptions } = useGetPracticeFiltersQuery();
  const { data: reportData, isLoading, refetch } = useGeneratePracticeReportQuery({
    ...filters,
    ...(isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : {}),
  }, {
    skip: false,
  });

  const report = reportData?.report;

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportFullReport = () => {
    if (!report) return;

    // Create comprehensive report data
    const timestamp = new Date().toISOString().split('T')[0];
    const practiceLabel = filters.practice === 'All' ? 'All_Practices' : filters.practice;
    
    // Export PM Capacity
    if (report.pmCapacity.overCapacityList.length > 0) {
      exportToCSV(report.pmCapacity.overCapacityList, `PM_Over_Capacity_${practiceLabel}_${timestamp}`);
    }
    
    // Export Bench Critical
    if (report.bench.criticalList.length > 0) {
      exportToCSV(report.bench.criticalList, `Bench_Critical_${practiceLabel}_${timestamp}`);
    }
    
    // Export Separations
    if (report.separations.separationsList.length > 0) {
      exportToCSV(report.separations.separationsList, `Separations_${practiceLabel}_${timestamp}`);
    }

    alert('Reports exported! Check your downloads folder for CSV files.');
  };

  return (
    <div className="container mx-auto px-4 py-8">

      {/* Filters Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-semibold">Report Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Practice
            </label>
            <select
              value={filters.practice}
              onChange={(e) => handleFilterChange('practice', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {filterOptions?.practices.map((practice) => (
                <option key={practice} value={practice}>
                  {practice}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CU (Capability Unit)
            </label>
            <select
              value={filters.cu}
              onChange={(e) => handleFilterChange('cu', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {filterOptions?.cus.map((cu) => (
                <option key={cu} value={cu}>
                  {cu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {filterOptions?.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>

          {report && (
            <button
              onClick={exportFullReport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      )}

      {/* Report Preview */}
      {report && !isLoading && (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold text-indigo-100">{filters.practice}</span>
              <span className="text-sm text-indigo-200">
                Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-indigo-200 text-sm">CU</p>
                <p className="text-xl font-semibold">{filters.cu}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-sm">Region</p>
                <p className="text-xl font-semibold">{filters.region}</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Employees */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{report.employees.total}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Total Employees</h3>
              <p className="text-sm text-gray-500 mt-1">
                {report.employees.withPM} with PM · {report.employees.withoutPM} without PM
              </p>
            </div>

            {/* Total PMs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{report.pmCapacity.totalPMs}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Total PMs</h3>
              <p className="text-sm text-gray-500 mt-1">
                Avg Utilization: {report.pmCapacity.averageUtilization}%
              </p>
            </div>

            {/* Over Capacity PMs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-red-600">{report.pmCapacity.overCapacity}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Over Capacity (≥90%)</h3>
              <p className="text-sm text-gray-500 mt-1">
                {((report.pmCapacity.overCapacity / report.pmCapacity.totalPMs) * 100).toFixed(1)}% of total
              </p>
            </div>

            {/* Bench Critical */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-orange-600">{report.bench.critical}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Critical Bench (&gt;30d)</h3>
              <p className="text-sm text-gray-500 mt-1">
                {report.bench.totalBench} total on bench
              </p>
            </div>
          </div>

          {/* PM Capacity Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xl font-semibold">PM Capacity Distribution</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">Over (≥90%)</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                    style={{ width: `${(report.pmCapacity.overCapacity / report.pmCapacity.totalPMs) * 100}%` }}
                  >
                    {report.pmCapacity.overCapacity}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">High (80-89%)</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                    style={{ width: `${(report.pmCapacity.highUtilization / report.pmCapacity.totalPMs) * 100}%` }}
                  >
                    {report.pmCapacity.highUtilization}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">Optimal (50-79%)</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                    style={{ width: `${(report.pmCapacity.optimal / report.pmCapacity.totalPMs) * 100}%` }}
                  >
                    {report.pmCapacity.optimal}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">Under (&lt;50%)</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                    style={{ width: `${(report.pmCapacity.underUtilized / report.pmCapacity.totalPMs) * 100}%` }}
                  >
                    {report.pmCapacity.underUtilized}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Over Capacity PMs Table */}
          {report.pmCapacity.overCapacityList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-xl font-semibold">🔴 Critical: Over-Capacity PMs</h3>
                </div>
                <button
                  onClick={() => exportToCSV(report.pmCapacity.overCapacityList, 'Over_Capacity_PMs')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export List
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Practice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reportees</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.pmCapacity.overCapacityList.map((pm: any) => (
                      <tr key={pm.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{pm.employee_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{pm.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{pm.grade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{pm.practice}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{pm.reportee_count}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{pm.max_capacity}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                            {pm.utilization}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bench Critical Table */}
          {report.bench.criticalList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h3 className="text-xl font-semibold">⚠️ Critical: Bench Resources (&gt;30 Days)</h3>
                </div>
                <button
                  onClick={() => exportToCSV(report.bench.criticalList, 'Bench_Critical')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export List
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Practice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days on Bench</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.bench.criticalList.map((emp: any) => (
                      <tr key={emp.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.employee_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{emp.grade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{emp.practice}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{emp.skill}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                            {emp.days_on_bench} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Separations */}
          {report.separations.separationsList.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-purple-600" />
                  <h3 className="text-xl font-semibold">🚪 PM Separations</h3>
                </div>
                <button
                  onClick={() => exportToCSV(report.separations.separationsList, 'Separations')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export List
                </button>
              </div>

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Critical (≤7 days)</p>
                  <p className="text-2xl font-bold text-red-700">{report.separations.critical}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Warning (≤30 days)</p>
                  <p className="text-2xl font-bold text-orange-700">{report.separations.warning}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Affected Employees</p>
                  <p className="text-2xl font-bold text-blue-700">{report.separations.affectedEmployees}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PM Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Practice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LWD</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reportees</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.separations.separationsList.map((sep: any) => (
                      <tr key={sep.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{sep.employee_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sep.pm_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sep.grade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sep.practice}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(sep.lwd).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              sep.days_until_lwd <= 7
                                ? 'bg-red-100 text-red-800'
                                : sep.days_until_lwd <= 30
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sep.days_until_lwd} days
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{sep.reportee_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Business Rules Applied */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-indigo-900">Business Rules Applied</h3>
            </div>
            <ul className="space-y-2 text-sm text-indigo-800">
              <li>✅ C1/C2 PMs: Max Capacity = 10 reportees</li>
              <li>✅ D1+ PMs: Max Capacity = 15 reportees</li>
              <li>✅ Over Capacity Threshold: ≥90% utilization</li>
              <li>✅ Bench Critical: &gt;30 days without PM</li>
              <li>✅ Separation Critical: ≤7 days until LWD</li>
              <li>✅ Separation Warning: ≤30 days until LWD</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeReports;
