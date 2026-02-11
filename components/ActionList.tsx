
import React from 'react';
import { MeasurementTodo } from '../types';

interface EnrichedTodo extends MeasurementTodo {
  markerName?: string;
  markerId?: string;
}

interface Props {
  todos: EnrichedTodo[];
  onToggle: (id: string, done: boolean) => void;
  onSelectMarker: (markerId: string) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const ActionList: React.FC<Props> = ({ todos, onToggle, onSelectMarker }) => {
  if (todos.length === 0) return null;

  return (
    <section className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Din åtgärdslista
        </h3>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        {todos.map((todo, idx) => (
          <div 
            key={todo.id} 
            className={cx(
              "group flex items-center justify-between p-4 transition-colors hover:bg-slate-50/80",
              idx !== todos.length - 1 && "border-b border-slate-100"
            )}
          >
            <div className="flex items-center gap-4 min-w-0">
              {/* Custom Checkbox */}
              <label className="relative flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform">
                <input 
                  type="checkbox" 
                  checked={todo.done} 
                  onChange={(e) => onToggle(todo.id, e.target.checked)}
                  className="peer sr-only" 
                />
                <div className="w-6 h-6 rounded-lg border-2 border-slate-300 bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all shadow-sm" />
                <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </label>

              <div className="min-w-0 flex-1">
                <div className={cx("text-sm font-bold text-slate-800 break-words", todo.done && "line-through text-slate-400")}>
                  {todo.task}
                </div>
              </div>
            </div>

            {/* Marker Context Pill */}
            {todo.markerName && (
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (todo.markerId) onSelectMarker(todo.markerId);
                }}
                className="shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 hover:bg-white hover:border-slate-300 hover:text-slate-900 transition-all hover:shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">{todo.markerName}</span>
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ActionList;
