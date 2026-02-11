
import React, { useState, useMemo } from 'react';
import { BloodMarker, JournalEntry } from '../types';
import { formatDateTime, formatDate } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  availableMarkers: BloodMarker[];
  onSave: (content: string, date: string, tags: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const JournalDrawer: React.FC<Props> = ({ isOpen, onClose, entries, availableMarkers, onSave, onDelete }) => {
  // Creating state
  const [isCreating, setIsCreating] = useState(false);
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // marker IDs
  const [tagSearch, setTagSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter markers for tagging
  const filteredMarkers = useMemo(() => {
    if (!tagSearch) return [];
    const lower = tagSearch.toLowerCase();
    return availableMarkers.filter(
      m => 
        !selectedTags.includes(m.id) && 
        (m.name.toLowerCase().includes(lower) || m.shortName.toLowerCase().includes(lower))
    ).slice(0, 5);
  }, [tagSearch, availableMarkers, selectedTags]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
        await onSave(content, date, selectedTags);
        setContent('');
        setSelectedTags([]);
        setTagSearch('');
        setIsCreating(false);
    } catch (err) {
        console.error(err);
        alert('Kunde inte spara journalanteckning.');
    } finally {
        setLoading(false);
    }
  };

  const toggleTag = (id: string) => {
    if (selectedTags.includes(id)) {
        setSelectedTags(prev => prev.filter(t => t !== id));
    } else {
        setSelectedTags(prev => [...prev, id]);
        setTagSearch('');
    }
  };

  const getMarkerName = (id: string) => {
      const m = availableMarkers.find(x => x.id === id);
      return m ? m.name : 'Okänd markör';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-xl z-10">
            <div>
                <h2 className="text-xl font-display font-bold text-slate-900">Min Journal</h2>
                <p className="text-xs text-slate-500">Privata anteckningar & observationer</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 space-y-6">
            
            {/* Create New Area */}
            {isCreating ? (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/5 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-900">Ny anteckning</h3>
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Skriv dina tankar, observationer eller åtgärder..."
                        className="w-full h-32 text-sm p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-3"
                        autoFocus
                    />

                    {/* Tagging System */}
                    <div className="mb-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedTags.map(id => (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-900/10">
                                    {getMarkerName(id)}
                                    <button onClick={() => toggleTag(id)} className="hover:text-indigo-900">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <input 
                                type="text"
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                placeholder="+ Tagga markör (t.ex. Njur...)"
                                className="text-xs w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            {tagSearch && filteredMarkers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-20 max-h-40 overflow-y-auto">
                                    {filteredMarkers.map(m => (
                                        <button 
                                            key={m.id}
                                            onClick={() => toggleTag(m.id)}
                                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex justify-between group"
                                        >
                                            <span className="font-semibold text-slate-700 group-hover:text-indigo-700">{m.name}</span>
                                            <span className="text-slate-400">{m.shortName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Avbryt
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={loading || !content.trim()}
                            className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-xl shadow-sm hover:bg-slate-800 disabled:opacity-50"
                        >
                            {loading ? 'Sparar...' : 'Journalför'}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:border-slate-400 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Skriv nytt inlägg
                </button>
            )}

            {/* List Entries */}
            <div className="space-y-6 relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                
                {entries.length === 0 && !isCreating && (
                    <div className="text-center py-10 pl-8">
                        <p className="text-slate-500 text-sm">Din journal är tom.</p>
                    </div>
                )}

                {entries.map((entry) => (
                    <div key={entry.id} className="relative pl-8 group">
                        {/* Timeline Dot */}
                        <div className="absolute left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-50 group-hover:bg-slate-900 transition-colors" />
                        
                        <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-900/5 hover:ring-slate-900/10 transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {formatDate(entry.entryDate)}
                                </span>
                                <button 
                                    onClick={() => {
                                        if(window.confirm('Ta bort detta inlägg?')) onDelete(entry.id);
                                    }}
                                    className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {entry.content}
                            </p>

                            {entry.tags && entry.tags.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-50">
                                    {entry.tags.map((tagId, idx) => {
                                        const mName = getMarkerName(tagId);
                                        return (
                                            <span key={`${tagId}-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                {mName}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default JournalDrawer;
