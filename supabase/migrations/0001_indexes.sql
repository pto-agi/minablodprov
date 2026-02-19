-- Suggested indexes for performance on common access paths
-- Safe to run multiple times

create index if not exists measurements_user_id_measured_at_idx
  on public.measurements (user_id, measured_at desc);

create index if not exists marker_notes_user_id_created_at_idx
  on public.marker_notes (user_id, created_at desc);

create index if not exists measurement_todos_user_id_created_at_idx
  on public.measurement_todos (user_id, created_at desc);

create index if not exists journal_entries_user_id_updated_at_idx
  on public.journal_entries (user_id, updated_at desc);

create index if not exists journal_entry_markers_journal_id_idx
  on public.journal_entry_markers (journal_id);

create index if not exists journal_goals_journal_id_idx
  on public.journal_goals (journal_id);

create index if not exists user_marker_settings_user_id_idx
  on public.user_marker_settings (user_id);

create index if not exists user_stats_history_user_id_log_date_idx
  on public.user_stats_history (user_id, log_date);
