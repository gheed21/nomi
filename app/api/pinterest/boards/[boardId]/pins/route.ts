import { NextRequest, NextResponse } from "next/server";
import { pinterestApiFetch, setTokenCookies, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/app/lib/pinterest";

export type PinterestPin = {
  id: string;
  title: string | null;
  link: string | null;
  image: string | null;
};

type RawPin = {
  id: string;
  title?: string | null;
  link?: string | null;
  media?: { images?: Record<string, { url: string }> };
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const accessToken  = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Not connected to Pinterest" }, { status: 401 });
  }

  const { res, refreshedTokens } = await pinterestApiFetch(`/boards/${boardId}/pins?page_size=100`, accessToken, refreshToken);
  if (!res.ok) {
    console.error("[pinterest] pins fetch failed:", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Failed to fetch pins" }, { status: res.status });
  }

  const data = await res.json() as { items?: RawPin[] };
  const pins: PinterestPin[] = (data.items ?? []).map(p => ({
    id: p.id,
    title: p.title ?? null,
    link: p.link ?? null,
    image: p.media?.images?.["600x"]?.url ?? p.media?.images?.["400x300"]?.url ?? p.media?.images?.["1200x"]?.url ?? null,
  }));

  const jsonRes = NextResponse.json({ pins });
  if (refreshedTokens) setTokenCookies(jsonRes, refreshedTokens);
  return jsonRes;
}
