import { NextRequest, NextResponse } from "next/server";
import { mutateCollection } from "@/lib/db";
import { TractRecord } from "@/lib/types";

const FILE = "records.json";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const records = await mutateCollection<TractRecord[]>(FILE, [], (current) => current.filter((r) => r.id !== id));
  return NextResponse.json({ records });
}
