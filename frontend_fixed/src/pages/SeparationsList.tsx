import { useState } from 'react';
import { useGetSeparationsListQuery } from '../services/pmApi';
import { UserX, Filter, Download, Loader2, AlertTriangle, UploadCloud } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import Pagination from '../components/Pagination';

const PERSON_TYPE_BADGE: Record<string, string> = {
  pm:       'bg-purple-100 text-purple-800',
  employee: 'bg-blue-100 text-blue-800',
  unknown:  'bg-gray-100 text-gray-600',
};

const SEP_TYPE_BADGE: Record<string, string> = {
  Resignation:   'bg-red-100 text-red-800',
  Retirement:    'bg-purple-100 text-purple-800',
  Termination:   'bg-orange-100 text-orange-800',
  'Contract End':'bg-yellow-100 text-yellow-800',
};

const GRADE_OPTIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];

export default function SeparationsList() {
  const [filters, setFilters] = useState({ status: '', grade: '', person_type: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const { data: response, isLoading, refetch } = useGetSeparationsListQuery({ 
    status: filters.status,
    grade: filters.grade,
    person_type: filters.person_type,
    page,
    pageSize
  });

  const separations = response?.data || [];
  
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
    if (!separations || separations.length === 0) return;
    
    const headers = ['CGID/GGID', 'Name', 'Designation', 'Grade', 'Type', 'Separation Type', 'Practice', 'CU', 'Region', 'Reportees', 'LWD', 'Reason'];
    const rows = separations.map((sep: any) => [
      sep.employee_id,
      sep.display_name || sep.pm_name || '-',
      sep.display_designation || '-',
      sep.display_grade || '-',
      sep.person_type || 'unknown',
      sep.separation_type || '-',
      sep.pm_practice || '-',
      sep.cu || '-',
      sep.region || '-',
      sep.reportee_count ?? '-',
      format(new Date(sep.lwd), 'yyyy-MM-dd'),
      sep.reason || '-',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `separations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getDaysUntilLWD = (lwd: string) => {
    return differenceInDays(new Date(lwd), new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
        <span className="ml-2">Loading separations...</span>
      </div>
    );
  }

  const criticalSeparations = separations?.filter((s: any) => {
    const days = getDaysUntilLWD(s.lwd);
    return days >= 0 && days <= 30;
  }).length || 0;

  const pmSeparations = separations?.filter((s: any) => s.person_type === 'pm').length || 0;
  const empSeparations = separations?.filter((s: any) => s.person_type === 'employee').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <UserX className="w-8 h-8 text-[#0070AD]" />
            Separation Reports
          </h1>
          <p className="text-gray-600 mt-1">All people leaving the organisation — PMs, employees, and others — with their Last Working Day</p>
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
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.person_type}
              onChange={(e) => handleFilterChange('person_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Types</option>
              <option value="pm">People Manager</option>
              <option value="employee">Employee</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0070AD]"
            >
              <option value="">All Grades</option>
              {GRADE_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total (Filtered)</p>
          <p className="text-2xl font-bold text-gray-800">{pagination.totalRecords.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">People Managers (Page)</p>
          <p className="text-2xl font-bold text-purple-600">{pmSeparations}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Employees (Page)</p>
          <p className="text-2xl font-bold text-blue-600">{empSeparations}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Within 30 Days (Page)</p>
          <p className="text-2xl font-bold text-orange-600">{criticalSeparations}</p>
        </div>
      </div>

      {/* Critical Alert */}
      {criticalSeparations > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-800">
              <strong>{criticalSeparations}</strong> PMs are leaving within the next 30 days. 
              Reassignment workflow will process automatically at 10 AM daily.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGID / GGID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Separation Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Practice / CU</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reportees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Working Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {separations?.map((sep: any) => {
                const typeLabel = sep.person_type === 'pm' ? 'PM' : sep.person_type === 'employee' ? 'Employee' : 'Unknown';
                return (
                  <tr key={sep.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sep.employee_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {sep.display_name || sep.pm_name || <span className="text-gray-400 italic">—</span>}
                        </div>
                        {sep.email && <div className="text-xs text-gray-500">{sep.email}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PERSON_TYPE_BADGE[sep.person_type] || PERSON_TYPE_BADGE.unknown}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {sep.separation_type ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          SEP_TYPE_BADGE[sep.separation_type] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {sep.separation_type}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {sep.display_designation || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {sep.display_grade || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{sep.pm_practice || <span className="text-gray-400">—</span>}</div>
                      {sep.cu && <div className="text-xs text-gray-400">{sep.cu}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {sep.person_type === 'pm' ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sep.reportee_count > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sep.reportee_count ?? 0}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(sep.lwd), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sep.reason || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!separations || separations.length === 0) && (
          <div className="text-center py-12 px-6">
            {filters.status || filters.grade || filters.person_type ? (
              <>
                <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium mb-2">No separations match the selected filters</p>
                <p className="text-gray-500 text-sm">Try adjusting or clearing your filter criteria.</p>
              </>
            ) : (
              <>
                <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium mb-2">No separation reports found</p>
                <p className="text-gray-500 text-sm mb-4">Upload a Separation Reports file from the Data Upload page.</p>
                <a
                  href="/upload"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0070AD] text-white text-sm font-semibold rounded-lg hover:bg-[#005a8a] transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  Go to Data Upload
                </a>
              </>
            )}
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
