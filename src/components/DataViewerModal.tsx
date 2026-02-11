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
  LabelList,
} from "recharts";

export type ChartType = "bar" | "line" | "pie" | "area" | "table";

// Chart settings interface
interface ChartSettings {
  yAxisMin: number | 'auto';
  yAxisMax: number | 'auto';
  barWidth: number;
  showDataLabels: boolean;
  showGridLines: boolean;
  colorTheme: 'colorful' | 'monochrome' | 'blue' | 'green' | 'purple' | 'custom';
  legendPosition: 'top' | 'bottom' | 'hidden';
  customColors?: string[];
}

const defaultChartSettings: ChartSettings = {
  yAxisMin: 'auto',
  yAxisMax: 'auto',
  barWidth: 60,
  showDataLabels: false,
  showGridLines: true,
  colorTheme: 'colorful',
  legendPosition: 'bottom',
};

interface DataViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  rows: Record<string, unknown>[];
  initialChartType?: ChartType;
  sqlQuery?: string;
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

// Color palettes for charts
const COLOR_THEMES: Record<ChartSettings['colorTheme'], string[]> = {
  colorful: [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#14b8a6", "#f97316",
  ],
  monochrome: [
    "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af",
    "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb", "#111827",
  ],
  blue: [
    "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa",
    "#93c5fd", "#bfdbfe", "#dbeafe", "#0c4a6e", "#075985",
  ],
  green: [
    "#065f46", "#047857", "#059669", "#10b981", "#34d399",
    "#6ee7b7", "#a7f3d0", "#d1fae5", "#14532d", "#166534",
  ],
  purple: [
    "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa",
    "#c4b5fd", "#ddd6fe", "#ede9fe", "#581c87", "#6b21a8",
  ],
  custom: [], // Will use customColors from settings
};

// Default colors (colorful theme)
const COLORS = COLOR_THEMES.colorful;

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
  settings = defaultChartSettings,
}: {
  data: Record<string, unknown>[];
  columns: string[];
  chartType: ChartType;
  isDark: boolean;
  isMobile: boolean;
  settings?: ChartSettings;
}) {
  // Get colors based on theme setting
  const chartColors = settings.colorTheme === 'custom' && settings.customColors?.length
    ? settings.customColors
    : COLOR_THEMES[settings.colorTheme] || COLORS;

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
          fill: chartColors[index % chartColors.length],
        }));
      } else {
        pieData = dataColumns.map((col, index) => ({
          name: col,
          fullName: col,
          value: chartData.reduce((sum, item) => sum + (item[col] as number), 0),
          fill: chartColors[index % chartColors.length],
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
            {settings.showGridLines && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
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
              domain={[
                settings.yAxisMin === 'auto' ? 'auto' : settings.yAxisMin,
                settings.yAxisMax === 'auto' ? 'auto' : settings.yAxisMax
              ]}
            />
            <Tooltip content={renderTooltip} />
            {!isMobile && settings.legendPosition !== 'hidden' && (
              <Legend
                verticalAlign={settings.legendPosition}
                wrapperStyle={{ fontSize: "13px", paddingTop: settings.legendPosition === 'bottom' ? "10px" : "0", paddingBottom: settings.legendPosition === 'top' ? "10px" : "0", color: tickColor }}
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
          <Bar
            key={col}
            dataKey={col}
            fill={chartColors[index % chartColors.length]}
            radius={[4, 4, 0, 0]}
            barSize={settings.barWidth ? Math.round(settings.barWidth * 0.5) : undefined}
          >
            {settings.showDataLabels && (
              <LabelList
                dataKey={col}
                position="top"
                fill={tickColor}
                fontSize={isMobile ? 8 : 10}
                formatter={(v) => {
                  const n = Number(v);
                  return isNaN(n) ? String(v) : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
                }}
              />
            )}
          </Bar>
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
            stroke={chartColors[index % chartColors.length]}
            strokeWidth={isMobile ? 1.5 : 2}
            dot={!isMobile && dataCount <= 50 ? { fill: chartColors[index % chartColors.length], strokeWidth: 2, r: 3 } : false}
          >
            {settings.showDataLabels && !isMobile && dataCount <= 20 && (
              <LabelList
                dataKey={col}
                position="top"
                fill={tickColor}
                fontSize={9}
                formatter={(v) => {
                  const n = Number(v);
                  return isNaN(n) ? String(v) : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
                }}
              />
            )}
          </Line>
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
                formatter={(v) => {
                  const n = Number(v);
                  return isNaN(n) ? String(v) : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
                }}
              />
            )}
          </Area>
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
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
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
                {settings.legendPosition !== 'hidden' && (
                  <Legend
                    layout="horizontal"
                    verticalAlign={settings.legendPosition}
                    wrapperStyle={{ fontSize: isMobile ? "10px" : "13px", color: tickColor, paddingTop: settings.legendPosition === 'bottom' ? "8px" : "0", paddingBottom: settings.legendPosition === 'top' ? "8px" : "0" }}
                    formatter={(value) => <span style={{ color: tickColor }}>{truncateLabel(value, isMobile ? 12 : 25)}</span>}
                  />
                )}
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
  sqlQuery,
  initialChartSettings,
  onSettingsChange,
}: DataViewerModalProps) {
  const [currentView, setCurrentView] = useState<ChartType>(initialChartType);
  const isDark = useDarkMode();
  const [isMobile, setIsMobile] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown[]>>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(initialChartSettings || defaultChartSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [addingNewColor, setAddingNewColor] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Color picker constants - organized by rows (6 colors per row)
  const defaultCustomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const colorRows = [
    ['#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'],
    ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    ['#14532d', '#047857', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
    ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fecaca'],
    ['#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fef3c7'],
    ['#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'],
  ];

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

  // Close settings on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSettings]);

  // Filter rows based on active filters
  const filteredRows = useMemo(() => {
    if (Object.keys(filters).length === 0) return rows;
    return rows.filter(row => {
      for (const [col, values] of Object.entries(filters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rows, filters]);

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

  const handleClearFilters = useCallback(() => {
    setFilters({});
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

  const activeFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);

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

  // Get unique values for a column (for filtering)
  const getUniqueValues = useCallback((column: string) => {
    const seen = new Set<string>();
    const values: unknown[] = [];
    for (const row of filteredRows) {
      const val = row[column];
      const key = String(val);
      if (!seen.has(key)) {
        seen.add(key);
        values.push(val);
      }
    }
    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [filteredRows]);

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

        {/* View Toggle with Toolbar */}
        <div className={`flex items-center justify-between px-2 sm:px-5 py-1.5 sm:py-2 border-b flex-shrink-0 ${
          isDark ? "border-[#1a1a1a] bg-[#111]" : "border-gray-100 bg-gray-50/50"
        }`}>
          {/* Chart Type Buttons */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
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

          {/* Toolbar: SQL, Filter, Settings */}
          <div className="flex items-center gap-1 ml-3 pl-3 border-l border-gray-200 dark:border-[#333] relative">
            {/* SQL Button */}
            {sqlQuery && (
              <button
                onClick={() => setShowSql(!showSql)}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  showSql
                    ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                    : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={showSql ? "Hide SQL" : "View SQL"}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                  <path d="M2 4h12M2 8h8M2 12h10" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Filter Button - only for table view */}
            {currentView === "table" && (
              <button
                onClick={() => setShowFilterModal(true)}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  activeFilterCount > 0
                    ? isDark ? 'text-white bg-[#333]' : 'text-gray-900 bg-gray-200'
                    : isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={`Filter data${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}

            {/* Settings Button - only for charts */}
            {currentView !== "table" && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                    isDark ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Chart settings"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {/* Mobile backdrop for settings */}
                {showSettings && (
                  <div
                    className={`fixed inset-0 bg-black/30 z-40 sm:hidden`}
                    onClick={() => setShowSettings(false)}
                  />
                )}
                {/* Settings Dropdown */}
                {showSettings && (
                  <div
                    className={`fixed z-50 rounded-t-2xl sm:rounded-xl shadow-lg p-4 pb-8 sm:pb-4 overflow-y-auto
                      inset-x-0 bottom-0 max-h-[75vh]
                      sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-72 sm:max-h-[80vh] ${
                      isDark ? 'bg-[#1f1f1f] border border-[#333]' : 'bg-white border border-gray-200'
                    }`}
                    onClick={(e) => {
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
                      <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                    </div>
                    <div className="space-y-4">
                      <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider pb-2 border-b flex items-center justify-between ${
                        isDark ? 'text-gray-400 border-[#333]' : 'text-gray-400 border-gray-100'
                      }`}>
                        <span>{currentView} Chart Settings</span>
                        <button
                          onClick={() => setShowSettings(false)}
                          className={`sm:hidden p-1 rounded-md ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {/* Y-Axis Range - for bar, line, area */}
                      {(currentView === 'bar' || currentView === 'line' || currentView === 'area') && (
                        <div>
                          <span className={`text-xs sm:text-sm font-medium block mb-1.5 sm:mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Y-Axis Range</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Auto"
                              value={chartSettings.yAxisMin === 'auto' ? '' : chartSettings.yAxisMin}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleSettingsChange({
                                  ...chartSettings,
                                  yAxisMin: val === '' ? 'auto' : Number(val) || 0,
                                });
                              }}
                              className={`flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border outline-none ${
                                isDark
                                  ? 'bg-[#2a2a2a] border-[#333] text-white focus:border-gray-500'
                                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'
                              }`}
                            />
                            <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>to</span>
                            <input
                              type="text"
                              placeholder="Auto"
                              value={chartSettings.yAxisMax === 'auto' ? '' : chartSettings.yAxisMax}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleSettingsChange({
                                  ...chartSettings,
                                  yAxisMax: val === '' ? 'auto' : Number(val) || 0,
                                });
                              }}
                              className={`flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border outline-none ${
                                isDark
                                  ? 'bg-[#2a2a2a] border-[#333] text-white focus:border-gray-500'
                                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400'
                              }`}
                            />
                          </div>
                        </div>
                      )}
                      {/* Bar Width - only for bar chart */}
                      {currentView === 'bar' && (
                        <div>
                          <span className={`text-xs sm:text-sm font-medium block mb-1.5 sm:mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Bar Width: {chartSettings.barWidth}%
                          </span>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            value={chartSettings.barWidth}
                            onChange={(e) => handleSettingsChange({ ...chartSettings, barWidth: Number(e.target.value) })}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                          />
                        </div>
                      )}
                      {/* Data Labels */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Data Labels</span>
                        <button
                          onClick={() => handleSettingsChange({ ...chartSettings, showDataLabels: !chartSettings.showDataLabels })}
                          className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${chartSettings.showDataLabels ? (isDark ? 'bg-white' : 'bg-gray-900') : isDark ? 'bg-[#444]' : 'bg-gray-300'}`}
                        >
                          <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow transform transition-transform ${chartSettings.showDataLabels ? (isDark ? 'bg-black translate-x-5' : 'bg-white translate-x-5') : 'bg-white translate-x-0.5'}`} />
                        </button>
                      </div>
                      {/* Grid Lines */}
                      {currentView !== 'pie' && (
                        <div className="flex items-center justify-between">
                          <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Grid Lines</span>
                          <button
                            onClick={() => handleSettingsChange({ ...chartSettings, showGridLines: !chartSettings.showGridLines })}
                            className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${chartSettings.showGridLines ? (isDark ? 'bg-white' : 'bg-gray-900') : isDark ? 'bg-[#444]' : 'bg-gray-300'}`}
                          >
                            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow transform transition-transform ${chartSettings.showGridLines ? (isDark ? 'bg-black translate-x-5' : 'bg-white translate-x-5') : 'bg-white translate-x-0.5'}`} />
                          </button>
                        </div>
                      )}
                      {/* Color Theme */}
                      <div>
                        <span className={`text-xs sm:text-sm font-medium block mb-1.5 sm:mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Color Theme</span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {(['colorful', 'monochrome', 'blue', 'green', 'purple', 'custom'] as const).map(theme => (
                            <button
                              key={theme}
                              onClick={() => handleSettingsChange({
                                ...chartSettings,
                                colorTheme: theme,
                                customColors: theme === 'custom' && !chartSettings.customColors?.length
                                  ? defaultCustomColors
                                  : chartSettings.customColors
                              })}
                              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg transition-colors ${
                                chartSettings.colorTheme === theme
                                  ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                                  : isDark ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </button>
                          ))}
                        </div>
                        {/* Custom Color Picker */}
                        {chartSettings.colorTheme === 'custom' && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2.5">
                              {(chartSettings.customColors || defaultCustomColors).map((color, index) => (
                                <div key={index} className="relative group" data-color-picker>
                                  <button
                                    onClick={() => {
                                      setAddingNewColor(false);
                                      setEditingColorIndex(editingColorIndex === index ? null : index);
                                    }}
                                    className={`w-8 h-8 rounded-lg cursor-pointer transition-all ${
                                      editingColorIndex === index
                                        ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2'
                                        : 'hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    title="Click to change"
                                  />
                                  {/* Remove button */}
                                  {(chartSettings.customColors || defaultCustomColors).length > 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newColors = [...(chartSettings.customColors || defaultCustomColors)];
                                        newColors.splice(index, 1);
                                        handleSettingsChange({ ...chartSettings, customColors: newColors });
                                        if (editingColorIndex === index) setEditingColorIndex(null);
                                      }}
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                  {/* Color Picker Dropdown - fixed position */}
                                  {editingColorIndex === index && (
                                    <div
                                      className={`fixed z-[9999] rounded-xl shadow-2xl p-3 ${
                                        isDark ? 'bg-[#1f1f1f] border border-[#333]' : 'bg-white border border-gray-200'
                                      }`}
                                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className={`text-xs font-medium mb-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Pick a color</div>
                                      <div className="space-y-1.5">
                                        {colorRows.map((row, rowIndex) => (
                                          <div key={rowIndex} className="flex justify-center gap-1.5">
                                            {row.map((paletteColor, pIndex) => (
                                              <button
                                                key={pIndex}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newColors = [...(chartSettings.customColors || defaultCustomColors)];
                                                  newColors[index] = paletteColor;
                                                  handleSettingsChange({ ...chartSettings, customColors: newColors });
                                                  setEditingColorIndex(null);
                                                }}
                                                className={`w-6 h-6 rounded-md cursor-pointer hover:scale-110 transition-transform ${
                                                  color === paletteColor ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                                                }`}
                                                style={{ backgroundColor: paletteColor }}
                                              />
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        onClick={() => setEditingColorIndex(null)}
                                        className={`mt-2 w-full text-xs py-1 border-t ${
                                          isDark ? 'text-gray-400 hover:text-gray-300 border-[#333]' : 'text-gray-500 hover:text-gray-700 border-gray-100'
                                        }`}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {(chartSettings.customColors || defaultCustomColors).length < 8 && (
                                <div className="relative" data-color-picker>
                                  <button
                                    onClick={() => {
                                      setEditingColorIndex(null);
                                      setAddingNewColor(!addingNewColor);
                                    }}
                                    className={`w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
                                      addingNewColor
                                        ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2 border-gray-400'
                                        : isDark ? 'border-[#444] text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-400 hover:border-gray-400'
                                    }`}
                                    title="Add color"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                  {/* Add New Color Picker */}
                                  {addingNewColor && (
                                    <div
                                      className={`fixed z-[9999] rounded-xl shadow-2xl p-3 ${
                                        isDark ? 'bg-[#1f1f1f] border border-[#333]' : 'bg-white border border-gray-200'
                                      }`}
                                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className={`text-xs font-medium mb-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Add a color</div>
                                      <div className="space-y-1.5">
                                        {colorRows.map((row, rowIndex) => (
                                          <div key={rowIndex} className="flex justify-center gap-1.5">
                                            {row.map((paletteColor, pIndex) => (
                                              <button
                                                key={pIndex}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newColors = [...(chartSettings.customColors || defaultCustomColors), paletteColor];
                                                  handleSettingsChange({ ...chartSettings, customColors: newColors });
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
                                        className={`mt-2 w-full text-xs py-1 border-t ${
                                          isDark ? 'text-gray-400 hover:text-gray-300 border-[#333]' : 'text-gray-500 hover:text-gray-700 border-gray-100'
                                        }`}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Legend Position */}
                      <div>
                        <span className={`text-xs sm:text-sm font-medium block mb-1.5 sm:mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Legend</span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {(['top', 'bottom', 'hidden'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => handleSettingsChange({ ...chartSettings, legendPosition: pos })}
                              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg transition-colors ${
                                chartSettings.legendPosition === pos
                                  ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                                  : isDark ? 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {pos.charAt(0).toUpperCase() + pos.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reset Button */}
                      <button
                        onClick={() => handleSettingsChange(defaultChartSettings)}
                        className={`w-full mt-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                          isDark
                            ? 'border-[#333] text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-300'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SQL Panel */}
        {showSql && sqlQuery && (
          <div className={`px-3 sm:px-5 py-2 border-b ${isDark ? 'bg-[#0f0f0f] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
            <pre className={`text-xs font-mono whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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

        {/* Content Area - takes ALL remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentView === "table" ? (
            <FullscreenVirtualTable columns={columns} rows={filteredRows} isDark={isDark} isMobile={isMobile} />
          ) : (
            <div className="w-full h-full p-2 sm:p-4">
              <LargeChart data={filteredRows} columns={columns} chartType={currentView} isDark={isDark} isMobile={isMobile} settings={chartSettings} />
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <FullscreenFilterModal
          columns={columns}
          rows={rows}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          onClose={() => setShowFilterModal(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// Fullscreen Filter Modal Component
function FullscreenFilterModal({
  columns,
  rows,
  filters,
  onFilterChange,
  onClearFilters,
  onClose,
  isDark,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  filters: Record<string, unknown[]>;
  onFilterChange: (column: string, value: unknown) => void;
  onClearFilters: () => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(columns[0] || null);
  const [valueSearch, setValueSearch] = useState("");

  const handleColumnSelect = useCallback((col: string) => {
    setSelectedColumn(col);
    setValueSearch("");
  }, []);

  // Get filtered rows based on current filters
  const filteredRows = useMemo(() => {
    if (Object.keys(filters).length === 0) return rows;
    return rows.filter(row => {
      for (const [col, values] of Object.entries(filters)) {
        if (values && values.length > 0) {
          const rowValue = String(row[col]);
          if (!values.some(v => String(v) === rowValue)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rows, filters]);

  // Get unique values for selected column from filtered rows
  const uniqueValues = useMemo(() => {
    if (!selectedColumn) return [];
    const seen = new Set<string>();
    const values: unknown[] = [];
    for (const row of filteredRows) {
      const val = row[selectedColumn];
      const key = String(val);
      if (!seen.has(key)) {
        seen.add(key);
        values.push(val);
      }
    }
    return values.sort((a, b) => String(a).localeCompare(String(b)));
  }, [filteredRows, selectedColumn]);

  // Filter values by search
  const searchedValues = useMemo(() => {
    if (!valueSearch) return uniqueValues.slice(0, 50);
    const query = valueSearch.toLowerCase();
    return uniqueValues.filter(v => String(v).toLowerCase().includes(query)).slice(0, 50);
  }, [uniqueValues, valueSearch]);

  const activeFilterCount = Object.values(filters).reduce((sum, v) => sum + (v?.length || 0), 0);
  const columnFilters = selectedColumn ? (filters[selectedColumn] || []) : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className={`rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col ${
          isDark ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
        </div>
        {/* Header */}
        <div className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className={`font-medium text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Filter Data</span>
            <span className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({filteredRows.length}/{rows.length})
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {activeFilterCount > 0 && (
              <button onClick={onClearFilters} className={`px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg ${isDark ? 'text-gray-400 hover:bg-[#333]' : 'text-gray-500 hover:bg-gray-100'}`}>
                Clear
              </button>
            )}
            <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Two Column Layout - stacks on mobile */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Column Selector - horizontal scroll on mobile */}
          <div className={`sm:w-48 border-b sm:border-b-0 sm:border-r flex flex-col flex-shrink-0 ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
            <div className={`px-3 py-1.5 sm:py-2 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400 bg-[#0f0f0f]' : 'text-gray-500 bg-gray-50'}`}>
              Select Column
            </div>
            <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto sm:flex-1 pb-1 sm:pb-0">
              {columns.map(col => {
                const colFilterCount = (filters[col] || []).length;
                return (
                  <button
                    key={col}
                    onClick={() => handleColumnSelect(col)}
                    className={`flex-shrink-0 sm:flex-shrink text-left px-3 py-2 text-xs sm:text-sm flex items-center gap-1 sm:justify-between transition-colors whitespace-nowrap sm:whitespace-normal ${
                      selectedColumn === col
                        ? isDark ? 'bg-[#333] text-white sm:border-r-2 border-white' : 'bg-gray-100 text-gray-900 sm:border-r-2 border-gray-900'
                        : isDark ? 'text-gray-300 hover:bg-[#222]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{col}</span>
                    {colFilterCount > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium rounded ${isDark ? 'bg-[#444] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {colFilterCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value Selector */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selectedColumn ? (
              <>
                <div className={`px-3 py-2 border-b ${isDark ? 'border-[#262626]' : 'border-gray-100'}`}>
                  <div className="relative">
                    <svg className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={`Search in "${selectedColumn}"...`}
                      value={valueSearch}
                      onChange={(e) => setValueSearch(e.target.value)}
                      className={`w-full pl-8 sm:pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border outline-none focus:border-gray-400 dark:focus:border-gray-500 ${
                        isDark ? 'border-[#333] bg-[#0a0a0a] text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
                      }`}
                      autoFocus
                    />
                  </div>
                  <div className={`mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {uniqueValues.length} unique • {searchedValues.length} shown
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {searchedValues.length === 0 ? (
                    <div className={`flex items-center justify-center h-32 text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {valueSearch ? "No matching values" : "No values"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {searchedValues.map((value, idx) => {
                        const isActive = columnFilters.some(f => String(f) === String(value));
                        return (
                          <button
                            key={idx}
                            onClick={() => onFilterChange(selectedColumn, value)}
                            className={`text-left px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 ${
                              isActive
                                ? isDark ? 'bg-[#333] text-white ring-1 ring-[#444]' : 'bg-gray-100 text-gray-900 ring-1 ring-gray-300'
                                : isDark ? 'text-gray-300 hover:bg-[#2a2a2a]' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              isActive ? (isDark ? 'border-white bg-white' : 'border-gray-900 bg-gray-900') : isDark ? 'border-[#444]' : 'border-gray-300'
                            }`}>
                              {isActive && <svg className={`w-2 sm:w-2.5 h-2 sm:h-2.5 ${isDark ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            <span className="truncate flex-1">{formatCellValue(value)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={`flex items-center justify-center h-32 sm:h-full text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Select a column
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-3 sm:px-4 py-2.5 sm:py-3 border-t flex items-center justify-between flex-shrink-0 ${isDark ? 'border-[#333] bg-[#0f0f0f]' : 'border-gray-200 bg-gray-50'}`}>
          <span className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{filteredRows.length}</span>/{rows.length} rows
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
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
                link.download = `filtered-data-${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                isDark ? 'border-[#333] text-gray-300 hover:bg-[#222]' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={onClose} className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
