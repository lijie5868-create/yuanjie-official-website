-- Add ru8ru8u8@gmail.com as a second CMS administrator.
drop policy if exists "admin manages page drafts" on public.cms_pages;
drop policy if exists "admin manages published pages" on public.published_pages;
drop policy if exists "admin manages post drafts" on public.cms_posts;
drop policy if exists "admin manages published posts" on public.published_posts;
drop policy if exists "admin uploads site media" on storage.objects;
drop policy if exists "admin updates site media" on storage.objects;
drop policy if exists "admin deletes site media" on storage.objects;

create policy "admin manages page drafts" on public.cms_pages for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages published pages" on public.published_pages for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages post drafts" on public.cms_posts for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin manages published posts" on public.published_posts for all to authenticated
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin uploads site media" on storage.objects for insert to authenticated
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin updates site media" on storage.objects for update to authenticated
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'))
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
create policy "admin deletes site media" on storage.objects for delete to authenticated
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com'));
