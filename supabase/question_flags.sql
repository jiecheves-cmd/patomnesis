-- Tabla para que alumnos marquen preguntas con un comentario, y el profesorado las revise.
create table if not exists public.question_flags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  reported_by uuid references public.profiles(id) on delete set null,
  comment text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

alter table public.question_flags enable row level security;

drop policy if exists "Users can flag questions" on public.question_flags;
create policy "Users can flag questions"
  on public.question_flags for insert
  with check (auth.uid() = reported_by);

drop policy if exists "Teachers can view flags" on public.question_flags;
create policy "Teachers can view flags"
  on public.question_flags for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('teacher', 'supervisor', 'admin')
    )
  );

drop policy if exists "Teachers can resolve flags" on public.question_flags;
create policy "Teachers can resolve flags"
  on public.question_flags for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('teacher', 'supervisor', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('teacher', 'supervisor', 'admin')
    )
  );

grant select, insert, update on public.question_flags to authenticated;
