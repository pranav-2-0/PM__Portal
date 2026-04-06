import { useState } from 'react';
import { useGetEmployeesListQuery } from '../services/pmApi';
import { Users, Search, Filter, Download, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function BenchResources() {
  const [filters, setFilters] = useState({ 
    status: 'active', 
    practice: '', 
    cu: '', 
    region: '',
    grade: '',
    skill: ''
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Fetch active employees with pagination
  const { data: response, isLoading, refetch } = useGetEmployeesListQuery({ 
    ...filters,
    page,
    pageSize
  });
  
  // Debug logging
  console.log('Bench API Response:', response);
  console.log('Total Records:', response?.pagination?.totalRecords);
  
  // Filter to show only bench resources (no PM assigned)
  const benchEmployees = response?.data?.filter(emp => !emp.current_pm_id) || [];
  console.log('Bench Employees (no PM):', benchEmployees.length);
  
  // Apply additional client-side filters
  const filteredEmployees = benchEmployees.filter(emp => {
    if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
    if (filters.skill && emp.primary_skill && !emp.primary_skill.toLowerCase().includes(filters.skill.toLowerCase())) return false;
    return true;
  });
  
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({ status: 'active', practice: '', cu: '', region: '', grade: '', skill: '' });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const exportToCSV = () => {
    if (filteredEmployees.length === 0) return;
    
    const headers = ['Employee ID', 'Name', 'Email', 'Practice', 'CU', 'Region', 'Grade', 'Primary Skill', 'Joining Date', 'Days on Bench'];
    const rows = filteredEmployees.map(emp => {
      const daysOnBench = emp.joining_date 
        ? Math.floor((new Date().getTime() - new Date(emp.joining_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return [
        emp.employee_id,
        emp.name,
        emp.email,
        emp.practice,
        emp.cu,
        emp.region,
        emp.grade,
        emp.primary_skill || '-',
        emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '-',
        daysOnBench
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bench_resources_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate statistics
  const avgDaysOnBench = filteredEmployees.length > 0
    ? Math.floor(filteredEmployees.reduce((sum, emp) => {
        const days = emp.joining_date 
          ? Math.floor((new Date().getTime() - new Date(emp.joining_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return sum + days;
      }, 0) / filteredEmployees.length)
    : 0;

  const criticalBench = filteredEmployees.filter(emp => {
    if (!emp.joining_date) return false;
    const days = Math.floor((new Date().getTime() - new Date(emp.joining_date).getTime()) / (1000 * 60 * 60 * 24));
    return days > 30; // On bench for more than 30 days
  }).length;

  // Get unique values for dropdowns
  const uniquePractices = [...new Set(benchEmployees.map(e => e.practice))].sort();
  const uniqueCUs = [...new Set(benchEmployees.map(e => e.cu))].sort();
  const uniqueRegions = [...new Set(benchEmployees.map(e => e.region))].sort();
  const uniqueGrades = [...new Set(benchEmployees.map(e => e.grade))].sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
        <span className="ml-2">Loading bench resources...</span>
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
            Bench Resources
          </h1>
          <p className="text-gray-600 mt-1">Employees without PM assignment awaiting project allocation</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredEmployees.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#0070AD] text-white rounded-md hover:bg-[#005a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Alert for critical bench */}
      {criticalBench > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-800">
              <strong>{criticalBench}</strong> employees have been on bench for more than 30 days. Priority assignment recommended.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Filters</h3>
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Practice</label>
            <select
              value={filters.practice}
              onChange={(e) => handleFilterChange('practice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Practices</option>
              {uniquePractices.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CU</label>
            <select
              value={filters.cu}
              onChange={(e) => handleFilterChange('cu', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All CUs</option>
              {uniqueCUs.map(cu => <option key={cu} value={cu}>{cu}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Regions</option>
              {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
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
          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Bench</p>
          <p className="text-2xl font-bold text-gray-800">{filteredEmployees.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Critical (&gt;30 days)</p>
          <p className="text-2xl font-bold text-orange-600">{criticalBench}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">New Joiners</p>
          <p className="text-2xl font-bold text-blue-600">
            {filteredEmployees.filter(e => e.is_new_joiner).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Avg Days on Bench</p>
          <p className="text-2xl font-bold text-[#0070AD]">{avgDaysOnBench}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days on Bench</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((emp: any) => {
                const daysOnBench = emp.joining_date 
                  ? Math.floor((new Date().getTime() - new Date(emp.joining_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const isCritical = daysOnBench > 30;
                
                return (
                  <tr key={emp.employee_id} className={`hover:bg-gray-50 ${isCritical ? 'bg-orange-50' : ''}`}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {emp.primary_skill || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isCritical ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {daysOnBench} days
                        </span>
                        {isCritical && <TrendingUp className="w-4 h-4 text-orange-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        emp.is_new_joiner ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {emp.is_new_joiner ? 'New Joiner' : 'On Bench'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {benchEmployees.length === 0 
              ? 'No bench resources found. All employees are assigned to PMs!'
              : 'No employees match the selected filters. Try adjusting your filter criteria.'}
          </div>
        )}
        
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
