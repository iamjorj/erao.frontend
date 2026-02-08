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
} from "recharts";

export type ChartType = "bar" | "line" | "pie" | "area" | "table";

interface DataChartProps {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: ChartType;
}

// Hook to detect mobile screen
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

// Color palette for charts (works well on both light and dark)
const COLORS = [
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
];

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

export function DataChart({ data, columns, chartType }: DataChartProps) {
  const isDark = useDarkMode();
  const isMobile = useIsMobile();

  // Responsive chart dimensions
  const chartHeight = isMobile ? 220 : 300;
  const pieOuterRadius = isMobile ? 60 : 90;
  const fontSize = isMobile ? 8 : 10;
  const legendFontSize = isMobile ? "10px" : "12px";
  const margins = isMobile
    ? { top: 10, right: 10, left: 0, bottom: 40 }
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

    // Prepare pie data
    let pieData: Array<{ name: string; fullName: string; value: number; fill: string }> = [];
    if (chartType === "pie") {
      if (finalDataColumns.length === 1) {
        pieData = chartData.map((item, index) => ({
          name: item.name as string,
          fullName: item.fullName as string,
          value: item[finalDataColumns[0]] as number,
          fill: COLORS[index % COLORS.length],
        }));
      } else {
        pieData = finalDataColumns.map((col, index) => ({
          name: col,
          fullName: col,
          value: chartData.reduce((sum, item) => sum + (item[col] as number), 0),
          fill: COLORS[index % COLORS.length],
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
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
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
              />
              <Tooltip content={<CustomTooltip />} />
              {!isMobile && (
                <Legend
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: "10px", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={COLORS[index % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
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
              />
              <Tooltip content={<CustomTooltip />} />
              {!isMobile && (
                <Legend
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: "10px", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={!isMobile && dataCount <= 30 ? { fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 2 } : false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ ...margins, bottom: responsiveBottomMargin }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
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
              />
              <Tooltip content={<CustomTooltip />} />
              {!isMobile && (
                <Legend
                  wrapperStyle={{ fontSize: legendFontSize, paddingTop: "10px", color: tickColor }}
                  formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
                />
              )}
              {dataColumns.map((col, index) => (
                <Area
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                />
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
                label={!isMobile && pieData.length <= 8 ? renderLabel : false}
                outerRadius={pieOuterRadius}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <Legend
                wrapperStyle={{ fontSize: isMobile ? "9px" : "11px", color: tickColor }}
                formatter={(value) => <span style={{ color: tickColor }}>{truncateLabel(value, isMobile ? 12 : 20)}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-xl p-2 sm:p-4 transition-colors">
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
