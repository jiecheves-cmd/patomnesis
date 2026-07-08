-- Ejecuta este archivo en el SQL Editor de Supabase despues de crear tu usuario
-- en Authentication > Users.
--
-- Cambia el email por el que quieras usar para tu cuenta de supervisor.

do $$
declare
  supervisor_email text := 'TU_EMAIL_AQUI';
begin
  if not exists (select 1 from auth.users where email = supervisor_email) then
    raise exception 'No existe ningun usuario en Authentication con email %', supervisor_email;
  end if;

  insert into public.profiles (id, email, full_name, role)
  select id, email, coalesce(raw_user_meta_data->>'full_name', 'Supervisor Patomnesis'), 'supervisor'
  from auth.users
  where email = supervisor_email
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = 'supervisor';
end $$;
