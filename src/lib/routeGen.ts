import fs from "node:fs/promises";
import path from "node:path";

type LonLat = [number, number];

const OVERPASS_MIRRORS = [
  "https://overpass.monicz.dev/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const INCLUDED_HIGHWAYS = new Set([
  "residential",
  "unclassified",
  "tertiary",
  "secondary",
  "primary",
  "living_street",
  "pedestrian",
]);

const BUFFER_M = 25;

function haversine(a: LonLat, b: LonLat) {
  const R = 6371000;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pointInPolygon(pt: LonLat, poly: LonLat[]) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distPointToSegment(pt: LonLat, a: LonLat, b: LonLat) {
  // approximate in meters using a local equirectangular projection around `a`
  const latRef = (a[1] * Math.PI) / 180;
  const mPerDegLon = 111320 * Math.cos(latRef);
  const mPerDegLat = 110540;
  const px = (pt[0] - a[0]) * mPerDegLon;
  const py = (pt[1] - a[1]) * mPerDegLat;
  const bx = (b[0] - a[0]) * mPerDegLon;
  const by = (b[1] - a[1]) * mPerDegLat;
  const len2 = bx * bx + by * by;
  let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = bx * t;
  const cy = by * t;
  return Math.hypot(px - cx, py - cy);
}

function isNearPolygon(pt: LonLat, poly: LonLat[], bufferM: number) {
  if (pointInPolygon(pt, poly)) return true;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (distPointToSegment(pt, poly[j], poly[i]) <= bufferM) return true;
  }
  return false;
}

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}
interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}
type OverpassElement = OverpassNode | OverpassWay | { type: string };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(bbox: [number, number, number, number]): Promise<OverpassElement[]> {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  const query = `[out:json][timeout:25];way["highway"](${minLat},${minLon},${maxLat},${maxLon});out body;>;out skel qt;`;
  let lastErr: unknown = null;
  // Public Overpass mirrors rate-limit per client; a single request occasionally
  // hits a mirror mid-cooldown, so cycle the mirror list twice with a short
  // backoff rather than giving up after one pass.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(3000);
    for (const url of OVERPASS_MIRRORS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          lastErr = new Error(`${url} -> ${res.status}`);
          continue;
        }
        const data = await res.json();
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          return data.elements as OverpassElement[];
        }
        lastErr = new Error(`${url} -> empty elements`);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr ?? new Error("all overpass mirrors failed");
}

interface Edge {
  a: string;
  b: string;
  weight: number;
  used: boolean;
}

function buildGraph(elements: OverpassElement[], poly: LonLat[]) {
  const nodePos = new Map<string, LonLat>();
  for (const el of elements) {
    if (el.type === "node") {
      const n = el as OverpassNode;
      nodePos.set(String(n.id), [n.lon, n.lat]);
    }
  }
  const edges: Edge[] = [];
  const adjacency = new Map<string, number[]>(); // nodeId -> edge indices

  function addEdge(a: string, b: string, weight: number) {
    const idx = edges.length;
    edges.push({ a, b, weight, used: false });
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push(idx);
    adjacency.get(b)!.push(idx);
  }

  for (const el of elements) {
    if (el.type !== "way") continue;
    const w = el as OverpassWay;
    const hw = w.tags?.highway;
    if (!hw || !INCLUDED_HIGHWAYS.has(hw)) continue;
    if (w.tags?.area === "yes") continue;
    for (let i = 0; i < w.nodes.length - 1; i++) {
      const aId = String(w.nodes[i]);
      const bId = String(w.nodes[i + 1]);
      const aPos = nodePos.get(aId);
      const bPos = nodePos.get(bId);
      if (!aPos || !bPos) continue;
      if (!isNearPolygon(aPos, poly, BUFFER_M) || !isNearPolygon(bPos, poly, BUFFER_M)) continue;
      const dist = haversine(aPos, bPos);
      if (dist <= 0) continue;
      addEdge(aId, bId, dist);
    }
  }
  return { nodePos, edges, adjacency };
}

function largestComponent(nodePos: Map<string, LonLat>, edges: Edge[], adjacency: Map<string, number[]>) {
  const visited = new Set<string>();
  let best: Set<string> = new Set();
  for (const start of nodePos.keys()) {
    if (visited.has(start)) continue;
    const comp = new Set<string>();
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.add(cur);
      for (const ei of adjacency.get(cur) ?? []) {
        const e = edges[ei];
        const next = e.a === cur ? e.b : e.a;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    if (comp.size > best.size) best = comp;
  }
  return best;
}

function dijkstra(source: string, nodes: Set<string>, adjacency: Map<string, number[]>, edges: Edge[]) {
  const dist = new Map<string, number>();
  const prevEdge = new Map<string, number>();
  const prevNode = new Map<string, string>();
  dist.set(source, 0);
  const visited = new Set<string>();
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const n of nodes) {
      if (visited.has(n)) continue;
      const d = dist.get(n);
      if (d !== undefined && d < best) {
        best = d;
        u = n;
      }
    }
    if (u === null) break;
    visited.add(u);
    for (const ei of adjacency.get(u) ?? []) {
      const e = edges[ei];
      const v = e.a === u ? e.b : e.a;
      if (!nodes.has(v)) continue;
      const nd = best + e.weight;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prevEdge.set(v, ei);
        prevNode.set(v, u);
      }
    }
  }
  return { dist, prevEdge, prevNode };
}

function shortestPathEdges(target: string, prevEdge: Map<string, number>, prevNode: Map<string, string>) {
  const seq: number[] = [];
  let cur = target;
  while (prevNode.has(cur)) {
    const ei = prevEdge.get(cur)!;
    seq.push(ei);
    cur = prevNode.get(cur)!;
  }
  return seq.reverse();
}

function hierholzer(startNode: string, adjacency: Map<string, number[]>, edges: Edge[]) {
  // local mutable copy of "used" flags done via edges[].used directly
  const circuit: string[] = [];
  const stack: string[] = [startNode];
  // pointer per node into its adjacency list to avoid rescanning used edges repeatedly
  const ptr = new Map<string, number>();
  while (stack.length) {
    const v = stack[stack.length - 1];
    const list = adjacency.get(v) ?? [];
    let idx = ptr.get(v) ?? 0;
    let found = -1;
    while (idx < list.length) {
      const ei = list[idx];
      if (!edges[ei].used) {
        found = ei;
        idx++;
        break;
      }
      idx++;
    }
    ptr.set(v, idx);
    if (found === -1) {
      circuit.push(stack.pop()!);
    } else {
      const e = edges[found];
      e.used = true;
      const next = e.a === v ? e.b : e.a;
      stack.push(next);
    }
  }
  return circuit.reverse();
}

export interface RouteResult {
  coords: LonLat[];
  distanceMeters: number;
  streetLengthMeters: number;
  startPoint: LonLat;
}

export async function generateWalkRoute(areaId: string, startCoord?: LonLat): Promise<RouteResult> {
  const geoPath = path.join(process.cwd(), "public", "geo", "geo.json");
  const geo = JSON.parse(await fs.readFile(geoPath, "utf-8"));
  const feature = (geo.areas.features as Array<{ properties: { areaId: string }; geometry: { type: string; coordinates: unknown } }>).find(
    (f) => f.properties.areaId === areaId
  );
  if (!feature) throw new Error("area not found");
  if (feature.geometry.type !== "Polygon") throw new Error("unsupported geometry for this area");
  const poly = (feature.geometry.coordinates as LonLat[][])[0];

  const lons = poly.map((p) => p[0]);
  const lats = poly.map((p) => p[1]);
  const pad = BUFFER_M / 111320;
  const bbox: [number, number, number, number] = [Math.min(...lats) - pad, Math.min(...lons) - pad, Math.max(...lats) + pad, Math.max(...lons) + pad];

  const elements = await fetchOverpass(bbox);
  const { nodePos, edges, adjacency } = buildGraph(elements, poly);
  if (edges.length === 0) throw new Error("no street data found for this area");

  const mainNodes = largestComponent(nodePos, edges, adjacency);
  // restrict adjacency/edges usage to edges fully within mainNodes implicitly via dijkstra's `nodes` param

  const degree = new Map<string, number>();
  for (const n of mainNodes) degree.set(n, 0);
  for (const e of edges) {
    if (mainNodes.has(e.a) && mainNodes.has(e.b)) {
      degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
      degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
    }
  }
  const oddNodes = [...mainNodes].filter((n) => (degree.get(n) ?? 0) % 2 === 1);

  const streetLengthMeters = edges.filter((e) => mainNodes.has(e.a) && mainNodes.has(e.b)).reduce((s, e) => s + e.weight, 0);

  // shortest path tables between odd nodes (needed for matching + augmentation)
  const spTables = new Map<string, ReturnType<typeof dijkstra>>();
  for (const o of oddNodes) {
    spTables.set(o, dijkstra(o, mainNodes, adjacency, edges));
  }

  // greedy nearest-pair matching among odd-degree nodes
  const remaining = new Set(oddNodes);
  const pairs: [string, string][] = [];
  while (remaining.size > 0) {
    const a = remaining.values().next().value as string;
    remaining.delete(a);
    let bestB: string | null = null;
    let bestD = Infinity;
    const table = spTables.get(a)!;
    for (const b of remaining) {
      const d = table.dist.get(b) ?? Infinity;
      if (d < bestD) {
        bestD = d;
        bestB = b;
      }
    }
    if (bestB) {
      remaining.delete(bestB);
      pairs.push([a, bestB]);
    }
  }

  // augment: duplicate shortest-path edges for each matched pair
  for (const [a, b] of pairs) {
    const table = spTables.get(a)!;
    const seq = shortestPathEdges(b, table.prevEdge, table.prevNode);
    for (const ei of seq) {
      const orig = edges[ei];
      const newIdx = edges.length;
      edges.push({ a: orig.a, b: orig.b, weight: orig.weight, used: false });
      adjacency.get(orig.a)!.push(newIdx);
      adjacency.get(orig.b)!.push(newIdx);
    }
  }

  // pick start node: nearest graph node to the requested start (or polygon centroid)
  const centroid: LonLat = startCoord ?? [
    poly.reduce((s, p) => s + p[0], 0) / poly.length,
    poly.reduce((s, p) => s + p[1], 0) / poly.length,
  ];
  let startNode: string | null = null;
  let bestD = Infinity;
  for (const n of mainNodes) {
    const d = haversine(nodePos.get(n)!, centroid);
    if (d < bestD) {
      bestD = d;
      startNode = n;
    }
  }
  if (!startNode) throw new Error("could not determine a start point");

  const circuitNodes = hierholzer(startNode, adjacency, edges);
  const coords = circuitNodes.map((n) => nodePos.get(n)!);
  let distanceMeters = 0;
  for (let i = 0; i < circuitNodes.length - 1; i++) {
    distanceMeters += haversine(nodePos.get(circuitNodes[i])!, nodePos.get(circuitNodes[i + 1])!);
  }

  return {
    coords,
    distanceMeters: Math.round(distanceMeters),
    streetLengthMeters: Math.round(streetLengthMeters),
    startPoint: nodePos.get(startNode)!,
  };
}
