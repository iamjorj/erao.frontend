"use client";

import { useState, useRef, useEffect } from "react";
import { ChartSettings, defaultChartSettings } from "./DataChart";
import type { ChartType } from "./DataChart";

export interface ChartSettingsDropdownProps {
  settings: ChartSettings;
  onSettingsChange: (settings: ChartSettings) => void;
  onClose: () => void;
  chartType: ChartType;
}

const colorThemes: { value: ChartSettings['colorTheme']; label: string; colors: string[] }[] = [
  { value: 'colorful', label: 'Colorful', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] },
  { value: 'monochrome', label: 'Mono', colors: ['#1f2937', '#4b5563', '#9ca3af', '#d1d5db'] },
  { value: 'blue', label: 'Blue', colors: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'] },
  { value: 'green', label: 'Green', colors: ['#065f46', '#10b981', '#34d399', '#6ee7b7'] },
  { value: 'purple', label: 'Purple', colors: ['#5b21b6', '#8b5cf6', '#a78bfa', '#c4b5fd'] },
];

const defaultCustomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const colorRows = [
  ['#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db'],
  ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  ['#14532d', '#047857', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
  ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fecaca'],
  ['#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fef3c7'],
  ['#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'],
];

// Toggle switch component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-200 dark:bg-[#3a3a3a]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm ${
          enabled
            ? 'left-[18px] bg-white dark:bg-[#1a1a1a]'
            : 'left-0.5 bg-white dark:bg-[#666]'
        }`}
      />
    </button>
  );
}

export function ChartSettingsDropdown({
  settings,
  onSettingsChange,
  onClose,
  chartType,
}: ChartSettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [addingNewColor, setAddingNewColor] = useState(false);
  const [showCustom, setShowCustom] = useState(settings.colorTheme === 'custom');

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingColorIndex !== null || addingNewColor) {
          setEditingColorIndex(null);
          setAddingNewColor(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, editingColorIndex, addingNewColor]);

  const showYAxis = chartType === 'bar' || chartType === 'line' || chartType === 'area';
  const showBarWidth = chartType === 'bar';
  const showDataLabels = chartType !== 'pie';
  const showGridLines = chartType !== 'pie';

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 sm:hidden" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] shadow-xl overflow-y-auto overflow-x-hidden custom-scrollbar
          inset-x-0 bottom-0 rounded-t-2xl p-5 pb-8 max-h-[75vh]
          sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:pb-5 sm:w-[280px] sm:max-h-[80vh]"
        onClick={(e) => {
          e.stopPropagation();
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
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-8 h-1 bg-gray-200 dark:bg-[#333] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{chartType} Settings</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Y-Axis Range */}
          {showYAxis && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Y-Axis Range</label>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  placeholder="Auto"
                  value={settings.yAxisMin === 'auto' ? '' : settings.yAxisMin}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSettingsChange({ ...settings, yAxisMin: val === '' ? 'auto' : Number(val) || 0 });
                  }}
                  className="flex-1 min-w-0 h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#222] text-gray-800 dark:text-gray-200 outline-none focus:border-gray-300 dark:focus:border-[#444] placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors"
                />
                <span className="text-gray-300 dark:text-gray-600 text-[10px] shrink-0">—</span>
                <input
                  type="text"
                  placeholder="Auto"
                  value={settings.yAxisMax === 'auto' ? '' : settings.yAxisMax}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSettingsChange({ ...settings, yAxisMax: val === '' ? 'auto' : Number(val) || 0 });
                  }}
                  className="flex-1 min-w-0 h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#222] text-gray-800 dark:text-gray-200 outline-none focus:border-gray-300 dark:focus:border-[#444] placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Bar Width */}
          {showBarWidth && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bar Width</label>
                <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{settings.barWidth}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.barWidth}
                onChange={(e) => onSettingsChange({ ...settings, barWidth: Number(e.target.value) })}
                className="chart-slider"
              />
            </div>
          )}

          {/* Toggles */}
          {(showDataLabels || showGridLines) && (
            <div className="space-y-3">
              {showDataLabels && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600 dark:text-gray-300">Data Labels</label>
                  <Toggle enabled={settings.showDataLabels} onChange={() => onSettingsChange({ ...settings, showDataLabels: !settings.showDataLabels })} />
                </div>
              )}
              {showGridLines && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600 dark:text-gray-300">Grid Lines</label>
                  <Toggle enabled={settings.showGridLines} onChange={() => onSettingsChange({ ...settings, showGridLines: !settings.showGridLines })} />
                </div>
              )}
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-gray-100 dark:border-[#2a2a2a]" />

          {/* Color Theme */}
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">Colors</label>
            <div className="space-y-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => {
                    onSettingsChange({ ...settings, colorTheme: theme.value });
                    setShowCustom(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    settings.colorTheme === theme.value && !showCustom
                      ? 'bg-gray-100 dark:bg-[#222] ring-1 ring-gray-200 dark:ring-[#333]'
                      : 'hover:bg-gray-50 dark:hover:bg-[#222]'
                  }`}
                >
                  <div className="flex gap-0.5">
                    {theme.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">{theme.label}</span>
                  {settings.colorTheme === theme.value && !showCustom && (
                    <svg className="w-3.5 h-3.5 ml-auto text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}

              {/* Custom option */}
              <button
                onClick={() => {
                  setShowCustom(true);
                  onSettingsChange({
                    ...settings,
                    colorTheme: 'custom',
                    customColors: settings.customColors?.length ? settings.customColors : defaultCustomColors
                  });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                  showCustom
                    ? 'bg-gray-100 dark:bg-[#222] ring-1 ring-gray-200 dark:ring-[#333]'
                    : 'hover:bg-gray-50 dark:hover:bg-[#222]'
                }`}
              >
                <div className="flex gap-0.5">
                  {(settings.customColors || defaultCustomColors).slice(0, 4).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300">Custom</span>
                {showCustom && (
                  <svg className="w-3.5 h-3.5 ml-auto text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Custom Color Pickers */}
            {showCustom && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
                <div className="flex flex-wrap gap-2">
                  {(settings.customColors || defaultCustomColors).map((color, index) => (
                    <div key={index} className="relative group" data-color-picker>
                      <button
                        onClick={() => { setAddingNewColor(false); setEditingColorIndex(editingColorIndex === index ? null : index); }}
                        className={`w-7 h-7 rounded-lg transition-all ${
                          editingColorIndex === index ? 'ring-2 ring-gray-400 dark:ring-gray-500 ring-offset-2 ring-offset-white dark:ring-offset-[#1a1a1a]' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                      {(settings.customColors || defaultCustomColors).length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newColors = [...(settings.customColors || defaultCustomColors)];
                            newColors.splice(index, 1);
                            onSettingsChange({ ...settings, customColors: newColors });
                            if (editingColorIndex === index) setEditingColorIndex(null);
                          }}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                      {editingColorIndex === index && (
                        <div
                          className="fixed z-[9999] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-2xl shadow-2xl p-3.5"
                          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1.5">
                            {colorRows.map((row, ri) => (
                              <div key={ri} className="flex justify-center gap-1.5">
                                {row.map((pc, pi) => (
                                  <button
                                    key={pi}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newColors = [...(settings.customColors || defaultCustomColors)];
                                      newColors[index] = pc;
                                      onSettingsChange({ ...settings, customColors: newColors });
                                      setEditingColorIndex(null);
                                    }}
                                    className={`w-6 h-6 rounded-lg cursor-pointer hover:scale-110 transition-transform ${color === pc ? 'ring-2 ring-gray-400 ring-offset-1 ring-offset-white dark:ring-offset-[#1a1a1a]' : ''}`}
                                    style={{ backgroundColor: pc }}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(settings.customColors || defaultCustomColors).length < 8 && (
                    <div className="relative" data-color-picker>
                      <button
                        onClick={() => { setEditingColorIndex(null); setAddingNewColor(!addingNewColor); }}
                        className="w-7 h-7 rounded-lg border border-dashed border-gray-300 dark:border-[#444] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                      {addingNewColor && (
                        <div
                          className="fixed z-[9999] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-2xl shadow-2xl p-3.5"
                          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1.5">
                            {colorRows.map((row, ri) => (
                              <div key={ri} className="flex justify-center gap-1.5">
                                {row.map((pc, pi) => (
                                  <button
                                    key={pi}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSettingsChange({ ...settings, customColors: [...(settings.customColors || defaultCustomColors), pc] });
                                      setAddingNewColor(false);
                                    }}
                                    className="w-6 h-6 rounded-lg cursor-pointer hover:scale-110 transition-transform"
                                    style={{ backgroundColor: pc }}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
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
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Legend</label>
            <div className="flex gap-1.5">
              {(['top', 'bottom', 'hidden'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => onSettingsChange({ ...settings, legendPosition: pos })}
                  className={`flex-1 py-1.5 text-[11px] rounded-lg capitalize transition-all ${
                    settings.legendPosition === pos
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium'
                      : 'bg-gray-50 dark:bg-[#222] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => { onSettingsChange(defaultChartSettings); setShowCustom(false); }}
            className="w-full text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-2 border-t border-gray-100 dark:border-[#2a2a2a] transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </>
  );
}
