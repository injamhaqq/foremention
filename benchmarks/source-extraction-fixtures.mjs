const longContext = "Evidence remains useful only when the observed page, collection date, provider response, and human review stay distinguishable. Longitudinal comparison must preserve measurement identity and must not turn temporal sequence into a causal claim. ";

export const extractionFixtures = [
  {
    id: "editorial-article",
    archetype: "article",
    url: "https://evidence.example/article",
    expectedTitle: "What procurement teams ask AI",
    expectedPhrases: [
      "Procurement teams increasingly ask AI systems to compare category vendors.",
      "A trustworthy observation keeps the provider answer separate from the cited page.",
      "Human review is still required before a source gap becomes an opportunity.",
    ],
    noisePhrases: ["Article navigation noise", "Footer newsletter noise"],
    html: `<!doctype html><html lang="en"><head><base href="https://evidence.example/article"><title>What procurement teams ask AI</title><meta name="description" content="A dated evidence article"></head><body><nav>Article navigation noise Pricing Login Docs</nav><article><h1>What procurement teams ask AI</h1><p>Procurement teams increasingly ask AI systems to compare category vendors.</p><p>A trustworthy observation keeps the provider answer separate from the cited page.</p><p>Human review is still required before a source gap becomes an opportunity.</p><p>${longContext.repeat(4)}</p></article><footer>Footer newsletter noise Subscribe for weekly updates</footer></body></html>`,
  },
  {
    id: "technical-docs",
    archetype: "docs",
    url: "https://docs.example/integration",
    expectedTitle: "Integration guide",
    expectedPhrases: [
      "Use a stable request identifier for retries.",
      "Store the exact provider model identifier with every observation.",
      "Do not merge search discovery with provider-returned citations.",
    ],
    noisePhrases: ["Docs sidebar noise", "Docs footer noise"],
    html: `<!doctype html><html lang="en"><head><base href="https://docs.example/integration"><title>Integration guide</title></head><body><aside>Docs sidebar noise Overview SDK API Billing Changelog</aside><main><h1>Integration guide</h1><section><h2>Reliable collection</h2><p>Use a stable request identifier for retries.</p><p>Store the exact provider model identifier with every observation.</p><p>Do not merge search discovery with provider-returned citations.</p><p>${longContext.repeat(4)}</p></section></main><footer>Docs footer noise Status Terms Careers</footer></body></html>`,
  },
  {
    id: "product-page",
    archetype: "product",
    url: "https://vendor.example/product",
    expectedTitle: "Evidence Monitor",
    expectedPhrases: [
      "See the exact answer buyers receive.",
      "Inspect the sources returned with that answer.",
      "Review evidence before creating an action.",
    ],
    noisePhrases: ["Product navigation noise", "Product footer noise"],
    html: `<!doctype html><html lang="en"><head><base href="https://vendor.example/product"><title>Evidence Monitor</title><meta name="description" content="Recommendation evidence monitoring"></head><body><nav>Product navigation noise Platform Customers Pricing Sign in</nav><main><h1>Evidence Monitor</h1><p>See the exact answer buyers receive.</p><section><h2>Source intelligence</h2><p>Inspect the sources returned with that answer.</p></section><section><h2>Governed workflow</h2><p>Review evidence before creating an action.</p><p>${longContext.repeat(4)}</p></section></main><footer>Product footer noise Book demo Careers Legal</footer></body></html>`,
  },
  {
    id: "comparison-page",
    archetype: "comparison",
    url: "https://research.example/acme-vs-contoso",
    expectedTitle: "Acme vs Contoso",
    expectedPhrases: [
      "Acme publishes implementation documentation.",
      "Contoso publishes a public security overview.",
      "This comparison does not establish which vendor an AI system will recommend.",
    ],
    noisePhrases: ["Comparison sidebar noise", "Comparison footer noise"],
    html: `<!doctype html><html lang="en"><head><base href="https://research.example/acme-vs-contoso"><title>Acme vs Contoso</title></head><body><aside>Comparison sidebar noise Top comparisons Popular categories</aside><main><article><h1>Acme vs Contoso</h1><p>Acme publishes implementation documentation.</p><p>Contoso publishes a public security overview.</p><table><tbody><tr><th>Evidence</th><td>Public documentation inspected on a dated observation.</td></tr></tbody></table><p>This comparison does not establish which vendor an AI system will recommend.</p><p>${longContext.repeat(4)}</p></article></main><footer>Comparison footer noise Advertise Contact</footer></body></html>`,
  },
  {
    id: "navigation-heavy-article",
    archetype: "navigation-heavy",
    url: "https://publisher.example/research",
    expectedTitle: "Recommendation evidence is not a score",
    expectedPhrases: [
      "A score can summarize an observation but it cannot replace the evidence chain.",
      "The cited page and the provider answer remain separate records.",
    ],
    noisePhrases: ["Mega navigation noise", "Related links noise", "Publisher footer noise"],
    html: `<!doctype html><html lang="en"><head><base href="https://publisher.example/research"><title>Recommendation evidence is not a score</title></head><body><nav>Mega navigation noise News Markets Reviews Guides Rankings Podcasts Events Account Subscribe</nav><aside>Related links noise Story one Story two Story three Story four Story five</aside><article><h1>Recommendation evidence is not a score</h1><p>A score can summarize an observation but it cannot replace the evidence chain.</p><p>The cited page and the provider answer remain separate records.</p><p>${longContext.repeat(4)}</p></article><footer>Publisher footer noise Newsletters Apps Licensing Privacy</footer></body></html>`,
  },
  {
    id: "dynamic-shell",
    archetype: "dynamic-shell",
    url: "https://app.example/client-rendered",
    expectedTitle: "Client rendered application",
    expectedPhrases: [],
    noisePhrases: ["SECRET_DYNAMIC_COPY_SHOULD_NOT_COUNT"],
    scoreExtraction: false,
    html: `<!doctype html><html lang="en"><head><base href="https://app.example/client-rendered"><title>Client rendered application</title></head><body><div id="root">Loading application…</div><script>window.__DATA__={copy:"SECRET_DYNAMIC_COPY_SHOULD_NOT_COUNT"};</script></body></html>`,
  },
];

export const accessFixtures = [
  { id: "blocked-http", url: "https://blocked.example/source", expectedAccess: "blocked", status: 403 },
  { id: "network-unavailable", url: "https://offline.example/source", expectedAccess: "unknown", throws: true },
];

export const unsafeFixtureUrls = [
  "http://127.0.0.1/admin",
  "http://169.254.169.254/latest/meta-data",
  "file:///etc/passwd",
  "https://user:password@example.com/secret",
  "https://example.com:8443/private",
];
