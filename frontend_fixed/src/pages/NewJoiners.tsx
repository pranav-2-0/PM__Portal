import { useState } from 'react';
import { useGetNewJoinersListQuery, useFindPMForEmployeeMutation, useAssignPMMutation } from '../services/pmApi';
import { Search, UserPlus, Award, CheckCircle2 } from 'lucide-react';
import Table from '../components/Table';
import Pagination from '../components/Pagination';

export default function NewJoiners() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { data: response, isLoading } = useGetNewJoinersListQuery({ page, pageSize });
  const [findPM] = useFindPMForEmployeeMutation();
  const [assignPM] = useAssignPMMutation();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [pmMatches, setPmMatches] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const handleFindPM = async (employee: any) => {
    setSearching(true);
    setSelectedEmployee(employee);
    try {
      const result = await findPM(employee.employee_id).unwrap();
      setPmMatches(result.matches || []);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error finding PM:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async (pmId: string, score: number) => {
    try {
      await assignPM({
        employee_id: selectedEmployee.employee_id,
        new_pm_id: pmId,
        assignment_type: 'new_joiner',
        match_score: score,
      }).unwrap();
      alert('Recommendation sent for approval.');
      setSelectedEmployee(null);
      setPmMatches([]);
      setSelectedMatch(null);
    } catch (error: any) {
      alert('Assignment failed: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  const columns = [
    { header: 'Employee ID', accessor: 'employee_id' as const },
    { header: 'Name', accessor: 'name' as const },
    { header: 'Grade', accessor: 'grade' as const },
    { header: 'Practice', accessor: 'practice' as const },
    { header: 'CU', accessor: 'cu' as const },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <button
          onClick={() => handleFindPM(row)}
          className="btn-primary text-xs py-1.5 px-3"
        >
          <Search size={14} className="inline mr-1" />
          Find PM
        </button>
      ),
    },
  ];

  const newJoiners = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 50, totalRecords: 0, totalPages: 1 };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">New Joiners</h1>
        <p className="text-gray-600 mt-1">Assign People Managers to new employees</p>
      </div>

      {/* New Joiners Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Unassigned Employees ({pagination.totalRecords || 0})
        </h2>
        <Table data={newJoiners || []} columns={columns} />
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

      {/* PM Matches Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="text-white p-6" style={{ background: 'linear-gradient(135deg, #12ABDB 0%, #0070AD 100%)' }}>
              <h2 className="text-2xl font-bold">PM Recommendations</h2>
              <p className="text-white/90 mt-1">
                For {selectedEmployee.name} ({selectedEmployee.employee_id})
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: '#12ABDB', borderTopColor: 'transparent' }}></div>
                </div>
              ) : pmMatches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No suitable PMs found
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Recommendations List */}
                  <div className="lg:col-span-3 space-y-4">
                    {pmMatches.map((match, idx) => (
                      <div
                        key={idx}
                        className={`bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow border ${
                          selectedMatch?.pm?.employee_id === match.pm.employee_id ? 'border-blue-500' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-800">
                                {match.pm.name}
                              </h3>
                              <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#12ABDB20', color: '#12ABDB' }}>
                                {match.pm.grade}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                              <div>
                                <span className="text-gray-600">Practice:</span>
                                <span className="ml-2 text-gray-800 font-medium">{match.pm.practice}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">CU:</span>
                                <span className="ml-2 text-gray-800 font-medium">{match.pm.cu}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Region:</span>
                                <span className="ml-2 text-gray-800 font-medium">{match.pm.region}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Capacity:</span>
                                <span className="ml-2 text-gray-800 font-medium">
                                  {match.pm.reportee_count ?? 0}/{match.pm.max_capacity ?? '-'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award style={{ color: '#12ABDB' }} size={16} />
                              <span className="text-sm text-gray-600">Match Score:</span>
                              <span className="text-lg font-bold" style={{ color: '#12ABDB' }}>
                                {match.score.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedMatch(match)}
                            className="btn-secondary ml-4"
                          >
                            <CheckCircle2 size={16} className="inline mr-1" />
                            Select
                          </button>
                        </div>
                        {match.warnings?.length > 0 && (
                          <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                            {match.warnings.join(' • ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pre-Approval Preview */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800">Pre-Approval Preview</h3>
                      <p className="text-sm text-gray-600 mt-1">Review selection before sending for approval.</p>

                      {!selectedMatch ? (
                        <div className="text-sm text-gray-500 mt-4">Select a recommendation to preview.</div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="text-sm">
                            <span className="text-gray-600">Employee:</span>
                            <span className="ml-2 font-medium text-gray-800">{selectedEmployee.name} ({selectedEmployee.employee_id})</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Recommended PM:</span>
                            <span className="ml-2 font-medium text-gray-800">{selectedMatch.pm.name}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Reasons:</span>
                            <span className="ml-2 text-gray-800">{selectedMatch.reasons?.join(', ') || '-'}</span>
                          </div>
                          {selectedMatch.warnings?.length > 0 && (
                            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                              {selectedMatch.warnings.join(' • ')}
                            </div>
                          )}
                          <button
                            onClick={() => handleAssign(selectedMatch.pm.employee_id, selectedMatch.score)}
                            className="btn-primary w-full mt-2"
                          >
                            <UserPlus size={16} className="inline mr-1" />
                            Send for Approval
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setPmMatches([]);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
