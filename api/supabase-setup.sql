-- Run once in the Supabase SQL editor, after Flyway has migrated.
-- Not a Flyway migration: it touches the auth schema, which does not exist
-- locally or in CI. Safe to re-run.

-- 1. Link logins to profiles. app_users.id must equal auth.users.id.
alter table public.app_users drop constraint if exists app_users_id_fkey;
alter table public.app_users add constraint app_users_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;

-- 2. Mirror new signups into app_users.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.app_users (id, email, first_name, last_name, role)
    values (new.id, lower(new.email),
            coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'New'),
            coalesce(nullif(new.raw_user_meta_data ->> 'last_name',  ''), 'User'),
            'USER')
    on conflict (id) do nothing;
    return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- 3. Close the PostgREST back door. Without this the anon key that ships in
--    the browser bundle can read and write your tables directly, bypassing
--    the API entirely. The API is unaffected: it connects as the owner role.
do $$ declare t record; begin
    for t in select tablename from pg_tables
             where schemaname = 'public' and tablename <> 'flyway_schema_history'
    loop
        execute format('alter table public.%I enable row level security', t.tablename);
    end loop;
end $$;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke usage on schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Verify: this must return a permission error, not data.
--   curl "https://<ref>.supabase.co/rest/v1/app_users?select=*" -H "apikey: <anon key>"
