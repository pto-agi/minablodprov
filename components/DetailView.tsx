
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { MarkerHistory, MeasurementTodo, BloodMarker } from '../types';
import { formatDateTime, formatDate, formatNumber } from '../utils';
import HistoryChart from './HistoryChart';
import ReferenceVisualizer from './ReferenceVisualizer';
import ActionList from './ActionList'; // Import reused component

// --- HJÄLPKOMPONENTER FÖR UI (Inga externa beroenden) ---

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Ikon-bibliotek (SVG) för att hålla koden ren
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactElement> = {
    back: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    note: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trendUp: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    trendDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    export: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
    eyeOff: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  };
  return <svg className={cx("w-5 h-5", className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[name] || icons.eye}</svg>;
};

// --- HJÄLPFUNKTIONER ---

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; title?: string; message: string };

function safeId() {
  const c: any = typeof crypto !== 'undefined' ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function copyToClipboard(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function getRangeBadge(value: number, minRef: number, maxRef: number, isIgnored?: boolean) {
  if (isIgnored) return { label: 'Ignorerad', color: 'slate', bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200', dot: 'bg-slate-400' };
  if (value < minRef) return { label: 'Lågt', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200', dot: 'bg-amber-400' };
  if (value > maxRef) return { label: 'Högt', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-800', ring: 'ring-rose-200', dot: 'bg-rose-400' };
  return { label: 'Optimalt', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200', dot: 'bg-emerald-400' };
}

// --- MAIN COMPONENT ---

interface Props {
  data: MarkerHistory;
  onBack: () => void;
  onAddMeasurement: (markerId: string) => void;
  onSaveNote: (markerId: string, note: string) => Promise<void>;
  onUpdateNote: (noteId: string, note: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onUpdateMeasurementNote: (measurementId: string, note: string | null) => Promise<void>;
  todos: MeasurementTodo[];
  onAddTodo: (markerId: string, task: string) => Promise<void>; 
  onToggleTodo: (todoId: string, done: boolean) => Promise<void>;
  onUpdateTodo?: (todoId: string, task: string, dueDate: string | null) => Promise<void>; 
  onDeleteTodo: (todoId: string) => Promise<void>;
  onDeleteMeasurement?: (measurementId: string) => Promise<void>;
  onUpdateMeasurement?: (measurementId: string, value: number, date: string) => Promise<void>;
  onToggleIgnore?: (markerId: string) => Promise<void>; // New prop
  allMarkers?: BloodMarker[];
  onUpdateTags?: (todoId: string, ids: string[]) => void;
}

type ChartRange = '1m' | '3m' | '6m' | '1y' | 'all';

const DetailView: React.FC<Props> = ({
  data,
  onBack,
  onAddMeasurement,
  onSaveNote,
  onUpdateNote,
  onDeleteNote,
  todos,
  onAddTodo,
  onToggleTodo,
  onUpdateTodo,
  onDeleteTodo,
  onDeleteMeasurement,
  onUpdateMeasurement,
  onToggleIgnore,
  allMarkers,
  onUpdateTags
}) => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- STATE ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  
  // UI States
  const [chartRange, setChartRange] = useState<ChartRange>('6m');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Edit States
  const [editingMeasId, setEditingMeasId] = useState<string | null>(null);
  const [editMeasValue, setEditMeasValue] = useState('');
  const [editMeasDate, setEditMeasDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'meas'|'note'|'todo', id: string, desc: string } | null>(null);

  // --- LOGIC ---
  
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = safeId();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  const run = async (key: string, fn: () => Promise<void>, msg?: string) => {
    setBusy(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
      if (msg) pushToast({ type: 'success', message: msg });
    } catch (e) {
      pushToast({ type: 'error', title: 'Fel', message: 'Kunde inte utföra åtgärden.' });
    } finally {
      setBusy(prev => ({ ...prev, [key]: false }));
    }
  };

  // Data processing
  const sortedMeasurements = useMemo(() => 
    [...(data.measurements || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [data.measurements]);

  const latest = sortedMeasurements[0] ?? null;
  const previous = sortedMeasurements[1] ?? null;

  const timeline = useMemo(() => {
    const events: Array<{ type: 'measurement' | 'note', date: string, id: string, data: any }> = [];
    sortedMeasurements.forEach(m => events.push({ type: 'measurement', date: m.date, id: m.id, data: m }));
    data.notes?.forEach(n => events.push({ type: 'note', date: n.date, id: n.id, data: n }));
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sortedMeasurements, data.notes]);

  const chartData = useMemo(() => {
    if (chartRange === 'all') return [...sortedMeasurements].reverse();
    const now = new Date();
    const cutoff = new Date();
    if (chartRange === '1m') cutoff.setMonth(now.getMonth() - 1);
    if (chartRange === '3m') cutoff.setMonth(now.getMonth() - 3);
    if (chartRange === '6m') cutoff.setMonth(now.getMonth() - 6);
    if (chartRange === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    return sortedMeasurements.filter(m => new Date(m.date) >= cutoff).reverse();
  }, [sortedMeasurements, chartRange]);

  const trend = useMemo(() => {
    if (!latest || !previous) return null;
    const delta = latest.value - previous.value;
    const pct = previous.value !== 0 ? (delta / previous.value) * 100 : 0;
    return { delta, pct, up: delta > 0 };
  }, [latest, previous]);

  const handleSaveNote = async () => {
    if(!newNoteText.trim()) return;
    await run('addNote', async () => {
      await onSaveNote(data.id, newNoteText);
      setNewNoteText('');
      setIsAddingNote(false);
    });
  };

  const handleUpdateMeasurement = async () => {
    if (!editingMeasId || !onUpdateMeasurement) return;
    const val = parseFloat(editMeasValue.replace(',', '.'));
    if (isNaN(val)) return pushToast({type:'error', message: 'Ogiltigt tal'});
    await run(`upd:${editingMeasId}`, async () => {
      await onUpdateMeasurement(editingMeasId, val, editMeasDate);
      setEditingMeasId(null);
    }, 'Uppdaterat');
  };

  const handleDelete = async () => {
    if(!confirmDelete) return;
    const { type, id } = confirmDelete;
    if(type === 'meas' && onDeleteMeasurement) await run(`del:${id}`, () => onDeleteMeasurement(id));
    if(type === 'note') await run(`del:${id}`, () => onDeleteNote(id));
    if(type === 'todo') await run(`del:${id}`, () => onDeleteTodo(id));
    setConfirmDelete(null);
  };

  // Add todo linked to this marker
  const handleActionListAdd = async (task: string) => {
    await onAddTodo(data.id, task);
  };

  const handleActionListDelete = (id: string) => {
    setConfirmDelete({ type: 'todo', id, desc: 'uppgift' });
  };

  const handleExport = async () => {
    const csv = ['Datum,Värde,Enhet,Anteckning', ...sortedMeasurements.map(m => `${m.date},${m.value},${data.unit},"${m.note||''}"`)].join('\n');
    await copyToClipboard(csv);
    pushToast({ type: 'success', message: 'Data kopierad som CSV till urklipp' });
  };

  const handleToggleIgnoreClick = async () => {
    if (onToggleIgnore) {
      await run('ignore', () => onToggleIgnore(data.id));
    }
  };

  const statusBadge = latest 
    ? getRangeBadge(latest.value, data.minRef, data.maxRef, data.isIgnored) 
    : { color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inga data', dot: 'bg-slate-400', ring: 'ring-slate-200' };

  return (
    <div className="pb-32 bg-slate-50 min-h-screen animate-in fade-in duration-300">
      
      {/* 1. TOP NAV: Clean & Minimal */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors p-1 rounded-lg hover:bg-slate-100">
          <Icon name="back" className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Tillbaka</span>
        </button>
        <div className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{data.name}</div>
        
        <div className="flex gap-2">
            {onToggleIgnore && data.status !== 'normal' && (
              <button 
                onClick={handleToggleIgnoreClick} 
                className={cx(
                  "p-2 rounded-lg transition-colors border",
                  data.isIgnored 
                    ? "text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200" 
                    : "text-slate-400 hover:text-slate-900 bg-white border-transparent hover:bg-slate-50"
                )}
                title={data.isIgnored ? "Bevaka igen" : "Ignorera avvikelse"}
              >
                <Icon name={data.isIgnored ? "eye" : "eyeOff"} className="w-5 h-5" />
              </button>
            )}
            <button onClick={handleExport} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100" title="Kopiera CSV">
              <Icon name="export" className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-8">

        {/* 2. HERO CARD */}
        <section className={cx(
           "relative overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5 p-6 sm:p-8",
           data.isIgnored && "opacity-80 grayscale-[0.5]"
        )}>
          {/* Background effect */}
          {!data.isIgnored && (
            <div className={cx("absolute top-0 right-0 w-64 h-64 bg-gradient-to-br opacity-20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none", 
              statusBadge.color === 'emerald' ? 'from-emerald-400 to-teal-300' : 
              statusBadge.color === 'rose' ? 'from-rose-400 to-orange-300' : 'from-amber-400 to-yellow-300')} 
            />
          )}

          <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={cx("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ring-1 ring-inset", statusBadge.bg, statusBadge.text, statusBadge.ring)}>
                  <span className={cx("w-2 h-2 rounded-full", statusBadge.dot)} />
                  {statusBadge.label}
                </span>
                
                {/* Category Tag */}
                {data.category && (
                   <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white/50 text-slate-600 ring-1 ring-inset ring-slate-900/5 backdrop-blur-sm">
                     {data.category}
                   </span>
                )}

                <span className="text-xs text-slate-400 font-medium ml-1">Ref: {data.minRef}-{data.maxRef}</span>
              </div>
              
              <div className="flex items-baseline gap-2">
                <h1 className="text-5xl font-display font-bold text-slate-900 tracking-tight">
                  {latest ? formatNumber(latest.value) : '—'}
                </h1>
                <span className="text-2xl text-slate-400 font-medium">{data.unit}</span>
              </div>
              
              <div className="mt-3 text-sm font-medium text-slate-500 flex items-center gap-3">
                <span className="capitalize">{latest ? formatDate(latest.date) : 'Inga mätningar'}</span>
                {trend && (
                  <span className={cx("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold", 
                    trend.up ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-700"
                  )}>
                    <Icon name={trend.up ? 'trendUp' : 'trendDown'} className={cx("w-3 h-3", trend.up ? "text-emerald-500" : "text-rose-500")} />
                    {formatNumber(Math.abs(trend.pct))}%
                  </span>
                )}
              </div>

              {/* Full Description */}
              {data.description && (
                <div className="mt-6 pt-6 border-t border-slate-900/5">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Om markören</h4>
                   <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                     {data.description}
                   </p>
                </div>
              )}
            </div>

            {latest && (
               <div className="w-full sm:w-48 self-start sm:self-end shrink-0">
                  <ReferenceVisualizer 
                     value={latest.value}
                     minRef={data.minRef} maxRef={data.maxRef}
                     displayMin={data.displayMin} displayMax={data.displayMax}
                     status={data.status}
                  />
               </div>
            )}
          </div>
        </section>

        {/* 3. CHART */}
        {sortedMeasurements.length > 0 && (
           <section className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-900/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                 <h3 className="text-base font-bold text-slate-900">Utveckling</h3>
                 <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    {(['1m', '3m', '6m', '1y', 'all'] as ChartRange[]).map(r => (
                       <button
                          key={r}
                          onClick={() => setChartRange(r)}
                          className={cx(
                             "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                             chartRange === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                       >
                          {r}
                       </button>
                    ))}
                 </div>
              </div>
              <div className="h-64 w-full">
                <HistoryChart 
                   measurements={chartData} 
                   minRef={data.minRef} maxRef={data.maxRef} unit={data.unit}
                   displayMin={data.displayMin} displayMax={data.displayMax}
                />
              </div>
           </section>
        )}

        {/* 4. ACTIONS & TODOS */}
        <section className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-900/5">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                 <Icon name="check" className="w-4 h-4 text-emerald-500"/> Att göra
              </h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{todos.filter(t=>!t.done).length} kvar</span>
           </div>
           
           <ActionList 
             todos={todos}
             onToggle={(id, done) => run('toggle', () => onToggleTodo(id, done))}
             onDelete={handleActionListDelete}
             onAdd={handleActionListAdd}
             availableMarkers={allMarkers}
             onUpdateTags={onUpdateTags}
             onUpdateTask={onUpdateTodo} // Pass the task/date update handler
             variant="minimal"
           />
        </section>

        {/* 5. TIMELINE */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-lg font-bold text-slate-900">Händelselogg</h3>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-10">
             
             {isAddingNote && (
                <div className="relative pl-8 animate-in fade-in slide-in-from-top-2">
                   <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-slate-900 ring-4 ring-slate-50" />
                   <div className="bg-white p-4 rounded-2xl shadow-lg ring-1 ring-slate-900/10">
                      <textarea 
                         autoFocus
                         className="w-full text-sm bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 mb-3"
                         rows={3}
                         placeholder="Vad har hänt? (Sömn, stress, kost...)"
                         value={newNoteText}
                         onChange={e => setNewNoteText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                         <button onClick={() => setIsAddingNote(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Avbryt</button>
                         <button onClick={handleSaveNote} className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg">Spara</button>
                      </div>
                   </div>
                </div>
             )}

             {timeline.length === 0 && !isAddingNote && (
                <div className="pl-8 text-slate-400 text-sm italic py-4">Inget loggat än.</div>
             )}

             {timeline.map((item) => {
                const isMeas = item.type === 'measurement';
                const dataItem = item.data;
                
                return (
                   <div key={`${item.type}-${item.id}`} className="relative pl-8 group">
                      <div className={cx(
                         "absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white ring-1 shadow-sm z-10",
                         isMeas ? "bg-slate-900 ring-slate-200" : "bg-amber-100 ring-amber-200"
                      )} />
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                         <div className="flex-1">
                            <div className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-2">
                               {formatDateTime(item.date)}
                               {!isMeas && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Anteckning</span>}
                            </div>
                            
                            {isMeas ? (
                               <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-900/5 hover:ring-slate-900/20 transition-all">
                                  <div className="flex justify-between items-start">
                                     <div>
                                        <div className="text-lg font-bold text-slate-900">
                                           {formatNumber(dataItem.value)} 
                                           <span className="text-sm font-normal text-slate-500 ml-1">{data.unit}</span>
                                        </div>
                                        {dataItem.note && (
                                           <div className="mt-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg italic border border-slate-100">
                                              "{dataItem.note}"
                                           </div>
                                        )}
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        {(() => {
                                           const b = getRangeBadge(dataItem.value, data.minRef, data.maxRef, data.isIgnored);
                                           return <span className={cx("px-2 py-0.5 rounded text-[10px] font-bold uppercase text-center", b.bg, b.text)}>{b.label}</span>;
                                        })()}
                                     </div>
                                  </div>
                               </div>
                            ) : (
                               <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100/60 hover:bg-amber-50/80 transition-all">
                                  <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{dataItem.note}</p>
                                </div>
                            )}
                         </div>

                         {/* Quick Actions (Hover) */}
                         <div className="flex sm:flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {isMeas ? (
                               <button 
                                 onClick={() => { setEditingMeasId(dataItem.id); setEditMeasValue(String(dataItem.value)); setEditMeasDate(dataItem.date.split('T')[0]); }}
                                 className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                               >
                                  <Icon name="edit" className="w-4 h-4" />
                               </button>
                            ) : (
                               <button 
                                 onClick={() => setConfirmDelete({type:'note', id:dataItem.id, desc:'anteckning'})}
                                 className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                               >
                                  <Icon name="trash" className="w-4 h-4" />
                               </button>
                            )}
                            {isMeas && onDeleteMeasurement && (
                               <button 
                                 onClick={() => setConfirmDelete({type:'meas', id:dataItem.id, desc:`${dataItem.value} ${data.unit}`})}
                                 className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                               >
                                  <Icon name="trash" className="w-4 h-4" />
                               </button>
                            )}
                         </div>
                      </div>
                   </div>
                );
             })}
          </div>
        </section>
      </div>

      {/* 6. FAB */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
         <button 
            onClick={() => setIsAddingNote(prev => !prev)}
            className="w-12 h-12 rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-900/5 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Ny anteckning"
         >
            <Icon name="note" className="w-5 h-5" />
         </button>
         
         <button 
            onClick={() => onAddMeasurement(data.id)}
            className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Ny mätning"
         >
            <Icon name="plus" className="w-6 h-6" />
         </button>
      </div>

      {/* MODALS */}
      {editingMeasId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl animate-in zoom-in-95">
              <h3 className="font-bold text-lg mb-4">Redigera mätning</h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Värde ({data.unit})</label>
                    <input autoFocus value={editMeasValue} onChange={e=>setEditMeasValue(e.target.value)} className="w-full text-2xl font-bold p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Datum</label>
                    <input type="date" value={editMeasDate} onChange={e=>setEditMeasDate(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-medium" />
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditingMeasId(null)} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Avbryt</button>
                    <button onClick={handleUpdateMeasurement} className="flex-1 py-3 font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800">Spara</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {confirmDelete && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl">
               <h3 className="font-bold text-lg">Ta bort {confirmDelete.desc}?</h3>
               <p className="text-slate-500 text-sm mt-2">Detta går inte att ångra.</p>
               <div className="flex gap-2 mt-6">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Avbryt</button>
                  <button onClick={handleDelete} className="flex-1 py-2 font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700">Ta bort</button>
               </div>
            </div>
         </div>
      )}

      {/* TOASTS */}
      <div className="fixed top-6 right-6 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
           <div key={t.id} className={cx("pointer-events-auto bg-white px-4 py-3 rounded-2xl shadow-xl ring-1 ring-black/5 border-l-4 min-w-[300px] animate-in slide-in-from-right-10", 
              t.type==='success'?'border-emerald-500': t.type==='error'?'border-rose-500':'border-slate-400')}>
              <p className="text-sm font-bold text-slate-900">{t.message}</p>
           </div>
        ))}
      </div>
    </div>
  );
};

export default DetailView;
