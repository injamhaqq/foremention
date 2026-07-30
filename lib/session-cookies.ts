import { NextResponse } from "next/server";

export const SESSION_COOKIE = "foremention-session";
export const REFRESH_COOKIE = "foremention-refresh";
export const DEMO_COOKIE = "foremention-demo";

type SessionTokens = {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
};

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setSessionCookies(response: NextResponse, tokens: SessionTokens) {
  response.cookies.set(SESSION_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: Math.max(60, Number(tokens.expiresIn || 3600)),
  });
  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(DEMO_COOKIE);
}

export function clearDemoCookie(response: NextResponse) {
  response.cookies.delete(DEMO_COOKIE);
}
