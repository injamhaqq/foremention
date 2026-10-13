# #332 migration ledger reconciliation (2026-10-13)

Read-only comparison of production `vuujwdxivjsdikdstwib` migration history (100 rows) with `supabase/migrations` on main @ `6b93c88` (97 files), plus read-only catalog probes. Names normalized by dropping `_main_<sha>`, `_release_<sha>` and `_YYYYMMDD` suffixes.

| Status | Count |
|---|---|
| Exact (same version + name) | 44 |
| Applied under another version | 51 |
| Repo-only | 2 |
| Production-only | 3 |

## Findings
- `20260814060000_placement_events_organization_index`: index `placement_events_organization_idx` exists in production, so this is ledger-only drift (repair as applied).
- `20260915172000_customer_value_pilot_evidence_gates`: **schema missing in production**: the 3 columns on `customer_success_reviews`, the evidence check constraint, the validation function and the trigger. The views exist via the compat migrations. Customer-confirmed value is not validated in production.

## Repair
`scripts/release-gates/332-migration-ledger-repair.sh`. Steps 1 and 2 change only the history table. Step 3 is the one schema change and must be rehearsed on a restored copy first. The script refuses to run without `I_HAVE_A_VERIFIED_BACKUP=yes` and `FOUNDER_APPROVED_332=yes`.

## Full mapping
| Repo version | Name | Status | Production version(s) |
|---|---|---|---|
| 20260719000100 | initial_schema | exact | 20260719000100 |
| 20260722000100 | recommendation_graph | exact | 20260722000100 |
| 20260724000100 | free_beta_usage_controls | exact | 20260724000100 |
| 20260728000100 | live_collection_hardening | exact | 20260728000100 |
| 20260729000100 | collaboration_lifecycle_alerts | exact | 20260729000100;20260729000110 |
| 20260729000110 | collaboration_lifecycle_alerts | exact | 20260729000100;20260729000110 |
| 20260729000200 | service_role_background_permissions | exact | 20260729000200 |
| 20260729000300 | source_observation_upsert_fix | exact | 20260729000300 |
| 20260802000100 | active_run_duplicate_prevention | exact | 20260802000100 |
| 20260802000200 | source_monitoring | exact | 20260802000200 |
| 20260802000300 | claim_evidence_links | exact | 20260802000300 |
| 20260802000400 | claim_verification_workflow | exact | 20260802000400 |
| 20260802000500 | application_email_alerts | exact | 20260802000500 |
| 20260802000600 | workspace_webhooks | exact | 20260802000600 |
| 20260802000700 | workspace_comments | exact | 20260802000700 |
| 20260802000800 | hubspot_activity_connector | exact | 20260802000800 |
| 20260802000900 | public_visibility_reports | exact | 20260802000900 |
| 20260802001000 | gdpr_data_deletion | exact | 20260802001000 |
| 20260804000100 | resolution_engine | exact | 20260804000100 |
| 20260810142217 | production_drift_hardening | exact | 20260810142217 |
| 20260810142520 | production_drift_performance_cleanup | exact | 20260810142520 |
| 20260811044941 | tenant_relation_integrity | exact | 20260811044941 |
| 20260811045535 | verified_claim_evidence_delete_semantics | exact | 20260811045535 |
| 20260813023000 | rls_auth_initplan_hardening | applied_under_other_version | 20260813010016 |
| 20260813033833 | suppress_legacy_ungated_movement_alerts | exact | 20260813033833 |
| 20260813055000 | foreign_key_performance_indexes | applied_under_other_version | 20260813053302 |
| 20260813080000 | source_snapshot_engine | applied_under_other_version | 20260813015442 |
| 20260813083000 | provider_cost_event_guard | applied_under_other_version | 20260813075322 |
| 20260813083100 | source_snapshot_admin_policy | applied_under_other_version | 20260813023904 |
| 20260813090000 | source_snapshot_privilege_hardening | applied_under_other_version | 20260813025319;20260813025339 |
| 20260813153000 | reviewed_opportunity_bridge_unique | applied_under_other_version | 20260813084219 |
| 20260813160000 | resolution_exact_comparability | applied_under_other_version | 20260813085445 |
| 20260813163000 | resolution_evidence_snapshot_provenance | applied_under_other_version | 20260813090712 |
| 20260813170000 | inngest_runtime_probe | applied_under_other_version | 20260813105817 |
| 20260813180000 | signup_security_attestation | applied_under_other_version | 20260813124156 |
| 20260814060000 | placement_events_organization_index | not_in_production |  |
| 20260814083000 | live_foreign_key_indexes | applied_under_other_version | 20260814085609 |
| 20260814090000 | operator_alert_monitoring | applied_under_other_version | 20260814034305 |
| 20260816192504 | tighten_service_only_run_rpcs | exact | 20260816192504 |
| 20260818000100 | company_customer_proof | applied_under_other_version | 20260901064346 |
| 20260818000200 | security_performance_advisor_hardening | applied_under_other_version | 20260901064255 |
| 20260818000300 | source_review_truth | applied_under_other_version | 20260819171845 |
| 20260819154000 | service_only_run_rpc_actor_context | applied_under_other_version | 20260819173416 |
| 20260829000100 | retention_loop_v1 | applied_under_other_version | 20260901064411 |
| 20260829000200 | design_partner_applications | applied_under_other_version | 20260901064423 |
| 20260829000300 | billing_webhook_events | applied_under_other_version | 20260901064848 |
| 20260830000100 | design_partner_submission_limits | applied_under_other_version | 20260901064908 |
| 20260830000200 | apply_billing_event_atomic | applied_under_other_version | 20260901064926 |
| 20260830000300 | customer_proof_research_events | applied_under_other_version | 20260901064937 |
| 20260830000400 | commercial_engine | applied_under_other_version | 20260901065011 |
| 20260830000500 | billing_commercial_hardening | applied_under_other_version | 20260901065043 |
| 20260830000600 | outcomes_value_customer_success | applied_under_other_version | 20260901072125 |
| 20260830000700 | outcome_ledger_backfill | applied_under_other_version | 20260901072159 |
| 20260830000800 | enterprise_security_governance | applied_under_other_version | 20260901073304 |
| 20260830000900 | audit_log_hardening | applied_under_other_version | 20260901073317 |
| 20260830001000 | enterprise_fail_closed_hardening | applied_under_other_version | 20260901073330 |
| 20260830113100 | scale_unit_economics_observability | applied_under_other_version | 20260901073349 |
| 20260830113200 | ai_measurement_context | applied_under_other_version | 20260901072600 |
| 20260901000100 | icp_category_evidence | applied_under_other_version | 20260901071944 |
| 20260901000200 | measurement_moat_foundation | applied_under_other_version | 20260901090148 |
| 20260901000300 | change_specification_domain | applied_under_other_version | 20260901113706 |
| 20260902000100 | decision_intelligence_v1 | exact | 20260902000100 |
| 20260902000200 | next_best_design_partner_learning_v1 | exact | 20260902000200 |
| 20260904000100 | acquisition_research_provenance | applied_under_other_version | 20260904115039 |
| 20260904000200 | acquisition_outreach_control | applied_under_other_version | 20260904121425;20260904121942 |
| 20260905000100 | acquisition_zoho_mail_canaries | applied_under_other_version | 20260905083931 |
| 20260914000100 | core_tenant_relation_integrity | exact | 20260914000100 |
| 20260914000200 | foundation_budget_alignment | exact | 20260914000200 |
| 20260914000300 | run_accounting_role_alignment | exact | 20260914000300 |
| 20260914000400 | security_definer_execute_hardening | exact | 20260914000400 |
| 20260915000100 | source_map_review_state | exact | 20260915000100 |
| 20260915000200 | private_org_permission_helper | exact | 20260915000200 |
| 20260915000300 | performance_advisor_cleanup | exact | 20260915000300 |
| 20260915000400 | decision_learning_production_parity | exact | 20260915000400 |
| 20260915000500 | design_partner_trigger_execute_hardening | exact | 20260915000500 |
| 20260915000600 | remove_redundant_single_tenant_fks | applied_under_other_version | 20260915121058 |
| 20260915000700 | source_snapshot_evidence_excerpt | applied_under_other_version | 20260915134115 |
| 20260915144000 | workspace_deletion_graph_hardening | applied_under_other_version | 20260915153758 |
| 20260915144600 | workspace_deletion_remaining_check_fix | applied_under_other_version | 20260915153822 |
| 20260915160000 | atomic_prompt_versioning | applied_under_other_version | 20260915160402 |
| 20260915170000 | evidence_semantics_hardening | applied_under_other_version | 20260915184755 |
| 20260915170500 | comparability_context_hardening | applied_under_other_version | 20260915184808 |
| 20260915171000 | operator_run_diagnostics | applied_under_other_version | 20260915184822 |
| 20260915171500 | provider_attempt_cost_ledger | applied_under_other_version | 20260915184836 |
| 20260915172000 | customer_value_pilot_evidence_gates | not_in_production |  |
| 20260918000100 | operating_agent_action_ledger | exact | 20260918000100 |
| 20260918000200 | agent_reasoning_runtime | exact | 20260918000200 |
| 20260918000300 | agent_action_execution | exact | 20260918000300 |
| 20260918000400 | support_agent | exact | 20260918000400 |
| 20260920000100 | source_map_review_monotonicity | applied_under_other_version | 20260919223104 |
| 20260926071500 | company_operational_cost_readiness | applied_under_other_version | 20260926063633 |
| 20260926081000 | company_cost_view_read_grants | applied_under_other_version | 20260926064502 |
| 20260926090000 | support_ticket_auth_rls_initplan | applied_under_other_version | 20260926071020 |
| 20261009000100 | create_atomic_buyer_question_rpc | exact | 20261009000100 |
| 20261010000100 | source_review_authorized_rpc | exact | 20261010000100 |
| 20261010090000 | fm09_paddle_checkout_reservations | exact | 20261010090000 |
| 20261011090000 | package_capacity_from_verified_billing | exact | 20261011090000 |
|  | placement_events_org_fk_index_20260814 | production_only | 20260814002421 |
|  | qualified_paid_pilot_evidence_view | production_only | 20260915185110 |
|  | customer_value_validation_evidence_compat | production_only | 20260915185158 |
