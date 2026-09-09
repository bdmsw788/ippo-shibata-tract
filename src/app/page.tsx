import { readCollection } from "@/lib/db";
import { TractRecord } from "@/lib/types";
import IppoApp from "@/components/IppoApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const records = await readCollection<TractRecord[]>("records.json", []);
  return <IppoApp initialRecords={records} />;
}
