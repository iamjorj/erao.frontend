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

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 40 : 48,
    overscan: 15,
  });

  const colWidth = isMobile ? 110 : 140;
  const rowNumWidth = isMobile ? 40 : 64;
  const gap = isMobile ? 8 : 12; // gap-2 vs gap-3
  const padding = isMobile ? 16 : 32; // px-2 vs px-4 (both sides)
  const minTableWidth = Math.max(
    columns.length * colWidth + rowNumWidth + columns.length * gap + padding,
    isMobile ? 300 : 600
  );

  return (
    <div className="h-full flex flex-col">
      <div
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar"
      >
        <div style={{ minWidth: `${minTableWidth}px` }}>
          {/* Table Header */}
          <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b sticky top-0 z-10 ${
            isDark
              ? "bg-[#1a1a1a] border-[#333333]"
              : "bg-gray-50 border-gray-200"
          }`}>
            <span className={`text-xs sm:text-sm font-semibold flex-shrink-0 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`} style={{ width: rowNumWidth }}>#</span>
            {columns.map((col) => (
              <span
                key={col}
                className={`text-xs sm:text-sm font-semibold truncate ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
                style={{ minWidth: colWidth, width: colWidth }}
                title={col}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Virtual rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 absolute w-full ${
                    virtualRow.index % 2 === 0
                      ? isDark ? "bg-[#0a0a0a]" : "bg-white"
                      : isDark ? "bg-[#1a1a1a]" : "bg-gray-50/50"
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <span className={`text-xs sm:text-sm flex-shrink-0 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`} style={{ width: rowNumWidth }}>
                    {virtualRow.index + 1}
                  </span>
                  {columns.map((col) => (
                    <span
                      key={col}
                      className={`text-xs sm:text-sm truncate ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                      style={{ minWidth: colWidth, width: colWidth }}
                      title={String(row[col] ?? "")}
                    >
                      {String(row[col] ?? "")}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
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
  const [manipulation, setManipulation] = useState<ChartManipulation>({
    excludedCategories: new Set(),
    columnAggregations: {},
    hiddenColumns: new Set(),
  });
  const manipulationRef = useRef<HTMLDivElement>(null);

  // Sync settings when initialChartSettings changes
  useEffect(() => {
    if (initialChartSettings) {
      setChartSettings(initialChartSettings);
    }
  }, [initialChartSettings]);

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

    // Find categorical column using same priority as DataChart
    let categoricalColumn: string | null = null;
    let categories: string[] = [];

    // First try to find columns matching priority patterns
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

    // Then find any non-numeric column with good cardinality
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

    const isCategorical = categoricalColumn !== null && categories.length >= 2;

    return {
      numericColumns,
      categoricalColumn,
      categories,
      isCategorical,
    };
  }, [columns, filteredRows]);

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
    });
  }, []);

  const hasActiveManipulations = manipulation.excludedCategories.size > 0 ||
    Object.keys(manipulation.columnAggregations).length > 0 ||
    manipulation.hiddenColumns.size > 0;

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
        {/* Chart-only mode floating exit */}
        {chartOnlyMode && (
          <button
            onClick={() => setChartOnlyMode(false)}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
              isDark
                ? 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                : 'bg-black/5 border-black/10 text-black/50 hover:bg-black/10 hover:text-black/70'
            }`}
            title="Exit focus mode (Esc)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            <span className="text-xs font-medium">Exit Focus</span>
            <kbd className={`text-[10px] px-1.5 py-0.5 rounded border ${
              isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'
            }`}>Esc</kbd>
          </button>
        )}

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
                                  value={manipulation.columnAggregations[col] || 'COUNT'}
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
