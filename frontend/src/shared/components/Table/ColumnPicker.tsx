/**
 * ColumnPicker Component
 * Reusable column visibility toggle for data tables
 */

import React, { useEffect, useRef } from 'react';
import { Filter, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ColumnDef {
  key: string;
  label: string;
  always?: boolean;
  group?: string;
}

export interface ColumnPickerProps {
  columns: ColumnDef[];
  visibleColumns: string[];
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  groupedColumns?: Record<string, ColumnDef[]>;
}

/**
 * Reusable column picker dropdown for tables
 * Supports column grouping and "always visible" columns
 */
export const ColumnPicker: React.FC<ColumnPickerProps> = ({
  columns,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  isOpen,
  onToggleOpen,
  groupedColumns,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onToggleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onToggleOpen]);

  // Group columns if not provided
  const groups = groupedColumns || {
    default: columns,
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => onToggleOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border font-medium transition-colors',
          isOpen
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        )}
        title="Choose columns"
      >
        <Filter size={14} />
        Columns
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-64 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Visible Columns
            </span>
            <button
              onClick={onResetColumns}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              title="Reset to defaults"
            >
              <RefreshCcw size={11} /> Reset
            </button>
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {Object.entries(groups).map(([groupName, groupCols]) => (
              <div key={groupName}>
                {/* Group Header */}
                {groupName !== 'default' && (
                  <div className="px-2 pt-2 pb-1 border-t border-gray-100 mt-1">
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        groupName === 'Employee'
                          ? 'text-gray-400'
                          : 'text-blue-500'
                      )}
                    >
                      {groupName}
                    </p>
                  </div>
                )}

                {/* Column Items */}
                {groupCols.map(col => (
                  <label
                    key={col.key}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                      col.always
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      disabled={col.always}
                      onChange={() => !col.always && onToggleColumn(col.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                    {col.always && (
                      <span className="ml-auto text-xs text-gray-400 italic">
                        always
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            {visibleColumns.length} of {columns.length} columns shown
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnPicker;
