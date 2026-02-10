import React, { useMemo } from 'react';
import { OptimizationEvent } from '../types';
import { formatDate, formatNumber } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  events: OptimizationEvent[];
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const OptimizedListModal: React.FC<Props> = ({ isOpen, onClose, events }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.goodDate).getTime() - new Date(a.goodDate).getTime()),
    [events],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200/70 sticky top-0 bg-white/70 backdrop-blur-xl z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900">Optimerade värden</h3>
              <p className="text-sm text-slate-600 mt-1">
                Du har normaliserat <span className="font-semibold">{sortedEvents.length}</span> gånger.
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 transition-colors bg-white/70 ring-1 ring-slate-900/10 p-2 rounded-full"
              aria-label="Stäng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-50 ring-1 ring-slate-900/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Inga optimeringar registrerade än.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedEvents.map((event, index) => {
                const badgeText = event.badStatus === 'high' ? 'Högt' : 'Lågt';
                return (
                  <div
                    key={`${event.markerId}-${event.goodDate}-${index}`}
                    className="rounded-3xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-display font-bold text-slate-900 truncate">{event.markerName}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Förbättring: <span className="font-semibold">{formatDate(event.badDate)}</span> →{' '}
                            <span className="font-semibold text-emerald-700">{formatDate(event.goodDate)}</span>
                          </div>
                        </div>

                        <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 ring-1 ring-emerald-900/10">
                          OPTIMERAD
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 items-center gap-2">
                        {/* Before */}
                        <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-900/10 p-3">
                          <div className="text-[10px] font-semibold text-rose-900">Före</div>
                          <div className="mt-1 text-sm font-bold text-rose-900">
                            {formatNumber(event.badValue)} <span className="text-[10px] font-semibold text-rose-700">{event.unit}</span>
                          </div>
                          <div className="mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 ring-1 ring-rose-900/10 text-rose-800">
                            {badgeText}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 ring-1 ring-slate-900/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        {/* After */}
                        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-900/10 p-3 text-right">
                          <div className="text-[10px] font-semibold text-emerald-900">Efter</div>
                          <div className="mt-1 text-sm font-bold text-emerald-900">
                            {formatNumber(event.goodValue)}{' '}
                            <span className="text-[10px] font-semibold text-emerald-700">{event.unit}</span>
                          </div>
                          <div className="mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 ring-1 ring-emerald-900/10 text-emerald-800">
                            Normalt
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-[11px] text-slate-500">
                        Tips: Lägg en anteckning i markörns logg om vad som ändrades (kost/sömn/tillskott) mellan dessa datum.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedListModal;
