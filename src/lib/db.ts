import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

const DATA_DIR = path.join(process.cwd(), "data");

const REDIS_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? null;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;

const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

function keyFor(fileName: string) {
  return `ippo-shibata-tract:${fileName}`;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readCollection<T>(fileName: string, fallback: T): Promise<T> {
  if (redis) {
    const data = await redis.get<T>(keyFor(fileName));
    if (data === null || data === undefined) {
      await redis.set(keyFor(fileName), fallback);
      return fallback;
    }
    return data;
  }

  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await writeCollection(fileName, fallback);
    }
    // On any other error (e.g. a concurrent write left a partial/invalid
    // file), return the fallback in memory without touching the file on
    // disk — overwriting it here would permanently destroy real data.
    return fallback;
  }
}

export async function writeCollection<T>(fileName: string, data: T): Promise<void> {
  if (redis) {
    await redis.set(keyFor(fileName), data);
    return;
  }

  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  const tmpPath = path.join(DATA_DIR, `.${fileName}.${process.pid}.${Date.now()}.tmp`);
  // Write to a temp file then rename, so a concurrent read never observes
  // a partially-written file.
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}

// Per-file mutex: two requests updating the same collection close together
// (e.g. blurring one field while clicking a status button) would otherwise
// both read the pre-update state and the later write would silently discard
// the earlier one's change. Chaining a promise per filename serializes the
// read-modify-write within this Node process — covers the local-file mode
// fully, and reduces (though doesn't eliminate across separate serverless
// instances) the same race in Redis mode.
const queues = new Map<string, Promise<unknown>>();

function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  queues.set(
    key,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

export function mutateCollection<T>(
  fileName: string,
  fallback: T,
  mutator: (current: T) => T | Promise<T>
): Promise<T> {
  return runExclusive(fileName, async () => {
    const current = await readCollection<T>(fileName, fallback);
    const next = await mutator(current);
    await writeCollection(fileName, next);
    return next;
  });
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
