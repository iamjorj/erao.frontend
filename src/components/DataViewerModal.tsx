"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

interface DataViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  rows: Record<string, unknown>[];
  initialChartType?: ChartType;
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

  const result: Record<string, unknown>[] = Array.from(grouped.entries()).map(([label, values]) => ({
    name: truncateLabel(label, 20),
    fullName: label,
    ...values,
  }));

  if (valueColumns.length > 0) {
    result.sort((a, b) => (b[valueColumns[0]] as number) - (a[valueColumns[0]] as number));
  }

  return result.slice(0, maxItems);
}

// Sample data evenly for line/area charts
function sampleData(
  data: Record<string, unknown>[],
  labelColumn: string,
  valueColumns: string[],
  maxPoints: number = 150
): Record<string, unknown>[] {
  if (data.length <= maxPoints) {
    return data.map((row) => {
      const fullName = String(row[labelColumn] ?? "");
      const item: Record<string, unknown> = {
        name: truncateLabel(fullName, 15),
        fullName: fullName,
      };
      valueColumns.forEach((col) => {
        const val = row[col];
        item[col] = typeof val === "number" ? val : Number(val) || 0;
      });
      return item;
    });
  }

  const step = Math.ceil(data.length / maxPoints);
  const sampled: Record<string, unknown>[] = [];

  for (let i = 0; i < data.length; i += step) {
    const row = data[i];
    const fullName = String(row[labelColumn] ?? "");
    const item: Record<string, unknown> = {
      name: truncateLabel(fullName, 15),
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

// Large Chart Component - fills entire parent container
function LargeChart({
  data,
  columns,
  chartType,
  isDark,
  isMobile,
}: {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: ChartType;
  isDark: boolean;
  isMobile: boolean;
}) {
  // Theme colors
  const gridColor = isDark ? "#333333" : "#e5e7eb";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "white";
  const tooltipBorder = isDark ? "#333333" : "#e5e7eb";
  const tooltipText = isDark ? "#f9fafb" : "#111827";

  const fontSize = isMobile ? 8 : 12;
  const margins = isMobile
    ? { top: 8, right: 4, left: 0, bottom: 40 }
    : { top: 20, right: 30, left: 40, bottom: 80 };

  // Memoize chart data processing
  const chartConfig = useMemo(() => {
    if (!data || data.length === 0 || chartType === "table") {
      return null;
    }

    const labelColumn = columns[0];
    const dataColumns = columns.slice(1).filter(col =>
      data.some(row => {
        const val = row[col];
        return typeof val === "number" || !isNaN(Number(val));
      })
    );

    const isLargeDataset = data.length > 50;

    let chartData: Record<string, unknown>[];

    if (chartType === "line" || chartType === "area") {
      chartData = sampleData(data, labelColumn, dataColumns, 150);
    } else {
      chartData = isLargeDataset
        ? aggregateData(data, labelColumn, dataColumns, chartType === "pie" ? 15 : 50)
        : data.map((row) => {
            const fullName = String(row[labelColumn] ?? "");
            const item: Record<string, unknown> = {
              name: truncateLabel(fullName, 20),
              fullName: fullName,
            };
            dataColumns.forEach((col) => {
              const val = row[col];
              item[col] = typeof val === "number" ? val : Number(val) || 0;
            });
            return item;
          });
    }

    const hasNonZeroValues = chartData.some((item) =>
      dataColumns.some((col) => (item[col] as number) > 0)
    );

    let pieData: Array<{ name: string; fullName: string; value: number; fill: string }> = [];
    if (chartType === "pie") {
      if (dataColumns.length === 1) {
        pieData = chartData.map((item, index) => ({
          name: item.name as string,
          fullName: item.fullName as string,
          value: item[dataColumns[0]] as number,
          fill: COLORS[index % COLORS.length],
        }));
      } else {
        pieData = dataColumns.map((col, index) => ({
          name: col,
          fullName: col,
          value: chartData.reduce((sum, item) => sum + (item[col] as number), 0),
          fill: COLORS[index % COLORS.length],
        }));
      }
      pieData = pieData.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
    }

    return {
      chartData,
      dataColumns,
      pieData,
      hasNonZeroValues,
      isLargeDataset,
    };
  }, [data, columns, chartType]);

  const chartData = chartConfig?.chartData ?? [];
  const dataColumns = chartConfig?.dataColumns ?? [];
  const pieData = chartConfig?.pieData ?? [];
  const hasNonZeroValues = chartConfig?.hasNonZeroValues ?? false;
  const isLargeDataset = chartConfig?.isLargeDataset ?? false;
  const dataCount = chartData.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const found = chartData.find((d) => d.name === label);
      const fullName = found ? String(found.fullName) : label || "";
      return (
        <div
          className="rounded-lg p-2 sm:p-3 shadow-xl max-w-[200px] sm:max-w-sm"
          style={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
          }}
        >
          <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 break-words" style={{ color: tooltipText }}>
            {fullName}
          </p>
          {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
            <p key={index} className="text-xs sm:text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, [chartData, tooltipBg, tooltipBorder, tooltipText]);

  if (!chartConfig) return null;

  const getXAxisConfig = () => {
    if (isMobile) {
      const skipInterval = Math.max(Math.ceil(dataCount / 4), 1);
      return { interval: skipInterval - 1, angle: -30, textAnchor: "end" as const, dy: 5 };
    }
    if (dataCount <= 15) {
      return { interval: 0, angle: 0, textAnchor: "middle" as const, dy: 10 };
    } else if (dataCount <= 30) {
      return { interval: 0, angle: -45, textAnchor: "end" as const, dy: 5 };
    } else {
      const skipInterval = Math.ceil(dataCount / 20);
      return { interval: skipInterval - 1, angle: -45, textAnchor: "end" as const, dy: 5 };
    }
  };

  const xAxisConfig = getXAxisConfig();

  if (!hasNonZeroValues) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}>
        No data to visualize (all values are 0)
      </div>
    );
  }

  const renderInfo = () => {
    if (!isLargeDataset) return null;
    return (
      <div className={`text-[10px] sm:text-sm text-center py-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {chartType === "pie"
          ? `Top 15 (${data.length} rows)`
          : chartType === "line" || chartType === "area"
          ? `${chartData.length} of ${data.length} rows`
          : `Top 50 of ${data.length} rows`}
      </div>
    );
  };

  // Common axis chart rendering
  const renderAxisChart = (ChartComponent: typeof BarChart, children: React.ReactNode) => (
    <div className="w-full h-full flex flex-col">
      {renderInfo()}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData} margin={margins}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="name"
              tick={{ fontSize, fill: tickColor }}
              interval={xAxisConfig.interval}
              angle={xAxisConfig.angle}
              textAnchor={xAxisConfig.textAnchor}
              dy={xAxisConfig.dy}
              height={isMobile ? 50 : (dataCount > 15 ? 90 : 40)}
            />
            <YAxis
              tick={{ fontSize, fill: tickColor }}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v/1000).toFixed(0)}k`;
                return v;
              }}
              width={isMobile ? 30 : 60}
            />
            <Tooltip content={renderTooltip} />
            {!isMobile && (
              <Legend
                wrapperStyle={{ fontSize: "13px", paddingTop: "10px", color: tickColor }}
                formatter={(value) => <span style={{ color: tickColor }}>{value}</span>}
              />
            )}
            {children}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );

  switch (chartType) {
    case "bar":
      return renderAxisChart(
        BarChart as typeof BarChart,
        dataColumns.map((col, index) => (
          <Bar key={col} dataKey={col} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))
      );

    case "line":
      return renderAxisChart(
        LineChart as unknown as typeof BarChart,
        dataColumns.map((col, index) => (
          <Line
            key={col}
            type="monotone"
            dataKey={col}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={isMobile ? 1.5 : 2}
            dot={!isMobile && dataCount <= 50 ? { fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 3 } : false}
          />
        ))
      );

    case "area":
      return renderAxisChart(
        AreaChart as unknown as typeof BarChart,
        dataColumns.map((col, index) => (
          <Area
            key={col}
            type="monotone"
            dataKey={col}
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.3}
          />
        ))
      );

    case "pie": {
      if (pieData.length === 0) {
        return (
          <div className={`w-full h-full flex items-center justify-center ${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}>
            No data to visualize (all values are 0)
          </div>
        );
      }

      const total = pieData.reduce((sum, item) => sum + item.value, 0);

      const renderLabel = ({ name, percent }: { name?: string; percent?: number }) => {
        if (isMobile) return "";
        if (!percent || percent < 0.03) return "";
        return `${truncateLabel(name || "", 12)} (${(percent * 100).toFixed(0)}%)`;
      };

      return (
        <div className="w-full h-full flex flex-col">
          {renderInfo()}
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy={isMobile ? "45%" : "45%"}
                  labelLine={false}
                  label={!isMobile && pieData.length <= 10 ? renderLabel : false}
                  outerRadius={isMobile ? "60%" : "35%"}
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
                    fontSize: isMobile ? "11px" : "14px",
                    color: tooltipText,
                  }}
                  itemStyle={{ color: tooltipText }}
                  labelStyle={{ color: tooltipText }}
                  formatter={(value) => {
                    const numValue = typeof value === "number" ? value : Number(value) || 0;
                    return [`${numValue.toLocaleString()} (${((numValue / total) * 100).toFixed(1)}%)`, ""];
                  }}
                />
                <Legend
                  layout={isMobile ? "horizontal" : "horizontal"}
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: isMobile ? "10px" : "13px", color: tickColor, paddingTop: "8px" }}
                  formatter={(value) => <span style={{ color: tickColor }}>{truncateLabel(value, isMobile ? 12 : 25)}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function DataViewerModal({
  isOpen,
  onClose,
  columns,
  rows,
  initialChartType = "table",
}: DataViewerModalProps) {
  const [currentView, setCurrentView] = useState<ChartType>(initialChartType);
  const isDark = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check if data is chartable
  const hasNumericData = useMemo(() => {
    return columns.slice(1).some((col) =>
      rows.some((row) => {
        const val = row[col];
        return typeof val === "number" || !isNaN(Number(val));
      })
    );
  }, [columns, rows]);

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = columns.join(",");
    const csvRows = rows.map((row) =>
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
      className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`
          w-full h-full
          sm:w-[calc(100vw-24px)] sm:h-[calc(100vh-24px)] sm:rounded-xl
          flex flex-col overflow-hidden shadow-2xl transition-colors
          ${isDark ? "bg-[#0a0a0a]" : "bg-white"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - compact */}
        <div className={`flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b flex-shrink-0 ${
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
        </div>

        {/* View Toggle - compact */}
        <div className={`flex items-center gap-0.5 px-2 sm:px-5 py-1.5 sm:py-2 border-b flex-shrink-0 overflow-x-auto ${
          isDark ? "border-[#1a1a1a] bg-[#111]" : "border-gray-100 bg-gray-50/50"
        }`}>
          {viewButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => setCurrentView(btn.type)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 flex items-center gap-1.5 ${
                currentView === btn.type
                  ? isDark ? "bg-white text-gray-900" : "bg-black text-white"
                  : isDark ? "text-gray-400 hover:bg-[#1a1a1a]" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area - takes ALL remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentView === "table" ? (
            <FullscreenVirtualTable columns={columns} rows={rows} isDark={isDark} isMobile={isMobile} />
          ) : (
            <div className="w-full h-full p-2 sm:p-4">
              <LargeChart data={rows} columns={columns} chartType={currentView} isDark={isDark} isMobile={isMobile} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
