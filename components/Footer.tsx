
import React, { useState } from 'react';
import TermsModal from './TermsModal';

const Footer: React.FC = () => {
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <>
      <footer className="mt-auto border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
              MB
            </div>
            <span className="text-xs font-medium text-slate-500">
              © 2026 minablodprov.se
            </span>
          </div>

          <div className="flex gap-6 text-xs font-semibold text-slate-500">
            <button 
              onClick={() => setIsTermsOpen(true)} 
              className="hover:text-slate-900 transition-colors"
            >
              Villkor & Integritet
            </button>
          </div>

          <div className="text-[10px] text-slate-400 max-w-xs text-center md:text-right">
            Ej medicinsk rådgivning. Vid symtom, kontakta vården.
          </div>
        </div>
      </footer>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </>
  );
};

export default Footer;
