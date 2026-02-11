
import React, { useMemo } from 'react';
import { BloodMarker, Measurement, MarkerNote } from '../types';
import { formatDateTime, formatNumber, getStatus } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  measurements: Measurement[];
  notes: MarkerNote[];
  markers: BloodMarker[];
  onSelectMarker: (markerId: string) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const GlobalTimelineDrawer: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  measurements, 
  notes, 
  markers, 
  onSelectMarker 
}) => {
  
  // Combine, enrich and sort all events
  const timelineEvents = useMemo(() => {
    const combined = [];

    // Process Measurements
    for (const m of measurements) {
      const marker = markers.find(x => x.id === m.markerId);
      if (marker) {
        combined.push({
          type: 'measurement' as const,
          id: m.id,
          date: m.date,
          markerId: m.markerId,
          markerName: marker.name,
          unit: marker.unit,
          value: m.value,
          note: m.note,
          status: getStatus(m.value, marker.minRef, marker.maxRef)
        });
      }
    }

    // Process Notes
    for (const n of notes) {
      const marker = markers.find(x => x.id === n.markerId);
      if (marker) {
        combined.push({
          type: 'note' as const,
          id: n.id,
          date: n.date, // created_at
          markerId: n.markerId,
          markerName: marker.name,
          unit: '',
          value: 0,
          note: n.note,
          status: 'normal'
        });
      }
    }

    // Sort descending (newest first)
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [measurements, notes, markers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-xl z-10">
            <div>
                <h2 className="text-xl font-display font-bold text-slate-900">Händelselogg</h2>
                <p className="text-xs text-slate-500">All aktivitet samlad i kronologisk ordning</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-10">
             
             {timelineEvents.length === 0 && (
                <div className="pl-8 text-slate-400 text-sm italic py-4">Ingen aktivitet registrerad än.</div>
             )}

             {timelineEvents.map((item) => {
                const isMeas = item.type === 'measurement';
                
                return (
                   <div key={`${item.type}-${item.id}`} className="relative pl-8 group">
                      {/* Timeline Dot */}
                      <div className={cx(
                         "absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white ring-1 shadow-sm z-10",
                         isMeas ? "bg-slate-900 ring-slate-200" : "bg-amber-200 ring-amber-100"
                      )} />
                      
                      <button 
                        onClick={() => {
                            onClose();
                            onSelectMarker(item.markerId);
                        }}
                        className="w-full text-left bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-900/5 hover:ring-slate-900/20 hover:shadow-md transition-all group-hover:-translate-y-0.5"
                      >
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {item.markerName}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                   {formatDateTime(item.date)}
                                </span>
                             </div>
                             {isMeas && item.status !== 'normal' && (
                                <span className={cx(
                                    "w-2 h-2 rounded-full",
                                    item.status === 'high' ? "bg-rose-500" : "bg-amber-500"
                                )} title={item.status === 'high' ? 'Högt värde' : 'Lågt värde'} />
                             )}
                          </div>

                          {isMeas ? (
                              <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-bold text-slate-900 font-display">
                                      {formatNumber(item.value)}
                                  </span>
                                  <span className="text-sm font-medium text-slate-500">{item.unit}</span>
                              </div>
                          ) : (
                              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                                  Anteckning
                              </div>
                          )}

                          {item.note && (
                              <div className={cx(
                                  "mt-2 text-sm text-slate-600 leading-relaxed",
                                  isMeas ? "bg-slate-50 p-2 rounded-lg italic text-xs" : ""
                              )}>
                                  {isMeas ? `"${item.note}"` : item.note}
                              </div>
                          )}
                      </button>
                   </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalTimelineDrawer;
