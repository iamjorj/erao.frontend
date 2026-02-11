"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  auth,
  api,
  ApiError,
  User,
  Conversation,
  Message,
  DatabaseConnection,
  CreateDatabaseConnectionPayload,
  QueryResult,
  FileDocument,
  SchemaResponse,
  TableSchema,
  FileType,
  DatabaseType,
  isAssistantMessage,
  getFileTypeName,
  getDatabaseTypeName,
  isCompleted,
  isFailed,
  isProcessing,
  getTierName,
} from "@/lib/api";
import { DataChart, ChartType, detectChartType, ChartSettings, defaultChartSettings } from "@/components/DataChart";
import { DataViewerModal } from "@/components/DataViewerModal";
import { MarkdownResponse } from "@/components/MarkdownResponse";
import { useVirtualizer } from "@tanstack/react-virtual";

// Helper to strip SQL/JSON code blocks and query result blocks from AI response text
function stripCodeBlocks(content: string): string {
  return content
    .replace(/```sql[\s\S]*?```/gi, "") // Remove SQL code blocks
    .replace(/```json[\s\S]*?```/gi, "") // Remove JSON code blocks
    .replace(/```[\s\S]*?```/g, "") // Remove any other code blocks
    .replace(/\[Query Result:[\s\S]*$/gi, "") // Remove [Query Result: to end of string
    .replace(/\[DATA_CONTEXT:[\s\S]*?\]/gi, "") // Remove [DATA_CONTEXT: ...] tags (including multiline)
    .replace(/\[DATA_CONTEXT:[^\]]*$/gi, "") // Remove unclosed [DATA_CONTEXT: to end
    .replace(/[{,]\s*"?(columns|rows|rowCount|executionTimeMs)"?\s*[:\[][\s\S]*$/gi, "") // Remove partial JSON results (require JSON structure)
    .replace(/\{"columns":\[[\s\S]*$/gi, "") // Remove JSON starting with columns
    .replace(/\n\|[^\n]*\|(\n\|[^\n]*\|)*/g, "") // Remove markdown tables
    .replace(/\(Query returned[^)\n]*\)?/gi, "") // Remove "(Query returned...)" text
    // Remove hanging phrases that reference removed SQL blocks
    .replace(/(?:here(?:'s| is) the (?:sql |updated )?query[:\.]?|let(?:'s| me) (?:proceed|execute|run)[^.\n]*[:\.]?|i'?ll (?:run|execute|check|query)[^.\n]*[:\.]?|let's see the results[!.]?)/gi, "")
    .replace(/\n{3,}/g, "\n\n") // Clean up extra newlines
    .trim();
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  return str === "null" ? "-" : str;
}

// Helper to convert array rows to object rows
function normalizeRows(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  if (!rows || rows.length === 0) return [];

  // Check if rows are already objects
  if (rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
    return rows as Record<string, unknown>[];
  }

  // Convert array rows to object rows
  return rows.map(row => {
    if (Array.isArray(row)) {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    }
    return row as Record<string, unknown>;
  });
}

// Helper to safely parse queryResult (can be string, object, or null)
// Returns array of QueryResult for multi-table support
function parseQueryResult(queryResult: QueryResult | string | null): QueryResult[] | null {
  if (!queryResult) return null;

  let parsed: unknown = queryResult;
  if (typeof queryResult === "string") {
    try {
      parsed = JSON.parse(queryResult);
    } catch {
      return null;
    }
  }

  // Check for multi-table format: { tables: [...] }
  if (parsed && typeof parsed === "object" && "tables" in parsed) {
    const tablesData = (parsed as { tables: unknown[] }).tables;
    if (Array.isArray(tablesData)) {
      const results: QueryResult[] = [];
      for (const table of tablesData) {
        if (table && typeof table === "object" && "rows" in table && "columns" in table) {
          const t = table as { columns: string[]; rows: unknown[] };
          results.push({
            ...t,
            rows: normalizeRows(t.columns, t.rows),
          } as QueryResult);
        }
      }
      return results.length > 0 ? results : null;
    }
  }

  // Single table format
  if (parsed && typeof parsed === "object" && "rows" in parsed && "columns" in parsed) {
    const p = parsed as { columns: string[]; rows: unknown[] };
    return [{
      ...p,
      rows: normalizeRows(p.columns, p.rows),
    } as QueryResult];
  }

  return null;
}

// Helper to detect requested chart type from user message
function detectRequestedChartType(message: string): ChartType | null {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("bar chart") || lowerMessage.includes("bar graph")) {
    return "bar";
  }
  if (lowerMessage.includes("line chart") || lowerMessage.includes("line graph")) {
    return "line";
  }
  if (lowerMessage.includes("pie chart") || lowerMessage.includes("pie graph")) {
    return "pie";
  }
  if (lowerMessage.includes("area chart") || lowerMessage.includes("area graph")) {
    return "area";
  }
  return null;
}

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// Filter Modal Component - single modal for filtering all columns with value search and export
type FilterOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'not_equals';

interface AdvancedFilter {
  operator: FilterOperator;
  value: string;
  id: string; // unique identifier for stacking multiple filters
}

function FilterModal({
  columns,
  rows,
  filters,
  advancedFilters,
  onFilterChange,
  onAdvancedFilterChange,
  onClearFilters,
  onClose,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  filters: Record<string, unknown[]>;
  advancedFilters?: Record<string, AdvancedFilter[]>;
  onFilterChange: (column: string, value: unknown) => void;
  onAdvancedFilterChange?: (column: string, filter: AdvancedFilter | null, action?: 'add' | 'remove') => void;
  onClearFilters: () => void;
  onClose: () => void;
}) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(columns[0] || null);
  const [advancedOperator, setAdvancedOperator] = useState<FilterOperator>('contains');
  const [advancedValue, setAdvancedValue] = useState("");
  const [operatorDropdownOpen, setOperatorDropdownOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const operators: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
  ];

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Handle column selection
  const handleColumnSelect = useCallback((col: string) => {
    setSelectedColumn(col);
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

  // Get filtered rows based on current filters (both simple and advanced)
  const filteredRows = useMemo(() => {
    const hasSimpleFilters = Object.keys(filters).length > 0;
    const hasAdvancedFilters = advancedFilters && Object.keys(advancedFilters).some(col => advancedFilters[col]?.length > 0);

    if (!hasSimpleFilters && !hasAdvancedFilters) return rows;

    return rows.filter(row => {
      // Apply simple filters (exact value match)
      for (const [col, values] of Object.entries(filters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }

      // Apply advanced filters (all filters for each column must match - AND logic)
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

  // Count active filters (simple + advanced)
  const simpleFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);
  const advancedFilterCount = advancedFilters
    ? Object.values(advancedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;
  const activeFilterCount = simpleFilterCount + advancedFilterCount;

  // Export filtered data as CSV
  const handleExport = useCallback(() => {
    const csvHeaders = columns.join(",");
    const csvRows = filteredRows.map(row =>
      columns.map(col => {
        const val = row[col];
        const str = val === null || val === undefined ? "" : String(val);
        // Escape quotes and wrap in quotes if contains comma or quote
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
    link.download = `filtered_data_${new Date().toISOString().slice(0,10)}.csv`;
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
          <div className="px-3 sm:px-4 py-2 border-b border-gray-100 dark:border-[#262626] bg-gray-50/50 dark:bg-[#0f0f0f] max-h-20 sm:max-h-24 overflow-y-auto">
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
            </div>
          </div>
        )}

        {/* Two Column Layout - stacks on mobile */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Column Selector - Left Panel (horizontal scroll on mobile) */}
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
              <div className="flex-1 overflow-y-auto">
                {/* Advanced Filter Mode */}
                <div className="p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Operator */}
                    <div className="relative flex-1 sm:flex-none sm:w-40">
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Operator</label>
                      <button
                        onClick={() => setOperatorDropdownOpen(!operatorDropdownOpen)}
                        className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-[#444] transition-colors"
                      >
                        <span>{operators.find(o => o.value === advancedOperator)?.label}</span>
                        <svg className={`w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400 transition-transform ${operatorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {operatorDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
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
                    </div>
                    {/* Value */}
                    <div className="flex-1">
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Value</label>
                      <input
                        type="text"
                        placeholder="Enter value..."
                        value={advancedValue}
                        onChange={(e) => setAdvancedValue(e.target.value)}
                        className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedColumn && advancedValue && onAdvancedFilterChange) {
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
                    className={`w-full py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                      advancedValue
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                        : 'bg-gray-200 dark:bg-[#333] text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Add Filter
                  </button>

                  {/* Active Filters List */}
                  {advancedFilters && advancedFilters[selectedColumn] && advancedFilters[selectedColumn].length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-[#333] space-y-1.5">
                      <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Active Filters ({advancedFilters[selectedColumn].length})
                      </div>
                      {advancedFilters[selectedColumn].map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-[#1a1a1a] rounded-md text-[10px] sm:text-xs"
                        >
                          <span className="text-gray-600 dark:text-gray-300 truncate flex-1 mr-2">
                            {operators.find(o => o.value === filter.operator)?.label} &quot;{filter.value}&quot;
                          </span>
                          <button
                            onClick={() => onAdvancedFilterChange?.(selectedColumn, filter, 'remove')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                          >
                            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
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
            className="px-4 sm:px-4 py-1.5 sm:py-1.5 text-xs sm:text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Virtual Table Component for handling large datasets
function VirtualTable({
  columns,
  rows,
  filters = {},
  advancedFilters,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  filters?: Record<string, unknown[]>;
  advancedFilters?: Record<string, AdvancedFilter[]>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply advanced filter logic
  const applyAdvancedFilter = useCallback((value: unknown, filter: AdvancedFilter): boolean => {
    const strValue = String(value ?? '').toLowerCase();
    const filterValue = filter.value.toLowerCase();
    const numValue = Number(value);
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

  // Apply filters to rows (both simple and advanced)
  const filteredRows = useMemo(() => {
    const hasSimpleFilters = filters && Object.keys(filters).length > 0;
    const hasAdvancedFilters = advancedFilters && Object.keys(advancedFilters).some(col => advancedFilters[col]?.length > 0);

    if (!hasSimpleFilters && !hasAdvancedFilters) return rows;

    return rows.filter(row => {
      // Apply simple filters (exact value match)
      if (hasSimpleFilters) {
        for (const [col, values] of Object.entries(filters)) {
          if (values && values.length > 0) {
            const rowValue = String(row[col]);
            if (!values.some(v => String(v) === rowValue)) {
              return false;
            }
          }
        }
      }

      // Apply advanced filters (all filters for each column must match - AND logic)
      if (hasAdvancedFilters && advancedFilters) {
        for (const [col, filterArray] of Object.entries(advancedFilters)) {
          if (filterArray && filterArray.length > 0) {
            // All filters for this column must pass
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

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  // Calculate minimum width based on actual content: row# + columns + gaps + padding
  const colWidth = 120;
  const rowNumWidth = 48; // w-12
  const gap = 10; // gap-2.5
  const padding = 24; // px-3 both sides
  const minTableWidth = Math.max(
    rowNumWidth + columns.length * colWidth + columns.length * gap + padding,
    400
  );

  // Check if any filters are active (simple + advanced)
  const simpleFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);
  const advancedFilterCount = advancedFilters
    ? Object.values(advancedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;
  const hasActiveFilters = simpleFilterCount > 0 || advancedFilterCount > 0;
  const activeFilterCount = simpleFilterCount + advancedFilterCount;

  return (
    <div className="p-1 overflow-hidden">
      {/* Scroll container - handles both horizontal and vertical scroll */}
      <div
        ref={parentRef}
        className="max-h-[400px] overflow-auto custom-scrollbar"
      >
        {/* Inner container with minimum width for horizontal scroll */}
        <div style={{ minWidth: `${minTableWidth}px` }}>
          {/* Table Header - sticky top, scrolls horizontally with data */}
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 bg-[#fafafc] dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#262626] sticky top-0 z-10"
          >
            <span className="w-12 text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">#</span>
            {columns.map((col) => (
              <span
                key={col}
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-shrink-0"
                style={{ width: colWidth }}
                title={col}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Virtual rows container */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = filteredRows[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className={`flex items-center gap-2.5 px-3 py-2.5 absolute w-full ${
                    virtualRow.index % 2 === 0 ? "bg-white dark:bg-[#111111]" : "bg-gray-50/50 dark:bg-[#1a1a1a]"
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <span className="w-12 text-xs text-gray-400 flex-shrink-0">
                    {virtualRow.index + 1}
                  </span>
                  {columns.map((col) => (
                    <span
                      key={col}
                      className={`text-sm truncate flex-shrink-0 ${row[col] === null || row[col] === undefined ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}
                      style={{ width: colWidth }}
                      title={formatCellValue(row[col])}
                    >
                      {formatCellValue(row[col])}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row count indicator */}
      <div className="text-xs text-gray-400 text-center py-2 border-t border-gray-100 dark:border-[#262626]">
        {hasActiveFilters ? (
          <>
            Showing {filteredRows.length} of {rows.length} rows
            <span className="text-gray-500 dark:text-gray-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active)</span>
          </>
        ) : (
          `${rows.length} rows total`
        )}
      </div>
    </div>
  );
}

// Chart Settings Dropdown Component - shows relevant settings per chart type
function ChartSettingsDropdown({
  settings,
  onSettingsChange,
  onClose,
  chartType,
}: {
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  onClose: () => void;
  chartType: ChartType;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const colorThemes: { value: ChartSettings['colorTheme']; label: string }[] = [
    { value: 'colorful', label: 'Colorful' },
    { value: 'monochrome', label: 'Mono' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'purple', label: 'Purple' },
    { value: 'custom', label: 'Custom' },
  ];

  // Default custom colors
  const defaultCustomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Preset color palette organized by color groups (6 colors per row)
  const colorRows = [
    ['#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'],
    ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    ['#14532d', '#047857', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
    ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fecaca'],
    ['#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fef3c7'],
    ['#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'],
  ];

  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [addingNewColor, setAddingNewColor] = useState(false);

  // Determine which settings to show based on chart type
  const showYAxis = chartType === 'bar' || chartType === 'line' || chartType === 'area';
  const showBarWidth = chartType === 'bar';
  const showDataLabels = chartType !== 'pie'; // Pie has its own label logic
  const showGridLines = chartType !== 'pie';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 sm:hidden"
        onClick={onClose}
      />
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] shadow-lg overflow-y-auto custom-scrollbar
          inset-x-0 bottom-0 rounded-t-2xl p-4 pb-8 max-h-[75vh]
          sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4 sm:w-72 sm:max-h-[80vh]"
        onClick={(e) => {
          e.stopPropagation();
          // Close color picker when clicking elsewhere in the dropdown
          if (editingColorIndex !== null || addingNewColor) {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-color-picker]')) {
              setEditingColorIndex(null);
              setAddingNewColor(false);
            }
          }
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="space-y-4">
          {/* Chart type indicator */}
          <div className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-[#333] sticky top-0 bg-white dark:bg-[#1f1f1f] flex items-center justify-between">
            <span>{chartType} Chart Settings</span>
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Y-Axis Range - for bar, line, area */}
        {showYAxis && (
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Y-Axis Range</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Auto"
                value={settings.yAxisMin === 'auto' ? '' : settings.yAxisMin}
                onChange={(e) => {
                  const val = e.target.value;
                  onSettingsChange({
                    ...settings,
                    yAxisMin: val === '' ? 'auto' : Number(val) || 0,
                  });
                }}
                className="flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2a2a2a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
              />
              <span className="text-gray-400 text-xs sm:text-sm">to</span>
              <input
                type="text"
                placeholder="Auto"
                value={settings.yAxisMax === 'auto' ? '' : settings.yAxisMax}
                onChange={(e) => {
                  const val = e.target.value;
                  onSettingsChange({
                    ...settings,
                    yAxisMax: val === '' ? 'auto' : Number(val) || 0,
                  });
                }}
                className="flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2a2a2a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
              />
            </div>
          </div>
        )}

        {/* Bar Width - only for bar chart */}
        {showBarWidth && (
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">
              Bar Width: {settings.barWidth}%
            </label>
            <input
              type="range"
              min="20"
              max="100"
              value={settings.barWidth}
              onChange={(e) => onSettingsChange({ ...settings, barWidth: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-[#333] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
            />
          </div>
        )}

        {/* Data Labels Toggle - not for pie */}
        {showDataLabels && (
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Data Labels</label>
            <button
              onClick={() => onSettingsChange({ ...settings, showDataLabels: !settings.showDataLabels })}
              className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${
                settings.showDataLabels ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#444]'
              }`}
            >
              <div
                className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow-sm transform transition-transform ${
                  settings.showDataLabels ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0.5 bg-white'
                }`}
              />
            </button>
          </div>
        )}

        {/* Grid Lines Toggle - not for pie */}
        {showGridLines && (
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Grid Lines</label>
            <button
              onClick={() => onSettingsChange({ ...settings, showGridLines: !settings.showGridLines })}
              className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${
                settings.showGridLines ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#444]'
              }`}
            >
              <div
                className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow-sm transform transition-transform ${
                  settings.showGridLines ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0.5 bg-white'
                }`}
              />
            </button>
          </div>
        )}

        {/* Color Theme - for all chart types */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Color Theme</label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {colorThemes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => onSettingsChange({
                  ...settings,
                  colorTheme: theme.value,
                  customColors: theme.value === 'custom' && !settings.customColors?.length
                    ? defaultCustomColors
                    : settings.customColors
                })}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg transition-colors ${
                  settings.colorTheme === theme.value
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
          {/* Custom Color Pickers */}
          {settings.colorTheme === 'custom' && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {(settings.customColors || defaultCustomColors).map((color, index) => (
                <div key={index} className="relative group" data-color-picker>
                  <button
                    onClick={() => {
                      setAddingNewColor(false);
                      setEditingColorIndex(editingColorIndex === index ? null : index);
                    }}
                    className={`w-8 h-8 rounded-lg cursor-pointer transition-all ${
                      editingColorIndex === index
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f]'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                  {/* Remove button */}
                  {(settings.customColors || defaultCustomColors).length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newColors = [...(settings.customColors || defaultCustomColors)];
                        newColors.splice(index, 1);
                        onSettingsChange({ ...settings, customColors: newColors });
                        if (editingColorIndex === index) setEditingColorIndex(null);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {/* Color Picker Dropdown */}
                  {editingColorIndex === index && (
                    <div
                      className="fixed z-[9999] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-3"
                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Pick a color</div>
                      <div className="space-y-1.5">
                        {colorRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="flex justify-center gap-1.5">
                            {row.map((paletteColor, pIndex) => (
                              <button
                                key={pIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newColors = [...(settings.customColors || defaultCustomColors)];
                                  newColors[index] = paletteColor;
                                  onSettingsChange({ ...settings, customColors: newColors });
                                  setEditingColorIndex(null);
                                }}
                                className={`w-6 h-6 rounded-md cursor-pointer hover:scale-110 transition-transform ${
                                  color === paletteColor ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#1f1f1f]' : ''
                                }`}
                                style={{ backgroundColor: paletteColor }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setEditingColorIndex(null)}
                        className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 py-1 border-t border-[#333]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(settings.customColors || defaultCustomColors).length < 8 && (
                <div className="relative" data-color-picker>
                  <button
                    onClick={() => {
                      setEditingColorIndex(null);
                      setAddingNewColor(!addingNewColor);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
                      addingNewColor
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f] border-gray-400'
                        : 'border-[#444] text-gray-500 hover:border-gray-400 hover:text-gray-400'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {/* Add New Color Picker */}
                  {addingNewColor && (
                    <div
                      className="fixed z-[9999] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-3"
                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Add a color</div>
                      <div className="space-y-1.5">
                        {colorRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="flex justify-center gap-1.5">
                            {row.map((paletteColor, pIndex) => (
                              <button
                                key={pIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newColors = [...(settings.customColors || defaultCustomColors), paletteColor];
                                  onSettingsChange({ ...settings, customColors: newColors });
                                  setAddingNewColor(false);
                                }}
                                className="w-6 h-6 rounded-md cursor-pointer hover:scale-110 transition-transform"
                                style={{ backgroundColor: paletteColor }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setAddingNewColor(false)}
                        className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 py-1 border-t border-[#333]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend Position - for all chart types */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Legend</label>
          <div className="flex gap-1.5 sm:gap-2">
            {(['top', 'bottom', 'hidden'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => onSettingsChange({ ...settings, legendPosition: pos })}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg capitalize transition-colors ${
                  settings.legendPosition === pos
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => onSettingsChange(defaultChartSettings)}
          className="w-full text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 border-t border-gray-100 dark:border-[#333] mt-3"
        >
          Reset to defaults
        </button>
      </div>
    </div>
    </>
  );
}

export default function AIPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const initialConversationIdRef = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("selectedConversationId") : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Persist selected conversation to localStorage
  useEffect(() => {
    if (selectedConversationId) {
      localStorage.setItem("selectedConversationId", selectedConversationId);
    }
  }, [selectedConversationId]);

  // Database connections state
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showAddDatabaseModal, setShowAddDatabaseModal] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaViewDatabaseId, setSchemaViewDatabaseId] = useState<string | null>(null);

  // File state
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat input state
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Loading phase indicator
  const [currentPhase, setCurrentPhase] = useState<"writing" | "executing" | null>(null);
  const phaseTimeoutsRef = useRef<{ writing?: NodeJS.Timeout; executing?: NodeJS.Timeout }>({});

  // Track pending request's conversation ID to handle background completion
  const pendingConversationRef = useRef<string | null>(null);

  // Track current selected conversation (for async callbacks)
  const selectedConversationIdRef = useRef<string | null>(null);

  // Track all conversations with pending requests (for UI indicator)
  const [pendingConversations, setPendingConversations] = useState<Set<string>>(new Set());

  // Track pending message info per conversation (message content and phase)
  const pendingMessagesRef = useRef<Map<string, { message: string; phase: "writing" | "executing" | null }>>(new Map());

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [showUsageLimitAlert, setShowUsageLimitAlert] = useState(false);

  // Account menu state
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rename conversation state
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Chat menu state
  const [chatMenuOpen, setChatMenuOpen] = useState<string | null>(null);
  const [chatMenuOpenUp, setChatMenuOpenUp] = useState(false);
  const [chatMenuPos, setChatMenuPos] = useState<{ top: number; left: number } | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'conversation' | 'database';
    id: string;
    name: string;
  } | null>(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile sidebar open state (for overlay on mobile)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Chart view state - tracks view mode per message
  const [chartViews, setChartViews] = useState<Record<string, ChartType>>({});
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());

  // Quick Filters state - tracks active filters per table view (keyed by viewKey)
  // Format: { [viewKey]: { [columnName]: filterValue[] } }
  const [tableFilters, setTableFilters] = useState<Record<string, Record<string, unknown[]>>>({});

  // Advanced filters state - tracks operator-based filters (stacked - multiple per column)
  // Format: { [viewKey]: { [columnName]: [{ operator, value, id }] } }
  const [advancedTableFilters, setAdvancedTableFilters] = useState<Record<string, Record<string, AdvancedFilter[]>>>({});

  // Filter handlers for Quick Filters
  const handleFilterChange = useCallback((viewKey: string, column: string, value: unknown) => {
    setTableFilters(prev => {
      const viewFilters = prev[viewKey] || {};
      const columnFilters = viewFilters[column] || [];

      // Toggle filter value - if exists remove it, otherwise add it
      const valueStr = String(value);
      const exists = columnFilters.some(v => String(v) === valueStr);

      const newColumnFilters = exists
        ? columnFilters.filter(v => String(v) !== valueStr)
        : [...columnFilters, value];

      // Remove empty arrays to keep state clean
      const newViewFilters = { ...viewFilters };
      if (newColumnFilters.length === 0) {
        delete newViewFilters[column];
      } else {
        newViewFilters[column] = newColumnFilters;
      }

      // Remove empty view filters
      if (Object.keys(newViewFilters).length === 0) {
        const { [viewKey]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [viewKey]: newViewFilters };
    });
  }, []);

  const handleClearFilters = useCallback((viewKey: string) => {
    setTableFilters(prev => {
      const { [viewKey]: _, ...rest } = prev;
      return rest;
    });
    setAdvancedTableFilters(prev => {
      const { [viewKey]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleAdvancedFilterChange = useCallback((viewKey: string, column: string, filter: AdvancedFilter | null, action?: 'add' | 'remove') => {
    setAdvancedTableFilters(prev => {
      const viewFilters = prev[viewKey] || {};
      const columnFilters = viewFilters[column] || [];

      if (action === 'remove' && filter) {
        // Remove specific filter by id
        const newColumnFilters = columnFilters.filter(f => f.id !== filter.id);

        if (newColumnFilters.length === 0) {
          const { [column]: _, ...restCols } = viewFilters;
          if (Object.keys(restCols).length === 0) {
            const { [viewKey]: __, ...restViews } = prev;
            return restViews;
          }
          return { ...prev, [viewKey]: restCols };
        }
        return { ...prev, [viewKey]: { ...viewFilters, [column]: newColumnFilters } };
      }

      if (filter === null) {
        // Clear all filters for this column
        const { [column]: _, ...restCols } = viewFilters;
        if (Object.keys(restCols).length === 0) {
          const { [viewKey]: __, ...restViews } = prev;
          return restViews;
        }
        return { ...prev, [viewKey]: restCols };
      }

      // Add the filter to the array (stack)
      return { ...prev, [viewKey]: { ...viewFilters, [column]: [...columnFilters, filter] } };
    });
  }, []);

  // Helper function to get filtered rows for a viewKey
  const getFilteredRows = useCallback((
    rows: Record<string, unknown>[],
    viewKey: string
  ): Record<string, unknown>[] => {
    const simpleFilters = tableFilters[viewKey] || {};
    const advancedFilters = advancedTableFilters[viewKey] || {};

    const hasSimpleFilters = Object.keys(simpleFilters).length > 0;
    const hasAdvancedFilters = Object.keys(advancedFilters).some(col => advancedFilters[col]?.length > 0);

    if (!hasSimpleFilters && !hasAdvancedFilters) return rows;

    return rows.filter(row => {
      // Apply simple filters (exact value match)
      for (const [col, values] of Object.entries(simpleFilters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }

      // Apply advanced filters (all filters for each column must match - AND logic)
      for (const [col, filterArray] of Object.entries(advancedFilters)) {
        if (filterArray && filterArray.length > 0) {
          for (const filter of filterArray) {
            if (filter && filter.value) {
              const strValue = String(row[col] ?? '').toLowerCase();
              const filterValue = filter.value.toLowerCase();
              const numValue = Number(row[col]);
              const numFilterValue = Number(filter.value);

              let matches = true;
              switch (filter.operator) {
                case 'equals':
                  matches = strValue === filterValue;
                  break;
                case 'not_equals':
                  matches = strValue !== filterValue;
                  break;
                case 'contains':
                  matches = strValue.includes(filterValue);
                  break;
                case 'starts_with':
                  matches = strValue.startsWith(filterValue);
                  break;
                case 'ends_with':
                  matches = strValue.endsWith(filterValue);
                  break;
                case 'greater_than':
                  matches = !isNaN(numValue) && !isNaN(numFilterValue) && numValue > numFilterValue;
                  break;
                case 'less_than':
                  matches = !isNaN(numValue) && !isNaN(numFilterValue) && numValue < numFilterValue;
                  break;
              }
              if (!matches) return false;
            }
          }
        }
      }

      return true;
    });
  }, [tableFilters, advancedTableFilters]);

  // Chart settings state with localStorage persistence
  const [chartSettings, setChartSettings] = useState<ChartSettings>(defaultChartSettings);
  const [showChartSettings, setShowChartSettings] = useState<string | null>(null); // viewKey of open settings dropdown
  const [showFilterModal, setShowFilterModal] = useState<string | null>(null); // viewKey of open filter modal

  // Load chart settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chartSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChartSettings({ ...defaultChartSettings, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  // Save chart settings to localStorage
  useEffect(() => {
    localStorage.setItem("chartSettings", JSON.stringify(chartSettings));
  }, [chartSettings]);

  // Fullscreen data viewer state
  const [dataViewerOpen, setDataViewerOpen] = useState<string | null>(null);
  const [dataViewerData, setDataViewerData] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    chartType: ChartType;
    sqlQuery?: string;
    viewKey: string;
  } | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep selectedConversationIdRef in sync with state (for async callbacks)
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Close chat menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => { setChatMenuOpen(null); setChatMenuPos(null); };
    if (chatMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [chatMenuOpen]);


  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAccountMenu]);

  // Close search modal on Esc key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showSearchModal) {
        setShowSearchModal(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSearchModal]);

  // Dark mode effect - sync with localStorage and apply class
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  // Check auth and load initial data
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const currentUser = auth.getUser();
    setUser(currentUser);
    setIsLoading(false);

    // Load conversations, databases, and files
    loadConversations();
    loadDatabases();
    loadFiles();
  }, [router]);

  // Refresh conversations list only - no auto-selection logic
  // Use this after sending messages or other updates
  const refreshConversations = async () => {
    try {
      const response = await api.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error("Failed to refresh conversations:", err);
    }
  };

  // Full load with auto-selection - only for initial load
  const loadConversations = async () => {
    try {
      // Set loading state for chat area immediately if we have a saved conversation
      const savedId = initialConversationIdRef.current;
      if (savedId) {
        setSelectedConversationId(savedId);
        setLoadingMessages(true);
      }

      const response = await api.getConversations();
      if (response.success) {
        setConversations(response.data);

        const savedExists = savedId && response.data.some(c => c.id === savedId);

        if (savedExists && savedId) {
          // Load messages for saved conversation
          try {
            const convResponse = await api.getConversation(savedId);
            if (convResponse.success) {
              setMessages(convResponse.data.messages);
              if (convResponse.data.databaseConnectionId) {
                setSelectedDatabaseId(convResponse.data.databaseConnectionId);
                setSelectedFileId(null);
              } else if (convResponse.data.fileDocumentId) {
                setSelectedFileId(convResponse.data.fileDocumentId);
                setSelectedDatabaseId(null);
              }
            }
          } catch {
            console.error("Failed to load saved conversation");
          } finally {
            setLoadingMessages(false);
          }
        } else if (response.data.length > 0) {
          // Clear invalid saved ID and select first
          if (savedId) {
            localStorage.removeItem("selectedConversationId");
          }
          await selectConversation(response.data[0].id);
        } else {
          // No conversations exist - clear loading state
          setLoadingMessages(false);
          if (savedId) {
            localStorage.removeItem("selectedConversationId");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
      setInitialLoadComplete(true);
    }
  };

  const loadDatabases = async () => {
    try {
      const response = await api.getDatabases();
      if (response.success) {
        setDatabases(response.data);
        // Auto-select first active database
        const activeDb = response.data.find((db) => db.isActive);
        if (activeDb) {
          setSelectedDatabaseId(activeDb.id);
        }
      }
    } catch (err) {
      console.error("Failed to load databases:", err);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await api.getFiles();
      // Handle both wrapped { success, data } and direct { files } response formats
      if ('success' in response && response.success && response.data) {
        setFiles(response.data.files);
      } else if ('files' in response) {
        // Direct response format from backend
        setFiles((response as unknown as { files: FileDocument[] }).files);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setError(null);

    try {
      const response = await api.uploadFile(file);
      if (response.success && response.file) {
        setFiles((prev) => [response.file!, ...prev]);
        setSelectedFileId(response.file.id);
        // Clear database and conversation when file is uploaded
        setSelectedDatabaseId(null);
        setSelectedConversationId(null);
        setMessages([]);
      } else {
        setError(response.message || "Failed to upload file");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      setIsUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string | number) => {
    const typeName = typeof fileType === 'number' ? getFileTypeName(fileType as FileType) : fileType;
    switch (typeName) {
      case "Excel":
        return (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.17 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7.83L14.17 2zM13 8V3.5L18.5 9H13V8zM6 20V4h5v6h7v10H6z"/>
            <path d="M8.5 11L10.5 14L8.5 17H10L11.25 15L12.5 17H14L12 14L14 11H12.5L11.25 13L10 11H8.5z"/>
          </svg>
        );
      case "Word":
        return (
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            <path d="M8 12h1.5l1 4 1-4h1l1 4 1-4H15l-1.5 6h-1l-1-4-1 4h-1L8 12z"/>
          </svg>
        );
      case "Csv":
        return (
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            <path d="M8 12v6h8v-6H8zm2 2h4v2h-4v-2z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const selectConversation = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setMessages([]); // Clear old messages immediately so spinner doesn't overlap
    setLoadingMessages(true);
    setError(null);
    // Reset sending state when switching conversations
    setIsSending(false);
    setCurrentPhase(null);
    // Clear any pending phase timers
    if (phaseTimeoutsRef.current.writing) clearTimeout(phaseTimeoutsRef.current.writing);
    if (phaseTimeoutsRef.current.executing) clearTimeout(phaseTimeoutsRef.current.executing);
    phaseTimeoutsRef.current = {};
    // Update pending ref to new conversation - callbacks from old requests will see the mismatch
    pendingConversationRef.current = conversationId;

    try {
      const response = await api.getConversation(conversationId);
      if (response.success) {
        setMessages(response.data.messages);
        // Set the appropriate data source (database or file)
        if (response.data.databaseConnectionId) {
          setSelectedDatabaseId(response.data.databaseConnectionId);
          setSelectedFileId(null);
        } else if (response.data.fileDocumentId) {
          setSelectedFileId(response.data.fileDocumentId);
          setSelectedDatabaseId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setError("Failed to load conversation");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const createNewConversation = async () => {
    // Need either a database or file selected
    if (!selectedDatabaseId && !selectedFileId) {
      setShowDatabaseModal(true);
      return;
    }

    try {
      const response = await api.createConversation({
        databaseConnectionId: selectedDatabaseId || undefined,
        fileDocumentId: selectedFileId || undefined,
      });
      if (response.success) {
        setConversations((prev) => [response.data, ...prev]);
        setSelectedConversationId(response.data.id);
        setMessages([]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);
    setError(null);

    // Need either a database or file selected
    if (!selectedDatabaseId && !selectedFileId) {
      setShowDatabaseModal(true);
      setIsSending(false);
      setInputValue(messageContent);
      return;
    }

    // Add user message optimistically IMMEDIATELY (before any API calls)
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "User",
      content: messageContent,
      sqlQuery: null,
      queryResult: null,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // If no conversation selected, create one first
    let conversationId = selectedConversationId;
    if (!conversationId) {
      try {
        const convResponse = await api.createConversation({
          databaseConnectionId: selectedDatabaseId || undefined,
          fileDocumentId: selectedFileId || undefined,
        });
        if (convResponse.success) {
          conversationId = convResponse.data.id;
          setConversations((prev) => [convResponse.data, ...prev]);
          setSelectedConversationId(conversationId);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        }
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        setIsSending(false);
        setInputValue(messageContent);
        return;
      }
    }

    // Track which conversation this request is for
    const requestConversationId = conversationId!;
    pendingConversationRef.current = requestConversationId;

    // Add to pending conversations set (for UI indicator in sidebar)
    setPendingConversations(prev => new Set(prev).add(requestConversationId));

    // Store pending message info for this conversation
    pendingMessagesRef.current.set(requestConversationId, { message: messageContent, phase: null });

    try {
      // Fake phases - show "writing" after 500ms, "executing" after 2s
      phaseTimeoutsRef.current.writing = setTimeout(() => {
        setCurrentPhase("writing");
        // Update phase in pending messages ref
        const pending = pendingMessagesRef.current.get(requestConversationId);
        if (pending) pendingMessagesRef.current.set(requestConversationId, { ...pending, phase: "writing" });
      }, 500);
      phaseTimeoutsRef.current.executing = setTimeout(() => {
        setCurrentPhase("executing");
        // Update phase in pending messages ref
        const pending = pendingMessagesRef.current.get(requestConversationId);
        if (pending) pendingMessagesRef.current.set(requestConversationId, { ...pending, phase: "executing" });
      }, 2000);

      // Use REST API - this completes even if user switches away
      const response = await api.sendMessage({
        conversationId: requestConversationId,
        message: messageContent,
        executeQuery: true,
      });

      // Clear fake phase timers
      if (phaseTimeoutsRef.current.writing) clearTimeout(phaseTimeoutsRef.current.writing);
      if (phaseTimeoutsRef.current.executing) clearTimeout(phaseTimeoutsRef.current.executing);
      phaseTimeoutsRef.current = {};

      // Check if user is currently viewing the same conversation (using ref for accurate async check)
      const currentlyViewingConversation = selectedConversationIdRef.current === requestConversationId;

      // Clear pending ref if this was the tracked conversation
      if (pendingConversationRef.current === requestConversationId) {
        pendingConversationRef.current = null;
      }

      // Remove from pending conversations set and clean up pending message info
      setPendingConversations(prev => {
        const next = new Set(prev);
        next.delete(requestConversationId);
        return next;
      });
      pendingMessagesRef.current.delete(requestConversationId);

      if (response.success && currentlyViewingConversation) {
        // Reload messages from API to get fresh data
        // This handles both normal completion and when user switched away and back
        try {
          const convResponse = await api.getConversation(requestConversationId);
          if (convResponse.success) {
            setMessages(convResponse.data.messages);
          }
        } catch {
          // Fallback: try to update messages directly
          setMessages((prev) => {
            const filtered = prev.filter(m => m.id !== tempUserMessage.id);
            return [...filtered, response.data.userMessage, response.data.assistantMessage];
          });
        }

        // Check if user requested a specific chart type
        const requestedChartType = detectRequestedChartType(messageContent);
        if (requestedChartType && response.data.assistantMessage.queryResult) {
          setChartViews((prevViews) => ({
            ...prevViews,
            [response.data.assistantMessage.id]: requestedChartType,
          }));
        }
      }

      // Always refresh conversations to get updated title (even if switched away)
      refreshConversations();

      // Only update loading state if still on same conversation
      if (currentlyViewingConversation) {
        setCurrentPhase(null);
        setIsSending(false);
      }
    } catch (err) {
      // Clear fake phase timers on error too
      if (phaseTimeoutsRef.current.writing) clearTimeout(phaseTimeoutsRef.current.writing);
      if (phaseTimeoutsRef.current.executing) clearTimeout(phaseTimeoutsRef.current.executing);
      phaseTimeoutsRef.current = {};

      // Check if user is currently viewing the same conversation
      const currentlyViewingConversation = selectedConversationIdRef.current === requestConversationId;

      // Clear pending ref if this was the tracked conversation
      if (pendingConversationRef.current === requestConversationId) {
        pendingConversationRef.current = null;
      }

      // Remove from pending conversations set and clean up pending message info
      setPendingConversations(prev => {
        const next = new Set(prev);
        next.delete(requestConversationId);
        return next;
      });
      pendingMessagesRef.current.delete(requestConversationId);

      // Only update UI if still on same conversation
      if (currentlyViewingConversation) {
        // Reload messages to remove optimistic message
        try {
          const convResponse = await api.getConversation(requestConversationId);
          if (convResponse.success) {
            setMessages(convResponse.data.messages);
          }
        } catch {
          // Fallback: remove optimistic message
          setMessages((prev) => prev.filter((m) => m && m.id !== tempUserMessage.id));
        }
        setCurrentPhase(null);
        setIsSending(false);
        if (err instanceof ApiError) {
          const msg = err.message.toLowerCase();
          if (msg.includes("query limit") || msg.includes("usage limit") || msg.includes("limit reached")) {
            setShowUsageLimitAlert(true);
          } else {
            setError(err.message);
          }
        } else {
          setError("Failed to send message");
        }
        setInputValue(messageContent);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    auth.clearTokens();
    router.push("/login");
  };

  // Rename conversation handler
  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingConversationId(null);
      return;
    }
    try {
      const response = await api.updateConversation(conversationId, { title: newTitle.trim() });
      if (response.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title: newTitle.trim() } : c))
        );
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
    setEditingConversationId(null);
  };

  // Delete conversation handler
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await api.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
    setDeleteConfirm(null);
  };

  // Delete database handler
  const handleDeleteDatabase = async (databaseId: string) => {
    try {
      await api.deleteDatabase(databaseId);
      setDatabases((prev) => prev.filter((d) => d.id !== databaseId));
      if (selectedDatabaseId === databaseId) {
        setSelectedDatabaseId(null);
      }
    } catch (err) {
      console.error("Failed to delete database:", err);
    }
    setDeleteConfirm(null);
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );
  const selectedDatabase = databases.find((d) => d.id === selectedDatabaseId);
  const selectedFile = files.find((f) => f.id === selectedFileId);

  // Show loading only for auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const userInitial = user?.firstName?.[0]?.toUpperCase() || "U";

  return (
    <div className="h-dvh bg-gray-50 dark:bg-[#0a0a0a] flex transition-colors duration-200 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${sidebarCollapsed ? 'md:w-[60px]' : 'md:w-[260px]'}
        w-[280px]
        bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col justify-between border-r border-gray-200/60 dark:border-[#1a1a1a] transition-all duration-200
        fixed md:relative inset-y-0 left-0 z-50
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Top Section */}
        <div className="flex flex-col">
          {/* Header with Logo and Toggle */}
          <div className={`pt-3 pb-2 flex items-center px-3 justify-between ${sidebarCollapsed ? 'md:px-2.5 md:justify-center' : ''}`}>
            {/* Logo - always show on mobile, hide on desktop when collapsed */}
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
              <img src="/logo-dark.png" alt="Erao" className="w-9 h-9 dark:hidden" />
              <img src="/logo.png" alt="Erao" className="w-9 h-9 hidden dark:block" />
            </div>
            <div className="flex items-center gap-1">
              {/* Close button for mobile */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex w-9 h-9 items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg transition-colors"
                title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
              >
                {/* Sidebar toggle icon */}
                <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.857 3h6.286c1.084 0 1.958 0 2.666.058.729.06 1.369.185 1.961.487a5 5 0 0 1 2.185 2.185c.302.592.428 1.233.487 1.961.058.708.058 1.582.058 2.666v3.286c0 1.084 0 1.958-.058 2.666-.06.729-.185 1.369-.487 1.961a5 5 0 0 1-2.185 2.185c-.592.302-1.232.428-1.961.487C17.101 21 16.227 21 15.143 21H8.857c-1.084 0-1.958 0-2.666-.058-.728-.06-1.369-.185-1.961-.487a5 5 0 0 1-2.185-2.185c-.302-.592-.428-1.232-.487-1.961C1.5 15.601 1.5 14.727 1.5 13.643v-3.286c0-1.084 0-1.958.058-2.666.06-.728.185-1.369.487-1.961A5 5 0 0 1 4.23 3.545c.592-.302 1.233-.428 1.961-.487C6.9 3 7.773 3 8.857 3M6.354 5.051c-.605.05-.953.142-1.216.276a3 3 0 0 0-1.311 1.311c-.134.263-.226.611-.276 1.216-.05.617-.051 1.41-.051 2.546v3.2c0 1.137 0 1.929.051 2.546.05.605.142.953.276 1.216a3 3 0 0 0 1.311 1.311c.263.134.611.226 1.216.276.617.05 1.41.051 2.546.051h.6V5h-.6c-1.137 0-1.929 0-2.546.051M11.5 5v14h3.6c1.137 0 1.929 0 2.546-.051.605-.05.953-.142 1.216-.276a3 3 0 0 0 1.311-1.311c.134-.263.226-.611.276-1.216.05-.617.051-1.41.051-2.546v-3.2c0-1.137 0-1.929-.051-2.546-.05-.605-.142-.953-.276-1.216a3 3 0 0 0-1.311-1.311c-.263-.134-.611-.226-1.216-.276C17.029 5.001 16.236 5 15.1 5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Top Actions */}
          <div className={`pt-1 pb-1 flex flex-col gap-0.5 px-2 ${sidebarCollapsed ? 'md:px-2.5 md:items-center' : ''}`}>
            <button
              onClick={() => { createNewConversation(); setMobileSidebarOpen(false); }}
              className={`flex items-center text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg transition-colors w-full gap-2.5 px-2.5 py-2 ${
                sidebarCollapsed ? 'md:w-9 md:h-9 md:justify-center md:px-0 md:gap-0' : ''
              }`}
              title="New chat"
            >
              <svg className={`text-gray-500 dark:text-gray-400 flex-shrink-0 w-[18px] h-[18px] ${sidebarCollapsed ? 'md:w-5 md:h-5' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>New chat</span>
            </button>
            <button
              onClick={() => setShowSearchModal(true)}
              className={`flex items-center text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg transition-colors w-full gap-2.5 px-2.5 py-2 ${
                sidebarCollapsed ? 'md:w-9 md:h-9 md:justify-center md:px-0 md:gap-0' : ''
              }`}
              title="Search chats"
            >
              <svg className={`text-gray-500 dark:text-gray-400 flex-shrink-0 w-[18px] h-[18px] ${sidebarCollapsed ? 'md:w-5 md:h-5' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className={sidebarCollapsed ? 'md:hidden' : ''}>Search chats</span>
            </button>
          </div>

          {/* Section Header */}
          <div className={`px-4 pt-4 pb-1 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Your chats</span>
          </div>

          {/* Chat List */}
          <div ref={chatListRef} className={`flex flex-col gap-0.5 pb-2 overflow-y-auto custom-scrollbar px-2 max-h-[calc(100vh-280px)] ${sidebarCollapsed ? 'md:px-2.5 md:pt-3 md:max-h-[calc(100vh-200px)] md:items-center' : ''}`}>
            {loadingConversations ? (
              <div className={`text-center py-4 text-xs text-gray-400 dark:text-gray-500 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className={`text-center py-4 text-xs text-gray-400 dark:text-gray-500 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
                No conversations yet
              </div>
            ) : (
              conversations.map((chat) => (
                  /* Expanded view - full chat item */
                  <div
                    key={chat.id}
                    className={`group relative w-full text-left rounded-lg px-3 py-2 flex flex-col gap-0.5 cursor-pointer transition-colors ${sidebarCollapsed ? 'md:hidden' : ''} ${
                      chatMenuOpen === chat.id ? "z-50" : ""
                    } ${
                      chat.id === selectedConversationId
                        ? "bg-gray-200/70 dark:bg-white/10"
                        : "hover:bg-gray-100/70 dark:hover:bg-[#141414]"
                    }`}
                    onClick={() => {
                      if (editingConversationId !== chat.id) {
                        setChatMenuOpen(null);
                        selectConversation(chat.id);
                        setMobileSidebarOpen(false);
                      }
                    }}
                  >
                    {editingConversationId === chat.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameConversation(chat.id, editingTitle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameConversation(chat.id, editingTitle);
                          if (e.key === "Escape") setEditingConversationId(null);
                        }}
                        className="text-sm bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#262626] rounded px-2 py-0.5 w-full pr-6 dark:text-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 pr-6">
                        <span className="text-[13px] truncate text-gray-800 dark:text-gray-200">
                          {chat.title || "New Chat"}
                        </span>
                        {pendingConversations.has(chat.id) && (
                          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gray-500"></span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 pr-6">
                      {(chat.databaseConnectionName || chat.fileDocumentName) && (
                        <>
                          <span className="truncate max-w-[70px]">
                            {chat.databaseConnectionName || chat.fileDocumentName}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                        </>
                      )}
                      <span className="whitespace-nowrap">{formatRelativeTime(chat.updatedAt)}</span>
                    </div>
                      {/* More options button */}
                      {editingConversationId !== chat.id && (
                        <div className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${chatMenuOpen === chat.id ? "z-[100]" : ""}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chatMenuOpen === chat.id) {
                                setChatMenuOpen(null);
                                setChatMenuPos(null);
                              } else {
                                const button = e.currentTarget;
                                const buttonRect = button.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - buttonRect.bottom;
                                const openUp = spaceBelow < 100;
                                setChatMenuOpenUp(openUp);
                                setChatMenuPos({
                                  top: openUp ? buttonRect.top : buttonRect.bottom + 4,
                                  left: buttonRect.right - 128, // 128 = w-32 menu width
                                });
                                setChatMenuOpen(chat.id);
                              }
                            }}
                            className={`p-1 rounded transition-colors ${
                              chatMenuOpen === chat.id
                                ? "bg-gray-200 dark:bg-[#262626]"
                                : "opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#1a1a1a]"
                            }`}
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="6" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="18" r="2" />
                            </svg>
                          </button>
                          {/* Dropdown menu - rendered as fixed portal to avoid overflow clipping */}
                        </div>
                      )}
                  </div>
              ))
            )}
          </div>

          {/* Chat context menu - fixed position to avoid overflow clipping */}
          {chatMenuOpen && chatMenuPos && (
            <div
              className="fixed w-32 bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-[#262626] shadow-lg overflow-hidden z-[200]"
              style={{
                top: chatMenuOpenUp ? undefined : chatMenuPos.top,
                bottom: chatMenuOpenUp ? window.innerHeight - chatMenuPos.top + 4 : undefined,
                left: chatMenuPos.left,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const chatId = chatMenuOpen;
                  const chat = conversations.find(c => c.id === chatId);
                  setChatMenuOpen(null);
                  setChatMenuPos(null);
                  if (chat) {
                    setEditingConversationId(chat.id);
                    setEditingTitle(chat.title || "New Chat");
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const chatId = chatMenuOpen;
                  const chat = conversations.find(c => c.id === chatId);
                  setChatMenuOpen(null);
                  setChatMenuPos(null);
                  if (chat) {
                    setDeleteConfirm({
                      type: 'conversation',
                      id: chat.id,
                      name: chat.title || 'New Chat'
                    });
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className={`relative border-t border-gray-200/60 dark:border-[#1a1a1a] p-2 ${sidebarCollapsed ? 'md:p-2.5 md:flex md:justify-center' : ''}`}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className={`rounded-lg flex items-center hover:bg-gray-100/70 dark:hover:bg-[#141414] transition-colors w-full px-2.5 py-2 gap-2.5 ${
              sidebarCollapsed ? 'md:w-9 md:h-9 md:justify-center md:px-0 md:gap-0' : ''
            }`}
            title={sidebarCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
          >
            <div className={`bg-gray-800 dark:bg-[#262626] rounded-lg flex items-center justify-center flex-shrink-0 w-8 h-8 ${sidebarCollapsed ? 'md:w-9 md:h-9' : ''}`}>
              <span className="text-white text-xs font-medium">
                {userInitial}
              </span>
            </div>
            {/* User info - hidden on desktop when sidebar collapsed */}
            <div className={`flex-1 min-w-0 text-left ${sidebarCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-[13px] text-gray-800 dark:text-gray-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {getTierName(user?.subscriptionTier)}
              </p>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showAccountMenu ? "rotate-180" : ""} ${sidebarCollapsed ? 'md:hidden' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Account Menu Dropdown */}
          {showAccountMenu && (
            <div className={`absolute bottom-full mb-1.5 bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-[#262626] shadow-lg z-50 overflow-hidden left-2 right-2 ${
              sidebarCollapsed ? 'md:left-0 md:right-auto md:w-40' : ''
            }`}>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  router.push("/profile");
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  router.push("/usage");
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Usage
              </button>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  router.push("/subscriptions");
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscriptions
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors flex items-center gap-2.5"
              >
                {darkMode ? (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {darkMode ? "Light mode" : "Dark mode"}
              </button>
              <div className="border-t border-gray-100 dark:border-[#262626]" />
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden transition-colors duration-200 relative">
        {/* Header */}
        <header className="px-3 sm:px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-[#1a1a1a] z-10 bg-white dark:bg-[#0a0a0a] transition-colors duration-200 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141414] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
              {selectedConversation?.title || "New Chat"}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDatabaseModal(true)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedDatabase
                    ? "bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-[#141414]"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="hidden sm:inline">{selectedDatabase ? selectedDatabase.name : "Database"}</span>
                <span className="sm:hidden">{selectedDatabase ? "DB" : "DB"}</span>
              </button>
              <button
                onClick={() => setShowFilesModal(true)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedFile
                    ? "bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-[#141414]"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline truncate max-w-[100px]">{selectedFile ? selectedFile.originalFileName : "File"}</span>
                <span className="sm:hidden">File</span>
              </button>
            </div>
          </div>
          {/* Upload indicator */}
          {isUploadingFile && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-[#262626] border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
              Uploading...
            </div>
          )}
        </header>

        {/* Loading overlay - covers entire chat area with solid background */}
        {loadingMessages && (
          <div className="absolute inset-0 top-[49px] z-20 bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 dark:border-[#262626] border-t-gray-600 dark:border-t-gray-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 pt-4 sm:pt-5 pb-24 sm:pb-20 flex flex-col gap-4 sm:gap-5 custom-scrollbar">
          {messages.length === 0 ? null : (
            messages.filter((m) => m && m.role !== undefined && m.role !== null).map((message) => (
              <div key={message.id}>
                {isAssistantMessage(message.role) ? (
                  <div className="w-full sm:w-[85%] md:w-[70%] sm:max-w-[85%] md:max-w-[70%] bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Erao</span>
                    <MarkdownResponse content={stripCodeBlocks(message.content)} />
                    {(() => {
                      const parsedResults = parseQueryResult(message.queryResult);
                      if (!parsedResults || parsedResults.length === 0) return null;

                      // Multiple tables - show each with same UI as single table
                      if (parsedResults.length > 1) {
                        return (
                          <div className="space-y-4 mt-2">
                            {parsedResults.map((result, idx) => {
                              // Use title from result or derive from first column
                              const tableTitle = (result as QueryResult & { title?: string }).title ||
                                result.columns[0]?.replace(/_id$/i, '').replace(/_/g, ' ') ||
                                `Table ${idx + 1}`;
                              const capitalizedTitle = tableTitle.charAt(0).toUpperCase() + tableTitle.slice(1);

                              // Use composite key for chart view state
                              const viewKey = `${message.id}_${idx}`;
                              const currentView = chartViews[viewKey] || "table";

                              // Check if data is chartable
                              const hasNumericData = result.columns.some((col) =>
                                result.rows.some((row) => {
                                  const val = row[col];
                                  if (val === null || val === undefined || val === '') return false;
                                  if (typeof val === "number") return true;
                                  const numVal = Number(val);
                                  return !isNaN(numVal) && isFinite(numVal);
                                })
                              );

                              return (
                                <div key={idx} className="bg-[#fafafc] dark:bg-[#1a1a1a] rounded-xl overflow-hidden">
                                  {/* Title */}
                                  <div className="px-3 pt-2 pb-1">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{capitalizedTitle}</span>
                                  </div>
                                  {/* View Toggle Buttons */}
                                  <div className="flex items-center justify-between p-1.5 sm:p-2 border-b border-gray-200 dark:border-[#262626] gap-1 overflow-x-auto">
                                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                      <button
                                        onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "table" }))}
                                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                          currentView === "table"
                                            ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                            : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                        }`}
                                      >
                                        Table
                                      </button>
                                      {hasNumericData && result.rows.length > 1 && (
                                        <>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "bar" }))}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                              currentView === "bar"
                                                ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                                : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                            }`}
                                          >
                                            Bar
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "line" }))}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                              currentView === "line"
                                                ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                                : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                            }`}
                                          >
                                            Line
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "pie" }))}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                              currentView === "pie"
                                                ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                                : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                            }`}
                                          >
                                            Pie
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "area" }))}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                              currentView === "area"
                                                ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                                : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                            }`}
                                          >
                                            Area
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    {/* Toolbar: SQL, Filter, Settings, Expand */}
                                    <div className="flex items-center gap-1 flex-shrink-0 relative ml-3 pl-3 border-l border-gray-200 dark:border-[#333]">
                                      {/* SQL Button - only show on first table */}
                                      {idx === 0 && message.sqlQuery && (
                                        <button
                                          onClick={() => setExpandedSql(prev => {
                                            const next = new Set(prev);
                                            if (next.has(message.id)) next.delete(message.id);
                                            else next.add(message.id);
                                            return next;
                                          })}
                                          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                            expandedSql.has(message.id)
                                              ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-[#333]'
                                              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525]'
                                          }`}
                                          title={expandedSql.has(message.id) ? "Hide SQL" : "View SQL"}
                                        >
                                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                                            <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      )}
                                      {/* Filter Button - only for table view */}
                                      {currentView === "table" && (() => {
                                        const hasSimpleFilters = Object.values(tableFilters[viewKey] || {}).some(v => v?.length);
                                        const hasAdvancedFilters = Object.values(advancedTableFilters[viewKey] || {}).some(arr => arr?.length > 0);
                                        const hasAnyFilters = hasSimpleFilters || hasAdvancedFilters;
                                        return (
                                          <button
                                            onClick={() => setShowFilterModal(viewKey)}
                                            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                              hasAnyFilters
                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525]'
                                            }`}
                                            title="Filter data"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                          </button>
                                        );
                                      })()}
                                      {/* Settings Gear - only show when viewing charts */}
                                      {currentView !== "table" && (
                                        <button
                                          onClick={() => setShowChartSettings(showChartSettings === viewKey ? null : viewKey)}
                                          className="flex items-center justify-center w-7 h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors"
                                          title="Chart settings"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                        </button>
                                      )}
                                      {/* Settings Dropdown */}
                                      {showChartSettings === viewKey && (
                                        <ChartSettingsDropdown
                                          settings={chartSettings}
                                          onSettingsChange={setChartSettings}
                                          onClose={() => setShowChartSettings(null)}
                                          chartType={currentView}
                                        />
                                      )}
                                      {/* Expand Button */}
                                      <button
                                        onClick={() => {
                                          setDataViewerData({
                                            columns: result.columns,
                                            rows: result.rows,
                                            chartType: currentView,
                                            sqlQuery: message.sqlQuery || undefined,
                                            viewKey,
                                          });
                                          setDataViewerOpen(message.id);
                                      }}
                                      className="flex items-center justify-center w-7 h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors"
                                      title="Expand fullscreen"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                      </svg>
                                    </button>
                                    </div>
                                  </div>

                                  {/* SQL Query Panel - show when expanded (only on first table) */}
                                  {idx === 0 && expandedSql.has(message.id) && message.sqlQuery && (
                                    <pre className="mx-3 mt-3 mb-2 p-3 rounded-lg bg-gray-100 dark:bg-[#0f0f0f] text-gray-700 dark:text-gray-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-200 dark:border-[#262626]">
                                      {message.sqlQuery}
                                    </pre>
                                  )}

                                  {/* Filter Modal */}
                                  {showFilterModal === viewKey && (
                                    <FilterModal
                                      columns={result.columns}
                                      rows={result.rows}
                                      filters={tableFilters[viewKey] || {}}
                                      advancedFilters={advancedTableFilters[viewKey]}
                                      onFilterChange={(col, val) => handleFilterChange(viewKey, col, val)}
                                      onAdvancedFilterChange={(col, filter, action) => handleAdvancedFilterChange(viewKey, col, filter, action)}
                                      onClearFilters={() => handleClearFilters(viewKey)}
                                      onClose={() => setShowFilterModal(null)}
                                    />
                                  )}

                                  {/* Chart View */}
                                  {currentView !== "table" && (
                                    <DataChart
                                      data={getFilteredRows(result.rows, viewKey)}
                                      columns={result.columns}
                                      chartType={currentView}
                                      settings={chartSettings}
                                    />
                                  )}

                                  {/* Table View */}
                                  {currentView === "table" && (
                                    <VirtualTable
                                      columns={result.columns}
                                      rows={result.rows}
                                      filters={tableFilters[viewKey] || {}}
                                      advancedFilters={advancedTableFilters[viewKey]}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      // Single table - render normally
                      const parsedResult = parsedResults[0];
                      if (!parsedResult.rows || parsedResult.rows.length === 0) {
                        // Show empty state instead of hiding completely
                        return (
                          <div className="bg-[#fafafc] dark:bg-[#1a1a1a] rounded-xl p-4 mt-2 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No data returned</p>
                          </div>
                        );
                      }

                      // For single row results, show as a clean card instead of a table
                      if (parsedResult.rows.length === 1) {
                        const row = parsedResult.rows[0];
                        const values = parsedResult.columns.map((col) => ({
                          label: col.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim(),
                          value: row[col],
                        }));

                        // Find the "main" value (usually numeric, like total, count, amount)
                        const mainValueIdx = values.findIndex(v =>
                          typeof v.value === 'number' ||
                          /total|count|sum|amount|price|spent/i.test(v.label)
                        );
                        const mainValue = mainValueIdx >= 0 ? values[mainValueIdx] : null;
                        const otherValues = values.filter((_, idx) => idx !== mainValueIdx);

                        return (
                          <div className="mt-3 space-y-3">
                            {/* Main value - featured card */}
                            {mainValue && (
                              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 p-4 sm:p-5">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 dark:bg-black/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 dark:bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                                <div className="relative min-w-0">
                                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    {mainValue.label}
                                  </span>
                                  <div className="text-2xl sm:text-4xl font-bold text-white dark:text-gray-900 mt-1 tracking-tight break-words overflow-hidden">
                                    {formatCellValue(mainValue.value)}
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Other values - stat cards */}
                            {otherValues.length > 0 && (
                              <div className={`grid gap-2 ${otherValues.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : otherValues.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {otherValues.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-xl bg-gray-100 dark:bg-[#1a1a1a] px-3 sm:px-4 py-3 hover:bg-gray-150 dark:hover:bg-[#1a1a1a] transition-colors min-w-0 overflow-hidden"
                                  >
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium block truncate">{item.label}</span>
                                    <div className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white mt-1 break-words line-clamp-3" title={formatCellValue(item.value)}>
                                      {formatCellValue(item.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Get current view mode for this message, default to table
                      const currentView = chartViews[message.id] || "table";

                      // Check if data is chartable (has at least one numeric column)
                      // Check ALL columns, not just after first - and handle string numbers
                      const hasNumericData = parsedResult.columns.some((col) =>
                        parsedResult.rows.some((row) => {
                          const val = row[col];
                          if (val === null || val === undefined || val === '') return false;
                          if (typeof val === "number") return true;
                          // Check if string can be parsed as number
                          const numVal = Number(val);
                          return !isNaN(numVal) && isFinite(numVal);
                        })
                      );

                      return (
                        <div className="bg-[#fafafc] dark:bg-[#1a1a1a] rounded-xl overflow-hidden mt-2">
                          {/* View Toggle Buttons - always show for tables */}
                          <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-[#262626]">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "table" }))}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                  currentView === "table"
                                    ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                    : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                }`}
                              >
                                Table
                              </button>
                              {hasNumericData && parsedResult.rows.length > 1 && (
                                <>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "bar" }))}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                      currentView === "bar"
                                        ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                        : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                    }`}
                                  >
                                    Bar
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "line" }))}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                      currentView === "line"
                                        ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                        : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                    }`}
                                  >
                                    Line
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "pie" }))}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                      currentView === "pie"
                                        ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                        : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                    }`}
                                  >
                                    Pie
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "area" }))}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-md transition-colors ${
                                      currentView === "area"
                                        ? "bg-black dark:bg-white text-white dark:text-gray-900"
                                        : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                    }`}
                                  >
                                    Area
                                  </button>
                                </>
                              )}
                            </div>
                              {/* Toolbar: SQL, Filter, Settings, Expand */}
                              <div className="flex items-center gap-1 flex-shrink-0 relative ml-3 pl-3 border-l border-gray-200 dark:border-[#333]">
                                {/* SQL Button */}
                                {message.sqlQuery && (
                                  <button
                                    onClick={() => setExpandedSql(prev => {
                                      const next = new Set(prev);
                                      if (next.has(message.id)) next.delete(message.id);
                                      else next.add(message.id);
                                      return next;
                                    })}
                                    className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                      expandedSql.has(message.id)
                                        ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-[#333]'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525]'
                                    }`}
                                    title={expandedSql.has(message.id) ? "Hide SQL" : "View SQL"}
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                                      <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                  </button>
                                )}
                                {/* Filter Button - only for table view */}
                                {currentView === "table" && (() => {
                                  const hasSimpleFilters = Object.values(tableFilters[message.id] || {}).some(v => v?.length);
                                  const hasAdvancedFilters = Object.values(advancedTableFilters[message.id] || {}).some(arr => arr?.length > 0);
                                  const hasAnyFilters = hasSimpleFilters || hasAdvancedFilters;
                                  return (
                                    <button
                                      onClick={() => setShowFilterModal(message.id)}
                                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                        hasAnyFilters
                                          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525]'
                                      }`}
                                      title="Filter data"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                      </svg>
                                    </button>
                                  );
                                })()}
                                {/* Settings Gear - only show when viewing charts */}
                                {currentView !== "table" && (
                                  <button
                                    onClick={() => setShowChartSettings(showChartSettings === message.id ? null : message.id)}
                                    className="flex items-center justify-center w-7 h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors"
                                    title="Chart settings"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                )}
                                {/* Settings Dropdown */}
                                {showChartSettings === message.id && (
                                  <ChartSettingsDropdown
                                    settings={chartSettings}
                                    onSettingsChange={setChartSettings}
                                    onClose={() => setShowChartSettings(null)}
                                    chartType={currentView}
                                  />
                                )}
                                {/* Expand Button */}
                                <button
                                  onClick={() => {
                                    setDataViewerData({
                                      columns: parsedResult.columns,
                                      rows: parsedResult.rows,
                                      chartType: currentView,
                                      sqlQuery: message.sqlQuery || undefined,
                                      viewKey: message.id,
                                    });
                                    setDataViewerOpen(message.id);
                                  }}
                                  className="flex items-center justify-center w-7 h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors"
                                  title="Expand fullscreen"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                  </svg>
                                </button>
                              </div>
                          </div>

                          {/* SQL Query Panel - show when expanded */}
                          {expandedSql.has(message.id) && message.sqlQuery && (
                            <pre className="mx-3 mt-3 mb-2 p-3 rounded-lg bg-gray-100 dark:bg-[#0f0f0f] text-gray-700 dark:text-gray-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-200 dark:border-[#262626]">
                              {message.sqlQuery}
                            </pre>
                          )}

                          {/* Filter Modal */}
                          {showFilterModal === message.id && (
                            <FilterModal
                              columns={parsedResult.columns}
                              rows={parsedResult.rows}
                              filters={tableFilters[message.id] || {}}
                              advancedFilters={advancedTableFilters[message.id]}
                              onFilterChange={(col, val) => handleFilterChange(message.id, col, val)}
                              onAdvancedFilterChange={(col, filter, action) => handleAdvancedFilterChange(message.id, col, filter, action)}
                              onClearFilters={() => handleClearFilters(message.id)}
                              onClose={() => setShowFilterModal(null)}
                            />
                          )}

                          {/* Chart View */}
                          {currentView !== "table" && (
                            <DataChart
                              data={getFilteredRows(parsedResult.rows, message.id)}
                              columns={parsedResult.columns}
                              chartType={currentView}
                              settings={chartSettings}
                            />
                          )}

                          {/* Table View - Virtual Scrolling for performance */}
                          {currentView === "table" && (
                            <VirtualTable
                              columns={parsedResult.columns}
                              rows={parsedResult.rows}
                              filters={tableFilters[message.id] || {}}
                              advancedFilters={advancedTableFilters[message.id]}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] bg-gray-900 dark:bg-[#1a1a1a] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                      <p className="text-[13px] text-white leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {/* Show processing indicator when actively sending OR when this conversation has pending request */}
          {(isSending || (selectedConversationId && pendingConversations.has(selectedConversationId) && !isSending)) && (() => {
            // Get pending message info for background processing
            const pendingInfo = selectedConversationId ? pendingMessagesRef.current.get(selectedConversationId) : null;
            const effectivePhase = isSending ? currentPhase : pendingInfo?.phase ?? null;
            const pendingMessage = !isSending && pendingInfo ? pendingInfo.message : null;

            return (
              <>
                {/* Show user's pending message when returning to conversation */}
                {pendingMessage && (
                  <div className="flex justify-end mb-4">
                    <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] bg-gray-900 dark:bg-[#1a1a1a] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                      <p className="text-[13px] text-white leading-relaxed">
                        {pendingMessage}
                      </p>
                    </div>
                  </div>
                )}
                <div className="w-full sm:w-[85%] md:w-[70%] sm:max-w-[85%] md:max-w-[70%] bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-3 sm:p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">Erao</p>
                  <div className="flex items-center gap-3 sm:gap-5">
                    {/* Robot Animation Container */}
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0">
                  <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                    {/* Thought rings orbiting around */}
                    <ellipse
                      cx="150" cy="150" rx="90" ry="30"
                      className="fill-none stroke-black dark:stroke-white opacity-30"
                      strokeWidth="1.5"
                      style={{ transformOrigin: '150px 150px', animation: 'orbit-ring 4s linear infinite' }}
                    />
                    <ellipse
                      cx="150" cy="150" rx="70" ry="25"
                      className="fill-none stroke-black dark:stroke-white opacity-30"
                      strokeWidth="1.5"
                      style={{ transformOrigin: '150px 150px', animation: 'orbit-ring 4s linear infinite reverse', animationDelay: '-2s' }}
                    />

                    {/* Floating particles */}
                    <circle cx="80" cy="100" r="3" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite' }} />
                    <circle cx="220" cy="110" r="2" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite', animationDelay: '0.3s' }} />
                    <circle cx="70" cy="180" r="2.5" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite', animationDelay: '0.6s' }} />
                    <circle cx="230" cy="190" r="2" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite', animationDelay: '0.9s' }} />
                    <circle cx="150" cy="60" r="3" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite', animationDelay: '1.2s' }} />
                    <circle cx="150" cy="240" r="2" className="fill-black dark:fill-white" style={{ animation: 'particle-float 2s ease-in-out infinite', animationDelay: '1.5s' }} />

                    {/* Main robot group with float + sway */}
                    <g style={{ animation: 'robot-float 3s ease-in-out infinite' }}>
                      <g style={{ transformOrigin: '150px 150px', animation: 'robot-sway 4s ease-in-out infinite' }}>

                        {/* Body */}
                        <rect
                          x="100" y="100" width="100" height="100" rx="8"
                          className="fill-none stroke-black dark:stroke-white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Inner frame */}
                        <rect
                          x="110" y="110" width="80" height="80" rx="4"
                          className="fill-none stroke-black dark:stroke-white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
                        />

                        {/* Thinking eye/core */}
                        <g style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
                          <circle
                            cx="150" cy="150" r="25"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />

                          {/* Spinning inner elements */}
                          <g style={{ transformOrigin: '150px 150px', animation: 'think-spin 3s linear infinite' }}>
                            <circle cx="150" cy="130" r="4" className="fill-black dark:fill-white" />
                            <circle cx="170" cy="150" r="3" className="fill-black dark:fill-white" />
                            <circle cx="150" cy="170" r="4" className="fill-black dark:fill-white" />
                            <circle cx="130" cy="150" r="3" className="fill-black dark:fill-white" />
                          </g>
                        </g>

                        {/* Antenna */}
                        <line
                          x1="150" y1="100" x2="150" y2="70"
                          className="stroke-black dark:stroke-white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="150" cy="65" r="6"
                          className="fill-black dark:fill-white"
                          style={{ animation: 'antenna-blink 1s ease-in-out infinite' }}
                        />

                        {/* Arms */}
                        <g style={{ transformOrigin: '90px 135px', animation: 'arm-wave-left 2s ease-in-out infinite' }}>
                          <polygon
                            points="100,120 70,140 70,160 100,150"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="70" cy="150" r="8"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="1.5"
                            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
                          />
                        </g>

                        <g style={{ transformOrigin: '210px 135px', animation: 'arm-wave-right 2s ease-in-out infinite' }}>
                          <polygon
                            points="200,120 230,140 230,160 200,150"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="230" cy="150" r="8"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="1.5"
                            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
                          />
                        </g>

                        {/* Legs */}
                        <g style={{ animation: 'leg-float 2.5s ease-in-out infinite' }}>
                          <polygon
                            points="120,200 130,240 110,240"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="120" cy="245" r="5"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="1.5"
                          />
                        </g>

                        <g style={{ animation: 'leg-float 2.5s ease-in-out infinite', animationDelay: '-1.25s' }}>
                          <polygon
                            points="180,200 190,240 170,240"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="180" cy="245" r="5"
                            className="fill-none stroke-black dark:stroke-white"
                            strokeWidth="1.5"
                          />
                        </g>

                      </g>
                    </g>
                  </svg>
                </div>

                {/* Phase Text */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-white tracking-wide">
                        {effectivePhase === "writing"
                          ? "Writing response"
                          : effectivePhase === "executing"
                          ? "Running query"
                          : "Thinking"}
                      </span>
                      <span className="flex gap-1 items-center">
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full animate-bounce [animation-delay:0.1s]" />
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 sm:px-8 pb-2">
            <div className="bg-gray-50 dark:bg-[#1a1a1a] border-l-2 border-l-red-400 dark:border-l-red-500 text-gray-600 dark:text-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-r-lg">
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`${messages.length === 0 ? 'absolute inset-0 flex items-center justify-center px-3 sm:px-5' : 'absolute bottom-0 left-0 right-0 z-20 px-3 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4 flex justify-center backdrop-blur-xl bg-white/5 dark:bg-[#0a0a0a]/60'}`}>
          <div className={`w-full max-w-[680px] ${messages.length === 0 ? 'flex flex-col items-center gap-4 sm:gap-6' : ''}`}>
            {messages.length === 0 && (
              <div className="text-center px-2">
                <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-2">
                  {selectedDatabase
                    ? `Query ${selectedDatabase.name}`
                    : selectedFile
                    ? `Analyze ${selectedFile.originalFileName}`
                    : "What can I help with?"}
                </h2>
                {(selectedDatabase || selectedFile) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedDatabase ? "Connected to database" : "File ready for analysis"}
                  </p>
                )}
              </div>
            )}
            <form
              onSubmit={handleSendMessage}
              className="w-full h-11 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-2 flex items-center gap-1.5 border border-gray-200 dark:border-[#262626] focus-within:border-gray-300 dark:focus-within:border-[#404040] focus-within:bg-white dark:focus-within:bg-[#1a1a1a] transition-all"
            >
              {/* File Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.docx,.doc,.csv,.xml,.json,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-200/70 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Upload file (Excel, Word, CSV)"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedFile ? `Ask about ${selectedFile.originalFileName}...` : "Ask anything about your data..."}
                disabled={isSending}
                className="flex-1 text-[13px] outline-none border-none focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 bg-transparent text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Database Selection Modal */}
      {showDatabaseModal && (
        <DatabaseModal
          databases={databases}
          selectedDatabaseId={selectedDatabaseId}
          onSelect={(id) => {
            setSelectedDatabaseId(id);
            setSelectedFileId(null); // Clear file when database is selected
            // Clear conversation if changing data source
            if (selectedConversationId) {
              setSelectedConversationId(null);
              setMessages([]);
            }
            setShowDatabaseModal(false);
          }}
          onClose={() => setShowDatabaseModal(false)}
          onAddNew={() => {
            setShowDatabaseModal(false);
            setShowAddDatabaseModal(true);
          }}
          onViewSchema={(id) => {
            setSchemaViewDatabaseId(id);
            setShowSchemaModal(true);
            setShowDatabaseModal(false);
          }}
          onDelete={(id, name) => {
            setDeleteConfirm({
              type: 'database',
              id,
              name
            });
          }}
        />
      )}

      {/* Schema Viewer Modal */}
      {showSchemaModal && schemaViewDatabaseId && (
        <SchemaViewerModal
          databaseId={schemaViewDatabaseId}
          databaseName={databases.find(d => d.id === schemaViewDatabaseId)?.name || "Database"}
          onClose={() => {
            setShowSchemaModal(false);
            setSchemaViewDatabaseId(null);
          }}
        />
      )}

      {/* Add Database Modal */}
      {showAddDatabaseModal && (
        <AddDatabaseModal
          onClose={() => setShowAddDatabaseModal(false)}
          onSuccess={(newDb) => {
            setDatabases((prev) => [...prev, newDb]);
            setSelectedDatabaseId(newDb.id);
            setSelectedFileId(null); // Clear file
            setSelectedConversationId(null); // Start fresh
            setMessages([]);
            setShowAddDatabaseModal(false);
          }}
        />
      )}

      {/* Files Modal */}
      {showFilesModal && (
        <FilesModal
          files={files}
          selectedFileId={selectedFileId}
          onSelect={(id) => {
            setSelectedFileId(id || null);
            setSelectedDatabaseId(null); // Clear database when file is selected
            // Clear conversation if changing data source
            if (selectedConversationId) {
              setSelectedConversationId(null);
              setMessages([]);
            }
            setShowFilesModal(false);
          }}
          onClose={() => setShowFilesModal(false)}
          onUpload={() => {
            setShowFilesModal(false);
            fileInputRef.current?.click();
          }}
          onDelete={handleDeleteFile}
          formatFileSize={formatFileSize}
          getFileIcon={getFileIcon}
        />
      )}

      {/* Fullscreen Data Viewer Modal */}
      {dataViewerOpen && dataViewerData && (
        <DataViewerModal
          isOpen={true}
          onClose={() => {
            setDataViewerOpen(null);
            setDataViewerData(null);
          }}
          columns={dataViewerData.columns}
          rows={dataViewerData.rows}
          initialChartType={dataViewerData.chartType}
          sqlQuery={dataViewerData.sqlQuery}
          initialChartSettings={chartSettings}
          onSettingsChange={setChartSettings}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm sm:mx-4 shadow-xl border border-transparent dark:border-[#1a1a1a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900 dark:text-white">Delete {deleteConfirm.type === 'conversation' ? 'Chat' : 'Connection'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">&quot;{deleteConfirm.name}&quot;</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'conversation') {
                    handleDeleteConversation(deleteConfirm.id);
                  } else {
                    handleDeleteDatabase(deleteConfirm.id);
                  }
                }}
                className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Limit Alert */}
      {showUsageLimitAlert && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-[70]">
          <div className="bg-white dark:bg-[#161616] rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm sm:mx-4 shadow-2xl border border-transparent dark:border-[#262626]">
            <div className="p-5 sm:p-6">
              <div className="w-10 h-10 bg-gray-100 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Usage limit reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                You&apos;ve used all queries for this billing cycle. Upgrade your plan or wait for the next cycle to continue.
              </p>
            </div>
            <div className="border-t border-gray-100 dark:border-[#262626] p-3 sm:p-4 flex gap-3">
              <button
                onClick={() => setShowUsageLimitAlert(false)}
                className="flex-1 h-9 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowUsageLimitAlert(false);
                  window.location.href = "/subscriptions";
                }}
                className="flex-1 h-9 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-start justify-center sm:pt-[15vh] z-[70]"
          onClick={() => {
            setShowSearchModal(false);
            setSearchQuery("");
          }}
        >
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 shadow-2xl overflow-hidden border border-transparent dark:border-[#1a1a1a] max-h-[80vh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-100 dark:border-[#1a1a1a]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full h-11 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl pl-10 pr-4 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-gray-100 dark:focus:bg-[#252525] transition-colors text-gray-900 dark:text-white"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-[#333] rounded-full"
                  >
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                  No conversations yet
                </div>
              ) : (
                (() => {
                  const filtered = conversations.filter((chat) =>
                    searchQuery === "" ||
                    (chat.title || "New Chat").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (chat.databaseConnectionName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (chat.fileDocumentName || "").toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                        No results found for &quot;{searchQuery}&quot;
                      </div>
                    );
                  }

                  return filtered.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        selectConversation(chat.id);
                        setShowSearchModal(false);
                        setSearchQuery("");
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border-b border-gray-50 dark:border-[#1a1a1a] last:border-b-0 ${
                        chat.id === selectedConversationId ? "bg-gray-50 dark:bg-[#1a1a1a]" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chat.title || "New Chat"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {(chat.databaseConnectionName || chat.fileDocumentName) && (
                          <>
                            <span className="truncate max-w-[150px]">
                              {chat.databaseConnectionName || chat.fileDocumentName}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span className="whitespace-nowrap">{formatRelativeTime(chat.updatedAt)}</span>
                      </div>
                    </button>
                  ));
                })()
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#111111] border-t border-gray-100 dark:border-[#1a1a1a]">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#333] rounded border border-gray-200 dark:border-[#262626] text-gray-500 dark:text-gray-300">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Database Selection Modal Component
function DatabaseModal({
  databases,
  selectedDatabaseId,
  onSelect,
  onClose,
  onAddNew,
  onViewSchema,
  onDelete,
}: {
  databases: DatabaseConnection[];
  selectedDatabaseId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAddNew: () => void;
  onViewSchema: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161616] rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#262626]">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Select Database</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="max-h-[280px] overflow-y-auto">
          {databases.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#262626] flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No databases yet</p>
            </div>
          ) : (
            databases.map((db) => (
              <div
                key={db.id}
                className={`group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  db.id === selectedDatabaseId
                    ? "bg-gray-50 dark:bg-[#1e1e1e]"
                    : "hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                }`}
                onClick={() => onSelect(db.id)}
              >
                {/* Selection indicator */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  db.id === selectedDatabaseId
                    ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white"
                    : "border-gray-300 dark:border-[#262626]"
                }`}>
                  {db.id === selectedDatabaseId && (
                    <svg className="w-2.5 h-2.5 text-white dark:text-[#161616]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{db.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{getDatabaseTypeName(db.databaseType)}</p>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewSchema(db.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#262626] transition-colors"
                    title="View Schema"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(db.id, db.name);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-[#262626]">
          <button
            onClick={onAddNew}
            className="w-full h-9 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Connection
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Database Modal Component
function AddDatabaseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (db: DatabaseConnection) => void;
}) {
  // Database type configuration
  const databaseTypes = [
    { value: 0, label: "PostgreSQL", port: 5432 },
    { value: 1, label: "MySQL", port: 3306 },
    { value: 2, label: "SQL Server", port: 1433 },
    { value: 3, label: "MongoDB", port: 27017 },
  ];

  // Database logo paths
  const databaseLogos: Record<number, string> = {
    0: "/db-logos/postgresql.png",
    1: "/db-logos/mysql.png",
    2: "/db-logos/sql-server.png",
    3: "/db-logos/mongodb.png",
  };

  const [formData, setFormData] = useState<CreateDatabaseConnectionPayload>({
    name: "",
    databaseType: 0,
    host: "",
    port: 5432,
    databaseName: "",
    username: "",
    password: "",
  });
  const [portInput, setPortInput] = useState("5432");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testPassed, setTestPassed] = useState(false);

  const currentDbType = databaseTypes.find(t => t.value === formData.databaseType);

  const handlePortChange = (value: string) => {
    setPortInput(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setFormData({ ...formData, port: parsed });
    }
    setTestPassed(false);
    setTestResult(null);
  };

  const handleDatabaseTypeSelect = (typeValue: number) => {
    const dbType = databaseTypes.find((t) => t.value === typeValue);
    if (dbType) {
      setFormData({ ...formData, databaseType: typeValue, port: dbType.port });
      setPortInput(dbType.port.toString());
    }
    setTestPassed(false);
    setTestResult(null);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setTestPassed(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError("");
    setTestPassed(false);

    try {
      const createResponse = await api.createDatabase(formData);
      if (createResponse.success) {
        const testResponse = await api.testDatabase(createResponse.data.id);
        if (testResponse.data) {
          setTestResult("success");
          setTestPassed(true);
          setFormData(prev => ({ ...prev, id: createResponse.data.id } as typeof prev & { id: string }));
        } else {
          await api.deleteDatabase(createResponse.data.id);
          setTestResult("error");
          setError("Could not connect. Please verify your credentials.");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Connection test failed");
      }
      setTestResult("error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testPassed) return;
    setIsLoading(true);

    try {
      const response = await api.getDatabases();
      if (response.success) {
        const newDb = response.data.find(db => db.name === formData.name);
        if (newDb) {
          onSuccess(newDb);
        } else {
          const lastDb = response.data[response.data.length - 1];
          if (lastDb) {
            onSuccess(lastDb);
          }
        }
      }
    } catch {
      setError("Failed to save connection");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.host && formData.databaseName && formData.username && formData.name;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white dark:bg-[#111111] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-[#1a1a1a]">
          <h2 className="text-base font-medium text-gray-900 dark:text-white">New Connection</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 overflow-y-auto max-h-[calc(90vh-130px)] custom-scrollbar">
          {/* Database Type Selection */}
          <div className="mb-5">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {databaseTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleDatabaseTypeSelect(type.value)}
                  className={`flex flex-col items-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 rounded-lg border transition-all ${
                    formData.databaseType === type.value
                      ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-[#1a1a1a]"
                      : "border-gray-200 dark:border-[#262626] hover:border-gray-300 dark:hover:border-[#404040]"
                  }`}
                >
                  <img src={databaseLogos[type.value]} alt={type.label} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-full px-1">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="Connection name"
                className="w-full h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.host}
                onChange={(e) => handleFieldChange("host", e.target.value)}
                placeholder="Host"
                className="flex-1 min-w-0 h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <input
                type="text"
                inputMode="numeric"
                value={portInput}
                onChange={(e) => handlePortChange(e.target.value)}
                placeholder="Port"
                className="w-16 sm:w-20 h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-2 sm:px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-center"
              />
            </div>

            <div>
              <input
                type="text"
                value={formData.databaseName}
                onChange={(e) => handleFieldChange("databaseName", e.target.value)}
                placeholder="Database name"
                className="w-full h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                placeholder="Username"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                className="w-full h-10 bg-transparent border border-gray-200 dark:border-[#262626] rounded-lg px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-[#404040] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Status Message */}
          {testResult && (
            <div className={`mt-4 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 ${
              testResult === "success"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}>
              {testResult === "success" ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected to {currentDbType?.label}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {error || "Connection failed"}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-[#1a1a1a] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 h-9 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          {!testPassed ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !isFormValid}
              className="px-3 sm:px-4 h-9 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                  Testing
                </>
              ) : (
                "Test Connection"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="px-3 sm:px-4 h-9 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Files Modal Component
function FilesModal({
  files,
  selectedFileId,
  onSelect,
  onClose,
  onUpload,
  onDelete,
  formatFileSize,
  getFileIcon,
}: {
  files: FileDocument[];
  selectedFileId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpload: () => void;
  onDelete: (id: string) => void;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileType: string | number) => React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#161616] rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#262626]">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Files</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto">
          {files.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#262626] flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No files yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Upload files to analyze</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  file.id === selectedFileId
                    ? "bg-gray-50 dark:bg-[#1e1e1e]"
                    : "hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                }`}
                onClick={() => onSelect(file.id)}
              >
                {/* Selection indicator */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  file.id === selectedFileId
                    ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white"
                    : "border-gray-300 dark:border-[#262626]"
                }`}>
                  {file.id === selectedFileId && (
                    <svg className="w-2.5 h-2.5 text-white dark:text-[#161616]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{file.originalFileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {formatFileSize(file.fileSizeBytes)}
                    {file.rowCount ? ` • ${file.rowCount.toLocaleString()} rows` : ""}
                  </p>
                </div>

                {/* Delete - show on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.id);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-[#262626] flex gap-2">
          <button
            onClick={onUpload}
            className="w-full h-9 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload File
          </button>
        </div>
      </div>
    </div>
  );
}

// Schema Viewer Modal Component
function SchemaViewerModal({
  databaseId,
  databaseName,
  onClose,
}: {
  databaseId: string;
  databaseName: string;
  onClose: () => void;
}) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "diagram">("diagram");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const response = await api.getDatabaseSchema(databaseId);
        if (response.success && response.data) {
          setSchema(response.data);
          // Auto-expand first 3 tables
          const tables = response.data.tables || [];
          const firstTables = tables.slice(0, 3).map(t => t.name);
          setExpandedTables(new Set(firstTables));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schema");
      } finally {
        setLoading(false);
      }
    };
    fetchSchema();
  }, [databaseId]);

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const filteredTables = (schema?.tables || []).filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'sm:p-4'}`}>
      <div className={`bg-white dark:bg-[#1a1a1a] flex flex-col transition-all duration-300 border border-transparent dark:border-[#1a1a1a] ${
        isFullscreen
          ? 'w-full h-full rounded-none'
          : 'rounded-t-2xl sm:rounded-2xl w-full sm:max-w-6xl max-h-[90vh] sm:max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className={`border-b border-gray-100 dark:border-[#1a1a1a] ${isFullscreen ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{databaseName}</h2>
              {schema && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getDatabaseTypeName(schema.databaseType as DatabaseType)} • {(schema.tables || []).length} tables
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("diagram")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "diagram" ? "bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Diagram
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "list" ? "bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  List
                </button>
              </div>
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Open sandbox mode"}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Search - always visible */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tables and columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#262626] rounded-xl pl-10 pr-10 text-sm outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-[#252525] transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {filteredTables.length} of {(schema?.tables || []).length} tables match
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 ${viewMode === "diagram" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-[#262626] border-t-gray-800 dark:border-t-white rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : (schema?.tables || []).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No tables found
            </div>
          ) : viewMode === "diagram" ? (
            <ERDiagramView tables={filteredTables} searchQuery={searchQuery} />
          ) : (
            <div className="p-6">
              {filteredTables.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No tables match your search
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTables.map((table) => (
                    <TableCard
                      key={table.name}
                      table={table}
                      isExpanded={expandedTables.has(table.name)}
                      onToggle={() => toggleTable(table.name)}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ERD Diagram View Component
function ERDiagramView({ tables, searchQuery = '' }: { tables: TableSchema[]; searchQuery?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/50 text-yellow-900 dark:text-yellow-100 rounded px-0.5">{part}</mark> : part
    );
  };
  const initialPositions = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      pos[table.name] = {
        x: 80 + col * 300,
        y: 80 + row * 280,
      };
    });
    return pos;
  }, [tables]);

  const initialScale = useMemo(() => {
    if (tables.length > 10) return 0.6;
    if (tables.length > 5) return 0.75;
    return 0.9;
  }, [tables]);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(initialPositions);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Build FK relationships
  const relationships = tables.flatMap(table =>
    table.foreignKeys.map(fk => ({
      fromTable: table.name,
      fromColumn: fk.column,
      toTable: fk.referencedTable,
      toColumn: fk.referencedColumn,
    }))
  );

  const handleMouseDown = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).closest('.erd-table')?.getBoundingClientRect();
    if (rect) {
      setDragging(tableName);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the canvas background (not on a table)
    if ((e.target as HTMLElement).closest('.erd-table')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setPositions(prev => ({
        ...prev,
        [dragging]: {
          x: (e.clientX - containerRect.left - dragOffset.x - pan.x) / scale,
          y: (e.clientY - containerRect.top - dragOffset.y - pan.y) / scale,
        },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  // Handle wheel/touchpad events
  const handleWheel = (e: React.WheelEvent) => {
    // Pinch-to-zoom (ctrlKey is true for pinch gestures on touchpad)
    if (e.ctrlKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Slower zoom speed for smoother touchpad experience
      const zoomSpeed = 0.008;
      const delta = -e.deltaY * zoomSpeed;
      const newScale = Math.min(Math.max(scale + delta, 0.3), 2);
      const scaleChange = newScale / scale;

      // Zoom towards mouse position
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleChange,
        y: mouseY - (mouseY - prev.y) * scaleChange,
      }));
      setScale(newScale);
    } else {
      // Regular two-finger scroll = pan
      e.preventDefault();
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Zoom towards center
  const zoomIn = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.min(scale + 0.1, 2);
    const scaleChange = newScale / scale;

    setPan(prev => ({
      x: centerX - (centerX - prev.x) * scaleChange,
      y: centerY - (centerY - prev.y) * scaleChange,
    }));
    setScale(newScale);
  };

  const zoomOut = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.max(scale - 0.1, 0.3);
    const scaleChange = newScale / scale;

    setPan(prev => ({
      x: centerX - (centerX - prev.x) * scaleChange,
      y: centerY - (centerY - prev.y) * scaleChange,
    }));
    setScale(newScale);
  };

  const getColumnYOffset = (table: TableSchema, columnName: string) => {
    const headerHeight = 36;
    const columnHeight = 28;
    const colIndex = table.columns.findIndex(c => c.name === columnName);
    return headerHeight + (colIndex + 0.5) * columnHeight;
  };

  // Check for dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${
        isPanning ? 'cursor-grabbing' : dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ minHeight: "500px" }}
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, ${isDark ? '#4b5563' : '#cbd5e1'} 1px, transparent 1px)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 dark:border-[#262626]">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-sm border border-gray-200 dark:border-[#262626] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-gray-700 dark:text-gray-200"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-sm border border-gray-200 dark:border-[#262626] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-gray-700 dark:text-gray-200"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <div className="w-px bg-gray-200 dark:bg-[#262626]" />
        <span className="flex items-center px-2 text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[50px] justify-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px bg-gray-200 dark:bg-[#262626]" />
        <button
          onClick={() => { setScale(0.8); setPan({ x: 0, y: 0 }); }}
          className="px-3 h-8 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-sm border border-gray-200 dark:border-[#262626] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-xs font-medium transition-colors text-gray-700 dark:text-gray-200"
          title="Reset view"
        >
          Fit
        </button>
      </div>

      {/* Instructions hint */}
      <div className="absolute top-4 left-4 z-10 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 dark:border-[#262626]">
        <span className="font-medium">Tip:</span> Drag tables to arrange • Scroll to pan • Pinch to zoom
      </div>

      {/* Canvas */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          left: 0,
          top: 0,
          width: "6000px",
          height: "4000px",
        }}
      >
        {/* SVG for relationship lines */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: "-1000px",
            top: "-1000px",
            width: "8000px",
            height: "6000px",
            overflow: "visible"
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
          {relationships.map((rel, idx) => {
            const fromPos = positions[rel.fromTable];
            const toPos = positions[rel.toTable];
            const fromTable = tables.find(t => t.name === rel.fromTable);
            const toTable = tables.find(t => t.name === rel.toTable);

            if (!fromPos || !toPos || !fromTable || !toTable) return null;

            // SVG offset compensation
            const svgOffset = 1000;
            const tableWidth = 240;
            const fromY = fromPos.y + getColumnYOffset(fromTable, rel.fromColumn) + svgOffset;
            const toY = toPos.y + getColumnYOffset(toTable, rel.toColumn) + svgOffset;

            // Determine which side to connect from
            const fromRight = fromPos.x + tableWidth + svgOffset;
            const fromLeft = fromPos.x + svgOffset;
            const toLeft = toPos.x + svgOffset;
            const toRight = toPos.x + tableWidth + svgOffset;

            let startX: number, endX: number;
            if (fromRight < toLeft) {
              // from is to the left of to
              startX = fromRight;
              endX = toLeft;
            } else if (fromLeft > toRight) {
              // from is to the right of to
              startX = fromLeft;
              endX = toRight;
            } else {
              // overlapping horizontally, use right side
              startX = fromRight;
              endX = toRight;
            }

            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${endX} ${toY}`;

            return (
              <g key={idx}>
                <path
                  d={path}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  className="opacity-60"
                />
                {/* FK indicator dot */}
                <circle cx={startX} cy={fromY} r="4" fill="#6366f1" />
              </g>
            );
          })}
        </svg>

        {/* Table Cards */}
        {tables.map(table => {
          const pos = positions[table.name] || { x: 0, y: 0 };
          const pkColumns = new Set(table.primaryKeys.flatMap(pk => pk.columns));
          const fkColumns = new Set(table.foreignKeys.map(fk => fk.column));

          return (
            <div
              key={table.name}
              className="erd-table absolute bg-white dark:bg-[#111111] rounded-xl shadow-lg border border-gray-200 dark:border-[#262626] overflow-hidden select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: 240,
                cursor: dragging === table.name ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(table.name, e)}
            >
              {/* Table Header */}
              <div className="bg-gray-900 dark:bg-[#1a1a1a] text-white px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-sm truncate">{highlightMatch(table.name)}</span>
                {table.rowCount !== null && (
                  <span className="ml-auto text-xs text-gray-400">{table.rowCount.toLocaleString()}</span>
                )}
              </div>
              {/* Columns */}
              <div
                className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto erd-scrollbar bg-white dark:bg-[#111111]"
                onWheel={(e) => e.stopPropagation()}
              >
                {table.columns.map(column => (
                  <div
                    key={column.name}
                    className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                  >
                    <div className="w-4 flex justify-center">
                      {pkColumns.has(column.name) ? (
                        <svg className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        </svg>
                      ) : fkColumns.has(column.name) ? (
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-[#333333]" />
                      )}
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{highlightMatch(column.name)}</span>
                    <span className="text-gray-400 font-mono text-[10px]">{column.dataType}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-[#262626] px-3 py-2">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <span className="text-gray-600 dark:text-gray-300">Primary Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300">Foreign Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-gray-500 rounded" />
            <span className="text-gray-600 dark:text-gray-300">Relationship</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table Card Component for Schema Viewer
function TableCard({
  table,
  isExpanded,
  onToggle,
  searchQuery,
}: {
  table: TableSchema;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  const pkColumns = new Set(table.primaryKeys.flatMap(pk => pk.columns));
  const fkColumns = new Set(table.foreignKeys.map(fk => fk.column));

  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 dark:text-yellow-200 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="border border-gray-200 dark:border-[#262626] rounded-xl overflow-hidden bg-white dark:bg-[#111111]">
      {/* Table Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111111] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-sm text-gray-900 dark:text-white">{highlightMatch(table.name)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{table.columns.length} columns</span>
          {table.rowCount !== null && (
            <span>{table.rowCount.toLocaleString()} rows</span>
          )}
          {table.primaryKeys.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded">
              {table.primaryKeys.length} PK
            </span>
          )}
          {table.foreignKeys.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
              {table.foreignKeys.length} FK
            </span>
          )}
          {table.indexes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              {table.indexes.length} IDX
            </span>
          )}
        </div>
      </button>

      {/* Table Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-[#262626]">
          {/* Columns */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {table.columns.map((column) => (
              <div
                key={column.name}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 flex justify-center">
                    {pkColumns.has(column.name) ? (
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                      </svg>
                    ) : fkColumns.has(column.name) ? (
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-[#333333]" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{highlightMatch(column.name)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded">
                    {column.dataType}
                    {column.maxLength && `(${column.maxLength})`}
                  </span>
                  {column.isIdentity && (
                    <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">AUTO</span>
                  )}
                  {!column.isNullable && (
                    <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">NOT NULL</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Foreign Keys Section */}
          {table.foreignKeys.length > 0 && (
            <div className="border-t border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#151515] px-4 py-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Foreign Keys</p>
              <div className="space-y-1.5">
                {table.foreignKeys.map((fk, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-mono bg-white dark:bg-[#111111] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                      {fk.column}
                    </span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-mono bg-white dark:bg-[#111111] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                      {fk.referencedTable}.{fk.referencedColumn}
                    </span>
                    {(fk.onDelete || fk.onUpdate) && (
                      <span className="text-gray-400">
                        ({fk.onDelete && `ON DELETE ${fk.onDelete}`}
                        {fk.onDelete && fk.onUpdate && ', '}
                        {fk.onUpdate && `ON UPDATE ${fk.onUpdate}`})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indexes Section */}
          {table.indexes.length > 0 && (
            <div className="border-t border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#151515] px-4 py-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Indexes</p>
              <div className="space-y-1.5">
                {table.indexes.map((index, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{index.name}</span>
                    <span className="text-gray-400">on</span>
                    <span className="font-mono bg-white dark:bg-[#111111] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600">
                      {index.columns.join(', ')}
                    </span>
                    {index.isUnique && (
                      <span className="text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">UNIQUE</span>
                    )}
                    {index.isClustered && (
                      <span className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">CLUSTERED</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
