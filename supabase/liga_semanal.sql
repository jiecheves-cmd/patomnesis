-- Liga semanal: PatoXP ganado desde el lunes 00:00 (hora de Madrid) hasta ahora.
drop function if exists public.get_weekly_leaderboard();

create function public.get_weekly_leaderboard()
returns table (
  profile_id uuid,
  email text,
  full_name text,
  role text,
  total_answers bigint,
  correct_answers bigint,
  pato_xp numeric(12, 2),
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
    greatest(
      0,
      coalesce(
      sum(
        case
          when quiz_answers.is_correct and questions.difficulty = 'advanced' then 3
          when quiz_answers.is_correct and questions.difficulty = 'intermediate' then 2
          when quiz_answers.is_correct then 1
          else -0.33
        end
      ),
      0
      )
    )::numeric(12, 2) as pato_xp,
    max(quiz_answers.answered_at) as last_answered_at
  from public.profiles
  left join public.quiz_attempts
    on quiz_attempts.student_id = profiles.id
  left join public.quiz_answers
    on quiz_answers.attempt_id = quiz_attempts.id
    and quiz_answers.answered_at >= (date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
  left join public.questions
    on questions.id = quiz_answers.question_id
  where profiles.role = 'student'
  group by profiles.id, profiles.email, profiles.full_name, profiles.role
  order by pato_xp desc, correct_answers desc, total_answers desc, last_answered_at asc nulls last;
$$;

grant execute on function public.get_weekly_leaderboard() to authenticated;

-- Hall of Fame: campeón de cada una de las últimas N semanas completas (excluye la semana en curso).
drop function if exists public.get_weekly_league_history(int);

create function public.get_weekly_league_history(weeks_back int default 20)
returns table (
  week_start date,
  profile_id uuid,
  email text,
  full_name text,
  pato_xp numeric(12, 2),
  correct_answers bigint,
  total_answers bigint
)
language sql
security definer
set search_path = public
as $$
  with scored as (
    select
      (date_trunc('week', quiz_answers.answered_at at time zone 'Europe/Madrid'))::date as week_start,
      profiles.id as profile_id,
      profiles.email,
      profiles.full_name,
      count(quiz_answers.id) as total_answers,
      count(quiz_answers.id) filter (where quiz_answers.is_correct) as correct_answers,
      greatest(
        0,
        coalesce(
        sum(
          case
            when quiz_answers.is_correct and questions.difficulty = 'advanced' then 3
            when quiz_answers.is_correct and questions.difficulty = 'intermediate' then 2
            when quiz_answers.is_correct then 1
            else -0.33
          end
        ),
        0
        )
      )::numeric(12, 2) as pato_xp
    from public.quiz_answers
    join public.quiz_attempts
      on quiz_attempts.id = quiz_answers.attempt_id
    join public.profiles
      on profiles.id = quiz_attempts.student_id
    join public.questions
      on questions.id = quiz_answers.question_id
    where profiles.role = 'student'
      and quiz_answers.answered_at >= (
        (date_trunc('week', now() at time zone 'Europe/Madrid') - (weeks_back || ' weeks')::interval)
        at time zone 'Europe/Madrid'
      )
      and quiz_answers.answered_at < (date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
    group by 1, profiles.id, profiles.email, profiles.full_name
  ),
  ranked as (
    select
      scored.*,
      row_number() over (
        partition by week_start
        order by pato_xp desc, correct_answers desc, total_answers desc
      ) as rnk
    from scored
    where pato_xp > 0
  )
  select week_start, profile_id, email, full_name, pato_xp, correct_answers, total_answers
  from ranked
  where rnk = 1
  order by week_start desc;
$$;

grant execute on function public.get_weekly_league_history(int) to authenticated;
