import { useState } from 'react';
import { useGetEmployeesListQuery } from '../services/pmApi';
import { Users, Filter, Download, Loader2 } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function EmployeesList() {
  const [filters, setFilters] = useState({ status: 'active', practice: '', cu: '', region: '', grade: '', skill: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const { data: response, isLoading, isFetching, refetch } = useGetEmployeesListQuery({ 
    ...filters, 
    page, 
    pageSize 
  });

  // Debug logging
  console.log('Employees API Response:', response);
  console.log('Total Records:', response?.pagination?.totalRecords);

  // Apply client-side filters for grade and skill (backend doesn't filter these yet)
  const filteredEmployees = response?.data?.filter(emp => {
    if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
    if (filters.skill && emp.primary_skill && !emp.primary_skill.toLowerCase().includes(filters.skill.toLowerCase())) return false;
    return true;
  }) || [];
  
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  };

  const exportToCSV = () => {
    if (filteredEmployees.length === 0) return;
    
    const headers = ['Employee ID', 'Name', 'Email', 'Practice', 'CU', 'Region', 'Grade', 'Primary Skill', 'Current PM', 'Status', 'Joining Date'];
    const rows = filteredEmployees.map(emp => [
      emp.employee_id,
      emp.name,
      emp.email,
      emp.practice,
      emp.cu,
      emp.region,
      emp.grade,
      emp.primary_skill || '-',
      emp.pm_name || 'Unassigned',
      emp.status,
      emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
        <span className="ml-2">Loading employees...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-[#0070AD]" />
            All Employees (Bench/GAD List)
          </h1>
          <p className="text-gray-600 mt-1">Complete list of uploaded employees from GAD reports</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#0070AD] text-white rounded-md hover:bg-[#005a8a] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Practice</label>
            <input
              type="text"
              value={filters.practice}
              onChange={(e) => handleFilterChange('practice', e.target.value)}
              placeholder="e.g., Microsoft"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CU</label>
            <input
              type="text"
              value={filters.cu}
              onChange={(e) => handleFilterChange('cu', e.target.value)}
              placeholder="e.g., Apps & Value"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input
              type="text"
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              placeholder="e.g., India"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <input
              type="text"
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              placeholder="e.g., C1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
            <input
              type="text"
              value={filters.skill}
              onChange={(e) => handleFilterChange('skill', e.target.value)}
              placeholder="Search skill..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            />
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Apply Filters
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Employees (Filtered)</p>
          <p className="text-2xl font-bold text-gray-800">{pagination.totalRecords.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Current Page</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredEmployees.filter(e => e.current_pm_id).length}
          </p>
          <p className="text-xs text-gray-500">with PM assigned</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Current Page</p>
          <p className="text-2xl font-bold text-orange-600">
            {filteredEmployees.filter(e => !e.current_pm_id).length}
          </p>
          <p className="text-xs text-gray-500">without PM</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Current Page</p>
          <p className="text-2xl font-bold text-blue-600">
            {filteredEmployees.filter(e => e.is_new_joiner).length}
          </p>
          <p className="text-xs text-gray-500">new joiners</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
            <div style={{ animation: 'shimmer 1.2s ease-in-out infinite', background: 'linear-gradient(90deg, transparent 0%, #0070AD 50%, transparent 100%)', backgroundSize: '200% 100%', height: '100%' }} />
          </div>
        )}
        <div className={`overflow-x-auto transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Practice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Skill</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current PM</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((emp: any) => (
                <tr key={emp.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.practice}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.cu}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {emp.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{emp.primary_skill || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {emp.pm_name ? (
                      <span className="text-green-600 font-medium">{emp.pm_name}</span>
                    ) : (
                      <span className="text-orange-600 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {!response || !response.data || response.data.length === 0
              ? 'No employees found. Upload employee data from the Data Upload page.'
              : 'No employees match the selected filters. Try adjusting your filter criteria.'}
          </div>
        )}
        </div>
        
        {/* Pagination */}
        {pagination.totalRecords > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalRecords={pagination.totalRecords}
            pageSize={pagination.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
}
