
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
}> = ({ measurements, minRef, maxRef, displayMin, displayMax }) => {
  // measurements are latest-first in our app
  const points = useMemo(() => {
    const N = 6;
    const slice = measurements.slice(0, N).reverse(); // chronological
    return slice;
  }, [measurements]);

  if (!points.length) return null;

  const W = 100;
  const H = 40;
  const pad = 5;

  const range = displayMax - displayMin;
  const safeRange = Number.isFinite(range) && range > 0 ? range : 1;

  const yOf = (v: number) => {
    const clamped = clamp(v, displayMin, displayMax);
    const ratio = (clamped - displayMin) / safeRange; // 0..1
    return pad + (1 - ratio) * (H - pad * 2);
  };

  const yRefMin = yOf(minRef);
  const yRefMax = yOf(maxRef);
  const refTop = Math.min(yRefMin, yRefMax);
  const refBottom = Math.max(yRefMin, yRefMax);
  // Ensure we have at least 2px height if the range is valid, and clamp to not be negative
  const refHeight = Math.max(refBottom - refTop, minRef < maxRef ? 2 : 0);

  const xs = points.length === 1 ? [W / 2] : points.map((_, i) => (i / (points.length - 1)) * (W - 10) + 5);
  const ys = points.map((p) => yOf(p.value));

  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-24 h-12 sm:w-28 sm:h-14"
      aria-label="Trend"
    >
      {/* base background */}
      <rect x="0" y="0" width={W} height={H} rx="10" fill="#ffffff" />
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="9" fill="#ffe4e6" opacity="0.28" />
      {/* ref band */}
      <rect x="1" y={refTop} width={W - 2} height={refHeight} rx="0" fill="#dcfce7" opacity="0.55" />
      {/* border */}
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" fill="none" stroke="#e2e8f0" />

      {/* line */}
      <path d={d} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* points */}
      {points.map((p, i) => {
        const s = getStatus(p.value, minRef, maxRef);
        const fill = s === 'normal' ? '#0f172a' : '#e11d48';
        const isLatest = i === points.length - 1;
        const r = isLatest ? 4.2 : 3.2;

        return (
          <g key={`${p.id}-${i}`}>
            {p.note ? (
              <circle cx={xs[i]} cy={ys[i]} r={r + 3} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.95" />
            ) : null}
            <circle cx={xs[i]} cy={ys[i]} r={r} fill={fill} stroke="#ffffff" strokeWidth="2" />
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
  const deltaDown = delta != null && delta < 0;

  // SMART TREND LOGIC
  // Determine color based on whether we are moving CLOSER or FURTHER from reference range.
  let trendColorClass = 'bg-slate-50 text-slate-700 ring-slate-900/10'; // Default Neutral

  if (deltaInfo && deltaInfo.prev) {
    const prevVal = deltaInfo.prev.value;
    const currVal = latestMeasurement.value;

    // distanceToRange returns 0 if inside, >0 if outside.
    const distPrev = distanceToRange(prevVal, minRef, maxRef);
    const distCurr = distanceToRange(currVal, minRef, maxRef);

    if (distCurr === 0 && distPrev === 0) {
       // Both are inside range. Fluctuations are normal/neutral.
       trendColorClass = 'bg-slate-50 text-slate-700 ring-slate-900/10';
    } else if (distCurr < distPrev) {
       // We moved closer to the range (Good)
       trendColorClass = 'bg-emerald-50 text-emerald-900 ring-emerald-900/10';
    } else if (distCurr > distPrev) {
       // We moved further from the range (Bad)
       trendColorClass = 'bg-rose-50 text-rose-900 ring-rose-900/10';
    } else {
       // Distance didn't change (rare, or exactly parallel move relative to single boundary)
       // Keep neutral or maybe slightly colored depending on status
       if (distCurr > 0) trendColorClass = 'bg-rose-50 text-rose-900 ring-rose-900/10'; // Still bad
    }
  }

  const hasLatestNote = Boolean(latestMeasurement.note?.trim());
  const markerNotesCount = notes?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className={cx(
        'w-full text-left rounded-3xl p-4 sm:p-5 transition-all active:scale-[0.99]',
        'bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm hover:bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900 text-base sm:text-[17px] font-display leading-snug truncate">
            {name}{' '}
            <span className="font-semibold text-slate-400 text-sm">
              ({shortName})
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-600 font-semibold bg-slate-50 ring-1 ring-slate-900/5 px-2.5 py-1 rounded-full">
              Ref: {formatNumber(minRef)}–{formatNumber(maxRef)} {unit}
            </div>

            {goal && (
              <div
                className={cx(
                  'text-xs font-bold px-2.5 py-1 rounded-full ring-1',
                  goalStatus
                    ? 'bg-emerald-50 text-emerald-900 ring-emerald-900/10'
                    : 'bg-amber-50 text-amber-900 ring-amber-900/10',
                )}
                title={`Mål: ${formatNumber(goal.targetMin)}–${formatNumber(goal.targetMax)} ${unit}`}
              >
                Mål {goalStatus ? '✓' : '•'}
              </div>
            )}

            {(hasLatestNote || markerNotesCount > 0) && (
              <div
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 ring-1 ring-amber-900/10"
                title={
                  hasLatestNote
                    ? 'Senaste mätningen har en anteckning'
                    : `Markören har ${markerNotesCount} anteckningar`
                }
              >
                📝 {hasLatestNote ? 'mätning' : markerNotesCount}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Mini chart (Werlabs-style) */}
          <MiniHistorySparkline
            measurements={measurements}
            minRef={minRef}
            maxRef={maxRef}
            displayMin={displayMin}
            displayMax={displayMax}
          />

          <div className="text-right">
            <div className={cx('text-2xl font-bold font-display', getStatusTextColor(status))}>
              {formatNumber(latestMeasurement.value)}
            </div>

            <div className="mt-1 flex items-center justify-end gap-2">
              {delta != null && (
                <div
                  className={cx(
                    'text-[11px] font-semibold px-2 py-1 rounded-full ring-1',
                    trendColorClass
                  )}
                  title={deltaInfo?.prev ? `Föregående: ${formatNumber(deltaInfo.prev.value)} ${unit}` : ''}
                >
                  {deltaUp ? '↗' : deltaDown ? '↘' : '→'} {deltaSign}
                  {formatNumber(delta, 2)}
                </div>
              )}

              <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                {formatDate(latestMeasurement.date)}
              </div>
            </div>
          </div>

          <div className="text-slate-300 hover:text-slate-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
};

export default BloodMarkerCard;
