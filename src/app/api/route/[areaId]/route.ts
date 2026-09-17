import { NextRequest, NextResponse } from "next/server";
import { generateWalkRoute, RouteResult } from "@/lib/routeGen";
import { RAW_DISTRICTS } from "@/lib/data";
import { readCollection, mutateCollection } from "@/lib/db";

const AREA_IDS = new Set<string>();
for (const d of RAW_DISTRICTS) {
  d.areas.forEach((_, i) => AREA_IDS.add(`${d.id}__${i}`));
}

const CACHE_FILE = "routes.json";

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
  const forceRefresh = searchParams.get("refresh") === "1";

  // A chome's real street layout essentially never changes, and the
  // free/shared Overpass API this depends on is unreliable (public rate
  // limits shared across every app that uses it), so once a route is
  // successfully generated for an area's default start point, cache it
  // indefinitely and skip Overpass entirely on repeat requests.
  if (!startCoord && !forceRefresh) {
    const cache = await readCollection<Record<string, RouteResult>>(CACHE_FILE, {});
    const cached = cache[areaId];
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const result = await generateWalkRoute(areaId, startCoord);
    if (!startCoord) {
      await mutateCollection<Record<string, RouteResult>>(CACHE_FILE, {}, (current) => ({ ...current, [areaId]: result }));
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "route generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
