import React, { useEffect, useMemo, useState } from 'react';
import { buildTaggedText, parseTaggedText } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  markerId: string;
  markerName: string;
  onSave: (markerId: string, note: string) => Promise<void>;
}

const QUICK_TAGS = ['Fastande', 'Sömn', 'Stress', 'Träning', 'Kost', 'Tillskott', 'Protokoll', 'Hypotes', 'Mål'];

const TEMPLATES: Array<{ id: string; label: string; body: string }> = [
  {
    id: 'hypothesis',
    label: 'Hypotes',
    body: `Hypotes:\n\nIntervention:\n\nMät igen:\n\nFörväntad effekt:`,
  },
  {
    id: 'protocol',
    label: 'Protokoll',
    body: `Protokoll:\n\nDosering / rutin:\n\nStart:\nSlut:\n\nNoteringar:`,
  },
  {
    id: 'goal',
    label: 'Mål',
    body: `Mål:\n\nVarför:\n\nHur följer jag upp:\n\nDeadline:`,
  },
];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const NoteModal: React.FC<Props> = ({ isOpen, onClose, markerId, markerName, onSave }) => {
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => parseTaggedText(note), [note]);

  useEffect(() => {
    if (!isOpen) return;

    // reset on open for “fresh capture”
    setNote('');
    setTags([]);
    setLoading(false);
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      const saveCombo = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
      if (saveCombo) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, note, tags]);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const applyTemplate = (body: string) => {
    setNote((prev) => {
      const trimmed = (prev ?? '').trim();
      if (!trimmed) return body;
      return `${trimmed}\n\n---\n${body}`.trim();
    });
  };

  const handleSave = async () => {
    const finalText = buildTaggedText(tags, note);
    if (!finalText.trim()) return;

    setLoading(true);
    try {
      await onSave(markerId, finalText.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/70 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">Ny anteckning</h3>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Markör: <span className="font-semibold text-slate-700">{markerName}</span> •{' '}
              <span className="font-mono text-[11px]">Ctrl/⌘ + Enter</span> för att spara
            </p>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-full bg-white/70 hover:bg-white ring-1 ring-slate-900/10 flex items-center justify-center"
            aria-label="Stäng"
            title="Stäng"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tags */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Snabbtaggar</p>
              {parsed.tags.length > 0 && (
                <p className="text-xs text-slate-500">
                  Upptäckt i text: <span className="font-mono">{parsed.tags.map((t) => `#${t}`).join(' ')}</span>
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cx(
                      'px-3 py-2 rounded-full text-xs font-semibold ring-1 transition-colors',
                      active
                        ? 'bg-slate-900 text-white ring-slate-900'
                        : 'bg-white text-slate-700 ring-slate-900/10 hover:bg-slate-50',
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-sm font-semibold text-slate-900">Templates</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.body)}
                  className="px-3 py-2 rounded-full text-xs font-semibold bg-slate-50 ring-1 ring-slate-900/5 hover:bg-slate-100"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note text */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Anteckning</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={7}
              placeholder="Skriv ner hypotes, protokoll, hur du mådde, vad du ändrat (kost/tillskott/sömn/träning)…"
              className={cx(
                'w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm',
                'px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400',
              )}
            />
            <p className="mt-2 text-xs text-slate-500">
              Tips: Taggar sparas som hashtags i första raden (t.ex. <span className="font-mono">#fastande #somn</span>).
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white ring-1 ring-slate-900/10 hover:bg-slate-50 text-sm font-semibold text-slate-700"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !buildTaggedText(tags, note).trim()}
              className={cx(
                'flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-white',
                'bg-slate-900 hover:bg-slate-800 ring-1 ring-slate-900/20 shadow-sm shadow-slate-900/10',
                (loading || !buildTaggedText(tags, note).trim()) && 'opacity-60 cursor-not-allowed',
              )}
            >
              {loading ? 'Sparar…' : 'Spara anteckning'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
