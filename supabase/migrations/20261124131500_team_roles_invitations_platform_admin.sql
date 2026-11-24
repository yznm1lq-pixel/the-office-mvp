-- Team roles, invitation links and owner-only platform administration.
alter table public.company_members
  drop constraint if exists company_members_role_check;
alter table public.company_members
  add constraint company_members_role_check
  check (role = any (array['owner','admin','department_head','member']));

alter table public.company_members
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.company_members
  drop constraint if exists company_members_department_role_check;
alter table public.company_members
  add constraint company_members_department_role_check
  check (role <> 'department_head' or department_id is not null);

create index if not exists company_members_department_id_idx on public.company_members(department_id);

create schema if not exists private;
create table if not exists private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.platform_admins from public, anon, authenticated;
insert into private.platform_admins(user_id)
values ('5e214c07-a98f-4255-94af-77547b0bbe72')
on conflict (user_id) do nothing;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from private.platform_admins a where a.user_id=(select auth.uid()));
$$;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;

create or replace function public.is_platform_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_platform_admin(); $$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','department_head','member')),
  department_id uuid references public.departments(id) on delete set null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists company_invitations_company_idx on public.company_invitations(company_id,created_at desc);
create index if not exists company_invitations_department_id_idx on public.company_invitations(department_id);
create index if not exists company_invitations_invited_by_idx on public.company_invitations(invited_by);
alter table public.company_invitations enable row level security;
revoke all on public.company_invitations from anon, authenticated;
create policy company_invitations_deny_direct_access on public.company_invitations
  for all to authenticated using (false) with check (false);

drop policy if exists company_members_add_admins on public.company_members;
create policy company_members_add_admins on public.company_members
for insert to authenticated
with check (
  (role='owner' and user_id=(select auth.uid()) and exists(
    select 1 from public.companies c where c.id=company_members.company_id and c.created_by=(select auth.uid())
  ))
  or (private.current_company_role(company_id)='owner' and role in ('admin','department_head','member'))
  or (private.current_company_role(company_id)='admin' and role in ('department_head','member'))
);

drop policy if exists company_members_update_admins on public.company_members;
create policy company_members_update_admins on public.company_members
for update to authenticated
using (
  private.current_company_role(company_id) in ('owner','admin')
  and role <> 'owner'
  and (private.current_company_role(company_id)='owner' or role <> 'admin')
)
with check (
  private.current_company_role(company_id) in ('owner','admin')
  and role <> 'owner'
  and (private.current_company_role(company_id)='owner' or role <> 'admin')
  and (role <> 'department_head' or department_id is not null)
);

drop policy if exists company_members_remove_admins on public.company_members;
create policy company_members_remove_admins on public.company_members
for delete to authenticated
using (
  private.current_company_role(company_id) in ('owner','admin')
  and role <> 'owner'
  and (private.current_company_role(company_id)='owner' or role <> 'admin')
);

create or replace function private.create_company_invitation(
  p_company_id uuid,p_email text,p_role text,p_department_id uuid default null
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_role text:=private.current_company_role(p_company_id);
  v_token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
  if v_actor is null or v_role not in ('owner','admin') then raise exception 'FORBIDDEN'; end if;
  if p_email is null or position('@' in trim(p_email))<2 then raise exception 'INVALID_EMAIL'; end if;
  if p_role not in ('admin','department_head','member') then raise exception 'INVALID_ROLE'; end if;
  if v_role='admin' and p_role='admin' then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_role='department_head' and p_department_id is null then raise exception 'DEPARTMENT_REQUIRED'; end if;
  if p_department_id is not null and not exists(
    select 1 from public.departments d where d.id=p_department_id and d.company_id=p_company_id
  ) then raise exception 'INVALID_DEPARTMENT'; end if;
  insert into public.company_invitations(company_id,email,role,department_id,token_hash,invited_by)
  values(p_company_id,lower(trim(p_email)),p_role,p_department_id,encode(extensions.digest(v_token,'sha256'),'hex'),v_actor);
  return v_token;
end;
$$;
revoke all on function private.create_company_invitation(uuid,text,text,uuid) from public,anon;
grant execute on function private.create_company_invitation(uuid,text,text,uuid) to authenticated;

create or replace function public.create_company_invitation(
  p_company_id uuid,p_email text,p_role text,p_department_id uuid default null
)
returns text language sql security invoker set search_path = ''
as $$ select private.create_company_invitation(p_company_id,p_email,p_role,p_department_id); $$;
revoke all on function public.create_company_invitation(uuid,text,text,uuid) from public,anon;
grant execute on function public.create_company_invitation(uuid,text,text,uuid) to authenticated;

create or replace function private.accept_company_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid:=auth.uid();
  v_email text;
  v_inv public.company_invitations%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select lower(u.email) into v_email
  from auth.users u
  where u.id=v_user_id and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  if p_token is null or length(p_token)<32 then raise exception 'INVITE_INVALID_OR_EXPIRED'; end if;
  select * into v_inv from public.company_invitations i
  where i.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and i.accepted_at is null and i.expires_at>now()
  for update;
  if not found then raise exception 'INVITE_INVALID_OR_EXPIRED'; end if;
  if v_email<>lower(v_inv.email) then raise exception 'INVITE_EMAIL_MISMATCH'; end if;
  insert into public.company_members(company_id,user_id,role,department_id)
  values(v_inv.company_id,v_user_id,v_inv.role,v_inv.department_id)
  on conflict(company_id,user_id) do nothing;
  update public.company_invitations set accepted_at=now() where id=v_inv.id;
  return v_inv.company_id;
end;
$$;
revoke all on function private.accept_company_invitation(text) from public,anon;
grant execute on function private.accept_company_invitation(text) to authenticated;

create or replace function public.accept_company_invitation(p_token text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.accept_company_invitation(p_token); $$;
revoke all on function public.accept_company_invitation(text) from public,anon;
grant execute on function public.accept_company_invitation(text) to authenticated;

create or replace function private.platform_admin_offices()
returns table(id uuid,name text,created_at timestamptz,employee_count bigint,active_employee_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  return query select c.id,c.name,c.created_at,
    (select count(*) from public.company_members m where m.company_id=c.id),
    (select count(*) from public.office_presence op where op.company_id=c.id and op.last_seen_at>now()-interval '5 minutes')
  from public.companies c order by c.created_at desc;
end;
$$;
revoke all on function private.platform_admin_offices() from public,anon;
grant execute on function private.platform_admin_offices() to authenticated;

create or replace function public.platform_admin_offices()
returns table(id uuid,name text,created_at timestamptz,employee_count bigint,active_employee_count bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.platform_admin_offices(); $$;
revoke all on function public.platform_admin_offices() from public,anon;
grant execute on function public.platform_admin_offices() to authenticated;

drop policy if exists tasks_insert_members on public.tasks;
create policy tasks_insert_members on public.tasks
for insert to authenticated
with check (
  private.current_company_role(company_id) is not null
  and created_by=(select auth.uid())
  and (assignee_id is null or exists(
    select 1 from public.company_members m where m.company_id=tasks.company_id and m.user_id=tasks.assignee_id
  ))
  and (project_id is null or exists(
    select 1 from public.projects p where p.id=tasks.project_id and p.company_id=tasks.company_id
  ))
);

-- Team members can see the names of other members in the same company.
drop policy if exists profiles_read_company_members on public.profiles;
create policy profiles_read_company_members on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.company_members m
    where m.user_id=profiles.id
      and private.current_company_role(m.company_id) is not null
  )
);
