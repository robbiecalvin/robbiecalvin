-- Course 01 learning records are served through the existing account edge function.
create table public.rc_learning_c01 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null check (
    jsonb_typeof(state) = 'object' and jsonb_typeof(state->'completed') = 'object'
    and jsonb_typeof(state->'attempts') = 'array' and jsonb_typeof(state->'capstones') = 'array'
  ),
  certificate_id text generated always as (state->'certificate'->>'id') stored unique,
  pending_review boolean generated always as (
    jsonb_array_length(state->'capstones') > 0 and
    (state->'capstones'->(-1)->'review') is null
  ) stored
);
alter table public.rc_learning_c01 enable row level security;
revoke all on public.rc_learning_c01 from public, anon, authenticated;
grant select, insert, update on public.rc_learning_c01 to service_role;
create index rc_learning_c01_pending_idx on public.rc_learning_c01 (user_id) where pending_review;

insert into storage.buckets (id, name, public)
values ('ai-unlocked-private', 'ai-unlocked-private', false)
on conflict (id) do update set public = false;
-- Restrictive even if other application policies grant broad storage access.
create policy "AI Unlocked runtime is service-only" on storage.objects
as restrictive for all to anon, authenticated
using (bucket_id <> 'ai-unlocked-private')
with check (bucket_id <> 'ai-unlocked-private');
