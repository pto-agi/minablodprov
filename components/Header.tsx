
import React from 'react';

export type NavTab = 'dashboard' | 'plan' | 'account';

interface Props {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  loading: boolean;
  onRefresh?: () => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
  onOpenTimeline?: () => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Internal Icon Component for Cleaner Code
const NavIcon = ({ name, active }: { name: string; active: boolean }) => {
  const colorClass = active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600";
  
  switch (name) {
    case 'dashboard':
      return (
        <svg className={cx("w-4 h-4 transition-colors", colorClass)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'plan':
      return (
        <svg className={cx("w-4 h-4 transition-colors", colorClass)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    default: return null;
  }
};

const Header: React.FC<Props> = ({ 
  activeTab, 
  onNavigate, 
  loading, 
  onRefresh
}) => {
  
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Översikt' },
    { id: 'plan', label: 'Åtgärdsplan' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 transition-all duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
        
        {/* LOGO AREA */}
        <div className="flex items-center gap-3 min-w-0 w-24 sm:w-auto">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-extrabold shadow-sm shrink-0 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <span className="font-display tracking-tight text-sm">MB</span>
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/15" />
          </div>
          <div className="min-w-0 hidden md:block cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <h1 className="text-base font-display font-bold text-slate-900 tracking-tight leading-none">
              minablodprov.se
            </h1>
          </div>
        </div>

        {/* CENTER NAV - SEGMENTED CONTROL */}
        <nav className="flex items-center p-1 bg-slate-100/80 rounded-xl ring-1 ring-slate-900/5 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  "group flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                  isActive 
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
              >
                <NavIcon name={item.id} active={isActive} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS: My Account Button */}
        <div className="flex items-center w-24 sm:w-auto justify-end gap-2">
          {onRefresh && (
             <button
                onClick={onRefresh}
                className={cx(
                   "p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors hidden sm:block",
                   loading && "animate-spin text-slate-500 cursor-not-allowed"
                )}
                disabled={loading}
                title="Uppdatera data"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
          )}

          <button
            onClick={() => onNavigate('account')}
            className={cx(
              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border",
              activeTab === 'account'
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            <div className={cx(
              "w-5 h-5 rounded-full flex items-center justify-center",
              activeTab === 'account' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}>
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <span className="text-xs font-bold hidden sm:inline">Mitt konto</span>
            {loading && !onRefresh && (
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
