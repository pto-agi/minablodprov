import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BloodMarker } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markerId: string, value: number, date: string, note?: string) => Promise<void>;
  availableMarkers: BloodMarker[];
  initialMarkerId?: string;
}

const NewMeasurementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  availableMarkers,
  initialMarkerId,
}) => {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [value, setValue] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const quickChips = useMemo(
    () => [
      'Fastande',
      'Efter träning',
      'Hög stress',
      'Bra sömn',
      'Dålig sömn',
      'Sjuk',
      'Alkohol',
      'Nytt tillskott',
      'Kost ändrad',
      'Resa/jetlag',
    ],
    [],
  );

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prefill marker if opened from DetailView
  useEffect(() => {
    if (!isOpen) return;
    if (!initialMarkerId) return;

    const m = availableMarkers.find((x) => x.id === initialMarkerId);
    if (!m) return;

    setSelectedMarkerId(m.id);
    setSearchTerm(m.name);
    setIsDropdownOpen(false);
  }, [isOpen, initialMarkerId, availableMarkers]);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(false);
  }, [isOpen]);

  // Filter logic: Search by name OR shortName, min 2 chars
  const filteredMarkers = availableMarkers.filter((marker) => {
    if (searchTerm.length < 2) return false;
    const term = searchTerm.toLowerCase();
    return marker.name.toLowerCase().includes(term) || marker.shortName.toLowerCase().includes(term);
  });

  const handleSelectMarker = (marker: BloodMarker) => {
    setSelectedMarkerId(marker.id);
    setSearchTerm(marker.name);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedMarkerId(''); // Clear selection if user modifies text

    if (term.length >= 2) setIsDropdownOpen(true);
    else setIsDropdownOpen(false);
  };

  const appendChip = (chip: string) => {
    setNote((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return chip;
      return `${trimmed}\n• ${chip}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarkerId || !value || !date) return;

    setLoading(true);
    try {
      await onSave(selectedMarkerId, parseFloat(value), date, note.trim() ? note.trim() : undefined);

      // Reset form
      setValue('');
      setSearchTerm('');
      setSelectedMarkerId('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);

      onClose();
    } catch (error) {
      console.error('Failed to save', error);
      alert('Kunde inte spara värdet. Kontrollera din anslutning.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMarker = availableMarkers.find((m) => m.id === selectedMarkerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200/70 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-display font-bold text-slate-900">Ny mätning</h3>
            <p className="text-sm text-slate-600 mt-1">Spara värde + kontext (biohacker-logg).</p>
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

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Autocomplete Marker Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Vad har du mätt?</label>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchTerm.length >= 2) setIsDropdownOpen(true);
                }}
                placeholder="T.ex. Ferritin, HbA1c, ApoB…"
                disabled={availableMarkers.length === 0}
                className={`w-full rounded-2xl bg-white ring-1 shadow-sm px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  !selectedMarkerId && searchTerm.length >= 2 && filteredMarkers.length === 0
                    ? 'ring-rose-300 focus:ring-rose-300'
                    : 'ring-slate-900/10 focus:ring-emerald-400'
                } disabled:opacity-50`}
                autoComplete="off"
              />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                {selectedMarkerId ? (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Dropdown Results */}
            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/10 max-h-60 overflow-y-auto">
                {filteredMarkers.length > 0 ? (
                  <ul className="py-1">
                    {filteredMarkers.map((marker) => (
                      <li
                        key={marker.id}
                        onMouseDown={() => handleSelectMarker(marker)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex flex-col group transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                            {marker.name}
                          </span>
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-900">
                            {marker.shortName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5">Enhet: {marker.unit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-slate-600">
                    Inga markörer hittades för "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Value & Unit */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Resultat</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                disabled={!selectedMarkerId}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed pr-20"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-lg text-sm">
                  {selectedMarker?.unit || '-'}
                </span>
              </div>
            </div>
            {selectedMarker && (
              <p className="mt-2 text-xs text-slate-500">
                Referensintervall: <span className="font-semibold">{selectedMarker.minRef}</span> –{' '}
                <span className="font-semibold">{selectedMarker.maxRef}</span> {selectedMarker.unit}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Datum för provtagning</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Kontext / anteckning (valfritt)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickChips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => appendChip(c)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 ring-1 ring-slate-900/5 hover:bg-slate-100"
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Ex: Fastande. Dålig sömn. Nytt magnesium. Förväntar mig förbättring inom 2 veckor."
              className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-5 text-slate-800 bg-white ring-1 ring-slate-900/10 hover:bg-slate-50 font-semibold rounded-2xl transition-all"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMarkerId || !value}
              className="flex-1 py-3 px-5 text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 font-bold rounded-2xl shadow-lg shadow-slate-900/10 transition-all flex justify-center items-center"
            >
              {loading ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMeasurementModal;
