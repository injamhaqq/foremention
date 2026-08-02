alter table public.organizations add column if not exists public_report_enabled boolean not null default false;

-- Public reports are read through a narrow server endpoint. The column does
-- not create an anonymous database policy or expose organization records.
