import React from 'react';
import { useGetPendingAssignmentsQuery } from '../services/pmApi';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export const Assignments: React.FC = () => {
  const { data: assignments, isLoading } = useGetPendingAssignmentsQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070AD]" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pending PM Assignments</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New PM</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments?.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{a.employee_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{a.employee_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{a.pm_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      a.assignment_type === 'new_joiner'
                        ? 'bg-blue-100 text-blue-800'
                        : a.assignment_type === 'FORCED_ASSIGNMENT'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {a.assignment_type === 'FORCED_ASSIGNMENT' ? '⚠ Forced (PM Resigned)' : a.assignment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {a.match_score?.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {a.created_at ? format(new Date(a.created_at), 'MMM dd, yyyy') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
