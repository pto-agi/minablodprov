
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { JournalPlan, MarkerHistory, MeasurementTodo, JournalGoal } from '../types';
import { formatDate, formatNumber } from '../utils';
import ActionList from './ActionList';

interface Props {
  plan: JournalPlan | null;
  allMarkers: MarkerHistory[];
  todos: MeasurementTodo[];
  initialEditMode?: boolean; // Prop to start in edit mode immediately
  onEdit?: () => void; // Deprecated/repurposed to trigger internal edit mode
  onCreate: () => void;
  onViewArchive: () => void;
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: (task: string, journalId: string) => Promise<void>;
  onUpdateTodoTask: (id: string, task: string, date: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSave: (
    title: string,
    content: string,
    markerIds: string[],
    startDate: string | undefined,
    targetDate: string | undefined,
    goals: JournalGoal[]
  ) => Promise<string>;
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

const todayLocalISO = () => new Date().toLocaleDateString('en-CA');

function sanitizeHtmlUnsafe(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button', 'textarea', 'select', 'option', 'svg'];
    for (const tag of blockedTags) {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    }
    return doc.body.innerHTML;
  } catch {
    return String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }
}

function normalizeOptionalDate(v: string): string | undefined {
  const t = (v || '').trim();
  return t ? t : undefined;
}

const ToolbarBtn: React.FC<{ onClick: () => void; icon: string; label: string }> = ({ onClick, icon, label }) => (
  <button onMouseDown={e => { e.preventDefault(); onClick(); }} className="p-1 min-w-[24px] h-6 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 font-bold text-xs flex items-center justify-center transition-colors" title={label} type="button">
    {icon}
  </button>
);

const GoalCard: React.FC<{ goal: JournalGoal; marker?: MarkerHistory; isEditing?: boolean; onDelete?: () => void }> = ({ goal, marker, isEditing, onDelete }) => {
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
              progress = 50; 
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
              progress = 50; 
          }
      }
  }

  return (
    <div className={cx(
        "bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between gap-4 transition-all",
        isEditing ? "border-dashed border-slate-300" : "border-slate-100"
    )}>
       <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{marker.name}</span>
             {!isEditing && <span className={cx("text-[10px] font-bold px-1.5 py-0.5 rounded", statusColor)}>{statusText}</span>}
          </div>
          <div className="flex items-baseline gap-1">
             {!isEditing && (
                 <>
                    <span className="text-lg font-display font-bold text-slate-900">
                        {currentVal !== undefined ? formatNumber(currentVal) : '-'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium mr-2">nu</span>
                 </>
             )}
             
             <span className="text-sm font-medium text-slate-600">
                Mål: {isRange ? `${goal.targetValue}–${goal.targetValueUpper}` : `${goal.direction === 'higher' ? '>' : '<'} ${goal.targetValue}`}
             </span>
             <span className="text-xs text-slate-400 ml-0.5">{marker.unit}</span>
          </div>
       </div>
       
       {/* Mini Progress Circle or Delete Action */}
       <div className="shrink-0">
          {isEditing ? (
              <button onClick={onDelete} className="p-2 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          ) : progress === 100 ? (
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
  initialEditMode = false,
  onCreate, 
  onViewArchive,
  onToggleTodo,
  onDeleteTodo,
  onAddTodo,
  onUpdateTodoTask,
  onSave,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerSearch, setMarkerSearch] = useState('');

  // Editing State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [markerIds, setMarkerIds] = useState<string[]>([]);
  const [goals, setGoals] = useState<JournalGoal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Goal Input State
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [newGoalMarkerId, setNewGoalMarkerId] = useState('');
  const [newGoalDirection, setNewGoalDirection] = useState<'higher' | 'lower' | 'range'>('higher');
  const [newGoalValue, setNewGoalValue] = useState('');
  const [newGoalValueUpper, setNewGoalValueUpper] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const markerMap = useMemo(() => new Map(allMarkers.map(m => [m.id, m])), [allMarkers]);

  // Sync internal state when plan changes or edit mode toggles
  useEffect(() => {
      if(plan) {
          setTitle(plan.title || '');
          setStartDate(plan.startDate || todayLocalISO());
          setTargetDate(plan.targetDate || '');
          setMarkerIds(plan.linkedMarkerIds || []);
          setGoals(plan.goals || []);
          // Reset content
          if (contentRef.current) {
              contentRef.current.innerHTML = sanitizeHtmlUnsafe(plan.content || '');
          }
      }
  }, [plan, isEditing]);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  const handleSave = async () => {
      if (!title.trim()) return alert("Ange en rubrik.");
      
      setIsSaving(true);
      try {
          const content = contentRef.current ? sanitizeHtmlUnsafe(contentRef.current.innerHTML) : '';
          await onSave(
              title,
              content,
              markerIds,
              normalizeOptionalDate(startDate),
              normalizeOptionalDate(targetDate),
              goals
          );
          setIsEditing(false);
      } catch(e) {
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleCancel = () => {
      if (initialEditMode && (!plan || plan.id === 'temp-new')) {
          onViewArchive(); // Go back if cancelling creation
      } else {
          setIsEditing(false);
      }
  };

  const toggleMarker = (id: string) => {
      setMarkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddGoal = () => {
      if (!newGoalMarkerId || !newGoalValue) return;
      const val = parseFloat(newGoalValue.replace(',', '.'));
      if (isNaN(val)) return;
      
      const newGoal: JournalGoal = {
          markerId: newGoalMarkerId,
          direction: newGoalDirection,
          targetValue: val
      };

      if (newGoalDirection === 'range') {
          const up = parseFloat(newGoalValueUpper.replace(',', '.'));
          if (isNaN(up)) return;
          newGoal.targetValueUpper = up;
      }

      setGoals(prev => [...prev, newGoal]);
      
      // Auto-add marker linkage if missing
      if (!markerIds.includes(newGoalMarkerId)) {
          setMarkerIds(prev => [...prev, newGoalMarkerId]);
      }

      setShowGoalInput(false);
      setNewGoalMarkerId('');
      setNewGoalValue('');
      setNewGoalValueUpper('');
  };

  const removeGoal = (idx: number) => {
      setGoals(prev => prev.filter((_, i) => i !== idx));
  };

  const filteredMarkers = useMemo(() => {
      const q = markerSearch.toLowerCase();
      return allMarkers.filter(m => 
          m.name.toLowerCase().includes(q) || m.shortName.toLowerCase().includes(q)
      );
  }, [allMarkers, markerSearch]);

  // Identify markers that are out of ref BUT NOT in the plan
  const unhandledMarkers = useMemo(() => {
      return allMarkers.filter(m => 
          m.status !== 'normal' && 
          !m.isIgnored && 
          !markerIds.includes(m.id)
      );
  }, [allMarkers, markerIds]);

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

  // Calculate days left
  let daysLeft = null;
  const targetDateObj = plan.targetDate ? new Date(plan.targetDate) : null;
  if (targetDateObj) {
      const diff = targetDateObj.getTime() - new Date().getTime();
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
         <div className="flex items-center gap-3">
            {!isEditing && (
                <button 
                onClick={onViewArchive}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Tidigare planer
                </button>
            )}
            {isEditing && (
                <>
                    <button onClick={handleCancel} disabled={isSaving} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5">
                        Avbryt
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50">
                        {isSaving ? 'Sparar...' : 'Spara ändringar'}
                    </button>
                </>
            )}
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
         
         {/* MAIN CONTENT (Left 2/3) */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* 1. PLAN CARD */}
            <div className={cx(
                "bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm ring-1 ring-slate-900/5 relative overflow-hidden transition-all",
                isEditing && "ring-indigo-500/20 shadow-lg"
            )}>
               {/* Edit Button (Floating) - Only visible when NOT editing */}
               {!isEditing && (
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="absolute top-6 right-6 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all shadow-sm ring-1 ring-slate-900/5"
                   title="Redigera plan"
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </button>
               )}

               {/* Delete Button (Floating) - Only visible when EDITING */}
               {isEditing && plan.id !== 'temp-new' && (
                   <button 
                    onClick={() => { if(window.confirm('Ta bort plan?')) onDelete(plan.id); }}
                    className="absolute top-6 right-6 p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all text-xs font-bold"
                   >
                       Ta bort
                   </button>
               )}

               <div className="mb-6">
                  {/* Dates */}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 h-8">
                      {isEditing ? (
                          <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none w-24 text-slate-700" />
                              <span>→</span>
                              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-transparent outline-none w-24 text-slate-700" />
                          </div>
                      ) : (
                          <>
                            <span>{plan.startDate ? formatDate(plan.startDate) : 'Startdatum'}</span>
                            <div className="h-px w-4 bg-slate-300" />
                            <span>{plan.targetDate ? formatDate(plan.targetDate) : 'Tillsvidare'}</span>
                            {daysLeft !== null && daysLeft > 0 && (
                                <span className="ml-2 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] normal-case">
                                    {daysLeft} dagar kvar
                                </span>
                            )}
                          </>
                      )}
                  </div>

                  {/* Title */}
                  {isEditing ? (
                      <input 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Namnge din plan..."
                        className="text-3xl sm:text-4xl font-display font-bold text-slate-900 leading-tight mb-4 w-full outline-none placeholder:text-slate-300 border-b border-transparent focus:border-slate-200 transition-colors bg-transparent"
                      />
                  ) : (
                      <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 leading-tight mb-4 min-h-[1.2em]">
                          {plan.title || <span className="text-slate-300 italic">Namnlös plan</span>}
                      </h1>
                  )}
                  
                  {/* Linked Markers Badges */}
                  <div className="flex flex-wrap gap-2 mb-6 items-center">
                      {(isEditing ? markerIds : plan.linkedMarkerIds || []).map(id => {
                          const m = markerMap.get(id);
                          if(!m) return null;
                          return (
                              <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold ring-1 ring-slate-900/5">
                                  <span className={cx("w-1.5 h-1.5 rounded-full", m.status === 'normal' ? 'bg-emerald-400' : m.status === 'high' ? 'bg-rose-400' : 'bg-amber-400')} />
                                  {m.name}
                                  {isEditing && (
                                      <button onClick={() => toggleMarker(id)} className="ml-1 text-slate-400 hover:text-rose-500">×</button>
                                  )}
                              </span>
                          )
                      })}
                      
                      {isEditing && (
                          <button 
                            onClick={() => setShowMarkerModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs font-bold hover:text-slate-600 hover:border-slate-400"
                          >
                              + Markörer
                          </button>
                      )}
                  </div>

                  {/* UNHANDLED DEVIATIONS SUGGESTIONS (Edit Mode Only) */}
                  {isEditing && unhandledMarkers.length > 0 && (
                      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100 animate-in fade-in">
                          <div className="flex items-center gap-2 mb-2 text-amber-800 text-xs font-bold uppercase tracking-wide">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Avvikelser som saknas i planen
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {unhandledMarkers.map(m => (
                                  <button
                                      key={m.id}
                                      onClick={() => toggleMarker(m.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm group"
                                  >
                                      <span className="group-hover:scale-125 transition-transform">+</span>
                                      {m.name}
                                      <span className="opacity-60 font-normal ml-0.5">
                                          ({m.status === 'high' ? 'Högt' : 'Lågt'})
                                      </span>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
               </div>

               <div className="border-t border-slate-100 pt-6">
                   {isEditing ? (
                       <div className="bg-slate-50/50 rounded-xl p-2 min-h-[300px]">
                           <div className="flex items-center gap-1 mb-2 pb-2 border-b border-slate-200/60 sticky top-0 bg-white/50 backdrop-blur-sm z-10">
                                <ToolbarBtn onClick={() => execCmd('bold')} icon="B" label="Fet" />
                                <ToolbarBtn onClick={() => execCmd('italic')} icon="I" label="Kursiv" />
                                <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon="•" label="Lista" />
                                <ToolbarBtn onClick={() => execCmd('formatBlock', 'H3')} icon="H" label="Rubrik" />
                           </div>
                           <div 
                             ref={contentRef}
                             className="prose prose-slate prose-sm sm:prose-base max-w-none focus:outline-none p-2"
                             contentEditable
                             dangerouslySetInnerHTML={{ __html: sanitizeHtmlUnsafe(plan.content) }}
                           />
                       </div>
                   ) : (
                       <Markup content={plan.content} />
                   )}
               </div>
            </div>

            {/* 2. GOALS SECTION */}
            {(isEditing || (plan.goals && plan.goals.length > 0)) && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2 flex justify-between items-center">
                        Målsättningar
                    </h3>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                        {(isEditing ? goals : plan.goals || []).map((goal, idx) => (
                            <GoalCard 
                                key={idx} 
                                goal={goal} 
                                marker={markerMap.get(goal.markerId)} 
                                isEditing={isEditing} 
                                onDelete={() => removeGoal(idx)}
                            />
                        ))}
                        
                        {/* Add Goal Card */}
                        {isEditing && (
                            <div className="bg-white rounded-2xl p-4 border border-dashed border-slate-300 flex flex-col justify-center items-center gap-3 min-h-[80px]">
                                {!showGoalInput ? (
                                    <button onClick={() => setShowGoalInput(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                                        + Lägg till mål
                                    </button>
                                ) : (
                                    <div className="w-full space-y-2 animate-in fade-in">
                                        <select 
                                            value={newGoalMarkerId} 
                                            onChange={e => setNewGoalMarkerId(e.target.value)} 
                                            className="w-full text-xs p-2 rounded border border-slate-200 bg-slate-50"
                                        >
                                            <option value="">Välj markör...</option>
                                            {allMarkers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                        <div className="flex gap-2">
                                            <select 
                                                value={newGoalDirection} 
                                                onChange={e => setNewGoalDirection(e.target.value as any)} 
                                                className="w-1/3 text-xs p-2 rounded border border-slate-200 bg-slate-50"
                                            >
                                                <option value="higher">&gt;</option>
                                                <option value="lower">&lt;</option>
                                                <option value="range">Intervall</option>
                                            </select>
                                            {newGoalDirection === 'range' ? (
                                                <div className="flex gap-1 flex-1">
                                                    <input placeholder="Min" type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200" />
                                                    <input placeholder="Max" type="number" value={newGoalValueUpper} onChange={e => setNewGoalValueUpper(e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200" />
                                                </div>
                                            ) : (
                                                <input placeholder="Värde" type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} className="flex-1 text-xs p-2 rounded border border-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setShowGoalInput(false)} className="text-xs text-slate-400">Avbryt</button>
                                            <button onClick={handleAddGoal} className="text-xs font-bold text-white bg-slate-900 px-3 py-1 rounded">OK</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                    onUpdateTask={onUpdateTodoTask}
                    variant="minimal"
                 />
                 
                 {todos.length === 0 && (
                     <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                         Inga uppgifter tillagda än. <br/>
                         {!isEditing && !plan.id.includes('temp') && "Klicka nedan för att lägga till."}
                     </div>
                 )}

                 {/* Add Todo Button - Available even in view mode if plan is saved */}
                 {plan.id !== 'temp-new' && (
                     <div className="mt-4 pt-3 border-t border-slate-100">
                         <button 
                            onClick={() => {
                                const task = prompt("Ny uppgift:");
                                if (task) onAddTodo(task, plan.id);
                            }}
                            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 border-dashed hover:border-slate-300"
                         >
                            + Lägg till uppgift
                         </button>
                     </div>
                 )}
                 {plan.id === 'temp-new' && (
                     <div className="mt-4 text-[10px] text-center text-amber-600 font-medium">
                         Spara planen för att kunna lägga till uppgifter.
                     </div>
                 )}
             </div>

         </div>

      </div>

      {/* MARKER SELECTOR MODAL */}
      {showMarkerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMarkerModal(false)}>
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-4 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-900">Välj markörer</h3>
                      <button onClick={() => setShowMarkerModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  <input 
                    autoFocus 
                    placeholder="Sök..." 
                    className="w-full p-2 bg-slate-50 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={markerSearch}
                    onChange={e => setMarkerSearch(e.target.value)}
                  />
                  <div className="flex-1 overflow-y-auto space-y-1">
                      {filteredMarkers.map(m => {
                          const isSel = markerIds.includes(m.id);
                          return (
                              <button 
                                key={m.id} 
                                onClick={() => toggleMarker(m.id)}
                                className={cx(
                                    "w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center",
                                    isSel ? "bg-indigo-50 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                  <span>{m.name}</span>
                                  {isSel && <span>✓</span>}
                              </button>
                          )
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ActivePlanView;
