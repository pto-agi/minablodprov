
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MarkerHistory,
  Measurement,
  BloodMarker,
  OptimizationEvent,
  MarkerNote,
  MeasurementTodo,
  JournalPlan,
} from './types';
import { getStatus, safeFloat, formatNumber } from './utils';
import BloodMarkerCard from './components/BloodMarkerCard';
import DetailView from './components/DetailView';
import NewMeasurementModal from './components/NewMeasurementModal';
import StatsOverview from './components/StatsOverview';
import OptimizedListModal from './components/OptimizedListModal';
import ActionList from './components/ActionList';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import ImportModal from './components/ImportModal';
import GlobalTimelineDrawer from './components/GlobalTimelineDrawer';
import JournalHub from './components/JournalHub';
import JournalEditor from './components/JournalEditor';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

type StatusFilter = 'all' | 'attention' | 'normal';
type SortMode = 'attention' | 'recent' | 'az';

const ts = (iso?: string | null) => {
  if (!iso) return 0;
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
};

const formatDateTimeSv = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

const statusRank = (status: string | undefined) => {
  switch ((status ?? '').toLowerCase()) {
    case 'high':
    case 'low':
      return 1;
    case 'normal':
      return 4;
    default:
      return 3;
  }
};

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  type: ToastType;
  title: string;
  message?: string;
};

const humanizeSupabaseError = (err: any) => {
  const raw = (err?.message || err?.error_description || err?.hint || String(err || '')).toString();
  const code = err?.code;
  const msg = raw.trim() || 'Okänt fel';
  const lower = msg.toLowerCase();

  if (code === 'PGRST204' || (lower.includes('could not find the') && lower.includes('column'))) {
    return 'Databasfel: Tabellen saknar nödvändiga kolumner (t.ex. "title"). Vänligen kör SQL-migrationen för att uppdatera databasen.';
  }

  if (lower.includes('row level security') || lower.includes('violates row-level security')) {
    return 'Åtkomst nekad (Row Level Security). Kontrollera policies för tabellen.';
  }
  if (lower.includes('permission denied')) {
    return 'Åtkomst nekad. Kontrollera behörigheter/policies.';
  }
  if (lower.includes('foreign key')) {
    return 'Kunde inte spara (ogiltig koppling).';
  }
  if (lower.includes('duplicate key')) {
    return 'Det finns redan en post med samma värde.';
  }

  return msg;
};

const Toast: React.FC<ToastState & { onClose: () => void }> = ({ type, title, message, onClose }) => {
  const tint =
    type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92vw] max-w-md">
      <div className={cx('rounded-2xl shadow-xl ring-1 ring-black/10 px-4 py-3 flex items-start gap-3', tint)}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">{title}</div>
          {message && <div className="text-xs opacity-90 mt-1 leading-snug">{message}</div>}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
          aria-label="Stäng"
          type="button"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// --- Category accordion ---
const CategoryGroup: React.FC<{
  title: string;
  markers: MarkerHistory[];
  onSelectMarker: (id: string) => void;
}> = ({ title, markers, onSelectMarker }) => {
  const total = markers.length;
  const normalCount = markers.filter((m) => m.status === 'normal').length;
  const isAllNormal = total > 0 && normalCount === total;

  // Default collapsed as requested
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const ratio = total === 0 ? 0 : normalCount / total;

  return (
    <section className="mb-4">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={cx(
          'w-full flex items-center justify-between rounded-3xl p-5 transition-all active:scale-[0.99] relative',
          'bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm hover:bg-white',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>

            <div
              className={cx(
                'text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5',
                isAllNormal ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900',
              )}
            >
              <span className={cx('w-1.5 h-1.5 rounded-full', isAllNormal ? 'bg-emerald-500' : 'bg-amber-500')} />
              {normalCount}/{total} inom ref
            </div>

            {!isAllNormal && <div className="text-xs font-semibold text-slate-500">{total - normalCount} behöver åtgärd</div>}
          </div>

          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div
          className={cx(
            'ml-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
            'bg-slate-50 ring-1 ring-slate-900/5',
            isOpen ? 'rotate-180 bg-slate-100' : '',
          )}
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={cx('grid transition-all duration-300 ease-in-out', isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0')}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-1 pb-2">
            {markers.map((marker) => (
              <BloodMarkerCard key={marker.id} data={marker} onClick={() => onSelectMarker(marker.id)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const App: React.FC = () => {
  // Landing -> Auth flow
  const [showAuth, setShowAuth] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Navigation State
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'journal'>('dashboard');
  const [editingPlan, setEditingPlan] = useState<JournalPlan | null | 'new'>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [prefillMarkerId, setPrefillMarkerId] = useState<string | null>(null);
  const [isOptimizedModalOpen, setIsOptimizedModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false); // Global Timeline State

  // DB capability flags
  const [dbCapabilities, setDbCapabilities] = useState({
    markerNotes: true,
    todos: true,
    journal: true
  });

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((t: ToastState, autoHideMs = 4200) => {
    setToast(t);
    if (typeof window === 'undefined') return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), autoHideMs);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current && typeof window !== 'undefined') {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // Notification State for Optimized Events
  const [seenOptimizedCount, setSeenOptimizedCount] = useState<number>(0);

  const optimizedSeenKey = useMemo(() => {
    const uid = session?.user?.id;
    return uid ? `hj_seen_optimized_count:${uid}` : 'hj_seen_optimized_count:anon';
  }, [session?.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSeenOptimizedCount(Number(localStorage.getItem(optimizedSeenKey) || 0));
  }, [optimizedSeenKey]);

  // Data
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [bloodMarkers, setBloodMarkers] = useState<BloodMarker[]>([]);
  const [markerNotes, setMarkerNotes] = useState<MarkerNote[]>([]);
  const [todos, setTodos] = useState<MeasurementTodo[]>([]);
  const [journalPlans, setJournalPlans] = useState<JournalPlan[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // UX
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('attention'); // Default to attention
  const [sortMode, setSortMode] = useState<SortMode>('attention');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Auth init
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session ?? null);
      } catch (err) {
        console.warn('Supabase init warning:', err);
      } finally {
        setLoadingSession(false);
      }
    };

    initSession();

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setShowAuth(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Cmd/Ctrl + K => search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (!isCmdK) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    setLoadingData(true);
    setDataError(null);

    const userId = session.user.id;
    const missing: string[] = [];

    try {
      const [markersRes, measurementsRes, notesRes, todosRes, journalRes, journalMarkersRes] = await Promise.all([
        supabase.from('blood_markers').select('*'),
        supabase.from('measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }),
        supabase.from('marker_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('measurement_todos').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('journal_entry_markers').select('*'), // This might need filter if policy allows
      ]);

      if (markersRes.error) throw markersRes.error;
      if (measurementsRes.error) throw measurementsRes.error;

      const notesOk = !notesRes.error;
      const todosOk = !todosRes.error;
      const journalOk = !journalRes.error;

      setDbCapabilities({ markerNotes: notesOk, todos: todosOk, journal: journalOk });

      if (notesRes.error) missing.push(`marker_notes (${notesRes.error.message})`);
      if (todosRes.error) missing.push(`measurement_todos (${todosRes.error.message})`);
      // Journal table might be missing entirely if migration not run, suppress error if so for now but track it
      if (journalRes.error) console.warn("Journal table missing:", journalRes.error.message);

      const markersData = markersRes.data ?? [];
      const measureData = measurementsRes.data ?? [];
      const notesData = notesOk ? (notesRes.data ?? []) : [];
      const todosData = todosOk ? (todosRes.data ?? []) : [];
      const journalData = journalOk ? (journalRes.data ?? []) : [];
      const journalMarkersData = journalMarkersRes.data ?? [];

      const mappedMarkers: BloodMarker[] = markersData.map((m: any) => {
        const minRef = safeFloat(m.min_ref);
        const maxRef = safeFloat(m.max_ref);
        const displayMinRaw = safeFloat(m.display_min);
        const displayMaxRaw = safeFloat(m.display_max);

        const displayMin = displayMinRaw > 0 
           ? displayMinRaw 
           : (minRef > 0 ? minRef * 0.5 : maxRef > 0 ? maxRef * 0.1 : 0);

        const displayMax = displayMaxRaw > 0
           ? displayMaxRaw
           : (maxRef > 0 ? maxRef * 1.5 : (minRef > 0 ? minRef * 2 : 100));

        return {
          id: m.id,
          name: m.name,
          shortName: m.short_name || String(m.name ?? '').substring(0, 3),
          unit: m.unit,
          minRef,
          maxRef,
          category: m.category || 'Övrigt',
          description: m.description || 'Ingen beskrivning tillgänglig.',
          displayMin,
          displayMax,
          recommendationLow: m.recommendation_low ?? undefined,
          recommendationHigh: m.recommendation_high ?? undefined,
          riskLow: m.risk_low ?? undefined,
          riskHigh: m.risk_high ?? undefined,
        };
      });

      const mappedMeasurements: Measurement[] = measureData.map((item: any) => ({
        id: item.id,
        markerId: item.marker_id,
        value: safeFloat(item.value),
        date: item.measured_at,
        note: item.note ?? null,
      }));

      const mappedNotes: MarkerNote[] = notesData.map((n: any) => ({
        id: n.id,
        markerId: n.marker_id,
        note: n.note ?? '',
        date: n.created_at,
      }));

      const mappedTodos: MeasurementTodo[] = todosData.map((t: any) => {
        let ids: string[] = [];
        if (Array.isArray(t.marker_ids)) {
            ids = t.marker_ids;
        } else if (t.measurement_id) {
           const m = mappedMeasurements.find(meas => meas.id === t.measurement_id);
           if (m) ids = [m.markerId];
        }

        return {
          id: t.id,
          measurementId: t.measurement_id,
          markerIds: ids,
          task: t.task ?? '',
          done: Boolean(t.is_done),
          dueDate: t.due_date, 
          linkedJournalId: t.linked_journal_id, // New Field
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        };
      });

      const mappedPlans: JournalPlan[] = journalData.map((j: any) => {
         const linkedMarkers = journalMarkersData
            .filter((jm: any) => jm.journal_id === j.id)
            .map((jm: any) => jm.marker_id);
         
         return {
            id: j.id,
            title: j.title || '',
            content: j.content || '',
            isPinned: j.is_pinned,
            createdAt: j.created_at,
            updatedAt: j.updated_at,
            startDate: j.start_date, // Map from DB
            targetDate: j.target_date, // Map from DB
            linkedMarkerIds: linkedMarkers
         }
      });

      setBloodMarkers(mappedMarkers);
      setMeasurements(mappedMeasurements);
      setMarkerNotes(mappedNotes);
      setTodos(mappedTodos);
      setJournalPlans(mappedPlans);

      if (missing.length) {
        setDataError(
          'DB saknar tabeller/policies för vissa funktioner.\n' +
            'Kör SQL-migrationen och kontrollera RLS-policies.\n\n' +
            missing.join('\n'),
        );
      } else {
        setDataError(null);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const msg = humanizeSupabaseError(error);
      setDataError(`Kunde inte hämta data. ${msg}`);
      // När fetch failar vill vi inte felaktigt “stänga av” features
      setDbCapabilities({ markerNotes: true, todos: true, journal: true });
    } finally {
      setLoadingData(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user) fetchData();
  }, [session?.user?.id, fetchData]);

  // Realtime sync
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    const channel = supabase
      .channel(`hj:realtime:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements', filter: `user_id=eq.${userId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marker_notes', filter: `user_id=eq.${userId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurement_todos', filter: `user_id=eq.${userId}` }, fetchData)
      // Listen to journal table too if possible
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchData]);

  const measurementsByMarkerId = useMemo(() => {
    const map = new Map<string, Measurement[]>();
    for (const m of measurements) {
      const arr = map.get(m.markerId);
      if (arr) arr.push(m);
      else map.set(m.markerId, [m]);
    }
    return map;
  }, [measurements]);

  const notesByMarkerId = useMemo(() => {
    const map = new Map<string, MarkerNote[]>();
    for (const n of markerNotes) {
      const arr = map.get(n.markerId);
      if (arr) arr.push(n);
      else map.set(n.markerId, [n]);
    }
    return map;
  }, [markerNotes]);

  const dashboardData: MarkerHistory[] = useMemo(() => {
    if (bloodMarkers.length === 0) return [];

    const out: MarkerHistory[] = [];

    for (const marker of bloodMarkers) {
      const markerMeasurements = [...(measurementsByMarkerId.get(marker.id) ?? [])];
      if (markerMeasurements.length === 0) continue;

      markerMeasurements.sort((a, b) => ts(b.date) - ts(a.date));
      const latest = markerMeasurements[0];

      const markerNotesList = [...(notesByMarkerId.get(marker.id) ?? [])].sort((a, b) => ts(b.date) - ts(a.date));

      out.push({
        ...marker,
        measurements: markerMeasurements,
        notes: markerNotesList,
        latestMeasurement: latest,
        status: latest ? getStatus(latest.value, marker.minRef, marker.maxRef) : 'normal',
      });
    }

    return out;
  }, [bloodMarkers, measurementsByMarkerId, notesByMarkerId]);

  const activeTodos = useMemo(() => todos.filter(t => !t.done), [todos]);

  // Map journal plan IDs to titles for badges
  const planTitles = useMemo(() => {
     const map: Record<string, string> = {};
     journalPlans.forEach(p => map[p.id] = p.title);
     return map;
  }, [journalPlans]);

  const stats = useMemo(() => {
    const optimizedEvents: OptimizationEvent[] = [];
    const attentionMarkers: MarkerHistory[] = [];
    let normalCount = 0;

    dashboardData.forEach((marker) => {
      if (marker.status !== 'normal') {
        attentionMarkers.push(marker);
      } else {
        normalCount++;
      }

      const historyAsc = [...marker.measurements].sort((a, b) => ts(a.date) - ts(b.date));

      for (let i = 1; i < historyAsc.length; i++) {
        const prev = historyAsc[i - 1];
        const curr = historyAsc[i];

        const prevStatus = getStatus(prev.value, marker.minRef, marker.maxRef);
        const currStatus = getStatus(curr.value, marker.minRef, marker.maxRef);

        if (prevStatus !== 'normal' && currStatus === 'normal') {
          optimizedEvents.push({
            markerId: marker.id,
            markerName: marker.name,
            unit: marker.unit,
            badDate: prev.date,
            badValue: prev.value,
            badStatus: prevStatus,
            goodDate: curr.date,
            goodValue: curr.value,
          });
        }
      }
    });

    optimizedEvents.sort((a, b) => ts(b.goodDate) - ts(a.goodDate));
    attentionMarkers.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate Coverage
    // How many attention markers have at least one active todo linked to them?
    const coveredAttentionCount = attentionMarkers.filter(marker => 
        activeTodos.some(todo => todo.markerIds.includes(marker.id))
    ).length;

    return { 
      optimizedEvents, 
      attentionMarkers, 
      normalCount, 
      totalCount: dashboardData.length,
      coveredAttentionCount
    };
  }, [dashboardData, activeTodos]);

  const selectedMarkerData = useMemo(
    () => dashboardData.find((d) => d.id === selectedMarkerId),
    [dashboardData, selectedMarkerId],
  );

  const filteredDashboardData = useMemo(() => {
    const q = query.trim().toLowerCase();

    const byQuery = q
      ? dashboardData.filter((m) => {
          const haystack = `${m.name} ${m.shortName} ${m.category} ${m.unit}`.toLowerCase();
          return haystack.includes(q);
        })
      : dashboardData;

    const byStatus =
      statusFilter === 'all'
        ? byQuery
        : statusFilter === 'attention'
          ? byQuery.filter((m) => m.status !== 'normal')
          : byQuery.filter((m) => m.status === 'normal');

    const sorted = [...byStatus];

    if (sortMode === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    } else if (sortMode === 'recent') {
      sorted.sort((a, b) => ts(b.latestMeasurement?.date) - ts(a.latestMeasurement?.date));
    } else {
      sorted.sort((a, b) => {
        const s = statusRank(a.status) - statusRank(b.status);
        if (s !== 0) return s;
        const rec = ts(b.latestMeasurement?.date) - ts(a.latestMeasurement?.date);
        if (rec !== 0) return rec;
        return a.name.localeCompare(b.name, 'sv');
      });
    }

    return sorted;
  }, [dashboardData, query, statusFilter, sortMode]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, MarkerHistory[]>();

    for (const marker of filteredDashboardData) {
      const category = marker.category || 'Övrigt';
      const arr = groups.get(category);
      if (arr) arr.push(marker);
      else groups.set(category, [marker]);
    }

    const entries = Array.from(groups.entries()).map(([category, markers]) => {
      const attentionCount = markers.filter((m) => m.status !== 'normal').length;
      return { category, markers, attentionCount };
    });

    entries.sort((a, b) => {
      return a.category.localeCompare(b.category, 'sv');
    });

    return entries;
  }, [filteredDashboardData]);

  // Notification Logic for Optimized Events
  const totalOptimizedCount = stats.optimizedEvents.length;
  // If user has seen fewer than current total, the difference is "new"
  const newOptimizedCount = Math.max(0, totalOptimizedCount - seenOptimizedCount);

  const handleOpenOptimizedEvents = () => {
    setIsOptimizedModalOpen(true);
    // Mark as seen
    setSeenOptimizedCount(totalOptimizedCount);
    localStorage.setItem(optimizedSeenKey, String(totalOptimizedCount));
  };

  // -----------------------------
  // UX Handlers
  // -----------------------------
  const handleAttentionClick = useCallback(() => {
    setStatusFilter('attention');
    const el = document.getElementById('marker-list-top');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // -----------------------------
  // Writes (DB-only)
  // -----------------------------
  // ... (Other handlers unchanged) ...
  const handleSaveMeasurement = useCallback(
    async (markerId: string, value: number, date: string, note?: string) => {
      if (!session?.user) return;

      try {
        const payload: any = {
          user_id: session.user.id,
          marker_id: markerId,
          value,
          measured_at: date,
          note: note?.trim() ? note.trim() : null,
        };

        const { error } = await supabase.from('measurements').insert([payload]);
        if (error) throw error;

        await fetchData();
        showToast({ type: 'success', title: 'Sparat', message: 'Mätningen är sparad.' });
      } catch (err) {
        console.error('Error saving measurement:', err);
        showToast({ type: 'error', title: 'Kunde inte spara mätningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleDeleteMeasurement = useCallback(
    async (measurementId: string) => {
      if (!session?.user) return;

      try {
        const { error } = await supabase
          .from('measurements')
          .delete()
          .eq('id', measurementId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Borttaget', message: 'Mätningen togs bort.' });
      } catch (err) {
        console.error('Error deleting measurement:', err);
        showToast({ type: 'error', title: 'Kunde inte ta bort mätningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleUpdateMeasurement = useCallback(
    async (measurementId: string, value: number, date: string) => {
      if (!session?.user) return;

      try {
        const { error } = await supabase
          .from('measurements')
          .update({ value: value, measured_at: date })
          .eq('id', measurementId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Uppdaterat', message: 'Mätningen är uppdaterad.' });
      } catch (err) {
        console.error('Error updating measurement:', err);
        showToast({ type: 'error', title: 'Kunde inte uppdatera mätningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleBulkSaveMeasurements = useCallback(
    async (items: Array<{ markerId: string; value: number; date: string }>) => {
      if (!session?.user) return;
      if (items.length === 0) return;

      try {
        const payload = items.map((item) => ({
          user_id: session.user.id,
          marker_id: item.markerId,
          value: item.value,
          measured_at: item.date,
          note: 'Importerat via AI',
        }));

        const { error } = await supabase.from('measurements').insert(payload);
        if (error) throw error;

        await fetchData();
        showToast({ type: 'success', title: 'Import klart', message: 'Mätningarna är sparade.' });
      } catch (err) {
        console.error('Error bulk saving measurements:', err);
        showToast({ type: 'error', title: 'Kunde inte importera', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleCreateMarkerNote = useCallback(
    async (markerId: string, note: string) => {
      if (!session?.user) return;

      if (!dbCapabilities.markerNotes) {
        showToast({
          type: 'error',
          title: 'Anteckningar är inte aktiverade',
          message: 'Tabellen/policys för marker_notes saknas i databasen.',
        });
        return;
      }

      const clean = note.trim();
      if (!clean) return;

      try {
        const { error } = await supabase.from('marker_notes').insert([
          { user_id: session.user.id, marker_id: markerId, note: clean },
        ]);
        if (error) throw error;

        await fetchData();
        showToast({ type: 'success', title: 'Sparat', message: 'Anteckningen är sparad.' });
      } catch (err) {
        console.error('Error creating marker note:', err);
        showToast({ type: 'error', title: 'Kunde inte spara anteckningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast, dbCapabilities.markerNotes],
  );

  const handleUpdateMarkerNote = useCallback(
    async (noteId: string, note: string) => {
      if (!session?.user) return;

      if (!dbCapabilities.markerNotes) {
        showToast({
          type: 'error',
          title: 'Anteckningar är inte aktiverade',
          message: 'Tabellen/policys för marker_notes saknas i databasen.',
        });
        return;
      }

      const clean = note.trim();

      try {
        const { error } = await supabase
          .from('marker_notes')
          .update({ note: clean })
          .eq('id', noteId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Uppdaterat', message: 'Anteckningen är uppdaterad.' });
      } catch (err) {
        console.error('Error updating marker note:', err);
        showToast({ type: 'error', title: 'Kunde inte uppdatera anteckningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast, dbCapabilities.markerNotes],
  );

  const handleDeleteMarkerNote = useCallback(
    async (noteId: string) => {
      if (!session?.user) return;

      if (!dbCapabilities.markerNotes) {
        showToast({
          type: 'error',
          title: 'Anteckningar är inte aktiverade',
          message: 'Tabellen/policys för marker_notes saknas i databasen.',
        });
        return;
      }

      try {
        const { error } = await supabase
          .from('marker_notes')
          .delete()
          .eq('id', noteId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Borttaget', message: 'Anteckningen är borttagen.' });
      } catch (err) {
        console.error('Error deleting marker note:', err);
        showToast({ type: 'error', title: 'Kunde inte ta bort anteckningen', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast, dbCapabilities.markerNotes],
  );

  const handleUpdateMeasurementNote = useCallback(
    async (measurementId: string, noteOrNull: string | null) => {
      if (!session?.user) return;

      const value = noteOrNull?.trim() ? noteOrNull.trim() : null;

      try {
        const { error } = await supabase
          .from('measurements')
          .update({ note: value })
          .eq('id', measurementId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Sparat', message: 'Kommentaren är sparad.' });
      } catch (err) {
        console.error('Error updating measurement note:', err);
        showToast({ type: 'error', title: 'Kunde inte spara kommentaren', message: humanizeSupabaseError(err) });
        throw err;
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleAddTodo = useCallback(
    async (task: string, journalId?: string) => { // Updated sig to support journals
      if (!session?.user) return;

      const clean = task.trim();
      if (!clean) return;

      try {
        const payload: any = { 
            user_id: session.user.id, 
            task: clean,
            marker_ids: [] // Default empty
        };
        
        if (journalId) payload.linked_journal_id = journalId;

        const { error } = await supabase.from('measurement_todos').insert([payload]);
        if (error) throw error;

        await fetchData();
        showToast({ type: 'success', title: 'Sparat', message: 'Uppgiften är sparad.' });
      } catch (err) {
        console.error('Error adding todo:', err);
        showToast({ type: 'error', title: 'Kunde inte spara', message: humanizeSupabaseError(err) });
      }
    },
    [session?.user, fetchData, showToast, dbCapabilities.todos],
  );

  // Wrapper for the simpler marker-based add todo
  const handleAddTodoMarker = useCallback(async (markerId: string, task: string) => {
      if (!session?.user) return;
      try {
        const { error } = await supabase.from('measurement_todos').insert([{
            user_id: session.user.id,
            task: task.trim(),
            marker_ids: [markerId]
        }]);
        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Sparat', message: 'Uppgiften är sparad.' });
      } catch (err) {
          showToast({ type: 'error', title: 'Fel', message: String(err) });
      }
  }, [session?.user, fetchData, showToast]);

  const handleUpdateTodoTags = useCallback(
    async (todoId: string, markerIds: string[]) => {
      if (!session?.user) return;
      try {
         const { error } = await supabase
           .from('measurement_todos')
           .update({ marker_ids: markerIds })
           .eq('id', todoId)
           .eq('user_id', session.user.id);
         
         if(error) throw error;
         await fetchData();
      } catch (err) {
         console.error(err);
         showToast({ type:'error', title:'Kunde inte uppdatera taggar', message: humanizeSupabaseError(err) });
      }
    },
    [session?.user, fetchData, showToast]
  );

  const handleToggleTodo = useCallback(
    async (todoId: string, done: boolean) => {
      if (!session?.user) return;

      try {
        const { error } = await supabase
          .from('measurement_todos')
          .update({ is_done: done })
          .eq('id', todoId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
      } catch (err) {
        console.error('Error toggling todo:', err);
        showToast({ type: 'error', title: 'Kunde inte uppdatera', message: humanizeSupabaseError(err) });
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleUpdateTodoTask = useCallback(
    async (todoId: string, task: string, dueDate: string | null) => {
      if (!session?.user) return;
      try {
        const { error } = await supabase
          .from('measurement_todos')
          .update({ task: task.trim(), due_date: dueDate })
          .eq('id', todoId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Uppdaterat', message: 'Uppgiften är uppdaterad.' });
      } catch (err) {
        console.error('Error updating todo:', err);
        showToast({ type: 'error', title: 'Kunde inte uppdatera', message: humanizeSupabaseError(err) });
      }
    },
    [session?.user, fetchData, showToast],
  );

  const handleDeleteTodo = useCallback(
    async (todoId: string) => {
      if (!session?.user) return;
      try {
        const { error } = await supabase
          .from('measurement_todos')
          .delete()
          .eq('id', todoId)
          .eq('user_id', session.user.id);

        if (error) throw error;
        await fetchData();
        showToast({ type: 'success', title: 'Borttaget', message: 'Uppgiften är borttagen.' });
      } catch (err) {
        console.error('Error deleting todo:', err);
        showToast({ type: 'error', title: 'Kunde inte ta bort', message: humanizeSupabaseError(err) });
      }
    },
    [session?.user, fetchData, showToast],
  );

  // --- JOURNAL ACTIONS ---
  const handleSaveJournalPlan = useCallback(async (title: string, content: string, markerIds: string[], startDate?: string, targetDate?: string) => {
      if (!session?.user) throw new Error("No user");
      
      try {
        const isNew = editingPlan === 'new';
        const id = isNew ? undefined : (editingPlan as JournalPlan).id;

        let savedId = id;

        // 1. Upsert Plan
        const payload: any = {
            user_id: session.user.id,
            title,
            content,
            start_date: startDate || null,
            target_date: targetDate || null,
            updated_at: new Date().toISOString()
        };
        if (id) payload.id = id;

        const { data, error } = await supabase
          .from('journal_entries')
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        savedId = data.id;

        // 2. Sync Markers (Delete old, insert new - simpler than diffing)
        // Only do this if markers changed or it's new. For simplicity, we just redo it.
        if (savedId) {
            await supabase.from('journal_entry_markers').delete().eq('journal_id', savedId);
            if (markerIds.length > 0) {
                await supabase.from('journal_entry_markers').insert(
                    markerIds.map(mid => ({ journal_id: savedId, marker_id: mid }))
                );
            }
        }

        await fetchData();
        
        // Update editingPlan state so UI knows we are editing a saved plan now
        if (editingPlan) {
            setEditingPlan({
                id: data.id,
                title: data.title,
                content: data.content,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                startDate: data.start_date,
                targetDate: data.target_date,
                isPinned: data.is_pinned,
                linkedMarkerIds: markerIds
            });
        }

        showToast({ type: 'success', title: 'Plan sparad', message: 'Din plan har uppdaterats.' });
        return savedId as string;
      } catch (err: any) {
        console.error('Error saving plan:', err);
        showToast({ type: 'error', title: 'Kunde inte spara', message: humanizeSupabaseError(err) });
        throw err;
      }
  }, [session?.user, editingPlan, fetchData, showToast]);

  const handleDeleteJournalPlan = useCallback(async (id: string) => {
      if (!session?.user) return;
      try {
          const { error } = await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', session.user.id);
          if (error) throw error;
          await fetchData();
          showToast({ type: 'success', title: 'Plan borttagen', message: 'Din plan är borta.' });
      } catch (err) {
          console.error(err);
          showToast({ type: 'error', title: 'Fel', message: 'Kunde inte ta bort planen' });
      }
  }, [session?.user, fetchData, showToast]);


  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setMeasurements([]);
      setBloodMarkers([]);
      setMarkerNotes([]);
      setTodos([]);
      setJournalPlans([]);
      setSelectedMarkerId(null);
      setShowAuth(false);
      setSeenOptimizedCount(0);
      setDbCapabilities({ markerNotes: true, todos: true, journal: true });
      setToast(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // --- Render ---
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!session) {
    if (showAuth) return <Auth />;
    
    return (
      <LandingPage
        onStart={() => setShowAuth(true)}
        onLogin={() => setShowAuth(true)}
      />
    );
  }

  // --- EDITOR VIEW (Full Screen) ---
  if (editingPlan) {
      const plan = editingPlan === 'new' ? null : editingPlan;
      // Filter linked todos
      const linked = plan ? todos.filter(t => t.linkedJournalId === plan.id) : [];

      return (
          <JournalEditor 
             plan={plan}
             allMarkers={dashboardData} // IMPORTANT: Passing full history data for status check
             linkedTodos={linked}
             onClose={() => setEditingPlan(null)}
             onSave={handleSaveJournalPlan}
             onDelete={handleDeleteJournalPlan} // Passed here
             onAddTodo={(task, jId) => handleAddTodo(task, jId)}
             onToggleTodo={handleToggleTodo}
             onDeleteTodo={handleDeleteTodo}
             onUpdateTodoTask={handleUpdateTodoTask}
          />
      );
  }

  // --- MARKER DETAIL VIEW ---
  if (selectedMarkerId) {
    if (!selectedMarkerData) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto" />
            <p className="mt-3 text-sm text-slate-600">Laddar...</p>
            <button
              onClick={() => setSelectedMarkerId(null)}
              className="mt-6 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50"
            >
              Tillbaka
            </button>
          </div>
        </div>
      );
    }

    const todosForMarker = todos.filter(t => t.markerIds.includes(selectedMarkerId));

    return (
      <DetailView
        data={selectedMarkerData}
        onBack={() => setSelectedMarkerId(null)}
        onAddMeasurement={(markerId) => {
          setPrefillMarkerId(markerId);
          setIsModalOpen(true);
        }}
        onSaveNote={handleCreateMarkerNote}
        onUpdateNote={handleUpdateMarkerNote}
        onDeleteNote={handleDeleteMarkerNote}
        onUpdateMeasurementNote={handleUpdateMeasurementNote}
        todos={todosForMarker}
        onAddTodo={handleAddTodoMarker}
        onToggleTodo={handleToggleTodo}
        onUpdateTodo={handleUpdateTodoTask}
        onDeleteTodo={handleDeleteTodo}
        onDeleteMeasurement={handleDeleteMeasurement}
        onUpdateMeasurement={handleUpdateMeasurement}
        allMarkers={bloodMarkers}
        onUpdateTags={handleUpdateTodoTags}
      />
    );
  }

  const hasAnyTrackedData = dashboardData.length > 0;
  const hasFilteredResults = filteredDashboardData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-24 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 right-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-emerald-200/55 to-cyan-200/35 blur-3xl" />
        <div className="absolute -bottom-56 left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-indigo-200/45 to-violet-200/35 blur-3xl" />
      </div>

      <header className="border-b border-slate-200/70 sticky top-0 z-30 bg-white/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-extrabold shadow-sm">
              <span className="font-display tracking-tight">BW</span>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/15" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-lg sm:text-xl font-display font-bold text-slate-900 tracking-tight leading-tight">
                bloodwork.se
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
                Biomarker dashboard • <span className="font-mono">pro</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* VIEW SWITCHER */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
               <button 
                 onClick={() => setView('dashboard')}
                 className={cx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", view === 'dashboard' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900")}
               >
                 Översikt
               </button>
               <button 
                 onClick={() => setView('journal')}
                 className={cx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", view === 'journal' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900")}
               >
                 Journal
               </button>
            </div>

            {/* Timeline Button */}
            <button
              onClick={() => setIsTimelineOpen(true)}
              className="w-10 h-10 rounded-full bg-white/70 hover:bg-white flex items-center justify-center ring-1 ring-slate-900/10 transition-colors"
              title="Händelselogg"
            >
               <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loadingData}
              className={cx(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                'bg-white/70 ring-1 ring-slate-900/10 hover:bg-white',
                loadingData && 'opacity-70 cursor-not-allowed',
              )}
              title="Uppdatera"
              aria-label="Uppdatera"
            >
              {loadingData ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900" />
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7 9 9 0 00-14-7" />
                </svg>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-full bg-white/70 hover:bg-white flex items-center justify-center ring-1 ring-slate-900/10 transition-colors"
              title="Logga ut"
              aria-label="Logga ut"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 relative" id="marker-list-top">
        
        {/* DATA / DB WARNINGS */}
        {dataError && (
          <div className="mb-5 px-1">
            <div className="rounded-3xl bg-amber-50 ring-1 ring-amber-900/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white ring-1 ring-amber-900/10 flex items-center justify-center">
                  <span className="text-amber-700 font-extrabold">!</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-amber-900">Begränsad funktionalitet</div>
                  <div className="text-xs text-amber-900/80 mt-1 whitespace-pre-line">{dataError}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'journal' ? (
           // JOURNAL VIEW
           <JournalHub 
              plans={journalPlans} 
              markers={bloodMarkers} 
              onOpenPlan={(p) => setEditingPlan(p || 'new')} 
           />
        ) : (
           // DASHBOARD VIEW
           <>
              {!loadingData && hasAnyTrackedData && (
                <StatsOverview
                  totalMarkers={stats.totalCount}
                  normalCount={stats.normalCount}
                  attentionMarkers={stats.attentionMarkers}
                  optimizedCount={stats.optimizedEvents.length}
                  coveredAttentionCount={stats.coveredAttentionCount}
                  onOptimizedClick={handleOpenOptimizedEvents}
                  onAttentionClick={handleAttentionClick}
                  newOptimizedCount={newOptimizedCount}
                />
              )}
              
              {!loadingData && activeTodos.length > 0 && (
                <ActionList 
                  todos={activeTodos}
                  availableMarkers={bloodMarkers}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                  onTagClick={setSelectedMarkerId}
                  planTitles={planTitles}
                />
              )}

              <section className="mb-6 px-1 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                  <div className="relative flex-1">
                     <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                     <input
                        ref={searchRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Sök markör..."
                        className="w-full h-11 rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                     />
                     {query && (
                       <button 
                         onClick={() => setQuery('')}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                       >
                         <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                         </svg>
                       </button>
                     )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                     <button
                        onClick={() => setStatusFilter('attention')}
                        className={cx(
                           'px-4 h-11 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5',
                           statusFilter === 'attention' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-900/10 hover:bg-slate-50'
                        )}
                     >
                        Avvikande
                        {stats.attentionMarkers.length > 0 && (
                          <span className={cx("px-1.5 py-0.5 rounded-full text-[10px]", statusFilter === 'attention' ? 'bg-black/20 text-white' : 'bg-amber-100 text-amber-800')}>
                            {stats.attentionMarkers.length}
                          </span>
                        )}
                     </button>

                     <button
                        onClick={() => setStatusFilter('all')}
                        className={cx(
                           'px-4 h-11 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors',
                           statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-900/10 hover:bg-slate-50'
                        )}
                     >
                        Alla värden
                     </button>

                     <div className="w-px bg-slate-300 mx-1 h-6 self-center" />
                     <select
                       value={sortMode}
                       onChange={(e) => setSortMode(e.target.value as SortMode)}
                       className="h-11 rounded-2xl bg-white ring-1 ring-slate-900/10 px-4 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900"
                     >
                       <option value="attention">Viktigast</option>
                       <option value="recent">Senast</option>
                       <option value="az">A–Ö</option>
                     </select>
                  </div>
              </section>

              {loadingData ? (
                <div className="py-10 flex justify-center">
                  <div className="animate-pulse flex flex-col items-center w-full max-w-2xl">
                    <div className="h-4 w-44 bg-slate-200 rounded mb-4" />
                    <div className="h-24 w-full bg-slate-200 rounded-3xl" />
                    <div className="h-24 w-full bg-slate-200 rounded-3xl mt-3" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {!hasAnyTrackedData ? (
                    <div className="py-10 px-1">
                      {/* Empty state content ... same as before ... */}
                      <div className="rounded-[2rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                          <div className="min-w-0">
                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                              Kom igång med din första provtagning
                            </h3>
                            <p className="text-slate-600 mt-2 text-sm max-w-xl">
                              Importera ett provsvar (snabbast) eller lägg in värden manuellt.
                            </p>
                            <div className="mt-5 grid sm:grid-cols-3 gap-3 max-w-2xl">
                              {[
                                { t: '1) Importera', d: 'Klistra in/adda provsvar' },
                                { t: '2) Se status', d: 'Avvikande vs inom ref' },
                                { t: '3) Följ trenden', d: 'Se förbättring över tid' },
                              ].map((x) => (
                                <div key={x.t} className="rounded-3xl bg-white ring-1 ring-slate-900/5 shadow-sm p-4">
                                  <div className="text-sm font-bold text-slate-900 tracking-tight">{x.t}</div>
                                  <div className="text-xs text-slate-500 mt-1">{x.d}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 w-full sm:w-[16rem]">
                            <button onClick={() => setIsImportModalOpen(true)} className="w-full rounded-full px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10">Importera provsvar</button>
                            <button onClick={() => { setPrefillMarkerId(null); setIsModalOpen(true); }} className="w-full rounded-full px-5 py-3 text-sm font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50">Lägg till manuellt</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !hasFilteredResults ? (
                     statusFilter === 'attention' && !query ? (
                        <div className="text-center py-16 px-4 animate-in fade-in slide-in-from-bottom-4">
                           <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           </div>
                           <h3 className="text-lg font-bold text-slate-900">Inga avvikelser!</h3>
                           <p className="text-slate-600 mt-1 text-sm">Alla dina registrerade värden ligger inom referensintervallet.</p>
                           <button onClick={() => setStatusFilter('all')} className="mt-6 px-6 py-3 bg-slate-900 rounded-full text-sm font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800">Visa alla värden</button>
                        </div>
                     ) : (
                        <div className="text-center py-16 px-4">
                          <h3 className="text-lg font-bold text-slate-900">Inga träffar</h3>
                          <button onClick={() => { setQuery(''); setStatusFilter('all'); }} className="mt-4 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200">Rensa filter</button>
                        </div>
                     )
                  ) : (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {statusFilter === 'all' ? (
                        groupedData.map(({ category, markers }) => (
                          <CategoryGroup key={category} title={category} markers={markers} onSelectMarker={setSelectedMarkerId} />
                        ))
                      ) : (
                        <div className="flex flex-col gap-3 px-1">
                          {filteredDashboardData.map(marker => (
                             <BloodMarkerCard key={marker.id} data={marker} onClick={() => setSelectedMarkerId(marker.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
           </>
        )}
      </main>
      
      {/* ... FABs ... */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
        {/* Bulk Import Button */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          disabled={bloodMarkers.length === 0}
          className={cx(
            'rounded-full p-4 pr-6 shadow-xl transition-all active:scale-95 flex items-center gap-2',
            'bg-white text-slate-900 hover:bg-slate-50 shadow-slate-900/10',
            'ring-1 ring-slate-900/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="font-semibold text-sm">Importera svar</span>
        </button>

        {/* New Measurement Button */}
        <button
          onClick={() => {
            setPrefillMarkerId(null);
            setIsModalOpen(true);
          }}
          disabled={bloodMarkers.length === 0}
          className={cx(
            'rounded-full p-4 pr-6 shadow-xl transition-all active:scale-95 flex items-center gap-2',
            'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20',
            'ring-1 ring-slate-700/70',
            'disabled:bg-slate-500 disabled:cursor-not-allowed disabled:ring-0',
          )}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="font-semibold">Ny mätning</span>
        </button>
      </div>

      <NewMeasurementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPrefillMarkerId(null);
        }}
        onSave={handleSaveMeasurement}
        availableMarkers={bloodMarkers}
        initialMarkerId={prefillMarkerId ?? undefined}
      />
      
      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        availableMarkers={bloodMarkers}
        onSave={handleBulkSaveMeasurements}
      />

      <OptimizedListModal
        isOpen={isOptimizedModalOpen}
        onClose={() => setIsOptimizedModalOpen(false)}
        events={stats.optimizedEvents}
      />

      <GlobalTimelineDrawer 
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        measurements={measurements}
        notes={markerNotes}
        markers={bloodMarkers}
        onSelectMarker={setSelectedMarkerId}
      />
    
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
</div>
  );
};

export default App;
