import { NextResponse } from "next/server";
import { buildAuthorizeUrl, COOKIE_OAUTH_STATE } from "@/app/lib/pinterest";

const isProd = process.env.NODE_ENV === "production";

export async function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  // Short-lived — only needs to survive the round trip to Pinterest and back.
  res.cookies.set(COOKIE_OAUTH_STATE, state, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 600,
  });
  return res;
}
