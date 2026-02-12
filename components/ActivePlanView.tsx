
import React, { useMemo } from 'react';
import { JournalPlan, MarkerHistory, MeasurementTodo, JournalGoal } from '../types';
import { formatDate, formatNumber } from '../utils';
import ActionList from './ActionList';

interface Props {
  plan: JournalPlan | null;
  allMarkers: MarkerHistory[];
  todos: MeasurementTodo[];
  onEdit: () => void;
  onCreate: () => void;
  onViewArchive: () => void;
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Helper to render HTML safely
function Markup({ content }: { content: string }) {
  return (
    <div 
      className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-600 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
}

const GoalCard: React.FC<{ goal: JournalGoal; marker?: MarkerHistory }> = ({ goal, marker }) => {
  if (!marker) return null;
  
  const currentVal = marker.latestMeasurement?.value;
  const isRange = goal.direction === 'range';
  
  let statusText = 'Pågår';
  let statusColor = 'bg-slate-100 text-slate-600';
  let progress = 0;

  // Simple progress logic
  if (currentVal !== undefined) {
      if (isRange) {
          if (currentVal >= goal.targetValue && currentVal <= (goal.targetValueUpper || 0)) {
              statusText = 'Uppnått';
              statusColor = 'bg-emerald-100 text-emerald-800';
              progress = 100;
          } else {
              // Calculate distance to range
              progress = 50; // Arbitrary mid-point if outside
          }
      } else if (goal.direction === 'higher') {
          if (currentVal >= goal.targetValue) {
              statusText = 'Uppnått';
              statusColor = 'bg-emerald-100 text-emerald-800';
              progress = 100;
          } else {
              progress = Math.min(100, Math.max(0, (currentVal / goal.targetValue) * 100));
          }
      } else {
          if (currentVal <= goal.targetValue) {
              statusText = 'Uppnått';
              statusColor = 'bg-emerald-100 text-emerald-800';
              progress = 100;
          } else {
              // Inverse progress for "lower" is hard to calc linearly without a baseline, keeping simple
              progress = 50; 
          }
      }
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
       <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{marker.name}</span>
             <span className={cx("text-[10px] font-bold px-1.5 py-0.5 rounded", statusColor)}>{statusText}</span>
          </div>
          <div className="flex items-baseline gap-1">
             <span className="text-lg font-display font-bold text-slate-900">
                {currentVal !== undefined ? formatNumber(currentVal) : '-'}
             </span>
             <span className="text-xs text-slate-400 font-medium mr-2">nu</span>
             
             <span className="text-sm font-medium text-slate-600">
                Mål: {isRange ? `${goal.targetValue}–${goal.targetValueUpper}` : `${goal.direction === 'higher' ? '>' : '<'} ${goal.targetValue}`}
             </span>
             <span className="text-xs text-slate-400 ml-0.5">{marker.unit}</span>
          </div>
       </div>
       
       {/* Mini Progress Circle or Icon */}
       <div className="shrink-0">
          {progress === 100 ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
          ) : (
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
          )}
       </div>
    </div>
  );
};

const ActivePlanView: React.FC<Props> = ({ 
  plan, 
  allMarkers, 
  todos, 
  onEdit, 
  onCreate, 
  onViewArchive,
  onToggleTodo,
  onDeleteTodo
}) => {
  
  const markerMap = useMemo(() => new Map(allMarkers.map(m => [m.id, m])), [allMarkers]);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
           <span className="text-4xl">🌱</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Du har ingen aktiv plan</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Skapa en plan för att sätta mål för dina biomarkörer och strukturera din optimering.
        </p>
        <div className="flex gap-4">
            <button onClick={onCreate} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-full shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-transform active:scale-95">
                Skapa min plan
            </button>
            <button onClick={onViewArchive} className="px-6 py-3 bg-white text-slate-600 font-bold rounded-full border border-slate-200 hover:bg-slate-50">
                Se arkiv
            </button>
        </div>
      </div>
    );
  }

  const startDate = plan.startDate ? new Date(plan.startDate) : null;
  const targetDate = plan.targetDate ? new Date(plan.targetDate) : null;
  
  // Calculate days left if target date exists
  let daysLeft = null;
  if (targetDate) {
      const diff = targetDate.getTime() - new Date().getTime();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      
      {/* HEADER ACTION BAR */}
      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-slate-900">Din Aktiva Plan</h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full tracking-wide">Pågår</span>
         </div>
         <button 
           onClick={onViewArchive}
           className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
         >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Tidigare planer
         </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
         
         {/* MAIN CONTENT (Left 2/3) */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* 1. PLAN CARD */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden group">
               {/* Edit Button (Floating) */}
               <button 
                 onClick={onEdit}
                 className="absolute top-6 right-6 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all shadow-sm ring-1 ring-slate-900/5"
                 title="Redigera plan"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>

               <div className="mb-6">
                  {startDate && (
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span>{formatDate(plan.startDate!)}</span>
                          <div className="h-px w-4 bg-slate-300" />
                          <span>{plan.targetDate ? formatDate(plan.targetDate) : 'Tillsvidare'}</span>
                          {daysLeft !== null && daysLeft > 0 && (
                              <span className="ml-2 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] normal-case">
                                  {daysLeft} dagar kvar
                              </span>
                          )}
                      </div>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 leading-tight mb-4">
                      {plan.title}
                  </h1>
                  
                  {/* Linked Markers Badges */}
                  {plan.linkedMarkerIds && plan.linkedMarkerIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                          {plan.linkedMarkerIds.map(id => {
                              const m = markerMap.get(id);
                              if(!m) return null;
                              return (
                                  <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold ring-1 ring-slate-900/5">
                                      <span className={cx("w-1.5 h-1.5 rounded-full", m.status === 'normal' ? 'bg-emerald-400' : m.status === 'high' ? 'bg-rose-400' : 'bg-amber-400')} />
                                      {m.name}
                                  </span>
                              )
                          })}
                      </div>
                  )}
               </div>

               <div className="border-t border-slate-100 pt-6">
                   <Markup content={plan.content} />
               </div>
            </div>

            {/* 2. GOALS SECTION */}
            {plan.goals && plan.goals.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">Målsättningar</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {plan.goals.map((goal, idx) => (
                            <GoalCard key={idx} goal={goal} marker={markerMap.get(goal.markerId)} />
                        ))}
                    </div>
                </div>
            )}

         </div>

         {/* SIDEBAR (Right 1/3) */}
         <div className="lg:col-span-1 space-y-6">
             
             {/* ACTIONS CARD */}
             <div className="bg-white rounded-[2rem] p-5 shadow-sm ring-1 ring-slate-900/5 sticky top-24">
                 <div className="flex items-center justify-between mb-4 px-1">
                     <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Åtgärder
                     </h3>
                     <span className="text-xs font-medium text-slate-400">{todos.filter(t => !t.done).length} kvar</span>
                 </div>

                 <ActionList 
                    todos={todos}
                    onToggle={onToggleTodo}
                    onDelete={onDeleteTodo}
                    variant="minimal"
                 />
                 
                 {todos.length === 0 && (
                     <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                         Inga uppgifter tillagda än. <br/>
                         Redigera planen för att lägga till.
                     </div>
                 )}

                 <button 
                    onClick={onEdit} 
                    className="mt-4 w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 border-dashed hover:border-slate-300"
                 >
                    + Lägg till uppgift
                 </button>
             </div>

         </div>

      </div>
    </div>
  );
};

export default ActivePlanView;
