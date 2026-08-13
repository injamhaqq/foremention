begin;

-- Add only the foreign-key indexes currently identified by the production
-- Supabase performance advisor. These indexes support FK maintenance and
-- relationship lookups without changing RLS, constraints, or data semantics.
create index if not exists approvals_requested_by_idx on public.approvals(requested_by);
create index if not exists citation_observations_run_answer_idx on public.citation_observations(run_answer_id);
create index if not exists evidence_items_owner_idx on public.evidence_items(owner_id);
create index if not exists notification_preferences_user_idx on public.notification_preferences(user_id);
create index if not exists opportunities_owner_idx on public.opportunities(owner_id);
create index if not exists opportunity_scores_scored_by_idx on public.opportunity_scores(scored_by);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists outreach_actions_created_by_idx on public.outreach_actions(created_by);
create index if not exists placements_created_by_idx on public.placements(created_by);
create index if not exists prompt_versions_created_by_idx on public.prompt_versions(created_by);
create index if not exists run_answers_prompt_idx on public.run_answers(prompt_id);
create index if not exists runs_created_by_idx on public.runs(created_by);
create index if not exists source_maps_created_by_idx on public.source_maps(created_by);
create index if not exists source_observations_prompt_idx on public.source_observations(prompt_id);
create index if not exists verified_claims_verified_by_idx on public.verified_claims(verified_by);

commit;
