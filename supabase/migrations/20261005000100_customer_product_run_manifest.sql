-- Customer Product Functionality: preserve the exact pre-dispatch measurement
-- contract for future runs without inventing context for historical records.
begin;

alter table public.runs
  add column if not exists run_manifest_json jsonb;

alter table public.run_prompt_selections
  add column if not exists prompt_version integer;

alter table public.runs
  drop constraint if exists runs_run_manifest_object_check;
alter table public.runs
  add constraint runs_run_manifest_object_check
  check (run_manifest_json is null or jsonb_typeof(run_manifest_json) = 'object');

alter table public.run_prompt_selections
  drop constraint if exists run_prompt_selections_prompt_version_check;
alter table public.run_prompt_selections
  add constraint run_prompt_selections_prompt_version_check
  check (prompt_version is null or prompt_version >= 1);

comment on column public.runs.run_manifest_json is
  'Immutable-at-dispatch measurement manifest for new runs: active project, exact question versions, surface, provider/model setting, locale/market, methodology/extractor/metric versions, sampling, and spend boundary. Historical rows remain null when context was not recorded.';

comment on column public.run_prompt_selections.prompt_version is
  'Exact buyer-question version selected for the run. Historical rows remain null rather than guessing a version.';

commit;
