
import React, { useState, useRef, useEffect } from 'react';
import { MeasurementTodo, BloodMarker } from '../types';

interface Props {
  todos: MeasurementTodo[];
  availableMarkers?: BloodMarker[];
  onToggle: (id: string, done: boolean) => void;
  onUpdateTags?: (todoId: string, markerIds: string[]) => void;
  onUpdateTask?: (todoId: string, task: string, dueDate: string | null) => Promise<void>; // New prop for editing text/date
  onTagClick?: (markerId: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (task: string) => Promise<void>;
  variant?: 'card' | 'minimal';
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Helper to format date nicely (e.g. "12 okt")
const formatDueDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('sv-SE', { 
    month: 'short', 
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric' 
  });
};

// ... TagModal remains the same (omitted for brevity, but logically part of file if not separating) ...
// We include TagModal here to ensure the file is complete.
const TagModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  todo: MeasurementTodo;
  markers: BloodMarker[];
  onSave: (ids: string[]) => void;
}> = ({ isOpen, onClose, todo, markers, onSave }) => {
  const [selected, setSelected] = useState<string[]>(todo.markerIds || []);
  const [search, setSearch] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(isOpen) setSelected(todo.markerIds || []);
  }, [isOpen, todo]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredMarkers = markers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.shortName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute right-0 top-8 z-50 w-64 bg-white rounded-xl shadow-xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200" ref={modalRef}>
      <div className="p-3 border-b border-slate-100">
        <input 
          autoFocus
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Sök markör..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {filteredMarkers.map(m => {
          const isSelected = selected.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={cx(
                "w-full text-left px-3 py-2 text-xs rounded-lg flex justify-between items-center transition-colors",
                isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <span>{m.name}</span>
              {isSelected && <span className="text-indigo-500">✓</span>}
            </button>
          )
        })}
        {filteredMarkers.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">Inget hittades</div>}
      </div>
      <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex justify-end">
        <button 
          onClick={() => { onSave(selected); onClose(); }}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
        >
          Klar
        </button>
      </div>
    </div>
  );
};

const ActionList: React.FC<Props> = ({ 
  todos, 
  availableMarkers = [],
  onToggle, 
  onUpdateTags,
  onUpdateTask,
  onTagClick,
  onDelete, 
  onAdd,
  variant = 'card' 
}) => {
  const [newTask, setNewTask] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [tagModalId, setTagModalId] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const startEditing = (todo: MeasurementTodo) => {
    setEditingId(todo.id);
    setEditTaskText(todo.task);
    setEditDueDate(todo.dueDate || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTaskText('');
    setEditDueDate('');
  };

  const saveEditing = async (id: string) => {
    if (onUpdateTask && editTaskText.trim()) {
      await onUpdateTask(id, editTaskText.trim(), editDueDate || null);
    }
    setEditingId(null);
  };

  const handleAddKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTask.trim() && onAdd) {
      setIsAdding(true);
      await onAdd(newTask);
      setNewTask('');
      setIsAdding(false);
    }
  };

  const Container = variant === 'card' ? 'section' : 'div';
  const listClasses = variant === 'card' 
    ? "bg-white/80 backdrop-blur-md rounded-3xl shadow-sm ring-1 ring-slate-900/5 overflow-visible"
    : "space-y-1"; 

  const itemClasses = variant === 'card'
    ? "p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
    : "p-2 hover:bg-slate-50 rounded-xl";

  const getMarker = (id: string) => availableMarkers.find(m => m.id === id);

  if (todos.length === 0 && !onAdd) return null;

  return (
    <Container className={cx(variant === 'card' && "mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700")}>
      
      {variant === 'card' && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Din åtgärdslista
          </h3>
        </div>
      )}

      <div className={listClasses}>
        {todos.map((todo) => {
          const isEditing = editingId === todo.id;

          return (
            <div 
              key={todo.id} 
              className={cx("group flex items-start justify-between transition-colors relative", itemClasses)}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Checkbox */}
                {!isEditing && (
                  <label className="mt-0.5 relative flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform shrink-0">
                    <input 
                      type="checkbox" 
                      checked={todo.done} 
                      onChange={(e) => onToggle(todo.id, e.target.checked)}
                      className="peer sr-only" 
                    />
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-slate-300 bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all shadow-sm" />
                    <svg className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </label>
                )}

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
                      <input 
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                        className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative">
                           <input 
                             type="date"
                             value={editDueDate}
                             onChange={(e) => setEditDueDate(e.target.value)}
                             className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                           />
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded">Avbryt</button>
                          <button onClick={() => saveEditing(todo.id)} className="px-3 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm">Spara</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={cx("text-sm font-bold text-slate-800 break-words leading-snug flex items-start justify-between", todo.done && "line-through text-slate-400")}>
                        <span>{todo.task}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                         {/* Date Badge */}
                         {todo.dueDate && (
                           <span className={cx(
                             "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide",
                             new Date(todo.dueDate) < new Date() && !todo.done ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-50 text-slate-500 border-slate-200"
                           )}>
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                             {formatDueDate(todo.dueDate)}
                           </span>
                         )}

                         {/* Tags */}
                         {todo.markerIds?.map(mid => {
                           const m = getMarker(mid);
                           if (!m) return null;
                           if (onTagClick) {
                              return (
                                 <button 
                                   key={mid} 
                                   onClick={() => onTagClick(mid)}
                                   className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                                 >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    {m.shortName || m.name}
                                 </button>
                              );
                           }
                           return (
                              <span key={mid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                 {m.shortName || m.name}
                              </span>
                           )
                         })}
                         
                         {onUpdateTags && (
                           <div className="relative">
                             <button 
                               onClick={() => setTagModalId(tagModalId === todo.id ? null : todo.id)}
                               className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                             >
                               + Tagga
                             </button>
                             {tagModalId === todo.id && (
                               <TagModal 
                                 isOpen={true} 
                                 onClose={() => setTagModalId(null)}
                                 todo={todo}
                                 markers={availableMarkers}
                                 onSave={(ids) => onUpdateTags(todo.id, ids)}
                               />
                             )}
                           </div>
                         )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side Actions */}
              {!isEditing && (
                <div className="flex items-center ml-2 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUpdateTask && (
                    <button
                      onClick={() => startEditing(todo)}
                      className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                      title="Redigera"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={() => onDelete(todo.id)} 
                      className="text-slate-300 hover:text-rose-500 p-2 transition-colors"
                      title="Ta bort"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Input Field */}
        {onAdd && (
          <div className="mt-2 pt-2 px-2">
             <input 
                 value={newTask}
                 onChange={e => setNewTask(e.target.value)}
                 onKeyDown={handleAddKey}
                 disabled={isAdding}
                 placeholder="+ Lägg till uppgift (Enter)..." 
                 className="w-full text-sm bg-transparent px-2 py-2 border-b border-transparent focus:border-slate-900 outline-none placeholder:text-slate-400 transition-colors"
              />
          </div>
        )}
      </div>
    </Container>
  );
};

export default ActionList;
