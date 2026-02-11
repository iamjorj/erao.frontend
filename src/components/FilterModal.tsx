"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// Types
export type FilterOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'not_equals';

export interface AdvancedFilter {
  operator: FilterOperator;
  value: string;
  id: string;
}

export interface FilterModalProps {
  columns: string[];
  rows: Record<string, unknown>[];
  filters: Record<string, unknown[]>;
  advancedFilters?: Record<string, AdvancedFilter[]>;
  onFilterChange: (column: string, value: unknown) => void;
  onAdvancedFilterChange?: (column: string, filter: AdvancedFilter | null, action?: 'add' | 'remove') => void;
  onClearFilters: () => void;
  onClose: () => void;
  showExport?: boolean;
  showAdvancedFilters?: boolean;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  return str === "null" ? "-" : str;
}

const operators: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

export function FilterModal({
  columns,
  rows,
  filters,
  advancedFilters,
  onFilterChange,
  onAdvancedFilterChange,
  onClearFilters,
  onClose,
  showExport = true,
  showAdvancedFilters = true,
}: FilterModalProps) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(columns[0] || null);
  const [advancedOperator, setAdvancedOperator] = useState<FilterOperator>('contains');
  const [advancedValue, setAdvancedValue] = useState("");
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [valueSearch, setValueSearch] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const operatorButtonRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opening
  const openOperatorDropdown = useCallback(() => {
    if (operatorButtonRef.current) {
      const rect = operatorButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOperatorDropdownOpen(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (operatorDropdownOpen) {
          setOperatorDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, operatorDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (operatorDropdownOpen && operatorButtonRef.current && !operatorButtonRef.current.contains(event.target as Node)) {
        setOperatorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [operatorDropdownOpen]);

  const handleColumnSelect = useCallback((col: string) => {
    setSelectedColumn(col);
    setValueSearch("");
  }, []);

  // Apply advanced filter logic
  const applyAdvancedFilter = useCallback((rowValue: unknown, filter: AdvancedFilter): boolean => {
    const strValue = String(rowValue ?? '').toLowerCase();
    const filterValue = filter.value.toLowerCase();
    const numValue = Number(rowValue);
    const numFilterValue = Number(filter.value);

    switch (filter.operator) {
      case 'equals':
        return strValue === filterValue;
      case 'not_equals':
        return strValue !== filterValue;
      case 'contains':
        return strValue.includes(filterValue);
      case 'starts_with':
        return strValue.startsWith(filterValue);
      case 'ends_with':
        return strValue.endsWith(filterValue);
      case 'greater_than':
        return !isNaN(numValue) && !isNaN(numFilterValue) && numValue > numFilterValue;
      case 'less_than':
        return !isNaN(numValue) && !isNaN(numFilterValue) && numValue < numFilterValue;
      default:
        return true;
    }
  }, []);

  // Get filtered rows based on current filters
  const filteredRows = useMemo(() => {
    const hasSimpleFilters = Object.keys(filters).length > 0;
    const hasAdvancedFiltersActive = advancedFilters && Object.keys(advancedFilters).some(col => advancedFilters[col]?.length > 0);

    if (!hasSimpleFilters && !hasAdvancedFiltersActive) return rows;

    return rows.filter(row => {
      for (const [col, values] of Object.entries(filters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }

      if (advancedFilters) {
        for (const [col, filterArray] of Object.entries(advancedFilters)) {
          if (filterArray && filterArray.length > 0) {
            for (const filter of filterArray) {
              if (filter && filter.value) {
                if (!applyAdvancedFilter(row[col], filter)) {
                  return false;
                }
              }
            }
          }
        }
      }

      return true;
    });
  }, [rows, filters, advancedFilters, applyAdvancedFilter]);

  // Get unique values for selected column
  const uniqueValues = useMemo(() => {
    if (!selectedColumn) return [];
    const seen = new Set<string>();
    const values: unknown[] = [];
    for (const row of filteredRows) {
      const val = row[selectedColumn];
      const key = String(val);
      if (!seen.has(key)) {
        seen.add(key);
        values.push(val);
      }
    }
    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [filteredRows, selectedColumn]);

  // Filter values by search
  const searchedValues = useMemo(() => {
    if (!valueSearch) return uniqueValues.slice(0, 50);
    const query = valueSearch.toLowerCase();
    return uniqueValues.filter(v => String(v).toLowerCase().includes(query)).slice(0, 50);
  }, [uniqueValues, valueSearch]);

  // Count active filters
  const simpleFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);
  const advancedFilterCount = advancedFilters
    ? Object.values(advancedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;
  const activeFilterCount = simpleFilterCount + advancedFilterCount;
  const columnFilters = selectedColumn ? (filters[selectedColumn] || []) : [];

  // Export filtered data as CSV
  const handleExport = useCallback(() => {
    const csvHeaders = columns.join(",");
    const csvRows = filteredRows.map(row =>
      columns.map(col => {
        const val = row[col];
        const str = val === null || val === undefined ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );
    const csv = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `filtered_data_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [columns, filteredRows]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-[#333]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Filter Data</span>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              ({filteredRows.length}/{rows.length})
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {showExport && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg transition-colors"
                title="Export filtered data as CSV"
              >
                <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={onClearFilters}
                className="px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Filters Pills */}
        {activeFilterCount > 0 && (
          <div className="px-3 sm:px-4 py-2 border-b border-gray-100 dark:border-[#262626] bg-gray-50/50 dark:bg-[#0f0f0f] max-h-20 sm:max-h-24 overflow-y-auto flex-shrink-0">
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {Object.entries(filters).map(([col, values]) =>
                values?.map((val, idx) => (
                  <span
                    key={`${col}-${idx}`}
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg"
                  >
                    <span className="text-gray-500 dark:text-gray-400">{col}:</span>
                    <span className="max-w-[80px] truncate">{formatCellValue(val)}</span>
                    <button
                      onClick={() => onFilterChange(col, val)}
                      className="ml-0.5 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-[#444]"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
              {advancedFilters && Object.entries(advancedFilters).map(([col, filterArray]) =>
                filterArray?.map((filter) => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg"
                  >
                    <span className="text-blue-500 dark:text-blue-400">{col}:</span>
                    <span className="max-w-[100px] truncate">{operators.find(o => o.value === filter.operator)?.label} &quot;{filter.value}&quot;</span>
                    <button
                      onClick={() => onAdvancedFilterChange?.(col, filter, 'remove')}
                      className="ml-0.5 p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Column Selector - Left Panel */}
          <div className="sm:w-48 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-[#333] flex flex-col flex-shrink-0">
            <div className="px-3 py-1.5 sm:py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#0f0f0f]">
              Select Column
            </div>
            <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto sm:flex-1 pb-1 sm:pb-0">
              {columns.map(col => {
                const colFilterCount = (filters[col] || []).length + ((advancedFilters?.[col]?.length) || 0);
                return (
                  <button
                    key={col}
                    onClick={() => handleColumnSelect(col)}
                    className={`flex-shrink-0 sm:flex-shrink text-left px-3 py-2 text-xs sm:text-sm flex items-center gap-1 sm:justify-between transition-colors whitespace-nowrap sm:whitespace-normal ${
                      selectedColumn === col
                        ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white sm:border-r-2 border-gray-900 dark:border-white'
                        : 'hover:bg-gray-50 dark:hover:bg-[#222] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="truncate">{col}</span>
                    {colFilterCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium bg-gray-200 dark:bg-[#444] text-gray-700 dark:text-gray-300 rounded">
                        {colFilterCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value Selector - Right Panel */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selectedColumn ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Advanced Filter Section */}
                {showAdvancedFilters && onAdvancedFilterChange && (
                  <div className="p-3 border-b border-gray-100 dark:border-[#262626] flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {/* Operator Dropdown - Fixed positioning to avoid overflow clipping */}
                      <div className="flex-1 sm:flex-none sm:w-40" ref={operatorButtonRef}>
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Operator</label>
                        <button
                          onClick={() => operatorDropdownOpen ? setOperatorDropdownOpen(false) : openOperatorDropdown()}
                          className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-[#444] transition-colors"
                        >
                          <span>{operators.find(o => o.value === advancedOperator)?.label}</span>
                          <svg className={`w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400 transition-transform ${operatorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {/* Fixed position dropdown portal */}
                      {operatorDropdownOpen && dropdownPosition && (
                        <div
                          className="fixed py-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg z-[200]"
                          style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width
                          }}
                        >
                          {operators.map(op => (
                            <button
                              key={op.value}
                              onClick={() => {
                                setAdvancedOperator(op.value);
                                setOperatorDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-xs sm:text-sm text-left transition-colors ${
                                advancedOperator === op.value
                                  ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#262626]'
                              }`}
                            >
                              {op.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Value Input */}
                      <div className="flex-1">
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Value</label>
                        <input
                          type="text"
                          placeholder="Enter value..."
                          value={advancedValue}
                          onChange={(e) => setAdvancedValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && selectedColumn && advancedValue) {
                              const newFilter: AdvancedFilter = {
                                operator: advancedOperator,
                                value: advancedValue,
                                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                              };
                              onAdvancedFilterChange(selectedColumn, newFilter, 'add');
                              setAdvancedValue("");
                            }
                          }}
                          className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedColumn && advancedValue) {
                          const newFilter: AdvancedFilter = {
                            operator: advancedOperator,
                            value: advancedValue,
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                          };
                          onAdvancedFilterChange(selectedColumn, newFilter, 'add');
                          setAdvancedValue("");
                        }
                      }}
                      disabled={!advancedValue}
                      className={`w-full mt-2 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        advancedValue
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                          : 'bg-gray-200 dark:bg-[#333] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Add Filter
                    </button>
                  </div>
                )}

                {/* Quick Filter by Value */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-[#262626] flex-shrink-0">
                  <div className="relative">
                    <svg className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={`Search values in "${selectedColumn}"...`}
                      value={valueSearch}
                      onChange={(e) => setValueSearch(e.target.value)}
                      className="w-full pl-8 sm:pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
                    />
                  </div>
                  <div className="mt-1 text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
                    {uniqueValues.length} unique values • {searchedValues.length} shown
                  </div>
                </div>

                {/* Value List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {searchedValues.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      {valueSearch ? "No matching values" : "No values"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {searchedValues.map((value, idx) => {
                        const isActive = columnFilters.some(f => String(f) === String(value));
                        return (
                          <button
                            key={idx}
                            onClick={() => onFilterChange(selectedColumn, value)}
                            className={`text-left px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 ${
                              isActive
                                ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white ring-1 ring-gray-300 dark:ring-[#444]'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#262626]'
                            }`}
                          >
                            <span className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              isActive ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white' : 'border-gray-300 dark:border-[#444]'
                            }`}>
                              {isActive && (
                                <svg className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate flex-1">{formatCellValue(value)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 sm:h-full text-xs sm:text-sm text-gray-400">
                Select a column to filter
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{filteredRows.length}</span>/{rows.length} rows
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
