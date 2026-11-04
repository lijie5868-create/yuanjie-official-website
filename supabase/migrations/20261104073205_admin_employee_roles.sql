-- Website roles are tied to Auth user IDs; clients may only read their own role.
create table public.site_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);
alter table public.site_user_roles enable row level security;
revoke all on public.site_user_roles from anon, authenticated;
grant select on public.site_user_roles to authenticated;
create policy "read own site role" on public.site_user_roles for select to authenticated
  using (user_id = (select auth.uid()));

insert into public.site_user_roles (user_id, email, role)
select id, lower(email), 'admin' from auth.users
where lower(email) in ('lijie5868@gmail.com', 'ru8ru8u8@gmail.com', 'lazyunclek@gmail.com')
on conflict (user_id) do update set email = excluded.email, role = 'admin';

create policy "employees read page drafts" on public.cms_pages for select to authenticated
  using (exists (select 1 from public.site_user_roles where user_id = (select auth.uid()) and role = 'employee'));
create policy "employees read navigation drafts" on public.cms_navigation for select to authenticated
  using (exists (select 1 from public.site_user_roles where user_id = (select auth.uid()) and role = 'employee'));
