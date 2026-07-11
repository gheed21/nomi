import { NextResponse } from "next/server";
import { clearTokenCookies } from "@/app/lib/pinterest";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearTokenCookies(res);
  return res;
}
