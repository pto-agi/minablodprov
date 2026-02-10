
import React from 'react';
import { MarkerHistory } from '../types';
import { formatNumber, getStatusTextColor } from '../utils';

interface Props {
  totalMarkers: number;
  normalCount: number;
  attentionMarkers: MarkerHistory[];
  optimizedCount: number;
  onOptimizedClick: () => void;
  onAttentionClick?: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({ 
  percentage, 
  size = 120, 
  strokeWidth = 10 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on score
  const colorClass = percentage === 100 
    ? 'text-emerald-500' 
    : percentage >= 80 
      ? 'text-emerald-500' 
      : percentage >= 50 
        ? 'text-amber-500' 
        : 'text-rose-500';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background ring */}
        <circle
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress ring */}
        <circle
          className={cx("transition-all duration-1000 ease-out", colorClass)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
        <span className="text-3xl font-display font-bold">{percentage}%</span>
      </div>
    </div>
  );
};

const StatsOverview: React.FC<Props> = ({ 
  totalMarkers, 
  normalCount, 
  attentionMarkers, 
  optimizedCount,
  onOptimizedClick,
  onAttentionClick
}) => {
  const healthScore = totalMarkers > 0 ? Math.round((normalCount / totalMarkers) * 100) : 0;
  const hasData = totalMarkers > 0;

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {/* CARD 1: Health Score */}
      <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-900/5 flex flex-col justify-between min-h-[220px]">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-emerald-100/50 to-cyan-100/30 rounded-full blur-2xl pointer-events-none" />

         <div>
            <div className="flex items-center justify-between mb-2">
               <h3 className="font-display font-bold text-lg text-slate-900">Hälsopoäng</h3>
               {hasData && (
                 <span className={cx(
                   "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1",
                   healthScore === 100 
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-900/10" 
                    : healthScore >= 80 
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-900/10"
                      : "bg-amber-50 text-amber-800 ring-amber-900/10"
                 )}>
                    {healthScore === 100 ? 'Optimal' : healthScore >= 80 ? 'Bra' : 'Kan förbättras'}
                 </span>
               )}
            </div>
            <p className="text-sm text-slate-500 max-w-[80%]">
               Andel biomarkörer som ligger inom referensintervallet.
            </p>
         </div>

         <div className="flex items-center justify-between mt-6">
            <div className="flex flex-col gap-1">
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spårade värden</div>
               <div className="text-2xl font-bold text-slate-900">{totalMarkers} <span className="text-sm font-medium text-slate-500">st</span></div>
               
               {optimizedCount > 0 && (
                 <button 
                   onClick={onOptimizedClick}
                   className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors bg-emerald-50/50 hover:bg-emerald-50 px-2 py-1.5 rounded-lg w-fit -ml-2"
                 >
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   {optimizedCount} optimerade sedan start
                 </button>
               )}
            </div>

            <div className="mr-2">
               <CircularProgress percentage={hasData ? healthScore : 0} />
            </div>
         </div>
      </div>

      {/* CARD 2: Action Center / Focus Areas */}
      <div 
        onClick={onAttentionClick}
        className={cx(
          "relative overflow-hidden rounded-[2rem] bg-slate-900 text-white p-6 shadow-lg shadow-slate-900/10 flex flex-col min-h-[220px] transition-transform active:scale-[0.99]",
          onAttentionClick ? "cursor-pointer hover:bg-slate-800" : ""
        )}
      >
         {/* Background Decoration */}
         <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
         
         <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-display font-bold text-lg">
                  {attentionMarkers.length > 0 ? 'Kräver fokus' : 'All Systems Go'}
               </h3>
               <div className={cx(
                 "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-white/20",
                 attentionMarkers.length > 0 ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
               )}>
                 {attentionMarkers.length > 0 ? '!' : '✓'}
               </div>
            </div>

            {attentionMarkers.length > 0 ? (
              <>
                <p className="text-slate-300 text-sm mb-4">
                  {attentionMarkers.length} markörer ligger utanför referens. Prioritera dessa för att öka din poäng.
                </p>
                <div className="mt-auto space-y-2">
                  {attentionMarkers.slice(0, 3).map(marker => (
                    <div key={marker.id} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md border border-white/5">
                       <div className="flex items-center gap-2 min-w-0">
                          <span className={cx("w-1.5 h-1.5 rounded-full shrink-0", marker.status === 'high' ? 'bg-amber-400' : 'bg-rose-400')} />
                          <span className="font-semibold text-sm truncate">{marker.name}</span>
                       </div>
                       <div className="text-xs font-mono font-medium text-slate-300">
                          {formatNumber(marker.latestMeasurement?.value)} {marker.unit}
                       </div>
                    </div>
                  ))}
                  {attentionMarkers.length > 3 && (
                    <div className="text-xs text-center text-slate-400 pt-1">
                      + {attentionMarkers.length - 3} till...
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 ring-1 ring-emerald-500/50">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
                 <p className="text-slate-200 font-medium">
                   Alla dina spårade värden ligger inom referens. Grymt jobbat!
                 </p>
                 <p className="text-slate-400 text-xs mt-2">
                   Fortsätt övervaka för att behålla din streak.
                 </p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default StatsOverview;
