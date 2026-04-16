import { useState, useCallback, useMemo } from 'react';
import {
  useGetEmployeesListQuery,
  useGetPracticeFiltersQuery,
  // useGetFilteredEmployeesForSkillUpdateQuery, // TODO: Use for skill filter previews
} from '../../../services/pmApi';

export interface EmployeeFilters {
  status: 'active' | 'inactive' | '';
  practice: string;
  cu: string;
  region: string;
  grade: string;
  skill: string;
}

export function useEmployeeList(benchOnly: boolean = false, initialPage: number = 1, initialPageSize: number = 50) {
  const [filters, setFilters] = useState<EmployeeFilters>({
    status: 'active',
    practice: '',
    cu: '',
    region: '',
    grade: '',
    skill: '',
  });

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [viewMode, setViewMode] = useState<'list' | 'skill'>('list');

  // Paginated query for list view
  const {
    data: listResponse,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchList,
  } = useGetEmployeesListQuery({
    ...filters,
    page,
    pageSize,
  });

  // Bulk query for skill-wise view (10k rows)
  const {
    data: bulkResponse,
    isLoading: bulkLoading,
    refetch: refetchBulk,
  } = useGetEmployeesListQuery({
    ...filters,
    page: 1,
    pageSize: 10000,
  });

  // Filter options
  const { data: filterOpts } = useGetPracticeFiltersQuery();

  const activeResponse = viewMode === 'skill' ? bulkResponse : listResponse;
  const isLoading = viewMode === 'skill' ? bulkLoading : listLoading;
  const isFetching = viewMode === 'skill' ? false : listFetching;

  // Filter employees based on bench status
  const employees = useMemo(() => {
    const data = activeResponse?.data || [];
    return data.filter((emp: any) => {
      if (benchOnly && emp.current_pm_id) return false;
      if (filters.grade && !emp.grade?.toLowerCase().includes(filters.grade.toLowerCase())) return false;
      if (filters.skill) {
        const effectiveSkill = String(emp.skill || emp.primary_skill || '').toLowerCase();
        if (!effectiveSkill.includes(filters.skill.toLowerCase())) return false;
      }
      return true;
    });
  }, [activeResponse, filters, benchOnly]);

  const pagination = useMemo(() => activeResponse?.pagination || {
    page: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 1,
  }, [activeResponse]);

  const handleFilterChange = useCallback((key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      status: 'active',
      practice: '',
      cu: '',
      region: '',
      grade: '',
      skill: '',
    });
    setPage(1);
  }, []);

  const practices = useMemo(() => filterOpts?.practices?.filter(p => p !== 'All') ?? [], [filterOpts]);
  const cus = useMemo(() => filterOpts?.cus?.filter(c => c !== 'All') ?? [], [filterOpts]);
  const regions = useMemo(() => filterOpts?.regions?.filter(r => r !== 'All') ?? [], [filterOpts]);

  return {
    filters,
    setFilters,
    handleFilterChange,
    employees,
    pagination,
    page,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    isLoading,
    isFetching,
    refetch: viewMode === 'skill' ? refetchBulk : refetchList,
    viewMode,
    setViewMode,
    resetFilters,
    practices,
    cus,
    regions,
    filterOpts,
  };
}
