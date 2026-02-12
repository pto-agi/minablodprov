
import React, { useMemo } from 'react';
import { MarkerHistory, ActionableTodo, StatsHistoryEntry, MeasurementTodo, BloodMarker } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import ActionList from './ActionList';

interface Props {
  totalMarkers: number;
  normalCount: number;
  attentionMarkers: MarkerHistory[];
  optimizedCount: number;
  coveredAttentionCount: number;
  history: StatsHistoryEntry[];
  onOptimizedClick: () => void;
  onAttentionClick?: () => void;
  actionableTodos?: ActionableTodo[];
  
  // Todo props passed down
  todos: MeasurementTodo[];
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodoTask: (id: string, task: string, date: string | null) => Promise<void>;
  onAddTodo?: (task: string) => Promise<void>; // Optional if we allow quick add here
  onPlanClick?: (id: string) => void;
  onViewAllPlans?: () => void; // New prop for generic plans link
  availableMarkers?: BloodMarker[];
  planTitles?: Record<string, string>;
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
  onAttentionClick,
  todos,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodoTask,
  onPlanClick,
  onViewAllPlans,
  availableMarkers,
  planTitles
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
    const sorted = [...history].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
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
    ? 'radial-gradient(circle at top left, #d1fae5 0%, transparent 50%)' 
    : healthScore >= 80
      ? 'radial-gradient(circle at top left, #d1fae5 0%, transparent 50%)'
      : healthScore >= 50
        ? 'radial-gradient(circle at top left, #fef3c7 0%, transparent 50%)'
        : 'radial-gradient(circle at top left, #ffe4e6 0%, transparent 50%)';

  const gradId = "scoreGradient";

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-900/5 shadow-sm">
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none transition-all duration-700"
             style={{ background: gradientBg, opacity: 0.6 }} />
        
        <div className="relative z-10 grid lg:grid-cols-12 gap-0">
          
          {/* LEFT COLUMN: Stats, Chart & Action Buttons (approx 60-65% width) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-8">
            
            {/* Top Area: Circle & Chart */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="shrink-0">
                   <CircularProgress percentage={healthScore} size={110} strokeWidth={8} colorClass={scoreColor} />
                </div>
                
                <div className="flex-1 w-full text-center sm:text-left">
                   <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Din optimeringsgrad
                      </h2>
                      {isAllOptimal && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Perfekt</span>}
                   </div>
                   
                   <p className="text-xl sm:text-2xl font-display font-bold text-slate-900 leading-tight mb-4">
                    {isAllOptimal 
                      ? "Alla system fungerar optimalt." 
                      : "Du är på god väg mot 100%."}
                   </p>

                   {/* History Chart */}
                   <div className="h-20 w-full max-w-sm mx-auto sm:mx-0 relative">
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
                           Grafen växer fram över tid.
                        </div>
                      )}
                   </div>
                </div>
            </div>

            {/* Bottom Area: Action Buttons (Cards) */}
            <div className="flex flex-col sm:flex-row gap-4">
                {!isAllOptimal && (
                  <button
                    onClick={onAttentionClick}
                    className="group relative flex-1 text-left bg-white/60 hover:bg-white backdrop-blur-sm rounded-2xl p-4 ring-1 ring-slate-900/5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Åtgärd krävs
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-display font-bold text-slate-900">
                          {attentionMarkers.length}
                        </span>
                        <span className="text-sm font-medium text-slate-600">avvikelser</span>
                    </div>
                    {/* Tiny Plan Coverage Bar */}
                    <div className="mt-3 h-1 w-full bg-slate-200/50 rounded-full overflow-hidden">
                        <div 
                           className={cx("h-full rounded-full transition-all", coveragePercent === 100 ? "bg-emerald-500" : "bg-amber-500")}
                           style={{ width: `${coveragePercent}%` }} 
                        />
                    </div>
                  </button>
                )}

                {optimizedCount > 0 && (
                     <button 
                       onClick={onOptimizedClick}
                       className="group flex-1 flex flex-col justify-center text-left bg-white/60 hover:bg-white backdrop-blur-sm rounded-2xl p-4 ring-1 ring-slate-900/5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                     >
                       <div className="flex items-center gap-2 mb-2">
                         <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px]">★</div>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors">
                           Milstolpar
                         </span>
                       </div>
                       <div className="font-bold text-slate-900 text-sm">
                           {optimizedCount} st optimerade
                       </div>
                     </button>
                )}
            </div>
          </div>

          {/* RIGHT COLUMN: Todo List (approx 35-40% width) */}
          <div className="lg:col-span-5 bg-slate-50/50 lg:border-l border-t lg:border-t-0 border-slate-100 p-6 sm:p-8 flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Din åtgärdslista
                   </h3>
                   <span className="text-xs font-semibold bg-white ring-1 ring-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                      {todos.filter(t => !t.done).length}
                   </span>
                </div>
                {onViewAllPlans && (
                   <button 
                     onClick={onViewAllPlans}
                     className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                   >
                      Planeringar &rarr;
                   </button>
                )}
             </div>

             <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-full -mx-2 px-2 pb-2">
                <ActionList 
                  todos={todos}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onUpdateTask={onUpdateTodoTask}
                  onPlanClick={onPlanClick}
                  availableMarkers={availableMarkers}
                  planTitles={planTitles}
                  variant="minimal"
                  hideTags={true} // Hide individual markers to save space
                />
                
                {todos.length === 0 && (
                   <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                      <p>Inga uppgifter än.</p>
                      <p className="mt-1">Lägg till från en plan eller markör.</p>
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
