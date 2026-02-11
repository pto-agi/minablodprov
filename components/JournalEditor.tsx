
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkerHistory, JournalPlan, MeasurementTodo } from '../types';
import ActionList from './ActionList';
import { formatDate } from '../utils';

interface Props {
  plan?: JournalPlan | null; // If null, creating new
  allMarkers: MarkerHistory[]; // Changed from BloodMarker to MarkerHistory to get status
  linkedTodos: MeasurementTodo[]; // Todos specifically linked to this plan
  onSave: (title: string, content: string, markerIds: string[], startDate?: string, targetDate?: string) => Promise<string>; // Updated sig
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  onAddTodo: (task: string, journalId: string) => Promise<void>;
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodoTask: (id: string, task: string, date: string | null) => Promise<void>;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const JournalEditor: React.FC<Props> = ({
  plan,
  allMarkers,
  linkedTodos,
  onSave,
  onDelete,
  onClose,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodoTask
}) => {
  // Editor State
  const [title, setTitle] = useState(plan?.title || '');
  const [markerIds, setMarkerIds] = useState<string[]>(plan?.linkedMarkerIds || []);
  
  // Date State
  const [startDate, setStartDate] = useState<string>(plan?.startDate || new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState<string>(plan?.targetDate || '');

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false); // New state for visual feedback
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempId, setTempId] = useState<string | null>(plan?.id || null);
  const [searchTerm, setSearchTerm] = useState('');

  // ContentEditable ref
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (editorRef.current && plan?.content) {
      editorRef.current.innerHTML = plan.content;
    }
  }, [plan?.id]); 
  
  // Update tempId if plan changes (e.g. after save in App.tsx)
  useEffect(() => {
      if (plan?.id) setTempId(plan.id);
  }, [plan?.id]);

  // --- Logic for Sidebar ---
  
  // 1. Attention Markers (Not 'normal' status)
  const attentionMarkers = useMemo(() => {
    return allMarkers.filter(m => m.status !== 'normal');
  }, [allMarkers]);

  // 2. Search Results (All markers matching search)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return allMarkers.filter(m => 
      m.name.toLowerCase().includes(lower) || 
      m.shortName.toLowerCase().includes(lower)
    );
  }, [allMarkers, searchTerm]);

  // --- Toolbar Commands ---
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSave = async () => {
    if (!title.trim()) return null;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const content = editorRef.current?.innerHTML || '';
      const newId = await onSave(title, content, markerIds, startDate, targetDate);
      setTempId(newId);
      setIsDirty(false);
      
      // Trigger Success Animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      
      return newId;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tempId) return;
    if (!window.confirm('Är du säker på att du vill ta bort denna plan? Detta går inte att ångra.')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(tempId);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Kunde inte ta bort planen.');
      setIsDeleting(false);
    }
  };
  
  const toggleMarker = (id: string) => {
    setMarkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setIsDirty(true);
    setSearchTerm(''); // Clear search after picking
  };

  const handleAddTodoInternal = async (task: string) => {
    let currentId = tempId;
    
    // If we are in "New Plan" mode (no ID yet), we MUST save first to get an ID
    if (!currentId) {
       if (!title.trim()) {
         alert("Ange en rubrik för din plan innan du lägger till uppgifter.");
         return;
       }
       // Automatically save to establish the link
       const savedId = await handleSave();
       if (savedId) {
           currentId = savedId;
       } else {
           return; // Save failed
       }
    }
    
    if (currentId) {
      await onAddTodo(task, currentId);
    }
  };

  const todoProgress = linkedTodos.length > 0 
    ? Math.round((linkedTodos.filter(t => t.done).length / linkedTodos.length) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-200">
      
      {/* 1. TOP BAR */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-8 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
             {/* Status Indicator */}
             {isDirty ? (
                <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md">
                   Osparade ändringar
                </span>
             ) : (
                <span className={cx(
                   "text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md transition-colors flex items-center gap-1.5",
                   saveSuccess ? "text-emerald-700 bg-emerald-50" : "text-slate-400"
                )}>
                   {saveSuccess && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                   Sparat
                </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3">
           {tempId && (
             <button 
               onClick={handleDelete}
               disabled={isDeleting}
               className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors mr-2"
               title="Ta bort plan"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
           )}

           {tempId && linkedTodos.length > 0 && (
             <div className="hidden sm:flex items-center gap-2 mr-4">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${todoProgress}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-600">{todoProgress}% klart</span>
             </div>
           )}
           
           <button 
             onClick={() => handleSave()} 
             disabled={isSaving}
             className={cx(
                "px-5 py-2 text-sm font-bold rounded-lg disabled:opacity-50 transition-all shadow-md flex items-center gap-2 min-w-[110px] justify-center",
                saveSuccess 
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 scale-105"
                  : "bg-slate-900 text-white hover:bg-slate-800"
             )}
           >
             {isSaving ? (
                <>
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>Sparar...</span>
                </>
             ) : saveSuccess ? (
                <>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   <span>Sparat!</span>
                </>
             ) : (
                'Spara plan'
             )}
           </button>
        </div>
      </header>

      {/* 2. MAIN GRID */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* EDITOR AREA (Center) */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
           <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 pb-32">
              
              {/* THE PAPER CARD */}
              <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-6 sm:p-10 mb-8">
                  
                  {/* Dates Header */}
                  <div className="flex flex-wrap gap-x-8 gap-y-4 mb-6 pb-6 border-b border-slate-100">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Startdatum</label>
                        <input 
                           type="date" 
                           value={startDate}
                           onChange={e => { setStartDate(e.target.value); setIsDirty(true); }}
                           className="text-sm font-semibold text-slate-800 bg-transparent outline-none hover:text-indigo-600 focus:text-indigo-600 transition-colors"
                        />
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Måldatum</label>
                        <input 
                           type="date" 
                           value={targetDate}
                           onChange={e => { setTargetDate(e.target.value); setIsDirty(true); }}
                           className="text-sm font-semibold text-slate-800 bg-transparent outline-none hover:text-indigo-600 focus:text-indigo-600 transition-colors placeholder:text-slate-300"
                        />
                     </div>
                     {plan?.updatedAt && (
                        <div className="flex flex-col gap-1 ml-auto text-right">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Uppdaterad</label>
                            <span className="text-sm font-medium text-slate-500">{formatDate(plan.updatedAt)}</span>
                        </div>
                     )}
                  </div>

                  {/* Title Input */}
                  <input 
                    type="text" 
                    placeholder="Namnge din plan..." 
                    className="w-full text-3xl font-display font-bold text-slate-900 placeholder:text-slate-300 outline-none bg-transparent mb-4"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
                    autoFocus={!plan}
                  />

                  {/* Formatting Toolbar (Sticky inside card) */}
                  <div className="sticky top-0 z-10 bg-white py-2 mb-4 border-b border-slate-100 flex items-center gap-1">
                     <ToolbarBtn onClick={() => execCmd('bold')} icon="B" label="Fet" />
                     <ToolbarBtn onClick={() => execCmd('italic')} icon="I" label="Kursiv" />
                     <div className="w-px h-4 bg-slate-200 mx-1" />
                     <ToolbarBtn onClick={() => execCmd('formatBlock', 'H2')} icon="H1" label="Rubrik" />
                     <ToolbarBtn onClick={() => execCmd('formatBlock', 'H3')} icon="H2" label="Underrubrik" />
                     <div className="w-px h-4 bg-slate-200 mx-1" />
                     <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon="•" label="Lista" />
                     <ToolbarBtn onClick={() => execCmd('insertOrderedList')} icon="1." label="Numrerad" />
                  </div>

                  {/* Rich Text Area - Compact Min Height */}
                  <div 
                    ref={editorRef}
                    className="prose prose-slate max-w-none focus:outline-none min-h-[150px] empty:before:content-['Beskriv_din_strategi_här...'] empty:before:text-slate-400 empty:before:italic text-base leading-relaxed"
                    contentEditable
                    onInput={() => setIsDirty(true)}
                  />
              </div>

              {/* INTEGRATED ACTION LIST - Distinct Section */}
              <div className="max-w-4xl mx-auto">
                 <div className="flex items-center gap-2 mb-3 ml-1">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                       Kopplade Åtgärder
                    </h3>
                 </div>
                 
                 <div className="bg-white/60 border border-slate-200/60 rounded-xl p-4 shadow-sm">
                    <ActionList 
                       todos={linkedTodos}
                       onToggle={onToggleTodo}
                       onDelete={onDeleteTodo}
                       onUpdateTask={onUpdateTodoTask}
                       onAdd={handleAddTodoInternal}
                       variant="minimal"
                    />
                 </div>
              </div>

           </div>
        </main>

        {/* SIDEBAR (Context & Tags) */}
        <aside className="w-full md:w-80 bg-white border-l border-slate-300 flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
           <div className="p-6 overflow-y-auto flex-1">
              
              {/* SECTION 1: CURRENTLY LINKED */}
              {markerIds.length > 0 && (
                 <div className="mb-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3">
                       Kopplade ({markerIds.length}/{attentionMarkers.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {markerIds.map(id => {
                          const m = allMarkers.find(x => x.id === id);
                          if (!m) return null;
                          return (
                             <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-white text-indigo-700 rounded-md text-xs font-bold border border-indigo-200 shadow-sm">
                                {m.shortName || m.name}
                                <button onClick={() => toggleMarker(id)} className="hover:text-rose-500 ml-1 font-extrabold">×</button>
                             </span>
                          )
                       })}
                    </div>
                 </div>
              )}

              {/* SECTION 2: ATTENTION MARKERS */}
              {attentionMarkers.length > 0 && (
                <div className="mb-8">
                   <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      Att åtgärda
                   </h4>
                   <div className="flex flex-col gap-2">
                      {attentionMarkers.map(m => {
                         const active = markerIds.includes(m.id);
                         return (
                            <button
                              key={m.id}
                              onClick={() => toggleMarker(m.id)}
                              className={cx(
                                 "flex items-center justify-between w-full p-3 rounded-lg text-sm font-medium transition-all text-left border",
                                 active ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                              )}
                            >
                               <div>
                                  <div className="leading-tight font-bold">{m.name}</div>
                                  <div className={cx("text-[10px] mt-0.5 font-semibold", m.status === 'high' ? 'text-rose-600' : 'text-amber-600')}>
                                     {m.status === 'high' ? '↑ Över ref' : '↓ Under ref'}
                                  </div>
                               </div>
                               {active ? (
                                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                               ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-slate-400" />
                               )}
                            </button>
                         );
                      })}
                   </div>
                </div>
              )}

              {/* SECTION 3: SEARCH */}
              <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Sök övriga markörer
                 </h4>
                 <div className="relative mb-3">
                    <input 
                       type="text" 
                       placeholder="T.ex. Ferritin..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>

                 {/* Results */}
                 <div className="flex flex-col gap-1">
                    {searchResults.map(m => {
                       const active = markerIds.includes(m.id);
                       return (
                          <button
                            key={m.id}
                            onClick={() => toggleMarker(m.id)}
                            className={cx(
                               "flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-all text-left",
                               active ? "bg-indigo-50 text-indigo-900 font-bold" : "hover:bg-slate-100 text-slate-600"
                            )}
                          >
                             <span>{m.name}</span>
                             {active && <span className="text-indigo-600 font-bold">✓</span>}
                          </button>
                       )
                    })}
                    {searchTerm && searchResults.length === 0 && (
                       <div className="text-xs text-slate-400 text-center py-2">Inga träffar</div>
                    )}
                 </div>
              </div>

           </div>
        </aside>

      </div>
    </div>
  );
};

const ToolbarBtn: React.FC<{ onClick: () => void; icon: string; label: string }> = ({ onClick, icon, label }) => (
  <button 
    onMouseDown={(e) => { e.preventDefault(); onClick(); }} // onMouseDown prevents focus loss from editor
    className="p-1.5 min-w-[32px] h-8 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center justify-center transition-colors"
    title={label}
  >
    {icon}
  </button>
);

export default JournalEditor;
