
import React, { useMemo, useState } from 'react';
import { BloodMarker, MarkerNote, Measurement } from '../types';
import { formatDateTime, formatNumber, getStatus } from '../utils';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface Props {
  session: Session;
  measurements: Measurement[];
  notes: MarkerNote[];
  markers: BloodMarker[];
  onSelectMarker: (markerId: string) => void;
  onSignOut: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const AccountView: React.FC<Props> = ({ 
  session, 
  measurements, 
  notes, 
  markers, 
  onSelectMarker,
  onSignOut
}) => {
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // Combine timeline events (Moved from GlobalTimelineDrawer)
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

  const handleUpdatePassword = async () => {
      if(newPassword.length < 6) {
          setPwMsg("Lösenordet måste vara minst 6 tecken.");
          return;
      }
      try {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if(error) throw error;
          setPwMsg("Lösenord uppdaterat!");
          setTimeout(() => { setPasswordMode(false); setPwMsg(''); setNewPassword(''); }, 2000);
      } catch(e:any) {
          setPwMsg("Kunde inte uppdatera: " + e.message);
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* 1. Header Section */}
      <div className="mb-8 px-1">
        <h2 className="text-2xl font-display font-bold text-slate-900">Mitt konto</h2>
        <p className="text-slate-500 text-sm mt-1">Hantera din profil och se din historik</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Settings */}
        <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-900/5">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                        {session.user.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inloggad som</div>
                        <div className="font-bold text-slate-900 truncate" title={session.user.email}>{session.user.email}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    {passwordMode ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nytt lösenord</label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-2 mb-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="******"
                            />
                            {pwMsg && <div className="text-xs font-bold mb-3 text-slate-600">{pwMsg}</div>}
                            <div className="flex gap-2">
                                <button onClick={() => setPasswordMode(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Avbryt</button>
                                <button onClick={handleUpdatePassword} className="flex-1 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg">Spara</button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setPasswordMode(true)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
                        >
                            <span className="text-sm font-bold text-slate-700">Ändra lösenord</span>
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                    )}

                    <button 
                        onClick={onSignOut}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 transition-colors text-left group"
                    >
                        <span className="text-sm font-bold text-rose-700">Logga ut</span>
                        <svg className="w-4 h-4 text-rose-400 group-hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Full Timeline */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-900/5 min-h-[500px]">
                <h3 className="text-lg font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Händelselogg
                </h3>

                <div className="relative border-l-2 border-slate-100 ml-3 sm:ml-4 space-y-8 pl-6 sm:pl-8">
                    {timelineEvents.length === 0 && (
                        <div className="text-slate-400 text-sm italic py-4">Ingen aktivitet registrerad än.</div>
                    )}

                    {timelineEvents.map((item) => {
                        const isMeas = item.type === 'measurement';
                        
                        return (
                        <div key={`${item.type}-${item.id}`} className="relative group">
                            {/* Timeline Dot */}
                            <div className={cx(
                                "absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white ring-1 shadow-sm z-10",
                                isMeas ? "bg-slate-900 ring-slate-200" : "bg-amber-200 ring-amber-100"
                            )} />
                            
                            <button 
                                onClick={() => onSelectMarker(item.markerId)}
                                className="w-full text-left -mt-2 -ml-2 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {item.markerName}
                                        </span>
                                        {isMeas && item.status !== 'normal' && (
                                            <span className={cx(
                                                "w-2 h-2 rounded-full",
                                                item.status === 'high' ? "bg-rose-500" : "bg-amber-500"
                                            )} title={item.status === 'high' ? 'Högt värde' : 'Lågt värde'} />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                        {formatDateTime(item.date)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    {isMeas ? (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-slate-900 font-display">
                                                {formatNumber(item.value)}
                                            </span>
                                            <span className="text-sm font-medium text-slate-500">{item.unit}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                                            Anteckning
                                        </div>
                                    )}
                                </div>

                                {item.note && (
                                    <div className={cx(
                                        "mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3",
                                        isMeas ? "italic text-xs border-l-2 border-slate-200 pl-2" : ""
                                    )}>
                                        {item.note}
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
    </div>
  );
};

export default AccountView;
