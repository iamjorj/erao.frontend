"use client";

import { useMemo, useState, useEffect, useCallback, useRef, memo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

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
    "#e2e8f0", // slate-200
    "#cbd5e1", // slate-300
    "#94a3b8", // slate-400
    "#64748b", // slate-500
    "#475569", // slate-600
    "#334155", // slate-700
    "#1e293b", // slate-800
    "#0f172a", // slate-900
    "#f1f5f9", // slate-100
    "#f8fafc", // slate-50
  ],
  blue: [
    "#818cf8", // indigo-400
    "#6366f1", // indigo-500
    "#4f46e5", // indigo-600
    "#4338ca", // indigo-700
    "#a5b4fc", // indigo-300
    "#c7d2fe", // indigo-200
    "#3730a3", // indigo-800
    "#312e81", // indigo-900
    "#e0e7ff", // indigo-100
    "#eef2ff", // indigo-50
  ],
  green: [
    "#34d399", // emerald-400
    "#10b981", // emerald-500
    "#059669", // emerald-600
    "#047857", // emerald-700
    "#6ee7b7", // emerald-300
    "#a7f3d0", // emerald-200
    "#065f46", // emerald-800
    "#064e3b", // emerald-900
    "#d1fae5", // emerald-100
    "#ecfdf5", // emerald-50
  ],
  purple: [
    "#a78bfa", // violet-400
    "#8b5cf6", // violet-500
    "#7c3aed", // violet-600
    "#6d28d9", // violet-700
    "#c4b5fd", // violet-300
    "#ddd6fe", // violet-200
    "#5b21b6", // violet-800
    "#4c1d95", // violet-900
    "#ede9fe", // violet-100
    "#f5f3ff", // violet-50
  ],
  custom: [], // Custom colors provided via settings.customColors
};

// Default colors for backwards compatibility
const COLORS = COLOR_THEMES.colorful;

// Dark mode detection hook
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();

    // Watch for changes
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

// Column semantic type detection
type ColumnSemanticType = 'id' | 'score' | 'percentage' | 'count' | 'amount' | 'numeric' | 'junk';

function detectColumnType(columnName: string): ColumnSemanticType {
  const name = columnName.toLowerCase();

  // Junk columns — should be hidden from charts entirely (row numbers, intermediate calculations)
  if (name === 'rownum' || name === 'row_number' || name === 'rn' || name === 'row_num' ||
      name === 'sno' || name === 's_no' || name === 'sr_no' || name === 'serial' ||
      name === 'row' || name === '#') {
    return 'junk';
  }

  // ID columns - should COUNT, not SUM
  if (name.includes('_id') || name.endsWith('id') || name === 'id' ||
      name.includes('_key') || name.endsWith('key') ||
      name.includes('_no') || name.endsWith('no') || name === 'no' ||
      name.includes('_code') || name.endsWith('code') ||
      name.includes('index')) {
    return 'id';
  }

  // Score/Rating/Measurement columns - should AVG
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

  // Percentage columns - should AVG
  if (name.includes('percent') || name.includes('pct') || name.includes('rate') ||
      name.includes('ratio') || name.includes('proportion') || name.endsWith('%')) {
    return 'percentage';
  }

  // Count columns - should SUM (they're already counts)
  if (name.includes('count') || name.includes('quantity') || name.includes('qty') ||
      name.includes('num_') || name.startsWith('n_') || name.includes('total') ||
      name.includes('_cnt')) {
    return 'count';
  }

  // Amount/Money columns - should SUM
  if (name.includes('amount') || name.includes('price') || name.includes('cost') ||
      name.includes('revenue') || name.includes('salary') || name.includes('income') ||
      name.includes('expense') || name.includes('payment') || name.includes('fee') ||
      name.includes('balance') || name.includes('budget') || name.includes('profit') ||
      name.includes('loss') || name.includes('value') || name.includes('sum') ||
      name.includes('money') || name.includes('$') || name.includes('usd') ||
      name.includes('eur') || name.includes('gbp')) {
    return 'amount';
  }

  return 'numeric';
}

// Helper to count unique values with early exit (optimized for large datasets)
function countUniqueValues(data: Record<string, unknown>[], col: string, maxCheck: number = 100): number {
  const sampleSize = Math.min(data.length, 2000); // Sample first 2000 rows
  const uniqueValues = new Set<string>();

  for (let i = 0; i < sampleSize; i++) {
    uniqueValues.add(String(data[i][col] ?? ''));
    if (uniqueValues.size > maxCheck) return uniqueValues.size; // Early exit
  }

  return uniqueValues.size;
}

// Find the best categorical column for grouping
function findBestCategoricalColumn(
  data: Record<string, unknown>[],
  columns: string[],
  numericColumns: string[]
): string | null {
  const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));

  // Priority patterns for grouping columns
  const categoryPatterns = [
    'category', 'type', 'status', 'gender', 'sex', 'class', 'group', 'department',
    'region', 'country', 'state', 'city', 'branch', 'segment', 'channel',
    'product', 'brand', 'vendor', 'supplier', 'customer_type', 'user_type',
    'year', 'month', 'quarter', 'period', 'day', 'weekday'
  ];

  // First try to find columns matching priority patterns
  for (const pattern of categoryPatterns) {
    const match = nonNumericColumns.find(col => col.toLowerCase().includes(pattern));
    if (match) {
      const uniqueCount = countUniqueValues(data, match, 50);
      if (uniqueCount >= 2 && uniqueCount <= 50) {
        return match;
      }
    }
  }

  // Then find any non-numeric column with good cardinality (2-30 unique values)
  for (const col of nonNumericColumns) {
    const uniqueCount = countUniqueValues(data, col, 30);
    if (uniqueCount >= 2 && uniqueCount <= 30) {
      return col;
    }
  }

  // Fall back to first non-numeric column if it has reasonable cardinality
  if (nonNumericColumns.length > 0) {
    const firstCol = nonNumericColumns[0];
    const uniqueCount = countUniqueValues(data, firstCol, 100);
    if (uniqueCount <= 100) {
      return firstCol;
    }
  }

  return null;
}

// Build a display name for a column+aggregation, avoiding double prefixes
// (e.g., if column is already "Avg Sleep Duration", don't produce "Avg Avg Sleep Duration")
function buildDisplayName(col: string, aggregation: AggregationType): string {
  const lower = col.toLowerCase();
  const alreadyPrefixed = lower.startsWith('avg ') || lower.startsWith('total ') ||
    lower.startsWith('count ') || lower.startsWith('sum ') || lower.startsWith('min ') ||
    lower.startsWith('max ') || lower.startsWith('count of ');
  if (alreadyPrefixed) return col;

  switch (aggregation) {
    case 'COUNT': return `Count ${col}`;
    case 'AVG': return `Avg ${col}`;
    case 'SUM': return `Total ${col}`;
    case 'MIN': return `Min ${col}`;
    case 'MAX': return `Max ${col}`;
    default: return col;
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
  // Determine aggregation type for each column
  const aggregationInfo: AggregationInfo[] = valueColumns.map(col => {
    const detectedType = detectColumnType(col);

    // Check if user has specified an aggregation
    if (userAggregations && userAggregations[col]) {
      const aggregation = userAggregations[col];
      return {
        column: col,
        aggregation,
        displayName: buildDisplayName(col, aggregation),
        detectedType,
      };
    }

    let aggregation: AggregationType;

    switch (detectedType) {
      case 'id':
      case 'junk':
        aggregation = 'COUNT';
        break;
      case 'score':
      case 'percentage':
        aggregation = 'AVG';
        break;
      case 'amount':
      case 'count':
        aggregation = 'SUM';
        break;
      default:
        // For unknown numeric, check uniqueness + value range to detect IDs vs metrics
        const sampleValues = data.slice(0, 100).map(row => {
          const val = row[col];
          return typeof val === 'number' ? val : Number(val) || 0;
        }).filter(v => v !== 0);

        if (sampleValues.length > 0) {
          const avg = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
          const max = Math.max(...sampleValues);
          const uniqueRatio = new Set(sampleValues).size / sampleValues.length;
          // IDs: nearly unique values + values proportional to dataset size
          if (uniqueRatio > 0.85 && max > data.length * 0.5 && avg > data.length * 0.3) {
            aggregation = 'COUNT';
          } else if (max <= 100 || avg <= 50) {
            aggregation = 'AVG';
          } else {
            aggregation = 'SUM';
          }
        } else {
          // No non-zero values (likely binary 0/1 column) — AVG gives proportion
          aggregation = 'AVG';
        }
    }

    return { column: col, aggregation, displayName: buildDisplayName(col, aggregation), detectedType };
  });

  // Group by label with incremental aggregation (memory-efficient for large datasets)
  // Instead of storing all values, we compute running sum/count/min/max
  interface GroupStats {
    count: number;
    stats: Record<string, { sum: number; count: number; min: number; max: number }>;
  }
  const grouped = new Map<string, GroupStats>();

  data.forEach((row) => {
    const label = String(row[labelColumn] ?? "Unknown");

    // Skip excluded categories
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

  // Calculate final aggregated values
  const result: Record<string, unknown>[] = Array.from(grouped.entries()).map(([label, group]) => {
    const item: Record<string, unknown> = {
      name: truncateLabel(label),
      fullName: label,
      _count: group.count, // Store count for reference
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

  // Sort by count (most common categories first) or first value column
  result.sort((a, b) => (b._count as number) - (a._count as number));

  // Limit to maxItems
  return { chartData: result.slice(0, maxItems), aggregationInfo };
}

// Check if label column is categorical (few unique values - good for aggregation)
function isCategoricalColumn(data: Record<string, unknown>[], labelColumn: string): boolean {
  // Use early exit for large datasets - sample first 1000 rows
  const sampleSize = Math.min(data.length, 1000);
  const uniqueValues = new Set<string>();

  for (let i = 0; i < sampleSize; i++) {
    uniqueValues.add(String(data[i][labelColumn] ?? ""));
    // Early exit if too many unique values
    if (uniqueValues.size > 30) return false;
  }

  // Categorical if 2-30 unique values and much less than sample size
  return uniqueValues.size >= 2 && uniqueValues.size <= 30 && uniqueValues.size < sampleSize * 0.5;
}

// Sample data with rolling average for smooth line/area charts
function sampleDataWithRollingAvg(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxPoints: number = 50, // Reduced from 100 for better tooltip performance
  aggregationInfo: AggregationInfo[]
): Record<string, unknown>[] {
  if (data.length <= maxPoints) {
    return data.map((row, idx) => {
      const fullName = String(row[labelColumn] ?? `Row ${idx + 1}`);
      const item: Record<string, unknown> = {
        name: truncateLabel(fullName, 12),
        fullName: fullName,
        _index: idx, // Unique key for tooltip tracking
      };
      valueColumns.forEach((col) => {
        const val = row[col];
        item[col] = typeof val === "number" ? val : Number(val) || 0;
      });
      return item;
    });
  }

  // For large datasets, create buckets and aggregate
  const bucketSize = Math.ceil(data.length / maxPoints);
  const sampled: Record<string, unknown>[] = [];
  let bucketIndex = 0;

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, Math.min(i + bucketSize, data.length));
    const firstRow = bucket[0];
    const lastRow = bucket[bucket.length - 1];

    // Use range label for bucket with unique index to avoid duplicate keys
    const startLabel = String(firstRow[labelColumn] ?? `Row ${i + 1}`);
    const endLabel = String(lastRow[labelColumn] ?? `Row ${i + bucket.length}`);
    // Add bucket index to ensure uniqueness
    const label = bucket.length > 1 ? `${bucketIndex + 1}` : truncateLabel(startLabel, 10);

    const item: Record<string, unknown> = {
      name: label,
      fullName: bucket.length > 1 ? `${startLabel} to ${endLabel} (${bucket.length} rows)` : startLabel,
      _bucketSize: bucket.length,
      _bucketIndex: bucketIndex,
    };
    bucketIndex++;

    // Aggregate each column according to its type
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
        // AVG for scores or unknown
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

  // Responsive chart dimensions - fill available space
  const chartHeight = fillContainer ? "100%" : (isMobile ? 250 : screenSize === "tablet" ? 300 : 320);
  const pieOuterRadius = fillContainer
    ? (isMobile ? "70%" : "75%")
    : (isMobile ? 70 : screenSize === "tablet" ? 85 : 100);
  const fontSize = isMobile ? 9 : screenSize === "tablet" ? 10 : 11;
  const legendFontSize = isMobile ? "10px" : "12px";
  const margins = isMobile
    ? { top: 5, right: 5, left: 0, bottom: 35 }
    : screenSize === "tablet"
    ? { top: 10, right: 15, left: 10, bottom: 50 }
    : { top: 20, right: 30, left: 20, bottom: 60 };

  // Memoize all chart data processing
  const chartConfig = useMemo(() => {
    if (!data || data.length === 0 || chartType === "table") {
      return null;
    }

    // Find all numeric columns (check all columns, not just after first)
    const numericColumns = columns.filter(col =>
      data.some(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === "number") return true;
        const numVal = Number(val);
        return !isNaN(numVal) && isFinite(numVal);
      })
    );

    // Find best categorical column for grouping (smart detection)
    const bestCategoryColumn = findBestCategoricalColumn(data, columns, numericColumns);

    // Find first non-numeric column to use as label, or use first column
    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));

    // Prefer best categorical column, then any non-numeric, then first column
    const labelColumn = bestCategoryColumn || (nonNumericColumns.length > 0 ? nonNumericColumns[0] : columns[0]);

    // Use numeric columns as data columns, excluding the label column if it was numeric
    const dataColumns = numericColumns.filter(col => col !== labelColumn);

    // If no data columns found but we have numeric columns, use all except first as data
    // and first as label (fallback for all-numeric data)
    const rawDataColumns = dataColumns.length > 0
      ? dataColumns
      : numericColumns.length > 1
        ? numericColumns.slice(1)
        : numericColumns;

    // Auto-hide junk columns (row numbers, IDs) when better columns exist
    const allDataColumns = (() => {
      // Remove pure junk (row numbers, serial numbers)
      const noJunk = rawDataColumns.filter(col => detectColumnType(col) !== 'junk');
      if (noJunk.length === 0) return rawDataColumns; // Fallback: keep everything

      // Remove ID columns if there are non-ID columns left
      const noIds = noJunk.filter(col => detectColumnType(col) !== 'id');
      return noIds.length > 0 ? noIds : noJunk;
    })();

    // Filter out hidden columns (from manipulation UI or viz hint)
    const finalDataColumns = allDataColumns.filter(col => !currentManipulation.hiddenColumns.has(col));

    // Store all columns for the manipulation UI (including auto-filtered and hidden ones)
    const allAvailableColumns = rawDataColumns;

    // If no numeric columns at all, can't render a chart
    if (finalDataColumns.length === 0) {
      return null;
    }

    const isLargeDataset = data.length > 50;

    // Build aggregation info for all value columns
    const aggregationInfo: AggregationInfo[] = finalDataColumns.map(col => {
      const type = detectColumnType(col);
      let aggregation: AggregationType;

      switch (type) {
        case 'id':
        case 'junk':
          aggregation = 'COUNT';
          break;
        case 'score':
        case 'percentage':
          aggregation = 'AVG';
          break;
        case 'amount':
        case 'count':
          aggregation = 'SUM';
          break;
        default:
          // For unknown numeric, check uniqueness + value range to detect IDs vs metrics
          const sampleValues = data.slice(0, 100).map(row => {
            const val = row[col];
            return typeof val === 'number' ? val : Number(val) || 0;
          }).filter(v => v !== 0);

          if (sampleValues.length > 0) {
            const avg = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
            const max = Math.max(...sampleValues);
            const uniqueRatio = new Set(sampleValues).size / sampleValues.length;
            // IDs: nearly unique values + values proportional to dataset size
            if (uniqueRatio > 0.85 && max > data.length * 0.5 && avg > data.length * 0.3) {
              aggregation = 'COUNT';
            } else if (max <= 100 || avg <= 50) {
              aggregation = 'AVG';
            } else {
              aggregation = 'SUM';
            }
          } else {
            // No non-zero values (likely binary 0/1 column) — AVG gives proportion
            aggregation = 'AVG';
          }
      }

      return { column: col, aggregation, displayName: buildDisplayName(col, aggregation), detectedType: type };
    });

    // Check if label column is categorical (few unique values)
    const isCategorical = isCategoricalColumn(data, labelColumn);

    // Pre-filter data by excluded categories (applies to ALL code paths)
    const hasExclusions = currentManipulation.excludedCategories.size > 0;
    const filteredData = hasExclusions
      ? data.filter(row => !currentManipulation.excludedCategories.has(String(row[labelColumn] ?? "Unknown")))
      : data;

    // Check if user has set custom aggregations
    const hasUserAggregations = Object.keys(currentManipulation.columnAggregations).length > 0;

    // Process data based on chart type and size
    let chartData: Record<string, unknown>[];
    let finalAggregationInfo = aggregationInfo;

    const effectiveIsLargeDataset = filteredData.length > 50;

    // For ALL chart types with categorical data, aggregate first
    // Categorical data (like Gender: Male/Female) should always be grouped
    // Also force aggregation when user has set custom aggregations
    if (isCategorical || hasUserAggregations) {
      // Use smart aggregation for categorical data
      const maxItems = chartType === "pie" ? 10 : 50;
      const result = smartAggregateData(
        filteredData,
        labelColumn,
        finalDataColumns,
        maxItems,
        currentManipulation.columnAggregations,
        currentManipulation.excludedCategories
      );
      chartData = result.chartData;
      finalAggregationInfo = result.aggregationInfo;
    } else if (chartType === "line" || chartType === "area") {
      // For line/area with non-categorical (sequential/time) data, sample with rolling average
      chartData = sampleDataWithRollingAvg(filteredData, labelColumn, finalDataColumns, 60, aggregationInfo);
    } else {
      // For bar/pie with non-categorical data
      if (effectiveIsLargeDataset) {
        const result = smartAggregateData(
          filteredData,
          labelColumn,
          finalDataColumns,
          chartType === "pie" ? 10 : 30,
          currentManipulation.columnAggregations,
          currentManipulation.excludedCategories
        );
        chartData = result.chartData;
        finalAggregationInfo = result.aggregationInfo;
      } else {
        // Small dataset - still use smart aggregation for consistency
        const uniqueLabels = new Set(filteredData.map(row => String(row[labelColumn] ?? "")));
        if (uniqueLabels.size < filteredData.length * 0.8) {
          // Has grouping potential
          const result = smartAggregateData(
            filteredData,
            labelColumn,
            finalDataColumns,
            chartType === "pie" ? 10 : 30,
            currentManipulation.columnAggregations,
            currentManipulation.excludedCategories
          );
          chartData = result.chartData;
          finalAggregationInfo = result.aggregationInfo;
        } else {
          // Mostly unique values - just format for display
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

    // Get unique categories for manipulation UI (limit to 500 for performance with large datasets)
    const allCategoriesSet = new Set<string>();
    for (let i = 0; i < data.length && allCategoriesSet.size < 500; i++) {
      allCategoriesSet.add(String(data[i][labelColumn] ?? "Unknown"));
    }
    const allCategories = Array.from(allCategoriesSet);

    const hasNonZeroValues = chartData.some((item) =>
      finalDataColumns.some((col) => (item[col] as number) > 0)
    );

    // Prepare pie data with smart aggregation
    let pieData: Array<{ name: string; fullName: string; value: number }> = [];
    if (chartType === "pie") {
      if (finalDataColumns.length === 1) {
        pieData = chartData.map((item) => ({
          name: item.name as string,
          fullName: item.fullName as string,
          value: item[finalDataColumns[0]] as number,
        }));
      } else {
        // For pie with multiple columns, show column totals
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
      // Filter zeros and sort by value
      pieData = pieData.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
    }

    // Build chart description
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
  }, [data, columns, chartType, currentManipulation]);

  // Extract values from chartConfig (with defaults for when it's null)
  const chartData = chartConfig?.chartData ?? [];
  const dataColumns = chartConfig?.dataColumns ?? [];
  const allAvailableColumns = chartConfig?.allAvailableColumns ?? [];
  const pieData = chartConfig?.pieData ?? [];
  const hasNonZeroValues = chartConfig?.hasNonZeroValues ?? false;
  const isLargeDataset = chartConfig?.isLargeDataset ?? false;
  const aggregationInfo = chartConfig?.aggregationInfo ?? [];
  const chartDescription = chartConfig?.chartDescription ?? '';
  const isCategorical = chartConfig?.isCategorical ?? false;
  const allCategories = chartConfig?.allCategories ?? [];
  const labelColumn = chartConfig?.labelColumn ?? '';
  const dataCount = chartData.length;

  // Theme colors - clean minimal styling
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const tickColor = isDark ? "#9ca3af" : "#64748b";
  const tooltipBg = isDark ? "#18181b" : "white";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tooltipText = isDark ? "#f1f5f9" : "#1e293b";
  const axisLineColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // X-axis config - memoized to prevent recalculation
  const xAxisConfig = useMemo(() => {
    if (dataCount <= 10) {
      return { interval: 0, angle: 0, textAnchor: "middle" as const, dy: 8 };
    } else if (dataCount <= 20) {
      return { interval: 0, angle: -45, textAnchor: "end" as const, dy: 4 };
    } else {
      const skipInterval = Math.ceil(dataCount / 15);
      return { interval: skipInterval - 1, angle: -45, textAnchor: "end" as const, dy: 4 };
    }
  }, [dataCount]);

  const bottomMargin = dataCount > 10 ? 60 : 20;

  // Memoized formatters — always abbreviate large numbers for clean axes
  const yAxisFormatter = useCallback((v: number) => {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  }, []);
  const labelFormatter = useCallback((v: unknown) => {
    if (typeof v !== 'number') return String(v);
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  }, []);

  // Memoized tooltip content renderer to prevent re-renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltipContent = useCallback((props: any) => {
    const { active, payload, label } = props as {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
      label?: string;
    };
    if (active && payload && payload.length) {
      const found = chartData.find(d => d.name === label);
      const fullName = found ? String(found.fullName) : (label || "");
      const recordCount = found?._count as number | undefined;
      const bucketSize = found?._bucketSize as number | undefined;

      return (
        <div
          className="rounded-xl px-3 py-2.5 max-w-xs"
          style={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <p className="text-xs font-medium mb-1.5 truncate" style={{ color: tooltipText }}>
            {fullName}
          </p>
          {recordCount && recordCount > 1 && (
            <p className="text-[10px] mb-1" style={{ color: tickColor }}>
              {recordCount.toLocaleString()} records
            </p>
          )}
          {bucketSize && bucketSize > 1 && (
            <p className="text-[10px] mb-1" style={{ color: tickColor }}>
              {bucketSize.toLocaleString()} rows averaged
            </p>
          )}
          <div className="space-y-1">
            {payload.map((entry, index) => {
              const aggInfo = aggregationInfo?.find(a => a.column === entry.dataKey);
              const displayLabel = entry.name || aggInfo?.displayName || entry.dataKey || 'Value';
              const isAvg = aggInfo?.aggregation === 'AVG' || displayLabel.toLowerCase().startsWith('avg ');
              const formattedValue = typeof entry.value === "number"
                ? (isAvg
                  ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : entry.value.toLocaleString())
                : entry.value;

              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span style={{ color: tickColor }}>{displayLabel}</span>
                  <span className="font-semibold ml-auto" style={{ color: tooltipText }}>{formattedValue}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  }, [chartData, aggregationInfo, tooltipBg, tooltipBorder, tooltipText, tickColor]);

  // Toggle category exclusion
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

  // Change aggregation for a column
  const changeAggregation = useCallback((column: string, aggregation: AggregationType) => {
    setManipulation({
      ...currentManipulation,
      columnAggregations: {
        ...currentManipulation.columnAggregations,
        [column]: aggregation,
      },
    });
  }, [currentManipulation, setManipulation]);

  // Toggle column visibility
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

  // Reset manipulations
  const resetManipulations = useCallback(() => {
    setManipulation({
      excludedCategories: new Set(),
      columnAggregations: {},
      hiddenColumns: new Set(),
    });
  }, [setManipulation]);

  // Early return for no data - AFTER all hooks are called
  if (!chartConfig) {
    return (
      <div className={`flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm ${fillContainer ? 'h-full' : 'h-64'}`}>
        {chartType === "table" ? null : "No numeric data to visualize"}
      </div>
    );
  }

  if (!hasNonZeroValues) {
    return (
      <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-xl p-2 sm:p-4 transition-colors">
        <div className="h-[150px] sm:h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
          No data to visualize (all values are 0)
        </div>
      </div>
    );
  }

  const renderChart = () => {
    const responsiveBottomMargin = isMobile ? Math.min(bottomMargin, 40) : bottomMargin;

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              {settings.showGridLines && <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 11, fill: tickColor, fontWeight: 400 }}
                tickFormatter={yAxisFormatter}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 32 : 48}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={renderTooltipContent} isAnimationActive={false} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              {!isMobile && settings.legendPosition !== 'hidden' && (
                <Legend
                  verticalAlign={settings.legendPosition}
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: settings.legendPosition === 'bottom' ? "10px" : "0", paddingBottom: settings.legendPosition === 'top' ? "10px" : "0", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => {
                const info = aggregationInfo.find(a => a.column === col);
                return (
                  <Bar
                    key={col}
                    dataKey={col}
                    name={info?.displayName || col}
                    fill={chartColors[index % chartColors.length]}
                    radius={[6, 6, 0, 0]}
                    barSize={settings.barWidth ? Math.round(settings.barWidth * 0.5) : undefined}
                    isAnimationActive={false}
                  >
                    {settings.showDataLabels && (
                      <LabelList
                        dataKey={col}
                        position="top"
                        fill={tickColor}
                        fontSize={isMobile ? 8 : 10}
                        formatter={labelFormatter}
                      />
                    )}
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              {settings.showGridLines && <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 11, fill: tickColor, fontWeight: 400 }}
                tickFormatter={yAxisFormatter}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 32 : 48}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={renderTooltipContent} isAnimationActive={false} />
              {!isMobile && settings.legendPosition !== 'hidden' && (
                <Legend
                  verticalAlign={settings.legendPosition}
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: settings.legendPosition === 'bottom' ? "10px" : "0", paddingBottom: settings.legendPosition === 'top' ? "10px" : "0", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => {
                const info = aggregationInfo.find(a => a.column === col);
                const color = chartColors[index % chartColors.length];
                return (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    name={info?.displayName || col}
                    stroke={color}
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={!isMobile && dataCount <= 30 ? { fill: isDark ? '#18181b' : '#fff', stroke: color, strokeWidth: 2.5, r: 3.5 } : false}
                    activeDot={{ r: 5, fill: color, stroke: isDark ? '#18181b' : '#fff', strokeWidth: 2.5 }}
                    isAnimationActive={false}
                  >
                    {settings.showDataLabels && !isMobile && dataCount <= 20 && (
                      <LabelList
                        dataKey={col}
                        position="top"
                        fill={tickColor}
                        fontSize={9}
                        formatter={labelFormatter}
                      />
                    )}
                  </Line>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              <defs>
                {dataColumns.map((col, index) => {
                  const color = chartColors[index % chartColors.length];
                  return (
                    <linearGradient key={`gradient-${col}`} id={`areaGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              {settings.showGridLines && <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 11, fill: tickColor, fontWeight: 400 }}
                tickFormatter={yAxisFormatter}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 32 : 48}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={renderTooltipContent} isAnimationActive={false} />
              {!isMobile && settings.legendPosition !== 'hidden' && (
                <Legend
                  verticalAlign={settings.legendPosition}
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: settings.legendPosition === 'bottom' ? "10px" : "0", paddingBottom: settings.legendPosition === 'top' ? "10px" : "0", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => {
                const info = aggregationInfo.find(a => a.column === col);
                const color = chartColors[index % chartColors.length];
                return (
                  <Area
                    key={col}
                    type="monotone"
                    dataKey={col}
                    name={info?.displayName || col}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#areaGradient-${index})`}
                    fillOpacity={1}
                    activeDot={{ r: 5, fill: color, stroke: isDark ? '#18181b' : '#fff', strokeWidth: 2.5 }}
                    isAnimationActive={false}
                  >
                    {settings.showDataLabels && !isMobile && dataCount <= 20 && (
                      <LabelList
                        dataKey={col}
                        position="top"
                        fill={tickColor}
                        fontSize={9}
                        formatter={labelFormatter}
                      />
                    )}
                  </Area>
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        if (pieData.length === 0) {
          return (
            <div className={`flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm ${fillContainer ? 'h-full' : ''}`} style={fillContainer ? undefined : { height: chartHeight as number }}>
              No data to visualize (all values are 0)
            </div>
          );
        }

        // Calculate total for percentages
        const total = pieData.reduce((sum, item) => sum + item.value, 0);

        // Only show labels for slices > 5% to avoid overlap (hide on mobile)
        const renderLabel = ({ name, percent }: { name?: string; percent?: number }) => {
          if (isMobile) return "";
          if (!percent || percent < 0.05) return "";
          return `${truncateLabel(name || "", 10)} (${(percent * 100).toFixed(0)}%)`;
        };

        // Donut inner radius — 55% of outer for clean donut look
        const innerRadius = typeof pieOuterRadius === 'string'
          ? `${parseFloat(pieOuterRadius) * 0.55}%`
          : Math.round(pieOuterRadius * 0.55);

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={!isMobile && pieData.length <= 8 && settings.showDataLabels ? renderLabel : false}
                outerRadius={pieOuterRadius}
                innerRadius={innerRadius}
                dataKey="value"
                isAnimationActive={false}
                stroke={isDark ? '#18181b' : '#fff'}
                strokeWidth={3}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "12px",
                  fontSize: isMobile ? "10px" : "12px",
                  color: tooltipText,
                  boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
                }}
                itemStyle={{ color: tooltipText }}
                labelStyle={{ color: tooltipText }}
                formatter={(value) => {
                  const numVal = typeof value === "number" ? value : Number(value) || 0;
                  return [`${numVal.toLocaleString()} (${((numVal / total) * 100).toFixed(1)}%)`, ""];
                }}
              />
              {settings.legendPosition !== 'hidden' && (
                <Legend
                  verticalAlign={settings.legendPosition}
                  wrapperStyle={{ fontSize: isMobile ? "9px" : "11px", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{truncateLabel(value, isMobile ? 12 : 20)}</span>}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Build info text for the chart
  const getChartInfoText = () => {
    const parts: string[] = [];

    // Show data size info
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

    // Add aggregation info for the first column
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

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  const infoText = getChartInfoText();

  return (
    <div className={`w-full h-full overflow-hidden relative flex flex-col ${
      borderless
        ? 'p-0'
        : 'bg-white dark:bg-[#1a1a1a] rounded-xl p-1.5 sm:p-3 lg:p-4 transition-colors'
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

      {/* Chart container - fills remaining space */}
      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>
    </div>
  );
});

// Helper function to detect best chart type based on data
export function detectChartType(columns: string[], rowCount: number, data?: Record<string, unknown>[]): ChartType {
  const colNames = columns.map(c => c.toLowerCase());

  // Check if there's a time/date column → line chart
  const hasTimeColumn = colNames.some(c =>
    c.includes('date') || c.includes('time') || c.includes('year') || c.includes('month') ||
    c.includes('quarter') || c.includes('period') || c.includes('week') || c.includes('day')
  );
  if (hasTimeColumn && rowCount > 3) return "line";

  // If many columns (4+), table is better for readability
  const numericCols = columns.filter(c => {
    const type = detectColumnType(c);
    return type !== 'id' && type !== 'junk';
  });
  if (numericCols.length >= 4 && rowCount > 10) return "table";

  // Small category sets → pie for distribution
  if (rowCount >= 2 && rowCount <= 6) {
    // Check if it looks like a distribution (single numeric column)
    const meaningfulNumeric = columns.filter(c => {
      const type = detectColumnType(c);
      return type !== 'id' && type !== 'junk';
    });
    if (meaningfulNumeric.length <= 2) return "pie";
  }

  // Rankings, scores, comparisons → bar
  if (rowCount <= 20) return "bar";

  // Large datasets without time → bar (aggregated)
  if (rowCount > 20 && rowCount <= 50) return "bar";

  // Very large → line (sampled)
  return "line";
}
