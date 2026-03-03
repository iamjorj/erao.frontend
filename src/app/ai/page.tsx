"use client";

// Dev-only logger — silenced in production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const devError: (...args: any[]) => void = process.env.NODE_ENV === 'development'
  ? (...args) => console.error(...args)
  : () => {};

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
  isUserMessage,
  getFileTypeName,
  getDatabaseTypeName,
  isCompleted,
  isFailed,
  isProcessing,
  getTierName,
  ClarificationRequest,
  AppConnectorDto,
} from "@/lib/api";
import { connectorDefinitions, getConnectorByTypeIndex } from "@/lib/connectors";
import { motion, AnimatePresence } from "framer-motion";
import { DataChart, ChartType, detectChartType, ChartSettings, defaultChartSettings, ChartManipulation, AggregationType, getDefaultAggregationForColumn } from "@/components/DataChart";
import { DataViewerModal } from "@/components/DataViewerModal";
import { MarkdownResponse } from "@/components/MarkdownResponse";
import { FilterModal, FilterOperator, AdvancedFilter } from "@/components/FilterModal";
import { ChartSettingsDropdown } from "@/components/ChartSettingsDropdown";
import SettingsBottomNav from "@/components/SettingsBottomNav";
import InsightCard from "@/components/InsightCard";
import FollowUpChips from "@/components/FollowUpChips";
import { useVirtualizer } from "@tanstack/react-virtual";

// Helper to strip SQL/JSON/viz code blocks from AI response text
// Keeps ```text blocks — those are intentional "show sql" responses rendered by MarkdownResponse
function stripCodeBlocks(content: string): string {
  return content
    .replace(/```sql[\s\S]*?```/gi, "") // Remove SQL code blocks (auto-executed)
    .replace(/```json[\s\S]*?```/gi, "") // Remove JSON code blocks
    .replace(/```viz[\s\S]*?```/gi, "") // Remove viz code blocks
    .replace(/```clarification[\s\S]*?```/gi, "") // Remove clarification code blocks
    .replace(/```(?:sql|json|viz|clarification)[\s\S]*$/gi, "") // Remove unclosed code blocks (no closing ```)
    .replace(/\{"chart"\s*:\s*"[^"]*"\s*,\s*"group"\s*:[\s\S]*?"agg"\s*:\s*"[^"]*"\s*\}\s*\]\s*\}?\s*\}?/gi, "") // Remove inline viz JSON
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

function SqlPanel({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mx-3 mt-3 mb-2 rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80 dark:bg-white/[0.03] border-b border-gray-200/80 dark:border-white/[0.06]">
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">SQL</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-white dark:bg-white/[0.03] text-[12px] leading-relaxed">
        <code className="text-gray-700 dark:text-gray-300 font-mono whitespace-pre">{sql}</code>
      </pre>
    </div>
  );
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

// Virtual Table Component for handling large datasets
function VirtualTable({
  columns,
  rows,
  filters = {},
  advancedFilters,
  truncated,
  maxRows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  filters?: Record<string, unknown[]>;
  advancedFilters?: Record<string, AdvancedFilter[]>;
  truncated?: boolean;
  maxRows?: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  // Sort state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  // Apply filters then sort
  const processedRows = useMemo(() => {
    const hasSimpleFilters = filters && Object.keys(filters).length > 0;
    const hasAdvancedFilters = advancedFilters && Object.keys(advancedFilters).some(col => advancedFilters[col]?.length > 0);

    let result = rows;
    if (hasSimpleFilters || hasAdvancedFilters) {
      result = rows.filter(row => {
        if (hasSimpleFilters) {
          for (const [col, values] of Object.entries(filters)) {
            if (values && values.length > 0) {
              const rowValue = String(row[col]);
              if (!values.some(v => String(v) === rowValue)) return false;
            }
          }
        }
        if (hasAdvancedFilters && advancedFilters) {
          for (const [col, filterArray] of Object.entries(advancedFilters)) {
            if (filterArray && filterArray.length > 0) {
              for (const filter of filterArray) {
                if (filter && filter.value) {
                  if (!applyAdvancedFilter(row[col], filter)) return false;
                }
              }
            }
          }
        }
        return true;
      });
    }

    // Sort
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortCol];
        const bVal = b[sortCol];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? bNum - aNum : aNum - bNum;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? -cmp : cmp;
      });
    }

    return result;
  }, [rows, filters, advancedFilters, applyAdvancedFilter, sortCol, sortDir]);

  const ROW_HEIGHT = 36;

  const rowVirtualizer = useVirtualizer({
    count: processedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // Container width measurement
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Smart default column widths based on content
  const defaultColWidth = useMemo(() => {
    const MIN_COL = 80;
    const MAX_COL = 280;
    const widths: Record<string, number> = {};
    for (const col of columns) {
      // Sample first 20 rows to estimate width
      let maxLen = col.length;
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const len = formatCellValue(rows[i][col]).length;
        if (len > maxLen) maxLen = len;
      }
      widths[col] = Math.min(MAX_COL, Math.max(MIN_COL, maxLen * 8 + 24));
    }
    return widths;
  }, [columns, rows]);

  const getColWidth = (col: string) => columnWidths[col] || defaultColWidth[col] || 120;

  const ROW_NUM_WIDTH = 48;
  const totalTableWidth = ROW_NUM_WIDTH + columns.reduce((sum, col) => sum + getColWidth(col), 0);
  const needsScroll = totalTableWidth > containerWidth;

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

  // Sort handler
  const handleSort = useCallback((col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }, [sortCol]);

  // Filter counts
  const simpleFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);
  const advancedFilterCount = advancedFilters
    ? Object.values(advancedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;
  const hasActiveFilters = simpleFilterCount > 0 || advancedFilterCount > 0;
  const activeFilterCount = simpleFilterCount + advancedFilterCount;

  return (
    <div className="overflow-hidden">
      {/* Scroll container */}
      <div
        ref={parentRef}
        className="max-h-[60vh] sm:max-h-[420px] overflow-auto custom-scrollbar"
      >
        <div style={{ minWidth: needsScroll ? `${totalTableWidth}px` : undefined }}>
          {/* Header */}
          <div className="flex items-stretch sticky top-0 z-10 bg-gray-50/80 dark:bg-white/[0.03] border-b border-gray-200/60 dark:border-white/[0.06] backdrop-blur-sm">
            {/* Row number header */}
            <div
              className="flex items-center justify-center text-[10px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0 border-r border-gray-100 dark:border-white/[0.08]"
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
                  className="flex items-center gap-1 w-full h-full px-3 py-2 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
                    {col}
                  </span>
                  {sortCol === col && (
                    <svg className="w-3 h-3 flex-shrink-0 text-gray-900 dark:text-gray-200" viewBox="0 0 12 12" fill="currentColor">
                      {sortDir === 'asc' ? (
                        <path d="M6 2L10 8H2L6 2Z" />
                      ) : (
                        <path d="M6 10L2 4H10L6 10Z" />
                      )}
                    </svg>
                  )}
                  {sortCol !== col && (
                    <svg className="w-3 h-3 flex-shrink-0 text-gray-300 dark:text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 2L9 5.5H3L6 2Z" />
                      <path d="M6 10L3 6.5H9L6 10Z" />
                    </svg>
                  )}
                </button>
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => handleResizeStart(col, e)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full cursor-col-resize bg-gray-200 dark:bg-white/10 hidden sm:block opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:!bg-blue-400 dark:hover:!bg-blue-500 active:!bg-blue-500 transition-all z-20"
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = processedRows[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className={`flex items-stretch absolute w-full border-b border-gray-50 dark:border-white/[0.05] transition-colors ${
                    virtualRow.index % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-gray-50/50 dark:bg-white/[0.02]"
                  } hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.08]`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* Row number */}
                  <div
                    className="flex items-center justify-center text-[10px] tabular-nums text-gray-300 dark:text-gray-600 flex-shrink-0 border-r border-gray-100/60 dark:border-white/[0.05]"
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
                            ? "text-gray-300 dark:text-gray-600 italic"
                            : typeof row[col] === 'number' || (!isNaN(Number(row[col])) && row[col] !== '' && row[col] !== null)
                              ? "text-gray-800 dark:text-gray-200 tabular-nums"
                              : "text-gray-700 dark:text-gray-300"
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
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {truncated && (
            <span className="text-amber-500 dark:text-amber-400 mr-2">
              Limited to {maxRows?.toLocaleString() || '100,000'} rows
            </span>
          )}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
          {hasActiveFilters ? (
            <>
              {processedRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows
              <span className="ml-1 text-blue-500 dark:text-blue-400">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''})</span>
            </>
          ) : (
            `${rows.length.toLocaleString()} rows`
          )}
          {sortCol && (
            <span className="ml-2 text-gray-400 dark:text-gray-500">
              sorted by {sortCol} {sortDir === 'asc' ? '\u2191' : '\u2193'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// Shared Data Settings panel for chart manipulation (used in both inline charts and fullscreen modal)
function ChartDataSettings({
  columns,
  rows,
  manipulation,
  onManipulationChange,
  onReset,
  onClose,
  hasActive,
  aiSuggestion,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  manipulation: ChartManipulation;
  onManipulationChange: (m: ChartManipulation) => void;
  onReset: () => void;
  onClose: () => void;
  hasActive: boolean;
  aiSuggestion?: string;
}) {
  const analysis = useMemo(() => {
    const numericColumns = columns.filter((col) =>
      rows.some((row) => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === "number") return true;
        const numVal = Number(val);
        return !isNaN(numVal) && isFinite(numVal);
      })
    );
    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));
    const categoryPatterns = [
      'category', 'type', 'status', 'gender', 'sex', 'class', 'group', 'department',
      'region', 'country', 'state', 'city', 'branch', 'segment', 'channel',
      'product', 'brand', 'vendor', 'supplier', 'customer_type', 'user_type',
      'year', 'month', 'quarter', 'period', 'day', 'weekday'
    ];
    let categoricalColumn: string | null = null;
    let categories: string[] = [];
    if (manipulation.groupByColumn) {
      const matchedCol = columns.find(col => col.toLowerCase() === manipulation.groupByColumn!.toLowerCase());
      if (matchedCol) {
        categoricalColumn = matchedCol;
        categories = Array.from(new Set(rows.map(row => String(row[matchedCol] ?? '')))).slice(0, 30);
      }
    }
    if (!categoricalColumn) {
      for (const pattern of categoryPatterns) {
        const match = nonNumericColumns.find(col => col.toLowerCase().includes(pattern));
        if (match) {
          const uniqueValues = new Set(rows.map(row => String(row[match] ?? '')));
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
        const uniqueValues = new Set(rows.map(row => String(row[col] ?? '')));
        if (uniqueValues.size >= 2 && uniqueValues.size <= 30) {
          categoricalColumn = col;
          categories = Array.from(uniqueValues).slice(0, 30);
          break;
        }
      }
    }
    const groupableColumns: string[] = [];
    for (const col of nonNumericColumns) {
      const uniqueValues = new Set(rows.slice(0, 500).map(row => String(row[col] ?? '')));
      if (uniqueValues.size >= 2 && uniqueValues.size <= 100) {
        groupableColumns.push(col);
      }
    }
    return {
      numericColumns,
      groupableColumns,
      categoricalColumn,
      categories,
      isCategorical: categoricalColumn !== null && categories.length >= 2,
    };
  }, [columns, rows, manipulation.groupByColumn]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 sm:bg-transparent z-40" onClick={onClose} />
      <div className="fixed z-50 bg-white dark:bg-[#0c0c0e] border border-gray-200/50 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-y-auto overflow-x-hidden custom-scrollbar
        inset-x-0 bottom-0 rounded-t-2xl p-5 pb-8 max-h-[75vh]
        sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:pb-5 sm:w-[280px] sm:max-h-[80vh]">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-8 h-1 bg-gray-200 dark:bg-white/10 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data Settings</h3>
          <div className="flex items-center gap-1.5">
            {hasActive && (
              <button onClick={onReset} className="text-[10px] px-2 py-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">Reset</button>
            )}
            <button onClick={onClose} className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-400 dark:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="space-y-5">
          {aiSuggestion && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
              {manipulation.groupByColumn === aiSuggestion ? (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex-1">AI grouped by <strong>{aiSuggestion}</strong></span>
              ) : (
                <>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex-1">AI suggests: <strong>{aiSuggestion}</strong></span>
                  <button onClick={() => onManipulationChange({ ...manipulation, groupByColumn: aiSuggestion, excludedCategories: new Set() })} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors font-medium">Apply</button>
                </>
              )}
            </div>
          )}
          {analysis.groupableColumns.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Group By</label>
              <select
                value={manipulation.groupByColumn || ''}
                onChange={(e) => onManipulationChange({ ...manipulation, groupByColumn: e.target.value || undefined, excludedCategories: new Set() })}
                className="w-full text-[11px] rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.10] text-gray-700 dark:text-gray-200 outline-none focus:border-gray-300 dark:focus:border-white/20"
              >
                <option value="">Auto (default)</option>
                {analysis.groupableColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}
          {analysis.numericColumns.length > 1 && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Visible Columns</label>
              <div className="flex flex-wrap gap-1.5">
                {analysis.numericColumns.map((col) => {
                  const isHidden = manipulation.hiddenColumns.has(col);
                  return (
                    <button key={col} onClick={() => { const newHidden = new Set(manipulation.hiddenColumns); if (isHidden) newHidden.delete(col); else newHidden.add(col); onManipulationChange({ ...manipulation, hiddenColumns: newHidden }); }}
                      className={`px-2 py-1 text-[11px] rounded-lg transition-all ${isHidden ? 'text-gray-400 dark:text-gray-600 bg-transparent border border-dashed border-gray-200 dark:border-white/[0.10]' : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.10]'}`}
                    >{col.length > 14 ? col.substring(0, 14) + '...' : col}</button>
                  );
                })}
              </div>
            </div>
          )}
          {analysis.isCategorical && analysis.categories.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Filter Categories</label>
              <div className="flex flex-wrap gap-1.5">
                {analysis.categories.slice(0, 15).map((cat) => {
                  const isExcluded = manipulation.excludedCategories.has(cat);
                  return (
                    <button key={cat} onClick={() => { const newExcluded = new Set(manipulation.excludedCategories); if (isExcluded) newExcluded.delete(cat); else newExcluded.add(cat); onManipulationChange({ ...manipulation, excludedCategories: newExcluded }); }}
                      className={`px-2 py-1 text-[11px] rounded-lg transition-all ${isExcluded ? 'text-gray-400 dark:text-gray-600 bg-transparent border border-dashed border-gray-200 dark:border-white/[0.10] line-through' : 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.10]'}`}
                    >{cat.length > 12 ? cat.substring(0, 12) + '...' : cat}</button>
                  );
                })}
                {analysis.categories.length > 15 && (
                  <span className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-600">+{analysis.categories.length - 15} more</span>
                )}
              </div>
            </div>
          )}
          {analysis.numericColumns.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Aggregation</label>
              <div className="space-y-1.5">
                {analysis.numericColumns.filter(col => !manipulation.hiddenColumns.has(col)).map((col) => (
                  <div key={col} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.06]">
                    <span className="text-[11px] min-w-0 truncate flex-1 text-gray-600 dark:text-gray-300">{col}</span>
                    <select value={manipulation.columnAggregations[col] || getDefaultAggregationForColumn(col, rows)} onChange={(e) => onManipulationChange({ ...manipulation, columnAggregations: { ...manipulation.columnAggregations, [col]: e.target.value as AggregationType } })}
                      className="text-[11px] rounded-md px-1.5 py-1 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.10] text-gray-700 dark:text-gray-200 outline-none focus:border-gray-300 dark:focus:border-white/20"
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
          {!analysis.isCategorical && analysis.numericColumns.length <= 1 && (
            <div className="text-[11px] text-center py-4 text-gray-400 dark:text-gray-600">No adjustable options for this data</div>
          )}
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">("uploading");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connector state
  const [connectors, setConnectors] = useState<import("@/lib/api").AppConnectorDto[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [showConnectorSetup, setShowConnectorSetup] = useState<string | null>(null);

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
    type: 'conversation' | 'database' | 'connector';
    id: string;
    name: string;
  } | null>(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile sidebar open state (for overlay on mobile)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Mobile navigation: 'chats' shows full-page conversation list, 'chat' shows active conversation
  const [mobileView, setMobileView] = useState<'chats' | 'chat'>('chats');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Chart view state - tracks view mode per message
  const [chartViews, setChartViews] = useState<Record<string, ChartType>>({});
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());
  const [clarificationOptions, setClarificationOptions] = useState<Record<string, ClarificationRequest>>({});
  const [messageInsights, setMessageInsights] = useState<Record<string, string>>({});
  const [followUpQuestions, setFollowUpQuestions] = useState<Record<string, string[]>>({});

  // Populate insights & follow-ups from loaded messages (persisted in DB)
  useEffect(() => {
    const insights: Record<string, string> = {};
    const followUps: Record<string, string[]> = {};
    for (const msg of messages) {
      if (msg.insight) insights[msg.id] = msg.insight;
      if (msg.followUpQuestions?.length) followUps[msg.id] = msg.followUpQuestions;
    }
    if (Object.keys(insights).length) setMessageInsights(prev => ({ ...insights, ...prev }));
    if (Object.keys(followUps).length) setFollowUpQuestions(prev => ({ ...followUps, ...prev }));
  }, [messages]);

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
  const [showChartManipulation, setShowChartManipulation] = useState<string | null>(null); // viewKey of open manipulation dropdown
  const [chartManipulations, setChartManipulations] = useState<Record<string, ChartManipulation>>({}); // manipulation state per viewKey
  const [chartGroupColumns, setChartGroupColumns] = useState<Record<string, string>>({}); // AI-preferred group column per viewKey (kept for expand/viewer compat)
  const [chartAiSuggestions, setChartAiSuggestions] = useState<Record<string, { groupBy?: string }>>({}); // AI suggestions (opt-in, not auto-applied)

  // Manipulation handlers
  const getManipulation = useCallback((viewKey: string): ChartManipulation => {
    return chartManipulations[viewKey] || {
      excludedCategories: new Set(),
      columnAggregations: {},
      hiddenColumns: new Set(),
    };
  }, [chartManipulations]);

  const setManipulation = useCallback((viewKey: string, manipulation: ChartManipulation) => {
    setChartManipulations(prev => ({ ...prev, [viewKey]: manipulation }));
  }, []);

  const resetManipulation = useCallback((viewKey: string) => {
    setChartManipulations(prev => {
      const { [viewKey]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const hasActiveManipulation = useCallback((viewKey: string): boolean => {
    const m = chartManipulations[viewKey];
    if (!m) return false;
    return m.excludedCategories.size > 0 ||
           Object.keys(m.columnAggregations).length > 0 ||
           m.hiddenColumns.size > 0 ||
           !!m.groupByColumn;
  }, [chartManipulations]);

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
    userQuestion?: string;
    viewKey: string;
    initialManipulation?: { excludedCategories: string[]; columnAggregations: Record<string, string>; hiddenColumns: string[]; groupByColumn?: string };
    preferredGroupColumn?: string;
    aiSuggestion?: string;
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
    loadConnectors();
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
      devError("Failed to refresh conversations:", err);
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
              if (convResponse.data.appConnectorId) {
                setSelectedConnectorId(convResponse.data.appConnectorId);
                setSelectedDatabaseId(null);
                setSelectedFileId(null);
              } else if (convResponse.data.databaseConnectionId) {
                setSelectedDatabaseId(convResponse.data.databaseConnectionId);
                setSelectedFileId(null);
                setSelectedConnectorId(null);
              } else if (convResponse.data.fileDocumentId) {
                setSelectedFileId(convResponse.data.fileDocumentId);
                setSelectedDatabaseId(null);
                setSelectedConnectorId(null);
              }
            }
          } catch {
            devError("Failed to load saved conversation");
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
      devError("Failed to load conversations:", err);
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
      devError("Failed to load databases:", err);
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
      devError("Failed to load files:", err);
    }
  };

  const loadConnectors = async () => {
    try {
      const response = await api.getConnectors();
      if (response.success) {
        setConnectors(response.data);
      }
    } catch (err) {
      devError("Failed to load connectors:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setUploadPhase("uploading");
    setError(null);

    try {
      const response = await api.uploadFile(file, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) setUploadPhase("processing");
      });
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
      setUploadProgress(0);
      setUploadingFileName("");
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
      devError("Failed to delete file:", err);
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
        // Set the appropriate data source (database, file, or connector)
        if (response.data.appConnectorId) {
          setSelectedConnectorId(response.data.appConnectorId);
          setSelectedDatabaseId(null);
          setSelectedFileId(null);
        } else if (response.data.databaseConnectionId) {
          setSelectedDatabaseId(response.data.databaseConnectionId);
          setSelectedFileId(null);
          setSelectedConnectorId(null);
        } else if (response.data.fileDocumentId) {
          setSelectedFileId(response.data.fileDocumentId);
          setSelectedDatabaseId(null);
          setSelectedConnectorId(null);
        }
      }
    } catch (err) {
      devError("Failed to load conversation:", err);
      setError("Failed to load conversation");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const createNewConversation = async () => {
    // Need either a database, file, or connector selected
    if (!selectedDatabaseId && !selectedFileId && !selectedConnectorId) {
      setShowDatabaseModal(true);
      return;
    }

    // Reset sending state from any in-flight request (same as selectConversation)
    setIsSending(false);
    setCurrentPhase(null);
    if (phaseTimeoutsRef.current.writing) clearTimeout(phaseTimeoutsRef.current.writing);
    if (phaseTimeoutsRef.current.executing) clearTimeout(phaseTimeoutsRef.current.executing);
    phaseTimeoutsRef.current = {};
    setError(null);

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

  const sendMessageDirect = (text: string) => {
    setInputValue(text);
    // Use rAF to let React flush the state update, then submit the form
    requestAnimationFrame(() => {
      const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
      form?.requestSubmit();
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);
    setError(null);

    // Need either a database, file, or connector selected
    if (!selectedDatabaseId && !selectedFileId && !selectedConnectorId) {
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
          appConnectorId: selectedConnectorId || undefined,
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
      // Only update currentPhase if user is still viewing this conversation
      phaseTimeoutsRef.current.writing = setTimeout(() => {
        // Update phase in pending messages ref (always, for background indicator)
        const pending = pendingMessagesRef.current.get(requestConversationId);
        if (pending) pendingMessagesRef.current.set(requestConversationId, { ...pending, phase: "writing" });
        // Only update visible phase if still on same conversation
        if (selectedConversationIdRef.current === requestConversationId) {
          setCurrentPhase("writing");
        }
      }, 500);
      phaseTimeoutsRef.current.executing = setTimeout(() => {
        const pending = pendingMessagesRef.current.get(requestConversationId);
        if (pending) pendingMessagesRef.current.set(requestConversationId, { ...pending, phase: "executing" });
        if (selectedConversationIdRef.current === requestConversationId) {
          setCurrentPhase("executing");
        }
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

        // Layer 2: Store clarification options if AI returned them
        if (response.data.clarification) {
          setClarificationOptions(prev => ({
            ...prev,
            [response.data.assistantMessage.id]: response.data.clarification!,
          }));
        }

        // Layer 3: Store insight and follow-up questions if returned
        if (response.data.insight) {
          setMessageInsights(prev => ({ ...prev, [response.data.assistantMessage.id]: response.data.insight! }));
        }
        if (response.data.followUpQuestions?.length) {
          setFollowUpQuestions(prev => ({ ...prev, [response.data.assistantMessage.id]: response.data.followUpQuestions! }));
        }

        // Check if user requested a specific chart type
        const requestedChartType = detectRequestedChartType(messageContent);
        if (requestedChartType && response.data.assistantMessage.queryResult) {
          setChartViews((prevViews) => ({
            ...prevViews,
            [response.data.assistantMessage.id]: requestedChartType,
          }));
        } else if (response.data.visualizationHint && response.data.assistantMessage.queryResult) {
          // Use visualization hint from AI (included in single API call - no extra tokens!)
          const hint = response.data.visualizationHint;

          // Apply recommended chart type
          if (hint.chartType) {
            setChartViews((prevViews) => ({
              ...prevViews,
              [response.data.assistantMessage.id]: hint.chartType,
            }));
          }

          // Store AI suggestion for display in Data Settings
          if (hint.groupByColumn) {
            const groupCol = hint.groupByColumn;
            setChartAiSuggestions(prev => ({
              ...prev,
              [response.data.assistantMessage.id]: { groupBy: groupCol },
            }));
          }

          // Build the full manipulation in one shot (avoids race conditions from multiple setState calls)
          const manipulationUpdate: Partial<ChartManipulation> = {};

          // Apply AI group suggestion as default
          if (hint.groupByColumn) {
            manipulationUpdate.groupByColumn = hint.groupByColumn;
          }

          // Apply aggregation settings AND column filtering from viz hint
          if (hint.valueColumns && hint.valueColumns.length > 0) {
            const newAggregations: Record<string, AggregationType> = {};
            const hintColumnNamesLower = new Set(hint.valueColumns.map(vc => vc.column.toLowerCase()));

            hint.valueColumns.forEach(vc => {
              if (vc.aggregation && vc.aggregation !== 'NONE') {
                newAggregations[vc.column] = vc.aggregation as AggregationType;
              }
            });

            if (Object.keys(newAggregations).length > 0) {
              manipulationUpdate.columnAggregations = newAggregations;
            }

            // Compute columns to hide: all numeric columns NOT recommended by the AI
            const queryResult = response.data.assistantMessage.queryResult;
            const parsedResults = parseQueryResult(queryResult);
            const hiddenColumns = new Set<string>();

            if (parsedResults && parsedResults.length > 0) {
              const result = parsedResults[0];
              const groupColLower = (hint.groupByColumn || '').toLowerCase();

              const hintColumnsExist = result.columns.some(col =>
                hintColumnNamesLower.has(col.toLowerCase())
              );

              if (hintColumnsExist) {
                result.columns.forEach(col => {
                  const colLower = col.toLowerCase();
                  if (colLower === groupColLower) return;
                  if (hintColumnNamesLower.has(colLower)) return;
                  const isNumeric = result.rows.slice(0, 10).some(row => {
                    const val = row[col];
                    if (val === null || val === undefined || val === '') return false;
                    if (typeof val === 'number') return true;
                    return !isNaN(Number(val)) && isFinite(Number(val));
                  });
                  if (isNumeric) {
                    hiddenColumns.add(col);
                  }
                });
              }
            }

            if (hiddenColumns.size > 0) {
              manipulationUpdate.hiddenColumns = hiddenColumns;
            }
          }

          // Apply all manipulation updates in a single setState call
          if (Object.keys(manipulationUpdate).length > 0) {
            setChartManipulations(prev => {
              const existing = prev[response.data.assistantMessage.id];
              return {
                ...prev,
                [response.data.assistantMessage.id]: {
                  excludedCategories: existing?.excludedCategories ?? new Set(),
                  columnAggregations: existing?.columnAggregations ?? {},
                  hiddenColumns: existing?.hiddenColumns ?? new Set(),
                  ...manipulationUpdate,
                },
              };
            });
          }
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

  const handleClarificationClick = (messageId: string, optionValue: string) => {
    // Remove clarification card (one-shot)
    setClarificationOptions(prev => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
    // Send the option value as a new user message
    setInputValue(optionValue);
    // Use a small delay to let state update, then submit
    setTimeout(() => {
      const form = document.querySelector('form[data-chat-form]') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 50);
  };

  const handleFollowUpClick = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      const form = document.querySelector('form[data-chat-form]') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 50);
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
      devError("Failed to rename conversation:", err);
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
      devError("Failed to delete conversation:", err);
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
      devError("Failed to delete database:", err);
    }
    setDeleteConfirm(null);
  };

  const handleDeleteConnector = async (connectorId: string) => {
    try {
      const response = await api.deleteConnector(connectorId);
      if (response.success) {
        setConnectors((prev) => prev.filter((c) => c.id !== connectorId));
        if (selectedConnectorId === connectorId) {
          setSelectedConnectorId(null);
        }
      } else {
        console.error("Delete connector failed:", response.message);
      }
    } catch (err) {
      console.error("Failed to delete connector:", err);
    }
    setDeleteConfirm(null);
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );
  const selectedDatabase = databases.find((d) => d.id === selectedDatabaseId);
  const selectedFile = files.find((f) => f.id === selectedFileId);
  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);
  const selectedConnectorDef = selectedConnector ? getConnectorByTypeIndex(selectedConnector.connectorType) : undefined;

  // Connector metadata derived from tableRowCounts
  const connectorTotalRows = selectedConnector?.tableRowCounts
    ? Object.values(selectedConnector.tableRowCounts).reduce((sum, n) => sum + n, 0) : 0;
  const connectorTableCount = selectedConnector?.tableRowCounts
    ? Object.keys(selectedConnector.tableRowCounts).length : 0;

  // Header sync handler for connector
  const handleHeaderSync = async () => {
    if (!selectedConnector) return;
    const id = selectedConnector.id;
    setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 1, syncErrorMessage: null } : c));
    try {
      const response = await api.syncConnector(id);
      if (response.success) {
        setConnectors((prev) => prev.map((c) => c.id === id ? { ...response.data } : c));
      } else {
        setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 3, syncErrorMessage: response.message || 'Sync failed' } : c));
      }
    } catch {
      setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 3, syncErrorMessage: 'Sync failed' } : c));
    }
  };

  // True when the chat area should show the centered welcome/empty state.
  // False when messages exist, when we're loading messages, when actively sending,
  // or when this conversation has a pending background request (messages not yet saved to DB).
  const hasPendingRequest = !!(selectedConversationId && pendingConversations.has(selectedConversationId));
  const isEmptyChat = messages.length === 0 && !loadingMessages && !isSending && !hasPendingRequest;

  // Show loading only for auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 dark:border-white/10 border-t-gray-600 dark:border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  const userInitial = user?.firstName?.[0]?.toUpperCase() || "U";

  return (
    <div className="h-dvh bg-gray-50 dark:bg-[#09090b] flex transition-colors duration-300 overflow-hidden">
      {/* Mobile Chats View - full-page conversation list */}
      <div className={`md:hidden fixed inset-0 z-30 flex-col bg-white dark:bg-[#09090b] ${mobileView === 'chats' ? 'flex' : 'hidden'}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Chats</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full h-10 bg-gray-100 dark:bg-white/[0.04] rounded-xl pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none border border-transparent dark:border-white/[0.04] focus:border-gray-200 dark:focus:border-white/[0.08] transition-colors"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-3 pb-20">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Tap below to start your first chat</p>
            </div>
          ) : (
            conversations
              .filter(chat =>
                !mobileSearchQuery ||
                (chat.title || 'New Chat').toLowerCase().includes(mobileSearchQuery.toLowerCase()) ||
                (chat.databaseConnectionName || '').toLowerCase().includes(mobileSearchQuery.toLowerCase()) ||
                (chat.fileDocumentName || '').toLowerCase().includes(mobileSearchQuery.toLowerCase()) ||
                (chat.appConnectorName || '').toLowerCase().includes(mobileSearchQuery.toLowerCase())
              )
              .map((chat, idx) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    selectConversation(chat.id);
                    setMobileView('chat');
                    setMobileSearchQuery('');
                  }}
                  className={`px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 mb-0.5 ${
                    chat.id === selectedConversationId
                      ? 'bg-gray-100 dark:bg-white/[0.06]'
                      : 'active:bg-gray-50 dark:active:bg-white/[0.04]'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                        {chat.title || 'New Chat'}
                      </span>
                      {pendingConversations.has(chat.id) && (
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gray-500"></span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-3 flex-shrink-0">
                      {formatRelativeTime(chat.updatedAt)}
                    </span>
                  </div>
                  {(chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>

        {/* New Chat FAB - bottom right above nav */}
        <button
          onClick={() => { createNewConversation(); setMobileView('chat'); }}
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg shadow-gray-900/25 dark:shadow-black/30 active:scale-95 transition-all duration-200 hover:shadow-xl"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-medium">New chat</span>
        </button>

        {/* Bottom nav */}
        <SettingsBottomNav />
      </div>

      {/* Sidebar (desktop only) */}
      <aside className={`
        hidden md:flex md:flex-col
        ${sidebarCollapsed ? 'md:w-[60px]' : 'md:w-[260px]'}
        bg-white/80 dark:bg-white/[0.02] justify-between border-r border-gray-200/60 dark:border-white/[0.06] transition-all duration-300
        relative
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
                className="md:hidden w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex w-9 h-9 items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
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
              className={`flex items-center text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors w-full gap-2.5 px-2.5 py-2 ${
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
              className={`flex items-center text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors w-full gap-2.5 px-2.5 py-2 ${
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
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Your chats</span>
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
                    className={`group relative w-full text-left rounded-lg px-3 py-2 flex flex-col gap-0.5 cursor-pointer transition-all duration-150 ${sidebarCollapsed ? 'md:hidden' : ''} ${
                      chatMenuOpen === chat.id ? "z-50" : ""
                    } ${
                      chat.id === selectedConversationId
                        ? "bg-gray-100 dark:bg-white/[0.08]"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.05]"
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
                        className="text-sm bg-white dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.06] rounded px-2 py-0.5 w-full pr-6 dark:text-white"
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
                      {(chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName) && (
                        <>
                          <span className="truncate max-w-[70px]">
                            {chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName}
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
                            className={`p-2 sm:p-1 rounded-md transition-all ${
                              chatMenuOpen === chat.id
                                ? "bg-gray-200 dark:bg-white/10"
                                : "sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
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
              className="fixed w-32 bg-white dark:bg-[#0c0c0e] rounded-xl border border-gray-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/50 overflow-hidden z-[200]"
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
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
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
                className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center gap-2 transition-colors"
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
        <div className={`relative border-t border-gray-200/60 dark:border-white/[0.06] p-2 ${sidebarCollapsed ? 'md:p-2.5 md:flex md:justify-center' : ''}`}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className={`rounded-lg flex items-center hover:bg-gray-100/70 dark:hover:bg-white/[0.06] transition-colors w-full px-2.5 py-2 gap-2.5 ${
              sidebarCollapsed ? 'md:w-9 md:h-9 md:justify-center md:px-0 md:gap-0' : ''
            }`}
            title={sidebarCollapsed ? `${user?.firstName} ${user?.lastName}` : undefined}
          >
            <div className={`bg-gray-800 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 w-8 h-8 ${sidebarCollapsed ? 'md:w-9 md:h-9' : ''}`}>
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
            <div className={`absolute bottom-full mb-1.5 bg-white dark:bg-[#0c0c0e] rounded-xl border border-gray-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/50 z-50 overflow-hidden left-2 right-2 ${
              sidebarCollapsed ? 'md:left-0 md:right-auto md:w-40' : ''
            }`}>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  router.push("/profile");
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors flex items-center gap-2.5"
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
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors flex items-center gap-2.5"
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
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscriptions
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer transition-colors flex items-center gap-2.5"
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
              <div className="border-t border-gray-100 dark:border-white/[0.06]" />
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
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden transition-colors duration-300 relative">
        {/* Header */}
        <header className="border-b border-gray-200/60 dark:border-white/[0.06] z-10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl transition-colors duration-300 flex-shrink-0">
          {/* Row 1: Back/Title + DB/File (desktop inline) */}
          <div className="px-3 sm:px-5 py-3 flex items-center justify-between gap-2">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileView('chats')}
                className="md:hidden flex items-center text-sm text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1 -ml-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-none">
                {selectedConversation?.title || "New Chat"}
              </h1>
            </div>

            {/* Right: Source chip + action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Source chips */}
              {selectedDatabase && (
                <button
                  onClick={() => setShowDatabaseModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200/60 dark:border-white/[0.08] bg-gray-50/80 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all text-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[160px]">{selectedDatabase.name}</span>
                  <span className="hidden sm:inline text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">{getDatabaseTypeName(selectedDatabase.databaseType)}</span>
                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {selectedFile && (
                <button
                  onClick={() => setShowFilesModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200/60 dark:border-white/[0.08] bg-gray-50/80 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all text-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[160px]">{selectedFile.originalFileName}</span>
                  <span className="hidden sm:inline text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">{getFileTypeName(selectedFile.fileType)}</span>
                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {selectedConnector && (
                <button
                  onClick={() => setShowConnectorModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200/60 dark:border-white/[0.08] bg-gray-50/80 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all text-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[100px] sm:max-w-[160px]">{selectedConnector.name}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    selectedConnector.syncStatus === 1 ? 'bg-amber-400 animate-pulse' :
                    selectedConnector.syncStatus === 3 ? 'bg-red-400' :
                    selectedConnector.syncStatus === 2 ? 'bg-emerald-400' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {/* Separator + action buttons */}
              {selectedDatabase && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
                  <button
                    onClick={() => {
                      setSchemaViewDatabaseId(selectedDatabase.id);
                      setShowSchemaModal(true);
                    }}
                    title="View Schema"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 transition-colors text-xs font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Schema</span>
                  </button>
                </>
              )}

              {selectedConnector && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
                  <button
                    onClick={handleHeaderSync}
                    disabled={selectedConnector.syncStatus === 1}
                    title="Sync now"
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50"
                  >
                    <svg className={`w-3.5 h-3.5 ${selectedConnector.syncStatus === 1 ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    {selectedConnector.lastSyncedAt && (
                      <span>{formatRelativeTime(selectedConnector.lastSyncedAt)}</span>
                    )}
                    {selectedConnector.lastSyncedAt && connectorTotalRows > 0 && <span>·</span>}
                    {connectorTotalRows > 0 && <span>{connectorTotalRows.toLocaleString()} rows</span>}
                    {connectorTotalRows > 0 && connectorTableCount > 0 && <span>·</span>}
                    {connectorTableCount > 0 && <span>{connectorTableCount} {connectorTableCount === 1 ? 'table' : 'tables'}</span>}
                  </span>
                </>
              )}

              {selectedFile && selectedFile.rowCount != null && selectedFile.rowCount > 0 && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.08] hidden sm:block" />
                  <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                    <span>{selectedFile.rowCount.toLocaleString()} rows</span>
                    {selectedFile.columns && selectedFile.columns.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{selectedFile.columns.length} columns</span>
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Loading overlay - covers entire chat area with solid background */}
        {loadingMessages && (
          <div className="absolute inset-0 top-[49px] z-20 bg-white dark:bg-[#09090b] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 dark:border-white/[0.06] border-t-gray-600 dark:border-t-gray-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 pt-4 sm:pt-5 pb-24 sm:pb-20 flex flex-col gap-4 sm:gap-5 custom-scrollbar">
          {messages.length === 0 ? null : (
            messages.filter((m) => m && m.role !== undefined && m.role !== null).map((message) => (
              <div key={message.id}>
                {isAssistantMessage(message.role) ? (
                  <div className="w-full sm:w-[85%] md:w-[75%] sm:max-w-[85%] md:max-w-[75%] flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        <img src="/logo-dark.png" alt="Erao" className="w-4 h-4 object-contain dark:hidden" />
                        <img src="/logo.png" alt="Erao" className="w-4 h-4 object-contain hidden dark:block" />
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Erao</span>
                    </div>
                    <div className="pl-[38px]">
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl px-4 py-3 shadow-sm dark:shadow-none border border-gray-100/80 dark:border-white/[0.04]">
                    <MarkdownResponse content={stripCodeBlocks(message.content)} />
                    {clarificationOptions[message.id] && (
                      <div className="mt-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2.5">{clarificationOptions[message.id].question}</p>
                        <div className="flex flex-wrap gap-2">
                          {clarificationOptions[message.id].options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleClarificationClick(message.id, opt.value)}
                              disabled={isSending}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                                <div key={idx} className="bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-visible relative shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/[0.04]">
                                  {/* Title */}
                                  <div className="px-3 pt-2 pb-1">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{capitalizedTitle}</span>
                                  </div>
                                  {/* View Toggle Buttons */}
                                  <div className="flex items-center justify-between p-1 sm:p-2 border-b border-gray-100 dark:border-white/[0.05] gap-0.5 sm:gap-1 overflow-x-auto">
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <button
                                        onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "table" }))}
                                        className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                          currentView === "table"
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                        }`}
                                      >
                                        <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        <span className="hidden sm:inline">Table</span>
                                      </button>
                                      {hasNumericData && result.rows.length > 1 && (
                                        <>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "bar" }))}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                              currentView === "bar"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                            }`}
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                            <span className="hidden sm:inline">Bar</span>
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "line" }))}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                              currentView === "line"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                            }`}
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                            <span className="hidden sm:inline">Line</span>
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "pie" }))}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                              currentView === "pie"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                            }`}
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8v8l5.66 5.66C14.38 19.19 13.23 20 12 20z" /></svg>
                                            <span className="hidden sm:inline">Pie</span>
                                          </button>
                                          <button
                                            onClick={() => setChartViews(prev => ({ ...prev, [viewKey]: "area" }))}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                              currentView === "area"
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                            }`}
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M4 15l4-8 4 4 4-6 4 10" /></svg>
                                            <span className="hidden sm:inline">Area</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    {/* Toolbar: Filter, Settings, Expand, SQL */}
                                    <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0 relative ml-1.5 sm:ml-3 pl-1.5 sm:pl-3 border-l border-gray-200 dark:border-white/[0.10]">
                                      {/* Filter Button - only for table view */}
                                      {currentView === "table" && (() => {
                                        const hasSimpleFilters = Object.values(tableFilters[viewKey] || {}).some(v => v?.length);
                                        const hasAdvancedFilters = Object.values(advancedTableFilters[viewKey] || {}).some(arr => arr?.length > 0);
                                        const hasAnyFilters = hasSimpleFilters || hasAdvancedFilters;
                                        return (
                                          <button
                                            onClick={() => setShowFilterModal(viewKey)}
                                            className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                              hasAnyFilters
                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                            }`}
                                            title="Filter data"
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                          </button>
                                        );
                                      })()}
                                      {/* Settings Gear - only show when viewing charts */}
                                      {currentView !== "table" && (
                                        <button
                                          onClick={() => { setShowChartManipulation(null); setShowChartSettings(showChartSettings === viewKey ? null : viewKey); }}
                                          className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-md transition-colors"
                                          title="Chart settings"
                                        >
                                          <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                      {/* Data Adjust Button + Modal - only for charts */}
                                      {currentView !== "table" && (
                                        <>
                                          <button
                                            onClick={() => { setShowChartSettings(null); setShowChartManipulation(showChartManipulation === viewKey ? null : viewKey); }}
                                            className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                              hasActiveManipulation(viewKey) || showChartManipulation === viewKey
                                                ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                            }`}
                                            title="Adjust chart data"
                                          >
                                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                                            </svg>
                                          </button>
                                          {showChartManipulation === viewKey && (
                                            <ChartDataSettings
                                              columns={result.columns}
                                              rows={result.rows}
                                              manipulation={getManipulation(viewKey)}
                                              onManipulationChange={(m) => setManipulation(viewKey, m)}
                                              onReset={() => resetManipulation(viewKey)}
                                              onClose={() => setShowChartManipulation(null)}
                                              hasActive={hasActiveManipulation(viewKey)}
                                              aiSuggestion={chartAiSuggestions[viewKey]?.groupBy}
                                            />
                                          )}
                                        </>
                                      )}
                                      {/* Expand Button */}
                                      <button
                                        onClick={() => {
                                          // Find the user question for this assistant message
                                          const messageIndex = messages.findIndex(m => m.id === message.id);
                                          const previousUserMessage = messageIndex > 0 ? messages.slice(0, messageIndex).reverse().find(m => isUserMessage(m.role)) : null;
                                          const m = getManipulation(viewKey);
                                          setDataViewerData({
                                            columns: result.columns,
                                            rows: result.rows,
                                            chartType: currentView,
                                            sqlQuery: message.sqlQuery || undefined,
                                            userQuestion: previousUserMessage?.content,
                                            viewKey,
                                            initialManipulation: {
                                              excludedCategories: Array.from(m.excludedCategories),
                                              columnAggregations: m.columnAggregations,
                                              hiddenColumns: Array.from(m.hiddenColumns),
                                              groupByColumn: m.groupByColumn,
                                            },
                                            preferredGroupColumn: chartGroupColumns[viewKey],
                                            aiSuggestion: chartAiSuggestions[viewKey]?.groupBy,
                                          });
                                          setDataViewerOpen(message.id);
                                      }}
                                      className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-md transition-colors"
                                      title="Expand fullscreen"
                                    >
                                      <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                      </svg>
                                    </button>
                                      {/* SQL Button - only show on first table (last in toolbar) */}
                                      {idx === 0 && message.sqlQuery && (
                                        <button
                                          onClick={() => setExpandedSql(prev => {
                                            const next = new Set(prev);
                                            if (next.has(message.id)) next.delete(message.id);
                                            else next.add(message.id);
                                            return next;
                                          })}
                                          className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                            expandedSql.has(message.id)
                                              ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10'
                                              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                          }`}
                                          title={expandedSql.has(message.id) ? "Hide SQL" : "View SQL"}
                                        >
                                          <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                                            <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* SQL Query Panel - show when expanded (only on first table) */}
                                  {idx === 0 && expandedSql.has(message.id) && message.sqlQuery && (
                                    <SqlPanel sql={message.sqlQuery} />
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
                                      manipulation={getManipulation(viewKey)}
                                      onManipulationChange={(m) => setManipulation(viewKey, m)}
                                    />
                                  )}

                                  {/* Table View */}
                                  {currentView === "table" && (
                                    <VirtualTable
                                      columns={result.columns}
                                      rows={result.rows}
                                      filters={tableFilters[viewKey] || {}}
                                      advancedFilters={advancedTableFilters[viewKey]}
                                      truncated={result.truncated}
                                      maxRows={result.maxRows}
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
                          <div className="bg-[#fafafc] dark:bg-white/[0.04] rounded-xl p-4 mt-2 text-center">
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
                            {/* SQL Button for single row results */}
                            {message.sqlQuery && (
                              <div className="flex justify-end">
                                <button
                                  onClick={() => setExpandedSql(prev => {
                                    const next = new Set(prev);
                                    if (next.has(message.id)) next.delete(message.id);
                                    else next.add(message.id);
                                    return next;
                                  })}
                                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
                                    expandedSql.has(message.id)
                                      ? "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200"
                                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                  }`}
                                  title={expandedSql.has(message.id) ? "Hide SQL" : "View SQL"}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                  <span className="hidden sm:inline">SQL</span>
                                </button>
                              </div>
                            )}
                            {/* SQL Query Panel */}
                            {expandedSql.has(message.id) && message.sqlQuery && (
                              <SqlPanel sql={message.sqlQuery} />
                            )}
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
                                    className="rounded-xl bg-gray-100 dark:bg-white/[0.04] px-3 sm:px-4 py-3 hover:bg-gray-150 dark:hover:bg-white/[0.06] transition-colors min-w-0 overflow-hidden"
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
                        <div className="bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-visible relative mt-2 shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/[0.04]">
                          {/* View Toggle Buttons - always show for tables */}
                          <div className="flex items-center justify-between p-1 sm:p-2 border-b border-gray-100 dark:border-white/[0.05] gap-0.5 sm:gap-1 overflow-x-auto">
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "table" }))}
                                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                  currentView === "table"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                }`}
                              >
                                <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <span className="hidden sm:inline">Table</span>
                              </button>
                              {hasNumericData && parsedResult.rows.length > 1 && (
                                <>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "bar" }))}
                                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                      currentView === "bar"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                    }`}
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    <span className="hidden sm:inline">Bar</span>
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "line" }))}
                                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                      currentView === "line"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                    }`}
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                    <span className="hidden sm:inline">Line</span>
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "pie" }))}
                                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                      currentView === "pie"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                    }`}
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8v8l5.66 5.66C14.38 19.19 13.23 20 12 20z" /></svg>
                                    <span className="hidden sm:inline">Pie</span>
                                  </button>
                                  <button
                                    onClick={() => setChartViews(prev => ({ ...prev, [message.id]: "area" }))}
                                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                                      currentView === "area"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                                    }`}
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M4 15l4-8 4 4 4-6 4 10" /></svg>
                                    <span className="hidden sm:inline">Area</span>
                                  </button>
                                </>
                              )}
                            </div>
                              {/* Toolbar: Filter, Settings, Expand, SQL */}
                              <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0 relative ml-1.5 sm:ml-3 pl-1.5 sm:pl-3 border-l border-gray-200 dark:border-white/[0.10]">
                                {/* Filter Button - only for table view */}
                                {currentView === "table" && (() => {
                                  const hasSimpleFilters = Object.values(tableFilters[message.id] || {}).some(v => v?.length);
                                  const hasAdvancedFilters = Object.values(advancedTableFilters[message.id] || {}).some(arr => arr?.length > 0);
                                  const hasAnyFilters = hasSimpleFilters || hasAdvancedFilters;
                                  return (
                                    <button
                                      onClick={() => setShowFilterModal(message.id)}
                                      className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                        hasAnyFilters
                                          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
                                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                      }`}
                                      title="Filter data"
                                    >
                                      <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                      </svg>
                                    </button>
                                  );
                                })()}
                                {/* Settings Gear - only show when viewing charts */}
                                {currentView !== "table" && (
                                  <button
                                    onClick={() => { setShowChartManipulation(null); setShowChartSettings(showChartSettings === message.id ? null : message.id); }}
                                    className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-md transition-colors"
                                    title="Chart settings"
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                {/* Data Adjust Button + Modal - only for charts */}
                                {currentView !== "table" && (
                                  <>
                                    <button
                                      onClick={() => { setShowChartSettings(null); setShowChartManipulation(showChartManipulation === message.id ? null : message.id); }}
                                      className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                        hasActiveManipulation(message.id) || showChartManipulation === message.id
                                          ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10'
                                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                      }`}
                                      title="Adjust chart data"
                                    >
                                      <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                                      </svg>
                                    </button>
                                    {showChartManipulation === message.id && (
                                      <ChartDataSettings
                                        columns={parsedResult.columns}
                                        rows={parsedResult.rows}
                                        manipulation={getManipulation(message.id)}
                                        onManipulationChange={(m) => setManipulation(message.id, m)}
                                        onReset={() => resetManipulation(message.id)}
                                        onClose={() => setShowChartManipulation(null)}
                                        hasActive={hasActiveManipulation(message.id)}
                                        aiSuggestion={chartAiSuggestions[message.id]?.groupBy}
                                      />
                                    )}
                                  </>
                                )}
                                {/* Expand Button */}
                                <button
                                  onClick={() => {
                                    // Find the user question for this assistant message
                                    const messageIndex = messages.findIndex(m => m.id === message.id);
                                    const previousUserMessage = messageIndex > 0 ? messages.slice(0, messageIndex).reverse().find(m => isUserMessage(m.role)) : null;
                                    const m = getManipulation(message.id);
                                    setDataViewerData({
                                      columns: parsedResult.columns,
                                      rows: parsedResult.rows,
                                      chartType: currentView,
                                      sqlQuery: message.sqlQuery || undefined,
                                      userQuestion: previousUserMessage?.content,
                                      viewKey: message.id,
                                      initialManipulation: {
                                        excludedCategories: Array.from(m.excludedCategories),
                                        columnAggregations: m.columnAggregations,
                                        hiddenColumns: Array.from(m.hiddenColumns),
                                        groupByColumn: m.groupByColumn,
                                      },
                                      preferredGroupColumn: chartGroupColumns[message.id],
                                      aiSuggestion: chartAiSuggestions[message.id]?.groupBy,
                                    });
                                    setDataViewerOpen(message.id);
                                  }}
                                  className="flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-md transition-colors"
                                  title="Expand fullscreen"
                                >
                                  <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                  </svg>
                                </button>
                                {/* SQL Button (last in toolbar) */}
                                {message.sqlQuery && (
                                  <button
                                    onClick={() => setExpandedSql(prev => {
                                      const next = new Set(prev);
                                      if (next.has(message.id)) next.delete(message.id);
                                      else next.add(message.id);
                                      return next;
                                    })}
                                    className={`flex items-center justify-center w-9 h-9 sm:w-7 sm:h-7 rounded-md transition-colors ${
                                      expandedSql.has(message.id)
                                        ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                    }`}
                                    title={expandedSql.has(message.id) ? "Hide SQL" : "View SQL"}
                                  >
                                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                                      <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                          </div>

                          {/* SQL Query Panel - show when expanded */}
                          {expandedSql.has(message.id) && message.sqlQuery && (
                            <SqlPanel sql={message.sqlQuery} />
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
                              manipulation={getManipulation(message.id)}
                              onManipulationChange={(m) => setManipulation(message.id, m)}
                            />
                          )}

                          {/* Table View - Virtual Scrolling for performance */}
                          {currentView === "table" && (
                            <VirtualTable
                              columns={parsedResult.columns}
                              rows={parsedResult.rows}
                              filters={tableFilters[message.id] || {}}
                              advancedFilters={advancedTableFilters[message.id]}
                              truncated={parsedResult.truncated}
                              maxRows={parsedResult.maxRows}
                            />
                          )}
                        </div>
                      );
                    })()}
                    {messageInsights[message.id] && (
                      <InsightCard insight={messageInsights[message.id]} />
                    )}
                    </div>
                    {followUpQuestions[message.id]?.length > 0 && (
                      <FollowUpChips
                        questions={followUpQuestions[message.id]}
                        onSelect={handleFollowUpClick}
                        disabled={isSending}
                      />
                    )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] bg-gray-100 dark:bg-white/[0.06] rounded-2xl px-4 py-3 border border-gray-100 dark:border-white/[0.04]">
                      <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed">
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
                    <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] bg-gray-100 dark:bg-white/[0.06] rounded-2xl px-4 py-3 border border-gray-100 dark:border-white/[0.04]">
                      <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed">
                        {pendingMessage}
                      </p>
                    </div>
                  </div>
                )}
                <div className="w-full sm:w-[85%] md:w-[75%] sm:max-w-[85%] md:max-w-[75%] flex flex-col gap-2 sm:gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <img src="/logo-dark.png" alt="Erao" className="w-4 h-4 object-contain dark:hidden" />
                      <img src="/logo.png" alt="Erao" className="w-4 h-4 object-contain hidden dark:block" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Erao</span>
                  </div>
                  <div className="pl-[38px] flex items-center gap-3 sm:gap-5">
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
            <div className="bg-gray-50 dark:bg-white/[0.04] border-l-2 border-l-red-400 dark:border-l-red-500 text-gray-600 dark:text-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-r-lg">
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`${isEmptyChat ? 'absolute inset-0 flex items-center justify-center px-3 sm:px-5' : 'absolute bottom-0 left-0 right-0 z-20 px-3 sm:px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 pt-3 sm:pt-4 flex justify-center backdrop-blur-2xl bg-gradient-to-t from-white via-white/95 to-white/0 dark:from-[#09090b] dark:via-[#09090b]/95 dark:to-[#09090b]/0'}`}>
          <div className={`w-full max-w-[680px] ${isEmptyChat ? 'flex flex-col items-center gap-4 sm:gap-6' : ''}`}>
            {isEmptyChat && (
              <div className="text-center px-2 max-w-lg">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <img src="/logo-dark.png" alt="Erao" className="w-9 h-9 object-contain dark:hidden" />
                  <img src="/logo.png" alt="Erao" className="w-9 h-9 object-contain hidden dark:block" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-1.5">
                  {selectedDatabase
                    ? `Query ${selectedDatabase.name}`
                    : selectedFile
                    ? `Analyze ${selectedFile.originalFileName}`
                    : selectedConnector
                    ? `Explore ${selectedConnectorDef?.name || 'App'} Data`
                    : "What can I help with?"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {selectedDatabase
                    ? "Ask anything about your database"
                    : selectedFile
                    ? "Explore, filter, and visualize your data"
                    : selectedConnector
                    ? `Connected to ${selectedConnectorDef?.name || 'your app'}`
                    : "Connect a database or upload a file to get started"}
                </p>
                {(selectedDatabase || selectedFile || selectedConnector) ? (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm mx-auto">
                    {(selectedDatabase ? [
                      "Show me all tables",
                      "Summarize the data",
                      "Find the top 10 records",
                      "Show trends over time",
                    ] : selectedFile ? [
                      "Summarize this file",
                      "Show the first 10 rows",
                      "What columns are there?",
                      "Find patterns in the data",
                    ] : [
                      "What data is available?",
                      "Show recent activity",
                      "Summarize my data",
                      "Find key metrics",
                    ]).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => sendMessageDirect(suggestion)}
                        className="text-center px-3 py-2.5 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.12] text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-all duration-200 active:scale-[0.98]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDatabaseModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.12] text-sm text-gray-600 dark:text-gray-400 transition-all duration-200 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      Connect database
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilesModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.12] text-sm text-gray-600 dark:text-gray-400 transition-all duration-200 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConnectorModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/[0.12] text-sm text-gray-600 dark:text-gray-400 transition-all duration-200 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Connect app
                    </button>
                  </div>
                )}
              </div>
            )}
            <form
              data-chat-form
              onSubmit={handleSendMessage}
              className="w-full h-12 sm:h-11 bg-gray-50/80 dark:bg-white/[0.04] rounded-2xl px-2.5 flex items-center gap-1.5 border border-gray-200/80 dark:border-white/[0.08] focus-within:border-gray-300 dark:focus-within:border-white/15 focus-within:bg-white dark:focus-within:bg-white/[0.06] focus-within:shadow-sm focus-within:ring-2 focus-within:ring-gray-200/30 dark:focus-within:ring-white/[0.04] transition-all duration-200"
            >
              {/* Hidden file input for uploads */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.docx,.csv,.xml,.json,.txt,.tsv"
                className="hidden"
              />
              {/* Database select button */}
              <button
                type="button"
                onClick={() => setShowDatabaseModal(true)}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedDatabase
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/10"
                }`}
                title={selectedDatabase ? selectedDatabase.name : "Select database"}
              >
                <svg className="w-[18px] h-[18px] sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </button>
              {/* Files select button */}
              <button
                type="button"
                onClick={() => setShowFilesModal(true)}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedFile
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/10"
                }`}
                title={selectedFile ? selectedFile.originalFileName : "Select or upload file"}
              >
                <svg className="w-[18px] h-[18px] sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* Connector select button */}
              <button
                type="button"
                onClick={() => setShowConnectorModal(true)}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedConnector
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/10"
                }`}
                title={selectedConnector ? selectedConnector.name : "Connect an app"}
              >
                <svg className="w-[18px] h-[18px] sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedConnector ? `Ask about your ${selectedConnectorDef?.name || 'app'} data...` : selectedFile ? `Ask about ${selectedFile.originalFileName}...` : "Ask about your data..."}
                disabled={isSending}
                className="flex-1 min-w-0 ml-0.5 text-base sm:text-[13px] outline-none border-none focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 bg-transparent text-gray-900 dark:text-white"
                enterKeyHint="send"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </form>
          </div>
        </div>
        {/* Upload progress overlay */}
        {isUploadingFile && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-80">
            <div className="bg-white dark:bg-[#0c0c0e] border border-gray-200/50 dark:border-white/[0.08] rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/40 px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {uploadingFileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {uploadPhase === "uploading" ? "Uploading..." : "Processing file..."}
                  </p>
                </div>
                {uploadPhase === "uploading" && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                    {uploadProgress}%
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                {uploadPhase === "uploading" ? (
                  <div
                    className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                ) : (
                  <div className="h-full w-1/3 bg-gray-900 dark:bg-white rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Database Selection Modal */}
      <AnimatePresence>
      {showDatabaseModal && (
        <DatabaseModal
          databases={databases}
          selectedDatabaseId={selectedDatabaseId}
          onSelect={(id) => {
            setSelectedDatabaseId(id);
            setSelectedFileId(null);
            setSelectedConnectorId(null); // Clear connector when database is selected
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
      </AnimatePresence>

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
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Connector Modal */}
      <AnimatePresence>
      {showConnectorModal && (
        <ConnectorModal
          connectors={connectors}
          selectedConnectorId={selectedConnectorId}
          onSelect={(id) => {
            setSelectedConnectorId(id);
            setSelectedDatabaseId(null);
            setSelectedFileId(null);
            if (selectedConversationId) {
              setSelectedConversationId(null);
              setMessages([]);
            }
            setShowConnectorModal(false);
          }}
          onClose={() => setShowConnectorModal(false)}
          onAddNew={(connectorDefId) => {
            setShowConnectorModal(false);
            setShowConnectorSetup(connectorDefId);
          }}
          onDelete={async (id, name) => {
            setShowConnectorModal(false);
            setDeleteConfirm({ type: 'connector', id, name });
          }}
          onSync={async (id) => {
            // Optimistically set syncing status
            setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 1, syncErrorMessage: null } : c));
            try {
              const response = await api.syncConnector(id);
              if (response.success) {
                setConnectors((prev) => prev.map((c) => c.id === id ? { ...response.data } : c));
              } else {
                setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 3, syncErrorMessage: response.message || 'Sync failed' } : c));
              }
            } catch {
              setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, syncStatus: 3, syncErrorMessage: 'Sync failed' } : c));
            }
          }}
        />
      )}
      </AnimatePresence>

      {/* Connector Setup Modal */}
      {showConnectorSetup && (
        <ConnectorSetupModal
          connectorDefId={showConnectorSetup}
          onClose={() => setShowConnectorSetup(null)}
          onSuccess={(connector) => {
            setConnectors((prev) => [connector, ...prev]);
            setSelectedConnectorId(connector.id);
            setSelectedDatabaseId(null);
            setSelectedFileId(null);
            if (selectedConversationId) {
              setSelectedConversationId(null);
              setMessages([]);
            }
            setShowConnectorSetup(null);
          }}
          onSyncUpdate={(updatedConnector) => {
            setConnectors((prev) => prev.map((c) => c.id === updatedConnector.id ? updatedConnector : c));
          }}
        />
      )}

      {/* Files Modal */}
      <AnimatePresence>
      {showFilesModal && (
        <FilesModal
          files={files}
          selectedFileId={selectedFileId}
          onSelect={(id) => {
            setSelectedFileId(id || null);
            setSelectedDatabaseId(null);
            setSelectedConnectorId(null); // Clear connector when file is selected
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
      </AnimatePresence>

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
          userQuestion={dataViewerData.userQuestion}
          initialChartSettings={chartSettings}
          onSettingsChange={setChartSettings}
          initialManipulation={dataViewerData.initialManipulation}
          preferredGroupColumn={dataViewerData.preferredGroupColumn}
          aiSuggestion={dataViewerData.aiSuggestion}
          onManipulationChange={(m) => {
            const viewKey = dataViewerData.viewKey;
            setManipulation(viewKey, m);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#0c0c0e] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm sm:mx-4 shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200/50 dark:border-white/[0.08]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900 dark:text-white">Delete {deleteConfirm.type === 'conversation' ? 'Chat' : deleteConfirm.type === 'connector' ? 'Connector' : 'Connection'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">&quot;{deleteConfirm.name}&quot;</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'conversation') {
                    handleDeleteConversation(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'connector') {
                    handleDeleteConnector(deleteConfirm.id);
                  } else {
                    handleDeleteDatabase(deleteConfirm.id);
                  }
                }}
                className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Limit Alert */}
      {showUsageLimitAlert && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70]">
          <div className="bg-white dark:bg-[#0c0c0e] rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm sm:mx-4 shadow-2xl border border-gray-200/50 dark:border-white/[0.08]">
            <div className="p-5 sm:p-6">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/[0.04] rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Usage limit reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                You&apos;ve used all queries for this billing cycle. Upgrade your plan or wait for the next cycle to continue.
              </p>
            </div>
            <div className="border-t border-gray-100 dark:border-white/[0.06] p-3 sm:p-4 flex gap-3">
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
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-start justify-center sm:pt-[15vh] z-[70]"
          onClick={() => {
            setShowSearchModal(false);
            setSearchQuery("");
          }}
        >
          <div
            className="bg-white dark:bg-[#0c0c0e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 shadow-2xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden border border-gray-200/50 dark:border-white/[0.08] max-h-[80vh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="p-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full h-11 bg-gray-50 dark:bg-white/[0.04] rounded-xl pl-10 pr-4 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-gray-100 dark:focus:bg-white/[0.06] transition-colors text-gray-900 dark:text-white"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
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
                    (chat.fileDocumentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (chat.appConnectorName || "").toLowerCase().includes(searchQuery.toLowerCase())
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
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors border-b border-gray-50 dark:border-white/[0.06] last:border-b-0 ${
                        chat.id === selectedConversationId ? "bg-gray-50 dark:bg-white/[0.04]" : ""
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chat.title || "New Chat"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {(chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName) && (
                          <>
                            <span className="truncate max-w-[150px]">
                              {chat.databaseConnectionName || chat.fileDocumentName || chat.appConnectorName}
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
            <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06]">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/[0.06] rounded-md border border-gray-200/80 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 text-[10px] font-medium">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Connector SVG icons (simple brand marks)
const connectorLogoMap: Record<string, string> = {
  shopify: "/connector-logos/shopify.png",
  stripe: "/connector-logos/stripe.png",
  woocommerce: "/connector-logos/woocommerce.png",
  quickbooks: "/connector-logos/quickbooks.png",
  hubspot: "/connector-logos/hubspot.png",
  salesforce: "/connector-logos/salesforce.png",
  "google-analytics": "/connector-logos/google-analytics.png",
  notion: "/connector-logos/notion.png",
  airtable: "/connector-logos/airtable.png",
  "google-sheets": "/connector-logos/google-sheets.png",
};

// Dark-mode overrides for connector logos that need a white variant
const connectorLogoDarkMap: Record<string, string> = {
  notion: "/connector-logos/notion-white.png",
};

function ConnectorIcon({ id, size = 32 }: { id: string; size?: number }) {
  const src = connectorLogoMap[id];
  const darkSrc = connectorLogoDarkMap[id];
  if (src) {
    if (darkSrc) {
      return (
        <>
          <img src={src} alt={id} width={size} height={size} style={{ width: size, height: size }} className="dark:hidden" />
          <img src={darkSrc} alt={id} width={size} height={size} style={{ width: size, height: size }} className="hidden dark:block" />
        </>
      );
    }
    return <img src={src} alt={id} width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <svg style={{ width: size, height: size }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

// Connector Selection Modal
function ConnectorModal({
  connectors,
  selectedConnectorId,
  onSelect,
  onClose,
  onAddNew,
  onDelete,
  onSync,
}: {
  connectors: AppConnectorDto[];
  selectedConnectorId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAddNew: (connectorDefId: string) => void;
  onDelete: (id: string, name: string) => void;
  onSync: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(connectors.length === 0);

  const syncStatusConfig = {
    0: { label: 'Idle', color: 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400' },
    1: { label: 'Syncing', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    2: { label: 'Synced', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    3: { label: 'Failed', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 shadow-2xl dark:shadow-black/50 overflow-hidden border border-gray-200/50 dark:border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {showPicker && connectors.length > 0 && (
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors -ml-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                {showPicker ? "Connect an App" : "App Connectors"}
              </h2>
              {!showPicker && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{connectors.length} connector{connectors.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!showPicker && connectors.length > 0 && (
              <button
                onClick={() => setShowPicker(true)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-4" />

        <AnimatePresence mode="wait">
          {!showPicker && connectors.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Existing connectors list */}
              <div className="p-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {connectors.map((connector, i) => {
                  const def = getConnectorByTypeIndex(connector.connectorType);
                  const isSelected = connector.id === selectedConnectorId;
                  const status = syncStatusConfig[connector.syncStatus as keyof typeof syncStatusConfig] || syncStatusConfig[0];
                  const totalRows = connector.tableRowCounts ? Object.values(connector.tableRowCounts).reduce((s, n) => s + n, 0) : 0;
                  const tableCount = connector.tableRowCounts ? Object.keys(connector.tableRowCounts).length : 0;

                  return (
                    <motion.div
                      key={connector.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => onSelect(connector.id)}
                      className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-gray-100/80 dark:bg-white/[0.06]"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Connector icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-white dark:bg-white/[0.08] shadow-sm dark:shadow-none' : 'bg-gray-50 dark:bg-white/[0.04]'
                      }`}>
                        <ConnectorIcon id={def?.id || ''} size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate transition-colors ${isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                            {connector.name}
                          </span>
                          {connector.syncStatus !== 0 && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                              {connector.syncStatus === 1 && (
                                <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              )}
                              {status.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{def?.category || 'App'}</span>
                          {totalRows > 0 && (
                            <>
                              <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">{totalRows.toLocaleString()} rows</span>
                            </>
                          )}
                          {tableCount > 0 && (
                            <>
                              <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">{tableCount} {tableCount === 1 ? 'table' : 'tables'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Selection check */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white dark:text-[#111113]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Hover actions */}
                      {!isSelected && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(connector.syncStatus === 0 || connector.syncStatus === 2 || connector.syncStatus === 3) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onSync(connector.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors"
                              title={connector.syncStatus === 2 ? "Re-sync" : "Sync"}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(connector.id, connector.name); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Sync button visible when selected + not syncing */}
                      {isSelected && (connector.syncStatus === 0 || connector.syncStatus === 2 || connector.syncStatus === 3) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSync(connector.id); }}
                          className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.10] border border-gray-200/60 dark:border-white/[0.08] transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sync
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Connector picker grid */}
              <div className="p-3 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {connectorDefinitions.map((def, i) => {
                  const isAvailable = def.status === 'available';
                  return (
                    <motion.button
                      key={def.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      onClick={() => isAvailable && onAddNew(def.id)}
                      disabled={!isAvailable}
                      className={`relative flex flex-col items-start gap-2.5 p-4 rounded-xl border text-left transition-all ${
                        isAvailable
                          ? "border-gray-200/60 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:shadow-sm cursor-pointer active:scale-[0.98]"
                          : "border-gray-100 dark:border-white/[0.04] opacity-40 cursor-not-allowed"
                      }`}
                    >
                      {!isAvailable && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase tracking-wider bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-md">
                          Soon
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-white/[0.04]">
                        <ConnectorIcon id={def.id} size={28} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{def.name}</div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{def.category}</div>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2">{def.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Connector Setup Modal
function ConnectorSetupModal({
  connectorDefId,
  onClose,
  onSuccess,
  onSyncUpdate,
}: {
  connectorDefId: string;
  onClose: () => void;
  onSuccess: (connector: AppConnectorDto) => void;
  onSyncUpdate?: (connector: AppConnectorDto) => void;
}) {
  const def = connectorDefinitions.find(c => c.id === connectorDefId);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [name, setName] = useState(def?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'testing' | 'saving' | 'syncing' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!def) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTestMessage(null);
    setFieldErrors({});

    // Validate all fields (required + format)
    const { validateAllCredentials, validateCredentialField } = await import('@/lib/connectors');
    const validationError = validateAllCredentials(def.id, def.credentialFields, formData);
    if (validationError) {
      setError(validationError);
      const errors: Record<string, string> = {};
      for (const field of def.credentialFields) {
        const val = formData[field.key]?.trim();
        if (!val) { errors[field.key] = 'Required'; continue; }
        const err = validateCredentialField(def.id, field.key, val);
        if (err) errors[field.key] = err;
      }
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    const payload = {
      name: name.trim() || def.name,
      connectorType: def.connectorTypeIndex,
      credentials: formData,
    };

    try {
      // Step 1: Test connection
      setStep('testing');
      const testResponse = await api.testConnector(payload);
      if (!testResponse.success) {
        setError(testResponse.message || 'Connection test failed');
        setStep('idle');
        setIsLoading(false);
        return;
      }
      setTestMessage(testResponse.data?.accountName
        ? `Connected to ${testResponse.data.accountName}`
        : testResponse.message || 'Connection successful');

      // Step 2: Save connector
      setStep('saving');
      const createResponse = await api.createConnector(payload);
      if (createResponse.success) {
        // Step 3: Auto-trigger sync in background
        setStep('syncing');
        api.syncConnector(createResponse.data.id).then((syncResponse) => {
          if (syncResponse.success && onSyncUpdate) {
            onSyncUpdate(syncResponse.data);
          }
        }).catch(() => {
          // Sync failure is non-blocking — connector is already created
        });
        // Don't wait for sync to complete — return to chat immediately
        setStep('done');
        setTimeout(() => onSuccess({ ...createResponse.data, syncStatus: 1 }), 500);
      } else {
        setError(createResponse.message || 'Failed to save connector');
        setStep('idle');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed. Check your credentials.');
      setStep('idle');
    } finally {
      if (step !== 'done') setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-[#0c0c0e] rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm sm:mx-4 shadow-2xl border border-gray-200/50 dark:border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${def.color}15` }}>
            <ConnectorIcon id={def.id} size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Connect {def.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{def.category}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Connection Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`My ${def.name} Store`}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Dynamic credential fields */}
          {def.credentialFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{field.label}</label>
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, [field.key]: e.target.value }));
                  if (fieldErrors[field.key]) setFieldErrors(prev => { const n = { ...prev }; delete n[field.key]; return n; });
                }}
                placeholder={field.placeholder}
                className={`w-full h-10 px-3 rounded-lg border ${fieldErrors[field.key] ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-white/[0.08]'} bg-white dark:bg-white/[0.03] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors font-mono`}
                autoComplete="off"
              />
              {fieldErrors[field.key] && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{fieldErrors[field.key]}</p>
              )}
            </div>
          ))}

          {/* Status indicators */}
          {step !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {step === 'testing' ? (
                  <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : testMessage ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : null}
                <span className={step === 'testing' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}>
                  {step === 'testing' ? `Testing ${def.name} connection...` : testMessage}
                </span>
              </div>
              {(step === 'saving' || step === 'syncing' || step === 'done') && (
                <div className="flex items-center gap-2 text-sm">
                  {step === 'saving' ? (
                    <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  <span className={step === 'saving' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}>
                    {step === 'saving' ? 'Saving connector...' : 'Connector saved!'}
                  </span>
                </div>
              )}
              {(step === 'syncing' || step === 'done') && (
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span className="text-blue-600 dark:text-blue-400">Syncing data in background...</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'testing' ? 'Testing connection...' : step === 'saving' ? 'Saving...' : step === 'syncing' || step === 'done' ? 'Connected!' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Database Selection Modal Component
const DB_LOGOS: Record<number, string> = {
  0: "/db-logos/postgresql.png", 1: "/db-logos/mysql.png", 2: "/db-logos/sql-server.png",
  3: "/db-logos/mongodb.png", 4: "/db-logos/oracle.png", 5: "/db-logos/sqlite.webp",
  6: "/db-logos/mariadb.png", 7: "/db-logos/cockroachdb.png", 8: "/db-logos/redshift.png",
  9: "/db-logos/clickhouse.png", 10: "/db-logos/firebird.png", 11: "/db-logos/duckdb.png",
  12: "/db-logos/timescaledb.png", 13: "/db-logos/yugabytedb.png", 14: "/db-logos/snowflake.png",
};

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[420px] shadow-2xl dark:shadow-2xl dark:shadow-black/50 overflow-hidden max-h-[85vh] sm:max-h-[480px] border border-gray-200/50 dark:border-white/[0.08] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Databases</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{databases.length} connection{databases.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onAddNew}
              className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-4 flex-shrink-0" />

        {/* List */}
        <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {databases.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No databases connected</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Connect a database to start querying with AI</p>
              <button
                onClick={onAddNew}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Connection
              </button>
            </div>
          ) : (
            <div className="p-2">
              {databases.map((db, i) => {
                const isSelected = db.id === selectedDatabaseId;
                const dbTypeName = getDatabaseTypeName(db.databaseType);
                const logoSrc = DB_LOGOS[typeof db.databaseType === 'number' ? db.databaseType : 0];
                return (
                  <motion.div
                    key={db.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-gray-100/80 dark:bg-white/[0.06]"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }`}
                    onClick={() => onSelect(db.id)}
                  >
                    {/* DB Logo */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-white dark:bg-white/[0.08] shadow-sm dark:shadow-none' : 'bg-gray-50 dark:bg-white/[0.04]'
                    }`}>
                      {logoSrc ? (
                        <img src={logoSrc} alt={dbTypeName} className="w-6 h-6 object-contain" />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate transition-colors ${isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-200'}`}>{db.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{dbTypeName}</p>
                    </div>

                    {/* Selection check */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white dark:text-[#111113]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Hover actions */}
                    {!isSelected && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewSchema(db.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-white/[0.08] transition-colors"
                          title="View Schema"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(db.id, db.name); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Schema button visible when selected */}
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewSchema(db.id); }}
                        className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.10] border border-gray-200/60 dark:border-white/[0.08] transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Schema
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
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
  const databaseTypes = [
    { value: 0, label: "PostgreSQL", port: 5432 },
    { value: 1, label: "MySQL", port: 3306 },
    { value: 2, label: "SQL Server", port: 1433 },
    { value: 3, label: "MongoDB", port: 27017 },
    { value: 4, label: "Oracle", port: 1521 },
    { value: 5, label: "SQLite", port: 0 },
    { value: 6, label: "MariaDB", port: 3306 },
    { value: 7, label: "CockroachDB", port: 26257 },
    { value: 8, label: "Redshift", port: 5439 },
    { value: 9, label: "ClickHouse", port: 8123 },
    { value: 10, label: "Firebird", port: 3050 },
    { value: 11, label: "DuckDB", port: 0 },
    { value: 12, label: "TimescaleDB", port: 5432 },
    { value: 13, label: "YugabyteDB", port: 5433 },
    { value: 14, label: "Snowflake", port: 443 },
  ];

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
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const dbDropdownRef = useRef<HTMLDivElement>(null);

  const currentDbType = databaseTypes.find(t => t.value === formData.databaseType);

  const filteredDbTypes = dbSearchQuery
    ? databaseTypes.filter(t => t.label.toLowerCase().includes(dbSearchQuery.toLowerCase()))
    : databaseTypes;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dbDropdownRef.current && !dbDropdownRef.current.contains(e.target as Node)) {
        setDbDropdownOpen(false);
        setDbSearchQuery("");
      }
    };
    if (dbDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dbDropdownOpen]);

  const handlePortChange = (value: string) => {
    setPortInput(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) setFormData({ ...formData, port: parsed });
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
      if (err instanceof ApiError) setError(err.message);
      else setError("Connection test failed");
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
        if (newDb) { onSuccess(newDb); }
        else {
          const lastDb = response.data[response.data.length - 1];
          if (lastDb) onSuccess(lastDb);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-2xl dark:shadow-black/50 border border-gray-200/50 dark:border-white/[0.08]"
      >
        {/* Header with DB logo */}
        <div className="px-5 sm:px-6 py-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-white/[0.06]">
            <img src={DB_LOGOS[formData.databaseType]} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">New Connection</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{currentDbType?.label || 'Select database type'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

        <div className="px-5 sm:px-6 py-5 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
          {/* Database Type Dropdown */}
          <div className="mb-5" ref={dbDropdownRef}>
            <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Database Type</label>
            <button
              type="button"
              onClick={() => setDbDropdownOpen(!dbDropdownOpen)}
              className={`w-full h-12 flex items-center gap-3 px-3.5 rounded-xl border transition-all ${
                dbDropdownOpen
                  ? "border-gray-400 dark:border-white/25 bg-gray-50/50 dark:bg-white/[0.03]"
                  : "border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/15"
              }`}
            >
              <img src={DB_LOGOS[formData.databaseType]} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
              <span className="text-sm text-gray-900 dark:text-white flex-1 text-left font-medium">{currentDbType?.label || "Select database"}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dbDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <AnimatePresence>
              {dbDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 bg-white dark:bg-[#161618] border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-lg dark:shadow-black/30"
                >
                  <div className="p-2 border-b border-gray-100 dark:border-white/[0.06]">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={dbSearchQuery}
                        onChange={(e) => setDbSearchQuery(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        className="w-full h-9 pl-8 pr-3 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-lg text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-1.5">
                    {filteredDbTypes.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-400 text-center">No match</div>
                    ) : (
                      filteredDbTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            handleDatabaseTypeSelect(type.value);
                            setDbDropdownOpen(false);
                            setDbSearchQuery("");
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            formData.databaseType === type.value
                              ? "bg-gray-100 dark:bg-white/[0.08]"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <img src={DB_LOGOS[type.value]} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                          <span className={`text-sm ${
                            formData.databaseType === type.value
                              ? "text-gray-900 dark:text-white font-medium"
                              : "text-gray-600 dark:text-gray-300"
                          }`}>{type.label}</span>
                          {formData.databaseType === type.value && (
                            <svg className="w-4 h-4 text-gray-900 dark:text-white ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Connection Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="My Production DB"
                className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 text-sm outline-none transition-all duration-150 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-400/10 dark:focus:ring-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="flex gap-2.5">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Host</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => handleFieldChange("host", e.target.value)}
                  placeholder="db.example.com"
                  className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 text-sm outline-none transition-all duration-150 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-400/10 dark:focus:ring-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              </div>
              <div className="w-20 sm:w-24">
                <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Port</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={portInput}
                  onChange={(e) => handlePortChange(e.target.value)}
                  placeholder="5432"
                  className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 text-sm outline-none transition-colors focus:border-gray-400 dark:focus:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Database Name</label>
              <input
                type="text"
                value={formData.databaseName}
                onChange={(e) => handleFieldChange("databaseName", e.target.value)}
                placeholder="my_database"
                className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 text-sm outline-none transition-all duration-150 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-400/10 dark:focus:ring-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="flex gap-2.5">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleFieldChange("username", e.target.value)}
                  placeholder="postgres"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 text-sm outline-none transition-all duration-150 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-400/10 dark:focus:ring-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFieldChange("password", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full h-11 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded-xl px-3.5 text-sm outline-none transition-all duration-150 focus:border-gray-400 dark:focus:border-white/20 focus:ring-2 focus:ring-gray-400/10 dark:focus:ring-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 ${
                  testResult === "success"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/30 dark:border-red-500/20"
                }`}
              >
                {testResult === "success" ? (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected to {currentDbType?.label}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {error || "Connection failed"}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            Cancel
          </button>
          {!testPassed ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !isFormValid}
              className="px-5 h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                  Testing...
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
              className="px-5 h-10 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Connection
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Files Modal Component
const FILE_TYPE_COLORS: Record<string, string> = {
  'Excel': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Csv': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Json': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Xml': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'Word': 'bg-blue-600/10 text-blue-700 dark:text-blue-300',
  'Text': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="bg-white dark:bg-[#111113] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[420px] shadow-2xl dark:shadow-black/50 overflow-hidden max-h-[85vh] sm:max-h-[520px] border border-gray-200/50 dark:border-white/[0.08] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Files</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} uploaded</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onUpload}
              className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06] mx-4 flex-shrink-0" />

        {/* List */}
        <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {files.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No files uploaded</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Upload CSV, Excel, or JSON files to analyze</p>
              <button
                onClick={onUpload}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </button>
            </div>
          ) : (
            <div className="p-2">
              {files.map((file, i) => {
                const isSelected = file.id === selectedFileId;
                const typeName = getFileTypeName(file.fileType);
                const typeColor = FILE_TYPE_COLORS[typeName] || FILE_TYPE_COLORS['Text'];
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-gray-100/80 dark:bg-white/[0.06]"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }`}
                    onClick={() => onSelect(file.id)}
                  >
                    {/* File type badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase tracking-wide ${typeColor}`}>
                      {typeName.slice(0, 3)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate transition-colors ${isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                        {file.originalFileName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatFileSize(file.fileSizeBytes)}</span>
                        {file.rowCount != null && file.rowCount > 0 && (
                          <>
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">{file.rowCount.toLocaleString()} rows</span>
                          </>
                        )}
                        {file.columns && file.columns.length > 0 && (
                          <>
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">{file.columns.length} cols</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection check */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white dark:text-[#111113]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Delete - show on hover */}
                    {!isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
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
    <div className={`fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'sm:p-4'}`}>
      <div className={`bg-white dark:bg-[#0c0c0e] flex flex-col transition-all duration-300 border border-gray-200/50 dark:border-white/[0.08] shadow-2xl dark:shadow-2xl dark:shadow-black/40 ${
        isFullscreen
          ? 'w-full h-full rounded-none'
          : 'rounded-t-2xl sm:rounded-2xl w-full sm:max-w-6xl max-h-[90vh] sm:max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className={`border-b border-gray-100 dark:border-white/[0.06] ${isFullscreen ? 'p-4' : 'p-3 sm:p-6'}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{databaseName}</h2>
              {schema && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {getDatabaseTypeName(schema.databaseType as DatabaseType)} • {(schema.tables || []).length} tables
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* View Mode Toggle - visible on sm+ in header row, shown below on mobile */}
              <div className="hidden sm:flex bg-gray-100 dark:bg-white/[0.04] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("diagram")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "diagram" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Diagram
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "list" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  List
                </button>
              </div>
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
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
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* View Mode Toggle - mobile only, second row */}
          <div className="flex sm:hidden mb-2">
            <div className="flex bg-gray-100 dark:bg-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setViewMode("diagram")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "diagram" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Diagram
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "list" ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                List
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
              className="w-full h-10 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-xl pl-10 pr-10 text-sm outline-none focus:border-gray-400 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-white/[0.06] transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-white/[0.06] border-t-gray-800 dark:border-t-white rounded-full animate-spin" />
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
            <div className="p-3 sm:p-6">
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
      regex.test(part) ? <mark key={i} className="bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white rounded px-0.5">{part}</mark> : part
    );
  };
  const initialPositions = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const headerH = 36;
    const colH = 28;
    const gap = 40;

    // Calculate the max table height per row for proper spacing
    const rowHeights: number[] = [];
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const tableHeight = headerH + table.columns.length * colH;
      rowHeights[row] = Math.max(rowHeights[row] || 0, tableHeight);
    });

    const pos: Record<string, { x: number; y: number }> = {};
    tables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      // Sum up heights of all previous rows
      let yOffset = 80;
      for (let r = 0; r < row; r++) {
        yOffset += (rowHeights[r] || 0) + gap;
      }
      pos[table.name] = {
        x: 80 + col * 300,
        y: yOffset,
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

  // Touch support for mobile
  const pinchDistRef = useRef<number | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.erd-table')) return;
    if (e.touches.length === 2) {
      pinchDistRef.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTableTouchStart = (tableName: string, e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const rect = (e.target as HTMLElement).closest('.erd-table')?.getBoundingClientRect();
    if (rect) {
      setDragging(tableName);
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const newDist = getTouchDistance(e.touches);
      const delta = (newDist - pinchDistRef.current) * 0.005;
      const newScale = Math.min(Math.max(scale + delta, 0.3), 2);
      setScale(newScale);
      pinchDistRef.current = newDist;
    } else if (dragging && containerRef.current && e.touches.length === 1) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setPositions(prev => ({
        ...prev,
        [dragging]: {
          x: (e.touches[0].clientX - containerRect.left - dragOffset.x - pan.x) / scale,
          y: (e.touches[0].clientY - containerRect.top - dragOffset.y - pan.y) / scale,
        },
      }));
    } else if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setDragging(null);
    setIsPanning(false);
    pinchDistRef.current = null;
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
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 touch-none min-h-[50vh] sm:min-h-[500px] ${
        isPanning ? 'cursor-grabbing' : dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

      {/* Zoom Controls - hidden on mobile (touch gestures replace) */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex gap-2 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-sm rounded-xl p-2 shadow-lg border border-gray-200 dark:border-white/[0.06]">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-white dark:bg-white/[0.04] rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.06] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors text-gray-700 dark:text-gray-200"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-white dark:bg-white/[0.04] rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.06] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors text-gray-700 dark:text-gray-200"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <div className="w-px bg-gray-200 dark:bg-white/[0.07]" />
        <span className="flex items-center px-2 text-xs text-gray-500 dark:text-gray-400 font-medium min-w-[50px] justify-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px bg-gray-200 dark:bg-white/[0.07]" />
        <button
          onClick={() => { setScale(0.8); setPan({ x: 0, y: 0 }); }}
          className="px-3 h-8 bg-white dark:bg-white/[0.04] rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.06] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/[0.06] text-xs font-medium transition-colors text-gray-700 dark:text-gray-200"
          title="Reset view"
        >
          Fit
        </button>
      </div>

      {/* Instructions hint - hidden on mobile */}
      <div className="absolute top-4 left-4 z-10 hidden sm:block text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 dark:border-white/[0.06]">
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
              <polygon points="0 0, 10 3.5, 0 7" fill={isDark ? '#555' : '#9ca3af'} />
            </marker>
          </defs>
          {relationships.map((rel, idx) => {
            const fromPos = positions[rel.fromTable];
            const toPos = positions[rel.toTable];
            const fromTable = tables.find(t => t.name === rel.fromTable);
            const toTable = tables.find(t => t.name === rel.toTable);

            if (!fromPos || !toPos || !fromTable || !toTable) return null;

            const strokeColor = isDark ? '#555' : '#9ca3af';

            // SVG offset compensation
            const svgOffset = 1000;
            const tableWidth = 240;
            const fromY = fromPos.y + getColumnYOffset(fromTable, rel.fromColumn) + svgOffset;
            const toY = toPos.y + getColumnYOffset(toTable, rel.toColumn) + svgOffset;

            // Self-referencing FK (same table) — loop out to the right and back
            if (rel.fromTable === rel.toTable) {
              const rightEdge = fromPos.x + tableWidth + svgOffset;
              const loopOffset = 40 + idx * 8; // stagger multiple self-refs
              let path: string;

              if (rel.fromColumn === rel.toColumn) {
                // Same column self-ref: small bump loop (out right, up, and back)
                const bumpHeight = 20;
                path = `M ${rightEdge} ${fromY} C ${rightEdge + loopOffset} ${fromY - bumpHeight}, ${rightEdge + loopOffset} ${fromY + bumpHeight}, ${rightEdge} ${fromY}`;
              } else {
                // Different columns same table: curve out to the right between the two rows
                path = `M ${rightEdge} ${fromY} C ${rightEdge + loopOffset} ${fromY}, ${rightEdge + loopOffset} ${toY}, ${rightEdge} ${toY}`;
              }

              return (
                <g key={idx}>
                  <path
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                    strokeDasharray="4 3"
                    className="opacity-60"
                  />
                  <circle cx={rightEdge} cy={fromY} r="3" fill={strokeColor} className="opacity-60" />
                </g>
              );
            }

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
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                  className="opacity-60"
                />
                {/* FK indicator dot */}
                <circle cx={startX} cy={fromY} r="3" fill={strokeColor} className="opacity-60" />
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
              className="erd-table absolute bg-white dark:bg-[#0c0c0e] rounded-xl shadow-lg border border-gray-200 dark:border-white/[0.06] overflow-hidden select-none"
              style={{
                left: pos.x,
                top: pos.y,
                width: 240,
                cursor: dragging === table.name ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(table.name, e)}
              onTouchStart={(e) => handleTableTouchStart(table.name, e)}
            >
              {/* Table Header */}
              <div className="bg-gray-900 dark:bg-white/[0.04] text-white px-3 py-2 flex items-center gap-2">
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
                className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-[#0c0c0e]"
              >
                {table.columns.map(column => (
                  <div
                    key={column.name}
                    className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-gray-50 dark:hover:bg-white/[0.06]"
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
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-white/10" />
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
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.06] px-3 py-2">
        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
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
      regex.test(part) ? <mark key={i} className="bg-gray-200 dark:bg-white/15 text-gray-900 dark:text-white rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#0c0c0e]">
      {/* Table Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-[#0c0c0e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{highlightMatch(table.name)}</span>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 text-xs text-gray-500 dark:text-gray-400 pl-6 sm:pl-0">
          <span>{table.columns.length} cols</span>
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
        <div className="border-t border-gray-200 dark:border-white/[0.06]">
          {/* Columns */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {table.columns.map((column) => (
              <div
                key={column.name}
                className="px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-5 flex justify-center shrink-0">
                    {pkColumns.has(column.name) ? (
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                      </svg>
                    ) : fkColumns.has(column.name) ? (
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-white/10" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{highlightMatch(column.name)}</span>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 pl-7 sm:pl-0 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded">
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
            <div className="border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-3 sm:px-4 py-2.5 sm:py-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Foreign Keys</p>
              <div className="space-y-1.5">
                {table.foreignKeys.map((fk, idx) => (
                  <div key={idx} className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-mono bg-white dark:bg-[#0c0c0e] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 truncate max-w-[40vw] sm:max-w-none">
                      {fk.column}
                    </span>
                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-mono bg-white dark:bg-[#0c0c0e] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 truncate max-w-[40vw] sm:max-w-none">
                      {fk.referencedTable}.{fk.referencedColumn}
                    </span>
                    {(fk.onDelete || fk.onUpdate) && (
                      <span className="text-gray-400 text-[10px] sm:text-xs">
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
            <div className="border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-3 sm:px-4 py-2.5 sm:py-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Indexes</p>
              <div className="space-y-1.5">
                {table.indexes.map((index, idx) => (
                  <div key={idx} className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium truncate max-w-[40vw] sm:max-w-none">{index.name}</span>
                    <span className="text-gray-400">on</span>
                    <span className="font-mono bg-white dark:bg-[#0c0c0e] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 truncate max-w-[40vw] sm:max-w-none">
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
