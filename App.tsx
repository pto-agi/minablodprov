
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MarkerHistory,
  Measurement,
  BloodMarker,
  OptimizationEvent,
  MarkerNote,
  MeasurementTodo,
} from './types';
import { getStatus } from './utils';
import BloodMarkerCard from './components/BloodMarkerCard';
import DetailView from './components/DetailView';
import NewMeasurementModal from './components/NewMeasurementModal';
import StatsOverview from './components/StatsOverview';
import OptimizedListModal from './components/OptimizedListModal';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import ImportModal from './components/ImportModal';
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

// --- Category accordion ---
const CategoryGroup: React.FC<{
  title: string;
  markers: MarkerHistory[];
  onSelectMarker: (id: string) => void;
}> = ({ title, markers, onSelectMarker }) => {
  const total = markers.length;
  const normalCount = markers.filter((m) => m.status === 'normal').length;
  const isAllNormal = total > 0 && normalCount === total;

  const initialOpen = useMemo(() => !isAllNormal, [isAllNormal]);
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);

  useEffect(() => setIsOpen(initialOpen), [initialOpen]);

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
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [prefillMarkerId, setPrefillMarkerId] = useState<string | null>(null);
  const [isOptimizedModalOpen, setIsOptimizedModalOpen] = useState(false);

  // Data
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [bloodMarkers, setBloodMarkers] = useState<BloodMarker[]>([]);
  const [markerNotes, setMarkerNotes] = useState<MarkerNote[]>([]);
  const [todos, setTodos] = useState<MeasurementTodo[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // UX
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
      const [markersRes, measurementsRes, notesRes, todosRes] = await Promise.all([
        supabase.from('blood_markers').select('*'),
        supabase.from('measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }),
        supabase.from('marker_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('measurement_todos').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      ]);

      if (markersRes.error) throw markersRes.error;
      if (measurementsRes.error) throw measurementsRes.error;

      // Notes/todos may be missing tables before SQL has run
      if (notesRes.error) missing.push(`marker_notes (${notesRes.error.message})`);
      if (todosRes.error) missing.push(`measurement_todos (${todosRes.error.message})`);

      const markersData = markersRes.data ?? [];
      const measureData = measurementsRes.data ?? [];
      const notesData = notesRes.data ?? [];
      const todosData = todosRes.data ?? [];

      const mappedMarkers: BloodMarker[] = markersData.map((m: any) => {
        const minRef = Number(m.min_ref);
        const maxRef = Number(m.max_ref);

        const safeMinRef = Number.isFinite(minRef) ? minRef : 0;
        const safeMaxRef = Number.isFinite(maxRef) ? maxRef : 0;

        const displayMin = m.display_min ?? (safeMinRef !== 0 ? safeMinRef * 0.5 : safeMaxRef * 0.5);
        const displayMax = m.display_max ?? (safeMaxRef !== 0 ? safeMaxRef * 1.5 : safeMinRef * 1.5 || 1);

        return {
          id: m.id,
          name: m.name,
          shortName: m.short_name || String(m.name ?? '').substring(0, 3),
          unit: m.unit,
          minRef: safeMinRef,
          maxRef: safeMaxRef,
          category: m.category || 'Övrigt',
          description: m.description || 'Ingen beskrivning tillgänglig.',
          displayMin,
          displayMax,
        };
      });

      const mappedMeasurements: Measurement[] = measureData.map((item: any) => ({
        id: item.id,
        markerId: item.marker_id,
        value: Number(item.value),
        date: item.measured_at,
        note: item.note ?? null,
      }));

      const mappedNotes: MarkerNote[] = notesData.map((n: any) => ({
        id: n.id,
        markerId: n.marker_id,
        note: n.note ?? '',
        date: n.created_at,
      }));

      const mappedTodos: MeasurementTodo[] = todosData.map((t: any) => ({
        id: t.id,
        measurementId: t.measurement_id,
        task: t.task ?? '',
        done: Boolean(t.is_done),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      setBloodMarkers(mappedMarkers);
      setMeasurements(mappedMeasurements);
      setMarkerNotes(missing.length ? [] : mappedNotes);
      setTodos(missing.length ? [] : mappedTodos);

      if (missing.length) {
        setDataError(
          'DB saknar tabeller/policies för pro-funktioner.\n' +
            'Kör SQL-migrationen (marker_notes + measurement_todos) och ladda om.\n\n' +
            missing.join('\n'),
        );
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setDataError('Kunde inte hämta data. Kontrollera anslutningen och att RLS/policies är korrekt.');
    } finally {
      setLoadingData(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) fetchData();
  }, [session?.user, fetchData]);

  // Realtime sync
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    const channel = supabase
      .channel(`hj:realtime:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements', filter: `user_id=eq.${userId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marker_notes', filter: `user_id=eq.${userId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurement_todos', filter: `user_id=eq.${userId}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, fetchData]);

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

  const todosByMeasurementId = useMemo(() => {
    const map = new Map<string, MeasurementTodo[]>();
    for (const t of todos) {
      const arr = map.get(t.measurementId);
      if (arr) arr.push(t);
      else map.set(t.measurementId, [t]);
    }
    return map;
  }, [todos]);

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

  const stats = useMemo(() => {
    const optimizedEvents: OptimizationEvent[] = [];
    let toOptimizeCount = 0;

    dashboardData.forEach((marker) => {
      if (marker.status !== 'normal') toOptimizeCount++;

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
    return { optimizedEvents, toOptimizeCount };
  }, [dashboardData]);

  const selectedMarkerData = useMemo(
    () => dashboardData.find((d) => d.id === selectedMarkerId),
    [dashboardData, selectedMarkerId],
  );

  const dashboardSummary = useMemo(() => {
    const total = dashboardData.length;
    const normal = dashboardData.filter((m) => m.status === 'normal').length;
    const attention = total - normal;

    let lastIso: string | null = null;
    for (const m of measurements) {
      if (!m?.date) continue;
      if (!lastIso || ts(m.date) > ts(lastIso)) lastIso = m.date;
    }

    return { total, normal, attention, lastIso };
  }, [dashboardData, measurements]);

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
      if (a.attentionCount !== b.attentionCount) return b.attentionCount - a.attentionCount;
      return a.category.localeCompare(b.category, 'sv');
    });

    return entries;
  }, [filteredDashboardData]);

  // -----------------------------
  // Writes (DB-only)
  // -----------------------------
  const handleSaveMeasurement = useCallback(
    async (markerId: string, value: number, date: string, note?: string) => {
      if (!session?.user) return;

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
    },
    [session?.user, fetchData],
  );

  const handleBulkSaveMeasurements = useCallback(
    async (items: Array<{ markerId: string; value: number; date: string }>) => {
      if (!session?.user) return;
      if (items.length === 0) return;

      const payload = items.map(item => ({
        user_id: session.user.id,
        marker_id: item.markerId,
        value: item.value,
        measured_at: item.date,
        note: 'Importerat via AI',
      }));

      const { error } = await supabase.from('measurements').insert(payload);
      if (error) throw error;

      await fetchData();
    },
    [session?.user, fetchData]
  );

  const handleCreateMarkerNote = useCallback(
    async (markerId: string, note: string) => {
      if (!session?.user) return;

      const clean = note.trim();
      if (!clean) return;

      const { error } = await supabase.from('marker_notes').insert([
        { user_id: session.user.id, marker_id: markerId, note: clean },
      ]);
      if (error) throw error;

      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleUpdateMarkerNote = useCallback(
    async (noteId: string, note: string) => {
      if (!session?.user) return;
      const clean = note.trim();

      const { error } = await supabase
        .from('marker_notes')
        .update({ note: clean })
        .eq('id', noteId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleDeleteMarkerNote = useCallback(
    async (noteId: string) => {
      if (!session?.user) return;

      const { error } = await supabase
        .from('marker_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleUpdateMeasurementNote = useCallback(
    async (measurementId: string, noteOrNull: string | null) => {
      if (!session?.user) return;

      const value = noteOrNull?.trim() ? noteOrNull.trim() : null;

      const { error } = await supabase
        .from('measurements')
        .update({ note: value })
        .eq('id', measurementId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleAddTodo = useCallback(
    async (measurementId: string, task: string) => {
      if (!session?.user) return;
      const clean = task.trim();
      if (!clean) return;

      const { error } = await supabase.from('measurement_todos').insert([
        { user_id: session.user.id, measurement_id: measurementId, task: clean },
      ]);
      if (error) throw error;

      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleToggleTodo = useCallback(
    async (todoId: string, done: boolean) => {
      if (!session?.user) return;

      const { error } = await supabase
        .from('measurement_todos')
        .update({ is_done: done })
        .eq('id', todoId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleUpdateTodo = useCallback(
    async (todoId: string, task: string) => {
      if (!session?.user) return;
      const clean = task.trim();
      if (!clean) return;

      const { error } = await supabase
        .from('measurement_todos')
        .update({ task: clean })
        .eq('id', todoId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleDeleteTodo = useCallback(
    async (todoId: string) => {
      if (!session?.user) return;

      const { error } = await supabase
        .from('measurement_todos')
        .delete()
        .eq('id', todoId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      await fetchData();
    },
    [session?.user, fetchData],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMeasurements([]);
    setBloodMarkers([]);
    setMarkerNotes([]);
    setTodos([]);
    setSelectedMarkerId(null);
    setShowAuth(false);
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
    return showAuth ? (
      <Auth />
    ) : (
      <LandingPage
        onStart={() => setShowAuth(true)}
        onLogin={() => setShowAuth(true)}
      />
    );
  }

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

    const latestId = selectedMarkerData.latestMeasurement?.id ?? null;
    const todosForLatest = latestId ? (todosByMeasurementId.get(latestId) ?? []) : [];

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
        todos={todosForLatest}
        onAddTodo={handleAddTodo}
        onToggleTodo={handleToggleTodo}
        onUpdateTodo={handleUpdateTodo}
        onDeleteTodo={handleDeleteTodo}
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
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-extrabold shadow-sm">
              <span className="font-display tracking-tight">HJ</span>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/15" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-display font-bold text-slate-900 tracking-tight leading-tight">
                HälsoJournalen
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
                Biomarker dashboard • <span className="font-mono">pro</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-white/70 ring-1 ring-slate-900/10 px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-700 font-semibold truncate max-w-[260px]">{session.user.email}</span>
            </div>

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

      <main className="max-w-3xl mx-auto px-4 pt-6 relative">
        <section className="mb-6 px-1">
          <div className="rounded-3xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Dina värden</h2>
                <p className="text-slate-600 text-sm mt-1">Sök, prioritera och följ upp med en tight interventionsloop.</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 ring-1 ring-slate-900/5 px-3 py-1.5">
                    <span className="text-[11px] text-slate-500 font-semibold">Spårade</span>
                    <span className="text-sm font-extrabold text-slate-900">{dashboardSummary.total}</span>
                  </div>

                  <button
                    onClick={() => setStatusFilter('attention')}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-50 ring-1 ring-amber-900/10 px-3 py-1.5 hover:bg-amber-100 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] text-amber-900 font-semibold">Behöver åtgärd</span>
                    <span className="text-sm font-extrabold text-amber-900">{dashboardSummary.attention}</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('normal')}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-50 ring-1 ring-emerald-900/10 px-3 py-1.5 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-emerald-900 font-semibold">Inom ref</span>
                    <span className="text-sm font-extrabold text-emerald-900">{dashboardSummary.normal}</span>
                  </button>

                  {dashboardSummary.lastIso && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-slate-900/10 px-3 py-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">Senast</span>
                      <span className="text-[11px] font-mono font-semibold text-slate-800">
                        {formatDateTimeSv(dashboardSummary.lastIso)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-end gap-2">
                <button
                  onClick={() => setQuery('')}
                  className={cx(
                    'rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                    query.trim() ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 cursor-not-allowed',
                  )}
                  disabled={!query.trim()}
                >
                  Rensa sök
                </button>

                <button
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setSortMode('attention');
                  }}
                  className="rounded-full px-3 py-2 text-xs font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50 transition-colors"
                >
                  Återställ
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="relative">
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök markör (t.ex. Ferritin, HbA1c)…  •  Cmd/Ctrl + K"
                  className={cx(
                    'w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm',
                    'pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-400',
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    statusFilter === 'all' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  Alla
                </button>
                <button
                  onClick={() => setStatusFilter('attention')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    statusFilter === 'attention' ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  Avvikande
                </button>
                <button
                  onClick={() => setStatusFilter('normal')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    statusFilter === 'normal' ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  Inom ref
                </button>

                <div className="w-px bg-slate-200 mx-1" />

                <button
                  onClick={() => setSortMode('attention')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    sortMode === 'attention' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  Viktigast
                </button>
                <button
                  onClick={() => setSortMode('recent')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    sortMode === 'recent' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  Senast
                </button>
                <button
                  onClick={() => setSortMode('az')}
                  className={cx(
                    'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                    sortMode === 'az' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                  )}
                >
                  A–Ö
                </button>
              </div>

              {dataError && (
                <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-900/10 px-4 py-3 whitespace-pre-wrap">
                  <div className="text-sm font-bold text-amber-900">Åtgärd krävs i Supabase</div>
                  <div className="mt-1 text-sm text-amber-900/90">{dataError}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {loadingData ? (
          <div className="py-10 flex justify-center">
            <div className="animate-pulse flex flex-col items-center w-full max-w-2xl">
              <div className="h-4 w-44 bg-slate-200 rounded mb-4" />
              <div className="h-24 w-full bg-slate-200 rounded-3xl" />
              <div className="h-24 w-full bg-slate-200 rounded-3xl mt-3" />
              <div className="h-24 w-full bg-slate-200 rounded-3xl mt-3" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(stats.optimizedEvents.length > 0 || stats.toOptimizeCount > 0) && (
              <StatsOverview
                optimizedCount={stats.optimizedEvents.length}
                toOptimizeCount={stats.toOptimizeCount}
                onOptimizedClick={() => setIsOptimizedModalOpen(true)}
              />
            )}

            {!hasAnyTrackedData ? (
              <div className="text-center py-20 px-4">
                <h3 className="text-lg font-bold text-slate-900">Inga värden registrerade</h3>
                <p className="text-slate-600 mt-1 max-w-sm mx-auto text-sm">
                  Lägg till din första mätning för att få ref, historik och logg.
                </p>
              </div>
            ) : !hasFilteredResults ? (
              <div className="text-center py-16 px-4">
                <h3 className="text-lg font-bold text-slate-900">Inga träffar</h3>
                <p className="text-slate-600 mt-1 text-sm">Justera sök/filter eller återställ.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {groupedData.map(({ category, markers }) => (
                  <CategoryGroup key={category} title={category} markers={markers} onSelectMarker={setSelectedMarkerId} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FABs */}
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
    </div>
  );
};

export default App;
