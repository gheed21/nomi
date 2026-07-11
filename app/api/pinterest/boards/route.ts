import { NextRequest, NextResponse } from "next/server";
import { pinterestApiFetch, setTokenCookies, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/app/lib/pinterest";

export type PinterestBoard = {
  id: string;
  name: string;
  description: string | null;
  pinCount: number;
  coverImage: string | null;
  thumbnails: string[];
};

type RawBoard = {
  id: string;
  name: string;
  description?: string | null;
  pin_count?: number;
  media?: { image_cover_url?: string | null; pin_thumbnail_urls?: string[] };
};

export async function GET(req: NextRequest) {
  const accessToken  = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Not connected to Pinterest" }, { status: 401 });
  }

  const { res, refreshedTokens } = await pinterestApiFetch("/boards?page_size=100", accessToken, refreshToken);
  if (!res.ok) {
    console.error("[pinterest] boards fetch failed:", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Failed to fetch boards" }, { status: res.status });
  }

  const data = await res.json() as { items?: RawBoard[] };
  const boards: PinterestBoard[] = (data.items ?? []).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description ?? null,
    pinCount: b.pin_count ?? 0,
    coverImage: b.media?.image_cover_url ?? b.media?.pin_thumbnail_urls?.[0] ?? null,
    thumbnails: b.media?.pin_thumbnail_urls ?? [],
  }));

  const jsonRes = NextResponse.json({ boards });
  if (refreshedTokens) setTokenCookies(jsonRes, refreshedTokens);
  return jsonRes;
}
