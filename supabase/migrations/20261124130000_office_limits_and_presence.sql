-- Enforce the free-plan office cap and track member presence.
create table if not exists public.office_presence (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists office_presence_last_seen_idx
  on public.office_presence (last_seen_at desc);
create index if not exists office_presence_user_id_idx
  on public.office_presence (user_id);

alter table public.office_presence enable row level security;

drop policy if exists office_presence_read_members on public.office_presence;
create policy office_presence_read_members
  on public.office_presence for select to authenticated
  using (private.current_company_role(company_id) is not null);

drop policy if exists office_presence_insert_self on public.office_presence;
create policy office_presence_insert_self
  on public.office_presence for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.current_company_role(company_id) is not null
  );

drop policy if exists office_presence_update_self on public.office_presence;
create policy office_presence_update_self
  on public.office_presence for update to authenticated
  using (
    user_id = (select auth.uid())
    and private.current_company_role(company_id) is not null
  )
  with check (
    user_id = (select auth.uid())
    and private.current_company_role(company_id) is not null
  );

create or replace function public.create_company(company_name text)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_slug text;
  v_company_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if company_name is null or char_length(trim(company_name)) < 2 or char_length(trim(company_name)) > 80 then
    raise exception 'Company name must be between 2 and 80 characters';
  end if;

  select count(*) into v_company_count
  from public.companies c
  where c.created_by = v_user_id;

  if v_company_count >= 1 then
    raise exception 'COMPANY_LIMIT_REACHED';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(company_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'company'; end if;
  v_slug := left(v_slug, 45) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.companies (name, slug, created_by)
  values (trim(company_name), v_slug, v_user_id)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  return v_company_id;
end;
$function$;

revoke all on function public.create_company(text) from public, anon;
grant execute on function public.create_company(text) to authenticated;
grant select, insert, update on public.office_presence to authenticated;
