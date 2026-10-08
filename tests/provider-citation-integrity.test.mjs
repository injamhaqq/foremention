import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";

// Measurement-lane rule: citations are ONLY structured citations the provider API
// returned. URLs the model typed into its answer text are never citations or
// evidence, never a fallback when there are no citations, and may only be kept
// in the separate, clearly labelled `mentionedUrls` field.

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const scratch = await mkdtemp(join(tmpdir(), "foremention-citation-integrity-"));
after(() => rm(scratch, { recursive: true, force: true }));

/** Import a provider adapter with its `@/lib/...` alias imports resolved to this checkout. */
async function loadAdapter(path, exportName) {
  const source = await text(path);
  const resolved = source.replace(/from "@\/lib\/([^"]+)"/g, (_match, target) => `from "${new URL(`lib/${target}.ts`, root).href}"`);
  const file = join(scratch, `${exportName}-${Math.random().toString(36).slice(2)}.ts`);
  await writeFile(file, resolved);
  return (await import(pathToFileURL(file).href))[exportName];
}

async function withEnv(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  for (const [key, value] of Object.entries(values)) if (value === undefined) delete process.env[key];
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withFetch(body, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = original;
  }
}

const runOptions = { maxOutputTokens: 256 };
const prompt = { promptId: "p1", text: "Which CRM should a 10-person agency buy?" };
const modelWrittenAnswer = "Try https://invented.example/crm-review and see https://another.example/page.";

test("extractUrls no longer exists; model-mentioned URLs have their own non-citation type", async () => {
  const types = await import("../lib/providers/types.ts");
  assert.equal(types.extractUrls, undefined);
  assert.deepEqual(types.extractModelMentionedUrls("See https://a.example/x. And https://a.example/x; plus (https://b.example/y)"), [
    { url: "https://a.example/x" },
    { url: "https://b.example/y" },
  ]);
  const source = await text("lib/providers/types.ts");
  assert.match(source, /mentionedUrls\?: ModelMentionedUrl\[\]/);
  assert.match(source, /NOT a citation and\s+\* NOT evidence/);
});

test("OpenAI: no url_citation annotations means zero citations, never URLs scraped from answer text", async () => {
  const adapter = await loadAdapter("lib/providers/openai.ts", "openAIAdapter");
  const { result } = await withEnv({ OPENAI_API_KEY: "test-key", OPENAI_MODEL: "gpt-pinned-test" }, () => withFetch({
    id: "resp_1",
    model: "gpt-pinned-test",
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: modelWrittenAnswer, annotations: [] }] }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.mentionedUrls, [{ url: "https://invented.example/crm-review" }, { url: "https://another.example/page" }]);
  assert.equal(result.raw.citationCount, 0);
  assert.equal(result.raw.grounded, false);
  assert.deepEqual(result.raw.mentioned_urls, ["https://invented.example/crm-review", "https://another.example/page"]);
  assert.match(result.raw.mentioned_urls_note, /not provider citations/);
});

test("OpenAI: only url_citation annotations become citations, model-written URLs stay separate", async () => {
  const adapter = await loadAdapter("lib/providers/openai.ts", "openAIAdapter");
  const { result } = await withEnv({ OPENAI_API_KEY: "test-key", OPENAI_MODEL: "gpt-pinned-test" }, () => withFetch({
    model: "gpt-pinned-test",
    output: [{ type: "message", content: [{ type: "output_text", text: modelWrittenAnswer, annotations: [
      { type: "url_citation", url: "https://returned.example/source", title: "Returned", start_index: 0, end_index: 3 },
      { type: "file_citation", url: "https://not-a-url-citation.example" },
    ] }] }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(result.citations.map((citation) => citation.url), ["https://returned.example/source"]);
  assert.ok(!result.citations.some((citation) => citation.url.includes("invented.example")));
  assert.equal(result.mentionedUrls.length, 2);
});

test("Anthropic: no web_search citations means zero citations, never URLs scraped from answer text", async () => {
  const adapter = await loadAdapter("lib/providers/anthropic.ts", "anthropicAdapter");
  const { result } = await withEnv({ ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "claude-pinned-test" }, () => withFetch({
    id: "msg_1",
    model: "claude-pinned-test",
    stop_reason: "end_turn",
    content: [{ type: "text", text: modelWrittenAnswer }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(result.citations, []);
  assert.equal(result.mentionedUrls.length, 2);
  assert.equal(result.raw.citationCount, 0);

  const grounded = await withEnv({ ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "claude-pinned-test" }, () => withFetch({
    model: "claude-pinned-test",
    content: [{ type: "text", text: modelWrittenAnswer, citations: [{ type: "web_search_result_location", url: "https://returned.example/a", title: "A" }] }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(grounded.result.citations, [{ url: "https://returned.example/a", title: "A" }]);
});

test("Perplexity: empty citations array means zero citations, never URLs scraped from answer text", async () => {
  const adapter = await loadAdapter("lib/providers/perplexity.ts", "perplexityAdapter");
  const { result } = await withEnv({ PERPLEXITY_API_KEY: "test-key", PERPLEXITY_MODEL: "sonar-pinned-test" }, () => withFetch({
    id: "px_1",
    model: "sonar-pinned-test",
    citations: [],
    choices: [{ finish_reason: "stop", message: { content: modelWrittenAnswer } }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(result.citations, []);
  assert.equal(result.mentionedUrls.length, 2);

  const grounded = await withEnv({ PERPLEXITY_API_KEY: "test-key", PERPLEXITY_MODEL: "sonar-pinned-test" }, () => withFetch({
    model: "sonar-pinned-test",
    citations: ["https://returned.example/p"],
    choices: [{ message: { content: modelWrittenAnswer } }],
  }, () => adapter.run(prompt, runOptions)));
  assert.deepEqual(grounded.result.citations, [{ url: "https://returned.example/p" }]);
});

test("no provider adapter, gateway or evidence path falls back to scraping answer-text URLs as citations", async () => {
  for (const path of [
    "lib/providers/openai.ts",
    "lib/providers/anthropic.ts",
    "lib/providers/perplexity.ts",
    "lib/providers/gemini.ts",
    "lib/providers/groq.ts",
    "lib/providers/cloudflare.ts",
    "lib/providers/openrouter.ts",
    "lib/providers/openai-compatible-gateway.ts",
    "lib/providers/zenmux.ts",
    "lib/providers/omnirouters.ts",
    "lib/jobs/inngest.ts",
    "worker/index.ts",
  ]) {
    const source = await text(path);
    assert.doesNotMatch(source, /\bextractUrls\b/, path);
    assert.doesNotMatch(source, /citations\s*[:=][^\n;]*extractModelMentionedUrls/, path);
    assert.doesNotMatch(source, /\?\s*\w+\s*:\s*extractModelMentionedUrls/, path);
  }
  // The persisted evidence path reads citations only; mentioned URLs never become sources.
  const inngest = await text("lib/jobs/inngest.ts");
  assert.match(inngest, /citations_json: answer\.citations/);
  assert.doesNotMatch(inngest, /mentionedUrls/);
});

test("Gemini fails closed without an exact pinned GEMINI_MODEL instead of using a default model", async () => {
  const policy = await text("lib/free-provider-mode.ts");
  assert.doesNotMatch(policy, /OPTIONAL_GEMINI_MODEL_FALLBACK|gemini-3\.5-flash-lite/);
  const { configuredGeminiModel } = await import("../lib/free-provider-mode.ts");
  await withEnv({ GEMINI_MODEL: undefined }, async () => assert.equal(configuredGeminiModel(), null));
  await withEnv({ GEMINI_MODEL: "   " }, async () => assert.equal(configuredGeminiModel(), null));
  await withEnv({ GEMINI_MODEL: " gemini-pinned-test " }, async () => assert.equal(configuredGeminiModel(), "gemini-pinned-test"));

  const adapter = await loadAdapter("lib/providers/gemini.ts", "geminiAdapter");
  await withEnv({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: undefined }, async () => {
    assert.equal(adapter.configured(), false);
    const { calls } = await withFetch({}, () => assert.rejects(adapter.run(prompt, runOptions), /GEMINI_MODEL must name the exact pinned model/));
    assert.equal(calls.length, 0, "no provider request is made without a pinned model");
  });
  await withEnv({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: "  " }, async () => {
    assert.equal(adapter.configured(), false);
  });
  await withEnv({ GEMINI_API_KEY: "test-key", GEMINI_MODEL: "gemini-pinned-test" }, async () => {
    assert.equal(adapter.configured(), true);
    const { calls } = await withFetch({
      modelVersion: "gemini-pinned-test",
      candidates: [{ content: { parts: [{ text: "answer" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://returned.example/g" } }] } }],
    }, () => adapter.run(prompt, runOptions));
    assert.match(calls[0].url, /models\/gemini-pinned-test:generateContent/);
  });

  const data = await text("lib/data.ts");
  assert.match(data, /id: "gemini"[^\n]*process\.env\.GEMINI_MODEL\?\.trim\(\)/);
});
