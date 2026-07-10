create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'supervisor', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_group text not null default 'student',
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  stem text not null,
  category text not null,
  system text,
  topic text,
  difficulty text not null check (difficulty in ('basic', 'intermediate', 'advanced')),
  explanation text not null,
  key_point text,
  image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position int not null
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  mode text not null default 'practice',
  category_filter text,
  difficulty_filter text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score int not null default 0,
  total int not null default 0
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id) on delete set null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id <> old.id
      or new.email <> old.email
      or new.role <> old.role
      or new.created_at <> old.created_at then
      raise exception 'Solo se puede actualizar el nombre del perfil desde la app';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_identity_trigger on public.profiles;
create trigger protect_profile_identity_trigger
  before update on public.profiles
  for each row
  execute function public.protect_profile_identity();

create or replace function public.set_profile_role(target_profile_id uuid, next_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if public.current_profile_role() not in ('supervisor', 'admin') then
    raise exception 'Solo supervisores o administradores pueden cambiar roles';
  end if;

  if next_role not in ('student', 'teacher', 'supervisor') then
    raise exception 'Rol no permitido: %', next_role;
  end if;

  if target_profile_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol desde la app';
  end if;

  update public.profiles
  set role = next_role
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No existe el perfil indicado';
  end if;

  return updated_profile;
end;
$$;

drop policy if exists "Profiles can read own profile" on public.profiles;
drop policy if exists "Supervisors can read profiles" on public.profiles;
drop policy if exists "Profiles can create own profile" on public.profiles;
drop policy if exists "Profiles can update own profile" on public.profiles;
drop policy if exists "Published questions are readable" on public.questions;
drop policy if exists "Teachers can manage questions" on public.questions;
drop policy if exists "Published options are readable" on public.question_options;
drop policy if exists "Teachers can manage options" on public.question_options;
drop policy if exists "Students can create own attempts" on public.quiz_attempts;
drop policy if exists "Students can read own attempts" on public.quiz_attempts;
drop policy if exists "Students can update own attempts" on public.quiz_attempts;
drop policy if exists "Supervisors can read attempts" on public.quiz_attempts;
drop policy if exists "Students can create answers for own attempts" on public.quiz_answers;
drop policy if exists "Students can read own answers" on public.quiz_answers;
drop policy if exists "Supervisors can read answers" on public.quiz_answers;

create policy "Profiles can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Supervisors can read profiles"
  on public.profiles for select
  using (public.current_profile_role() in ('supervisor', 'admin'));

create policy "Profiles can create own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'student');

create policy "Profiles can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_profile_role());

create policy "Published questions are readable"
  on public.questions for select
  using (status = 'published');

create policy "Teachers can manage questions"
  on public.questions for all
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

create policy "Published options are readable"
  on public.question_options for select
  using (
    exists (
      select 1
      from public.questions
      where questions.id = question_options.question_id
      and questions.status = 'published'
    )
  );

create policy "Teachers can manage options"
  on public.question_options for all
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

create policy "Students can create own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = student_id);

create policy "Students can read own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = student_id);

create policy "Students can update own attempts"
  on public.quiz_attempts for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Supervisors can read attempts"
  on public.quiz_attempts for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('supervisor', 'admin')
    )
  );

create policy "Students can create answers for own attempts"
  on public.quiz_answers for insert
  with check (
    exists (
      select 1
      from public.quiz_attempts
      where quiz_attempts.id = quiz_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );

create policy "Supervisors can read answers"
  on public.quiz_answers for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('supervisor', 'admin')
    )
  );

create policy "Students can read own answers"
  on public.quiz_answers for select
  using (
    exists (
      select 1
      from public.quiz_attempts
      where quiz_attempts.id = quiz_answers.attempt_id
      and quiz_attempts.student_id = auth.uid()
    )
  );

create or replace function public.get_global_leaderboard()
returns table (
  profile_id uuid,
  email text,
  full_name text,
  role text,
  total_answers bigint,
  correct_answers bigint,
  pato_xp bigint,
  last_answered_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    profiles.id as profile_id,
    profiles.email,
    profiles.full_name,
    profiles.role,
    count(quiz_answers.id) as total_answers,
    count(quiz_answers.id) filter (where quiz_answers.is_correct) as correct_answers,
    coalesce(
      sum(
        2 +
        case
          when quiz_answers.is_correct and questions.difficulty = 'advanced' then 12
          when quiz_answers.is_correct and questions.difficulty = 'intermediate' then 9
          when quiz_answers.is_correct then 6
          else 0
        end
      ),
      0
    ) as pato_xp,
    max(quiz_answers.answered_at) as last_answered_at
  from public.profiles
  left join public.quiz_attempts
    on quiz_attempts.student_id = profiles.id
  left join public.quiz_answers
    on quiz_answers.attempt_id = quiz_attempts.id
  left join public.questions
    on questions.id = quiz_answers.question_id
  group by profiles.id, profiles.email, profiles.full_name, profiles.role
  order by pato_xp desc, correct_answers desc, total_answers desc, last_answered_at asc nulls last;
$$;

grant execute on function public.get_global_leaderboard() to authenticated;
