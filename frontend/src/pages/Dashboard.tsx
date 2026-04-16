import { useGetDashboardStatsQuery, useGetPMCapacityReportQuery } from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from '../utils/rbac';
import { DEPARTMENT_ID_TO_PRACTICE } from '../constants/practices';
import { Users, UserCheck, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#12ABDB', '#0070AD', '#4FC3F7', '#001F5F', '#64748B'];

export default function Dashboard() {
  // Super Admin dashboard should reflect the selected department when one is chosen.
  // If no department is selected, it falls back to the default dashboard scope.
  const { user, selectedDepartment } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.role);
  const selectedDepartmentParam = isSuperAdminUser && selectedDepartment ? { department_id: selectedDepartment } : undefined;

  const { data: stats, isLoading: statsLoading } = useGetDashboardStatsQuery(selectedDepartmentParam);
  const { data: capacityReport, isLoading: capacityLoading } = useGetPMCapacityReportQuery(selectedDepartmentParam);

  const selectedDepartmentLabel = isSuperAdminUser && selectedDepartment ? DEPARTMENT_ID_TO_PRACTICE[selectedDepartment] : null;
  const hasStatValues = [stats?.totalEmployees, stats?.activePMs, stats?.pendingAssignments, stats?.openExceptions].some((value) => Number(value) > 0);
  const noDataForSelectedDepartment = !!selectedDepartmentLabel && !hasStatValues && (!capacityReport || capacityReport.length === 0);

  if (statsLoading || capacityLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-capgemini-blue border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Employees', value: stats?.totalEmployees || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Active PMs', value: stats?.activePMs || 0, icon: UserCheck, color: 'bg-green-500' },
    { label: 'Pending Assignments', value: stats?.pendingAssignments || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Open Exceptions', value: stats?.openExceptions || 0, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const capacityData = capacityReport?.slice(0, 10).map((pm: any) => ({
    name: pm.name.split(' ')[0],
    current: pm.reportee_count,
    max: (pm.spec_capacity_cap ?? pm.max_capacity ?? 10),
  })) || [];

  const utilizationData = [
    { name: 'Under 50%', value: capacityReport?.filter((pm: any) => (pm.reportee_count / (pm.spec_capacity_cap ?? pm.max_capacity ?? 10)) < 0.5).length || 0 },
    { name: '50-75%', value: capacityReport?.filter((pm: any) => {
      const util = pm.reportee_count / (pm.spec_capacity_cap ?? pm.max_capacity ?? 10);
      return util >= 0.5 && util < 0.75;
    }).length || 0 },
    { name: '75-90%', value: capacityReport?.filter((pm: any) => {
      const util = pm.reportee_count / (pm.spec_capacity_cap ?? pm.max_capacity ?? 10);
      return util >= 0.75 && util < 0.9;
    }).length || 0 },
    { name: 'Over 90%', value: capacityReport?.filter((pm: any) => (pm.reportee_count / (pm.spec_capacity_cap ?? pm.max_capacity ?? 10)) >= 0.9).length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of PM alignment system</p>
        {selectedDepartmentLabel && (
          <div className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Showing data for department: <span className="ml-2 font-semibold">{selectedDepartmentLabel}</span>
          </div>
        )}
        {noDataForSelectedDepartment && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            No data available for the selected department. Counts are shown as 0 where applicable.
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 PM Capacity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="current" fill="#12ABDB" name="Current" radius={[8, 8, 0, 0]} />
              <Bar dataKey="max" fill="#0070AD" name="Max Capacity" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Capacity Utilization</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={utilizationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {utilizationData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity Table */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">PM Capacity Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100" style={{ borderBottom: '2px solid #12ABDB' }}>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PM Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Current</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Max</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {capacityReport?.slice(0, 10).map((pm: any, idx: number) => {
                const utilization = ((pm.reportee_count / (pm.spec_capacity_cap ?? pm.max_capacity ?? 10)) * 100).toFixed(0);
                return (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{pm.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pm.grade}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pm.reportee_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{(pm.spec_capacity_cap ?? pm.max_capacity ?? 10)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(Number(utilization), 100)}%`,
                              background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)'
                            }}
                          ></div>
                        </div>
                        <span className="text-gray-700 font-medium">{utilization}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
