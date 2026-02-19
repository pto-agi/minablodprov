
import React from 'react';
import { Logo } from './Logo';

export type NavTab = 'dashboard' | 'plan' | 'account';

interface Props {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  loading: boolean;
  onRefresh?: () => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
  onOpenTimeline?: () => void;
  articlesHref?: string;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Internal Icon Component for Cleaner Code
const NavIcon = ({ name, active }: { name: string; active: boolean }) => {
  const colorClass = active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600";
  // Increased icon size slightly for better visibility
  const sizeClass = "w-5 h-5"; 
  
  switch (name) {
    case 'dashboard':
      return (
        <svg className={cx(sizeClass, "transition-colors", colorClass)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'plan':
      return (
        <svg className={cx(sizeClass, "transition-colors", colorClass)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  onRefresh,
  articlesHref
}) => {
  
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Översikt' },
    { id: 'plan', label: 'Åtgärdsplan' },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/70 transition-all duration-200 shadow-sm sm:shadow-none">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 relative">
        
        {/* LOGO AREA - Shrink on mobile to give space to nav */}
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => onNavigate('dashboard')} 
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Gå till översikt"
          >
            {/* Mobile: Icon only */}
            <Logo variant="icon" className="h-9 w-9 text-slate-900 md:hidden" />
            {/* Desktop: Full Logo */}
            <Logo variant="full" className="h-8 w-auto text-slate-900 hidden md:block" />
          </button>
        </div>

        {/* CENTER NAV - SEGMENTED CONTROL */}
        {/* Mobile: Flex-1 to take up all space. Desktop: Absolute center */}
        <nav className={cx(
          "flex items-center p-1.5 bg-slate-100/80 rounded-2xl ring-1 ring-slate-900/5 transition-all",
          // Mobile styles: grow to fill space, static position
          "flex-1 mx-2 static",
          // Desktop styles: absolute center, auto width
          "md:absolute md:left-1/2 md:-translate-x-1/2 md:mx-0 md:w-auto md:flex-none"
        )}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  "group flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200",
                  // Sizing
                  "py-2.5 px-2 md:px-6 flex-1 md:flex-none",
                  isActive 
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
              >
                <NavIcon name={item.id} active={isActive} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {articlesHref && (
            <a
              href={articlesHref}
              className="hidden sm:inline-flex items-center px-3 py-2 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
            >
              Artiklar
            </a>
          )}
          {onRefresh && (
             <button
                onClick={onRefresh}
                className={cx(
                   "p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors hidden sm:block",
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
              "flex items-center gap-2 rounded-full transition-all border",
              // Mobile: Icon only button styling
              "p-2 sm:px-3 sm:py-2",
              activeTab === 'account'
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
            )}
            title="Mitt konto"
          >
            <div className={cx(
              "w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center",
              activeTab === 'account' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}>
               <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <span className="text-xs font-bold hidden sm:inline">Mitt konto</span>
            {loading && !onRefresh && (
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
