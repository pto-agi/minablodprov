
import React, { useMemo } from 'react';
import { MarkerHistory, ActionableTodo, StatsHistoryEntry } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface Props {
  totalMarkers: number;
  normalCount: number;
  attentionMarkers: MarkerHistory[];
  optimizedCount: number;
  coveredAttentionCount: number;
  history: StatsHistoryEntry[]; // NEW
  onOptimizedClick: () => void;
  onAttentionClick?: () => void;
  actionableTodos?: ActionableTodo[];
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
  coveredAttentionCount,
  history,
  onOptimizedClick,
  onAttentionClick
}) => {
  const hasData = totalMarkers > 0;
  
  // Calculate score
  const healthScore = totalMarkers > 0 ? Math.round((normalCount / totalMarkers) * 100) : 0;
  const isAllOptimal = normalCount === totalMarkers;
  const attentionCount = attentionMarkers.length;

  // Plan coverage percentage (0-100)
  const coveragePercent = attentionCount > 0 
    ? Math.round((coveredAttentionCount / attentionCount) * 100) 
    : 100;

  // Prepare chart data (sort chronological)
  const chartData = useMemo(() => {
    // If we have less than 2 points, we might want to fake a start point or just show one
    const sorted = [...history].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    
    // Add current live score as the latest point if it's different or newer than last history
    const lastHistory = sorted[sorted.length - 1];
    const todayStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Formatting for XAxis
    return sorted.map(h => ({
      date: h.log_date,
      score: h.score,
      label: new Date(h.log_date).toLocaleDateString('sv-SE', { month: 'short' })
    }));
  }, [history]);

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

  // Chart gradient ID
  const gradId = "scoreGradient";

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-900/5 shadow-sm p-6 sm:p-8">
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-60 pointer-events-none transition-all duration-700"
             style={{ background: gradientBg }} />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
          
          {/* LEFT: Score & History Chart */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 min-w-0">
            {/* Circle */}
            <div className="shrink-0">
               <CircularProgress percentage={healthScore} size={110} strokeWidth={8} colorClass={scoreColor} />
            </div>
            
            {/* Text & Graph Container */}
            <div className="flex-1 w-full sm:w-auto">
               <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
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
               </div>

               {/* MINI HISTORY CHART */}
               <div className="mt-4 h-24 w-full max-w-sm mx-auto sm:mx-0 relative">
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={healthScore > 80 ? '#10b981' : '#f59e0b'} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={healthScore > 80 ? '#10b981' : '#f59e0b'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(val: number) => [`${val}%`, 'Score']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke={healthScore > 80 ? '#10b981' : '#f59e0b'} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill={`url(#${gradId})`} 
                          animationDuration={1500}
                        />
                        <XAxis 
                          dataKey="label" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          interval="preserveStartEnd"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center sm:justify-start text-xs text-slate-400 italic">
                       Ingen historik än. Grafen växer fram nästa månad.
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* RIGHT: Action Cards */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-4 items-stretch lg:items-end">
            
            {!isAllOptimal && (
              <button
                onClick={onAttentionClick}
                className="group relative flex-1 lg:flex-none lg:w-72 text-left transition-all hover:-translate-y-1 outline-none"
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
                  
                  {/* Plan Coverage Progress */}
                  <div className="mt-4 pt-3 border-t border-slate-200/50">
                     <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                           Planering
                        </span>
                        <span className="text-[10px] font-bold text-slate-700">
                           {coveredAttentionCount} av {attentionCount}
                        </span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                           className={cx(
                             "h-full rounded-full transition-all duration-1000",
                             coveragePercent === 100 ? "bg-emerald-500" : "bg-amber-500"
                           )}
                           style={{ width: `${coveragePercent}%` }} 
                        />
                     </div>
                  </div>
                </div>
              </button>
            )}

            {/* Milestones Button - Static Style (No Notification) */}
            {optimizedCount > 0 && (
                 <button 
                   onClick={onOptimizedClick}
                   className="group flex items-center gap-2 px-4 py-3 rounded-2xl transition-all border lg:w-72 bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                 >
                   <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs shadow-sm shrink-0 bg-slate-100 text-amber-500">
                     ★
                   </div>
                   <div className="flex flex-col leading-none text-left">
                     <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                       Milstolpar
                     </span>
                     <span className="text-sm font-bold">
                       {optimizedCount} st optimerade
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
