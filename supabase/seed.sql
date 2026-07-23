-- Seeded Northstar HR dataset. The app's one-click demo mirrors these rows without requiring auth.
insert into public.organizations (id, name, slug, website) values
  ('10000000-0000-4000-8000-000000000001', 'Northstar HR', 'northstar-hr', 'https://northstarhr.example')
on conflict (id) do nothing;

insert into public.categories (id, organization_id, name, description, geography) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'HR software for distributed teams', 'HRIS, people operations, and compliance software for distributed companies.', 'United States')
on conflict (id) do nothing;

insert into public.prompts (id, organization_id, category_id, prompt_key, prompt_text, buyer_stage) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'best-overall', 'What is the best HR platform for a 200-person remote company?', 'decision'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'global-compliance', 'Which HR systems handle global compliance for distributed teams?', 'consideration'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'comparison', 'Compare HR software for distributed teams that are scaling quickly.', 'comparison')
on conflict (id) do nothing;

insert into public.sources (id, organization_id, canonical_url, domain, page_title, source_type, crawler_access) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'https://remoteworklab.com/guides/hr-platforms', 'remoteworklab.com', 'The 12 best HR platforms for distributed teams', 'editorial list', 'open'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'https://peopleops.report/benchmarks/2026', 'peopleops.report', '2026 global people operations benchmark', 'research report', 'open'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'https://stackbrief.com/compare/hris', 'stackbrief.com', 'HRIS comparison: workflows, payroll, and compliance', 'comparison', 'open'),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'https://hrleaders.community/t/remote-hris-200', 'hrleaders.community', 'What HR system works for a 200-person remote team?', 'community thread', 'open'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'https://worktechreview.com/reviews/northstar-hr', 'worktechreview.com', 'Northstar HR review: a practical operator view', 'product review', 'partial'),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'https://futureofpeople.org/panels/global-people-ops', 'futureofpeople.org', 'Expert panel: running people operations across borders', 'expert roundup', 'open')
on conflict (id) do nothing;

insert into public.source_maps (id, organization_id, category_id, name, status, methodology_version, evidence_from, evidence_to) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Northstar HR Source Map', 'published', '1.0', '2026-06-20T00:00:00Z', '2026-07-20T23:59:59Z')
on conflict (id) do nothing;

insert into public.source_map_entries (id, organization_id, source_map_id, source_id, rank, citation_observations, engines, client_present, competitors_present, entry_route, feasibility, influence) values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 18, array['ChatGPT','Perplexity','Google AI'], false, array['Deel','Rippling','HiBob'], 'editorial outreach', 'high', 'high'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 2, 15, array['ChatGPT','Claude','Perplexity'], false, array['Deel','Remote'], 'original research', 'medium', 'high'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 3, 12, array['ChatGPT','Perplexity'], true, array['Rippling','Gusto','BambooHR'], 'comparison inclusion', 'high', 'high'),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', 4, 9, array['Perplexity','Google AI'], false, array['HiBob','BambooHR'], 'community participation', 'medium', 'medium'),
  ('70000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', 5, 8, array['ChatGPT','Claude'], true, array['Remote'], 'legitimate review', 'high', 'medium'),
  ('70000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000006', 6, 7, array['Claude','Perplexity'], false, array['Deel'], 'expert contribution', 'medium', 'medium')
on conflict (id) do nothing;

insert into public.placements (id, organization_id, source_id, source_url, page_title, entry_route, stage, published_url, published_at, indexed_at, first_cited_at) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'https://remoteworklab.com/guides/hr-platforms', 'Best HR platforms', 'editorial outreach', 'pitched', null, null, null, null),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'https://peopleops.report/benchmarks/2026', '2026 benchmark', 'original research', 'qualified', null, null, null, null),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 'https://stackbrief.com/compare/hris', 'HRIS comparison', 'comparison inclusion', 'repeatedly_cited', 'https://stackbrief.com/compare/hris', '2026-06-28T12:00:00Z', '2026-06-29T12:00:00Z', '2026-07-04T12:00:00Z'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', 'https://worktechreview.com/reviews/northstar-hr', 'Northstar HR review', 'legitimate review', 'first_cited', 'https://worktechreview.com/reviews/northstar-hr', '2026-07-10T12:00:00Z', '2026-07-11T12:00:00Z', '2026-07-18T12:00:00Z')
on conflict (id) do nothing;
