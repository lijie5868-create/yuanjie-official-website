-- The password-management Edge Function reads roles and inserts new employees.
-- Keep browser roles restricted to their own row via RLS.
grant select, insert on public.site_user_roles to service_role;
