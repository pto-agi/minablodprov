import React, { useMemo, useState, useEffect } from 'react';
import { MarkerHistory } from '../types';
import HistoryChart from './HistoryChart';
import ReferenceVisualizer from './ReferenceVisualizer';
import NoteModal from './NoteModal';
import {
  computeDelta,
  formatDate,
  formatDateTime,
  formatNumber,
  getStatus,
  getStatusColor,
  getStatusText,
  isWithinRange,
} from '../utils';

interface Props {
  data: MarkerHistory;
  onBack: () => void;
  onSaveNote: (markerId: string, note: string) => Promise<void>;
  onAddMeasurement: (markerId: string) => void;
  onUpsertGoal: (
    markerId: string,
    goal: { targetMin: number; targetMax: number; targetDate?: string; note?: string },
  ) => void;
  onClearGoal: (markerId: string) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const FOCUS_LABELS: Record<string, string> = {
  cardiovascular: 'Hjärta & kärl',
  metabolic: 'Metabolt / Glukos',
  liver: 'Lever',
  kidney: 'Njurar',
  thyroid: 'Sköldkörtel',
  inflammation: 'Inflammation / Immun',
  blood: 'Blod / Hematologi',
  hormones: 'Hormoner',
  nutrition: 'Näring / Mikronäring',
  other: 'Övrigt',
};

const DetailView: React.FC<Props> = ({
  data,
  onBack,
  onSaveNote,
  onAddMeasurement,
  onUpsertGoal,
  onClearGoal,
}) => {
  const {
    id,
    name,
    shortName,
    unit,
    latestMeasurement,
    status,
    minRef,
    maxRef,
    measurements,
    notes,
    description,
    displayMin,
    displayMax,
    goal,
    focusAreas,
  } = data;

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Goal edit
  const [editGoal, setEditGoal] = useState(false);
  const [goalMin, setGoalMin] = useState<string>('');
  const [goalMax, setGoalMax] = useState<string>('');
  const [goalDate, setGoalDate] = useState<string>('');
  const [goalNote, setGoalNote] = useState<string>('');

  // Log expansion
  const [showAllLog, setShowAllLog] = useState(false);

  useEffect(() => {
    if (!goal) {
      setGoalMin('');
      setGoalMax('');
      setGoalDate('');
      setGoalNote('');
      setEditGoal(false);
      return;
    }
    setGoalMin(String(goal.targetMin));
    setGoalMax(String(goal.targetMax));
    setGoalDate(goal.targetDate ?? '');
    setGoalNote(goal.note ?? '');
    setEditGoal(false);
  }, [goal?.markerId, goal?.updatedAt]);

  const deltaInfo = useMemo(() => computeDelta(measurements), [measurements]);

  const goalStatus = useMemo(() => {
    if (!goal || !latestMeasurement) return null;
    return isWithinRange(latestMeasurement.value, goal.targetMin, goal.targetMax);
  }, [goal, latestMeasurement]);

  const goalDaysLeft = useMemo(() => {
    if (!goal?.targetDate) return null;
    const d = new Date(goal.targetDate);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [goal?.targetDate]);

  // Timeline: measurements + marker-notes mixed
  const timeline = useMemo(() => {
    const events: Array<
      | { type: 'measurement'; id: string; date: string; value: number; note?: string }
      | { type: 'note'; id: string; date: string; note: string }
    > = [];

    for (const m of measurements) {
      events.push({ type: 'measurement', id: m.id, date: m.date, value: m.value, note: m.note });
    }
    for (const n of notes) {
      events.push({ type: 'note', id: n.id, date: n.date, note: n.note });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [measurements, notes]);

  const quickLog = useMemo(() => (showAllLog ? timeline : timeline.slice(0, 6)), [timeline, showAllLog]);

  const latestStatusText = getStatusText(status);

  if (!latestMeasurement) return null;

  const handleSaveGoal = () => {
    const min = Number(goalMin);
    const max = Number(goalMax);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      alert('Ange ett giltigt målintervall (min och max).');
      return;
    }
    if (min >= max) {
      alert('Målintervall: min måste vara mindre än max.');
      return;
    }

    onUpsertGoal(id, {
      targetMin: min,
      targetMax: max,
      targetDate: goalDate?.trim() ? goalDate.trim() : undefined,
      note: goalNote?.trim() ? goalNote.trim() : undefined,
    });

    setEditGoal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 right-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-emerald-200/55 to-cyan-200/35 blur-3xl" />
        <div className="absolute -bottom-56 left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-indigo-200/45 to-violet-200/35 blur-3xl" />
      </div>

      {/* Navbar */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddMeasurement(id)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ny mätning
            </button>

            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Anteckning
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24 max-w-3xl mx-auto relative">
        {/* Header */}
        <div className="mt-6">
          <div className="text-sm text-slate-500">
            {data.category} / {name}
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mt-1">
            {name} <span className="text-slate-400 font-semibold">({shortName})</span>
          </h1>

          {focusAreas?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {focusAreas.map((fa) => (
                <span
                  key={fa}
                  className="text-xs font-semibold bg-white/70 ring-1 ring-slate-900/10 px-3 py-1.5 rounded-full"
                >
                  {FOCUS_LABELS[fa] ?? fa}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Current Value Card */}
        <div className="mt-6 rounded-3xl bg-white/85 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Senaste värde</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={cx('text-4xl font-display font-bold', status === 'normal' ? 'text-slate-900' : 'text-rose-600')}>
                  {formatNumber(latestMeasurement.value)}
                </span>
                <span className="text-slate-600 font-semibold">{unit}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cx('px-3 py-1.5 rounded-full text-xs font-bold border', getStatusColor(status))}>
                  {latestStatusText}
                </span>

                {deltaInfo?.delta != null && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 ring-1 ring-slate-900/10 text-slate-800">
                    Δ {deltaInfo.delta > 0 ? '+' : ''}
                    {formatNumber(deltaInfo.delta, 2)}
                  </span>
                )}

                {goal && (
                  <span
                    className={cx(
                      'px-3 py-1.5 rounded-full text-xs font-bold ring-1',
                      goalStatus ? 'bg-emerald-50 text-emerald-900 ring-emerald-900/10' : 'bg-amber-50 text-amber-900 ring-amber-900/10',
                    )}
                  >
                    Mål {goalStatus ? '✓' : '•'} {formatNumber(goal.targetMin)}–{formatNumber(goal.targetMax)} {unit}
                  </span>
                )}
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Registrerat: <span className="font-semibold text-slate-900">{formatDateTime(latestMeasurement.date)}</span>
              </div>

              {/* Measurement-linked note shown HIGH on the page */}
              {latestMeasurement.note?.trim() ? (
                <div className="mt-4 rounded-2xl bg-amber-50 ring-1 ring-amber-900/10 p-4 text-sm text-amber-900 whitespace-pre-wrap">
                  <div className="font-bold mb-1">📝 Anteckning (senaste mätning)</div>
                  {latestMeasurement.note}
                </div>
              ) : (
                <div className="mt-4 text-xs text-slate-500">
                  Tips: Lägg en anteckning på mätningen (fastande/sömn/stress/tillskott) för bättre spårbarhet.
                </div>
              )}
            </div>

            {status !== 'normal' && (
              <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-900/10 p-4 text-sm text-amber-900 max-w-sm">
                <div className="font-bold">Utanför referens</div>
                <div className="mt-1 text-amber-800">
                  Logga kontext, sätt mål och gör en tydlig intervention. Då blir nästa mätning mer “actionable”.
                </div>
              </div>
            )}
          </div>

          {/* Ref bar with GOAL overlay */}
          <ReferenceVisualizer
            value={latestMeasurement.value}
            minRef={minRef}
            maxRef={maxRef}
            displayMin={displayMin}
            displayMax={displayMax}
            status={status}
            goalMin={goal?.targetMin}
            goalMax={goal?.targetMax}
          />
        </div>

        {/* ACTIONABLE TOP: Quick log + Goal/protocol side-by-side on desktop */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Log (higher up, actionable) */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">Anteckningar & logg</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Koppla insikter till specifika mätningar. 🟠 ring = har anteckning.
                </p>
              </div>

              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="px-3 py-2 rounded-full text-xs font-bold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50"
              >
                + Ny anteckning
              </button>
            </div>

            <div className="mt-4">
              {quickLog.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/5 p-4 text-sm text-slate-600">
                  Inga loggar ännu. Börja med att lägga en mätning eller anteckning.
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden ring-1 ring-slate-900/5">
                  {quickLog.map((e, idx) => {
                    const border = idx !== quickLog.length - 1 ? 'border-b border-slate-100' : '';

                    if (e.type === 'measurement') {
                      const s = getStatus(e.value, minRef, maxRef);
                      const hasNote = Boolean(e.note?.trim());

                      return (
                        <div key={`m-${e.id}`} className={cx('p-4 bg-white', border)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-500 font-semibold">{formatDateTime(e.date)}</div>
                              {hasNote ? (
                                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                  <span className="font-bold text-amber-700">📝</span> {e.note}
                                </div>
                              ) : (
                                <div className="mt-2 text-sm text-slate-500 italic">Ingen anteckning</div>
                              )}
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-lg font-display font-bold text-slate-900">
                                {formatNumber(e.value)} {unit}
                              </div>

                              <div className="mt-2 flex items-center justify-end gap-2">
                                {hasNote ? (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-900 ring-1 ring-amber-900/10">
                                    📝
                                  </span>
                                ) : null}

                                <span className={cx('inline-flex px-3 py-1.5 rounded-full text-xs font-bold border', getStatusColor(s))}>
                                  {getStatusText(s)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // marker note
                    return (
                      <div key={`n-${e.id}`} className={cx('p-4 bg-white', border)}>
                        <div className="text-xs text-slate-500 font-semibold">{formatDateTime(e.date)}</div>
                        <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{e.note}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {timeline.length > 6 && (
                <button
                  onClick={() => setShowAllLog((v) => !v)}
                  className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  {showAllLog ? 'Visa färre' : `Visa hela loggen (${timeline.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Goal / Protocol */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">Mål & protokoll</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Sätt ett målintervall. Det visas nu direkt i ref-stapeln.
                </p>
              </div>

              {goal ? (
                <button
                  onClick={() => setEditGoal((v) => !v)}
                  className="px-3 py-2 rounded-full text-xs font-bold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50"
                >
                  {editGoal ? 'Stäng' : 'Redigera'}
                </button>
              ) : (
                <button
                  onClick={() => setEditGoal(true)}
                  className="px-3 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Skapa mål
                </button>
              )}
            </div>

            {goal && !editGoal ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      'px-3 py-1.5 rounded-full text-xs font-bold ring-1',
                      goalStatus ? 'bg-emerald-50 text-emerald-900 ring-emerald-900/10' : 'bg-amber-50 text-amber-900 ring-amber-900/10',
                    )}
                  >
                    {goalStatus ? 'På rätt nivå' : 'Utanför mål'}
                  </span>

                  {goal.targetDate && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-slate-900/10 text-slate-700">
                      Deadline: {goal.targetDate}
                      {goalDaysLeft != null ? ` (${goalDaysLeft} dagar)` : ''}
                    </span>
                  )}

                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 ring-1 ring-slate-900/10 text-slate-700">
                    Skapat: {formatDate(goal.createdAt)}
                  </span>
                </div>

                {goal.note && (
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-900/5 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {goal.note}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (confirm('Ta bort mål?')) onClearGoal(id);
                  }}
                  className="w-fit text-xs font-bold text-rose-700 hover:text-rose-800"
                >
                  Ta bort mål
                </button>
              </div>
            ) : editGoal ? (
              <div className="mt-5 grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Mål min</label>
                    <input
                      value={goalMin}
                      onChange={(e) => setGoalMin(e.target.value)}
                      type="number"
                      step="0.01"
                      className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="t.ex. 20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Mål max</label>
                    <input
                      value={goalMax}
                      onChange={(e) => setGoalMax(e.target.value)}
                      type="number"
                      step="0.01"
                      className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="t.ex. 30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Deadline (valfritt)</label>
                  <input
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Protokoll / hypotes (valfritt)</label>
                  <textarea
                    value={goalNote}
                    onChange={(e) => setGoalNote(e.target.value)}
                    rows={4}
                    placeholder="Ex: Sömn, minska alkohol 2v, tillskott X. Förväntad effekt: …"
                    className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveGoal}
                    className="px-4 py-2 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Spara mål
                  </button>
                  <button
                    onClick={() => {
                      setEditGoal(false);
                      if (goal) {
                        setGoalMin(String(goal.targetMin));
                        setGoalMax(String(goal.targetMax));
                        setGoalDate(goal.targetDate ?? '');
                        setGoalNote(goal.note ?? '');
                      } else {
                        setGoalMin('');
                        setGoalMax('');
                        setGoalDate('');
                        setGoalNote('');
                      }
                    }}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* History Graph */}
        <div className="mt-6">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-3">Historik</h2>
          <div className="rounded-3xl bg-white/85 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-4">
            <HistoryChart measurements={measurements} minRef={minRef} maxRef={maxRef} unit={unit} />
          </div>
        </div>

        {/* Info */}
        <div className="mt-6">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-2">Vad är det här för markör?</h2>
          <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-900/5 p-6 text-slate-700 leading-relaxed">
            <p>{description}</p>
            <p className="mt-4 text-xs text-slate-500">
              Obs: Denna app är för spårning och insikter – inte medicinsk rådgivning.
            </p>
          </div>
        </div>

        {/* Note Modal */}
        <NoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          markerId={id}
          markerName={name}
          onSave={onSaveNote}
        />
      </div>
    </div>
  );
};

export default DetailView;
