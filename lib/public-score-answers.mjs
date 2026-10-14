// Public /api/public/score: the grounded provider returns a single structured
// `answer` string (json_schema {answer, source_numbers}). Asking the model to
// nest JSON inside that string produced unparseable fragments, so the score
// prompt asks for five numbered plain-text lines instead. This parser accepts
// that form and the legacy nested-JSON form, and returns exactly five answers
// ordered by question number, or null so the caller fails closed.

export const PUBLIC_SCORE_ANSWER_FORMAT_INSTRUCTIONS = [
  "Answer each of the five numbered buyer questions below independently using only the current retrieved web evidence.",
  "Write the answer field as exactly five plain-text lines, one per question, in order, each starting with the question number and a period (for example \"1. ...\").",
  "Do not put JSON, markdown, or the question text inside the answer field.",
  "Do not invent companies, claims, sources, or URLs. If the evidence does not answer a question, say so on that question's line.",
];

function fromLegacyJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    const rows = Array.isArray(parsed?.answers) ? parsed.answers : [];
    const byNumber = new Map();
    for (const row of rows) {
      if (Number.isInteger(row?.question_number) && typeof row?.answer === "string" && row.answer.trim()) {
        if (row.question_number >= 1 && row.question_number <= 5 && !byNumber.has(row.question_number)) {
          byNumber.set(row.question_number, row.answer.trim());
        }
      }
    }
    return byNumber.size === 5 ? [1, 2, 3, 4, 5].map((n) => byNumber.get(n)) : null;
  } catch {
    return null;
  }
}

function fromNumberedLines(text) {
  const marker = /(?:^|\n)\s*(?:Q(?:uestion)?\s*)?([1-5])\s*[.):]\s+/gi;
  const hits = [];
  let match;
  while ((match = marker.exec(text)) !== null) hits.push({ n: Number(match[1]), start: match.index, bodyStart: marker.lastIndex });
  const byNumber = new Map();
  hits.forEach((hit, i) => {
    const body = text.slice(hit.bodyStart, i + 1 < hits.length ? hits[i + 1].start : text.length).trim();
    if (body && !byNumber.has(hit.n)) byNumber.set(hit.n, body);
  });
  return byNumber.size === 5 ? [1, 2, 3, 4, 5].map((n) => byNumber.get(n)) : null;
}

// Models sometimes collapse the five lines into one paragraph ("1. ... 2. ...").
// Find markers 1..5 strictly in order so citation brackets like "[2]" or stray
// numbers out of sequence are never treated as answer boundaries.
function fromSequentialMarkers(text) {
  const positions = [];
  let from = 0;
  for (let n = 1; n <= 5; n += 1) {
    const marker = new RegExp(`(^|\\s)${n}\\s*[.):]\\s+`, "g");
    marker.lastIndex = from;
    const match = marker.exec(text);
    if (!match) return null;
    positions.push({ start: match.index, bodyStart: marker.lastIndex });
    from = marker.lastIndex;
  }
  const bodies = positions.map((pos, i) => text.slice(pos.bodyStart, i + 1 < positions.length ? positions[i + 1].start : text.length).trim());
  return bodies.every(Boolean) ? bodies : null;
}

/** @param {unknown} answer @returns {string[] | null} */
export function parsePublicScoreAnswers(answer) {
  if (typeof answer !== "string" || !answer.trim()) return null;
  const text = answer.replace(/\r\n?/g, "\n");
  return fromLegacyJson(text) ?? fromNumberedLines(text) ?? fromSequentialMarkers(text);
}
