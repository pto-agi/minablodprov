# Supabase Notes

## Recommended RLS Policy Pattern
For user-owned tables, the typical pattern is:

- Enable RLS
- Allow `select/insert/update/delete` where `auth.uid() = user_id`

Example (adjust per table):
```
alter table public.measurements enable row level security;

create policy "measurements_select_own"
on public.measurements for select
using (auth.uid() = user_id);

create policy "measurements_insert_own"
on public.measurements for insert
with check (auth.uid() = user_id);

create policy "measurements_update_own"
on public.measurements for update
using (auth.uid() = user_id);

create policy "measurements_delete_own"
on public.measurements for delete
using (auth.uid() = user_id);
```

## Indexes
See `/supabase/migrations/0001_indexes.sql`.
