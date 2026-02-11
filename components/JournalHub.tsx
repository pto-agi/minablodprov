
import React from 'react';
import { JournalPlan, BloodMarker } from '../types';
import { formatDate } from '../utils';

interface Props {
  plans: JournalPlan[];
  markers: BloodMarker[];
  onOpenPlan: (plan: JournalPlan | null) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const JournalHub: React.FC<Props> = ({ plans, markers, onOpenPlan }) => {
  const getMarkerNames = (ids: string[]) => {
    return ids.map(id => markers.find(m => m.id === id)?.shortName).filter(Boolean).slice(0, 3);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-6 px-1">
         <h2 className="text-xl font-display font-bold text-slate-900">Mina Planer & Dagbok</h2>
         <button 
           onClick={() => onOpenPlan(null)}
           className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 flex items-center gap-2"
         >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny Plan
         </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
              📖
           </div>
           <h3 className="text-lg font-bold text-slate-900">Inga planer skapade än</h3>
           <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
              Använd dagboken för att skapa långsiktiga strategier, protokoll eller djupare reflektioner kopplade till dina värden.
           </p>
           <button 
             onClick={() => onOpenPlan(null)}
             className="mt-6 text-emerald-600 font-bold text-sm hover:underline"
           >
             Skapa din första plan &rarr;
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {plans.map(plan => {
             const tags = getMarkerNames(plan.linkedMarkerIds);
             const plainText = plan.content.replace(/<[^>]+>/g, '').substring(0, 120) + '...';

             return (
               <button 
                 key={plan.id}
                 onClick={() => onOpenPlan(plan)}
                 className="group text-left bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-900/5 hover:shadow-md hover:ring-slate-900/10 transition-all flex flex-col h-64"
               >
                  <div className="flex-1">
                     <h3 className="font-display font-bold text-lg text-slate-900 mb-2 leading-tight group-hover:text-emerald-700 transition-colors">
                        {plan.title || 'Namnlös plan'}
                     </h3>
                     <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                        {plainText}
                     </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        {tags.length > 0 ? (
                           <div className="flex -space-x-2">
                              {tags.map((t, i) => (
                                 <div key={i} className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 ring-2 ring-white">
                                    {t}
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <span className="text-[10px] font-bold text-slate-300 uppercase">Inga taggar</span>
                        )}
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {formatDate(plan.updatedAt)}
                     </span>
                  </div>
               </button>
             );
           })}
        </div>
      )}
    </div>
  );
};

export default JournalHub;
