import { readFile, writeFile } from "node:fs/promises";

const configPath = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(configPath, "utf8"));

const buildCommitCandidates = [
  process.env.WORKERS_CI_COMMIT_SHA,
  process.env.GITHUB_SHA,
  process.env.GIT_COMMIT,
];
const buildCommit = buildCommitCandidates.find((candidate) => /^[0-9a-f]{40}$/i.test(candidate || ""));

config.name = "foremention-mvp";
config.topLevelName = "foremention-mvp";
config.compatibility_date = "2026-05-15";
config.compatibility_flags = ["nodejs_compat"];
config.keep_vars = true;
config.ai = { binding: "AI" };
config.vars = {
  ...(config.vars || {}),
  ...(buildCommit ? { FOREMENTION_BUILD_COMMIT: buildCommit } : {}),
  CLOUDFLARE_MODEL: "@cf/google/gemma-4-26b-a4b-it",
  CLOUDFLARE_INPUT_COST_PER_MILLION_USD: "0.10",
  CLOUDFLARE_OUTPUT_COST_PER_MILLION_USD: "0.30",
  CLOUDFLARE_REQUEST_COST_USD: "0",
  OPENROUTER_MODEL: "z-ai/glm-5.2",
  OPENROUTER_INPUT_COST_PER_MILLION_USD: "0.7238",
  OPENROUTER_OUTPUT_COST_PER_MILLION_USD: "2.2748",
  OPENROUTER_REQUEST_COST_USD: "0",
};
config.d1_databases = [
  {
    binding: "DB",
    database_name: "foremention-intake",
    database_id: "f934019a-2f3d-4385-9b60-055e7c22a598",
    migrations_dir: "../.openai/drizzle",
  },
];

await writeFile(configPath, `${JSON.stringify(config)}\n`, "utf8");
