import React, { useMemo } from 'react';
import { HealthStatus } from '../types';
import { clamp, formatNumber } from '../utils';

interface Props {
  value: number;
  minRef: number;
  maxRef: number;
  displayMin: number;
  displayMax: number;
  status: HealthStatus;

  // NEW: goal overlay inside ref bar
  goalMin?: number;
  goalMax?: number;

  minimal?: boolean;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const ReferenceVisualizer: React.FC<Props> = ({
  value,
  minRef,
  maxRef,
  displayMin,
  displayMax,
  status,
  goalMin,
  goalMax,
  minimal = false,
}) => {
  const totalRange = displayMax - displayMin;
  if (!Number.isFinite(totalRange) || totalRange <= 0) return null;

  const parts = useMemo(() => {
    const min = displayMin;
    const max = displayMax;

    const safeRefMin = clamp(minRef, min, max);
    const safeRefMax = clamp(maxRef, min, max);

    const lowWidth = ((safeRefMin - min) / (max - min)) * 100;
    const normalWidth = ((safeRefMax - safeRefMin) / (max - min)) * 100;
    const highWidth = ((max - safeRefMax) / (max - min)) * 100;

    let dot = ((value - min) / (max - min)) * 100;
    dot = clamp(dot, 0, 100);

    // Goal overlay
    const hasGoal =
      Number.isFinite(goalMin) && Number.isFinite(goalMax) && (goalMin as number) < (goalMax as number);

    let goalLeft = 0;
    let goalRight = 0;

    if (hasGoal) {
      goalLeft = clamp((((goalMin as number) - min) / (max - min)) * 100, 0, 100);
      goalRight = clamp((((goalMax as number) - min) / (max - min)) * 100, 0, 100);
      if (goalRight < goalLeft) [goalLeft, goalRight] = [goalRight, goalLeft];
    }

    return {
      lowWidth: clamp(lowWidth, 0, 100),
      normalWidth: clamp(normalWidth, 0, 100),
      highWidth: clamp(highWidth, 0, 100),
      dot,
      safeRefMin,
      safeRefMax,
      hasGoal,
      goalLeft,
      goalRight,
      goalWidth: clamp(goalRight - goalLeft, 0, 100),
    };
  }, [displayMin, displayMax, minRef, maxRef, value, goalMin, goalMax]);

  const dotColor = status === 'normal' ? 'bg-emerald-600' : 'bg-rose-600';

  const barHeight = minimal ? 'h-3' : 'h-5';
  const dotSize = minimal ? 'w-3 h-3' : 'w-4 h-4';
  const showPill = !minimal;

  return (
    <div className={cx('w-full select-none', minimal ? 'mt-4' : 'mt-6')}>
      {/* Labels */}
      {!minimal && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2 px-0.5 font-semibold">
          <span>
            Ref: {formatNumber(minRef)} – {formatNumber(maxRef)}
          </span>

          {parts.hasGoal && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-900 ring-1 ring-indigo-900/10 px-2.5 py-1 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Mål: {formatNumber(goalMin as number)} – {formatNumber(goalMax as number)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Bar */}
      <div
        className={cx(
          'relative flex w-full rounded-full overflow-hidden ring-1 ring-slate-900/10 bg-slate-50',
          barHeight,
        )}
      >
        {/* Base segments: Low | Normal | High */}
        <div
          style={{ width: `${parts.lowWidth}%` }}
          className="h-full bg-rose-100 border-r border-white/50"
        />
        <div
          style={{ width: `${parts.normalWidth}%` }}
          className="h-full bg-emerald-100 border-r border-white/50"
        />
        <div style={{ width: `${parts.highWidth}%` }} className="h-full bg-rose-100" />

        {/* Goal overlay (within the same bar), visually showing distance to goal */}
        {parts.hasGoal && parts.goalWidth > 0 && (
          <>
            {/* Goal band */}
            <div
              className="absolute inset-y-0 bg-indigo-200/70"
              style={{ left: `${parts.goalLeft}%`, width: `${parts.goalWidth}%` }}
            />

            {/* Goal boundary ticks */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/80"
              style={{ left: `calc(${parts.goalLeft}% - 1px)` }}
            />
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/80"
              style={{ left: `calc(${parts.goalRight}% - 1px)` }}
            />
          </>
        )}

        {/* Subtle center line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-900/10 -translate-y-1/2" />

        {/* Dot */}
        <div
          className={cx(
            'absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all duration-500 ease-out',
            dotSize,
            dotColor,
          )}
          style={{ left: `calc(${parts.dot}% - ${minimal ? 6 : 8}px)` }}
        />

        {/* Value pill */}
        {showPill && (
          <div
            className={cx(
              'absolute -top-9 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold',
              'bg-white/90 backdrop-blur-sm ring-1 ring-slate-900/10 shadow-sm text-slate-900',
            )}
            style={{ left: `${parts.dot}%` }}
          >
            {formatNumber(value)}
          </div>
        )}
      </div>

      {/* Legend */}
      {!minimal && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-900/10 px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Under/över ref
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-900/10 px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Inom ref
          </span>
          {parts.hasGoal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-900/10 px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Målintervall
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferenceVisualizer;
