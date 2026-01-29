import React, { useId, useMemo } from "react";

type TickLabel = {
  text: string;
  x: number;
  y: number;
};

type Direction = "clockwise" | "counterclockwise";

type WarningZone = {
  min: number;
  max: number;
  color: string;
};

interface SquircleGaugeProps {
  currentValue: number;
  min: number;
  max: number;
  unit: string;
  tickLabels?: TickLabel[];
  tickLabelValues?: number[];
  valueStops?: { value: number; position: number }[];
  tickLabelFormatter?: (value: number) => string;
  size?: number;
  className?: string;
  direction?: Direction;
  startAngleDeg?: number;
  sweepAngleDeg?: number;
  showNeedle?: boolean;
  zones?: WarningZone[];
  ticks?: number[];
  tickCount?: number;
  valueFormatter?: (value: number) => string | number;
  accentColor?: string;
  label?: string;
  roundness?: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const colorTransition = "stroke 320ms ease, fill 320ms ease";
const stopTransition = "stop-color 320ms ease, stop-opacity 320ms ease";

// Build a squircle path with configurable start angle and sweep
const buildSquirclePath = (
  size: number,
  inset = 0,
  power = 4,
  steps = 120,
  startAngleDeg = 135,
  sweepAngleDeg = 270,
  direction: Direction = "clockwise"
) => {
  const a = size / 2 - inset;
  const b = size / 2 - inset;
  const cx = size / 2;
  const cy = size / 2;
  const points: string[] = [];
  const startAngle = (startAngleDeg * Math.PI) / 180;
  const sweepAngle = (sweepAngleDeg * Math.PI) / 180;
  const dir = direction === "clockwise" ? 1 : -1;

  for (let i = 0; i <= steps; i += 1) {
    const t = startAngle + dir * (i / steps) * sweepAngle;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const x = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / power) * a + cx;
    const y = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / power) * b + cy;
    points.push(`${x.toFixed(3)} ${y.toFixed(3)}`);
  }

  return `M ${points[0]} L ${points.slice(1).join(" ")}`;
};

const buildClosedSquirclePath = (
  size: number,
  inset = 0,
  power = 4,
  steps = 160
) => {
  return `${buildSquirclePath(size, inset, power, steps, 0, 360, "clockwise")} Z`;
};

// Get point on squircle at a given normalized position (0-1)
const getSquirclePoint = (
  size: number,
  inset: number,
  power: number,
  normalizedPos: number,
  startAngleDeg: number,
  sweepAngleDeg: number,
  direction: Direction
) => {
  const a = size / 2 - inset;
  const b = size / 2 - inset;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = (startAngleDeg * Math.PI) / 180;
  const sweepAngle = (sweepAngleDeg * Math.PI) / 180;
  const dir = direction === "clockwise" ? 1 : -1;
  
  const t = startAngle + dir * normalizedPos * sweepAngle;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const x = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / power) * a + cx;
  const y = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / power) * b + cy;
  
  return { x, y, angle: t };
};

const SquircleGauge: React.FC<SquircleGaugeProps> = ({
  currentValue,
  min,
  max,
  unit,
  tickLabels = [],
  tickLabelValues = [],
  valueStops = [],
  tickLabelFormatter,
  size = 360,
  className = "",
  direction = "clockwise",
  startAngleDeg = 135,
  sweepAngleDeg = 270,
  showNeedle = true,
  zones = [],
  ticks = [],
  tickCount = 9,
  valueFormatter,
  accentColor = "#0080FF",
  label,
  roundness = 0.6,
}) => {
  const gradientId = useId();
  const normalizedRoundness = clamp(roundness, 0, 1);
  const squirclePower = mix(6, 2.2, normalizedRoundness);
  const cornerRadiusPct = mix(22, 42, normalizedRoundness);
  const backgroundClipPath = useMemo(
    () => buildClosedSquirclePath(size, 0, squirclePower, 160),
    [size, squirclePower]
  );
  const valueChars = useMemo(() => {
    const maxChars = Math.max(
      String(Math.round(max)).length,
      String(Math.round(min)).length
    );
    return Math.max(3, maxChars);
  }, [min, max]);

  const sortedStops = useMemo(() => {
    if (valueStops.length < 2) return null;
    return [...valueStops].sort((a, b) => a.value - b.value);
  }, [valueStops]);

  const getNormalized = useMemo(() => {
    return (value: number) => {
      if (max === min) return 0;
      if (!sortedStops) {
        return clamp((value - min) / (max - min), 0, 1);
      }

      const stops = sortedStops;
      const lastIndex = stops.length - 1;

      if (value <= stops[0].value) {
        const next = stops[1];
        const span = next.value - stops[0].value || 1;
        const t = (value - stops[0].value) / span;
        return clamp(stops[0].position + t * (next.position - stops[0].position), 0, 1);
      }

      if (value >= stops[lastIndex].value) {
        const prev = stops[lastIndex - 1];
        const span = stops[lastIndex].value - prev.value || 1;
        const t = (value - prev.value) / span;
        return clamp(prev.position + t * (stops[lastIndex].position - prev.position), 0, 1);
      }

      for (let i = 0; i < lastIndex; i += 1) {
        const a = stops[i];
        const b = stops[i + 1];
        if (value >= a.value && value <= b.value) {
          const span = b.value - a.value || 1;
          const t = (value - a.value) / span;
          return clamp(a.position + t * (b.position - a.position), 0, 1);
        }
      }

      return clamp((value - min) / (max - min), 0, 1);
    };
  }, [sortedStops, min, max]);

  // Use the value directly - parent handles smooth interpolation
  const normalized = useMemo(() => getNormalized(currentValue), [currentValue, getNormalized]);

  // Build paths
  const outerPath = useMemo(
    () => buildSquirclePath(size, 16, squirclePower, 120, startAngleDeg, sweepAngleDeg, direction),
    [size, squirclePower, startAngleDeg, sweepAngleDeg, direction]
  );
  
  const innerPath = useMemo(
    () => buildSquirclePath(size, 48, squirclePower, 120, startAngleDeg, sweepAngleDeg, direction),
    [size, squirclePower, startAngleDeg, sweepAngleDeg, direction]
  );

  // Generate tick marks
  const tickMarks = useMemo(() => {
    const marks: { x1: number; y1: number; x2: number; y2: number; isMajor: boolean; value: number }[] = [];
    const count = ticks.length > 0 ? ticks.length : tickCount;
    
    for (let i = 0; i < count; i++) {
      const normalizedPos = ticks.length > 0 ? getNormalized(ticks[i]) : i / (count - 1);
      const value = ticks.length > 0 ? ticks[i] : min + normalizedPos * (max - min);
      
      const outerPoint = getSquirclePoint(size, 20, squirclePower, normalizedPos, startAngleDeg, sweepAngleDeg, direction);
      const innerPoint = getSquirclePoint(size, 36, squirclePower, normalizedPos, startAngleDeg, sweepAngleDeg, direction);
      
      const isMajor = i % 2 === 0 || ticks.length > 0;
      
      marks.push({
        x1: outerPoint.x,
        y1: outerPoint.y,
        x2: isMajor ? innerPoint.x : mix(outerPoint.x, innerPoint.x, 0.5),
        y2: isMajor ? innerPoint.y : mix(outerPoint.y, innerPoint.y, 0.5),
        isMajor,
        value,
      });
    }
    
    return marks;
  }, [
    size,
    squirclePower,
    startAngleDeg,
    sweepAngleDeg,
    direction,
    ticks,
    tickCount,
    min,
    max,
    getNormalized,
  ]);

  // Generate tick labels - positioned outside the gauge arc
  const generatedTickLabels = useMemo(() => {
    if (tickLabels.length > 0) return tickLabels;
    if (tickLabelValues.length > 0) {
      return tickLabelValues.map((value) => {
        const normalizedPos = getNormalized(value);
        const point = getSquirclePoint(size, -18, squirclePower, normalizedPos, startAngleDeg, sweepAngleDeg, direction);
        return {
          text: tickLabelFormatter ? tickLabelFormatter(value) : Math.round(value).toString(),
          x: (point.x / size) * 100,
          y: (point.y / size) * 100,
        };
      });
    }

    const labels: TickLabel[] = [];
    const count = ticks.length > 0 ? ticks.length : tickCount;
    
    // Only show labels for major ticks (every other tick or specific ticks)
    for (let i = 0; i < count; i += 2) {
      const normalizedPos = ticks.length > 0 ? getNormalized(ticks[i]) : i / (count - 1);
      const value = ticks.length > 0 ? ticks[i] : min + normalizedPos * (max - min);
      // Position labels further outside the arc
      const point = getSquirclePoint(size, -18, squirclePower, normalizedPos, startAngleDeg, sweepAngleDeg, direction);
      
      labels.push({
        text: tickLabelFormatter ? tickLabelFormatter(value) : Math.round(value).toString(),
        x: (point.x / size) * 100,
        y: (point.y / size) * 100,
      });
    }
    
    return labels;
  }, [
    tickLabels,
    tickLabelValues,
    size,
    squirclePower,
    startAngleDeg,
    sweepAngleDeg,
    direction,
    ticks,
    tickCount,
    min,
    max,
    getNormalized,
    tickLabelFormatter,
  ]);

  // Needle position - uses the animated normalized value to follow the arc
  const needlePoint = useMemo(() => {
    return getSquirclePoint(size, 24, squirclePower, normalized, startAngleDeg, sweepAngleDeg, direction);
  }, [size, squirclePower, normalized, startAngleDeg, sweepAngleDeg, direction]);

  // Needle angle for rotation (in degrees)
  const needleAngleDeg = useMemo(() => {
    const dir = direction === "clockwise" ? 1 : -1;
    return startAngleDeg + dir * normalized * sweepAngleDeg;
  }, [normalized, startAngleDeg, sweepAngleDeg, direction]);

  // Calculate zone colors for current value
  const currentZoneColor = useMemo(() => {
    if (zones.length === 0) return accentColor;
    
    for (const zone of zones) {
      if (currentValue >= zone.min && currentValue <= zone.max) {
        return zone.color;
      }
    }
    return accentColor;
  }, [zones, currentValue, accentColor]);

  // Arc dimensions
  const trackWidth = Math.max(6, size * 0.018);
  const activeWidth = Math.max(14, size * 0.038);
  const glowWidth = activeWidth + size * 0.02;

  // Fill calculation
  const maxVisibleFill = 0.9;
  const fillLength = Math.min(normalized, maxVisibleFill);
  const remainder = Math.max(1 - fillLength, 0);
  const fillDashArray = remainder === 0 ? "1 0" : `${fillLength} ${Math.max(remainder, 0.001)}`;
  const dashProps = {
    strokeDasharray: fillDashArray,
    strokeDashoffset: "0",
    pathLength: 1,
  };
  const endCapPos = fillLength;
  const showEndCap = normalized > 0.001;
  const glowCapRadius = glowWidth / 2;
  const activeCapRadius = activeWidth / 2;
  const coreCapRadius = Math.max(3, activeWidth * 0.25) / 2;
  const arcStartPoint = useMemo(
    () => getSquirclePoint(size, 16, squirclePower, 0, startAngleDeg, sweepAngleDeg, direction),
    [size, squirclePower, startAngleDeg, sweepAngleDeg, direction]
  );
  const arcEndPoint = useMemo(
    () => getSquirclePoint(size, 16, squirclePower, endCapPos, startAngleDeg, sweepAngleDeg, direction),
    [size, squirclePower, endCapPos, startAngleDeg, sweepAngleDeg, direction]
  );

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* Glassmorphism background */}
      <div 
        className="absolute inset-0"
        style={{
          clipPath: `path('${backgroundClipPath}')`,
          WebkitClipPath: `path('${backgroundClipPath}')`,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 0 60px rgba(0, 0, 0, 0.4),
            inset 0 0 80px rgba(0, 0, 0, 0.3),
            0 0 100px ${currentZoneColor}15
          `,
        }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          {/* Frame gradient */}
          <linearGradient id={`${gradientId}-frame`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
          </linearGradient>
          
          {/* Core radial gradient */}
          <radialGradient id={`${gradientId}-core`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(20,30,40,0.6)" />
            <stop offset="60%" stopColor="rgba(8,12,16,0.85)" />
            <stop offset="100%" stopColor="rgba(4,6,8,0.95)" />
          </radialGradient>

          {/* Active arc gradient */}
          <linearGradient id={`${gradientId}-active`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={currentZoneColor}
              stopOpacity="0.9"
              style={{ transition: stopTransition }}
            />
            <stop
              offset="100%"
              stopColor={currentZoneColor}
              stopOpacity="0.6"
              style={{ transition: stopTransition }}
            />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soften active arc edge */}
          <filter id={`${gradientId}-soften`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4.2" />
          </filter>

          {/* Needle glow */}
          <filter id={`${gradientId}-needle-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow layer */}
        <path
          d={outerPath}
          fill="none"
          stroke={currentZoneColor}
          strokeOpacity={0.25}
          strokeWidth={glowWidth}
          filter={`url(#${gradientId}-glow)`}
          style={{ transition: `${colorTransition}, stroke-opacity 320ms ease` }}
          {...dashProps}
        />

        {/* Active arc */}
        <path
          d={outerPath}
          fill="none"
          stroke={`url(#${gradientId}-active)`}
          strokeWidth={activeWidth}
          style={{ transition: colorTransition }}
          filter={`url(#${gradientId}-soften)`}
          {...dashProps}
        />

        {/* Bright core */}
        <path
          d={outerPath}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={Math.max(3, activeWidth * 0.25)}
          style={{ transition: "stroke-opacity 320ms ease" }}
          {...dashProps}
        />

        {/* Inner decorative ring */}
        <path 
          d={innerPath} 
          fill="none" 
          stroke="rgba(255,255,255,0.06)" 
          strokeWidth="1" 
        />

        {/* Tick marks */}
        {tickMarks.map((tick, idx) => (
          <line
            key={idx}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isMajor ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)"}
            strokeWidth={tick.isMajor ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Needle */}
        {showNeedle && (
          <g filter={`url(#${gradientId}-needle-glow)`}>
            {/* Needle shadow */}
            <line
              x1={size / 2}
              y1={size / 2}
              x2={needlePoint.x}
              y2={needlePoint.y}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Needle line */}
            <line
              x1={size / 2}
              y1={size / 2}
              x2={needlePoint.x}
              y2={needlePoint.y}
              stroke={currentZoneColor}
              strokeWidth={4}
              strokeLinecap="round"
              style={{ transition: colorTransition }}
            />
            {/* Needle bright core */}
            <line
              x1={size / 2}
              y1={size / 2}
              x2={needlePoint.x}
              y2={needlePoint.y}
              stroke="rgba(255,255,255,0.8)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Needle tip */}
            <circle
              cx={needlePoint.x}
              cy={needlePoint.y}
              r={6}
              fill={currentZoneColor}
              style={{ transition: colorTransition }}
            />
            {/* Center hub */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={12}
              fill="rgba(20,25,30,0.9)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={2}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={5}
              fill={currentZoneColor}
              style={{ transition: colorTransition }}
            />
          </g>
        )}

        {/* Cross-hair guides */}
        <line
          x1={size / 2}
          y1={size * 0.15}
          x2={size / 2}
          y2={size * 0.25}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <line
          x1={size / 2}
          y1={size * 0.75}
          x2={size / 2}
          y2={size * 0.85}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <line
          x1={size * 0.15}
          y1={size / 2}
          x2={size * 0.25}
          y2={size / 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <line
          x1={size * 0.75}
          y1={size / 2}
          x2={size * 0.85}
          y2={size / 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      </svg>

      {/* Inner glass panel */}
      <div 
        className="absolute"
        style={{
          inset: '26%',
          borderRadius: `${cornerRadiusPct}%`,
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      />

      {/* Value display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <p 
          className="font-semibold tracking-tight text-white font-mono-values"
          style={{ 
            fontSize: size * 0.15,
            textShadow: `0 0 20px ${currentZoneColor}40`,
            transition: "text-shadow 320ms ease",
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: "'tnum' 1",
            width: `${valueChars}ch`,
            display: "inline-block",
            textAlign: "center",
          }}
        >
          {valueFormatter ? valueFormatter(currentValue) : Math.round(currentValue)}
        </p>
        <p 
          className="uppercase tracking-[0.3em] text-white/60"
          style={{ 
            fontSize: size * 0.038,
            marginTop: size * 0.02,
          }}
        >
          {unit}
        </p>
        {label && (
          <p 
            className="text-white/40 tracking-wider"
            style={{ 
              fontSize: size * 0.032,
              marginTop: size * 0.015,
            }}
          >
            {label}
          </p>
        )}
      </div>

      {/* Tick labels */}
      {generatedTickLabels.map((tick, idx) => (
        <span
          key={`${tick.text}-${idx}`}
          className="absolute text-white/40 font-medium font-guide"
          style={{
            left: `${tick.x}%`,
            top: `${tick.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: size * 0.04,
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

export default SquircleGauge;
