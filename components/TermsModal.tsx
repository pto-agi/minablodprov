
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-display font-bold text-slate-900">Villkor & Information</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-sm text-slate-600 space-y-6 leading-relaxed">
          <section>
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Ej medicinsk rådgivning
            </h4>
            <p>
              minablodprov.se är ett analysverktyg för egenuppföljning och visualisering av dina provsvar. 
              Informationen som presenteras (inklusive statusbedömningar och referensintervall) är generell och ska <strong>aldrig</strong> ses som medicinsk rådgivning, diagnos eller behandlingsförslag.
            </p>
            <p className="mt-3 bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100 font-medium text-xs">
              Vid avvikande värden, symptom eller oro ska du alltid kontakta legitimerad vårdpersonal eller din läkare.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">Eget ansvar & verktyg</h4>
            <p>
              Tjänsten är ett hjälpmedel för dig som vill spåra trender och strukturera din hälsodata. Du ansvarar själv för tolkningen av din data och för att informationen du matar in är korrekt. Beslut rörande din hälsa bör alltid fattas i samråd med vården.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">Integritet & Data</h4>
            <p>
              Din hälsodata tillhör dig. Vi säljer inte din data till tredje part. 
              Datan lagras säkert och används enbart för att tillhandahålla tjänstens funktioner till dig. Eftersom detta är ett eget verktyg har du full kontroll över din historik och kan när som helst begära export eller radering.
            </p>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10">
            Jag förstår
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
