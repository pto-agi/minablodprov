
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
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const MiniHistorySparkline: React.FC<{
  measurements: Measurement[];
  minRef: number;
  maxRef: number;
  displayMin: number;
  displayMax: number;
  className?: string;
}> = ({ measurements, minRef, maxRef, displayMin, displayMax, className }) => {
  // measurements are latest-first in our app
  const points = useMemo(() => {
    const N = 12; // Show more points now that we have space
    const slice = measurements.slice(0, N).reverse(); // chronological
    return slice;
  }, [measurements]);

  if (!points.length) return null;

  // Internal coordinate system
  const W = 100; // % width conceptually
  const H = 100; // % height conceptually
  
  // We use a relative mapping. 
  // SVG coordinate system: 0,0 is top-left.
  
  const range = displayMax - displayMin;
  const safeRange = Number.isFinite(range) && range > 0 ? range : 1;

  const yOf = (v: number) => {
    const clamped = clamp(v, displayMin, displayMax);
    const ratio = (clamped - displayMin) / safeRange; // 0..1 (0 = bottom, 1 = top)
    return H - (ratio * H); // Invert for SVG (0 at top)
  };

  const yRefMin = yOf(minRef);
  const yRefMax = yOf(maxRef);
  
  // Draw zones
  // High Zone: From top (0) to yRefMax
  const highZoneHeight = yRefMax;
  
  // Normal Zone: From yRefMax to yRefMin
  const normalZoneHeight = yRefMin - yRefMax;
  
  // Low Zone: From yRefMin to bottom (H)
  const lowZoneHeight = H - yRefMin;

  const xs = points.length === 1 
    ? [50] 
    : points.map((_, i) => (i / (points.length - 1)) * 100);
    
  const ys = points.map((p) => yOf(p.value));

  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cx("overflow-hidden", className)} 
      preserveAspectRatio="none" 
      aria-label="Trend"
    >
      <defs>
        {/* Gradients or Patterns could go here */}
      </defs>

      {/* 1. ZONES (Backgrounds) */}
      
      {/* High Danger Zone (Red) */}
      <rect x="0" y="0" width={W} height={highZoneHeight} fill="#fee2e2" opacity="0.6" />

      {/* Normal Zone (Green) */}
      <rect x="0" y={yRefMax} width={W} height={normalZoneHeight} fill="#dcfce7" opacity="0.7" />

      {/* Low Danger Zone (Red) */}
      <rect x="0" y={yRefMin} width={W} height={lowZoneHeight} fill="#fee2e2" opacity="0.6" />

      {/* Reference Lines */}
      <line x1="0" y1={yRefMax} x2={W} y2={yRefMax} stroke="#86efac" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={yRefMin} x2={W} y2={yRefMin} stroke="#86efac" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />

      {/* 2. Connection Line */}
      <path 
        d={d} 
        fill="none" 
        stroke="#475569" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        vectorEffect="non-scaling-stroke"
      />

      {/* 3. Data Points */}
      {points.map((p, i) => {
        const s = getStatus(p.value, minRef, maxRef);
        const isLatest = i === points.length - 1;
        
        // Colors
        const fill = s === 'normal' ? '#0f172a' : '#ef4444'; 
        const stroke = '#ffffff';
        
        // We render dots as separate SVG circles. 
        // Note: scaling circles in a stretched SVG distorts them. 
        // To fix this perfectly requires complex CSS/SVG tricks. 
        // For now, we accept slight distortion or use a small radius that looks okay.
        // Or better: Use vector-effect="non-scaling-stroke" on the circle stroke? No, that doesn't fix shape.
        // We will make them small enough that it doesn't matter too much.
        
        return (
          <g key={`${p.id}-${i}`}>
             <circle 
              cx={xs[i]} 
              cy={ys[i]} 
              r={isLatest ? 1.5 : 1} // Relative radius (since viewBox is 0-100)
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

const BloodMarkerCard: React.FC<Props> = ({ data, onClick }) => {
  const { name, shortName, unit, latestMeasurement, status, minRef, maxRef, goal, measurements, notes, displayMin, displayMax } =
    data;

  const deltaInfo = useMemo(() => computeDelta(measurements), [measurements]);

  if (!latestMeasurement) return null;

  const goalStatus =
    goal && Number.isFinite(goal.targetMin) && Number.isFinite(goal.targetMax)
      ? isWithinRange(latestMeasurement.value, goal.targetMin, goal.targetMax)
      : null;

  const delta = deltaInfo?.delta;
  const deltaSign = delta == null ? '' : delta > 0 ? '+' : '';
  const deltaUp = delta != null && delta > 0;
  
  // Trend logic for badge color
  let trendColorClass = 'bg-slate-100 text-slate-600'; 
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

  const hasLatestNote = Boolean(latestMeasurement.note?.trim());
  const markerNotesCount = notes?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className={cx(
        'group relative w-full text-left rounded-3xl overflow-hidden transition-all hover:shadow-lg shadow-sm bg-white ring-1 ring-slate-900/5',
        'flex flex-col sm:flex-row h-auto sm:h-52' // Fixed height on desktop for uniform grid
      )}
    >
      {/* Border Indicator on Left based on Status */}
      <div className={cx(
        "absolute left-0 top-0 bottom-0 w-1.5 z-10", 
        status === 'normal' ? 'bg-emerald-500' : 'bg-amber-500'
      )} />

      {/* LEFT ZONE: Data & Numbers (35% width on desktop) */}
      <div className="flex flex-col justify-between p-5 sm:p-6 w-full sm:w-[35%] sm:min-w-[220px] bg-white border-b sm:border-b-0 sm:border-r border-slate-100 z-10">
        
        {/* Header */}
        <div>
          <div className="flex justify-between items-start">
             <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{shortName}</span>
                <h3 className="font-display font-bold text-slate-900 text-lg leading-tight truncate pr-2">
                  {name}
                </h3>
             </div>
             {/* Status Dot for mobile visibility */}
             <div className={cx("sm:hidden w-3 h-3 rounded-full", status === 'normal' ? 'bg-emerald-500' : 'bg-amber-500')} />
          </div>
        </div>

        {/* Main Value */}
        <div className="mt-4 sm:mt-0">
           <div className="flex items-baseline gap-1">
              <span className={cx("text-4xl sm:text-5xl font-bold tracking-tight font-display", getStatusTextColor(status))}>
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
           <div className="flex flex-wrap gap-2">
              {delta != null && (
                <div className={cx("text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1", trendColorClass)}>
                   {deltaUp ? '↗' : '↘'} {deltaSign}{formatNumber(delta)}
                </div>
              )}
              {(hasLatestNote || markerNotesCount > 0) && (
                 <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                    📝 Not
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
              displayMin={displayMin}
              displayMax={displayMax}
              className="w-full h-full"
            />
         </div>
         
         {/* Subtle overlay label for graph context if needed */}
         <div className="absolute bottom-2 right-4 text-[10px] text-slate-300 font-bold uppercase pointer-events-none">
            Utveckling
         </div>
      </div>

    </button>
  );
};

export default BloodMarkerCard;
