
import React, { useMemo } from 'react';
import { MarkerHistory, ActionableTodo } from '../types';

interface Props {
  totalMarkers: number;
  normalCount: number;
  attentionMarkers: MarkerHistory[];
  optimizedCount: number;
  onOptimizedClick: () => void;
  onAttentionClick?: () => void;
  actionableTodos?: ActionableTodo[];
  newOptimizedCount?: number;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number; colorClass: string }> = ({ 
  percentage, 
  size = 120, 
  strokeWidth = 10,
  colorClass
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

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
        <span className="text-3xl font-display font-bold tracking-tight">{percentage}%</span>
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
  onAttentionClick,
  newOptimizedCount = 0
}) => {
  const hasData = totalMarkers > 0;
  
  // Calculate scores
  const healthScore = totalMarkers > 0 ? Math.round((normalCount / totalMarkers) * 100) : 0;
  const isAllOptimal = normalCount === totalMarkers;

  // Group attention markers by category
  const attentionCategories = useMemo(() => {
    const groups: Record<string, number> = {};
    attentionMarkers.forEach(m => {
      const cat = m.category || 'Övrigt';
      groups[cat] = (groups[cat] || 0) + 1;
    });
    // Sort by count desc
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [attentionMarkers]);

  if (!hasData) return null;

  // Dynamic Colors based on score
  const scoreColor = isAllOptimal 
    ? 'text-emerald-500' 
    : healthScore >= 80 
      ? 'text-emerald-500' 
      : healthScore >= 50 
        ? 'text-amber-500' 
        : 'text-rose-500';

  const gradientBg = isAllOptimal
    ? 'radial-gradient(circle at top right, #d1fae5 0%, transparent 60%)' // Emerald-100
    : healthScore >= 80
      ? 'radial-gradient(circle at top right, #d1fae5 0%, transparent 60%)'
      : healthScore >= 50
        ? 'radial-gradient(circle at top right, #fef3c7 0%, transparent 60%)' // Amber-100
        : 'radial-gradient(circle at top right, #ffe4e6 0%, transparent 60%)'; // Rose-100

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-900/5 shadow-sm p-6 sm:p-8">
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-60 pointer-events-none transition-all duration-700"
             style={{ background: gradientBg }} />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          
          {/* LEFT: Score & Main Message */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="shrink-0">
               <CircularProgress percentage={healthScore} size={90} strokeWidth={8} colorClass={scoreColor} />
            </div>
            
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Din optimeringsgrad
                  </h2>
                  {isAllOptimal && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Perfekt</span>}
               </div>
               
               <p className="text-xl sm:text-2xl font-display font-bold text-slate-900 leading-tight">
                 {isAllOptimal 
                   ? "Alla system fungerar optimalt." 
                   : "Du är på god väg mot 100%."}
               </p>
               
               <p className="text-sm text-slate-500 mt-1 font-medium">
                 {isAllOptimal 
                   ? `Baserat på ${totalMarkers} analyserade biomarkörer.`
                   : `${normalCount} av ${totalMarkers} värden är inom referensintervall.`
                 }
               </p>
            </div>
          </div>

          {/* RIGHT: Actionable Insights (Card) or Celebration */}
          <div className="w-full md:w-auto md:max-w-md flex flex-col items-start md:items-end gap-4">
            
            {!isAllOptimal && (
              <button
                onClick={onAttentionClick}
                className="group relative w-full md:w-auto min-w-[220px] text-left transition-all hover:-translate-y-1 outline-none"
              >
                {/* Glow effect behind */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-200 to-rose-200 rounded-3xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
                
                <div className="relative bg-white/80 backdrop-blur-xl rounded-[1.3rem] p-5 ring-1 ring-slate-900/5 shadow-sm group-hover:shadow-md transition-all group-active:scale-[0.98]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Åtgärd krävs
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-display font-bold text-slate-900">
                      {attentionMarkers.length}
                    </span>
                    <span className="text-sm font-medium text-slate-600">avvikelser</span>
                  </div>
                  
                  {/* Mini categories summary */}
                  <div className="mt-3 flex flex-wrap gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                     {attentionCategories.slice(0, 3).map(([cat]) => (
                       <span key={cat} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold border border-slate-200/50">
                         {cat}
                       </span>
                     ))}
                     {attentionCategories.length > 3 && (
                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-md font-bold">+{attentionCategories.length - 3}</span>
                     )}
                  </div>
                </div>
              </button>
            )}

            {/* Milestones Button - Always visible if count > 0 */}
            {optimizedCount > 0 && (
                 <button 
                   onClick={onOptimizedClick}
                   className={cx(
                     "group flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all border self-start md:self-end",
                     newOptimizedCount > 0 
                       ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100 shadow-md" 
                       : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                   )}
                 >
                   <div className={cx(
                     "flex items-center justify-center w-6 h-6 rounded-full text-xs shadow-sm",
                     newOptimizedCount > 0 ? "bg-emerald-500 text-white animate-pulse" : "bg-slate-100 text-amber-500"
                   )}>
                     {newOptimizedCount > 0 ? '+' : '★'}
                   </div>
                   <div className="flex flex-col leading-none text-left">
                     <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                       {newOptimizedCount > 0 ? 'Nya framsteg!' : 'Milstolpar'}
                     </span>
                     <span className="text-sm font-bold">
                       {newOptimizedCount > 0 ? `${newOptimizedCount} optimerade` : `${optimizedCount} st optimerade`}
                     </span>
                   </div>
                 </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
