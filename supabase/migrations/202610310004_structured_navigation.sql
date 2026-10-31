-- Structured, editable site navigation with draft/published separation.
create table if not exists public.cms_navigation (
  id uuid primary key default gen_random_uuid(), nav_key text not null unique,
  label text not null, subtitle text not null default '', href text not null,
  nav_order integer not null default 0, is_visible boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists public.published_navigation (
  nav_key text primary key, label text not null, subtitle text not null default '',
  href text not null, nav_order integer not null default 0,
  is_visible boolean not null default true, published_at timestamptz not null default now()
);
alter table public.cms_navigation enable row level security;
alter table public.published_navigation enable row level security;
revoke all on public.cms_navigation, public.published_navigation from anon, authenticated;
grant select, insert, update, delete on public.cms_navigation, public.published_navigation to authenticated;
grant select on public.published_navigation to anon;

drop policy if exists "admin manages navigation drafts" on public.cms_navigation;
drop policy if exists "admin manages published navigation" on public.published_navigation;
drop policy if exists "public reads published navigation" on public.published_navigation;
create policy "admin manages navigation drafts" on public.cms_navigation for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages published navigation" on public.published_navigation for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "public reads published navigation" on public.published_navigation for select to anon using (true);

insert into public.cms_navigation (nav_key,label,subtitle,href,nav_order,is_visible) values
  ('about','公司理念','','about.html',10,true),
  ('team','菁英團隊','','team.html',20,true),
  ('urban','進行個案','（都更）','urban.html',30,true),
  ('renewal','在建工程','（危老）','renewal.html',40,true),
  ('qa','Ｑ＆Ａ','','qa.html',50,true)
on conflict (nav_key) do nothing;
insert into public.published_navigation (nav_key,label,subtitle,href,nav_order,is_visible)
select nav_key,label,subtitle,href,nav_order,is_visible from public.cms_navigation
on conflict (nav_key) do nothing;
