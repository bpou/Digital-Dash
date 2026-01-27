import React, { useId, useMemo } from "react";

type TickLabel = {
  text: string;
  x: number;
  y: number;
};

type ArcSpec = {
  offset: number;
  length: number;
};

interface GaugeProps {
  value: number;
  unit: string;
  tickLabels: TickLabel[];
  arc: ArcSpec;
  size?: number;
  className?: string;
  valueFormatter?: (value: number) => string | number;
}

const buildSquirclePath = (size: number, inset = 0, power = 4, steps = 96) => {
  const a = size / 2 - inset;
  const b = size / 2 - inset;
  const cx = size / 2;
  const cy = size / 2;
  const points: string[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const x = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / power) * a + cx;
    const y = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / power) * b + cy;
    points.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }

  return `M ${points[0]} L ${points.slice(1).join(" ")} Z`;
};

const Gauge: React.FC<GaugeProps> = ({
  value,
  unit,
  tickLabels,
  arc,
  size = 360,
  className = "",
  valueFormatter,
}) => {
  const gradientId = useId();

  const outerPath = useMemo(() => buildSquirclePath(size, 12), [size]);
  const innerPath = useMemo(() => buildSquirclePath(size, 44), [size]);

  const arcDashArray = `${arc.length} ${100 - arc.length}`;
  const arcDashOffset = 100 - arc.offset;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id={`${gradientId}-frame`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.16)" />
          </linearGradient>
          <radialGradient id={`${gradientId}-core`} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(90,140,140,0.16)" />
            <stop offset="70%" stopColor="rgba(12,16,18,0.92)" />
            <stop offset="100%" stopColor="rgba(6,8,10,1)" />
          </radialGradient>
        </defs>

        <path d={outerPath} fill={`url(#${gradientId}-core)`} />
        <path d={outerPath} fill="none" stroke={`url(#${gradientId}-frame)`} strokeWidth="2" />
        <path d={outerPath} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        <path d={innerPath} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        <path
          d={innerPath}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeDasharray="6 6"
        />

        <path
          d={outerPath}
          fill="none"
          stroke="rgba(120,190,190,0.7)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={arcDashArray}
          strokeDashoffset={arcDashOffset}
          pathLength={100}
        />

        <line
          x1={size / 2}
          y1={26}
          x2={size / 2}
          y2={size - 26}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <line
          x1={26}
          y1={size / 2}
          x2={size - 26}
          y2={size / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
      </svg>

      <div className="absolute inset-[22%] rounded-[32%] border border-white/10 bg-white/5" />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p
          className="text-[54px] font-semibold tracking-[0.03em] text-white font-mono-values"
          style={{
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: "'tnum' 1",
            width: "4ch",
            display: "inline-block",
            textAlign: "center",
          }}
        >
          {valueFormatter ? valueFormatter(value) : Math.round(value)}
        </p>
        <p className="mt-2 text-[14px] uppercase tracking-[0.4em] text-white/70">{unit}</p>
      </div>

      {tickLabels.map((tick) => (
        <span
          key={`${tick.text}-${tick.x}-${tick.y}`}
          className="absolute text-[16px] text-white/40 font-guide"
          style={{
            left: `${tick.x}%`,
            top: `${tick.y}%`,
            transform: "translate(-50%, -50%)",
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: "'tnum' 1",
            width: "3ch",
            display: "inline-block",
            textAlign: "center",
          }}
        >
          {tick.text}
        </span>
      ))}
    </div>
  );
};

export default Gauge;
