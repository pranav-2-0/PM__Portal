import {
  useGetAssignmentTrendsQuery,
  useGetPracticeDistributionQuery,
  useGetApprovalMetricsQuery,
  useGetGradeDistributionQuery,
  useGetRegionStatsQuery,
} from '../services/pmApi';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';

const COLORS = ['#12ABDB', '#0070AD', '#4FC3F7', '#001F5F', '#64748B', '#94A3B8'];

export default function Analytics() {
  const { user, selectedDepartment } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const deptParams = isSuperAdmin && selectedDepartment ? { department_id: selectedDepartment } : undefined;
  
  const { data: trends, isLoading: trendsLoading } = useGetAssignmentTrendsQuery(deptParams);
  const { data: practices, isLoading: practicesLoading } = useGetPracticeDistributionQuery(deptParams);
  const { data: approvals, isLoading: approvalsLoading } = useGetApprovalMetricsQuery(deptParams);
  const { data: grades, isLoading: gradesLoading } = useGetGradeDistributionQuery(deptParams);
  const { data: regions, isLoading: regionsLoading } = useGetRegionStatsQuery(deptParams);

  const isLoading = trendsLoading || practicesLoading || approvalsLoading || gradesLoading || regionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp style={{ color: '#12ABDB' }} size={24} />
            <h3 className="font-semibold text-gray-700">Total Assignments</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {trends?.reduce((sum: number, t: any) => sum + t.count, 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <PieIcon className="text-green-500" size={24} />
            <h3 className="font-semibold text-gray-700">Approval Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {approvals?.length > 0 
              ? ((approvals.find((a: any) => a.status === 'approved')?.count || 0) / 
                 approvals.reduce((sum: number, a: any) => sum + a.count, 0) * 100).toFixed(1)
              : 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-purple-500" size={24} />
            <h3 className="font-semibold text-gray-700">Active Practices</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{practices?.length || 0}</p>
        </div>
      </div>

      {/* Assignment Trends */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Assignment Trends (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#12ABDB" strokeWidth={3} name="Assignments" dot={{ fill: '#12ABDB', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Practice & Approval Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Practice Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={practices || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.practice}: ${props.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {(practices || []).map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Approval Metrics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Approval Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={approvals || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="status" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#12ABDB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grade & Region Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grades || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="grade" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#0070AD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Region Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Region Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="region" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#4FC3F7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
