import { NextRequest, NextResponse } from "next/server";
import { generateWalkRoute } from "@/lib/routeGen";
import { RAW_DISTRICTS } from "@/lib/data";

const AREA_IDS = new Set<string>();
for (const d of RAW_DISTRICTS) {
  d.areas.forEach((_, i) => AREA_IDS.add(`${d.id}__${i}`));
}

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params;
  if (!AREA_IDS.has(areaId)) {
    return NextResponse.json({ error: "invalid areaId" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const startCoord: [number, number] | undefined = Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : undefined;

  try {
    const result = await generateWalkRoute(areaId, startCoord);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "route generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
