alter table public.run_answers
  add column if not exists measurement_context_json jsonb;

comment on column public.run_answers.measurement_context_json is
  'Versioned AI measurement envelope for Recommendation Record reproducibility. Historical rows remain null rather than receiving invented version metadata.';

create or replace function public.stamp_run_answer_measurement_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.measurement_context_json := jsonb_build_object(
    'promptVersion', 'provider-prompts.2026-08-30.1',
    'parserVersion', 'provider-adapters.2026-08-30.1',
    'provider', new.provider,
    'model', new.model,
    'modelVersion', 'unreported',
    'retrievalVersion', 'returned-references.2026-08-30.1',
    'policyVersion', 'recommendation-quality.2026-08-30.1',
    'schemaVersion', 'recommendation-record.2026-08-30.1',
    'evaluationVersion', 'ai-evaluation.2026-08-30.1'
  );
  return new;
end;
$$;

revoke all on function public.stamp_run_answer_measurement_context() from public, anon, authenticated;

drop trigger if exists stamp_run_answer_measurement_context on public.run_answers;
create trigger stamp_run_answer_measurement_context
before insert on public.run_answers
for each row
execute function public.stamp_run_answer_measurement_context();
