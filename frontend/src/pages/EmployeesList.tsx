import { useState } from 'react';
import { useGetEmployeesListQuery } from '../services/pmApi';
import { Users, Filter, Download, Loader2 } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function EmployeesList() {
  const [filters, setFilters] = useState({ status: 'active', practice: '', cu: '', region: '', grade: '', skill: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const { data: response, isLoading, refetch } = useGetEmployeesListQuery({ 
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Main paginated query
  const { data: response, isLoading, refetch } = useGetEmployeesListQuery({
    status: filters.status,
    practice: filters.practice,
    cu: filters.cu,
    region: filters.region,
    page,
    pageSize,
  });

  // Wider sample query used only for skill distribution in Skill Management mode
  const { data: skillSampleResponse, isFetching: skillSampleLoading } = useGetEmployeesListQuery({
    status: filters.status,
    practice: filters.practice,
    cu: filters.cu,
    region: filters.region,
    page: 1,
    pageSize: 500,
  }, { skip: viewMode !== 'skill-wise' } as any);

  // Client-side grade + skill filter on the main page data
  const filteredEmployees = useMemo(() =>
    response?.data?.filter(emp => {
      if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
      if (filters.skill && !(emp.primary_skill || '').toLowerCase().includes(filters.skill.toLowerCase())) return false;
      return true;
    }) ?? []
  , [response, filters.grade, filters.skill]);

  const pagination = response?.pagination ?? { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  // Build skill distribution from the wider sample
  const skillDistribution = useMemo(() => {
    const source: any[] = skillSampleResponse?.data ?? [];
    const map = new Map<string, { count: number; grades: Set<string> }>();
    source.forEach(emp => {
      const skill = emp.primary_skill?.trim() || 'Not Assigned';
      if (!map.has(skill)) map.set(skill, { count: 0, grades: new Set() });
      const entry = map.get(skill)!;
      entry.count++;
      if (emp.grade) entry.grades.add(emp.grade);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([skill, d]) => ({ skill, count: d.count, grades: Array.from(d.grades).sort() }));
  }, [skillSampleResponse]);

  // Employees shown in skill-wise table after clicking a card
  const skillWiseEmployees = useMemo(() => {
    if (!selectedSkill) return [];
    return (skillSampleResponse?.data ?? []).filter((emp: any) =>
      (emp.primary_skill?.trim() || 'Not Assigned') === selectedSkill
    );
  }, [selectedSkill, skillSampleResponse]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: 'active', practice: '', cu: '', region: '', grade: '', skill: '' });
    setPage(1);
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setViewDropdownOpen(false);
    if (mode === 'list') setSelectedSkill('');
  };

  const exportToCSV = () => {
    const source = viewMode === 'skill-wise' && selectedSkill ? skillWiseEmployees : filteredEmployees;
    if (source.length === 0) return;
    const headers = ['Employee ID', 'Name', 'Email', 'Practice', 'CU', 'Region', 'Grade', 'Primary Skill', 'Current PM', 'Status'];
    const rows = source.map((emp: any) => [
      emp.employee_id, emp.name, emp.email, emp.practice, emp.cu,
      emp.region, emp.grade, emp.primary_skill || '-',
      emp.pm_name || 'Unassigned', emp.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `employees_${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  const tableData = viewMode === 'skill-wise' ? skillWiseEmployees : filteredEmployees;
  const hasActiveFilters = filters.practice || filters.cu || filters.region || filters.grade || filters.skill;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
        <span className="ml-3 text-gray-500 font-medium">Loading employees…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-[#0070AD]" />
            All Employees
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {viewMode === 'skill-wise'
              ? 'Skill Management — browse employees grouped by skill'
              : 'Complete employee directory from GAD & Bench uploads'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Employee View dropdown ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setViewDropdownOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all shadow-sm select-none
                ${viewMode === 'list'
                  ? 'bg-white border-[#0070AD] text-[#0070AD] hover:bg-blue-50'
                  : 'bg-[#0070AD] border-[#0070AD] text-white hover:bg-[#005a8a]'}`}
            >
              {viewMode === 'list' ? <List className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              Employee View
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${viewDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {viewDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50">
                  Select View
                </div>
                {/* List View option */}
                <button
                  onClick={() => switchView('list')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors
                    ${viewMode === 'list' ? 'bg-blue-50 text-[#0070AD]' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${viewMode === 'list' ? 'bg-[#0070AD]/10' : 'bg-gray-100'}`}>
                    <List className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">List View</div>
                    <div className="text-[11px] text-gray-400">Full paginated directory</div>
                  </div>
                  {viewMode === 'list' && (
                    <span className="w-4 h-4 rounded-full bg-[#0070AD] text-white text-[10px] flex items-center justify-center flex-shrink-0">✓</span>
                  )}
                </button>
                {/* Skill Management option */}
                <button
                  onClick={() => switchView('skill-wise')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors
                    ${viewMode === 'skill-wise' ? 'bg-blue-50 text-[#0070AD]' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${viewMode === 'skill-wise' ? 'bg-[#0070AD]/10' : 'bg-gray-100'}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Skill Management</div>
                    <div className="text-[11px] text-gray-400">Browse by skill group</div>
                  </div>
                  {viewMode === 'skill-wise' && (
                    <span className="w-4 h-4 rounded-full bg-[#0070AD] text-white text-[10px] flex items-center justify-center flex-shrink-0">✓</span>
                  )}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#0070AD] text-white rounded-lg hover:bg-[#005a8a] transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0070AD] focus:border-transparent"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {[
            { key: 'practice', label: 'Practice',   placeholder: 'e.g., Microsoft' },
            { key: 'cu',       label: 'CU',          placeholder: 'e.g., Apps & Value' },
            { key: 'region',   label: 'Region',      placeholder: 'e.g., India' },
            { key: 'grade',    label: 'Grade',       placeholder: 'e.g., C1' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
              <input
                type="text"
                value={filters[key as keyof typeof filters]}
                onChange={e => handleFilterChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] focus:border-transparent"
              />
            </div>
          ))}
          {/* Skill text filter only in list mode */}
          {viewMode === 'list' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Skill</label>
              <input
                type="text"
                value={filters.skill}
                onChange={e => handleFilterChange('skill', e.target.value)}
                placeholder="Search skill…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070AD] focus:border-transparent"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records',  value: pagination.totalRecords.toLocaleString(), color: 'text-gray-800',    sub: 'matching filters'  },
          { label: 'With PM',        value: filteredEmployees.filter(e => e.current_pm_id).length,  color: 'text-emerald-600', sub: 'on this page'      },
          { label: 'Without PM',     value: filteredEmployees.filter(e => !e.current_pm_id).length, color: 'text-orange-500',  sub: 'on this page'      },
          { label: 'New Joiners',    value: filteredEmployees.filter(e => e.is_new_joiner).length,  color: 'text-[#0070AD]',   sub: 'on this page'      },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── SKILL MANAGEMENT PANEL ──────────────────────────────── */}
      {viewMode === 'skill-wise' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#0070AD]/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0070AD]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#0070AD]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Skill Management</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {skillSampleLoading
                    ? 'Loading skill data…'
                    : `${skillDistribution.length} skills · ${skillSampleResponse?.data?.length ?? 0} employees sampled`}
                </p>
              </div>
            </div>
            {selectedSkill && (
              <button
                onClick={() => setSelectedSkill('')}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Clear selection
              </button>
            )}
          </div>

          {/* Skill cards grid */}
          <div className="p-5">
            {skillSampleLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Building skill map…</span>
              </div>
            ) : skillDistribution.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No skill data available. Upload a GAD or Skill Report file first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {skillDistribution.map(({ skill, count, grades }, idx) => {
                  const c = SKILL_COLORS[idx % SKILL_COLORS.length];
                  const isSelected = selectedSkill === skill;
                  return (
                    <button
                      key={skill}
                      onClick={() => setSelectedSkill(isSelected ? '' : skill)}
                      className={`relative flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all duration-150
                        ${isSelected
                          ? `${c.bg} ${c.border} shadow-md ring-2 ring-offset-1 ring-[#0070AD]/25`
                          : `bg-white border-gray-100 hover:${c.bg} hover:${c.border} hover:shadow-sm`}`}
                    >
                      <div className={`w-2 h-2 rounded-full mb-2.5 ${c.dot}`} />
                      <span className={`text-xs font-bold leading-snug ${isSelected ? c.text : 'text-gray-700'}`}>
                        {skill}
                      </span>
                      <span className={`mt-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${c.badge}`}>
                        {count} {count === 1 ? 'emp' : 'emps'}
                      </span>
                      {grades.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {grades.slice(0, 3).map(g => (
                            <span key={g} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{g}</span>
                          ))}
                          {grades.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{grades.length - 3}</span>
                          )}
                        </div>
                      )}
                      {isSelected && (
                        <span className={`absolute top-2 right-2 w-5 h-5 rounded-full ${c.badge} flex items-center justify-center text-[10px] font-bold`}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Prompt when no skill selected yet ───────────────────── */}
      {viewMode === 'skill-wise' && !selectedSkill && skillDistribution.length > 0 && (
        <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
          <Layers className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">Click a skill card above to explore its employees</p>
        </div>
      )}

      {/* ── Employee Table ───────────────────────────────────────── */}
      {(viewMode === 'list' || (viewMode === 'skill-wise' && selectedSkill)) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Skill-wise context banner */}
          {viewMode === 'skill-wise' && selectedSkill && (
            <div className="px-5 py-3 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0070AD]" />
              <span className="text-sm text-[#0070AD] font-medium">
                Skill: <strong>{selectedSkill}</strong>
              </span>
              <span className="ml-1.5 text-xs bg-[#0070AD] text-white px-2 py-0.5 rounded-full font-semibold">
                {skillWiseEmployees.length}
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  {['Employee ID', 'Name', 'Email', 'Practice', 'CU', 'Region', 'Grade', 'Primary Skill', 'Current PM', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableData.map((emp: any) => (
                  <tr key={emp.employee_id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400 whitespace-nowrap">{emp.employee_id}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-800 whitespace-nowrap">{emp.name}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{emp.email}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{emp.practice}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{emp.cu}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{emp.region}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md bg-blue-100 text-blue-700">
                        {emp.grade || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {emp.primary_skill ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-medium">
                          {emp.primary_skill}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                      {emp.pm_name
                        ? <span className="text-emerald-600 font-medium">{emp.pm_name}</span>
                        : <span className="text-orange-400 font-medium">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full
                        ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tableData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">
                {viewMode === 'skill-wise'
                  ? 'No employees found for this skill.'
                  : !response?.data?.length
                    ? 'No employees found. Upload data from the Data Upload page.'
                    : 'No employees match the current filters.'}
              </p>
            </div>
          )}

          {/* Pagination — list mode only */}
          {viewMode === 'list' && pagination.totalRecords > 0 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.totalRecords}
              pageSize={pagination.pageSize}
              onPageChange={newPage => { setPage(newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              onPageSizeChange={newSize => { setPageSize(newSize); setPage(1); }}
            />
          )}
        </div>
      )}
    </div>
  );
}
