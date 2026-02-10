import React, { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  markerId: string;
  markerName: string;
  onSave: (markerId: string, note: string) => Promise<void>;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const NoteModal: React.FC<Props> = ({ isOpen, onClose, markerId, markerName, onSave }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setError(null);
    setSaving(false);
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);
    const clean = text.trim();
    if (!clean) {
      setError('Skriv något i anteckningen.');
      return;
    }

    setSaving(true);
    try {
      await onSave(markerId, clean);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Kunde inte spara anteckning.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, text]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200/70 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">Ny anteckning</h3>
            <p className="text-xs text-slate-500 mt-1">
              Markör: <span className="font-semibold text-slate-700">{markerName}</span> •{' '}
              <span className="font-mono text-[11px]">Ctrl/⌘ + Enter</span> för spara
            </p>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-full bg-white/70 hover:bg-white ring-1 ring-slate-900/10 flex items-center justify-center"
            aria-label="Stäng"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-900/10 p-4 text-sm text-rose-900 font-semibold">
              {error}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Kontekst / hypotes / vad du testar nu / symtom / sömn / kost / träning…"
            className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            autoFocus
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white ring-1 ring-slate-900/10 hover:bg-slate-50 text-sm font-semibold text-slate-700"
              disabled={saving}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={cx(
                'flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-white',
                'bg-slate-900 hover:bg-slate-800 ring-1 ring-slate-900/20 shadow-sm shadow-slate-900/10',
                saving && 'opacity-60 cursor-not-allowed',
              )}
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
