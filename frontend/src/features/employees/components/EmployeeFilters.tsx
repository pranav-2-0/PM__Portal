import { GRADE_OPTIONS } from '../../../shared/constants';
import type { EmployeeFilters } from '../hooks/useEmployeeList';

export interface EmployeeFiltersProps {
  filters: EmployeeFilters;
  onFilterChange: (key: keyof EmployeeFilters, value: string) => void;
  practices: string[];
  cus: string[];
  regions: string[];
  benchOnly?: boolean;
}

const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export function EmployeeFilters({
  filters,
  onFilterChange,
  practices,
  cus,
  regions,
  benchOnly = false,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {!benchOnly && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => onFilterChange('status', e.target.value)}
            className={selectCls}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Practice</label>
        <select
          value={filters.practice}
          onChange={e => onFilterChange('practice', e.target.value)}
          className={`${selectCls} min-w-[130px]`}
        >
          <option value="">All Practices</option>
          {practices.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">NEW BU</label>
        <select
          value={filters.cu}
          onChange={e => onFilterChange('cu', e.target.value)}
          className={`${selectCls} min-w-[130px]`}
        >
          <option value="">All NEW BUs</option>
          {cus.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
        <select
          value={filters.region}
          onChange={e => onFilterChange('region', e.target.value)}
          className={`${selectCls} min-w-[120px]`}
        >
          <option value="">All Regions</option>
          {regions.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
        <select
          value={filters.grade}
          onChange={e => onFilterChange('grade', e.target.value)}
          className={`${selectCls} w-28`}
        >
          <option value="">All Grades</option>
          {GRADE_OPTIONS.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Skill</label>
        <input
          type="text"
          value={filters.skill}
          onChange={e => onFilterChange('skill', e.target.value)}
          placeholder="Search skill..."
          className={`${selectCls} min-w-[150px]`}
        />
      </div>
    </div>
  );
}
