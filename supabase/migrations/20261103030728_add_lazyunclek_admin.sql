-- Add lazyunclek@gmail.com to every CMS and site-media administrator policy.
-- The frontend allowlist is maintained in dist/admin/admin.js.

alter policy "admin manages page drafts" on public.cms_pages
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin manages published pages" on public.published_pages
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin manages post drafts" on public.cms_posts
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin manages published posts" on public.published_posts
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin manages navigation drafts" on public.cms_navigation
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin manages published navigation" on public.published_navigation
  using ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check ((select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin uploads site media" on storage.objects
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin updates site media" on storage.objects
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'))
  with check (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));

alter policy "admin deletes site media" on storage.objects
  using (bucket_id='site-media' and (select auth.jwt() ->> 'email') in ('lijie5868@gmail.com','ru8ru8u8@gmail.com','lazyunclek@gmail.com'));
