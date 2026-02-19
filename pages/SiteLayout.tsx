import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo';

const SiteLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="icon" className="w-8 h-8 text-slate-900" />
            <span className="text-sm font-bold text-slate-900">minablodprov.se</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link to="/artiklar" className="hover:text-slate-900">Artiklar</Link>
            <Link to="/app" className="px-3 py-1.5 rounded-full bg-slate-900 text-white">Till appen</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-slate-500 flex items-center justify-between">
          <span>© 2026 minablodprov.se</span>
          <span>Ej medicinsk rådgivning</span>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
