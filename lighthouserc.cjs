const base = (process.env.FOREMENTION_BROWSER_BASE_URL || process.env.FOREMENTION_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const paths = ["/", "/product", "/pricing", "/score", "/prompt-check", "/login", "/signup"];

module.exports = {
  ci: {
    collect: {
      url: paths.map((path) => `${base}${path}`),
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-gpu",
      },
    },
    assert: {
      // Lighthouse is introduced audit-first. Functional browser checks and
      // serious/critical axe violations are already blocking; these measured
      // score floors start as warnings until CI variance is observed and tuned.
      assertions: {
        "categories:performance": ["warn", { minScore: 0.75 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
      },
    },
  },
};
