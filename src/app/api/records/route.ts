import { NextRequest, NextResponse } from "next/server";
import { mutateCollection, readCollection, makeId } from "@/lib/db";
import { TractRecord } from "@/lib/types";
import { MEMBERS, RAW_DISTRICTS } from "@/lib/data";

const FILE = "records.json";

const AREA_IDS = new Set<string>();
const AREA_BY_ID = new Map<string, { households: number; districtId: string; districtName: string; name: string }>();
for (const d of RAW_DISTRICTS) {
  d.areas.forEach(([name, households], i) => {
    const id = `${d.id}__${i}`;
    AREA_IDS.add(id);
    AREA_BY_ID.set(id, { households, districtId: d.id, districtName: d.name, name });
  });
}

export async function GET() {
  const records = await readCollection<TractRecord[]>(FILE, []);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { areaId, member, date, count, memo } = body as Partial<TractRecord>;

  if (typeof areaId !== "string" || !AREA_IDS.has(areaId)) {
    return NextResponse.json({ error: "invalid areaId" }, { status: 400 });
  }
  if (typeof member !== "string" || !MEMBERS.includes(member)) {
    return NextResponse.json({ error: "invalid member" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1 || n > 5000) {
    return NextResponse.json({ error: "invalid count" }, { status: 400 });
  }
  const area = AREA_BY_ID.get(areaId)!;
  const safeMemo = typeof memo === "string" ? memo.slice(0, 300) : "";

  const record: TractRecord = {
    id: makeId(),
    areaId,
    districtId: area.districtId,
    districtName: area.districtName,
    areaName: area.name,
    member,
    date,
    count: Math.round(n),
    memo: safeMemo,
  };

  const records = await mutateCollection<TractRecord[]>(FILE, [], (current) => [...current, record]);
  return NextResponse.json({ record, records });
}
