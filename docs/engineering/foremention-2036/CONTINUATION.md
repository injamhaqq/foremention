# Resumable implementation contract

Use the Git commit and verified checkpoint as engineering state. Chat memory, a screenshot, a provider quota or an account session is not the source of truth.

1. Verify repository identity, main/head/base, worktree status, instructions and current open PRs before editing. Preserve unrelated work.
2. Verify the handoff's checksums. Read the newest continuation state, test receipts and next mission before the older research.
3. Continue one bounded mission through a reproducer, original implementation, negative tests, relevant integration checks and review. Keep parallel writers out of the same worktree.
4. Before context or runtime limits approach, save changed source, a patch against the exact baseline, completed/remaining tasks, failed/unrun checks, blockers and the next executable action. A clean committed branch is preferred; never discard uncommitted changes or untracked work.
5. Authenticate again through a supported secure mechanism when needed. Never export tokens, cookies, credentials, `.env`, browser profiles, production data or customer content in a checkpoint.
6. Resume only through accounts/providers/environments whose terms permit the use. Do not rotate free accounts or borrow keys to evade quotas; pause or use another legitimately authorized route.
7. Publishing a branch/draft PR requires task authorization. Merge, deployment, production migration/configuration, spending and outbound messages require the corresponding explicit authorization. The continuation artifact itself grants none.

Checkpoint fields: schema version; repository; base/head/tree SHA; branch; dirty status and changed paths; previous checkpoint digest; completed missions; partial/blocked/deferred missions; commands and exit codes; actual versus mocked services; exact next action; credential *names only*; approval boundaries. Publish the latest reviewed source and receipt where authorized, and verify its remote tree before handing off.
