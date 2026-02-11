import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MarkerHistory,
  Measurement,
  BloodMarker,
  OptimizationEvent,
  MarkerNote,
  MeasurementTodo,
  JournalEntry,
} from './types';
import { getStatus, safeFloat, formatNumber, getStatusTextColor } from './utils';
import DetailView from './components/DetailView';
import NewMeasurementModal from './components/NewMeasurementModal';
import OptimizedListModal from './components/OptimizedListModal';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import ImportModal from './components/ImportModal';
import JournalDrawer from './components/JournalDrawer';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// --- UTILS & HELPERS ---
const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const ts = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const humanizeSupabaseError = (err: any) => {
  const raw = (err?.message || String(err || '')).toLowerCase();
  if (raw.includes('row level security')) return 'Åtkomst nekad (Säkerhetspolicy).';
  if (raw.includes('duplicate key')) return 'Detta värde finns redan.';
  return 'Ett oväntat fel inträffade.';
};

// --- NYA UI-KOMPONENTER (INLINE FÖR MAXIMAL KONTROLL) ---

// 1. TRUST SPARKLINE: Visar trenden i relation till referensintervallet (Tunneln)
const TrustSparkline: React.FC<{ measurements: Measurement[]; minRef: number; maxRef: number }> = ({ measurements, minRef, maxRef }) => {
  const points = useMemo(() => measurements.slice(0, 8).reverse(), [measurements]);
  const uniqueId = React.useId();
  if (points.length < 2) return null;

  const W = 100, H = 32, PAD = 3;
  
  // Skala Y för att inkludera referensområdet snyggt
  const vals = points.map(p => p.value);
  const minVal = Math.min(...vals, minRef);
  const maxVal = Math.max(...vals, maxRef);
  const dist = maxVal - minVal || 1;
  const displayMin = minVal - dist * 0.15; 
  const displayMax = maxVal + dist * 0.15;
  const range = displayMax - displayMin;

  const y = (v: number) => H - PAD - ((clamp(v, displayMin, displayMax) - displayMin) / range) * (H - PAD * 2);
  const x = (i: number) => (i / (points.length - 1)) * W;

  const linePath = points.map((p, i) => `${i===0?'M':'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;
  
  const refTop = y(maxRef);
  const refBottom = y(minRef);
  
  // Färg baserat på senaste status
  const last = points[points.length - 1];
  const isNormal = last.value >= minRef && last.value <= maxRef;
  const stroke = isNormal ? '#10b981' : '#f59e0b';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-24 h-8 overflow-visible">
       <defs>
          <linearGradient id={`g-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={stroke} stopOpacity="0.15" />
             <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
       </defs>
       {/* Referenstunnel (Det säkra området) */}
       <rect x="-2" y={Math.min(refTop, refBottom)} width={W+4} height={Math.abs(refBottom - refTop)} fill={isNormal ? "#ecfdf5" : "#fffbeb"} rx="2" />
       {/* Graf */}
       <path d={areaPath} fill={`url(#g-${uniqueId})`} />
       <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
       <circle cx={W} cy={y(last.value)} r="2.5" fill="white" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
};

// 2. BLOOD MARKER CARD (Uppgraderad med Sparkline & Status Strip)
const BloodMarkerCard: React.FC<{ data: MarkerHistory; onClick: () => void }> = ({ data, onClick }) => {
  const { name, shortName, unit, latestMeasurement, status, minRef, maxRef, measurements } = data;
  if (!latestMeasurement) return null;

  const isNormal = status === 'normal';
  const theme = isNormal ? { border: 'bg-emerald-500', text: 'text-slate-900' } : { border: 'bg-amber-500', text: 'text-amber-700' };

  return (
    <button onClick={onClick} className="group relative w-full text-left bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/5 hover:shadow-md hover:ring-slate-900/10 transition-all active:scale-[0.99] overflow-hidden">
      {/* Vänster statusindikator */}
      <div className={cx("absolute left-0 top-0 bottom-0 w-1.5", theme.border)} />
      
      <div className="p-4 pl-5 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-bold text-slate-900 text-base truncate">{name}</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{shortName}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
             Ref: {minRef}-{maxRef} {unit}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Sparkline (Döljs på väldigt små mobiler) */}
           <div className="hidden sm:block">
              <TrustSparkline measurements={measurements} minRef={minRef} maxRef={maxRef} />
           </div>

           <div className="text-right min-w-[70px]">
              <div className={cx("text-2xl font-display font-bold leading-none tracking-tight", theme.text)}>
                 {formatNumber(latestMeasurement.value)}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{unit}</div>
           </div>
        </div>
      </div>
    </button>
  );
};

// 3. HEALTH SCORE HERO (Gamification Engine)
const HealthScoreHero: React.FC<{ score: number; attentionCount: number; optimizedCount: number; onOpenAttention: () => void }> = ({ score, attentionCount, optimizedCount, onOpenAttention }) => {
  const r = 52, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
  const color = score >= 85 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
  const stroke = score >= 85 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5 flex flex-col sm:flex-row items-center justify-between relative overflow-hidden mb-8">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full -mr-10 -mt-10 blur-3xl opacity-60 pointer-events-none" />

      <div className="z-10 text-center sm:text-left mb-6 sm:mb-0">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Metabolt Hälsoindex</h2>
        <div className="text-4xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight">
           {score}<span className="text-2xl text-slate-400 font-medium ml-1">/ 100</span>
        </div>
        <p className="text-sm text-slate-600 mt-2 font-medium max-w-xs leading-relaxed">
           {score >= 85 ? 'Utmärkt! Din biokemi är välbalanserad.' : score >= 50 ? 'Bra grund, men potential finns.' : 'Flera värden kräver din uppmärksamhet.'}
        </p>
      </div>

      <div className="flex items-center gap-6">
         {/* Ring Chart */}
         <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
               <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
               <circle cx="64" cy="64" r={r} fill="none" stroke={stroke} strokeWidth="8" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className={cx("absolute inset-0 flex flex-col items-center justify-center font-bold text-2xl", color)}>{score}%</div>
         </div>
         
         {/* Quick Stat */}
         <button onClick={onOpenAttention} className="hidden sm:flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer ring-1 ring-slate-200">
            <span className={cx("text-2xl font-bold", attentionCount > 0 ? "text-amber-500" : "text-slate-400")}>{attentionCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Avvikelser</span>
         </button>
      </div>
    </div>
  );
};

// 4. CATEGORY GROUP (Accordion)
const CategoryGroup: React.FC<{ title: string; markers: MarkerHistory[]; onSelectMarker: (id: string) => void }> = ({ title, markers, onSelectMarker }) => {
  const [isOpen, setIsOpen] = useState(true);
  const total = markers.length;
  const normal = markers.filter(m => m.status === 'normal').length;
  const ratio = total === 0 ? 0 : normal / total;

  return (
    <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
        <div className="flex items-center gap-3">
           <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
           {total > 0 && (
             <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
             </div>
           )}
        </div>
        <div className={cx("text-slate-400 transition-transform duration-300", isOpen ? "rotate-180" : "")}>
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {isOpen && (
        <div className="grid gap-3 mt-1 px-1">
          {markers.map(m => <BloodMarkerCard key={m.id} data={m} onClick={() => onSelectMarker(m.id)} />)}
        </div>
      )}
    </div>
  );
};

// 5. TOAST
const Toast: React.FC<{ type: 'success'|'error'|'info', title: string, message?: string }> = ({ type, title, message }) => (
  <div className={cx("fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md", 
    type === 'success' ? 'bg-emerald-600/95 text-white' : 'bg-slate-800/95 text-white')}>
    <span className="font-bold text-sm">{title}</span>
    {message && <span className="text-xs opacity-90 border-l border-white/20 pl-3">{message}</span>}
  </div>
);


// --- MAIN APP ---

const App: React.FC = () => {
  // --- STATE ---
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const [bloodMarkers, setBloodMarkers] = useState<BloodMarker[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [markerNotes, setMarkerNotes] = useState<MarkerNote[]>([]);
  const [todos, setTodos] = useState<MeasurementTodo[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention'>('all');
  const [toast, setToast] = useState<any>(null);
  
  const [modals, setModals] = useState({ measure: false, import: false, optimized: false, journal: false });
  const [prefillMarkerId, setPrefillMarkerId] = useState<string | null>(null);

  // --- INIT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoadingSession(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { setSession(s); if(s) setShowAuth(false); });
    return () => subscription.unsubscribe();
  }, []);

  const showToast = useCallback((t: any) => { setToast(t); setTimeout(() => setToast(null), 4000); }, []);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoadingData(true);
    const uid = session.user.id;
    try {
      const [resM, resMeas, resNotes, resTodos, resJournal] = await Promise.all([
        supabase.from('blood_markers').select('*'),
        supabase.from('measurements').select('*').eq('user_id', uid).order('measured_at', { ascending: false }),
        supabase.from('marker_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('measurement_todos').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('journal_entries').select('*').eq('user_id', uid).order('entry_date', { ascending: false }),
      ]);

      if (resM.error) throw resM.error;

      setBloodMarkers((resM.data || []).map((m: any) => ({
        ...m, minRef: safeFloat(m.min_ref), maxRef: safeFloat(m.max_ref),
        displayMin: safeFloat(m.display_min) || safeFloat(m.min_ref) * 0.5,
        displayMax: safeFloat(m.display_max) || safeFloat(m.max_ref) * 1.5,
        shortName: m.short_name || m.name.substring(0,3),
      })));
      setMeasurements((resMeas.data || []).map((x: any) => ({ id: x.id, markerId: x.marker_id, value: safeFloat(x.value), date: x.measured_at, note: x.note })));
      setMarkerNotes((resNotes.data || []).map((n: any) => ({ id: n.id, markerId: n.marker_id, note: n.note, date: n.created_at })));
      setTodos((resTodos.data || []).map((t: any) => ({ id: t.id, measurementId: t.measurement_id, task: t.task, done: t.is_done, createdAt: t.created_at, updatedAt: t.updated_at })));
      setJournalEntries((resJournal.data || []).map((j: any) => ({ id: j.id, content: j.content, entryDate: j.entry_date, tags: j.tags || [], createdAt: j.created_at })));

    } catch (e: any) {
      console.error(e);
      setDataError(humanizeSupabaseError(e));
    } finally {
      setLoadingData(false);
    }
  }, [session?.user]);

  useEffect(() => { if (session?.user) fetchData(); }, [session?.user, fetchData]);

  // --- LOGIC ---
  const dashboardData = useMemo(() => {
    if (!bloodMarkers.length) return [];
    
    // Snabbare lookups
    const mGroup = new Map<string, Measurement[]>();
    measurements.forEach(m => { const a = mGroup.get(m.markerId) || []; a.push(m); mGroup.set(m.markerId, a); });
    const nGroup = new Map<string, MarkerNote[]>();
    markerNotes.forEach(n => { const a = nGroup.get(n.markerId) || []; a.push(n); nGroup.set(n.markerId, a); });

    return bloodMarkers.map(marker => {
      const ms = mGroup.get(marker.id) || [];
      const ns = nGroup.get(marker.id) || [];
      const latest = ms[0] || null;
      return {
        ...marker, measurements: ms, notes: ns, latestMeasurement: latest,
        status: latest ? getStatus(latest.value, marker.minRef, marker.maxRef) : 'normal',
      };
    }).filter(m => m.measurements.length > 0); 
  }, [bloodMarkers, measurements, markerNotes]);

  const stats = useMemo(() => {
    const optimized: OptimizationEvent[] = [];
    const attention: MarkerHistory[] = [];
    let scoreTotal = 0;
    
    dashboardData.forEach(m => {
      if(m.status === 'normal') scoreTotal += 100;
      else if(m.status === 'low' || m.status === 'high') scoreTotal += 50;
      if(m.status !== 'normal') attention.push(m);

      if(m.measurements.length >= 2) {
         const [curr, prev] = m.measurements;
         if (getStatus(prev.value, m.minRef, m.maxRef) !== 'normal' && getStatus(curr.value, m.minRef, m.maxRef) === 'normal') {
            optimized.push({ markerId: m.id, markerName: m.name, unit: m.unit, badDate: prev.date, badValue: prev.value, badStatus: 'low', goodDate: curr.date, goodValue: curr.value });
         }
      }
    });
    
    return {
       healthScore: dashboardData.length > 0 ? Math.round(scoreTotal / dashboardData.length) : 0,
       optimized, attention
    };
  }, [dashboardData]);

  // Daily Focus (Retention)
  const activeTodos = useMemo(() => {
     return todos.filter(t => !t.done).map(t => {
        const m = measurements.find(meas => meas.id === t.measurementId);
        const marker = m ? bloodMarkers.find(b => b.id === m.markerId) : null;
        return { ...t, markerName: marker?.name };
     });
  }, [todos, measurements, bloodMarkers]);

  // Filtering
  const groupedData = useMemo(() => {
    let d = dashboardData;
    if (statusFilter === 'attention') d = d.filter(m => m.status !== 'normal');
    if (query) d = d.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    
    // Sortera Attention först
    d.sort((a,b) => {
       if (a.status !== 'normal' && b.status === 'normal') return -1;
       if (a.status === 'normal' && b.status !== 'normal') return 1;
       return a.name.localeCompare(b.name);
    });

    const g: Record<string, MarkerHistory[]> = {};
    d.forEach(m => { const c = m.category || 'Övrigt'; if(!g[c]) g[c]=[]; g[c].push(m); });
    return Object.entries(g).sort((a,b) => a[0].localeCompare(b[0]));
  }, [dashboardData, query, statusFilter]);

  // --- ACTIONS ---
  const genericDB = async (promise: any, successTitle: string) => {
     const { error } = await promise;
     if (error) showToast({ type: 'error', title: 'Fel', message: humanizeSupabaseError(error) });
     else { await fetchData(); showToast({ type: 'success', title: successTitle }); }
  };

  const loadDemoData = async () => {
    if (!session?.user || bloodMarkers.length === 0) return;
    const iron = bloodMarkers.find(m => m.name.includes('Järn') || m.name.includes('Ferritin')) || bloodMarkers[0];
    const dvit = bloodMarkers.find(m => m.name.includes('D-vitamin')) || bloodMarkers[1];
    const payload = [
       { user_id: session.user.id, marker_id: iron.id, value: iron.minRef * 0.8, measured_at: '2023-01-10', note: 'Startvärde' },
       { user_id: session.user.id, marker_id: dvit.id, value: dvit.minRef * 1.5, measured_at: '2023-04-10' },
    ];
    await supabase.from('measurements').insert(payload);
    await fetchData();
    showToast({ type: 'success', title: 'Demo laddat!' });
  };

  // --- RENDER ---
  if (loadingSession) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-2 border-slate-900 rounded-full border-t-transparent"/></div>;
  if (!session) return showAuth ? <Auth /> : <LandingPage onStart={()=>setShowAuth(true)} onLogin={()=>setShowAuth(true)} />;

  if (selectedMarkerId) {
    const mData = dashboardData.find(d => d.id === selectedMarkerId);
    if (!mData) return null;
    return (
      <DetailView
        data={mData}
        onBack={() => setSelectedMarkerId(null)}
        onAddMeasurement={(mid) => { setPrefillMarkerId(mid); setModals(p => ({...p, measure: true})); }}
        onSaveNote={(id, txt) => genericDB(supabase.from('marker_notes').insert({user_id:session.user.id, marker_id:id, note:txt}), 'Sparat')}
        onUpdateNote={(id, txt) => genericDB(supabase.from('marker_notes').update({note:txt}).eq('id',id), 'Uppdaterat')}
        onDeleteNote={(id) => genericDB(supabase.from('marker_notes').delete().eq('id',id), 'Borttaget')}
        onUpdateMeasurementNote={(id, txt) => genericDB(supabase.from('measurements').update({note:txt}).eq('id',id), 'Sparat')}
        todos={todos.filter(t => mData.measurements.some(m => m.id === t.measurementId))}
        onAddTodo={(mid, t) => genericDB(supabase.from('measurement_todos').insert({user_id:session.user.id, measurement_id:mid, task:t}), 'Sparat')}
        onToggleTodo={(id, done) => genericDB(supabase.from('measurement_todos').update({is_done:done}).eq('id',id), 'Uppdaterat')}
        onUpdateTodo={(id, t) => genericDB(supabase.from('measurement_todos').update({task:t}).eq('id',id), 'Uppdaterat')}
        onDeleteTodo={(id) => genericDB(supabase.from('measurement_todos').delete().eq('id',id), 'Borttaget')}
        onDeleteMeasurement={(id) => genericDB(supabase.from('measurements').delete().eq('id',id), 'Borttaget')}
        onUpdateMeasurement={(id, v, d) => genericDB(supabase.from('measurements').update({value:v, measured_at:d}).eq('id',id), 'Uppdaterat')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">BW</div>
            <span className="font-bold text-lg tracking-tight">bloodwork</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModals(p => ({...p, journal: true}))} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 relative">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               {journalEntries.length > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
        {dataError && <div className="p-4 bg-amber-50 text-amber-900 rounded-xl text-sm border border-amber-200">⚠️ {dataError}</div>}

        {/* 1. HERO & GAMIFICATION */}
        {dashboardData.length > 0 ? (
          <>
             <HealthScoreHero 
                score={stats.healthScore}
                attentionCount={stats.attention.length}
                optimizedCount={stats.optimized.length}
                onOpenAttention={() => setStatusFilter('attention')}
             />
             
             {/* 2. DAILY FOCUS (RETENTION HOOK) */}
             {activeTodos.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Dagens Fokus
                   </h3>
                   <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
                      {activeTodos.slice(0, 3).map(todo => (
                         <div key={todo.id} className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                            <input type="checkbox" checked={todo.done} onChange={(e) => genericDB(supabase.from('measurement_todos').update({is_done: e.target.checked}).eq('id', todo.id), 'Klart!')} className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                            <div>
                               <div className="text-sm font-bold text-slate-900">{todo.task}</div>
                               {todo.markerName && <div className="text-xs text-slate-500">Kopplat till <span className="font-semibold text-slate-700">{todo.markerName}</span></div>}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </>
        ) : (
          /* EMPTY STATE WITH DEMO */
          <div className="bg-white rounded-[2rem] p-10 text-center ring-1 ring-slate-900/5 shadow-xl">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🚀</div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Din hälsaresa börjar här</h2>
             <p className="text-slate-500 mb-8 max-w-sm mx-auto">Importera provsvar eller ladda demodata för att se systemet in action.</p>
             <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button onClick={() => setModals(p => ({...p, import: true}))} className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform">Importera</button>
                <button onClick={loadDemoData} className="px-8 py-4 bg-white text-slate-900 ring-1 ring-slate-200 rounded-full font-bold hover:bg-slate-50">Ladda Demo</button>
             </div>
          </div>
        )}

        {/* 3. MARKER LIST */}
        {dashboardData.length > 0 && (
          <div className="space-y-4">
             <div className="sticky top-20 z-20 bg-slate-50/95 backdrop-blur py-2">
                <div className="relative">
                   <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Sök..." className="w-full pl-5 pr-4 py-3 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-medium" />
                   {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">X</button>}
                </div>
                {statusFilter !== 'all' && (
                   <button onClick={() => setStatusFilter('all')} className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">← Visa alla markörer</button>
                )}
             </div>

             <div className="pb-20">
                {groupedData.map(([cat, markers]) => <CategoryGroup key={cat} title={cat} markers={markers} onSelectMarker={setSelectedMarkerId} />)}
                {groupedData.length === 0 && <div className="text-center text-slate-400 py-10">Inga träffar</div>}
             </div>
          </div>
        )}
      </main>

      {/* FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
         {dashboardData.length > 0 && (
            <button onClick={() => setModals(p => ({...p, import: true}))} className="w-12 h-12 bg-white rounded-full shadow-lg text-slate-600 ring-1 ring-slate-900/5 flex items-center justify-center hover:scale-105 transition-transform" title="Importera">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
         )}
         <button onClick={() => { setPrefillMarkerId(null); setModals(p => ({...p, measure: true})); }} className="w-14 h-14 bg-slate-900 rounded-full shadow-xl shadow-slate-900/30 text-white flex items-center justify-center hover:scale-105 transition-transform" title="Ny mätning">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
         </button>
      </div>

      {/* MODALS */}
      <NewMeasurementModal isOpen={modals.measure} onClose={() => {setModals(p => ({...p, measure: false})); setPrefillMarkerId(null);}} onSave={(id, v, d, n) => genericDB(supabase.from('measurements').insert({user_id:session!.user.id, marker_id:id, value:v, measured_at:d, note:n}), 'Sparat')} availableMarkers={bloodMarkers} initialMarkerId={prefillMarkerId || undefined} />
      <ImportModal isOpen={modals.import} onClose={() => setModals(p => ({...p, import: false}))} availableMarkers={bloodMarkers} onSave={async (items) => { const payload = items.map(i => ({ user_id: session!.user.id, marker_id: i.markerId, value: i.value, measured_at: i.date, note: 'Import' })); await supabase.from('measurements').insert(payload); fetchData(); showToast({type:'success', title: 'Import klart'}); }} />
      <OptimizedListModal isOpen={modals.optimized} onClose={() => setModals(p => ({...p, optimized: false}))} events={stats.optimized} />
      <JournalDrawer isOpen={modals.journal} onClose={() => setModals(p => ({...p, journal: false}))} entries={journalEntries} availableMarkers={bloodMarkers} onSave={(c,d,t) => genericDB(supabase.from('journal_entries').insert({ user_id: session!.user.id, content: c, entry_date: d, tags: t }), 'Sparat')} onDelete={(id) => genericDB(supabase.from('journal_entries').delete().eq('id', id), 'Borttagen')} />
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;