import React, { useState, useEffect, useRef } from 'react';
import { BloodMarker } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (markerId: string, value: number, date: string, note?: string) => Promise<void>;
  availableMarkers: BloodMarker[];
  initialMarkerId?: string;
}

const NewMeasurementModal: React.FC<Props> = ({ isOpen, onClose, onSave, availableMarkers, initialMarkerId }) => {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [value, setValue] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset minimal each time open
    setValue('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);

    if (initialMarkerId) {
      const m = availableMarkers.find((x) => x.id === initialMarkerId);
      if (m) {
        setSelectedMarkerId(m.id);
        setSearchTerm(m.name);
        setIsDropdownOpen(false);
      }
    }
  }, [isOpen, initialMarkerId, availableMarkers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setSelectedMarkerId('');
    setIsDropdownOpen(term.length >= 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarkerId || !value || !date) return;

    setLoading(true);
    try {
      await onSave(selectedMarkerId, parseFloat(value), date, note?.trim() ? note.trim() : undefined);

      setValue('');
      setSearchTerm('');
      setSelectedMarkerId('');
      setNote('');
      onClose();
    } catch (error) {
      console.error('Failed to save', error);
      alert('Kunde inte spara värdet. Kontrollera din anslutning och att SQL-migrationen är körd.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMarker = availableMarkers.find((m) => m.id === selectedMarkerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-display font-bold text-slate-900">Ny mätning</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Vad har du mätt?</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchTerm.length >= 2) setIsDropdownOpen(true);
                }}
                placeholder="T.ex. Hemoglobin eller Hb..."
                disabled={availableMarkers.length === 0}
                className={`w-full bg-slate-50 border text-slate-900 text-base rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block w-full p-3.5 pr-10 disabled:opacity-50 transition-colors ${
                  !selectedMarkerId && searchTerm.length >= 2 && filteredMarkers.length === 0
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200'
                }`}
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

            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                {filteredMarkers.length > 0 ? (
                  <ul className="py-1">
                    {filteredMarkers.map((marker) => (
                      <li
                        key={marker.id}
                        onMouseDown={() => handleSelectMarker(marker)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex flex-col group transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                            {marker.name}
                          </span>
                          <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded group-hover:bg-emerald-100 group-hover:text-emerald-800">
                            {marker.shortName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5">Enhet: {marker.unit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-slate-500">Inga markörer hittades för "{searchTerm}"</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Resultat</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                disabled={!selectedMarkerId}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="bg-slate-50 border border-slate-200 text-slate-900 text-lg font-bold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block w-full p-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded text-sm">
                  {selectedMarker?.unit || '-'}
                </span>
              </div>
            </div>
            {selectedMarker && (
              <p className="mt-2 text-xs text-slate-400 animate-in fade-in slide-in-from-top-1">
                Referensintervall: {selectedMarker.minRef} - {selectedMarker.maxRef} {selectedMarker.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Datum för provtagning</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block w-full p-3.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Anteckning (kopplas till mätningen)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Fastande? Sömn? Stress? Träning? Kost/tillskott? Symptom?"
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block w-full p-3.5"
            />
          </div>

          <div className="flex gap-3 mt-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 px-5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 font-medium rounded-xl transition-all"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMarkerId || !value}
              className="flex-1 py-3.5 px-5 text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all flex justify-center items-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Spara värde'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMeasurementModal;
