// import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// import { Employee, PMMatch, PMAssignment, UploadResponse, MatchOutput, MatchConfidence } from '../types';

// export const pmApi = createApi({
//   reducerPath: 'pmApi',
//   baseQuery: fetchBaseQuery({ 
//     baseUrl: '/api/pm',
//     prepareHeaders: (headers, { endpoint }) => {
//       const token = localStorage.getItem('authToken');
//       if (token) {
//         headers.set('Authorization', `Bearer ${token}`);
//       }
//       // Don't set Content-Type for file uploads - let browser set it with boundary
//       if (endpoint === 'uploadEmployees' || endpoint === 'uploadNewJoiners' || endpoint === 'uploadSeparations' || endpoint === 'uploadSkillReport' || endpoint === 'uploadPMs' || endpoint === 'uploadGAD' || endpoint === 'uploadBenchReport') {
//         headers.delete('Content-Type');
//       }
//       return headers;
//     },
//   }),
//   tagTypes: ['NewJoiners', 'Assignments', 'UploadStats'],
//   endpoints: (builder) => ({
//     uploadEmployees: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({
//         url: '/upload/employees',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: ['NewJoiners', 'UploadStats'],
//     }),
//     uploadNewJoiners: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({
//         url: '/upload/new-joiners',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: ['NewJoiners', 'UploadStats'],
//     }),
//     uploadSeparations: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({
//         url: '/upload/separations',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: ['UploadStats'],
//     }),
//     uploadPMs: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({
//         url: '/upload/pms',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: ['UploadStats'],
//     }),
//     uploadSkillReport: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({
//         url: '/upload/skills',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: ['UploadStats'],
//     }),
//     getNewJoiners: builder.query<Employee[], void>({
//       query: () => '/employees/new-joiners',
//       providesTags: ['NewJoiners'],
//     }),
//     getNewJoinersList: builder.query<{ data: Employee[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { practice?: string; cu?: string; region?: string; page?: number; pageSize?: number; department_id?: number }>({
//       query: (params) => ({
//         url: '/employees/new-joiners/list',
//         params,
//       }),
//       providesTags: ['NewJoiners'],
//     }),
//     findPMForEmployee: builder.mutation<{
//       employee: Employee;
//       result: MatchOutput;
//       matches: PMMatch[];
//       flag_summary: { total: number; critical: number; major: number; minor: number; has_unmappable: boolean };
//       best_confidence: MatchConfidence;
//     }, string>({
//       query: (employeeId) => ({
//         url: `/employees/${employeeId}/find-pm`,
//         method: 'GET',
//       }),
//     }),
//     assignPM: builder.mutation<{ message: string; assignmentId: number }, Partial<PMAssignment>>({
//       query: (assignment) => ({
//         url: '/assignments',
//         method: 'POST',
//         body: assignment,
//       }),
//       invalidatesTags: ['NewJoiners', 'Assignments'],
//     }),
//     getPendingAssignments: builder.query<PMAssignment[], void>({
//       query: () => '/assignments/pending',
//       providesTags: ['Assignments'],
//     }),
//     getDashboardStats: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/dashboard',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getPMCapacityReport: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/pm-capacity',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getPMReportSummary: builder.query<any, { is_active?: string; practice?: string; cu?: string; region?: string; grade?: string; skill?: string }>({
//       query: (params) => ({
//         url: '/stats/pm-report',
//         params,
//       }),
//     }),
//     approveAssignment: builder.mutation<any, { workflowId: number; comments?: string }>({
//       query: ({ workflowId, comments }) => ({
//         url: `/approvals/${workflowId}/approve`,
//         method: 'POST',
//         body: { comments },
//       }),
//       invalidatesTags: ['Assignments'],
//     }),
//     rejectAssignment: builder.mutation<any, { workflowId: number; comments: string }>({
//       query: ({ workflowId, comments }) => ({
//         url: `/approvals/${workflowId}/reject`,
//         method: 'POST',
//         body: { comments },
//       }),
//       invalidatesTags: ['Assignments'],
//     }),
//     getApprovalWorkflow: builder.query<any[], number>({
//       query: (assignmentId) => `/approvals/assignment/${assignmentId}`,
//     }),
//     getExceptions: builder.query<any[], void>({
//       query: () => '/exceptions',
//     }),
//     resolveException: builder.mutation<any, number>({
//       query: (exceptionId) => ({
//         url: `/exceptions/${exceptionId}/resolve`,
//         method: 'POST',
//       }),
//     }),
//     getAssignmentTrends: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/assignment-trends',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getPracticeDistribution: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/practice-distribution',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getApprovalMetrics: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/approval-metrics',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getGradeDistribution: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/grade-distribution',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getRegionStats: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/stats/region-stats',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getUploadStats: builder.query<any, void>({
//       query: () => '/stats/upload-stats',
//       providesTags: ['UploadStats'],
//     }),
//     getEmployeesList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { status?: string; practice?: string; cu?: string; region?: string; page?: number; pageSize?: number; department_id?: number }>({
//       query: (params) => ({
//         url: '/employees/list',
//         params,
//       }),
//     }),
//     getPMsList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { is_active?: string; practice?: string; cu?: string; region?: string; grade?: string; skill?: string; view_filter?: string; page?: number; pageSize?: number; department_id?: number }>({
//       query: (params) => ({
//         url: '/pms/list',
//         params,
//       }),
//     }),
//     getPMDetailReport: builder.query<{
//       pm: any;
//       utilization: number;
//       reportees: any[];
//       separation: any | null;
//       pendingAssignments: any[];
//       gradeDistribution: { grade: string; count: string }[];
//       practiceDistribution: { practice: string; count: string }[];
//     }, string>({
//       query: (pmId) => `/pms/${encodeURIComponent(pmId)}/report`,
//     }),
//     getSeparationsList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { status?: string; grade?: string; skill?: string; practice?: string; cu?: string; region?: string; person_type?: string; page?: number; pageSize?: number; department_id?: number }>({
//       query: (params) => ({
//         url: '/separations/list',
//         params,
//       }),
//     }),
//     // Phase 5: Enhanced Analytics
//     getSLACompliance: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/sla-compliance',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getExceptionQueue: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/exception-queue',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getPMCapacityHeatmap: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/pm-capacity-heatmap',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getAssignmentStatus: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/assignment-status',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getWorkflowEfficiency: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/workflow-efficiency',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getMonthlyTrends: builder.query<any[], { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/monthly-trends',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     getMatchingPerformance: builder.query<any, { department_id?: number } | void>({
//       query: (params) => ({
//         url: '/analytics/matching-performance',
//         params: params && params.department_id ? { department_id: params.department_id } : undefined,
//       }),
//     }),
//     // Phase 5: Audit Trail
//     getAuditTrail: builder.query<any[], { startDate?: string; endDate?: string; entityType?: string; userId?: string }>({
//       query: (params) => ({
//         url: '/audit-trail',
//         params,
//       }),
//     }),
//     getAuditStatistics: builder.query<any, void>({
//       query: () => '/audit-trail/statistics',
//     }),
//     // Phase 3: Workflow Automation
//     triggerNewJoinerWorkflow: builder.mutation<any, void>({
//       query: () => ({
//         url: '/workflows/new-joiner',
//         method: 'POST',
//       }),
//     }),
//     triggerReassignmentWorkflow: builder.mutation<any, void>({
//       query: () => ({
//         url: '/workflows/reassignment',
//         method: 'POST',
//       }),
//     }),
//     triggerMonthlyEngagement: builder.mutation<any, void>({
//       query: () => ({
//         url: '/workflows/monthly-engagement',
//         method: 'POST',
//       }),
//     }),
//     // Practice Reports
//     generatePracticeReport: builder.query<any, { practice?: string; cu?: string; region?: string; department_id?: number }>({
//       query: (filters) => ({
//         url: '/reports/practice',
//         params: filters,
//       }),
//     }),
//     // Auto-Generate PM List from employee data
//     previewAutoGeneratePMs: builder.query<{
//       eligible: number; new: number; alreadyPM: number; preview: any[];
//     }, void>({
//       query: () => '/pms/auto-generate/preview',
//     }),
//     confirmAutoGeneratePMs: builder.mutation<{
//       message: string; inserted: number; updated: number; total: number; count: number;
//     }, void>({
//       query: () => ({ url: '/pms/auto-generate/confirm', method: 'POST' }),
//     }),
//     // Auto-Assign Employees to PMs
//     previewAutoAssign: builder.query<{
//       totalUnassigned: number; canBeAssigned: number; cannotBeAssigned: number; preview: any[];
//     }, void>({
//       query: () => '/employees/auto-assign/preview',
//     }),
//     confirmAutoAssign: builder.mutation<{
//       message: string; assigned: number; unassigned: number; total: number; count: number;
//     }, void>({
//       query: () => ({ url: '/employees/auto-assign/confirm', method: 'POST' }),
//     }),
//     // Configuration: Matching Weights
//     getMatchingWeights: builder.query<{
//       practice: number; cu: number; region: number; account: number; skill: number; grade: number; capacity: number;
//     }, void>({
//       query: () => '/config/matching-weights',
//     }),
//     updateMatchingWeights: builder.mutation<{ message: string; weights: any }, any>({
//       query: (weights) => ({
//         url: '/config/matching-weights',
//         method: 'PUT',
//         body: weights,
//       }),
//     }),
//     // Misalignment Detection
//     getMisalignments: builder.query<
//       { count: number; misalignments: any[]; unmappedCount: number; pagination: { page: number; pageSize: number; totalPages: number; totalRecords: number } },
//       { page?: number; pageSize?: number; type?: string; practice?: string; department_id?: number }
//     >({
//       query: (params = {}) => ({ url: '/employees/misalignments', params }),
//       // Cache each unique (page, pageSize, type) combination for 2 minutes so
//       // switching between type-filter tabs reuses the response without re-fetching.
//       keepUnusedDataFor: 120,
//     }),
//     getNoSuggestedPMEmployees: builder.query<
//       { count: number; misalignments: any[]; pagination: { page: number; pageSize: number; totalPages: number; totalRecords: number } },
//       { page?: number; pageSize?: number; department_id?: number }
//     >({
//       query: (params = {}) => ({ url: '/employees/no-suggested-pm', params }),
//       // mv_no_suggested_pm makes this as fast as a simple indexed scan.
//       // Cache for 2 minutes so switching to/from this tab is always instant.
//       keepUnusedDataFor: 120,
//     }),
//     // Manual PM Override
//     overridePMAssignment: builder.mutation<any, { employeeId: string; newPmId: string; justification: string }>({
//       query: ({ employeeId, ...body }) => ({
//         url: `/employees/${employeeId}/override-pm`,
//         method: 'POST',
//         body,
//       }),
//     }),
//     getSuggestedPMsForEmployee: builder.query<{
//       employee: any;
//       suggestedPMs: any[];
//     }, string>({
//       query: (employeeId) => `/employees/${employeeId}/suggested-pms`,
//     }),
//     getEmployeePMHistory: builder.query<{ assignments: any[]; auditTrail: any[] }, string>({
//       query: (employeeId) => `/employees/${employeeId}/pm-history`,
//     }),
//     // GAD / Bench uploads
//     uploadGAD: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({ url: '/upload/gad', method: 'POST', body: formData }),
//       invalidatesTags: ['NewJoiners', 'Assignments', 'UploadStats'],
//     }),
//     uploadBenchReport: builder.mutation<UploadResponse, FormData>({
//       query: (formData) => ({ url: '/upload/bench', method: 'POST', body: formData }),
//       invalidatesTags: ['NewJoiners', 'UploadStats'],
//     }),
//     // Unmapped employees
//     getUnmappedEmployees: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; department_id?: number }>({
//       query: (params = {}) => ({ url: '/employees/unmapped', params }),
//     }),
//     // Gradewise PM Capacity
//     getGradewisePMCapacity: builder.query<any, { grade?: string; department_id?: number }>({
//       query: (params = {}) => ({ url: '/pms/gradewise-capacity', params }),
//     }),
//     // GAD Analysis Report
//     getGADAnalysisSummary: builder.query<{
//       total_employees: string; correctly_mapped: string; incorrectly_mapped: string;
//       not_mapped: string; same_grade: string; proposed_pms: string;
//     }, { practice?: string; pmId?: string; department_id?: number } | void>({
//       query: (params) => ({ url: '/analysis/summary', params: params ? { practice: (params as any).practice, pm_id: (params as any).pmId, department_id: (params as any).department_id } : {} }),
//     }),
//     getCorrectlyMappedEmployees: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; pmId?: string; department_id?: number }>({
//       query: ({ pmId, ...rest } = {}) => ({ url: '/analysis/correctly-mapped', params: { ...rest, ...(pmId ? { pm_id: pmId } : {}) } }),
//     }),
//     getSameGradeExceptions: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; pmId?: string; department_id?: number }>({
//       query: ({ pmId, ...rest } = {}) => ({ url: '/analysis/same-grade', params: { ...rest, ...(pmId ? { pm_id: pmId } : {}) } }),
//     }),
//     getProposedPMs: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; department_id?: number }>({  
//       query: (params = {}) => ({ url: '/analysis/proposed-pms', params }),
//     }),
//     getPracticeFilters: builder.query<{ practices: string[]; cus: string[]; regions: string[] }, void>({
//       query: () => '/reports/filters',
//     }),
//     // Discrepancy Report
//     getDiscrepancyReport: builder.query<any, void>({
//       query: () => '/reports/discrepancy',
//     }),
//     triggerDiscrepancyReport: builder.mutation<any, void>({
//       query: () => ({ url: '/reports/discrepancy/generate', method: 'POST' }),
//     }),
//     getDiscrepancyDetails: builder.query<{ count: number; data: any[]; pagination: any }, { type: string; page?: number; pageSize?: number }>({
//       query: ({ type, page = 1, pageSize = 50 }) => ({
//         url: '/reports/discrepancy/details',
//         params: { type, page, pageSize },
//       }),
//     }),
//     getDiscrepancyHistory: builder.query<any[], void>({
//       query: () => '/reports/discrepancy/history',
//     }),
//     // Skill Management
//     bulkUpdateEmployeeSkills: builder.mutation<any, any>({
//       query: (body) => ({ url: '/employees/skills/bulk-update', method: 'POST', body }),
//     }),
//     removeEmployeeSkill: builder.mutation<any, { skill: string; practice?: string; cu?: string; region?: string; grade?: string }>({
//       query: (body) => ({ url: '/employees/skills/remove', method: 'POST', body }),
//     }),
//     updateSingleEmployeeSkill: builder.mutation<any, { employeeId: string; skill: string }>({
//       query: ({ employeeId, skill }) => ({ url: `/employees/${employeeId}/skills`, method: 'PUT', body: { skill } }),
//     }),
//     getSkillManagementCoverage: builder.query<any, void>({
//       query: () => '/employees/skills/coverage',
//     }),
//     getFilteredEmployeesForSkillUpdate: builder.query<any, any>({
//       query: (params) => ({ url: '/employees/skills/filtered', params }),
//     }),
//   }),
// });

// export const {
//   useUploadEmployeesMutation,
//   useUploadNewJoinersMutation,
//   useUploadSeparationsMutation,
//   useUploadPMsMutation,
//   useUploadSkillReportMutation,
//   useGetNewJoinersQuery,
//   useGetNewJoinersListQuery,
//   useFindPMForEmployeeMutation,
//   useAssignPMMutation,
//   useGetPendingAssignmentsQuery,
//   useGetDashboardStatsQuery,
//   useGetPMCapacityReportQuery,
//   useGetPMReportSummaryQuery,
//   useApproveAssignmentMutation,
//   useRejectAssignmentMutation,
//   useGetApprovalWorkflowQuery,
//   useGetExceptionsQuery,
//   useResolveExceptionMutation,
//   useGetAssignmentTrendsQuery,
//   useGetPracticeDistributionQuery,
//   useGetApprovalMetricsQuery,
//   useGetGradeDistributionQuery,
//   useGetRegionStatsQuery,
//   useGetUploadStatsQuery,
//   useGetEmployeesListQuery,
//   useGetPMsListQuery,
//   useGetPMDetailReportQuery,
//   useGetSeparationsListQuery,
//   // Phase 5: Enhanced Analytics
//   useGetSLAComplianceQuery,
//   useGetExceptionQueueQuery,
//   useGetPMCapacityHeatmapQuery,
//   useGetAssignmentStatusQuery,
//   useGetWorkflowEfficiencyQuery,
//   useGetMonthlyTrendsQuery,
//   useGetMatchingPerformanceQuery,
//   // Phase 5: Audit Trail
//   useGetAuditTrailQuery,
//   useGetAuditStatisticsQuery,
//   // Phase 3: Workflow Automation
//   useTriggerNewJoinerWorkflowMutation,
//   useTriggerReassignmentWorkflowMutation,
//   useTriggerMonthlyEngagementMutation,
//   // Practice Reports
//   useGeneratePracticeReportQuery,
//   useGetPracticeFiltersQuery,
//   // Auto-Generate PMs
//   useLazyPreviewAutoGeneratePMsQuery,
//   useConfirmAutoGeneratePMsMutation,
//   // Auto-Assign Employees
//   useLazyPreviewAutoAssignQuery,
//   useConfirmAutoAssignMutation,
//   // Configuration: Matching Weights
//   useGetMatchingWeightsQuery,
//   useUpdateMatchingWeightsMutation,
//   // Misalignment Detection
//   useGetMisalignmentsQuery,
//   useLazyGetMisalignmentsQuery,
//   useGetNoSuggestedPMEmployeesQuery,
//   // Manual PM Override
//   useOverridePMAssignmentMutation,
//   useGetSuggestedPMsForEmployeeQuery,
//   useLazyGetSuggestedPMsForEmployeeQuery,
//   useGetEmployeePMHistoryQuery,
//   // GAD / Bench
//   useUploadGADMutation,
//   useUploadBenchReportMutation,
//   // Unmapped & Gradewise
//   useGetUnmappedEmployeesQuery,
//   useGetGradewisePMCapacityQuery,
//   // GAD Analysis
//   useGetGADAnalysisSummaryQuery,
//   useGetCorrectlyMappedEmployeesQuery,
//   useGetSameGradeExceptionsQuery,
//   useGetProposedPMsQuery,
//   // Discrepancy Report
//   useGetDiscrepancyReportQuery,
//   useTriggerDiscrepancyReportMutation,
//   useLazyGetDiscrepancyDetailsQuery,
//   useGetDiscrepancyHistoryQuery,
//   // Skill Management
//   useBulkUpdateEmployeeSkillsMutation,
//   useRemoveEmployeeSkillMutation,
//   useUpdateSingleEmployeeSkillMutation,
//   useGetSkillManagementCoverageQuery,
//   useGetFilteredEmployeesForSkillUpdateQuery,
// } = pmApi;

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Employee, PMMatch, PMAssignment, UploadResponse, MatchOutput, MatchConfidence } from '../types';

export const pmApi = createApi({
  reducerPath: 'pmApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api/pm',
    // ✅ Set a very long timeout for large file uploads (30 minutes)
    // This prevents the request from timing out during processing of large GAD reports
    timeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    prepareHeaders: (headers, { endpoint }) => {
      // Add Authorization header with token
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // Don't set Content-Type for file uploads - let browser set it with boundary
      if (endpoint === 'uploadEmployees' || endpoint === 'uploadNewJoiners' || endpoint === 'uploadSeparations' || endpoint === 'uploadSkillReport' || endpoint === 'uploadPMs' || endpoint === 'uploadGAD' || endpoint === 'uploadBenchReport') {
        headers.delete('Content-Type');
      }
      return headers;
    },
  }),
  tagTypes: ['NewJoiners', 'Assignments'],
  endpoints: (builder) => ({
    uploadEmployees: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/employees',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['NewJoiners'],
    }),
    uploadNewJoiners: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/new-joiners',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['NewJoiners'],
    }),
    uploadSeparations: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/separations',
        method: 'POST',
        body: formData,
      }),
    }),
    uploadPMs: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/pms',
        method: 'POST',
        body: formData,
      }),
    }),
    uploadSkillReport: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/skills',
        method: 'POST',
        body: formData,
      }),
    }),
    getNewJoiners: builder.query<Employee[], void>({
      query: () => '/employees/new-joiners',
      providesTags: ['NewJoiners'],
    }),
    getNewJoinersList: builder.query<{ data: Employee[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { practice?: string; cu?: string; region?: string; page?: number; pageSize?: number }>({
      query: (params) => ({
        url: '/employees/new-joiners/list',
        params,
      }),
      providesTags: ['NewJoiners'],
    }),
    findPMForEmployee: builder.mutation<{
      employee: Employee;
      result: MatchOutput;
      matches: PMMatch[];
      flag_summary: { total: number; critical: number; major: number; minor: number; has_unmappable: boolean };
      best_confidence: MatchConfidence;
    }, string>({
      query: (employeeId) => ({
        url: `/employees/${employeeId}/find-pm`,
        method: 'GET',
      }),
    }),
    assignPM: builder.mutation<{ message: string; assignmentId: number }, Partial<PMAssignment>>({
      query: (assignment) => ({
        url: '/assignments',
        method: 'POST',
        body: assignment,
      }),
      invalidatesTags: ['NewJoiners', 'Assignments'],
    }),
    getPendingAssignments: builder.query<PMAssignment[], void>({
      query: () => '/assignments/pending',
      providesTags: ['Assignments'],
    }),
    getDashboardStats: builder.query<any, { department_id?: number } | undefined>({
      query: (params) => ({
        url: '/stats/dashboard',
        params: params?.department_id ? { department_id: params.department_id } : undefined,
      }),
    }),
    getPMCapacityReport: builder.query<any[], { department_id?: number } | undefined>({
      query: (params) => ({
        url: '/stats/pm-capacity',
        params: params?.department_id ? { department_id: params.department_id } : undefined,
      }),
    }),
    getPMReportSummary: builder.query<any, { is_active?: string; practice?: string; cu?: string; region?: string; grade?: string; skill?: string; department_id?: number }>({
      query: (params) => ({
        url: '/stats/pm-report',
        params,
      }),
    }),
    approveAssignment: builder.mutation<any, { workflowId: number; comments?: string }>({
      query: ({ workflowId, comments }) => ({
        url: `/approvals/${workflowId}/approve`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: ['Assignments'],
    }),
    rejectAssignment: builder.mutation<any, { workflowId: number; comments: string }>({
      query: ({ workflowId, comments }) => ({
        url: `/approvals/${workflowId}/reject`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: ['Assignments'],
    }),
    getApprovalWorkflow: builder.query<any[], number>({
      query: (assignmentId) => `/approvals/assignment/${assignmentId}`,
    }),
    getExceptions: builder.query<any[], void>({
      query: () => '/exceptions',
    }),
    resolveException: builder.mutation<any, number>({
      query: (exceptionId) => ({
        url: `/exceptions/${exceptionId}/resolve`,
        method: 'POST',
      }),
    }),
    getAssignmentTrends: builder.query<any[], void>({
      query: () => '/stats/assignment-trends',
    }),
    getPracticeDistribution: builder.query<any[], void>({
      query: () => '/stats/practice-distribution',
    }),
    getApprovalMetrics: builder.query<any, void>({
      query: () => '/stats/approval-metrics',
    }),
    getGradeDistribution: builder.query<any[], void>({
      query: () => '/stats/grade-distribution',
    }),
    getRegionStats: builder.query<any[], void>({
      query: () => '/stats/region-stats',
    }),
    getUploadStats: builder.query<any, { department_id?: number } | void>({
      query: (params) => ({
        url: '/stats/upload-stats',
        params: params && params.department_id ? { department_id: params.department_id } : undefined,
      }),
    }),
    getEmployeesList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { status?: string; practice?: string; cu?: string; region?: string; page?: number; pageSize?: number }>({
      query: (params) => ({
        url: '/employees/list',
        params,
      }),
      keepUnusedDataFor: 300,
    }),
    getPMsList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { is_active?: string; practice?: string; cu?: string; region?: string; grade?: string; skill?: string; view_filter?: string; page?: number; pageSize?: number }>({
      query: (params) => ({
        url: '/pms/list',
        params,
      }),
    }),
    getPMDetailReport: builder.query<{
      pm: any;
      utilization: number;
      reportees: any[];
      separation: any | null;
      pendingAssignments: any[];
      gradeDistribution: { grade: string; count: string }[];
      practiceDistribution: { practice: string; count: string }[];
    }, string>({
      query: (pmId) => `/pms/${encodeURIComponent(pmId)}/report`,
    }),
    getSeparationsList: builder.query<{ data: any[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } }, { status?: string; grade?: string; skill?: string; practice?: string; cu?: string; region?: string; person_type?: string; page?: number; pageSize?: number }>({
      query: (params) => ({
        url: '/separations/list',
        params,
      }),
    }),
    // Phase 5: Enhanced Analytics
    getSLACompliance: builder.query<any, void>({
      query: () => '/analytics/sla-compliance',
    }),
    getExceptionQueue: builder.query<any[], void>({
      query: () => '/analytics/exception-queue',
    }),
    getPMCapacityHeatmap: builder.query<any[], void>({
      query: () => '/analytics/pm-capacity-heatmap',
    }),
    getAssignmentStatus: builder.query<any, void>({
      query: () => '/analytics/assignment-status',
    }),
    getWorkflowEfficiency: builder.query<any, void>({
      query: () => '/analytics/workflow-efficiency',
    }),
    getMonthlyTrends: builder.query<any[], void>({
      query: () => '/analytics/monthly-trends',
    }),
    getMatchingPerformance: builder.query<any, void>({
      query: () => '/analytics/matching-performance',
    }),
    // Phase 5: Audit Trail
    getAuditTrail: builder.query<any[], { startDate?: string; endDate?: string; entityType?: string; userId?: string }>({
      query: (params) => ({
        url: '/audit-trail',
        params,
      }),
    }),
    getAuditStatistics: builder.query<any, void>({
      query: () => '/audit-trail/statistics',
    }),
    // Phase 3: Workflow Automation
    triggerNewJoinerWorkflow: builder.mutation<any, void>({
      query: () => ({
        url: '/workflows/new-joiner',
        method: 'POST',
      }),
    }),
    triggerReassignmentWorkflow: builder.mutation<any, void>({
      query: () => ({
        url: '/workflows/reassignment',
        method: 'POST',
      }),
    }),
    triggerMonthlyEngagement: builder.mutation<any, void>({
      query: () => ({
        url: '/workflows/monthly-engagement',
        method: 'POST',
      }),
    }),
    // Practice Reports
    generatePracticeReport: builder.query<any, { practice?: string; cu?: string; region?: string }>({
      query: (filters) => ({
        url: '/reports/practice',
        params: filters,
      }),
    }),
    // Auto-Generate PM List from employee data
    previewAutoGeneratePMs: builder.query<{
      eligible: number; new: number; alreadyPM: number; preview: any[];
    }, void>({
      query: () => '/pms/auto-generate/preview',
    }),
    confirmAutoGeneratePMs: builder.mutation<{
      message: string; inserted: number; updated: number; total: number; count: number;
    }, void>({
      query: () => ({ url: '/pms/auto-generate/confirm', method: 'POST' }),
    }),
    // Auto-Assign Employees to PMs
    previewAutoAssign: builder.query<{
      totalUnassigned: number; canBeAssigned: number; cannotBeAssigned: number; preview: any[];
    }, void>({
      query: () => '/employees/auto-assign/preview',
    }),
    confirmAutoAssign: builder.mutation<{
      message: string; assigned: number; unassigned: number; total: number; count: number;
    }, void>({
      query: () => ({ url: '/employees/auto-assign/confirm', method: 'POST' }),
    }),
    // Configuration: Matching Weights
    getMatchingWeights: builder.query<{
      practice: number; cu: number; region: number; account: number; skill: number; grade: number; capacity: number;
    }, void>({
      query: () => '/config/matching-weights',
    }),
    updateMatchingWeights: builder.mutation<{ message: string; weights: any }, any>({
      query: (weights) => ({
        url: '/config/matching-weights',
        method: 'PUT',
        body: weights,
      }),
    }),
    // Misalignment Detection
    getMisalignments: builder.query<
      { count: number; misalignments: any[]; unmappedCount: number; pagination: { page: number; pageSize: number; totalPages: number; totalRecords: number } },
      { page?: number; pageSize?: number; type?: string; practice?: string }
    >({
      query: (params = {}) => ({ url: '/employees/misalignments', params }),
    }),
    getNoSuggestedPMEmployees: builder.query<
      { count: number; misalignments: any[]; pagination: { page: number; pageSize: number; totalPages: number; totalRecords: number } },
      { page?: number; pageSize?: number; department_id?: number }
    >({
      query: (params = {}) => ({ url: '/employees/no-suggested-pm', params }),
      keepUnusedDataFor: 120,
    }),
    // Employee Skill Management
    getEmployeeSkillDistribution: builder.query<
      { data: { skill: string; employee_count: number }[]; totalEmployees: number; totalSkills: number },
      { practice?: string; cu?: string; region?: string; grade?: string; status?: string } | void
    >({
      query: (params = {}) => ({ url: '/employees/skills/distribution', params: params || {} }),
    }),
    getSkillManagementCoverage: builder.query<
      { practices: number; grades: number; cus: number; regions: number; totalEmployees: number },
      void
    >({
      query: () => '/employees/skills/coverage',
    }),
    getFilteredEmployeesForSkillUpdate: builder.query<
      { data: any[]; totalCount: number },
      { practice?: string; cu?: string; region?: string; grade?: string; department_id?: number }
    >({
      query: (params = {}) => ({ url: '/employees/skills/preview', params }),
    }),
    bulkUpdateEmployeeSkills: builder.mutation<
      { message: string; updatedCount: number; skill: string; practice?: string | null },
      { skill: string; practice?: string; cu?: string; region?: string; grade?: string; department_id?: number }
    >({
      async queryFn(body, _api, _extraOptions, fetchWithBQ) {
        // Primary route (current backend)
        let result = await fetchWithBQ({
          url: '/employees/skills/bulk-update',
          method: 'PUT',
          body,
        });

        // Backward compatibility with older backend versions using POST
        if (result.error && ((result.error as any).status === 404 || (result.error as any).status === 405)) {
          result = await fetchWithBQ({
            url: '/employees/skills/bulk-update',
            method: 'POST',
            body,
          });
        }

        if (result.error) return { error: result.error as any };
        return { data: result.data as { message: string; updatedCount: number; skill: string; practice?: string | null } };
      },
    }),
    removeEmployeeSkill: builder.mutation<
      { message: string; updatedCount: number },
      { skill?: string; practice?: string; cu?: string; region?: string; grade?: string; department_id?: number }
    >({
      query: (body) => ({ url: '/employees/skills/remove', method: 'POST', body }),
    }),
    updateSingleEmployeeSkill: builder.mutation<
      { message: string },
      { employeeId: string; skill: string }
    >({
      async queryFn({ employeeId, skill }, _api, _extraOptions, fetchWithBQ) {
        const body = { skill };

        // Primary route (current backend)
        let result = await fetchWithBQ({
          url: `/employees/${employeeId}/skill`,
          method: 'PATCH',
          body,
        });

        // Backward compatibility with older backend route/method
        if (result.error && ((result.error as any).status === 404 || (result.error as any).status === 405)) {
          result = await fetchWithBQ({
            url: `/employees/${employeeId}/skills`,
            method: 'PUT',
            body,
          });
        }

        if (result.error) return { error: result.error as any };
        return { data: result.data as { message: string } };
      },
    }),
    // Manual PM Override
    overridePMAssignment: builder.mutation<any, { employeeId: string; newPmId: string; justification: string }>({
      query: ({ employeeId, ...body }) => ({
        url: `/employees/${employeeId}/override-pm`,
        method: 'POST',
        body,
      }),
    }),
    getSuggestedPMsForEmployee: builder.query<{
      employee: any;
      suggestedPMs: any[];
    }, string>({
      query: (employeeId) => `/employees/${employeeId}/suggested-pms`,
    }),
    getEmployeePMHistory: builder.query<{ assignments: any[]; auditTrail: any[] }, string>({
      query: (employeeId) => `/employees/${employeeId}/pm-history`,
    }),
    // GAD / Bench uploads
    uploadGAD: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({ url: '/upload/gad', method: 'POST', body: formData }),
      invalidatesTags: ['NewJoiners', 'Assignments'],
    }),
    uploadBenchReport: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({ url: '/upload/bench', method: 'POST', body: formData }),
      invalidatesTags: ['NewJoiners'],
    }),
    // Unmapped employees
    getUnmappedEmployees: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string }>({
      query: (params = {}) => ({ url: '/employees/unmapped', params }),
    }),
    // Gradewise PM Capacity
    getGradewisePMCapacity: builder.query<any, { grade?: string; department_id?: number }>({
      query: (params = {}) => ({ url: '/pms/gradewise-capacity', params }),
    }),
    // GAD Analysis Report
    getGADAnalysisSummary: builder.query<{
      total_employees: string; correctly_mapped: string; incorrectly_mapped: string;
      not_mapped: string; same_grade: string; proposed_pms: string;
    }, { practice?: string; pmId?: string; department_id?: number } | void>({
      query: (params) => ({
        url: '/analysis/summary',
        params: params
          ? {
              ...(( params as any).practice    ? { practice:       (params as any).practice    } : {}),
              ...((params as any).pmId         ? { pm_id:          (params as any).pmId         } : {}),
              ...((params as any).department_id ? { department_id: (params as any).department_id } : {}),
            }
          : {},
      }),
    }),
    getCorrectlyMappedEmployees: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; pmId?: string }>({
      query: ({ pmId, ...rest } = {}) => ({ url: '/analysis/correctly-mapped', params: { ...rest, ...(pmId ? { pm_id: pmId } : {}) } }),
    }),
    getSameGradeExceptions: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string; pmId?: string }>({
      query: ({ pmId, ...rest } = {}) => ({ url: '/analysis/same-grade', params: { ...rest, ...(pmId ? { pm_id: pmId } : {}) } }),
    }),
    getProposedPMs: builder.query<{ count: number; data: any[]; pagination: any }, { page?: number; pageSize?: number; practice?: string }>({  
      query: (params = {}) => ({ url: '/analysis/proposed-pms', params }),
    }),
    getPracticeFilters: builder.query<{ practices: string[]; cus: string[]; regions: string[] }, void>({
      query: () => '/reports/filters',
    }),
    // Discrepancy Report
    getDiscrepancyReport: builder.query<any, void>({
      query: () => '/reports/discrepancy',
    }),
    triggerDiscrepancyReport: builder.mutation<any, void>({
      query: () => ({ url: '/reports/discrepancy/generate', method: 'POST' }),
    }),
    getDiscrepancyDetails: builder.query<{ count: number; data: any[]; pagination: any }, { type: string; page?: number; pageSize?: number }>({
      query: ({ type, page = 1, pageSize = 50 }) => ({
        url: '/reports/discrepancy/details',
        params: { type, page, pageSize },
      }),
    }),
    getDiscrepancyHistory: builder.query<any[], void>({
      query: () => '/reports/discrepancy/history',
    }),
  }),
});

export const {
  useUploadEmployeesMutation,
  useUploadNewJoinersMutation,
  useUploadSeparationsMutation,
  useUploadPMsMutation,
  useUploadSkillReportMutation,
  useGetNewJoinersQuery,
  useGetNewJoinersListQuery,
  useFindPMForEmployeeMutation,
  useAssignPMMutation,
  useGetPendingAssignmentsQuery,
  useGetDashboardStatsQuery,
  useGetPMCapacityReportQuery,
  useGetPMReportSummaryQuery,
  useApproveAssignmentMutation,
  useRejectAssignmentMutation,
  useGetApprovalWorkflowQuery,
  useGetExceptionsQuery,
  useResolveExceptionMutation,
  useGetAssignmentTrendsQuery,
  useGetPracticeDistributionQuery,
  useGetApprovalMetricsQuery,
  useGetGradeDistributionQuery,
  useGetRegionStatsQuery,
  useGetUploadStatsQuery,
  useGetEmployeesListQuery,
  useGetPMsListQuery,
  useGetPMDetailReportQuery,
  useGetSeparationsListQuery,
  // Phase 5: Enhanced Analytics
  useGetSLAComplianceQuery,
  useGetExceptionQueueQuery,
  useGetPMCapacityHeatmapQuery,
  useGetAssignmentStatusQuery,
  useGetWorkflowEfficiencyQuery,
  useGetMonthlyTrendsQuery,
  useGetMatchingPerformanceQuery,
  // Phase 5: Audit Trail
  useGetAuditTrailQuery,
  useGetAuditStatisticsQuery,
  // Phase 3: Workflow Automation
  useTriggerNewJoinerWorkflowMutation,
  useTriggerReassignmentWorkflowMutation,
  useTriggerMonthlyEngagementMutation,
  // Practice Reports
  useGeneratePracticeReportQuery,
  useGetPracticeFiltersQuery,
  // Auto-Generate PMs
  useLazyPreviewAutoGeneratePMsQuery,
  useConfirmAutoGeneratePMsMutation,
  // Auto-Assign Employees
  useLazyPreviewAutoAssignQuery,
  useConfirmAutoAssignMutation,
  // Configuration: Matching Weights
  useGetMatchingWeightsQuery,
  useUpdateMatchingWeightsMutation,
  // Misalignment Detection
  useGetMisalignmentsQuery,
  useLazyGetMisalignmentsQuery,
  useGetNoSuggestedPMEmployeesQuery,
  // Employee Skill Management
  useGetEmployeeSkillDistributionQuery,
  useGetSkillManagementCoverageQuery,
  useGetFilteredEmployeesForSkillUpdateQuery,
  useBulkUpdateEmployeeSkillsMutation,
  useRemoveEmployeeSkillMutation,
  useUpdateSingleEmployeeSkillMutation,
  // Manual PM Override
  useOverridePMAssignmentMutation,
  useGetSuggestedPMsForEmployeeQuery,
  useLazyGetSuggestedPMsForEmployeeQuery,
  useGetEmployeePMHistoryQuery,
  // GAD / Bench
  useUploadGADMutation,
  useUploadBenchReportMutation,
  // Unmapped & Gradewise
  useGetUnmappedEmployeesQuery,
  useGetGradewisePMCapacityQuery,
  // GAD Analysis
  useGetGADAnalysisSummaryQuery,
  useGetCorrectlyMappedEmployeesQuery,
  useGetSameGradeExceptionsQuery,
  useGetProposedPMsQuery,
  // Discrepancy Report
  useGetDiscrepancyReportQuery,
  useTriggerDiscrepancyReportMutation,
  useLazyGetDiscrepancyDetailsQuery,
  useGetDiscrepancyHistoryQuery,
} = pmApi;
