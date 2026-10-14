// Evidence receipts for persisted provider answers.
//
// Every saved AI answer (public.run_answers) keeps the answer text the provider
// returned (answer_text, plus the full provider payload in raw_json) and a
// SHA-256 content hash of the normalized answer text, so a Recommendation
// Record can later prove which exact text it was built from.
//
// The normalization is versioned and MUST stay byte-identical to the SQL
// function private.answer_text_sha256 (migration
// 20261014120000_run_answer_evidence_receipts.sql), which the database trigger
// uses as the authoritative value at write time:
//   1. Unicode NFC
//   2. CRLF and lone CR -> LF
//   3. strip leading/trailing ASCII space, TAB, LF, VT, FF only
//      (NBSP and other Unicode spaces are content and are kept)
//   4. SHA-256 over the UTF-8 bytes, lowercase hex
// Changing any step requires a new ANSWER_TEXT_HASH_VERSION and a migration.

export const ANSWER_TEXT_HASH_VERSION = "fm-answer-text-sha256.v1";

const EDGE_WHITESPACE = /^[ \t\n\v\f]+|[ \t\n\v\f]+$/g;

export function normalizeAnswerTextForHash(text: string): string {
  return text.normalize("NFC").replace(/\r\n?/g, "\n").replace(EDGE_WHITESPACE, "");
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type AnswerEvidenceReceipt = {
  answer_text_sha256: string;
  answer_text_hash_version: typeof ANSWER_TEXT_HASH_VERSION;
};

export async function answerEvidenceReceipt(answerText: string): Promise<AnswerEvidenceReceipt> {
  if (typeof answerText !== "string") throw new TypeError("An evidence receipt requires the answer text.");
  return {
    answer_text_sha256: await sha256Hex(normalizeAnswerTextForHash(answerText)),
    answer_text_hash_version: ANSWER_TEXT_HASH_VERSION,
  };
}
