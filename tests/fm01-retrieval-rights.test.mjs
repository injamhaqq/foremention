import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuthorizedIndependentRetrieval,
  retrieveFreeWebEvidence,
  RetrievalRightsUnavailableError,
} from "../lib/free-web-retrieval.ts";

test("A07: no unlicensed Bing RSS fallback and zero network calls by default", async () => {
  const previousKey=process.env.BRAVE_SEARCH_API_KEY;
  const previousRights=process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;
  const originalFetch=globalThis.fetch;
  let calls=0;
  delete process.env.BRAVE_SEARCH_API_KEY;
  delete process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;
  globalThis.fetch=async () => {calls++;throw new Error("network must not be called");};
  try {
    assert.throws(()=>assertAuthorizedIndependentRetrieval(),RetrievalRightsUnavailableError);
    await assert.rejects(retrieveFreeWebEvidence("B2B SaaS AI visibility monitoring"),RetrievalRightsUnavailableError);
    assert.equal(calls,0);
  } finally {
    globalThis.fetch=originalFetch;
    if(previousKey===undefined)delete process.env.BRAVE_SEARCH_API_KEY;else process.env.BRAVE_SEARCH_API_KEY=previousKey;
    if(previousRights===undefined)delete process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;else process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=previousRights;
  }
});
test("A07: operator rights switch is explicit, not inferred from a configured model",()=>{
  const p=process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;
  const k=process.env.BRAVE_SEARCH_API_KEY;
  delete process.env.BRAVE_SEARCH_API_KEY;
  process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED="1";
  try { assert.equal(assertAuthorizedIndependentRetrieval(),"bing-rss"); }
  finally {
    if(p===undefined)delete process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED;else process.env.FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=p;
    if(k===undefined)delete process.env.BRAVE_SEARCH_API_KEY;else process.env.BRAVE_SEARCH_API_KEY=k;
  }
});
