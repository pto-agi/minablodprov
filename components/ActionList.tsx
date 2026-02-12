
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MeasurementTodo, BloodMarker } from '../types';

interface Props {
  todos: MeasurementTodo[];
  availableMarkers?: BloodMarker[];
  onToggle: (id: string, done: boolean) => void;
  onUpdateTags?: (todoId: string, markerIds: string[]) => void;
  onUpdateTask?: (todoId: string, task: string, dueDate: string | null) => Promise<void>;
  onTagClick?: (markerId: string) => void;
  onPlanClick?: (journalId: string) => void; // New prop for navigating to plans
  onDelete?: (id: string) => void;
  onAdd?: (task: string) => Promise<void>;
  variant?: 'card' | 'minimal';
  planTitles?: Record<string, string>;
  hideTags?: boolean; // New prop to hide individual marker tags
}

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

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

const TagModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  todo: MeasurementTodo;
  markers: BloodMarker[];
  onSave: (ids: string[]) => void;
}> = ({ isOpen, onClose, todo, markers, onSave }) => {
  const [selected, setSelected] = useState<string[]>(todo.markerIds || []);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if(isOpen) setSelected(todo.markerIds || []);
  }, [isOpen, todo]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredMarkers = markers.filter(m => {
    const q = search.toLowerCase().trim();
    const isSelected = selected.includes(m.id);

    // If searching, search EVERYTHING
    if (q) {
      return m.name.toLowerCase().includes(q) || 
             m.shortName.toLowerCase().includes(q);
    }

    // If NOT searching (Default View):
    // Show if:
    // 1. It is already selected (so we can uncheck it)
    // 2. It has an abnormal status (we cast to any because BloodMarker type is static, 
    //    but runtime object from App.tsx has 'status')
    const status = (m as any).status;
    const isAbnormal = status === 'high' || status === 'low';

    return isSelected || isAbnormal;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/10 flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 mb-2">Koppla markörer</h4>
          <input 
            autoFocus
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            placeholder="Sök markör..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {!search && (
             <div className="text-[10px] text-slate-400 mt-2 px-1">
                Visar valda & avvikelser. Sök för att hitta andra.
             </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredMarkers.map(m => {
            const isSelected = selected.includes(m.id);
            const status = (m as any).status;
            
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cx(
                  "w-full text-left px-3 py-2.5 text-sm rounded-xl flex justify-between items-center transition-colors group",
                  isSelected ? "bg-indigo-50 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                   <span>{m.name}</span>
                   {status === 'high' && <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" title="Högt" />}
                   {status === 'low' && <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" title="Lågt" />}
                </div>
                {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
              </button>
            )
          })}
          {filteredMarkers.length === 0 && (
            <div className="p-6 text-center">
               <div className="text-xs text-slate-500 font-medium">Inga markörer hittades</div>
               {!search && <div className="text-[10px] text-slate-400 mt-1">Sök för att lägga till markörer inom referensintervallet.</div>}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg"
          >
            Avbryt
          </button>
          <button 
            onClick={() => { onSave(selected); onClose(); }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-sm"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionItem: React.FC<{
  todo: MeasurementTodo;
  isEditing: boolean;
  onToggle: (id: string, done: boolean) => void;
  startEditing: (t: MeasurementTodo) => void;
  cancelEditing: () => void;
  saveEditing: (id: string) => void;
  editTaskText: string;
  setEditTaskText: (s: string) => void;
  editDueDate: string;
  setEditDueDate: (s: string) => void;
  onDelete?: (id: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onTagClick?: (id: string) => void;
  onPlanClick?: (id: string) => void;
  onUpdateTask?: any;
  availableMarkers: BloodMarker[];
  planTitles?: Record<string, string>;
  isCompleted?: boolean;
  hideTags?: boolean;
}> = ({ 
  todo, isEditing, onToggle, startEditing, cancelEditing, saveEditing, 
  editTaskText, setEditTaskText, editDueDate, setEditDueDate, 
  onDelete, onUpdateTags, onTagClick, onPlanClick, onUpdateTask, availableMarkers, planTitles, isCompleted, hideTags
}) => {
  const [tagModalId, setTagModalId] = useState<string | null>(null);
  const planName = todo.linkedJournalId && planTitles ? planTitles[todo.linkedJournalId] : null;
  const getMarker = (id: string) => availableMarkers.find(m => m.id === id);

  return (
    <div className={cx(
      "group flex items-start justify-between transition-all relative rounded-xl",
      isCompleted ? "opacity-60 hover:opacity-100 bg-slate-50/50 p-2" : "p-2 hover:bg-slate-50"
    )}>
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
            <div className={cx(
              "w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 transition-all shadow-sm",
              todo.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"
            )} />
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
              <div className={cx("text-sm font-bold text-slate-800 break-words leading-snug", todo.done && "line-through text-slate-400")}>
                {todo.task}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                 {/* Plan Badge (Clickable) */}
                 {planName && (
                    <button 
                      onClick={() => onPlanClick && todo.linkedJournalId ? onPlanClick(todo.linkedJournalId) : undefined}
                      className={cx(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide truncate max-w-[150px] transition-colors",
                        onPlanClick 
                          ? "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:border-purple-200 cursor-pointer" 
                          : "bg-purple-50 text-purple-700 border-purple-100 cursor-default"
                      )}
                    >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                       {planName}
                    </button>
                 )}

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

                 {/* Tags (Markers) - HIDDEN if hideTags is true */}
                 {!hideTags && todo.markerIds?.map(mid => {
                   const m = getMarker(mid);
                   if (!m) return null;
                   
                   const buttonClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide transition-colors";
                   const hoverClass = onTagClick ? "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 cursor-pointer" : "cursor-default";

                   if (onTagClick) {
                      return (
                         <button 
                           key={mid} 
                           onClick={() => onTagClick(mid)}
                           className={cx(buttonClass, hoverClass)}
                         >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            {m.shortName || m.name}
                         </button>
                      );
                   }
                   return (
                      <span key={mid} className={buttonClass}>
                         <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                         {m.shortName || m.name}
                      </span>
                   )
                 })}
                 
                 {/* Only show add tag button if tags are not hidden */}
                 {!hideTags && onUpdateTags && (
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
};

const ActionList: React.FC<Props> = ({ 
  todos, 
  availableMarkers = [],
  onToggle, 
  onUpdateTags,
  onUpdateTask,
  onTagClick,
  onPlanClick,
  onDelete, 
  onAdd,
  variant = 'card',
  planTitles,
  hideTags = false
}) => {
  const [newTask, setNewTask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Group Todos
  const { activeTodos, completedTodos } = useMemo(() => {
    return {
      activeTodos: todos.filter(t => !t.done),
      completedTodos: todos.filter(t => t.done).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    };
  }, [todos]);

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
    ? "bg-white/80 backdrop-blur-md rounded-3xl shadow-sm ring-1 ring-slate-900/5 overflow-visible p-2"
    : "space-y-1"; 

  if (todos.length === 0 && !onAdd) return null;

  const itemProps = {
    onToggle, onUpdateTags, onUpdateTask, onTagClick, onPlanClick, onDelete, 
    availableMarkers, planTitles, hideTags,
    startEditing, cancelEditing, saveEditing,
    editTaskText, setEditTaskText, editDueDate, setEditDueDate
  };

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
        {/* Active Todos */}
        {activeTodos.map(todo => (
          <ActionItem 
            key={todo.id} 
            todo={todo} 
            isEditing={editingId === todo.id}
            {...itemProps} 
          />
        ))}

        {/* Input Field */}
        {onAdd && (
          <div className="mt-2 pt-2 px-2 pb-2">
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

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">
                Slutförda ({completedTodos.length})
             </h4>
             {completedTodos.map(todo => (
                <ActionItem 
                  key={todo.id} 
                  todo={todo} 
                  isEditing={editingId === todo.id}
                  isCompleted={true}
                  {...itemProps} 
                />
             ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export default ActionList;
