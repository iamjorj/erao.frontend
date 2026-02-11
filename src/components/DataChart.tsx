"use client";

import { useMemo, useState, useEffect } from "react";
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

interface DataChartProps {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: ChartType;
  settings?: ChartSettings;
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

// Aggregate data by label column for large datasets
function aggregateData(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxItems: number = 50
): Record<string, unknown>[] {
  // Group by label and sum values
  const grouped = new Map<string, Record<string, number>>();

  data.forEach((row) => {
    const label = String(row[labelColumn] ?? "Unknown");
    if (!grouped.has(label)) {
      grouped.set(label, {});
      valueColumns.forEach((col) => {
        grouped.get(label)![col] = 0;
      });
    }
    const group = grouped.get(label)!;
    valueColumns.forEach((col) => {
      const val = row[col];
      group[col] += typeof val === "number" ? val : Number(val) || 0;
    });
  });

  // Convert to array and sort by first value column (descending)
  const result: Record<string, unknown>[] = Array.from(grouped.entries()).map(([label, values]) => ({
    name: truncateLabel(label),
    fullName: label,
    ...values,
  }));

  // Sort by the first value column descending
  if (valueColumns.length > 0) {
    result.sort((a, b) => (b[valueColumns[0]] as number) - (a[valueColumns[0]] as number));
  }

  // Limit to maxItems
  return result.slice(0, maxItems);
}

// Sample data evenly for line/area charts to show trends
function sampleData(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxPoints: number = 100
): Record<string, unknown>[] {
  if (data.length <= maxPoints) {
    return data.map((row) => {
      const fullName = String(row[labelColumn] ?? "");
      const item: Record<string, unknown> = {
        name: truncateLabel(fullName, 12),
        fullName: fullName,
      };
      valueColumns.forEach((col) => {
        const val = row[col];
        item[col] = typeof val === "number" ? val : Number(val) || 0;
      });
      return item;
    });
  }

  // Sample evenly across the dataset
  const step = Math.ceil(data.length / maxPoints);
  const sampled: Record<string, unknown>[] = [];

  for (let i = 0; i < data.length; i += step) {
    const row = data[i];
    const fullName = String(row[labelColumn] ?? "");
    const item: Record<string, unknown> = {
      name: truncateLabel(fullName, 12),
      fullName: fullName,
    };
    valueColumns.forEach((col) => {
      const val = row[col];
      item[col] = typeof val === "number" ? val : Number(val) || 0;
    });
    sampled.push(item);
  }

  return sampled;
}

export function DataChart({ data, columns, chartType, settings = defaultChartSettings }: DataChartProps) {
  const isDark = useDarkMode();
  const screenSize = useScreenSize();
  const isMobile = screenSize === "mobile";

  // Get colors based on theme setting
  const chartColors = settings.colorTheme === 'custom' && settings.customColors?.length
    ? settings.customColors
    : COLOR_THEMES[settings.colorTheme] || COLORS;

  // Responsive chart dimensions - fill available space
  const chartHeight = isMobile ? 250 : screenSize === "tablet" ? 300 : 320;
  const pieOuterRadius = isMobile ? 70 : screenSize === "tablet" ? 85 : 100;
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

    // Find first non-numeric column to use as label, or use first column
    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));
    const labelColumn = nonNumericColumns.length > 0 ? nonNumericColumns[0] : columns[0];

    // Use numeric columns as data columns, excluding the label column if it was numeric
    const dataColumns = numericColumns.filter(col => col !== labelColumn);

    // If no data columns found but we have numeric columns, use all except first as data
    // and first as label (fallback for all-numeric data)
    const finalDataColumns = dataColumns.length > 0
      ? dataColumns
      : numericColumns.length > 1
        ? numericColumns.slice(1)
        : numericColumns;

    const isLargeDataset = data.length > 50;

    // Process data based on chart type and size
    let chartData: Record<string, unknown>[];

    if (chartType === "line" || chartType === "area") {
      // For line/area, sample data to show trends
      chartData = sampleData(data, labelColumn, finalDataColumns, 100);
    } else {
      // For bar/pie, aggregate data
      chartData = isLargeDataset
        ? aggregateData(data, labelColumn, finalDataColumns, chartType === "pie" ? 10 : 30)
        : data.map((row) => {
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

    const hasNonZeroValues = chartData.some((item) =>
      finalDataColumns.some((col) => (item[col] as number) > 0)
    );

    // Prepare pie data (note: fill will be applied dynamically based on settings)
    let pieData: Array<{ name: string; fullName: string; value: number }> = [];
    if (chartType === "pie") {
      if (finalDataColumns.length === 1) {
        pieData = chartData.map((item) => ({
          name: item.name as string,
          fullName: item.fullName as string,
          value: item[finalDataColumns[0]] as number,
        }));
      } else {
        pieData = finalDataColumns.map((col) => ({
          name: col,
          fullName: col,
          value: chartData.reduce((sum, item) => sum + (item[col] as number), 0),
        }));
      }
      // Filter zeros and sort by value
      pieData = pieData.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
    }

    return {
      chartData,
      dataColumns: finalDataColumns,
      pieData,
      hasNonZeroValues,
      isLargeDataset,
    };
  }, [data, columns, chartType]);

  if (!chartConfig) return null;

  const { chartData, dataColumns, pieData, hasNonZeroValues, isLargeDataset } = chartConfig;
  const dataCount = chartData.length;

  // Theme colors - pure black theme for dark mode
  const gridColor = isDark ? "#333333" : "#e5e7eb";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "white";
  const tooltipBorder = isDark ? "#333333" : "#e5e7eb";
  const tooltipText = isDark ? "#f9fafb" : "#111827";

  // X-axis config
  const getXAxisConfig = () => {
    if (dataCount <= 10) {
      return { interval: 0, angle: 0, textAnchor: "middle" as const, dy: 10 };
    } else if (dataCount <= 20) {
      return { interval: 0, angle: -45, textAnchor: "end" as const, dy: 5 };
    } else {
      const skipInterval = Math.ceil(dataCount / 15);
      return { interval: skipInterval - 1, angle: -45, textAnchor: "end" as const, dy: 5 };
    }
  };

  const xAxisConfig = getXAxisConfig();
  const bottomMargin = dataCount > 10 ? 60 : 20;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const found = chartData.find(d => d.name === label);
      const fullName = found ? String(found.fullName) : (label || "");
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
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
                tickFormatter={(v) => isMobile ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v.toLocaleString()}
                width={isMobile ? 35 : 60}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
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
                >
                  {settings.showDataLabels && (
                    <LabelList
                      dataKey={col}
                      position="top"
                      fill={tickColor}
                      fontSize={isMobile ? 8 : 10}
                      formatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
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
                tickFormatter={(v) => isMobile ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v.toLocaleString()}
                width={isMobile ? 35 : 60}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
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
                >
                  {settings.showDataLabels && !isMobile && dataCount <= 20 && (
                    <LabelList
                      dataKey={col}
                      position="top"
                      fill={tickColor}
                      fontSize={9}
                      formatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
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
                tickFormatter={(v) => isMobile ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v.toLocaleString()}
                width={isMobile ? 35 : 60}
                domain={[
                  settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                  settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
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
                >
                  {settings.showDataLabels && !isMobile && dataCount <= 20 && (
                    <LabelList
                      dataKey={col}
                      position="top"
                      fill={tickColor}
                      fontSize={9}
                      formatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
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
            <div className={`flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm`} style={{ height: chartHeight }}>
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

  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-xl p-1.5 sm:p-3 lg:p-4 transition-colors overflow-hidden">
      {isLargeDataset && chartType !== "table" && (
        <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mb-1 sm:mb-2 text-center">
          {chartType === "pie" ? "Top 10" : chartType === "line" || chartType === "area" ? `${data.length} rows` : `Top 30 of ${data.length}`}
        </div>
      )}
      {renderChart()}
    </div>
  );
}

// Helper function to detect best chart type based on data
export function detectChartType(columns: string[], rowCount: number): ChartType {
  if (rowCount <= 5 && rowCount > 1) {
    return "pie";
  }
  if (rowCount > 5 && rowCount <= 15) {
    return "bar";
  }
  if (rowCount > 15) {
    return "line";
  }
  return "bar";
}
