import { NextRequest, NextResponse } from "next/server";
import { COOKIE_CONNECTED_FLAG } from "@/app/lib/pinterest";

export async function GET(req: NextRequest) {
  const connected = req.cookies.get(COOKIE_CONNECTED_FLAG)?.value === "1";
  return NextResponse.json({ connected });
}
