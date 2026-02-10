import React from 'react';

interface Props {
  optimizedCount: number;
  toOptimizeCount: number;
  onOptimizedClick: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const StatsOverview: React.FC<Props> = ({ optimizedCount, toOptimizeCount, onOptimizedClick }) => {
  const optimizedClickable = optimizedCount > 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 px-1">
      {/* Optimerade */}
      <button
        onClick={optimizedClickable ? onOptimizedClick : undefined}
        className={cx(
          'rounded-3xl p-4 text-left transition-all active:scale-[0.99]',
          'bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm hover:bg-white',
          optimizedClickable ? 'cursor-pointer' : 'opacity-70 cursor-default',
        )}
        title={optimizedClickable ? 'Visa optimerade markörer' : 'Inga optimeringar ännu'}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={cx(
              'w-10 h-10 rounded-2xl flex items-center justify-center ring-1',
              optimizedClickable ? 'bg-emerald-50 text-emerald-700 ring-emerald-900/10' : 'bg-slate-50 text-slate-400 ring-slate-900/10',
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>

          {optimizedClickable && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 ring-1 ring-emerald-900/10">
              VISA
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-500">Optimerade</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-slate-900 tracking-tight">{optimizedCount}</span>
            <span className="text-xs font-semibold text-slate-400">st</span>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            {optimizedClickable ? 'Klicka för historik' : 'När du normaliserar värden syns de här'}
          </div>
        </div>
      </button>

      {/* Att optimera */}
      <div
        className={cx(
          'rounded-3xl p-4 text-left transition-all',
          'bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={cx(
              'w-10 h-10 rounded-2xl flex items-center justify-center ring-1',
              toOptimizeCount > 0 ? 'bg-amber-50 text-amber-700 ring-amber-900/10' : 'bg-slate-50 text-slate-400 ring-slate-900/10',
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <span
            className={cx(
              'text-[10px] font-bold px-2.5 py-1 rounded-full ring-1',
              toOptimizeCount > 0 ? 'bg-amber-50 text-amber-900 ring-amber-900/10' : 'bg-slate-50 text-slate-600 ring-slate-900/10',
            )}
          >
            STATUS
          </span>
        </div>

        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-500">Att optimera</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cx('text-3xl font-display font-bold tracking-tight', toOptimizeCount > 0 ? 'text-amber-700' : 'text-slate-400')}>
              {toOptimizeCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">st</span>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            {toOptimizeCount > 0 ? 'Prioritera fokusområden först' : 'Inga avvikelser just nu'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
