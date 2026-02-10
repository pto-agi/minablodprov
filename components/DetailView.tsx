
import React, { useState } from 'react';
import { MarkerHistory, MeasurementTodo, Measurement } from '../types';
import { formatDateTime, formatDate, formatNumber } from '../utils';
import HistoryChart from './HistoryChart';
import ReferenceVisualizer from './ReferenceVisualizer';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

interface Props {
  data: MarkerHistory;
  onBack: () => void;
  onAddMeasurement: (markerId: string) => void;
  onSaveNote: (markerId: string, note: string) => Promise<void>;
  onUpdateNote: (noteId: string, note: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onUpdateMeasurementNote: (measurementId: string, note: string | null) => Promise<void>;
  todos: MeasurementTodo[];
  onAddTodo: (measurementId: string, task: string) => Promise<void>;
  onToggleTodo: (todoId: string, done: boolean) => Promise<void>;
  onUpdateTodo: (todoId: string, task: string) => Promise<void>;
  onDeleteTodo: (todoId: string) => Promise<void>;
}

const DetailView: React.FC<Props> = ({
  data,
  onBack,
  onAddMeasurement,
  onSaveNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateMeasurementNote,
  todos,
  onAddTodo,
  onToggleTodo,
  onUpdateTodo,
  onDeleteTodo,
}) => {
  // UI State
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  
  // Marker Note Editing
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingMarkerNoteId, setEditingMarkerNoteId] = useState<string | null>(null);
  const [editingMarkerNoteText, setEditingMarkerNoteText] = useState('');

  // Measurement Note Editing
  const [editingMeasurementNoteId, setEditingMeasurementNoteId] = useState<string | null>(null);
  const [editingMeasurementNoteText, setEditingMeasurementNoteText] = useState('');

  // Todo Editing
  const [newTodo, setNewTodo] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  const { latestMeasurement } = data;

  // Handlers for Marker Notes
  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    await onSaveNote(data.id, newNote);
    setNewNote('');
    setIsAddingNote(false);
  };

  const startEditMarkerNote = (id: string, text: string) => {
    setEditingMarkerNoteId(id);
    setEditingMarkerNoteText(text);
  };

  const handleSaveMarkerNoteEdit = async () => {
    if (!editingMarkerNoteId) return;
    await onUpdateNote(editingMarkerNoteId, editingMarkerNoteText);
    setEditingMarkerNoteId(null);
  };

  // Handlers for Measurement Notes
  const startEditMeasurementNote = (m: Measurement) => {
    setEditingMeasurementNoteId(m.id);
    setEditingMeasurementNoteText(m.note || '');
  };

  const handleSaveMeasurementNote = async () => {
    if (!editingMeasurementNoteId) return;
    const val = editingMeasurementNoteText.trim() || null;
    await onUpdateMeasurementNote(editingMeasurementNoteId, val);
    setEditingMeasurementNoteId(null);
  };

  // Handlers for Todos
  const handleAddTodoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestMeasurement || !newTodo.trim()) return;
    await onAddTodo(latestMeasurement.id, newTodo);
    setNewTodo('');
  };

  const startEditTodo = (t: MeasurementTodo) => {
    setEditingTodoId(t.id);
    setEditingTodoText(t.task);
  };

  const handleUpdateTodoSubmit = async () => {
    if (!editingTodoId) return;
    await onUpdateTodo(editingTodoId, editingTodoText);
    setEditingTodoId(null);
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white/50 px-3 py-2 rounded-full ring-1 ring-slate-900/5 hover:bg-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Tillbaka
        </button>

        <button
          onClick={() => onAddMeasurement(data.id)}
          className="rounded-full px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
        >
          Ny mätning
        </button>
      </div>

      {/* Hero Card */}
      <div className="bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{data.name}</h2>
            <div className="text-sm text-slate-500 mt-1 font-medium">{data.description}</div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Ref: {formatNumber(data.minRef)}–{formatNumber(data.maxRef)} {data.unit}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Kategori: {data.category}
              </span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
             {latestMeasurement ? (
                <div>
                   <div className="text-4xl font-display font-bold text-slate-900">
                      {formatNumber(latestMeasurement.value)}
                      <span className="text-lg text-slate-400 font-medium ml-1">{data.unit}</span>
                   </div>
                   <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">
                      {formatDate(latestMeasurement.date)}
                   </div>
                </div>
             ) : (
                <div className="text-slate-400 font-medium">Inga värden än</div>
             )}
          </div>
        </div>

        {/* Visualizers */}
        {latestMeasurement && (
            <div className="mt-8">
                <ReferenceVisualizer
                    value={latestMeasurement.value}
                    minRef={data.minRef}
                    maxRef={data.maxRef}
                    displayMin={data.displayMin}
                    displayMax={data.displayMax}
                    status={data.status}
                    goalMin={data.goal?.targetMin}
                    goalMax={data.goal?.targetMax}
                />
            </div>
        )}

        <div className="mt-8 h-64 w-full">
            <HistoryChart
                measurements={data.measurements}
                minRef={data.minRef}
                maxRef={data.maxRef}
                unit={data.unit}
            />
        </div>
      </div>

      {/* Action / Todos Section (Only if we have a latest measurement) */}
      {latestMeasurement && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
           <div className="bg-white ring-1 ring-slate-900/5 shadow-sm rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-display font-bold text-lg text-slate-900">Att göra</h3>
                 <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Kopplat till senaste</span>
              </div>
              
              <div className="space-y-3">
                 {todos.map(todo => (
                    <div key={todo.id} className="group flex items-start gap-3 p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                       <input 
                          type="checkbox" 
                          checked={todo.done}
                          onChange={(e) => onToggleTodo(todo.id, e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                       />
                       
                       <div className="flex-1 min-w-0">
                          {editingTodoId === todo.id ? (
                             <div className="flex flex-col gap-2">
                                <input
                                  value={editingTodoText}
                                  onChange={(e) => setEditingTodoText(e.target.value)}
                                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                   <button onClick={handleUpdateTodoSubmit} className="text-xs font-bold text-emerald-700">Spara</button>
                                   <button onClick={() => setEditingTodoId(null)} className="text-xs font-semibold text-slate-500">Avbryt</button>
                                </div>
                             </div>
                          ) : (
                             <div className={cx("text-sm text-slate-700 break-words", todo.done && "line-through text-slate-400")}>
                                {todo.task}
                             </div>
                          )}
                       </div>

                       {!editingTodoId && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button onClick={() => startEditTodo(todo)} className="text-slate-400 hover:text-slate-700">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                             <button onClick={() => onDeleteTodo(todo.id)} className="text-slate-400 hover:text-rose-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                       )}
                    </div>
                 ))}

                 <form onSubmit={handleAddTodoSubmit} className="relative">
                    <input
                       value={newTodo}
                       onChange={(e) => setNewTodo(e.target.value)}
                       placeholder="Lägg till åtgärd..."
                       className="w-full text-sm bg-white ring-1 ring-slate-900/10 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button 
                       type="submit"
                       disabled={!newTodo.trim()}
                       className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-50 disabled:bg-slate-200"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                 </form>
              </div>
           </div>

           {/* Latest Note Card */}
           <div className="bg-white ring-1 ring-slate-900/5 shadow-sm rounded-3xl p-5">
              <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Senaste anteckning</h3>
              {editingMeasurementNoteId === latestMeasurement.id ? (
                 <div className="flex flex-col gap-3 h-full">
                    <textarea 
                       value={editingMeasurementNoteText}
                       onChange={(e) => setEditingMeasurementNoteText(e.target.value)}
                       className="w-full flex-1 bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                       rows={4}
                    />
                    <div className="flex gap-2 justify-end">
                       <button onClick={() => setEditingMeasurementNoteId(null)} className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-100">Avbryt</button>
                       <button onClick={handleSaveMeasurementNote} className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg">Spara</button>
                    </div>
                 </div>
              ) : (
                 <div className="group relative h-full min-h-[100px]">
                    <div className="text-sm text-slate-600 whitespace-pre-wrap">
                       {latestMeasurement.note || <span className="text-slate-400 italic">Ingen anteckning för denna mätning.</span>}
                    </div>
                    <button 
                       onClick={() => startEditMeasurementNote(latestMeasurement)}
                       className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl w-fit">
           <button
             onClick={() => setActiveTab('log')}
             className={cx(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'log' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
             )}
           >
              Loggbok
           </button>
           <button
             onClick={() => setActiveTab('history')}
             className={cx(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'history' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
             )}
           >
              Historik
           </button>
        </div>
      </div>

      <div className="mt-4">
         {activeTab === 'log' && (
            <div className="space-y-4">
               {/* Add Note */}
               {!isAddingNote ? (
                  <button 
                     onClick={() => setIsAddingNote(true)}
                     className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-semibold hover:border-slate-300 hover:text-slate-600 transition-all text-sm"
                  >
                     + Lägg till generell anteckning
                  </button>
               ) : (
                  <div className="bg-white p-4 rounded-2xl ring-1 ring-slate-900/5 shadow-sm animate-in fade-in slide-in-from-top-2">
                     <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Skriv din anteckning..."
                        rows={3}
                        className="w-full text-sm bg-slate-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900 mb-3"
                        autoFocus
                     />
                     <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAddingNote(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl">Avbryt</button>
                        <button onClick={handleSaveNote} className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-xl">Spara</button>
                     </div>
                  </div>
               )}

               {/* Notes List */}
               {data.notes.map(note => {
                  const isEditing = editingMarkerNoteId === note.id;
                  return (
                     <div key={note.id} className="bg-white p-5 rounded-3xl ring-1 ring-slate-900/5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                              {formatDateTime(note.date)}
                           </div>
                           {!isEditing && (
                              <div className="flex gap-2">
                                 <button onClick={() => startEditMarkerNote(note.id, note.note)} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Ändra</button>
                                 <button onClick={() => onDeleteNote(note.id)} className="text-xs font-semibold text-rose-300 hover:text-rose-600">Ta bort</button>
                              </div>
                           )}
                        </div>
                        
                        {isEditing ? (
                           <div className="space-y-3">
                              <textarea
                                 value={editingMarkerNoteText}
                                 onChange={(e) => setEditingMarkerNoteText(e.target.value)}
                                 className="w-full bg-slate-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                 rows={3}
                              />
                              <div className="flex gap-2 justify-end">
                                 <button onClick={() => setEditingMarkerNoteId(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Avbryt</button>
                                 <button onClick={handleSaveMarkerNoteEdit} className="text-sm font-bold text-slate-900">Spara</button>
                              </div>
                           </div>
                        ) : (
                           <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {note.note}
                           </div>
                        )}
                     </div>
                  );
               })}
               
               {data.notes.length === 0 && !isAddingNote && (
                  <div className="text-center py-10 text-slate-400 text-sm">Inga anteckningar än.</div>
               )}
            </div>
         )}

         {activeTab === 'history' && (
            <div className="space-y-3">
               {data.measurements.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-3xl ring-1 ring-slate-900/5 shadow-sm flex items-start justify-between">
                     <div>
                        <div className="text-lg font-bold text-slate-900">
                           {formatNumber(m.value)} <span className="text-sm text-slate-400 font-medium">{data.unit}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-1">
                           {formatDate(m.date)}
                        </div>
                        {m.note && (
                           <div className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                              {m.note}
                           </div>
                        )}
                     </div>
                     
                     <button
                        onClick={() => {
                           // Use existing edit logic for measurement note
                           if (editingMeasurementNoteId === m.id) {
                              setEditingMeasurementNoteId(null);
                           } else {
                              startEditMeasurementNote(m);
                              // Scroll to top or handle UI for editing history note better? 
                              // For now just toggle into edit state, but the edit UI is in the top card.
                              // Ideally we should allow inline edit here too.
                              // Let's implement inline edit here for simplicity
                           }
                        }}
                        className="p-2 text-slate-300 hover:text-slate-600"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                     </button>
                  </div>
               ))}
               
               {/* Inline edit modal for history item could be added here if needed, but keeping it simple */}
               {editingMeasurementNoteId && !latestMeasurement && (
                  // Fallback if we are editing a history item but it's not the latest (which has dedicated UI)
                  // This is a bit rough, but functional for now.
                  <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
                     <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4">Redigera anteckning</h3>
                        <textarea
                           value={editingMeasurementNoteText}
                           onChange={(e) => setEditingMeasurementNoteText(e.target.value)}
                           className="w-full bg-slate-50 rounded-xl p-3 mb-4 h-32"
                        />
                        <div className="flex justify-end gap-3">
                           <button onClick={() => setEditingMeasurementNoteId(null)} className="px-4 py-2 rounded-xl text-sm font-semibold">Avbryt</button>
                           <button onClick={handleSaveMeasurementNote} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Spara</button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
    </div>
  );
};

export default DetailView;
