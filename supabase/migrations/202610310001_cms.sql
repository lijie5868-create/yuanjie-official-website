-- 元捷建設官方網站 CMS。草稿資料僅管理員可見；公開資料表不含草稿欄位。
create extension if not exists pgcrypto;

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  file_name text not null unique, title text not null, meta_description text not null default '',
  main_html text not null, sort_order integer not null default 0,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists public.published_pages (
  slug text primary key, file_name text not null unique, title text not null,
  meta_description text not null default '', main_html text not null,
  sort_order integer not null default 0, published_at timestamptz not null default now()
);
create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  summary text not null default '', body_html text not null default '', cover_image_url text,
  published_on date, sort_order integer not null default 0,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists public.published_posts (
  slug text primary key, title text not null, summary text not null default '',
  body_html text not null default '', cover_image_url text,
  published_on date not null default current_date, sort_order integer not null default 0,
  published_at timestamptz not null default now()
);

alter table public.cms_pages enable row level security;
alter table public.published_pages enable row level security;
alter table public.cms_posts enable row level security;
alter table public.published_posts enable row level security;
revoke all on public.cms_pages, public.cms_posts, public.published_pages, public.published_posts from anon, authenticated;
grant select, insert, update, delete on public.cms_pages, public.cms_posts, public.published_pages, public.published_posts to authenticated;
grant select on public.published_pages, public.published_posts to anon;

drop policy if exists "admin manages page drafts" on public.cms_pages;
drop policy if exists "admin manages published pages" on public.published_pages;
drop policy if exists "public reads published pages" on public.published_pages;
drop policy if exists "admin manages post drafts" on public.cms_posts;
drop policy if exists "admin manages published posts" on public.published_posts;
drop policy if exists "public reads published posts" on public.published_posts;
create policy "admin manages page drafts" on public.cms_pages for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages published pages" on public.published_pages for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "public reads published pages" on public.published_pages for select to anon using (true);
create policy "admin manages post drafts" on public.cms_posts for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages published posts" on public.published_posts for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "public reads published posts" on public.published_posts for select to anon using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media','site-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "public reads site media" on storage.objects;
drop policy if exists "admin uploads site media" on storage.objects;
drop policy if exists "admin updates site media" on storage.objects;
drop policy if exists "admin deletes site media" on storage.objects;
create policy "admin uploads site media" on storage.objects for insert to authenticated
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin updates site media" on storage.objects for update to authenticated
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin deletes site media" on storage.objects for delete to authenticated
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));

-- Created by Supabase's automatic-RLS feature; keep it available to the database owner only.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

