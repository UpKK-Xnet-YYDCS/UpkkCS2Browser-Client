interface RGBAChannelSliderProps {
  label: string;
  labelClass: string;
  value: number;
  display: string;
  min: number;
  max: number;
  gradient: string;
  className?: string;
  onChange: (value: number) => void;
}

export function RGBAChannelSlider({
  label,
  labelClass,
  value,
  display,
  min,
  max,
  gradient,
  className = 'w-full h-2 rounded-lg appearance-none cursor-pointer',
  onChange,
}: RGBAChannelSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={labelClass}>{label}</span>
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={className}
        style={{ background: gradient }}
      />
    </div>
  );
}
