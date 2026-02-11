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

const colorThemes: { value: ChartSettings['colorTheme']; label: string }[] = [
  { value: 'colorful', label: 'Colorful' },
  { value: 'monochrome', label: 'Mono' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'custom', label: 'Custom' },
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

export function ChartSettingsDropdown({
  settings,
  onSettingsChange,
  onClose,
  chartType,
}: ChartSettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [addingNewColor, setAddingNewColor] = useState(false);

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

  // Determine which settings to show based on chart type
  const showYAxis = chartType === 'bar' || chartType === 'line' || chartType === 'area';
  const showBarWidth = chartType === 'bar';
  const showDataLabels = chartType !== 'pie';
  const showGridLines = chartType !== 'pie';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 sm:hidden"
        onClick={onClose}
      />
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] shadow-lg overflow-y-auto custom-scrollbar
          inset-x-0 bottom-0 rounded-t-2xl p-4 pb-8 max-h-[75vh]
          sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4 sm:w-72 sm:max-h-[80vh]"
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
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="space-y-4">
          {/* Chart type indicator */}
          <div className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-[#333] sticky top-0 bg-white dark:bg-[#1f1f1f] flex items-center justify-between">
            <span>{chartType} Chart Settings</span>
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Y-Axis Range */}
          {showYAxis && (
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Y-Axis Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Auto"
                  value={settings.yAxisMin === 'auto' ? '' : settings.yAxisMin}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSettingsChange({
                      ...settings,
                      yAxisMin: val === '' ? 'auto' : Number(val) || 0,
                    });
                  }}
                  className="flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2a2a2a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
                />
                <span className="text-gray-400 text-xs sm:text-sm">to</span>
                <input
                  type="text"
                  placeholder="Auto"
                  value={settings.yAxisMax === 'auto' ? '' : settings.yAxisMax}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSettingsChange({
                      ...settings,
                      yAxisMax: val === '' ? 'auto' : Number(val) || 0,
                    });
                  }}
                  className="flex-1 sm:w-24 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2a2a2a] text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-gray-500"
                />
              </div>
            </div>
          )}

          {/* Bar Width */}
          {showBarWidth && (
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">
                Bar Width: {settings.barWidth}%
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={settings.barWidth}
                onChange={(e) => onSettingsChange({ ...settings, barWidth: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-[#333] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
              />
            </div>
          )}

          {/* Data Labels Toggle */}
          {showDataLabels && (
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Data Labels</label>
              <button
                onClick={() => onSettingsChange({ ...settings, showDataLabels: !settings.showDataLabels })}
                className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${
                  settings.showDataLabels ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#444]'
                }`}
              >
                <div
                  className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow-sm transform transition-transform ${
                    settings.showDataLabels ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0.5 bg-white'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Grid Lines Toggle */}
          {showGridLines && (
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Grid Lines</label>
              <button
                onClick={() => onSettingsChange({ ...settings, showGridLines: !settings.showGridLines })}
                className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors ${
                  settings.showGridLines ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#444]'
                }`}
              >
                <div
                  className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full shadow-sm transform transition-transform ${
                    settings.showGridLines ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0.5 bg-white'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Color Theme */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Color Theme</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {colorThemes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => onSettingsChange({
                    ...settings,
                    colorTheme: theme.value,
                    customColors: theme.value === 'custom' && !settings.customColors?.length
                      ? defaultCustomColors
                      : settings.customColors
                  })}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg transition-colors ${
                    settings.colorTheme === theme.value
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            {/* Custom Color Pickers */}
            {settings.colorTheme === 'custom' && (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {(settings.customColors || defaultCustomColors).map((color, index) => (
                  <div key={index} className="relative group" data-color-picker>
                    <button
                      onClick={() => {
                        setAddingNewColor(false);
                        setEditingColorIndex(editingColorIndex === index ? null : index);
                      }}
                      className={`w-8 h-8 rounded-lg cursor-pointer transition-all ${
                        editingColorIndex === index
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f]'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                    {/* Remove button */}
                    {(settings.customColors || defaultCustomColors).length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newColors = [...(settings.customColors || defaultCustomColors)];
                          newColors.splice(index, 1);
                          onSettingsChange({ ...settings, customColors: newColors });
                          if (editingColorIndex === index) setEditingColorIndex(null);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {/* Color Picker Dropdown */}
                    {editingColorIndex === index && (
                      <div
                        className="fixed z-[9999] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-3"
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Pick a color</div>
                        <div className="space-y-1.5">
                          {colorRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center gap-1.5">
                              {row.map((paletteColor, pIndex) => (
                                <button
                                  key={pIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newColors = [...(settings.customColors || defaultCustomColors)];
                                    newColors[index] = paletteColor;
                                    onSettingsChange({ ...settings, customColors: newColors });
                                    setEditingColorIndex(null);
                                  }}
                                  className={`w-6 h-6 rounded-md cursor-pointer hover:scale-110 transition-transform ${
                                    color === paletteColor ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#1f1f1f]' : ''
                                  }`}
                                  style={{ backgroundColor: paletteColor }}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingColorIndex(null)}
                          className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 py-1 border-t border-[#333]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {(settings.customColors || defaultCustomColors).length < 8 && (
                  <div className="relative" data-color-picker>
                    <button
                      onClick={() => {
                        setEditingColorIndex(null);
                        setAddingNewColor(!addingNewColor);
                      }}
                      className={`w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
                        addingNewColor
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f] border-gray-400'
                          : 'border-[#444] text-gray-500 hover:border-gray-400 hover:text-gray-400'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {/* Add New Color Picker */}
                    {addingNewColor && (
                      <div
                        className="fixed z-[9999] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-3"
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 text-center">Add a color</div>
                        <div className="space-y-1.5">
                          {colorRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center gap-1.5">
                              {row.map((paletteColor, pIndex) => (
                                <button
                                  key={pIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newColors = [...(settings.customColors || defaultCustomColors), paletteColor];
                                    onSettingsChange({ ...settings, customColors: newColors });
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
                          className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 py-1 border-t border-[#333]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legend Position */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 block mb-1.5 sm:mb-2">Legend</label>
            <div className="flex gap-1.5 sm:gap-2">
              {(['top', 'bottom', 'hidden'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => onSettingsChange({ ...settings, legendPosition: pos })}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg capitalize transition-colors ${
                    settings.legendPosition === pos
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => onSettingsChange(defaultChartSettings)}
            className="w-full text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-2 border-t border-gray-100 dark:border-[#333] mt-3"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </>
  );
}
