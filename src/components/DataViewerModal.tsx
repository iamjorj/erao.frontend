"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FilterModal, AdvancedFilter } from "./FilterModal";
import { ChartSettingsDropdown } from "./ChartSettingsDropdown";
import {
  DataChart,
  ChartType,
  ChartSettings,
  ChartManipulation,
  AggregationType,
  defaultChartSettings,
  getDefaultAggregationForColumn,
} from "./DataChart";

export type { ChartType };

interface DataViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  rows: Record<string, unknown>[];
  initialChartType?: ChartType;
  sqlQuery?: string;
  userQuestion?: string;
  initialChartSettings?: ChartSettings;
  onSettingsChange?: (settings: ChartSettings) => void;
  initialManipulation?: { excludedCategories: string[]; columnAggregations: Record<string, string>; hiddenColumns: string[]; groupByColumn?: string };
  preferredGroupColumn?: string;
  aiSuggestion?: string;
  onManipulationChange?: (m: ChartManipulation) => void;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  return str === "null" ? "-" : str;
}

// Dark mode detection hook
function useDarkMode(): boolean {
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

  return isDark;
}

// Virtual Table Component for the modal
function FullscreenVirtualTable({
  columns,
  rows,
  isDark,
  isMobile,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  isDark: boolean;
  isMobile: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  // Sort state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const ROW_HEIGHT = isMobile ? 36 : 40;
  const ROW_NUM_WIDTH = isMobile ? 44 : 56;

  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Smart default widths
  const defaultColWidth = useMemo(() => {
    const MIN_COL = isMobile ? 90 : 100;
    const MAX_COL = isMobile ? 200 : 300;
    const widths: Record<string, number> = {};
    for (const col of columns) {
      let maxLen = col.length;
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const len = formatCellValue(rows[i][col]).length;
        if (len > maxLen) maxLen = len;
      }
      widths[col] = Math.min(MAX_COL, Math.max(MIN_COL, maxLen * 8 + 24));
    }
    return widths;
  }, [columns, rows, isMobile]);

  const getColWidth = (col: string) => columnWidths[col] || defaultColWidth[col] || (isMobile ? 110 : 140);
  const totalTableWidth = ROW_NUM_WIDTH + columns.reduce((sum, col) => sum + getColWidth(col), 0);

  // Column resize handlers
  const handleResizeStart = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = getColWidth(col);
    resizeRef.current = { col, startX, startWidth };
    const onMove = (ev: MouseEvent) => {
      const ref = resizeRef.current;
      if (!ref) return;
      const diff = ev.clientX - ref.startX;
      const newWidth = Math.max(50, ref.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [col]: newWidth }));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [columnWidths, defaultColWidth]);

  const handleSort = useCallback((col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }, [sortCol]);

  return (
    <div className="h-full flex flex-col">
      <div
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar"
      >
        <div style={{ minWidth: `${totalTableWidth}px` }}>
          {/* Header */}
          <div className={`flex items-stretch sticky top-0 z-10 border-b ${
            isDark ? "bg-[#141414] border-[#2a2a2a]" : "bg-white border-gray-200/80"
          }`}>
            <div
              className={`flex items-center justify-center text-[10px] font-medium flex-shrink-0 border-r ${
                isDark ? "text-gray-500 border-[#2a2a2a]" : "text-gray-400 border-gray-100"
              }`}
              style={{ width: ROW_NUM_WIDTH }}
            >
              #
            </div>
            {columns.map((col) => (
              <div
                key={col}
                className="relative flex items-center group flex-shrink-0"
                style={{ width: getColWidth(col) }}
              >
                <button
                  onClick={() => handleSort(col)}
                  className={`flex items-center gap-1 w-full h-full px-3 py-2.5 text-left cursor-pointer transition-colors ${
                    isDark ? "hover:bg-[#1e1e1e]" : "hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-[11px] font-semibold uppercase tracking-wider truncate ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {col}
                  </span>
                  {sortCol === col && (
                    <svg className={`w-3 h-3 flex-shrink-0 ${isDark ? "text-gray-200" : "text-gray-900"}`} viewBox="0 0 12 12" fill="currentColor">
                      {sortDir === 'asc' ? <path d="M6 2L10 8H2L6 2Z" /> : <path d="M6 10L2 4H10L6 10Z" />}
                    </svg>
                  )}
                  {sortCol !== col && (
                    <svg className={`w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark ? "text-gray-600" : "text-gray-300"
                    }`} viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 2L9 5.5H3L6 2Z" />
                      <path d="M6 10L3 6.5H9L6 10Z" />
                    </svg>
                  )}
                </button>
                <div
                  onMouseDown={(e) => handleResizeStart(col, e)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full cursor-col-resize bg-gray-200 dark:bg-[#333] opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:!bg-blue-400 dark:hover:!bg-blue-500 active:!bg-blue-500 transition-all z-20"
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = sortedRows[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className={`flex items-stretch absolute w-full border-b transition-colors ${
                    virtualRow.index % 2 === 0
                      ? isDark ? "bg-[#141414] border-[#1e1e1e]" : "bg-white border-gray-50"
                      : isDark ? "bg-[#181818] border-[#1e1e1e]" : "bg-gray-50/40 border-gray-50"
                  } ${isDark ? "hover:bg-[#1a1f2e]" : "hover:bg-blue-50/40"}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className={`flex items-center justify-center text-[10px] tabular-nums flex-shrink-0 border-r ${
                      isDark ? "text-gray-600 border-[#1e1e1e]" : "text-gray-300 border-gray-100/60"
                    }`}
                    style={{ width: ROW_NUM_WIDTH }}
                  >
                    {virtualRow.index + 1}
                  </div>
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="flex items-center px-3 flex-shrink-0 min-w-0"
                      style={{ width: getColWidth(col) }}
                    >
                      <span
                        className={`text-[13px] truncate ${
                          row[col] === null || row[col] === undefined
                            ? isDark ? "text-gray-600 italic" : "text-gray-300 italic"
                            : typeof row[col] === 'number' || (!isNaN(Number(row[col])) && row[col] !== '' && row[col] !== null)
                              ? isDark ? "text-gray-200 tabular-nums" : "text-gray-800 tabular-nums"
                              : isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                        title={formatCellValue(row[col])}
                      >
                        {row[col] === null || row[col] === undefined ? "null" : formatCellValue(row[col])}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-end px-3 py-2 border-t ${
        isDark ? "border-[#2a2a2a] bg-[#141414]" : "border-gray-100 bg-white"
      }`}>
        <span className={`text-[11px] tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {rows.length.toLocaleString()} rows
          {sortCol && (
            <span className="ml-2">
              sorted by {sortCol} {sortDir === 'asc' ? '\u2191' : '\u2193'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}


export function DataViewerModal({
  isOpen,
  onClose,
  columns,
  rows,
  initialChartType = "table",
  sqlQuery,
  userQuestion,
  initialChartSettings,
  onSettingsChange,
  initialManipulation,
  preferredGroupColumn,
  aiSuggestion,
  onManipulationChange,
}: DataViewerModalProps) {
  const [currentView, setCurrentView] = useState<ChartType>(initialChartType);
  const isDark = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown[]>>({});
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, AdvancedFilter[]>>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(initialChartSettings || defaultChartSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showManipulation, setShowManipulation] = useState(false);
  const [chartOnlyMode, setChartOnlyMode] = useState(false);
  const [manipulation, setManipulationState] = useState<ChartManipulation>(() => ({
    excludedCategories: new Set(initialManipulation?.excludedCategories ?? []),
    columnAggregations: (initialManipulation?.columnAggregations ?? {}) as Record<string, AggregationType>,
    hiddenColumns: new Set(initialManipulation?.hiddenColumns ?? []),
    groupByColumn: initialManipulation?.groupByColumn,
  }));

  // Wrapper that syncs manipulation changes back to parent
  const setManipulation: typeof setManipulationState = useCallback((value) => {
    setManipulationState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      onManipulationChange?.(next);
      return next;
    });
  }, [onManipulationChange]);
  const manipulationRef = useRef<HTMLDivElement>(null);

  // Sync settings when initialChartSettings changes
  useEffect(() => {
    if (initialChartSettings) {
      setChartSettings(initialChartSettings);
    }
  }, [initialChartSettings]);

  // Sync manipulation when initialManipulation changes (new modal open)
  useEffect(() => {
    setManipulationState({
      excludedCategories: new Set(initialManipulation?.excludedCategories ?? []),
      columnAggregations: (initialManipulation?.columnAggregations ?? {}) as Record<string, AggregationType>,
      hiddenColumns: new Set(initialManipulation?.hiddenColumns ?? []),
      groupByColumn: initialManipulation?.groupByColumn,
    });
  }, [initialManipulation]);

  // Notify parent of settings changes
  const handleSettingsChange = useCallback((newSettings: ChartSettings) => {
    setChartSettings(newSettings);
    onSettingsChange?.(newSettings);
  }, [onSettingsChange]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Escape key exits chart-only mode first, then closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chartOnlyMode) {
          e.stopPropagation();
          setChartOnlyMode(false);
        }
      }
    };
    if (chartOnlyMode) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [chartOnlyMode]);

  // Close manipulation on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manipulationRef.current && !manipulationRef.current.contains(event.target as Node)) {
        setShowManipulation(false);
      }
    };
    if (showManipulation) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showManipulation]);

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

  // Filter rows based on active filters
  const filteredRows = useMemo(() => {
    const hasFilters = Object.keys(filters).length > 0;
    const hasAdvancedFilters = Object.keys(advancedFilters).length > 0;
    if (!hasFilters && !hasAdvancedFilters) return rows;

    return rows.filter(row => {
      // Check simple filters
      for (const [col, values] of Object.entries(filters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }
      // Check advanced filters
      for (const [col, filterArray] of Object.entries(advancedFilters)) {
        if (filterArray && filterArray.length > 0) {
          const rowValue = row[col];
          // All advanced filters for the same column must match (AND logic)
          if (!filterArray.every(filter => applyAdvancedFilter(rowValue, filter))) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rows, filters, advancedFilters, applyAdvancedFilter]);

  // Analyze data for manipulation modal - matches DataChart's findBestCategoricalColumn logic
  const dataAnalysis = useMemo(() => {
    // Find numeric columns
    const numericColumns = columns.filter((col) =>
      filteredRows.some((row) => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === "number") return true;
        const numVal = Number(val);
        return !isNaN(numVal) && isFinite(numVal);
      })
    );

    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));

    // Priority patterns for grouping columns (same as DataChart)
    const categoryPatterns = [
      'category', 'type', 'status', 'gender', 'sex', 'class', 'group', 'department',
      'region', 'country', 'state', 'city', 'branch', 'segment', 'channel',
      'product', 'brand', 'vendor', 'supplier', 'customer_type', 'user_type',
      'year', 'month', 'quarter', 'period', 'day', 'weekday'
    ];

    // Find categorical column - respect groupByColumn if set
    let categoricalColumn: string | null = null;
    let categories: string[] = [];

    if (manipulation.groupByColumn) {
      const matchedCol = columns.find(col => col.toLowerCase() === manipulation.groupByColumn!.toLowerCase());
      if (matchedCol) {
        categoricalColumn = matchedCol;
        categories = Array.from(new Set(filteredRows.map(row => String(row[matchedCol] ?? '')))).slice(0, 30);
      }
    }

    if (!categoricalColumn) {
      for (const pattern of categoryPatterns) {
        const match = nonNumericColumns.find(col => col.toLowerCase().includes(pattern));
        if (match) {
          const uniqueValues = new Set(filteredRows.map(row => String(row[match] ?? '')));
          if (uniqueValues.size >= 2 && uniqueValues.size <= 50) {
            categoricalColumn = match;
            categories = Array.from(uniqueValues).slice(0, 30);
            break;
          }
        }
      }
    }

    if (!categoricalColumn) {
      for (const col of nonNumericColumns) {
        const uniqueValues = new Set(filteredRows.map(row => String(row[col] ?? '')));
        if (uniqueValues.size >= 2 && uniqueValues.size <= 30) {
          categoricalColumn = col;
          categories = Array.from(uniqueValues).slice(0, 30);
          break;
        }
      }
    }

    // Collect all columns that could serve as group-by
    const groupableColumns: string[] = [];
    for (const col of nonNumericColumns) {
      const uniqueValues = new Set(filteredRows.slice(0, 500).map(row => String(row[col] ?? '')));
      if (uniqueValues.size >= 2 && uniqueValues.size <= 100) {
        groupableColumns.push(col);
      }
    }

    const isCategorical = categoricalColumn !== null && categories.length >= 2;

    return {
      numericColumns,
      groupableColumns,
      categoricalColumn,
      categories,
      isCategorical,
    };
  }, [columns, filteredRows, manipulation.groupByColumn]);

  // Manipulation handlers
  const toggleCategory = useCallback((category: string) => {
    setManipulation(prev => {
      const newExcluded = new Set(prev.excludedCategories);
      if (newExcluded.has(category)) {
        newExcluded.delete(category);
      } else {
        newExcluded.add(category);
      }
      return { ...prev, excludedCategories: newExcluded };
    });
  }, []);

  const toggleColumn = useCallback((column: string) => {
    setManipulation(prev => {
      const newHidden = new Set(prev.hiddenColumns);
      if (newHidden.has(column)) {
        newHidden.delete(column);
      } else {
        newHidden.add(column);
      }
      return { ...prev, hiddenColumns: newHidden };
    });
  }, []);

  const changeAggregation = useCallback((column: string, aggregation: AggregationType) => {
    setManipulation(prev => ({
      ...prev,
      columnAggregations: { ...prev.columnAggregations, [column]: aggregation },
    }));
  }, []);

  const resetManipulation = useCallback(() => {
    setManipulation({
      excludedCategories: new Set(),
      columnAggregations: {},
      hiddenColumns: new Set(),
      groupByColumn: undefined,
    });
  }, [setManipulation]);

  const hasActiveManipulations = manipulation.excludedCategories.size > 0 ||
    Object.keys(manipulation.columnAggregations).length > 0 ||
    manipulation.hiddenColumns.size > 0 ||
    !!manipulation.groupByColumn;

  const handleFilterChange = useCallback((column: string, value: unknown) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const valueStr = String(value);
      const exists = current.some(v => String(v) === valueStr);
      if (exists) {
        const newValues = current.filter(v => String(v) !== valueStr);
        if (newValues.length === 0) {
          const { [column]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [column]: newValues };
      }
      return { ...prev, [column]: [...current, value] };
    });
  }, []);

  const handleAdvancedFilterChange = useCallback((column: string, filter: AdvancedFilter | null, action?: 'add' | 'remove') => {
    setAdvancedFilters(prev => {
      const current = prev[column] || [];
      if (action === 'remove' && filter) {
        const newFilters = current.filter(f => f.id !== filter.id);
        if (newFilters.length === 0) {
          const { [column]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [column]: newFilters };
      }
      if (action === 'add' && filter) {
        return { ...prev, [column]: [...current, filter] };
      }
      return prev;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setAdvancedFilters({});
  }, []);

  // Check if data is chartable
  const hasNumericData = useMemo(() => {
    return columns.slice(1).some((col) =>
      filteredRows.some((row) => {
        const val = row[col];
        return typeof val === "number" || !isNaN(Number(val));
      })
    );
  }, [columns, filteredRows]);

  const activeFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0) +
    Object.values(advancedFilters).reduce((sum, v) => sum + (v?.length || 0), 0);

  if (!isOpen) return null;

  // Export to CSV (uses filtered rows)
  const handleExportCSV = () => {
    const headers = columns.join(",");
    const csvRows = filteredRows.map((row) =>
      columns.map((col) => {
        const val = row[col];
        const strVal = String(val ?? "");
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(",")
    );
    const csv = [headers, ...csvRows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `data-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const viewButtons: { type: ChartType; label: string; icon: React.ReactNode }[] = [
    {
      type: "table",
      label: "Table",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    },
    ...(hasNumericData ? [
      {
        type: "bar" as ChartType,
        label: "Bar",
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      },
      {
        type: "line" as ChartType,
        label: "Line",
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
      },
      {
        type: "pie" as ChartType,
        label: "Pie",
        icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8v8l5.66 5.66C14.38 19.19 13.23 20 12 20z" /></svg>,
      },
      {
        type: "area" as ChartType,
        label: "Area",
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M4 15l4-8 4 4 4-6 4 10" /></svg>,
      },
    ] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`
          w-full h-full
          flex flex-col overflow-hidden transition-colors
          ${isDark ? "bg-[#0a0a0a]" : "bg-white"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - compact */}
        {!chartOnlyMode && <div className={`flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b flex-shrink-0 ${
          isDark ? "border-[#222]" : "border-gray-200"
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h2 className={`text-sm sm:text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Data
            </h2>
            <span className={`text-[11px] sm:text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {rows.length.toLocaleString()} rows &times; {columns.length} cols
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleExportCSV}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors ${
                isDark
                  ? "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={onClose}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                isDark ? "text-gray-400 hover:bg-[#1a1a1a]" : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>}

        {/* View Toggle with Toolbar */}
        {!chartOnlyMode && <>
        <div className={`flex items-center justify-between px-2 sm:px-5 py-2 sm:py-2.5 border-b flex-shrink-0 ${
          isDark ? "border-[#1a1a1a] bg-[#111]" : "border-gray-100 bg-gray-50/50"
        }`}>
          {/* Chart Type Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {viewButtons.map((btn) => (
              <button
                key={btn.type}
                onClick={() => setCurrentView(btn.type)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex-shrink-0 flex items-center gap-2 ${
                  currentView === btn.type
                    ? isDark ? "bg-white text-gray-900" : "bg-black text-white"
                    : isDark ? "text-gray-400 hover:bg-[#1a1a1a]" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-[18px] sm:[&>svg]:h-[18px]">{btn.icon}</span>
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Toolbar: SQL, Filter, Data Adjust, Settings */}
          <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-gray-200 dark:border-[#333] relative">
            {/* SQL Button */}
            {sqlQuery && (
              <button
                onClick={() => setShowSql(!showSql)}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
                  showSql
                    ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                    : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={showSql ? "Hide SQL" : "View SQL"}
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Filter Button - only for table view */}
            {currentView === "table" && (
              <button
                onClick={() => setShowFilterModal(true)}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
                  activeFilterCount > 0
                    ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                    : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={`Filter data${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}

            {/* Data Adjust Button - only for charts */}
            {currentView !== "table" && (
              <div className="relative" ref={manipulationRef}>
                <button
                  onClick={() => { setShowSettings(false); setShowManipulation(!showManipulation); }}
                  className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
                    showManipulation || hasActiveManipulations
                      ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                      : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Adjust chart data"
                >
                  <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                  </svg>
                </button>
                {/* Mobile backdrop for manipulation */}
                {showManipulation && (
                  <div
                    className="fixed inset-0 bg-black/30 sm:bg-transparent z-40"
                    onClick={() => setShowManipulation(false)}
                  />
                )}
                {/* Manipulation Modal */}
                {showManipulation && (
                  <div
                    className={`fixed z-50 rounded-t-2xl sm:rounded-xl shadow-lg p-4 pb-8 sm:pb-4 overflow-y-auto
                      inset-x-0 bottom-0 max-h-[75vh]
                      sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-80 sm:max-h-[80vh] ${
                      isDark ? 'bg-[#1f1f1f] border border-[#333]' : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Mobile drag handle */}
                    <div className="sm:hidden flex justify-center mb-3">
                      <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                    </div>
                    <div className="space-y-4">
                      <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider pb-2 border-b flex items-center justify-between ${
                        isDark ? 'text-gray-400 border-[#333]' : 'text-gray-400 border-gray-100'
                      }`}>
                        <span>Data Settings</span>
                        <div className="flex items-center gap-2">
                          {hasActiveManipulations && (
                            <button
                              onClick={resetManipulation}
                              className={`text-[10px] sm:text-xs transition-colors ${
                                isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                              }`}
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => setShowManipulation(false)}
                            className={`sm:hidden p-1 rounded-md ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* AI Suggestion */}
                      {aiSuggestion && (
                        <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${isDark ? 'bg-indigo-950/30 border border-indigo-900/40' : 'bg-indigo-50 border border-indigo-100'}`}>
                          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                          {manipulation.groupByColumn === aiSuggestion ? (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex-1">AI grouped by <strong>{aiSuggestion}</strong></span>
                          ) : (
                            <>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex-1">AI suggests: <strong>{aiSuggestion}</strong></span>
                              <button onClick={() => setManipulation({ ...manipulation, groupByColumn: aiSuggestion, excludedCategories: new Set() })} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors font-medium">Apply</button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Group By */}
                      {dataAnalysis.groupableColumns.length > 0 && (
                        <div>
                          <label className={`text-[11px] font-medium uppercase tracking-wider block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Group By
                          </label>
                          <select
                            value={manipulation.groupByColumn || ''}
                            onChange={(e) => setManipulation({ ...manipulation, groupByColumn: e.target.value || undefined, excludedCategories: new Set() })}
                            className={`w-full text-[11px] rounded-lg px-2.5 py-1.5 outline-none ${
                              isDark
                                ? 'bg-[#222] border border-[#333] text-gray-200 focus:border-[#444]'
                                : 'bg-gray-50 border border-gray-200 text-gray-700 focus:border-gray-300'
                            }`}
                          >
                            <option value="">Auto (default)</option>
                            {dataAnalysis.groupableColumns.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Columns - Show/Hide */}
                      {dataAnalysis.numericColumns.length > 1 && (
                        <div>
                          <label className={`text-[11px] font-medium uppercase tracking-wider block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Visible Columns
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {dataAnalysis.numericColumns.map((col) => {
                              const isHidden = manipulation.hiddenColumns.has(col);
                              return (
                                <button
                                  key={col}
                                  onClick={() => toggleColumn(col)}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                                    isHidden
                                      ? isDark
                                        ? 'text-gray-600 bg-transparent border border-dashed border-[#333]'
                                        : 'text-gray-400 bg-transparent border border-dashed border-gray-200'
                                      : isDark
                                        ? 'text-gray-200 bg-[#222] border border-[#333]'
                                        : 'text-gray-700 bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  {col.length > 14 ? col.substring(0, 14) + '...' : col}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Categories - Include/Exclude */}
                      {dataAnalysis.isCategorical && dataAnalysis.categories.length > 0 && (
                        <div>
                          <label className={`text-[11px] font-medium uppercase tracking-wider block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Filter Categories
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {dataAnalysis.categories.slice(0, 15).map((cat) => {
                              const isExcluded = manipulation.excludedCategories.has(cat);
                              return (
                                <button
                                  key={cat}
                                  onClick={() => toggleCategory(cat)}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                                    isExcluded
                                      ? isDark
                                        ? 'text-gray-600 bg-transparent border border-dashed border-[#333] line-through'
                                        : 'text-gray-400 bg-transparent border border-dashed border-gray-200 line-through'
                                      : isDark
                                        ? 'text-gray-200 bg-[#222] border border-[#333]'
                                        : 'text-gray-700 bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  {cat.length > 12 ? cat.substring(0, 12) + '...' : cat}
                                </button>
                              );
                            })}
                            {dataAnalysis.categories.length > 15 && (
                              <span className={`px-2 py-1 text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                +{dataAnalysis.categories.length - 15} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Aggregation - show when there are numeric columns */}
                      {dataAnalysis.numericColumns.length > 0 && (
                        <div>
                          <label className={`text-[11px] font-medium uppercase tracking-wider block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Aggregation
                          </label>
                          <div className="space-y-1.5">
                            {dataAnalysis.numericColumns.filter(col => !manipulation.hiddenColumns.has(col)).map((col) => (
                              <div key={col} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-[#222]' : 'bg-gray-50'}`}>
                                <span className={`text-[11px] min-w-0 truncate flex-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {col}
                                </span>
                                <select
                                  value={manipulation.columnAggregations[col] || getDefaultAggregationForColumn(col, filteredRows)}
                                  onChange={(e) => changeAggregation(col, e.target.value as AggregationType)}
                                  className={`text-[11px] rounded-md px-1.5 py-1 outline-none ${
                                    isDark
                                      ? 'bg-[#1a1a1a] border border-[#333] text-gray-200 focus:border-[#444]'
                                      : 'bg-white border border-gray-200 text-gray-700 focus:border-gray-300'
                                  }`}
                                >
                                  <option value="COUNT">Count</option>
                                  <option value="SUM">Sum</option>
                                  <option value="AVG">Average</option>
                                  <option value="MIN">Min</option>
                                  <option value="MAX">Max</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!dataAnalysis.isCategorical && dataAnalysis.numericColumns.length <= 1 && (
                        <div className={`text-[11px] text-center py-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          No adjustable options for this data
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Button - only for charts */}
            {currentView !== "table" && (
              <>
                <button
                  onClick={() => { setShowManipulation(false); setShowSettings(!showSettings); }}
                  className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
                    showSettings
                      ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                      : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Chart settings"
                >
                  <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {showSettings && (
                  <ChartSettingsDropdown
                    settings={chartSettings}
                    onSettingsChange={handleSettingsChange}
                    onClose={() => setShowSettings(false)}
                    chartType={currentView}
                  />
                )}
              </>
            )}

            {/* Focus Mode Button - chart only fullscreen */}
            {currentView !== "table" && (
              <button
                onClick={() => setChartOnlyMode(true)}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Focus mode (chart only)"
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* SQL Panel */}
        {showSql && sqlQuery && (
          <div className={`px-3 sm:px-5 py-2 border-b flex-shrink-0 ${isDark ? 'bg-[#0f0f0f] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
            <pre className={`text-xs font-mono whitespace-pre-wrap max-h-[20vh] overflow-y-auto custom-scrollbar ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {sqlQuery}
            </pre>
          </div>
        )}

        {/* Active Filters Bar */}
        {activeFilterCount > 0 && (
          <div className={`px-3 sm:px-5 py-1.5 border-b flex items-center gap-2 flex-wrap ${
            isDark ? 'bg-[#0f0f0f] border-[#222]' : 'bg-gray-50 border-gray-200'
          }`}>
            <span className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Filters ({filteredRows.length} of {rows.length}):
            </span>
            {Object.entries(filters).map(([col, values]) =>
              values?.map((val, idx) => (
                <span
                  key={`${col}-${idx}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    isDark ? 'bg-[#333] text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{col}:</span>
                  <span className="max-w-[60px] truncate">{formatCellValue(val)}</span>
                  <button
                    onClick={() => handleFilterChange(col, val)}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))
            )}
            <button
              onClick={handleClearFilters}
              className={`text-[10px] font-medium ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}
            >
              Clear all
            </button>
          </div>
        )}
        </>}

        {/* Content Area - takes ALL remaining space */}
        <div className={`flex-1 min-h-0 overflow-hidden ${
          currentView !== "table"
            ? isDark ? "bg-[#0d0d0d]" : "bg-gray-100"
            : ""
        }`}>
          {currentView === "table" ? (
            <FullscreenVirtualTable columns={columns} rows={filteredRows} isDark={isDark} isMobile={isMobile} />
          ) : (
            <div className={`w-full h-full ${chartOnlyMode ? 'p-0' : 'p-3 sm:p-5'}`}>
              <DataChart
                data={filteredRows}
                columns={columns}
                chartType={currentView}
                settings={chartSettings}
                manipulation={manipulation}
                onManipulationChange={setManipulation}
                fillContainer={true}
                borderless={chartOnlyMode}
                preferredGroupColumn={preferredGroupColumn}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal
          columns={columns}
          rows={rows}
          filters={filters}
          advancedFilters={advancedFilters}
          onFilterChange={handleFilterChange}
          onAdvancedFilterChange={handleAdvancedFilterChange}
          onClearFilters={handleClearFilters}
          onClose={() => setShowFilterModal(false)}
          showExport={true}
          showAdvancedFilters={true}
        />
      )}
    </div>
  );
}
