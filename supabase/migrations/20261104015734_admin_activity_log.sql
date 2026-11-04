-- 後台工程日誌。內容異動由資料庫 trigger 自動記錄，前端只能由授權管理員讀取。
create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  transaction_id bigint not null default txid_current(),
  action text not null check (action in (
    'page_draft_saved',
    'page_published',
    'navigation_draft_saved',
    'navigation_published'
  )),
  entity_type text not null check (entity_type in ('page','navigation')),
  entity_key text not null,
  entity_label text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  changed_fields text[] not null default '{}',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_transaction_idx
  on public.admin_activity_log (transaction_id);

alter table public.admin_activity_log enable row level security;
revoke all on public.admin_activity_log from anon, authenticated;
grant select on public.admin_activity_log to authenticated;

drop policy if exists "admins read activity log" on public.admin_activity_log;
create policy "admins read activity log"
on public.admin_activity_log for select
to authenticated
using (
  (select auth.jwt() ->> 'email') in (
    'lijie5868@gmail.com',
    'ru8ru8u8@gmail.com',
    'lazyunclek@gmail.com'
  )
);

create or replace function private.capture_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_document jsonb;
  new_document jsonb;
  comparison_old jsonb;
  comparison_new jsonb;
  activity_action text;
  activity_entity_type text;
  activity_entity_key text;
  activity_entity_label text;
  activity_actor_email text;
  activity_changed_fields text[];
begin
  old_document := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_document := to_jsonb(new);

  case tg_table_name
    when 'cms_pages' then
      activity_action := 'page_draft_saved';
      activity_entity_type := 'page';
      activity_entity_key := new.slug;
      activity_entity_label := new.title;
      comparison_old := coalesce(old_document, '{}'::jsonb) - array['id','updated_at','updated_by'];
      comparison_new := new_document - array['id','updated_at','updated_by'];
    when 'published_pages' then
      activity_action := 'page_published';
      activity_entity_type := 'page';
      activity_entity_key := new.slug;
      activity_entity_label := new.title;
      comparison_old := coalesce(old_document, '{}'::jsonb) - 'published_at';
      comparison_new := new_document - 'published_at';
    when 'cms_navigation' then
      activity_action := 'navigation_draft_saved';
      activity_entity_type := 'navigation';
      activity_entity_key := new.nav_key;
      activity_entity_label := new.label;
      comparison_old := coalesce(old_document, '{}'::jsonb) - array['id','updated_at','updated_by'];
      comparison_new := new_document - array['id','updated_at','updated_by'];
    when 'published_navigation' then
      activity_action := 'navigation_published';
      activity_entity_type := 'navigation';
      activity_entity_key := new.nav_key;
      activity_entity_label := new.label;
      comparison_old := coalesce(old_document, '{}'::jsonb) - 'published_at';
      comparison_new := new_document - 'published_at';
    else
      return new;
  end case;

  if activity_action in ('page_draft_saved','navigation_draft_saved')
     and comparison_old = comparison_new then
    return new;
  end if;

  select coalesce(array_agg(key order by key), '{}'::text[])
  into activity_changed_fields
  from (
    select key
    from jsonb_object_keys(comparison_old || comparison_new) as changed_key(key)
    where comparison_old -> key is distinct from comparison_new -> key
  ) changed;

  activity_actor_email := lower(coalesce((select auth.jwt() ->> 'email'), current_user));

  insert into public.admin_activity_log (
    action,
    entity_type,
    entity_key,
    entity_label,
    actor_id,
    actor_email,
    changed_fields,
    before_data,
    after_data
  ) values (
    activity_action,
    activity_entity_type,
    activity_entity_key,
    activity_entity_label,
    (select auth.uid()),
    activity_actor_email,
    activity_changed_fields,
    old_document,
    new_document
  );

  return new;
end;
$$;

revoke all on function private.capture_admin_activity() from public, anon, authenticated;

drop trigger if exists capture_cms_pages_activity on public.cms_pages;
create trigger capture_cms_pages_activity
after insert or update on public.cms_pages
for each row execute function private.capture_admin_activity();

drop trigger if exists capture_published_pages_activity on public.published_pages;
create trigger capture_published_pages_activity
after insert or update on public.published_pages
for each row execute function private.capture_admin_activity();

drop trigger if exists capture_cms_navigation_activity on public.cms_navigation;
create trigger capture_cms_navigation_activity
after insert or update on public.cms_navigation
for each row execute function private.capture_admin_activity();

drop trigger if exists capture_published_navigation_activity on public.published_navigation;
create trigger capture_published_navigation_activity
after insert or update on public.published_navigation
for each row execute function private.capture_admin_activity();

comment on table public.admin_activity_log is
  'Append-only audit trail for CMS draft saves, publishes, and navigation changes.';
