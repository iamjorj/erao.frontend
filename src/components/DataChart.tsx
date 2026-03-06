"use client";

import { useMemo, useState, useEffect, useCallback, useRef, memo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

export type ChartType = "bar" | "line" | "pie" | "area" | "table";
export type AggregationType = 'COUNT' | 'AVG' | 'SUM' | 'MIN' | 'MAX';

export interface ChartSettings {
  yAxisMin: number | 'auto';
  yAxisMax: number | 'auto';
  barWidth: number; // 20-100 percentage
  showDataLabels: boolean;
  showGridLines: boolean;
  colorTheme: 'monochrome' | 'colorful' | 'blue' | 'green' | 'purple' | 'custom';
  legendPosition: 'top' | 'bottom' | 'hidden';
  customColors?: string[]; // For custom color theme
}

export const defaultChartSettings: ChartSettings = {
  yAxisMin: 'auto',
  yAxisMax: 'auto',
  barWidth: 60,
  showDataLabels: false,
  showGridLines: true,
  colorTheme: 'colorful',
  legendPosition: 'bottom',
};

// Chart manipulation state
export interface ChartManipulation {
  excludedCategories: Set<string>;
  columnAggregations: Record<string, AggregationType>;
  hiddenColumns: Set<string>;
  groupByColumn?: string;
}

interface DataChartProps {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: ChartType;
  settings?: ChartSettings;
  manipulation?: ChartManipulation;
  onManipulationChange?: (manipulation: ChartManipulation) => void;
  fillContainer?: boolean; // When true, chart fills parent container instead of using fixed height
  borderless?: boolean; // When true, removes padding, bg, and rounded corners (for focus mode)
  preferredGroupColumn?: string; // AI-suggested group column (from viz hint)
}

// Hook to detect screen size
function useScreenSize(): "mobile" | "tablet" | "desktop" {
  const [size, setSize] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 640) setSize("mobile");
      else if (w < 1024) setSize("tablet");
      else setSize("desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return size;
}

// Color palettes for charts — modern muted SaaS palette (Stripe/Notion style)
const COLOR_THEMES: Record<ChartSettings['colorTheme'], string[]> = {
  colorful: [
    "#6366f1", // indigo
    "#22d3ee", // cyan
    "#f472b6", // pink
    "#a78bfa", // violet
    "#34d399", // emerald
    "#fbbf24", // amber
    "#f87171", // rose
    "#38bdf8", // sky
    "#4ade80", // green
    "#fb923c", // orange
  ],
  monochrome: [
    "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569",
    "#334155", "#1e293b", "#0f172a", "#f1f5f9", "#f8fafc",
  ],
  blue: [
    "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#a5b4fc",
    "#c7d2fe", "#3730a3", "#312e81", "#e0e7ff", "#eef2ff",
  ],
  green: [
    "#34d399", "#10b981", "#059669", "#047857", "#6ee7b7",
    "#a7f3d0", "#065f46", "#064e3b", "#d1fae5", "#ecfdf5",
  ],
  purple: [
    "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#c4b5fd",
    "#ddd6fe", "#5b21b6", "#4c1d95", "#ede9fe", "#f5f3ff",
  ],
  custom: [], // Custom colors provided via settings.customColors
};

// Default colors for backwards compatibility
const COLORS = COLOR_THEMES.colorful;

// Dark mode detection hook
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains("dark") : false
  );

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Truncate long labels
function truncateLabel(label: string, maxLength: number = 15): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + "...";
}

// Convert hex color to rgba string
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Column semantic type detection
type ColumnSemanticType = 'id' | 'score' | 'percentage' | 'count' | 'amount' | 'numeric' | 'junk' | 'boolean' | 'year';

function detectColumnType(columnName: string, data?: Record<string, unknown>[]): ColumnSemanticType {
  const name = stripAggPrefix(columnName).toLowerCase();

  // Boolean/flag columns
  if (name.startsWith('is_') || name.startsWith('has_') || name.startsWith('can_') ||
      name === 'flag' || name.includes('_flag') ||
      name === 'active' || name === 'enabled' || name === 'verified' || name === 'deleted' ||
      name === 'approved' || name === 'published' || name === 'archived' ||
      name.startsWith('is') && name.length > 2 && name[2] === name[2].toUpperCase()) {
    return 'boolean';
  }

  // Data-based boolean detection
  if (data && data.length > 0) {
    const sampleSize = Math.min(data.length, 200);
    let allBoolean = true;
    const booleanValues = new Set(['0', '1', 'true', 'false', 'yes', 'no']);
    for (let i = 0; i < sampleSize; i++) {
      const val = data[i][columnName];
      if (val === null || val === undefined || val === '') continue;
      if (typeof val === 'boolean') continue;
      const strVal = String(val).toLowerCase().trim();
      if (!booleanValues.has(strVal)) {
        allBoolean = false;
        break;
      }
    }
    if (allBoolean) return 'boolean';
  }

  // Year-like columns
  if (name === 'year' || name === 'yr' || name.includes('_year') || name.includes('year_')) {
    return 'year';
  }
  if (data && data.length > 0) {
    const sampleSize = Math.min(data.length, 200);
    let allYearLike = true;
    const yearValues = new Set<number>();
    let nonNullCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const val = data[i][columnName];
      if (val === null || val === undefined || val === '') continue;
      nonNullCount++;
      const numVal = typeof val === 'number' ? val : Number(val);
      if (!Number.isInteger(numVal) || numVal < 1900 || numVal > 2100) {
        allYearLike = false;
        break;
      }
      yearValues.add(numVal);
    }
    if (allYearLike && nonNullCount > 0 && yearValues.size <= 30) {
      return 'year';
    }
  }

  // Junk columns
  if (name === 'rownum' || name === 'row_number' || name === 'rn' || name === 'row_num' ||
      name === 'sno' || name === 's_no' || name === 'sr_no' || name === 'serial' ||
      name === 'row' || name === '#') {
    return 'junk';
  }

  // ID columns
  if (name.includes('_id') || name.endsWith('id') || name === 'id' ||
      name.includes('_key') || name.endsWith('key') ||
      name.includes('_no') || name.endsWith('no') || name === 'no' ||
      name.includes('_code') || name.endsWith('code') ||
      name.includes('index')) {
    return 'id';
  }

  // Score/Rating/Measurement columns
  if (name.includes('score') || name.includes('rating') || name.includes('grade') ||
      name.includes('cgpa') || name.includes('gpa') || name.includes('marks') ||
      name.includes('rank') || name.includes('level') || name.includes('tier') ||
      name.includes('points') || name.includes('stars') ||
      name.includes('hour') || name.includes('duration') || name.includes('minute') ||
      name.includes('age') || name.includes('sleep') || name.includes('activity') ||
      name.includes('weight') || name.includes('height') || name.includes('bmi') ||
      name.includes('temperature') || name.includes('temp') ||
      name.includes('depression') || name.includes('anxiety') || name.includes('satisfaction') ||
      name.includes('distance') || name.includes('speed') || name.includes('average') ||
      name.includes('mean') || name.includes('median')) {
    return 'score';
  }

  // Percentage columns
  if (name.includes('percent') || name.includes('pct') || name.includes('rate') ||
      name.includes('ratio') || name.includes('proportion') || name.endsWith('%')) {
    return 'percentage';
  }

  // Count columns
  if (name.includes('count') || name.includes('quantity') || name.includes('qty') ||
      name.includes('num_') || name.startsWith('n_') || name.includes('total') ||
      name.includes('_cnt')) {
    return 'count';
  }

  // Amount/Money/Financial columns
  if (name.includes('amount') || name.includes('price') || name.includes('cost') ||
      name.includes('revenue') || name.includes('salary') || name.includes('income') ||
      name.includes('expense') || name.includes('payment') || name.includes('fee') ||
      name.includes('balance') || name.includes('budget') || name.includes('profit') ||
      name.includes('loss') || name.includes('value') || name.includes('sum') ||
      name.includes('money') || name.includes('$') || name.includes('usd') ||
      name.includes('eur') || name.includes('gbp') ||
      name === 'mrr' || name === 'arr' || name === 'acv' || name === 'tcv' ||
      name.includes('investment') || name.includes('funding') || name.includes('valuation') ||
      name.includes('capital') || name.includes('equity') || name.includes('debt') ||
      name.includes('asset') || name.includes('liability') ||
      name.includes('sales') || name.includes('turnover') || name.includes('margin') ||
      name.includes('earning') || name.includes('dividend') || name.includes('roi') ||
      name.includes('spend') || name.includes('tax') || name.includes('wage') ||
      name.includes('bonus') || name.includes('commission') || name.includes('rent') ||
      name.includes('loan') || name.includes('deposit') || name.includes('withdraw')) {
    return 'amount';
  }

  return 'numeric';
}

// Get the default aggregation for a column based on its semantic type
export function getDefaultAggregationForColumn(colName: string, data?: Record<string, unknown>[]): AggregationType {
  const type = detectColumnType(colName, data);
  switch (type) {
    case 'boolean': return 'SUM';
    case 'year': return 'COUNT';
    case 'percentage': return 'AVG';
    case 'score': return 'AVG';
    case 'count': return 'SUM';
    case 'amount': return 'SUM';
    case 'id':
    case 'junk':
      return 'COUNT';
    case 'numeric':
    default: {
      if (data && data.length > 0) {
        const sample = data.slice(0, 50).map(row => {
          const val = row[colName];
          return typeof val === 'number' ? val : Number(val) || 0;
        }).filter(v => v !== 0);
        if (sample.length > 0) {
          const max = Math.max(...sample);
          return max <= 100 ? 'AVG' : 'SUM';
        }
      }
      return 'SUM';
    }
  }
}

// Helper to count unique values with early exit
function countUniqueValues(data: Record<string, unknown>[], col: string, maxCheck: number = 100): number {
  const sampleSize = Math.min(data.length, 2000);
  const uniqueValues = new Set<string>();

  for (let i = 0; i < sampleSize; i++) {
    uniqueValues.add(String(data[i][col] ?? ''));
    if (uniqueValues.size > maxCheck) return uniqueValues.size;
  }

  return uniqueValues.size;
}

// Check if a column contains date-like values
function isDateLikeColumn(data: Record<string, unknown>[], columnName: string): boolean {
  const sampleSize = Math.min(data.length, 50);
  let dateCount = 0;
  let nonNullCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const val = data[i][columnName];
    if (val === null || val === undefined || val === '') continue;
    nonNullCount++;

    const strVal = String(val).trim();
    if (/^\d+$/.test(strVal) && (Number(strVal) < 1900 || Number(strVal) > 2100)) continue;

    const parsed = new Date(strVal);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 1900 && year <= 2100) {
        dateCount++;
      }
    }
  }

  return nonNullCount > 0 && dateCount >= nonNullCount * 0.8;
}

// Format a date-like value for chart axis labels
function formatDateLabel(value: string): string {
  const trimmed = value.trim();

  // Pure year values (e.g. "2022", "2023") — return as-is, don't parse as date
  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed);
    if (year >= 1900 && year <= 2100) return trimmed;
  }

  // Pure integer that's not a year — return as-is
  if (/^\d+$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);

  if (isNaN(parsed.getTime())) return trimmed;

  const year = parsed.getFullYear();
  if (year < 1900 || year > 2100) return trimmed;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[parsed.getMonth()];
  const day = parsed.getDate();
  const yearShort = `'${String(year).slice(2)}`;

  if (/^\d{4}-\d{2}$/.test(trimmed) || (day === 1 && /^\d{4}-\d{2}-01/.test(trimmed))) {
    return `${month} ${yearShort}`;
  }

  return `${month} ${day} ${yearShort}`;
}

// Find the best categorical column for grouping
function findBestCategoricalColumn(
  data: Record<string, unknown>[],
  columns: string[],
  numericColumns: string[]
): string | null {
  const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));

  const categoryPatterns = [
    'category', 'type', 'status', 'gender', 'sex', 'class', 'group', 'department',
    'region', 'country', 'state', 'city', 'branch', 'segment', 'channel',
    'product', 'brand', 'vendor', 'supplier', 'customer_type', 'user_type',
    'year', 'month', 'quarter', 'period', 'day', 'weekday'
  ];

  for (const pattern of categoryPatterns) {
    const match = nonNumericColumns.find(col => col.toLowerCase().includes(pattern));
    if (match) {
      const uniqueCount = countUniqueValues(data, match, 50);
      if (uniqueCount >= 2 && uniqueCount <= 50) {
        return match;
      }
    }
  }

  for (const col of nonNumericColumns) {
    const uniqueCount = countUniqueValues(data, col, 30);
    if (uniqueCount >= 2 && uniqueCount <= 30) {
      return col;
    }
  }

  if (nonNumericColumns.length > 0) {
    const firstCol = nonNumericColumns[0];
    const uniqueCount = countUniqueValues(data, firstCol, 100);
    if (uniqueCount <= 100) {
      return firstCol;
    }
  }

  return null;
}

// Filter out columns with vastly different scales
function filterScaleMismatchColumns(data: Record<string, unknown>[], columns: string[]): string[] {
  if (columns.length <= 1) return columns;

  const sampleSize = Math.min(data.length, 200);
  const maxValues: Record<string, number> = {};

  for (const col of columns) {
    let colMax = 0;
    for (let i = 0; i < sampleSize; i++) {
      const val = data[i][col];
      const numVal = typeof val === 'number' ? Math.abs(val) : Math.abs(Number(val) || 0);
      if (numVal > colMax) colMax = numVal;
    }
    maxValues[col] = colMax;
  }

  const overallMax = Math.max(...Object.values(maxValues));
  if (overallMax === 0) return columns;

  const filtered = columns.filter(col => {
    const colMax = maxValues[col];
    return colMax >= overallMax * 0.01;
  });

  return filtered.length > 0 ? filtered : columns;
}

// Strip all leading aggregation prefixes from a column name
function stripAggPrefix(name: string): string {
  let result = name;
  const spaceRe = /^(avg |average |total |count of |count |sum |min |max )/i;
  const underRe = /^(avg_|total_|count_|sum_|min_|max_)/i;
  // Strip repeatedly to handle nested prefixes like "Total Total ..." or "total_avg_..."
  for (let i = 0; i < 5; i++) {
    const prev = result;
    // Space-separated prefixes
    if (spaceRe.test(result)) {
      result = result.replace(spaceRe, '').trim();
    }
    // Underscore-separated prefixes — also clean underscores to spaces
    else if (underRe.test(result)) {
      result = result.replace(underRe, '');
      result = result.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
    if (result === prev) break;
  }
  return result || name;
}

// Build a display name for a column+aggregation
function buildDisplayName(col: string, aggregation: AggregationType, detectedType?: ColumnSemanticType): string {
  const cleanName = stripAggPrefix(col);

  if (detectedType === 'boolean') {
    if (aggregation === 'COUNT') return `Count ${cleanName}`;
    if (aggregation === 'SUM') return cleanName;
    return cleanName;
  }

  switch (aggregation) {
    case 'COUNT': return `Count ${cleanName}`;
    case 'AVG': return `Avg ${cleanName}`;
    case 'SUM': return `Total ${cleanName}`;
    case 'MIN': return `Min ${cleanName}`;
    case 'MAX': return `Max ${cleanName}`;
    default: return cleanName;
  }
}

// Aggregate info for tooltip/legend
interface AggregationInfo {
  column: string;
  aggregation: AggregationType;
  displayName: string;
  detectedType: ColumnSemanticType;
}

// Smart aggregation based on column semantics
function smartAggregateData(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxItems: number = 50,
  userAggregations?: Record<string, AggregationType>,
  excludedCategories?: Set<string>
): { chartData: Record<string, unknown>[]; aggregationInfo: AggregationInfo[] } {
  const aggregationInfo: AggregationInfo[] = valueColumns.map(col => {
    const detectedType = detectColumnType(col, data);

    if (userAggregations && userAggregations[col]) {
      const aggregation = userAggregations[col];
      return {
        column: col,
        aggregation,
        displayName: buildDisplayName(col, aggregation, detectedType),
        detectedType,
      };
    }

    const aggregation = getDefaultAggregationForColumn(col, data);
    return { column: col, aggregation, displayName: buildDisplayName(col, aggregation, detectedType), detectedType };
  });

  interface GroupStats {
    count: number;
    stats: Record<string, { sum: number; count: number; min: number; max: number }>;
  }
  const grouped = new Map<string, GroupStats>();

  data.forEach((row) => {
    const label = String(row[labelColumn] ?? "Unknown");

    if (excludedCategories?.has(label)) return;

    if (!grouped.has(label)) {
      const stats: Record<string, { sum: number; count: number; min: number; max: number }> = {};
      valueColumns.forEach((col) => {
        stats[col] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      });
      grouped.set(label, { count: 0, stats });
    }
    const group = grouped.get(label)!;
    group.count++;
    valueColumns.forEach((col) => {
      const val = row[col];
      const numVal = typeof val === "number" ? val : Number(val) || 0;
      const s = group.stats[col];
      s.sum += numVal;
      s.count++;
      if (numVal < s.min) s.min = numVal;
      if (numVal > s.max) s.max = numVal;
    });
  });

  const result: Record<string, unknown>[] = Array.from(grouped.entries()).map(([label, group]) => {
    const item: Record<string, unknown> = {
      name: truncateLabel(label),
      fullName: label,
      _count: group.count,
    };

    aggregationInfo.forEach(({ column, aggregation }) => {
      const s = group.stats[column];
      let calcResult: number;

      switch (aggregation) {
        case 'COUNT':
          calcResult = s.count;
          break;
        case 'AVG':
          calcResult = s.count > 0 ? Math.round((s.sum / s.count) * 100) / 100 : 0;
          break;
        case 'SUM':
          calcResult = s.sum;
          break;
        case 'MIN':
          calcResult = s.min === Infinity ? 0 : s.min;
          break;
        case 'MAX':
          calcResult = s.max === -Infinity ? 0 : s.max;
          break;
      }

      item[column] = calcResult;
    });

    return item;
  });

  result.sort((a, b) => (b._count as number) - (a._count as number));

  return { chartData: result.slice(0, maxItems), aggregationInfo };
}

// Check if label column is categorical
function isCategoricalColumn(data: Record<string, unknown>[], labelColumn: string): boolean {
  const sampleSize = Math.min(data.length, 1000);
  const uniqueValues = new Set<string>();

  for (let i = 0; i < sampleSize; i++) {
    uniqueValues.add(String(data[i][labelColumn] ?? ""));
    if (uniqueValues.size > 30) return false;
  }

  return uniqueValues.size >= 2 && uniqueValues.size <= 30 && uniqueValues.size < sampleSize * 0.5;
}

// Sample data with rolling average for smooth line/area charts
function sampleDataWithRollingAvg(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxPoints: number = 50,
  aggregationInfo: AggregationInfo[]
): Record<string, unknown>[] {
  const isDateColumn = isDateLikeColumn(data, labelColumn);

  if (data.length <= maxPoints) {
    return data.map((row, idx) => {
      const rawName = String(row[labelColumn] ?? `Row ${idx + 1}`);
      const fullName = rawName;
      const displayName = isDateColumn ? formatDateLabel(rawName) : truncateLabel(rawName, 12);
      const item: Record<string, unknown> = {
        name: displayName,
        fullName: fullName,
        _index: idx,
      };
      valueColumns.forEach((col) => {
        const val = row[col];
        item[col] = typeof val === "number" ? val : Number(val) || 0;
      });
      return item;
    });
  }

  const bucketSize = Math.ceil(data.length / maxPoints);
  const sampled: Record<string, unknown>[] = [];
  let bucketIndex = 0;

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, Math.min(i + bucketSize, data.length));
    const firstRow = bucket[0];
    const lastRow = bucket[bucket.length - 1];

    const startLabel = String(firstRow[labelColumn] ?? `Row ${i + 1}`);
    const endLabel = String(lastRow[labelColumn] ?? `Row ${i + bucket.length}`);
    let label: string;
    if (isDateColumn) {
      label = bucket.length > 1
        ? `${formatDateLabel(startLabel)}-${formatDateLabel(endLabel)}`
        : formatDateLabel(startLabel);
    } else {
      label = bucket.length > 1 ? `${bucketIndex + 1}` : truncateLabel(startLabel, 10);
    }

    const item: Record<string, unknown> = {
      name: label,
      fullName: bucket.length > 1 ? `${startLabel} to ${endLabel} (${bucket.length} rows)` : startLabel,
      _bucketSize: bucket.length,
      _bucketIndex: bucketIndex,
    };
    bucketIndex++;

    valueColumns.forEach((col) => {
      const info = aggregationInfo.find(a => a.column === col);
      const values = bucket.map(row => {
        const val = row[col];
        return typeof val === "number" ? val : Number(val) || 0;
      });

      if (info?.aggregation === 'SUM') {
        item[col] = values.reduce((a, b) => a + b, 0);
      } else if (info?.aggregation === 'COUNT') {
        item[col] = values.length;
      } else {
        item[col] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      }
    });

    sampled.push(item);
  }

  return sampled;
}

export const DataChart = memo(function DataChart({
  data,
  columns,
  chartType,
  settings = defaultChartSettings,
  manipulation,
  onManipulationChange,
  fillContainer = false,
  borderless = false,
  preferredGroupColumn,
}: DataChartProps) {
  const isDark = useDarkMode();
  const screenSize = useScreenSize();
  const isMobile = screenSize === "mobile";

  // Local state for manipulation if not controlled
  const [localManipulation, setLocalManipulation] = useState<ChartManipulation>({
    excludedCategories: new Set(),
    columnAggregations: {},
    hiddenColumns: new Set(),
  });

  const currentManipulation = manipulation || localManipulation;
  const setManipulation = onManipulationChange || setLocalManipulation;

  // Get colors based on theme setting
  const chartColors = settings.colorTheme === 'custom' && settings.customColors?.length
    ? settings.customColors
    : COLOR_THEMES[settings.colorTheme] || COLORS;

  // Responsive chart dimensions (base)
  const baseChartHeight = fillContainer ? "100%" : (isMobile ? 340 : screenSize === "tablet" ? 300 : 320);

  // Memoize all chart data processing
  const chartConfig = useMemo(() => {
    if (!data || data.length === 0 || chartType === "table") {
      return null;
    }

    const numericColumns = columns.filter(col =>
      data.some(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === "number") return true;
        const numVal = Number(val);
        return !isNaN(numVal) && isFinite(numVal);
      })
    );

    const bestCategoryColumn = findBestCategoricalColumn(data, columns, numericColumns);
    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));

    const resolvedManualGroup = currentManipulation.groupByColumn
      ? columns.find(col => col.toLowerCase() === currentManipulation.groupByColumn!.toLowerCase())
      : undefined;

    const resolvedPreferred = preferredGroupColumn
      ? columns.find(col => col.toLowerCase() === preferredGroupColumn.toLowerCase())
      : undefined;

    const labelColumn = resolvedManualGroup || resolvedPreferred || bestCategoryColumn || (nonNumericColumns.length > 0 ? nonNumericColumns[0] : columns[0]);

    const dataColumns = numericColumns.filter(col => col !== labelColumn);

    const rawDataColumns = dataColumns.length > 0
      ? dataColumns
      : numericColumns.length > 1
        ? numericColumns.slice(1)
        : numericColumns;

    const allDataColumns = (() => {
      const noJunk = rawDataColumns.filter(col => detectColumnType(col, data) !== 'junk');
      if (noJunk.length === 0) return rawDataColumns;

      const noIds = noJunk.filter(col => detectColumnType(col, data) !== 'id');
      const afterIds = noIds.length > 0 ? noIds : noJunk;

      const noBooleans = afterIds.filter(col => detectColumnType(col, data) !== 'boolean');
      const afterBooleans = noBooleans.length > 0 ? noBooleans : afterIds;

      const noYears = afterBooleans.filter(col => detectColumnType(col, data) !== 'year');
      return noYears.length > 0 ? noYears : afterBooleans;
    })();

    const finalDataColumns = allDataColumns.filter(col => !currentManipulation.hiddenColumns.has(col));

    const allAvailableColumns = rawDataColumns;

    if (finalDataColumns.length === 0) {
      return null;
    }

    const isLargeDataset = data.length > 50;

    const aggregationInfo: AggregationInfo[] = finalDataColumns.map(col => {
      const type = detectColumnType(col, data);

      if (currentManipulation.columnAggregations[col]) {
        const aggregation = currentManipulation.columnAggregations[col];
        return { column: col, aggregation, displayName: buildDisplayName(col, aggregation, type), detectedType: type };
      }

      const aggregation = getDefaultAggregationForColumn(col, data);
      return { column: col, aggregation, displayName: buildDisplayName(col, aggregation, type), detectedType: type };
    });

    const isCategorical = isCategoricalColumn(data, labelColumn);

    const hasExclusions = currentManipulation.excludedCategories.size > 0;
    const filteredData = hasExclusions
      ? data.filter(row => !currentManipulation.excludedCategories.has(String(row[labelColumn] ?? "Unknown")))
      : data;

    const hasUserAggregations = Object.keys(currentManipulation.columnAggregations).length > 0;

    let chartData: Record<string, unknown>[];
    let finalAggregationInfo = aggregationInfo;

    const effectiveIsLargeDataset = filteredData.length > 50;

    if (isCategorical || hasUserAggregations) {
      const maxItems = chartType === "pie" ? 10 : 50;
      const result = smartAggregateData(
        filteredData,
        labelColumn,
        finalDataColumns,
        maxItems,
        currentManipulation.columnAggregations
      );
      chartData = result.chartData;
      finalAggregationInfo = result.aggregationInfo;
    } else if (chartType === "line" || chartType === "area") {
      chartData = sampleDataWithRollingAvg(filteredData, labelColumn, finalDataColumns, 60, aggregationInfo);
    } else {
      if (effectiveIsLargeDataset) {
        const result = smartAggregateData(
          filteredData,
          labelColumn,
          finalDataColumns,
          chartType === "pie" ? 10 : 30,
          currentManipulation.columnAggregations
        );
        chartData = result.chartData;
        finalAggregationInfo = result.aggregationInfo;
      } else {
        const uniqueLabels = new Set(filteredData.map(row => String(row[labelColumn] ?? "")));
        if (uniqueLabels.size < filteredData.length * 0.8) {
          const result = smartAggregateData(
            filteredData,
            labelColumn,
            finalDataColumns,
            chartType === "pie" ? 10 : 30,
            currentManipulation.columnAggregations
          );
          chartData = result.chartData;
          finalAggregationInfo = result.aggregationInfo;
        } else {
          chartData = filteredData.slice(0, 50).map((row) => {
            const fullName = String(row[labelColumn] ?? "");
            const item: Record<string, unknown> = {
              name: truncateLabel(fullName),
              fullName: fullName,
            };
            finalDataColumns.forEach((col) => {
              const val = row[col];
              item[col] = typeof val === "number" ? val : Number(val) || 0;
            });
            return item;
          });
        }
      }
    }

    const allCategoriesSet = new Set<string>();
    for (let i = 0; i < data.length && allCategoriesSet.size < 500; i++) {
      allCategoriesSet.add(String(data[i][labelColumn] ?? "Unknown"));
    }
    const allCategories = Array.from(allCategoriesSet);

    const hasNonZeroValues = chartData.some((item) =>
      finalDataColumns.some((col) => {
        const val = item[col];
        if (val === undefined || val === null) return false;
        const num = Number(val);
        return !isNaN(num) && num !== 0;
      })
    );

    let pieData: Array<{ name: string; fullName: string; value: number }> = [];
    if (chartType === "pie") {
      if (finalDataColumns.length === 1) {
        pieData = chartData.map((item) => ({
          name: item.name as string,
          fullName: item.fullName as string,
          value: item[finalDataColumns[0]] as number,
        }));
      } else {
        pieData = finalDataColumns.map((col) => {
          const info = finalAggregationInfo.find(a => a.column === col);
          const values = chartData.map(item => item[col] as number);
          let value: number;

          if (info?.aggregation === 'AVG') {
            value = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
          } else {
            value = values.reduce((a, b) => a + b, 0);
          }

          return {
            name: info?.displayName || col,
            fullName: col,
            value,
          };
        });
      }
      pieData = pieData.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
    }

    let chartDescription = '';
    if ((isLargeDataset || isCategorical) && bestCategoryColumn) {
      const firstAgg = finalAggregationInfo[0];
      if (firstAgg) {
        chartDescription = `${firstAgg.displayName} by ${labelColumn}`;
      }
    }

    return {
      chartData,
      dataColumns: finalDataColumns,
      allAvailableColumns,
      pieData,
      hasNonZeroValues,
      isLargeDataset,
      aggregationInfo: finalAggregationInfo,
      labelColumn,
      chartDescription,
      isCategorical,
      allCategories,
    };
  }, [data, columns, chartType, currentManipulation, preferredGroupColumn]);

  // Extract values from chartConfig
  const chartData = chartConfig?.chartData ?? [];
  const dataColumns = chartConfig?.dataColumns ?? [];
  const pieData = chartConfig?.pieData ?? [];
  const isLargeDataset = chartConfig?.isLargeDataset ?? false;
  const aggregationInfo = chartConfig?.aggregationInfo ?? [];
  const chartDescription = chartConfig?.chartDescription ?? '';
  const isCategorical = chartConfig?.isCategorical ?? false;
  const dataCount = chartData.length;

  // Compute effective chart height — legend is now rendered outside as HTML
  const chartHeight = useMemo(() => {
    if (fillContainer) return "100%";
    return typeof baseChartHeight === 'number' ? baseChartHeight : 320;
  }, [fillContainer, baseChartHeight]);

  // Manipulation callbacks
  const toggleCategory = useCallback((category: string) => {
    const newExcluded = new Set(currentManipulation.excludedCategories);
    if (newExcluded.has(category)) {
      newExcluded.delete(category);
    } else {
      newExcluded.add(category);
    }
    setManipulation({
      ...currentManipulation,
      excludedCategories: newExcluded,
    });
  }, [currentManipulation, setManipulation]);

  const changeAggregation = useCallback((column: string, aggregation: AggregationType) => {
    setManipulation({
      ...currentManipulation,
      columnAggregations: {
        ...currentManipulation.columnAggregations,
        [column]: aggregation,
      },
    });
  }, [currentManipulation, setManipulation]);

  const toggleColumn = useCallback((column: string) => {
    const newHidden = new Set(currentManipulation.hiddenColumns);
    if (newHidden.has(column)) {
      newHidden.delete(column);
    } else {
      newHidden.add(column);
    }
    setManipulation({
      ...currentManipulation,
      hiddenColumns: newHidden,
    });
  }, [currentManipulation, setManipulation]);

  const resetManipulations = useCallback(() => {
    setManipulation({
      excludedCategories: new Set(),
      columnAggregations: {},
      hiddenColumns: new Set(),
    });
  }, [setManipulation]);

  // Build ECharts option — memoized separately from data processing
  const chartOption = useMemo(() => {
    if (!chartConfig || chartType === 'table') return null;

    const { chartData: cd, dataColumns: dc, pieData: pd, aggregationInfo: ai } = chartConfig;
    const count = cd.length;
    const mobile = screenSize === 'mobile';
    const tablet = screenSize === 'tablet';
    const fs = mobile ? 9 : tablet ? 10 : 11;

    // Theme colors
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "#9ca3af" : "#64748b";
    const tBg = isDark ? "#131316" : "#ffffff";
    const tBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    const tText = isDark ? "#f1f5f9" : "#1e293b";
    const shadowCss = isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.08)';

    // Formatters — auto-increase precision to avoid duplicate Y-axis labels
    const fmtAxis = (v: number) => {
      if (v === 0) return '0';
      const abs = Math.abs(v);
      if (abs >= 1e9) return `${(v / 1e9).toFixed(abs % 1e8 === 0 ? 1 : 2)}B`;
      if (abs >= 1e6) return `${(v / 1e6).toFixed(abs % 1e5 === 0 ? 1 : 2)}M`;
      if (abs >= 1e3) return `${(v / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
      if (Number.isInteger(v)) return String(v);
      return v.toFixed(1);
    };
    const fmtLabel = (v: unknown) => {
      if (typeof v !== 'number') return String(v);
      const abs = Math.abs(v);
      if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
      return v.toLocaleString();
    };

    // Escape HTML for tooltip
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // X-axis interval and rotation
    // Check if labels are long enough to need rotation even with few items
    const maxLabelLen = Math.max(...cd.map(d => String(d.name ?? '').length), 0);
    const labelsTooLong = maxLabelLen > 8 && count > 5;

    let xInterval: number;
    let xRotate: number;
    if (count <= 10 && !labelsTooLong) {
      xInterval = 0;
      xRotate = 0;
    } else if (count <= 20) {
      xInterval = 0;
      xRotate = -35;
    } else {
      xInterval = Math.ceil(count / 15) - 1;
      xRotate = -45;
    }

    const margins = mobile
      ? { top: 5, right: 5, left: 0, bottom: 35 }
      : tablet
      ? { top: 10, right: 15, left: 10, bottom: 50 }
      : { top: 20, right: 30, left: 20, bottom: 60 };
    const bottomMargin = count > 10 ? 60 : 20;
    const respBottom = mobile ? Math.min(bottomMargin, 40) : bottomMargin;

    // Build series name → color lookup for tooltip (avoids hollow-dot itemStyle.color leak)
    const seriesColorMap: Record<string, string> = {};
    dc.forEach((col, i) => {
      const info = ai.find(a => a.column === col);
      seriesColorMap[info?.displayName || col] = chartColors[i % chartColors.length];
    });

    // Common axis tooltip formatter (bar/line/area)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axisTooltipFmt = (params: any) => {
      const arr = Array.isArray(params) ? params : [params];
      if (arr.length === 0) return '';
      const idx = arr[0].dataIndex;
      const item = cd[idx];
      if (!item) return '';

      const fullName = esc(String(item.fullName ?? arr[0].name ?? ''));
      const recordCount = item._count as number | undefined;
      const bucketSize = item._bucketSize as number | undefined;

      let h = `<div style="max-width:280px;font-family:system-ui,-apple-system,sans-serif;">`;
      h += `<div style="font-size:12px;font-weight:500;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${tText};">${fullName}</div>`;
      if (recordCount && recordCount > 1) {
        h += `<div style="font-size:10px;margin-bottom:4px;color:${tickColor};">${recordCount.toLocaleString()} records</div>`;
      }
      if (bucketSize && bucketSize > 1) {
        h += `<div style="font-size:10px;margin-bottom:4px;color:${tickColor};">${bucketSize.toLocaleString()} rows averaged</div>`;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arr.forEach((p: any) => {
        const info = ai?.find(a => a.displayName === p.seriesName || a.column === p.seriesName);
        const isAvg = info?.aggregation === 'AVG' || (p.seriesName || '').toLowerCase().startsWith('avg ');
        const val = typeof p.value === 'number'
          ? (isAvg ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value.toLocaleString())
          : String(p.value);

        const dotColor = seriesColorMap[p.seriesName] || p.color;
        h += `<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-top:4px;">`;
        h += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;"></span>`;
        h += `<span style="color:${tickColor};">${esc(p.seriesName)}</span>`;
        h += `<span style="font-weight:600;margin-left:auto;color:${tText};">${val}</span>`;
        h += `</div>`;
      });
      h += `</div>`;
      return h;
    };

    // Grid config — legend is now rendered as HTML outside the chart
    const grid = {
      top: margins.top + 10,
      right: margins.right,
      bottom: respBottom + 15,
      left: margins.left + (mobile ? 35 : 50),
      containLabel: false,
    };

    // Common x-axis (boundaryGap: false for line/area so they start from left edge)
    const isLineOrArea = chartType === 'line' || chartType === 'area';
    const xAxis = {
      type: 'category' as const,
      data: cd.map(d => d.name as string),
      boundaryGap: !isLineOrArea,
      axisLabel: {
        fontSize: fs,
        color: tickColor,
        fontWeight: 500 as const,
        interval: mobile ? Math.max(xInterval, Math.ceil(count / 5)) : xInterval,
        rotate: xRotate,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    };

    // Common y-axis
    const yAxisBase = {
      type: 'value' as const,
      axisLabel: {
        fontSize: mobile ? 9 : 11,
        color: tickColor,
        fontWeight: 400 as const,
        formatter: fmtAxis,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: settings.showGridLines,
        lineStyle: { color: gridColor, width: 1 },
      },
    };

    // Common tooltip base
    const tooltipBase = {
      confine: true,
      backgroundColor: tBg,
      borderColor: tBorder,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: tText, fontSize: 12 },
      extraCssText: `border-radius:12px;box-shadow:${shadowCss};`,
    };

    // Hide ECharts built-in legend — custom scrollable HTML legend rendered outside the chart
    const legend = {
      show: false,
    };

    // Smart Y-axis min: when the dominant column has clustered values (range < 20% of its max),
    // start near its minimum so differences are visible instead of starting at 0.
    // We check per-column to avoid mixing scales (e.g. 2.3B amount + 0.86 score).
    const smartYMin = (() => {
      if (settings.yAxisMin !== 'auto') return settings.yAxisMin;
      if (dc.length === 0 || cd.length < 2) return 0;

      // Find the dominant column (largest max value)
      let bestCol = dc[0];
      let bestMax = 0;
      for (const col of dc) {
        for (const d of cd) {
          const v = Math.abs(Number(d[col]) || 0);
          if (v > bestMax) { bestMax = v; bestCol = col; }
        }
      }

      // Collect values only from the dominant column
      const vals = cd.map(d => Number(d[bestCol]) || 0).filter(v => v !== 0);
      if (vals.length < 2) return 0;
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      if (minVal <= 0 || maxVal === 0) return 0;
      const range = maxVal - minVal;
      // If range is less than 20% of max, zoom in
      if (range < maxVal * 0.2) {
        const padding = range * 0.5 || maxVal * 0.05;
        const floor = Math.max(0, minVal - padding);
        // Compute a "nice" tick interval (~5-6 ticks across the visible range),
        // then round min DOWN to a multiple of it so Y-axis labels are evenly spaced.
        const totalRange = maxVal - floor;
        const rawInterval = totalRange / 5;
        const intervalMag = Math.pow(10, Math.floor(Math.log10(rawInterval)));
        const normalized = rawInterval / intervalMag;
        const niceMultiplier = normalized <= 1.5 ? 1 : normalized <= 3 ? 2 : normalized <= 7 ? 5 : 10;
        const niceInterval = niceMultiplier * intervalMag;
        return Math.floor(floor / niceInterval) * niceInterval;
      }
      return 0;
    })();

    switch (chartType) {
      case 'bar':
        return {
          animation: false,
          grid,
          xAxis,
          yAxis: {
            ...yAxisBase,
            min: smartYMin,
            max: settings.yAxisMax === 'auto' ? undefined : settings.yAxisMax,
          },
          tooltip: {
            ...tooltipBase,
            trigger: 'axis' as const,
            formatter: axisTooltipFmt,
            axisPointer: {
              type: 'shadow' as const,
              shadowStyle: {
                color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              },
            },
          },
          legend,
          series: dc.map((col, i) => {
            const info = ai.find(a => a.column === col);
            return {
              type: 'bar' as const,
              name: info?.displayName || col,
              data: cd.map(d => (d[col] as number) ?? null),
              itemStyle: {
                color: chartColors[i % chartColors.length],
                borderRadius: [6, 6, 0, 0],
              },
              barMaxWidth: settings.barWidth ? Math.round(settings.barWidth * 0.5) : undefined,
              large: true,
              largeThreshold: 2000,
              label: {
                show: settings.showDataLabels,
                position: 'top' as const,
                color: tickColor,
                fontSize: mobile ? 8 : 10,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (p: any) => fmtLabel(p.value),
              },
            };
          }),
        };

      case 'line':
        return {
          animation: false,
          grid,
          xAxis,
          yAxis: {
            ...yAxisBase,
            min: smartYMin,
            max: settings.yAxisMax === 'auto' ? undefined : settings.yAxisMax,
          },
          tooltip: {
            ...tooltipBase,
            trigger: 'axis' as const,
            formatter: axisTooltipFmt,
          },
          legend,
          series: dc.map((col, i) => {
            const info = ai.find(a => a.column === col);
            const color = chartColors[i % chartColors.length];
            const showDot = !mobile && count <= 30;
            return {
              type: 'line' as const,
              name: info?.displayName || col,
              data: cd.map(d => (d[col] as number) ?? null),
              smooth: true,
              color,
              lineStyle: { width: mobile ? 2 : 2.5, color },
              showSymbol: showDot,
              symbol: 'circle',
              symbolSize: 7,
              itemStyle: {
                color: isDark ? '#09090b' : '#fff',
                borderColor: color,
                borderWidth: 2.5,
              },
              emphasis: {
                symbolSize: 10,
                itemStyle: {
                  color,
                  borderColor: isDark ? '#09090b' : '#fff',
                  borderWidth: 2.5,
                },
              },
              sampling: 'lttb' as const,
              large: true,
              largeThreshold: 2000,
              label: {
                show: settings.showDataLabels && !mobile && count <= 20,
                position: 'top' as const,
                color: tickColor,
                fontSize: 9,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (p: any) => fmtLabel(p.value),
              },
            };
          }),
        };

      case 'area':
        return {
          animation: false,
          grid,
          xAxis,
          yAxis: {
            ...yAxisBase,
            min: smartYMin,
            max: settings.yAxisMax === 'auto' ? undefined : settings.yAxisMax,
          },
          tooltip: {
            ...tooltipBase,
            trigger: 'axis' as const,
            formatter: axisTooltipFmt,
          },
          legend,
          series: dc.map((col, i) => {
            const info = ai.find(a => a.column === col);
            const color = chartColors[i % chartColors.length];
            return {
              type: 'line' as const,
              name: info?.displayName || col,
              data: cd.map(d => (d[col] as number) ?? null),
              smooth: true,
              lineStyle: { width: 2, color },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: hexToRgba(color, 0.25) },
                  { offset: 1, color: hexToRgba(color, 0.02) },
                ]),
              },
              itemStyle: { color },
              showSymbol: false,
              emphasis: {
                symbolSize: 10,
                itemStyle: {
                  color,
                  borderColor: isDark ? '#09090b' : '#fff',
                  borderWidth: 2.5,
                },
              },
              sampling: 'lttb' as const,
              large: true,
              largeThreshold: 2000,
              label: {
                show: settings.showDataLabels && !mobile && count <= 20,
                position: 'top' as const,
                color: tickColor,
                fontSize: 9,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (p: any) => fmtLabel(p.value),
              },
            };
          }),
        };

      case 'pie': {
        if (pd.length === 0) return null;

        const total = pd.reduce((sum, item) => sum + item.value, 0);
        const outerR = mobile ? '70%' : '75%';
        const innerR = mobile ? '38%' : '42%'; // ~55% of outer

        return {
          animation: false,
          tooltip: {
            ...tooltipBase,
            trigger: 'item' as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (p: any) => {
              const val = p.value as number;
              const pct = ((val / total) * 100).toFixed(1);
              return `<div style="font-family:system-ui,-apple-system,sans-serif;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                  <span style="font-size:12px;font-weight:500;color:${tText};">${esc(p.name)}</span>
                </div>
                <div style="font-size:12px;font-weight:600;color:${tText};padding-left:16px;">${val.toLocaleString()} (${pct}%)</div>
              </div>`;
            },
          },
          legend: {
            show: false,
          },
          series: [{
            type: 'pie' as const,
            radius: [innerR, outerR],
            center: ['50%', settings.legendPosition === 'bottom' ? '45%' : settings.legendPosition === 'top' ? '55%' : '50%'],
            padAngle: 2,
            data: pd.map((d, i) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: chartColors[i % chartColors.length] },
            })),
            itemStyle: {
              borderColor: isDark ? '#09090b' : '#fff',
              borderWidth: 3,
            },
            label: {
              show: !mobile && pd.length <= 8 && settings.showDataLabels,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (p: any) => {
                if (p.percent < 5) return '';
                return `${truncateLabel(p.name || '', 10)} (${Math.round(p.percent)}%)`;
              },
              color: tickColor,
              fontSize: 11,
            },
            labelLine: {
              show: !mobile && pd.length <= 8 && settings.showDataLabels,
            },
            emphasis: {
              scaleSize: 5,
            },
          }],
        };
      }

      default:
        return null;
    }
  }, [chartConfig, chartType, settings, isDark, screenSize, chartColors]);

  // ECharts instance ref for legend toggle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [hiddenLegendItems, setHiddenLegendItems] = useState<Set<string>>(new Set());

  const legendItems = useMemo(() => {
    if (!chartOption) return [];
    if (chartType === 'pie') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seriesData = (chartOption as any).series?.[0]?.data as Array<{ name: string; itemStyle?: { color?: string } }> | undefined;
      if (!seriesData) return [];
      return seriesData.map((d, i) => ({
        name: d.name,
        color: d.itemStyle?.color || chartColors[i % chartColors.length],
      }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series = (chartOption as any).series as Array<{ name?: string; color?: string; lineStyle?: { color?: string }; itemStyle?: { color?: string; borderColor?: string } }> | undefined;
    if (!series) return [];
    return series.map((s, i) => ({
      name: s.name || `Series ${i + 1}`,
      color: s.color || s.lineStyle?.color || s.itemStyle?.borderColor || s.itemStyle?.color || chartColors[i % chartColors.length],
    }));
  }, [chartOption, chartType, chartColors]);

  const handleLegendToggle = useCallback((name: string) => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (instance) {
      instance.dispatchAction({ type: 'legendToggleSelect', name });
    }
    setHiddenLegendItems(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Early return for no data — AFTER all hooks
  if (!chartConfig) {
    if (chartType === "table") return null;
    const hasHiddenCols = currentManipulation.hiddenColumns.size > 0;
    return (
      <div className={`flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-xs sm:text-sm ${fillContainer ? 'h-full' : 'h-48'}`}>
        <span>{hasHiddenCols ? "All chart columns are hidden" : "No numeric data to chart"}</span>
        {hasHiddenCols && (
          <button onClick={resetManipulations} className="text-[11px] px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors">
            Reset columns
          </button>
        )}
      </div>
    );
  }

  // Build info text
  const getChartInfoText = () => {
    const parts: string[] = [];

    if (isCategorical) {
      parts.push(`${data.length.toLocaleString()} rows → ${dataCount} categories`);
    } else if (isLargeDataset) {
      if (chartType === "pie") {
        parts.push("Top 10 categories");
      } else if (chartType === "line" || chartType === "area") {
        if (data.length > 100) {
          parts.push(`${data.length.toLocaleString()} rows → ${dataCount} points`);
        } else {
          parts.push(`${data.length.toLocaleString()} rows`);
        }
      } else {
        parts.push(`Top ${dataCount} of ${data.length.toLocaleString()}`);
      }
    }

    if (aggregationInfo && aggregationInfo.length > 0 && chartType !== "pie" && (isCategorical || isLargeDataset)) {
      const firstAgg = aggregationInfo[0];
      if (firstAgg.aggregation === 'COUNT') {
        parts.push("counting records");
      } else if (firstAgg.aggregation === 'AVG') {
        parts.push("showing averages");
      } else if (firstAgg.aggregation === 'SUM') {
        parts.push("showing totals");
      } else if (firstAgg.aggregation === 'MIN') {
        parts.push("showing minimums");
      } else if (firstAgg.aggregation === 'MAX') {
        parts.push("showing maximums");
      }
    }

    return parts.length > 0 ? parts.join(" \u2022 ") : null;
  };

  const infoText = getChartInfoText();

  // Pie empty state
  if (chartType === 'pie' && pieData.length === 0) {
    return (
      <div className={`w-full h-full overflow-hidden relative flex flex-col ${
        borderless ? 'p-0' : 'bg-white dark:bg-white/[0.02] rounded-xl p-1.5 sm:p-3 lg:p-4 transition-colors'
      }`}>
        <div className={`flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm ${fillContainer ? 'h-full' : ''}`}
             style={fillContainer ? undefined : { height: typeof chartHeight === 'number' ? chartHeight : undefined }}>
          No pie data (all values are zero or negative)
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full overflow-hidden relative flex flex-col ${
      borderless
        ? 'p-0'
        : 'bg-white dark:bg-white/[0.02] rounded-xl p-1.5 sm:p-3 lg:p-4 transition-colors'
    }`}>
      {/* Header */}
      {!borderless && (
        <div className="mb-2 sm:mb-3 text-center">
          {chartDescription && (
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
              {chartDescription}
            </div>
          )}
          {infoText && (
            <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
              {infoText}
            </div>
          )}
        </div>
      )}

      {/* Custom scrollable legend — rendered above chart when top, below when bottom */}
      {settings.legendPosition === 'top' && legendItems.length > 1 && (
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar mb-1 sm:mb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap py-0.5 min-w-full">
            {legendItems.map((item) => {
              const isHidden = hiddenLegendItems.has(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => handleLegendToggle(item.name)}
                  className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] shrink-0 transition-opacity ${isHidden ? 'opacity-35' : ''}`}
                >
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{truncateLabel(item.name, isMobile ? 14 : 25)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart container */}
      <div className="flex-1 min-h-0">
        {chartOption ? (
          <ReactECharts
            ref={chartRef}
            option={{ ...chartOption, ...(isMobile ? { useCoarsePointer: true } : {}) }}
            style={{ height: typeof chartHeight === 'number' ? chartHeight : '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
            opts={{ renderer: 'canvas' }}
          />
        ) : null}
      </div>

      {/* Custom scrollable legend — rendered below chart when bottom */}
      {settings.legendPosition === 'bottom' && legendItems.length > 1 && (
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar mt-1 sm:mt-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap py-0.5 min-w-full">
            {legendItems.map((item) => {
              const isHidden = hiddenLegendItems.has(item.name);
              return (
                <button
                  key={item.name}
                  onClick={() => handleLegendToggle(item.name)}
                  className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] shrink-0 transition-opacity ${isHidden ? 'opacity-35' : ''}`}
                >
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{truncateLabel(item.name, isMobile ? 14 : 25)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// Helper function to detect best chart type based on data
export function detectChartType(columns: string[], rowCount: number, data?: Record<string, unknown>[]): ChartType {
  const colNames = columns.map(c => c.toLowerCase());

  const hasTimeColumn = colNames.some(c =>
    c.includes('date') || c.includes('time') || c.includes('year') || c.includes('month') ||
    c.includes('quarter') || c.includes('period') || c.includes('week') || c.includes('day')
  );
  if (hasTimeColumn && rowCount > 3) return "line";

  const numericCols = columns.filter(c => {
    const type = detectColumnType(c);
    return type !== 'id' && type !== 'junk';
  });
  if (numericCols.length >= 4 && rowCount > 10) return "table";

  if (rowCount >= 2 && rowCount <= 6) {
    const meaningfulNumeric = columns.filter(c => {
      const type = detectColumnType(c);
      return type !== 'id' && type !== 'junk';
    });
    if (meaningfulNumeric.length <= 2) return "pie";
  }

  if (rowCount <= 20) return "bar";
  if (rowCount > 20 && rowCount <= 50) return "bar";

  return "line";
}
