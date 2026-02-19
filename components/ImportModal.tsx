
import React, { useState } from 'react';
import { BloodMarker } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableMarkers: BloodMarker[];
  onSave: (measurements: Array<{ markerId: string; value: number; date: string }>) => Promise<void>;
}

interface ParsedResult {
  markerId: string;
  markerName: string;
  value: number;
  unit: string;
  originalText?: string;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return (import.meta as any)?.env?.[key] || '';
  } catch {
    return '';
  }
};

const ImportModal: React.FC<Props> = ({ isOpen, onClose, availableMarkers, onSave }) => {
  const [text, setText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ParsedResult[] | null>(null);
  const [detectedDate, setDetectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      // 1. Prepare context for AI
      const markersContext = availableMarkers.map(m => ({
        id: m.id,
        name: m.name,
        shortName: m.shortName,
        unit: m.unit
      }));

      // 2. Call AI proxy (backend)
      const proxyUrl = getEnv('VITE_AI_IMPORT_PROXY_URL');
      if (!proxyUrl) {
        setError('AI-import är inte konfigurerad. Sätt VITE_AI_IMPORT_PROXY_URL och använd en server/proxy.');
        return;
      }
      
      const prompt = `
        You are a medical data assistant. extract blood test results from the text provided by the user.
        
        Here is the list of valid markers you can identify:
        ${JSON.stringify(markersContext)}

        Instructions:
        1. Find values that match the valid markers (by name or shortName).
        2. Ignore markers not in the valid list.
        3. Try to find the date of the test in the text (format YYYY-MM-DD).
        4. Return ONLY a valid JSON object with this structure:
        {
          "date": "YYYY-MM-DD" (or null if not found),
          "results": [
            { "markerId": "id_from_valid_list", "value": number }
          ]
        }
        5. Handle Swedish decimal commas (replace with dot).
      `;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          text,
          markers: markersContext
        })
      });

      if (!response.ok) {
        throw new Error(`AI proxy failed (${response.status})`);
      }

      const data = await response.json();

      // 3. Map back to our UI structure
      if (data.date) {
        setDetectedDate(data.date);
      }

      const mappedResults: ParsedResult[] = [];
      
      for (const res of (data.results || [])) {
        const marker = availableMarkers.find(m => m.id === res.markerId);
        if (marker && typeof res.value === 'number') {
          mappedResults.push({
            markerId: marker.id,
            markerName: marker.name,
            unit: marker.unit,
            value: res.value
          });
        }
      }

      if (mappedResults.length === 0) {
        setError("Kunde inte identifiera några kända markörer i texten.");
      } else {
        setResults(mappedResults);
      }

    } catch (err: any) {
      console.error(err);
      if (err.status === 429 || err.code === 429 || err.message?.includes('429') || err.toString().includes('429')) {
        setError("AI-tjänsten är tillfälligt överbelastad (429). Försök igen om en stund eller fyll i värdena manuellt.");
      } else {
        setError("Något gick fel vid analysen. Kontrollera din AI-proxy eller försök igen.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!results) return;
    setSaving(true);
    try {
      await onSave(results.map(r => ({
        markerId: r.markerId,
        value: r.value,
        date: detectedDate
      })));
      onClose();
      // Reset
      setText('');
      setResults(null);
    } catch (e) {
      setError("Kunde inte spara värdena.");
    } finally {
      setSaving(false);
    }
  };

  const removeResult = (idx: number) => {
    if (!results) return;
    const next = [...results];
    next.splice(idx, 1);
    setResults(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-display font-bold text-slate-900">Importera eller lägg till data</h3>
            <p className="text-sm text-slate-500">Skriv in värden eller klistra in från journal.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-full ring-1 ring-slate-900/5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!results ? (
            <div className="space-y-4">
               <div className="bg-emerald-50 rounded-2xl p-4 flex gap-3 text-sm text-emerald-900 ring-1 ring-emerald-900/10">
                  <span className="text-xl">🤖</span>
                  <div>
                    <span className="font-bold">AI-Analys:</span> Skriv t.ex. "Hb 150" eller klistra in en hel text från Werlabs/1177. AI:n hittar värdena automatiskt.
                  </div>
               </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Du kan skriva fritt:\n"Jag hade 145 i Hb och 22 i testosteron"\n\nEller klistra in en lista:\nHemoglobin 145 g/L\nFerritin 120 ug/L\n...`}
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none"
                autoFocus
              />
              
              {error && (
                <div className="text-rose-600 text-sm font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Datum för provtagning</label>
                    <input 
                      type="date" 
                      value={detectedDate}
                      onChange={(e) => setDetectedDate(e.target.value)}
                      className="bg-white border-slate-200 rounded-lg text-sm font-bold text-slate-900 p-2 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{results.length}</div>
                    <div className="text-xs font-semibold text-slate-500">värden hittade</div>
                  </div>
               </div>

               <div className="grid gap-2">
                 {results.map((res, idx) => (
                   <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         </div>
                         <div>
                           <div className="font-bold text-slate-900 text-sm">{res.markerName}</div>
                           <div className="text-xs text-slate-500">{res.unit}</div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <input 
                           type="number" 
                           value={res.value}
                           onChange={(e) => {
                             const next = [...results];
                             next[idx].value = parseFloat(e.target.value);
                             setResults(next);
                           }}
                           className="w-24 text-right font-bold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                        />
                        <button 
                          onClick={() => removeResult(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                   </div>
                 ))}
               </div>

               <div className="text-xs text-slate-500 text-center">
                 Kontrollera alltid att värdena stämmer med ditt originaldokument innan du sparar.
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
           {!results ? (
             <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !text.trim()}
                  className="flex-[2] py-3.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyserar...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Analysera text
                    </>
                  )}
                </button>
             </>
           ) : (
             <>
                <button
                  onClick={() => setResults(null)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Backa
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-[2] py-3.5 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                   {saving ? 'Sparar...' : `Spara ${results.length} mätningar`}
                </button>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
