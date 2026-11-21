# Engineering tools and their limits

These are optional engineering aids, not a list of production dependencies to install.

| Tool | Job | Admission boundary |
| --- | --- | --- |
| REA | Permitted technical observation | Isolated authorized public evidence; version/rights review first |
| Chrome DevTools MCP | Network, console, performance and live browser diagnosis | Fresh browser profile; do not expose personal sessions; review telemetry |
| Playwright MCP | Agent-driven browser inspection | Local/disposable targets and least privilege; it is not a security boundary |
| Playwright Test / existing browser harness | Repeatable customer-journey acceptance | Required proof can use the existing repository harness without adding MCP |
| Crawl4AI | Structured public-document extraction | Optional; safe egress, bounded pages/bytes and current advisory review |
| webcrack | Analyze legitimately accessible JavaScript | Optional; no proprietary source reuse or protected access bypass |
| GPT Researcher | Evidence collection and synthesis | Optional; model/search credentials and usage have separate cost/rights checks |
| Browser Use | Authorized multi-step browser research | Optional; local library vs hosted service/inference are separate entitlements; no anti-bot bypass |
| changedetection.io | Public-page change monitoring | Defer a server if existing snapshots/Inngest suffice; hosting is not automatically free |
| Lighthouse | Owned/local performance, accessibility and SEO checks | Lab evidence complements, not replaces, functional acceptance |
| OpenCode | Code editing and terminal/test work | Optional interface; approved model inference and sandboxing still required |
| ast-grep / rg | Structural and literal code search | Use only the code within authorized scope |
| Git, pinned Node/pnpm, existing CI | Baselines, source changes and regression checks | Primary tools used in this implementation |

Capture actual installed versions and source pins in each continuation. A README, installed package or historical Hark claim does not prove that the current tool works. Pin and inspect untrusted scripts/skills. No extra tool is necessary for the local comparison fix.

Current upstream references: [DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp), [Playwright MCP](https://github.com/microsoft/playwright-mcp), [GPT Researcher](https://docs.gptr.dev/docs/gpt-researcher/getting-started), [Browser Use](https://github.com/browser-use/browser-use). These four references were reopened 2026-10-20; other tool evidence is in the dated research packet and needs revalidation before adoption.
