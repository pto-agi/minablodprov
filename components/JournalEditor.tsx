
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarkerHistory, JournalPlan, MeasurementTodo, JournalGoal } from '../types';
import ActionList from './ActionList';
import { formatDate, formatNumber, getStatusColor, getStatusText } from '../utils';

interface Props {
  plan?: JournalPlan | null; // If null, creating new
  allMarkers: MarkerHistory[]; // Marker history + status
  linkedTodos: MeasurementTodo[]; // Todos specifically linked to this plan
  onSave: (
    title: string,
    content: string,
    markerIds: string[],
    startDate: string | undefined,
    targetDate: string | undefined,
    goals: JournalGoal[]
  ) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  onAddTodo: (task: string, journalId: string) => Promise<void>;
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodoTask: (id: string, task: string, date: string | null) => Promise<void>;
  onUpdateTags?: (id: string, tags: string[]) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const AUTOSAVE_DELAY_MS = 1200;

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

const SidebarGoalItem: React.FC<{ goal: JournalGoal; markerName: string; unit: string; onDelete: () => void }> = ({ goal, markerName, unit, onDelete }) => {
  const isRange = goal.direction === 'range';
  
  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs mb-2 transition-all hover:shadow-md">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px]">🎯</span>
          <span className="font-bold text-slate-700">{markerName}</span>
        </div>
        <div className="text-slate-500 font-medium flex items-center gap-1">
          Mål: 
          {isRange ? (
            <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
              {goal.targetValue} - {goal.targetValueUpper}
            </span>
          ) : (
             <>
               {goal.direction === 'higher' ? '>' : '<'} 
               <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">{goal.targetValue}</span>
             </>
          )}
          {unit}
        </div>
      </div>
      <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-lg">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

const SidebarDeviationCard: React.FC<{ marker: MarkerHistory; onAdd: () => void }> = ({ marker, onAdd }) => {
  const isHigh = marker.status === 'high';
  const val = marker.latestMeasurement?.value;
  const date = marker.latestMeasurement?.date;

  return (
    <button 
      onClick={onAdd}
      className="group relative w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden"
    >
      {/* Status Bar Indicator */}
      <div className={cx(
        "absolute left-0 top-0 bottom-0 w-1",
        isHigh ? "bg-rose-500" : "bg-amber-500"
      )} />

      <div className="flex justify-between items-start mb-2 pl-2">
         <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{marker.shortName}</div>
            <div className="font-bold text-slate-800 text-sm leading-tight">{marker.name}</div>
         </div>
         <span className={cx(
           "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
           isHigh ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
         )}>
           {isHigh ? 'Högt' : 'Lågt'}
         </span>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2 pl-2">
         <span className={cx(
           "text-2xl font-display font-bold tracking-tight",
           isHigh ? "text-rose-700" : "text-amber-700"
         )}>
           {formatNumber(val)}
         </span>
         <span className="text-xs font-semibold text-slate-500">{marker.unit}</span>
      </div>

      <div className="flex items-center justify-between pl-2 border-t border-slate-50 pt-2 mt-1">
         <div className="text-[10px] text-slate-400 font-medium">
            Ref: {marker.minRef}-{marker.maxRef}
         </div>
         <div className="text-[10px] text-slate-300 font-semibold">
            {date ? formatDate(date) : ''}
         </div>
      </div>

      {/* Hover Action Overlay */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded-full shadow-sm ring-1 ring-indigo-100 transform scale-95 group-hover:scale-100 transition-transform">
            <span>+</span> Lägg till i plan
         </div>
      </div>
    </button>
  );
};

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
  onUpdateTodoTask,
  onUpdateTags
}) => {
  // Editor State
  const [title, setTitle] = useState(plan?.title || '');
  const [markerIds, setMarkerIds] = useState<string[]>(plan?.linkedMarkerIds || []);
  const [goals, setGoals] = useState<JournalGoal[]>(plan?.goals || []);

  // Goal Creation State (Sidebar)
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalMarkerId, setNewGoalMarkerId] = useState('');
  const [newGoalDirection, setNewGoalDirection] = useState<'higher' | 'lower' | 'range'>('higher');
  const [newGoalValue, setNewGoalValue] = useState('');
  const [newGoalValueUpper, setNewGoalValueUpper] = useState(''); // Only for Range

  // Date State
  const [startDate, setStartDate] = useState<string>(plan?.startDate || todayLocalISO());
  const [targetDate, setTargetDate] = useState<string>(plan?.targetDate || '');

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempId, setTempId] = useState<string | null>(plan?.id || null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // New for mobile
  
  // Search State
  const [markerSearch, setMarkerSearch] = useState('');

  const [isDirty, setIsDirty] = useState(false);
  const [editTick, setEditTick] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const saveSeqRef = useRef(0);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setEditTick(t => t + 1);
    setSaveSuccess(false);
  }, []);

  // Sync state
  useEffect(() => {
    setTitle(plan?.title ?? '');
    setMarkerIds(plan?.linkedMarkerIds ?? []);
    setGoals(plan?.goals ?? []);
    setStartDate(plan?.startDate ?? todayLocalISO());
    setTargetDate(plan?.targetDate ?? '');
    setTempId(plan?.id ?? null);
    setIsDirty(false);
    setSaveSuccess(false);
    setEditTick(t => t + 1);

    if (editorRef.current) {
      const safe = sanitizeHtmlUnsafe(plan?.content ?? '');
      editorRef.current.innerHTML = safe;
    }
  }, [plan?.id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const markerById = useMemo(() => new Map(allMarkers.map(m => [m.id, m])), [allMarkers]);

  // Derived Lists
  const { unhandledMarkers, linkedMarkersList } = useMemo(() => {
    const linked = markerIds.map(id => markerById.get(id)).filter(Boolean) as MarkerHistory[];
    // Unhandled: Abnormal status AND NOT in markerIds
    const deviations = allMarkers.filter(m => 
      m.status !== 'normal' && 
      !m.isIgnored && 
      !markerIds.includes(m.id)
    );
    return { unhandledMarkers: deviations, linkedMarkersList: linked };
  }, [allMarkers, markerIds, markerById]);

  // Search Results (Sidebar)
  const searchResults = useMemo(() => {
    if (!markerSearch) return [];
    const q = markerSearch.toLowerCase();
    return allMarkers.filter(m => 
      !markerIds.includes(m.id) && 
      (m.name.toLowerCase().includes(q) || m.shortName.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [allMarkers, markerIds, markerSearch]);

  const execCmd = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      markDirty();
    },
    [markDirty]
  );

  const handleAddGoal = useCallback(() => {
    if (!newGoalMarkerId || !newGoalValue) return;
    
    const val = parseFloat(newGoalValue.replace(',', '.'));
    if (isNaN(val)) return;

    let valUpper: number | undefined = undefined;
    if (newGoalDirection === 'range') {
        const up = parseFloat(newGoalValueUpper.replace(',', '.'));
        if (isNaN(up)) return;
        valUpper = up;
        // Ensure min is lower than max
        if (val > up) return alert("Lägsta värde måste vara mindre än högsta.");
    }

    setGoals(prev => [
      ...prev, 
      { 
          markerId: newGoalMarkerId, 
          direction: newGoalDirection, 
          targetValue: val,
          targetValueUpper: valUpper 
      }
    ]);
    
    // Auto-link if needed
    if (!markerIds.includes(newGoalMarkerId)) {
        setMarkerIds(prev => [...prev, newGoalMarkerId]);
    }

    setNewGoalMarkerId('');
    setNewGoalValue('');
    setNewGoalValueUpper('');
    setIsAddingGoal(false);
    markDirty();
  }, [newGoalMarkerId, newGoalValue, newGoalValueUpper, newGoalDirection, markerIds, markDirty]);

  const removeGoal = (idx: number) => {
    setGoals(prev => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  const validateBeforeSave = useCallback((): string | null => {
    if (!title.trim()) return 'Ange en rubrik innan du sparar.';
    if (targetDate && startDate && targetDate < startDate) return 'Måldatum kan inte vara före startdatum.';
    return null;
  }, [startDate, targetDate, title]);

  const handleSave = useCallback(
    async (opts?: { silent?: boolean }) => {
      const validationError = validateBeforeSave();
      if (validationError) {
        if (!opts?.silent) alert(validationError);
        return;
      }

      if (savingRef.current) return;
      savingRef.current = true;
      const mySeq = ++saveSeqRef.current;
      setIsSaving(true);

      try {
        const raw = editorRef.current?.innerHTML || '';
        const safe = sanitizeHtmlUnsafe(raw);

        const id = await onSave(
          title.trim(),
          safe,
          markerIds,
          normalizeOptionalDate(startDate),
          normalizeOptionalDate(targetDate),
          goals
        );

        if (mySeq !== saveSeqRef.current) return;

        setTempId(id);
        setIsDirty(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);

        if (editorRef.current && editorRef.current.innerHTML !== safe) {
          editorRef.current.innerHTML = safe;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
        savingRef.current = false;
      }
    },
    [markerIds, onSave, startDate, targetDate, title, validateBeforeSave, goals]
  );

  useEffect(() => {
    if (!isDirty || !title.trim() || savingRef.current) return;
    const t = window.setTimeout(() => handleSave({ silent: true }), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [editTick, handleSave, isDirty, title]);

  const handleDelete = useCallback(async () => {
    if (!tempId) return;
    if (!window.confirm('Är du säker på att du vill ta bort denna plan? Detta går inte att ångra.')) return;
    setIsDeleting(true);
    try {
      await onDelete(tempId);
      onClose();
    } catch (e) {
      alert('Kunde inte ta bort planen.');
    } finally {
      setIsDeleting(false);
    }
  }, [onClose, onDelete, tempId]);

  const toggleMarker = useCallback((id: string) => {
      setMarkerIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
      markDirty();
  }, [markDirty]);

  const handleAddTodoInternal = useCallback(async (task: string) => {
      let currentId = tempId;
      if (!currentId) {
        await handleSave({ silent: true });
        if(!currentId) return alert("Spara planen först innan du lägger till uppgifter.");
      }
      await onAddTodo(task, currentId!);
  }, [tempId, handleSave, onAddTodo]);

  const todoStats = useMemo(() => {
    const total = linkedTodos.length;
    const done = linkedTodos.filter(t => t.done).length;
    return { total, done };
  }, [linkedTodos]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      if(!window.confirm('Du har osparade ändringar. Vill du stänga ändå?')) return;
    }
    onClose();
  }, [isDirty, onClose]);

  // Sidebar content separated to be reusable in Desktop Sidebar and Mobile Drawer
  const SidebarContent = () => (
     <div className="p-5 flex flex-col h-full overflow-y-auto">
        
        {/* SECTION: GOALS */}
        <div className="mb-8">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Målsättningar</h4>
           
           {goals.map((g, i) => {
              const m = markerById.get(g.markerId);
              return m ? <SidebarGoalItem key={i} goal={g} markerName={m.name} unit={m.unit} onDelete={() => removeGoal(i)} /> : null;
           })}

           {isAddingGoal ? (
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                 <select value={newGoalMarkerId} onChange={e => setNewGoalMarkerId(e.target.value)} className="w-full text-xs mb-2 p-2 rounded border border-slate-200 bg-slate-50">
                    <option value="">Välj markör...</option>
                    {allMarkers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
                 
                 <select value={newGoalDirection} onChange={e => setNewGoalDirection(e.target.value as any)} className="w-full text-xs mb-2 p-2 rounded border border-slate-200 bg-slate-50">
                    <option value="higher">Högre än (&gt;)</option>
                    <option value="lower">Lägre än (&lt;)</option>
                    <option value="range">Intervall (mellan)</option>
                 </select>

                 <div className="flex items-center gap-2 mb-2">
                    {newGoalDirection === 'range' ? (
                        <>
                          <input type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} placeholder="Min" className="w-16 text-xs p-2 rounded border border-slate-200 bg-slate-50" />
                          <span className="text-[10px] font-bold text-slate-400">OCH</span>
                          <input type="number" value={newGoalValueUpper} onChange={e => setNewGoalValueUpper(e.target.value)} placeholder="Max" className="w-16 text-xs p-2 rounded border border-slate-200 bg-slate-50" />
                        </>
                    ) : (
                        <input type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} placeholder="Värde" className="flex-1 text-xs p-2 rounded border border-slate-200 bg-slate-50" />
                    )}
                 </div>

                 <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddingGoal(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Avbryt</button>
                    <button onClick={handleAddGoal} disabled={!newGoalMarkerId || !newGoalValue || (newGoalDirection === 'range' && !newGoalValueUpper)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm disabled:opacity-50">Spara</button>
                 </div>
              </div>
           ) : (
              <button onClick={() => setIsAddingGoal(true)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors w-full border border-dashed border-indigo-200 hover:border-indigo-300">
                 <span>+</span> Lägg till mål
              </button>
           )}
        </div>

        {/* SECTION: SEARCH */}
        <div>
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alla markörer</h4>
           <div className="relative">
             <input 
                type="text" 
                placeholder="Sök markör..." 
                value={markerSearch}
                onChange={e => setMarkerSearch(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm mb-2"
             />
             <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
           </div>

           {searchResults.length > 0 && (
              <div className="space-y-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                 {searchResults.map(m => (
                    <button 
                       key={m.id}
                       onClick={() => { toggleMarker(m.id); setMarkerSearch(''); }}
                       className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex justify-between group"
                    >
                       <span>{m.name}</span>
                       <span className="text-slate-300 group-hover:text-indigo-500">+</span>
                    </button>
                 ))}
              </div>
           )}
        </div>

     </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/50 flex flex-col animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 shadow-sm z-20">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span className="text-sm font-semibold hidden sm:inline">Tillbaka</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          
          <span className={cx("text-xs font-bold uppercase tracking-widest transition-colors", saveSuccess ? "text-emerald-600" : "text-slate-400")}>
            {isSaving ? 'Sparar...' : isDirty ? 'Osparade ändringar...' : 'Sparat'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {tempId && (
            <button onClick={handleDelete} disabled={isDeleting} className="p-2 text-slate-400 hover:text-rose-600 rounded-full transition-colors hidden sm:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
          
          {/* Mobile Sidebar Toggle */}
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
             Mål & Inställningar
          </button>

          <button onClick={() => handleSave()} disabled={isSaving} className={cx("px-4 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm", saveSuccess ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800")}>
            {saveSuccess ? 'Sparat!' : 'Spara'}
          </button>
        </div>
      </header>

      {/* 2. LAYOUT: EDITOR (Left) + SIDEBAR (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CENTER: EDITOR AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 w-full">
          <div className="max-w-3xl mx-auto px-3 sm:px-8 py-4 sm:py-8 pb-32">
            
            {/* PAPER CARD */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-12 mb-8 min-h-[60vh]">
               
               {/* 1. TITLE */}
               <input 
                 type="text" 
                 placeholder="Namnge din plan..." 
                 value={title} 
                 onChange={e => { setTitle(e.target.value); markDirty(); }}
                 className="w-full text-2xl sm:text-4xl font-display font-bold text-slate-900 outline-none placeholder:text-slate-300 mb-6"
                 autoFocus={!plan}
               />

               {/* 2. MARKER & DATE SELECTOR (Revised) */}
               <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-slate-100">
                  
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm self-start">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wide">Period:</span>
                    <div className="flex items-center bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                       <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); markDirty(); }} className="bg-transparent font-semibold text-slate-700 outline-none w-24 text-xs" />
                       <span className="text-slate-300 mx-1">→</span>
                       <input type="date" value={targetDate} onChange={e => { setTargetDate(e.target.value); markDirty(); }} className="bg-transparent font-semibold text-slate-700 outline-none w-24 text-xs placeholder:text-slate-300" />
                    </div>
                  </div>

                  {/* SMART MARKER CLOUD */}
                  <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Omfattning & Fokus</h4>
                      
                      <div className="space-y-3">
                         {/* A: SELECTED MARKERS (IN PLAN) */}
                         {linkedMarkersList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                               {linkedMarkersList.map(m => {
                                  const hasGoal = goals.some(g => g.markerId === m.id);
                                  return (
                                     <div key={m.id} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wide">
                                        {hasGoal && <span className="text-[10px]">🎯</span>}
                                        {m.name}
                                        <button 
                                          onClick={() => toggleMarker(m.id)}
                                          className="ml-1 p-0.5 rounded hover:bg-indigo-200 text-indigo-400 hover:text-indigo-800 transition-colors"
                                        >
                                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                     </div>
                                  );
                               })}
                            </div>
                         )}

                         {/* B: UNHANDLED DEVIATIONS (SUGGESTIONS) */}
                         {unhandledMarkers.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                               <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-tight flex items-center gap-1">
                                  <span>⚠️ Avvikelser som saknar plan:</span>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {unhandledMarkers.map(m => {
                                     const isHigh = m.status === 'high';
                                     return (
                                        <button 
                                           key={m.id} 
                                           onClick={() => toggleMarker(m.id)}
                                           className={cx(
                                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed text-xs font-semibold uppercase tracking-wide transition-all",
                                              isHigh 
                                                 ? "bg-rose-50/50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300" 
                                                 : "bg-amber-50/50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-300"
                                           )}
                                        >
                                           <span>+ {m.name}</span>
                                        </button>
                                     );
                                  })}
                               </div>
                            </div>
                         )}
                      </div>
                  </div>
               </div>

               {/* 3. TOOLBAR */}
               <div className="sticky top-0 z-10 bg-white py-2 mb-2 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                  <ToolbarBtn onClick={() => execCmd('bold')} icon="B" label="Fet" />
                  <ToolbarBtn onClick={() => execCmd('italic')} icon="I" label="Kursiv" />
                  <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} icon="•" label="Lista" />
                  <ToolbarBtn onClick={() => execCmd('formatBlock', 'H3')} icon="H" label="Rubrik" />
               </div>

               {/* 4. CONTENT EDITOR */}
               <div 
                 ref={editorRef} 
                 className="prose prose-slate prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] empty:before:content-['Beskriv_din_strategi_här...'] empty:before:text-slate-300 empty:before:italic leading-relaxed"
                 contentEditable 
                 onInput={markDirty} 
               />
            </div>

            {/* ACTION LIST (Below Paper) */}
            <div className="mb-10">
               <div className="flex items-center gap-2 mb-3 px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kopplade Åtgärder ({todoStats.done}/{todoStats.total})</h3>
               </div>
               <ActionList
                  todos={linkedTodos}
                  onToggle={onToggleTodo}
                  onDelete={onDeleteTodo}
                  onUpdateTask={onUpdateTodoTask}
                  onAdd={handleAddTodoInternal}
                  onUpdateTags={onUpdateTags}
                  availableMarkers={allMarkers}
                  variant="minimal"
               />
            </div>

          </div>
        </main>

        {/* RIGHT: DESKTOP SIDEBAR (Hidden on Mobile) */}
        <aside className="hidden lg:flex w-80 bg-slate-50 border-l border-slate-200 flex-col z-10">
           <SidebarContent />
        </aside>

        {/* MOBILE SIDEBAR DRAWER (Overlay) */}
        {isMobileSidebarOpen && (
          <div className="absolute inset-0 z-50 flex justify-end lg:hidden">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
             
             {/* Drawer */}
             <div className="relative w-80 bg-white h-full shadow-2xl animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-800">Inställningar</h3>
                   <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
                <SidebarContent />
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

const ToolbarBtn: React.FC<{ onClick: () => void; icon: string; label: string }> = ({ onClick, icon, label }) => (
  <button onMouseDown={e => { e.preventDefault(); onClick(); }} className="p-1 min-w-[24px] h-6 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 font-bold text-xs flex items-center justify-center transition-colors" title={label} type="button">
    {icon}
  </button>
);

export default JournalEditor;
