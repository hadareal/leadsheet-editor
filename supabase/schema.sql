-- Schema for the `songs` table, as run by hand in the Supabase SQL Editor.
-- This is a reference snapshot, not an applied migration -- the app talks to
-- Supabase's live Postgres instance directly (see sync.js) and never reads
-- this file. Kept here so the schema and RLS policies have a version-controlled
-- record instead of existing only in the Supabase dashboard.

create table public.songs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;

create policy "Users can view their own songs"
  on public.songs for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own songs"
  on public.songs for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own songs"
  on public.songs for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own songs"
  on public.songs for delete
  using (auth.uid() = owner_id);
