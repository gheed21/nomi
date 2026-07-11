import { NextResponse } from "next/server";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_OAUTH_AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

// Access/refresh tokens are httpOnly — never readable by client JS, unlike the
// rest of this app's localStorage-based state. COOKIE_CONNECTED_FLAG is the one
// exception: a plain non-secret "yes/no" flag so the frontend can show connected
// state without ever touching the real tokens.
export const COOKIE_ACCESS_TOKEN   = "pinterest_access_token";
export const COOKIE_REFRESH_TOKEN  = "pinterest_refresh_token";
export const COOKIE_OAUTH_STATE    = "pinterest_oauth_state";
export const COOKIE_CONNECTED_FLAG = "pinterest_connected";

const isProd = process.env.NODE_ENV === "production";

function getEnv() {
  return {
    clientId:     process.env.PINTEREST_CLIENT_ID ?? "",
    clientSecret: process.env.PINTEREST_CLIENT_SECRET ?? "",
    redirectUri:  process.env.PINTEREST_REDIRECT_URI ?? "http://localhost:3000/api/pinterest/callback",
  };
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "boards:read,pins:read",
    state,
  });
  return `${PINTEREST_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
};

function basicAuthHeader(): string {
  const { clientId, clientSecret } = getEnv();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse | null> {
  const { redirectUri } = getEnv();
  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }).toString(),
  });
  if (!res.ok) {
    console.error("[pinterest] token exchange failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  });
  if (!res.ok) {
    console.error("[pinterest] token refresh failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json() as Promise<TokenResponse>;
}

// Calls a Pinterest API endpoint; on a 401 (expired access token), refreshes once
// using the refresh token and retries. Callers must persist refreshedTokens back
// into cookies when present, since the old access token cookie is now stale.
export async function pinterestApiFetch(
  path: string,
  accessToken: string,
  refreshToken: string,
): Promise<{ res: Response; refreshedTokens: TokenResponse | null }> {
  const call = (token: string) => fetch(`${PINTEREST_API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  const first = await call(accessToken);
  if (first.status !== 401) return { res: first, refreshedTokens: null };

  const refreshed = await refreshAccessToken(refreshToken);
  if (!refreshed) return { res: first, refreshedTokens: null };

  const retried = await call(refreshed.access_token);
  return { res: retried, refreshedTokens: refreshed };
}

export function setTokenCookies(response: NextResponse, tokens: TokenResponse): void {
  const shared = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };
  response.cookies.set(COOKIE_ACCESS_TOKEN, tokens.access_token, { ...shared, maxAge: tokens.expires_in });
  response.cookies.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, { ...shared, maxAge: tokens.refresh_token_expires_in });
  response.cookies.set(COOKIE_CONNECTED_FLAG, "1", { httpOnly: false, secure: isProd, sameSite: "lax", path: "/", maxAge: tokens.refresh_token_expires_in });
}

export function clearTokenCookies(response: NextResponse): void {
  response.cookies.delete(COOKIE_ACCESS_TOKEN);
  response.cookies.delete(COOKIE_REFRESH_TOKEN);
  response.cookies.delete(COOKIE_CONNECTED_FLAG);
}
