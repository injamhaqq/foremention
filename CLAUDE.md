# Foremention Repository Notes

This repository is Foremention, a Next.js/Vinext app with a Cloudflare Worker entrypoint.

## Working rules

- Keep changes focused and minimal.
- Prefer the documented project scripts over ad hoc commands.
- Do not commit secrets, environment files, build outputs, or local debug logs.
- Treat billing and webhook behavior carefully: paid access must be granted by a verified webhook, not by a redirect.

## Common commands

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Project facts

- Package manager: pnpm 10.25.0
- Node.js requirement: 22.13 or newer
- Primary verification order: test, lint, typecheck, build
- Build script: `vinext build && node scripts/prepare-worker-config.mjs`

## Reference docs

- See `README.md` for product and setup context.
- See `docs/TESTING.md` for the standard quality gate.
- See `docs/BUILD-VERIFICATION.md` for the expected production build outcome.
