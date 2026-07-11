import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, setTokenCookies, COOKIE_OAUTH_STATE } from "@/app/lib/pinterest";

export async function GET(req: NextRequest) {
  const url   = req.nextUrl;
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get(COOKIE_OAUTH_STATE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    console.error("[pinterest] callback rejected — missing/mismatched state or code");
    return NextResponse.redirect(new URL("/explore?pinterest=error", url));
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(new URL("/explore?pinterest=error", url));
  }

  const res = NextResponse.redirect(new URL("/explore?pinterest=connected", url));
  res.cookies.delete(COOKIE_OAUTH_STATE);
  setTokenCookies(res, tokens);
  return res;
}
