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

// Color palettes for charts (works well on both light and dark)
const COLOR_THEMES: Record<ChartSettings['colorTheme'], string[]> = {
  colorful: [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#14b8a6", // teal
    "#f97316", // orange
  ],
  monochrome: [
    "#1f2937", // gray-800
    "#374151", // gray-700
    "#4b5563", // gray-600
    "#6b7280", // gray-500
    "#9ca3af", // gray-400
    "#d1d5db", // gray-300
    "#e5e7eb", // gray-200
    "#f3f4f6", // gray-100
    "#f9fafb", // gray-50
    "#111827", // gray-900
  ],
  blue: [
    "#1e40af", // blue-800
    "#1d4ed8", // blue-700
    "#2563eb", // blue-600
    "#3b82f6", // blue-500
    "#60a5fa", // blue-400
    "#93c5fd", // blue-300
    "#bfdbfe", // blue-200
    "#dbeafe", // blue-100
    "#0c4a6e", // sky-900
    "#075985", // sky-800
  ],
  green: [
    "#065f46", // emerald-800
    "#047857", // emerald-700
    "#059669", // emerald-600
    "#10b981", // emerald-500
    "#34d399", // emerald-400
    "#6ee7b7", // emerald-300
    "#a7f3d0", // emerald-200
    "#d1fae5", // emerald-100
    "#14532d", // green-900
    "#166534", // green-800
  ],
  purple: [
    "#5b21b6", // violet-800
    "#6d28d9", // violet-700
    "#7c3aed", // violet-600
    "#8b5cf6", // violet-500
    "#a78bfa", // violet-400
    "#c4b5fd", // violet-300
    "#ddd6fe", // violet-200
    "#ede9fe", // violet-100
    "#581c87", // purple-900
    "#6b21a8", // purple-800
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

  // Score/Rating columns - should AVG
  if (name.includes('score') || name.includes('rating') || name.includes('grade') ||
      name.includes('cgpa') || name.includes('gpa') || name.includes('marks') ||
      name.includes('rank') || name.includes('level') || name.includes('tier') ||
      name.includes('points') || name.includes('stars')) {
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
        displayName: `${aggregation} ${col}`,
        detectedType,
      };
    }

    let aggregation: AggregationType;
    let displayName: string;

    switch (detectedType) {
      case 'id':
      case 'junk':
        aggregation = 'COUNT';
        displayName = `Count`;
        break;
      case 'score':
      case 'percentage':
        aggregation = 'AVG';
        displayName = `Avg ${col}`;
        break;
      case 'amount':
      case 'count':
        aggregation = 'SUM';
        displayName = `Total ${col}`;
        break;
      default:
        // For unknown numeric, use AVG if values are small, COUNT if looks like IDs
        const sampleValues = data.slice(0, 100).map(row => {
          const val = row[col];
          return typeof val === 'number' ? val : Number(val) || 0;
        }).filter(v => v !== 0);

        if (sampleValues.length > 0) {
          const avg = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
          const max = Math.max(...sampleValues);
          // If values look like sequential IDs (high values, close to row count)
          if (max > data.length * 0.5 && avg > data.length * 0.3) {
            aggregation = 'COUNT';
            displayName = `Count`;
          } else if (max <= 100 || avg <= 50) {
            // Small values, probably ratings/scores
            aggregation = 'AVG';
            displayName = `Avg ${col}`;
          } else {
            aggregation = 'SUM';
            displayName = `Total ${col}`;
          }
        } else {
          aggregation = 'COUNT';
          displayName = `Count`;
        }
    }

    return { column: col, aggregation, displayName, detectedType };
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
  const fontSize = isMobile ? 8 : screenSize === "tablet" ? 9 : 10;
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
      let displayName: string;

      switch (type) {
        case 'id':
        case 'junk':
          aggregation = 'COUNT';
          displayName = `Count`;
          break;
        case 'score':
        case 'percentage':
          aggregation = 'AVG';
          displayName = `Avg ${col}`;
          break;
        case 'amount':
        case 'count':
          aggregation = 'SUM';
          displayName = `Total ${col}`;
          break;
        default:
          // For unknown numeric, check if values look like IDs
          const sampleValues = data.slice(0, 100).map(row => {
            const val = row[col];
            return typeof val === 'number' ? val : Number(val) || 0;
          }).filter(v => v !== 0);

          if (sampleValues.length > 0) {
            const avg = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
            const max = Math.max(...sampleValues);
            if (max > data.length * 0.5 && avg > data.length * 0.3) {
              aggregation = 'COUNT';
              displayName = `Count`;
            } else if (max <= 100 || avg <= 50) {
              aggregation = 'AVG';
              displayName = `Avg ${col}`;
            } else {
              aggregation = 'SUM';
              displayName = `Total ${col}`;
            }
          } else {
            aggregation = 'COUNT';
            displayName = `Count`;
          }
      }

      return { column: col, aggregation, displayName, detectedType: type };
    });

    // Check if label column is categorical (few unique values)
    const isCategorical = isCategoricalColumn(data, labelColumn);

    // Process data based on chart type and size
    let chartData: Record<string, unknown>[];
    let finalAggregationInfo = aggregationInfo;

    // Count unique values in label column
    const uniqueLabelCount = new Set(data.map(row => String(row[labelColumn] ?? ""))).size;

    // For ALL chart types with categorical data, aggregate first
    // Categorical data (like Gender: Male/Female) should always be grouped
    if (isCategorical) {
      // Use smart aggregation for categorical data
      const maxItems = chartType === "pie" ? 10 : 50;
      const result = smartAggregateData(
        data,
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
      chartData = sampleDataWithRollingAvg(data, labelColumn, finalDataColumns, 60, aggregationInfo);
    } else {
      // For bar/pie with non-categorical data
      if (isLargeDataset) {
        const result = smartAggregateData(
          data,
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
        const uniqueLabels = new Set(data.map(row => String(row[labelColumn] ?? "")));
        if (uniqueLabels.size < data.length * 0.8) {
          // Has grouping potential
          const result = smartAggregateData(
            data,
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
          chartData = data.slice(0, 50).map((row) => {
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

  // Theme colors - pure black theme for dark mode
  const gridColor = isDark ? "#333333" : "#e5e7eb";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "white";
  const tooltipBorder = isDark ? "#333333" : "#e5e7eb";
  const tooltipText = isDark ? "#f9fafb" : "#111827";

  // X-axis config - memoized to prevent recalculation
  const xAxisConfig = useMemo(() => {
    if (dataCount <= 10) {
      return { interval: 0, angle: 0, textAnchor: "middle" as const, dy: 10 };
    } else if (dataCount <= 20) {
      return { interval: 0, angle: -45, textAnchor: "end" as const, dy: 5 };
    } else {
      const skipInterval = Math.ceil(dataCount / 15);
      return { interval: skipInterval - 1, angle: -45, textAnchor: "end" as const, dy: 5 };
    }
  }, [dataCount]);

  const bottomMargin = dataCount > 10 ? 60 : 20;

  // Memoized formatters to avoid re-creating on every render
  const yAxisFormatter = useCallback((v: number) => isMobile ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)) : v.toLocaleString(), [isMobile]);
  const labelFormatter = useCallback((v: unknown) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v), []);

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
          className="rounded-lg p-2 shadow-lg max-w-xs"
          style={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
          }}
        >
          <p className="text-sm font-medium mb-1 truncate" style={{ color: tooltipText }}>
            {fullName}
          </p>
          {recordCount && recordCount > 1 && (
            <p className="text-[10px] mb-1" style={{ color: tickColor }}>
              ({recordCount.toLocaleString()} records)
            </p>
          )}
          {bucketSize && bucketSize > 1 && (
            <p className="text-[10px] mb-1" style={{ color: tickColor }}>
              ({bucketSize.toLocaleString()} rows averaged)
            </p>
          )}
          {payload.map((entry, index) => {
            const aggInfo = aggregationInfo?.find(a => a.column === entry.dataKey || a.column === entry.name);
            const displayLabel = aggInfo?.displayName || entry.name;
            const formattedValue = typeof entry.value === "number"
              ? (aggInfo?.aggregation === 'AVG'
                ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : entry.value.toLocaleString())
              : entry.value;

            return (
              <p key={index} className="text-xs" style={{ color: entry.color }}>
                {displayLabel}: {formattedValue}
              </p>
            );
          })}
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
              {settings.showGridLines && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor }}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 12, fill: tickColor }}
                tickFormatter={yAxisFormatter}
                width={isMobile ? 35 : 60}
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
              {dataColumns.map((col, index) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={chartColors[index % chartColors.length]}
                  radius={[2, 2, 0, 0]}
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
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              {settings.showGridLines && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor }}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 12, fill: tickColor }}
                tickFormatter={yAxisFormatter}
                width={isMobile ? 35 : 60}
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
              {dataColumns.map((col, index) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={!isMobile && dataCount <= 30 ? { fill: chartColors[index % chartColors.length], strokeWidth: 2, r: 2 } : false}
                  activeDot={{ r: 4, fill: chartColors[index % chartColors.length], stroke: isDark ? '#1a1a1a' : '#fff', strokeWidth: 2 }}
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
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              {settings.showGridLines && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize, fill: tickColor }}
                interval={isMobile ? Math.max(xAxisConfig.interval, Math.ceil(dataCount / 5)) : xAxisConfig.interval}
                angle={xAxisConfig.angle}
                textAnchor={xAxisConfig.textAnchor}
                dy={xAxisConfig.dy}
                height={responsiveBottomMargin + 15}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 9 : 12, fill: tickColor }}
                tickFormatter={yAxisFormatter}
                width={isMobile ? 35 : 60}
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
              {dataColumns.map((col, index) => (
                <Area
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={chartColors[index % chartColors.length]}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.3}
                  activeDot={{ r: 4, fill: chartColors[index % chartColors.length], stroke: isDark ? '#1a1a1a' : '#fff', strokeWidth: 2 }}
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
              ))}
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
                dataKey="value"
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  fontSize: isMobile ? "10px" : "12px",
                  color: tooltipText,
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
