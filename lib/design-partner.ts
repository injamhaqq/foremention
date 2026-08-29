export const MAX_QUESTIONS = 5;
const MAX_EMAIL = 320;
const MAX_COMPANY = 160;
const MAX_ROLE = 120;
const MAX_CATEGORY = 180;
const MAX_QUESTION = 500;
const MAX_PROBLEM = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DesignPartnerApplication = {
  email: string;
  company: string;
  role: string;
  category: string;
  buyerQuestions: string[];
  currentProblem: string | null;
  planInterest: "core" | "signal" | "intelligence" | null;
};

type Result = { ok: true; value: DesignPartnerApplication } | { ok: false; error: string };

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function cleanQuestion(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function designPartnerSubmissionKey(application: Pick<DesignPartnerApplication, "email" | "company">) {
  const canonical = `${application.email.trim().toLowerCase()}\n${application.company.replace(/\s+/g, " ").trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return bytesToHex(new Uint8Array(digest));
}

export function normalizeDesignPartnerApplication(input: Record<string, unknown>): Result {
  const email = clean(input.email, MAX_EMAIL).toLowerCase();
  const company = clean(input.company, MAX_COMPANY);
  const role = clean(input.role, MAX_ROLE);
  const category = clean(input.category, MAX_CATEGORY);
  const rawQuestions = typeof input.buyerQuestions === "string" ? input.buyerQuestions : "";
  const questionLines = rawQuestions.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const buyerQuestions = questionLines.map(cleanQuestion).slice(0, MAX_QUESTIONS);
  const currentProblem = clean(input.currentProblem, MAX_PROBLEM) || null;
  const plan = clean(input.planInterest, 20).toLowerCase();
  const planInterest = (["core", "signal", "intelligence"] as const).find((value) => value === plan) || null;

  if (!EMAIL.test(email) || email.length > MAX_EMAIL) return { ok: false, error: "Enter a valid work email." };
  if (company.length < 2) return { ok: false, error: "Enter your company name." };
  if (role.length < 2) return { ok: false, error: "Enter your role." };
  if (category.length < 2) return { ok: false, error: "Enter the software category you want to measure." };
  if (questionLines.length > MAX_QUESTIONS) {
    return { ok: false, error: `Keep the application to ${MAX_QUESTIONS} priority buyer questions.` };
  }
  if (questionLines.some((question) => question.length > MAX_QUESTION)) {
    return { ok: false, error: "Keep each buyer question to 500 characters or fewer." };
  }

  return { ok: true, value: { email, company, role, category, buyerQuestions, currentProblem, planInterest } };
}
