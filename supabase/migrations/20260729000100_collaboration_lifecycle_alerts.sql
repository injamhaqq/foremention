-- Add the collaboration role in its own committed migration.
-- PostgreSQL forbids using a newly added enum value in the transaction
-- that introduced it.
alter type public.organization_role add value if not exists 'admin' after 'owner';
