import { useState, useCallback } from 'react';
import type { RGBAColor } from '@/store/theme';
import { rgbaToCss, rgbaToHex, hexToRgba, presetColors } from '@/store/theme';

interface RGBAColorPickerProps {
  color: RGBAColor;
  onChange: (color: RGBAColor) => void;
  label: string;
  onReset?: () => void;
}

export function RGBAColorPicker({ color, onChange, label, onReset }: RGBAColorPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChannelChange = useCallback((channel: keyof RGBAColor, value: number) => {
    onChange({ ...color, [channel]: value });
  }, [color, onChange]);

  const handleHexChange = useCallback((hex: string) => {
    const newColor = hexToRgba(hex, color.a);
    onChange(newColor);
  }, [color.a, onChange]);

  const handlePresetClick = useCallback((hex: string) => {
    const newColor = hexToRgba(hex, color.a);
    onChange(newColor);
  }, [color.a, onChange]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - Color Preview */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg shadow-inner border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: rgbaToCss(color) }}
        />
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {rgbaToCss(color)}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Color Picker */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Preset Colors */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">预设颜色</p>
            <div className="flex flex-wrap gap-1.5">
              {presetColors.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    rgbaToHex(color).toLowerCase() === preset.value.toLowerCase()
                      ? 'border-gray-900 dark:border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Hex Input */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">HEX 颜色值</p>
            <input
              type="color"
              value={rgbaToHex(color)}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-full h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* RGBA Sliders */}
          <div className="space-y-3">
            {/* Red */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-red-500">R (红)</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{color.r}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={color.r}
                onChange={(e) => handleChannelChange('r', Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(0, ${color.g}, ${color.b}), rgb(255, ${color.g}, ${color.b}))`,
                }}
              />
            </div>

            {/* Green */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-500">G (绿)</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{color.g}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={color.g}
                onChange={(e) => handleChannelChange('g', Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(${color.r}, 0, ${color.b}), rgb(${color.r}, 255, ${color.b}))`,
                }}
              />
            </div>

            {/* Blue */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-blue-500">B (蓝)</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{color.b}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={color.b}
                onChange={(e) => handleChannelChange('b', Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(${color.r}, ${color.g}, 0), rgb(${color.r}, ${color.g}, 255))`,
                }}
              />
            </div>

            {/* Alpha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">A (透明度)</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{Math.round(color.a * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={color.a * 100}
                onChange={(e) => handleChannelChange('a', Number(e.target.value) / 100)}
                className="w-full h-2 bg-gradient-to-r from-transparent to-gray-900 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(${color.r}, ${color.g}, ${color.b}, 0), rgba(${color.r}, ${color.g}, ${color.b}, 1))`,
                }}
              />
            </div>
          </div>

          {/* Reset Button */}
          {onReset && (
            <button
              onClick={onReset}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              重置此颜色
            </button>
          )}
        </div>
      )}
    </div>
  );
}
