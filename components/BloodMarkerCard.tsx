
import React, { useMemo } from 'react';
import { MarkerHistory, Measurement } from '../types';
import {
  clamp,
  computeDelta,
  formatDate,
  formatNumber,
  getStatus,
  getStatusTextColor,
  isWithinRange,
  distanceToRange
} from '../utils';

interface Props {
  data: MarkerHistory;
  onClick: () => void;
  onToggleIgnore?: (e: React.MouseEvent) => void; // New prop
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const MiniHistorySparkline: React.FC<{
  measurements: Measurement[];
  minRef: number;
  maxRef: number;
  className?: string;
  isIgnored?: boolean;
}> = ({ measurements, minRef, maxRef, className, isIgnored }) => {
  // measurements are latest-first in our app. 
  // We take the last N points and reverse them to be chronological (oldest -> newest) for plotting.
  const points = useMemo(() => {
    const N = 12; 
    const slice = measurements.slice(0, N).reverse(); 
    return slice;
  }, [measurements]);

  if (!points.length) return null;

  // --- DYNAMIC DOMAIN CALCULATION (Same strategy as HistoryChart) ---
  const dataVals = points.map(p => p.value);
  
  let activeMin = minRef;
  let activeMax = maxRef;

  // Expand to fit data points
  if (dataVals.length > 0) {
    activeMin = Math.min(activeMin, ...dataVals);
    activeMax = Math.max(activeMax, ...dataVals);
  }

  // Calculate spread and padding
  let spread = activeMax - activeMin;
  
  // Prevent zero-spread bugs
  if (spread <= 0.000001) {
      spread = (Math.abs(activeMax) || 1) * 0.2;
  }

  // Add ~35% padding so lines don't hit the edges hard
  const padding = spread * 0.35;
  
  let domainMin = activeMin - padding;
  let domainMax = activeMax + padding;

  // Clamp bottom at 0 unless data implies negative values
  if (domainMin < 0 && activeMin >= 0) {
      domainMin = 0;
  }
  
  if (domainMin >= domainMax) {
      domainMax = domainMin + 1;
  }

  // --- SVG MAPPING ---
  // Coordinate system: 0,0 is top-left. 100,100 is bottom-right.
  const W = 100;
  const H = 100;
  
  const safeRange = domainMax - domainMin;

  // Function to map a value to Y-coordinate (0 at top, 100 at bottom)
  const getY = (val: number) => {
    // Clamp purely for drawing safety within viewbox, though dynamic domain handles most
    const clamped = clamp(val, domainMin, domainMax);
    const ratio = (clamped - domainMin) / safeRange; 
    return H - (ratio * H); // Invert: Higher value = Lower Y (closer to top)
  };

  const yRefMax = getY(maxRef); // This is visually "higher" (smaller Y value)
  const yRefMin = getY(minRef); // This is visually "lower" (larger Y value)
  
  // Calculate Zone Heights
  // 1. High Danger Zone (Red): From top (0) down to maxRef line
  // Note: If maxRef is above the chart domain, yRefMax is < 0. We clamp render via SVG overflow hidden, but calculation is simple:
  // Since 0 is top, and yRefMax is the line, the rect is from 0 to yRefMax.
  const highZoneHeight = Math.max(0, yRefMax);
  
  // 2. Normal Zone (Green): Between maxRef and minRef
  const normalZoneHeight = Math.max(0, yRefMin - yRefMax);
  
  // 3. Low Danger Zone (Red): From minRef line down to bottom (100)
  const lowZoneHeight = Math.max(0, H - yRefMin);

  // X-coordinates
  const xs = points.length === 1 
    ? [50] 
    : points.map((_, i) => (i / (points.length - 1)) * 100);
    
  const ys = points.map((p) => getY(p.value));

  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(' ');

  // Colors based on ignored state
  const dangerColor = isIgnored ? "#e2e8f0" : "#fee2e2";
  const successColor = isIgnored ? "#f1f5f9" : "#dcfce7";
  const lineColor = isIgnored ? "#94a3b8" : "#475569";
  const dotErrorColor = isIgnored ? "#94a3b8" : "#ef4444";
  const dotNormalColor = isIgnored ? "#64748b" : "#0f172a";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cx("overflow-hidden", className)} 
      preserveAspectRatio="none" 
      aria-label="Trend"
    >
      {/* 1. ZONES (Backgrounds) */}
      
      {/* High Danger Zone */}
      <rect x="0" y="0" width={W} height={highZoneHeight} fill={dangerColor} opacity="0.6" />

      {/* Normal Zone */}
      <rect x="0" y={yRefMax} width={W} height={normalZoneHeight} fill={successColor} opacity="0.7" />

      {/* Low Danger Zone */}
      <rect x="0" y={yRefMin} width={W} height={lowZoneHeight} fill={dangerColor} opacity="0.6" />

      {/* Reference Lines */}
      <line x1="0" y1={yRefMax} x2={W} y2={yRefMax} stroke={isIgnored ? "#cbd5e1" : "#86efac"} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={yRefMin} x2={W} y2={yRefMin} stroke={isIgnored ? "#cbd5e1" : "#86efac"} strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />

      {/* 2. Connection Line */}
      <path 
        d={d} 
        fill="none" 
        stroke={lineColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        vectorEffect="non-scaling-stroke"
      />

      {/* 3. Data Points */}
      {points.map((p, i) => {
        const s = getStatus(p.value, minRef, maxRef);
        const isLatest = i === points.length - 1;
        
        const fill = s === 'normal' ? dotNormalColor : dotErrorColor; 
        const stroke = '#ffffff';
        
        return (
          <g key={`${p.id}-${i}`}>
             <circle 
              cx={xs[i]} 
              cy={ys[i]} 
              r={isLatest ? 1.5 : 1}
              fill={fill} 
              stroke={stroke} 
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke" 
            />
          </g>
        );
      })}
    </svg>
  );
};

const BloodMarkerCard: React.FC<Props> = ({ data, onClick, onToggleIgnore }) => {
  const { name, shortName, unit, latestMeasurement, status, minRef, maxRef, goal, measurements, notes, isIgnored, description, category, hasActivePlan } =
    data;

  const deltaInfo = useMemo(() => computeDelta(measurements), [measurements]);

  if (!latestMeasurement) return null;

  const delta = deltaInfo?.delta;
  const deltaSign = delta == null ? '' : delta > 0 ? '+' : '';
  const deltaUp = delta != null && delta > 0;
  
  // Trend logic for badge color
  let trendColorClass = 'bg-slate-100 text-slate-600'; 
  if (!isIgnored) {
    if (deltaInfo && deltaInfo.prev) {
      const distPrev = distanceToRange(deltaInfo.prev.value, minRef, maxRef);
      const distCurr = distanceToRange(latestMeasurement.value, minRef, maxRef);
      if (distCurr === 0 && distPrev === 0) {
        trendColorClass = 'bg-slate-100 text-slate-600';
      } else if (distCurr < distPrev) {
        trendColorClass = 'bg-emerald-100 text-emerald-700';
      } else if (distCurr > distPrev) {
        trendColorClass = 'bg-rose-100 text-rose-700';
      }
    }
  }

  // Determine styles based on ignore state
  const containerClasses = isIgnored 
    ? "bg-slate-50 opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100" 
    : "bg-white hover:shadow-lg shadow-sm";

  const statusColorClass = isIgnored 
    ? "bg-slate-300" 
    : status === 'normal' 
      ? 'bg-emerald-500' 
      : 'bg-amber-500';

  const valueTextColor = isIgnored
    ? "text-slate-500"
    : getStatusTextColor(status);

  return (
    <div
      onClick={onClick}
      className={cx(
        'group relative w-full text-left rounded-3xl overflow-hidden transition-all ring-1 ring-slate-900/5 cursor-pointer',
        'flex flex-col sm:flex-row h-auto sm:h-52',
        containerClasses
      )}
    >
      {/* Border Indicator on Left */}
      <div className={cx(
        "absolute left-0 top-0 bottom-0 w-1.5 z-10 transition-colors", 
        statusColorClass
      )} />

      {/* Ignore Toggle Button (Top Right Absolute) */}
      {status !== 'normal' && onToggleIgnore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleIgnore(e);
          }}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm ring-1 ring-slate-900/10 text-slate-400 hover:text-slate-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title={isIgnored ? "Sluta ignorera avvikelse" : "Ignorera avvikelse (flytta till botten)"}
        >
          {isIgnored ? (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          )}
        </button>
      )}

      {/* LEFT ZONE: Data & Numbers (35% width on desktop) */}
      <div className={cx(
        "flex flex-col justify-between p-5 sm:p-6 w-full sm:w-[35%] sm:min-w-[220px] z-10 border-b sm:border-b-0 sm:border-r border-slate-100",
        isIgnored ? "bg-slate-50" : "bg-white"
      )}>
        
        {/* Header */}
        <div>
          <div className="flex justify-between items-start">
             <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{shortName}</span>
                  {category && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide truncate max-w-[100px]">
                      {category}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-slate-900 text-lg leading-tight truncate pr-2">
                  {name}
                </h3>
             </div>
             {/* Status Dot for mobile visibility */}
             <div className={cx("sm:hidden w-3 h-3 rounded-full", statusColorClass)} />
          </div>
        </div>

        {/* Main Value */}
        <div className="mt-4 sm:mt-0">
           <div className="flex items-baseline gap-1">
              <span className={cx("text-4xl sm:text-5xl font-bold tracking-tight font-display", valueTextColor)}>
                 {formatNumber(latestMeasurement.value)}
              </span>
              <span className="text-sm font-semibold text-slate-500">{unit}</span>
           </div>
           <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">
              {formatDate(latestMeasurement.date)}
           </div>
        </div>

        {/* Footer / Meta */}
        <div className="mt-4 sm:mt-0 space-y-3">
           {/* Description Preview */}
           {description && (
             <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
               {description}
             </p>
           )}

           <div className="flex flex-wrap gap-2">
              {isIgnored && (
                 <div className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 border border-slate-300 whitespace-nowrap">
                    Ignorerad
                 </div>
              )}
              {hasActivePlan && (
                 <div className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1.5 whitespace-nowrap">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    I plan
                 </div>
              )}
              {delta != null && (
                <div className={cx("text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap", trendColorClass)}>
                   {deltaUp ? '↗' : '↘'} {deltaSign}{formatNumber(delta)}
                </div>
              )}
           </div>
           
           <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-50">
              Ref: {formatNumber(minRef)} – {formatNumber(maxRef)}
              {goal && <span className="ml-1">• Mål aktivt</span>}
           </div>
        </div>
      </div>

      {/* RIGHT ZONE: Graph (Fills remaining space) */}
      <div className="relative flex-1 bg-slate-50/50 min-h-[140px] sm:min-h-auto">
         {/* Inner padding for graph */}
         <div className="absolute inset-0 p-4 sm:p-6">
            <MiniHistorySparkline
              measurements={measurements}
              minRef={minRef}
              maxRef={maxRef}
              isIgnored={isIgnored}
              className="w-full h-full"
            />
         </div>
         
         {/* Subtle overlay label for graph context if needed */}
         <div className="absolute bottom-2 right-4 text-[10px] text-slate-300 font-bold uppercase pointer-events-none">
            Utveckling
         </div>
      </div>

    </div>
  );
};

export default BloodMarkerCard;