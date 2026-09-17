"use client";
import type * as LType from "leaflet";
import {
  RAW_DISTRICTS,
  TOTAL_HOUSEHOLDS,
  MEMBERS,
  PHOTOS,
  BADGE_ICONS,
  BADGE_TINT,
  MEMBER_PALETTE,
} from "./data";
import type { TractRecord } from "./types";

/* =====================================================================
   UTIL
===================================================================== */
function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function hexToRgb(hex: string) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function progressColor(pct: number) {
  const empty = cssVar("--p-empty"), mid = cssVar("--p-mid"), done = cssVar("--p-done");
  if (pct <= 0) return empty;
  if (pct < 50) return mixColor(empty, mid, pct / 50);
  return mixColor(mid, done, (pct - 50) / 50);
}
function fmt(n: number) {
  return Math.round(n).toLocaleString("ja-JP");
}
function haversineM(a: [number, number], b: [number, number]) {
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
function bearingDeg(a: [number, number], b: [number, number]) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
type RouteTurn = "start" | "straight" | "left" | "right" | "uturn";
interface RouteStep {
  turn: RouteTurn;
  distance: number;
}
// Simplifies the ordered route walk into discrete legs ("go this far, then
// turn this way"), by watching the bearing between consecutive points and
// only calling it a turn once the heading has shifted enough (and the
// current leg is long enough) to be a real decision point, not GPS-shape-point
// noise from the source road geometry.
function buildDirections(coords: [number, number][]): RouteStep[] {
  if (coords.length < 2) return [];
  const steps: RouteStep[] = [];
  let heading: number | null = null;
  let acc = 0;
  const MIN_LEG_M = 8;
  const TURN_THRESHOLD_DEG = 25;
  const UTURN_THRESHOLD_DEG = 150;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineM(coords[i - 1], coords[i]);
    if (d < 0.5) continue;
    const b = bearingDeg(coords[i - 1], coords[i]);
    if (heading === null) {
      heading = b;
      acc += d;
      continue;
    }
    const diff = ((b - heading + 540) % 360) - 180;
    if (Math.abs(diff) < TURN_THRESHOLD_DEG || acc < MIN_LEG_M) {
      acc += d;
      heading = b;
      continue;
    }
    const turn: RouteTurn = Math.abs(diff) > UTURN_THRESHOLD_DEG ? "uturn" : diff > 0 ? "right" : "left";
    steps.push({ turn: steps.length === 0 ? "start" : turn, distance: acc });
    acc = d;
    heading = b;
  }
  steps.push({ turn: steps.length === 0 ? "start" : "straight", distance: acc });
  return steps;
}
function pad2(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function dstr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function jpDate(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function weekKey(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day);
  return t.toISOString().slice(0, 10);
}
function statusOf(pct: number) {
  if (pct <= 0) return "none";
  if (pct >= 100) return "done";
  return "doing";
}
function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/* =====================================================================
   BUILD AREA MODEL
===================================================================== */
interface Area {
  id: string;
  districtId: string;
  districtName: string;
  name: string;
  households: number;
}
interface District {
  id: string;
  name: string;
  short: string;
  areas: Area[];
}
const DISTRICTS: District[] = RAW_DISTRICTS.map((d) => ({
  id: d.id,
  name: d.name,
  short: d.short,
  areas: d.areas.map(([name, households], i) => ({
    id: `${d.id}__${i}`,
    districtId: d.id,
    districtName: d.name,
    name,
    households,
  })),
}));
const AREA_BY_ID: Record<string, Area> = {};
DISTRICTS.forEach((d) => d.areas.forEach((a) => (AREA_BY_ID[a.id] = a)));

/* =====================================================================
   GEO (fetched once, lon/lat GeoJSON derived from surveyed boundaries)
===================================================================== */
interface GeoBundle {
  areas: GeoJSON.FeatureCollection;
  nodata: GeoJSON.FeatureCollection;
  districts: GeoJSON.FeatureCollection;
  city: GeoJSON.Feature;
}
let geoData: GeoBundle | null = null;
async function ensureGeoData(): Promise<GeoBundle> {
  if (geoData) return geoData;
  const res = await fetch("/geo/geo.json");
  geoData = await res.json();
  return geoData!;
}

/* =====================================================================
   ENTRY POINT
===================================================================== */
export function mountIppoApp(initialRecords: TractRecord[]): () => void {
  const TODAY = new Date();
  let records: TractRecord[] = initialRecords.slice();
  let destroyed = false;

  /* ---- persistence (shared, server-backed) ---- */
  async function refreshRecords() {
    try {
      const res = await fetch("/api/records", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (destroyed) return;
      records = data.records;
      renderAll();
    } catch {
      /* offline or transient error: keep showing what we have */
    }
  }
  function distributedFor(areaId: string) {
    let sum = 0;
    for (const r of records) if (r.areaId === areaId) sum += r.count;
    return sum;
  }
  function areaPct(a: Area) {
    const d = distributedFor(a.id);
    return a.households <= 0 ? 0 : Math.min(100, Math.round((d / a.households) * 100));
  }
  function districtStats(d: District) {
    let hh = 0, dist = 0;
    d.areas.forEach((a) => {
      hh += a.households;
      dist += Math.min(a.households, distributedFor(a.id));
    });
    return { households: hh, distributed: dist, pct: hh <= 0 ? 0 : Math.min(100, Math.round((dist / hh) * 100)) };
  }
  function cityStats() {
    let dist = 0;
    DISTRICTS.forEach((d) => d.areas.forEach((a) => (dist += Math.min(a.households, distributedFor(a.id)))));
    return { households: TOTAL_HOUSEHOLDS, distributed: dist, pct: Math.round((dist / TOTAL_HOUSEHOLDS) * 1000) / 10 };
  }

  /* ---- badges ---- */
  function computeStreak() {
    const weeks = new Set(records.map((r) => weekKey(new Date(r.date))));
    const cursor = new Date(TODAY);
    if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
    let streak = 0;
    while (weeks.has(weekKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }
    return streak;
  }
  function computeBadgeState() {
    const total = DISTRICTS.reduce((s, d) => s + districtStats(d).distributed, 0);
    const districtTouched = new Set(records.map((r) => r.districtId)).size;
    const anyAreaDone = DISTRICTS.some((d) => d.areas.some((a) => areaPct(a) >= 100));
    const anyDistrictDone = DISTRICTS.some((d) => districtStats(d).pct >= 100);
    const streak = computeStreak();
    const teamRecords = records.length;
    return [
      { id: "first", name: "初めの一歩", desc: "初めて配布を記録した", on: teamRecords >= 1 },
      { id: "h100", name: "100世帯突破", desc: "累計100世帯に到達", on: total >= 100 },
      { id: "h1000", name: "1,000世帯突破", desc: "累計1,000世帯に到達", on: total >= 1000 },
      { id: "h5000", name: "5,000世帯突破", desc: "累計5,000世帯に到達", on: total >= 5000 },
      { id: "h10000", name: "10,000世帯突破", desc: "累計10,000世帯に到達", on: total >= 10000 },
      { id: "areadone", name: "エリア制覇", desc: "いずれかのエリアを100%達成", on: anyAreaDone },
      { id: "districtdone", name: "地区コンプリート", desc: "いずれかの地区を100%達成", on: anyDistrictDone },
      { id: "alltouch", name: "12地区に足跡", desc: "全12地区で1件以上記録", on: districtTouched >= 12 },
      { id: "streak4", name: "4週連続", desc: "4週連続で配布を記録", on: streak >= 4 },
      { id: "streak12", name: "12週連続", desc: "約3か月継続して配布", on: streak >= 12 },
      { id: "team50", name: "チーム50件", desc: "記録件数が50件を突破", on: teamRecords >= 50 },
    ];
  }

  /* ---- render: home ---- */
  function renderHome() {
    const heroEl = el("heroCard");
    if (heroEl && !heroEl.dataset.imgSet) {
      const castle = PHOTOS.find((p) => p.id === "castle");
      if (castle) {
        heroEl.style.backgroundImage = `url(${castle.src})`;
        heroEl.dataset.imgSet = "1";
      }
    }
    const cs = cityStats();
    el("topPct")!.textContent = cs.pct + "%";
    el("heroCount")!.innerHTML = `${fmt(cs.distributed)} <small>/ ${fmt(TOTAL_HOUSEHOLDS)}世帯</small>`;
    el("heroRemain")!.textContent = fmt(TOTAL_HOUSEHOLDS - cs.distributed);
    el("ringPctText")!.textContent = cs.pct + "%";
    const circumference = 2 * Math.PI * 48;
    const off = circumference * (1 - Math.min(100, cs.pct) / 100);
    const ring = el("ringFg")!;
    ring.setAttribute("stroke-dasharray", circumference.toFixed(1));
    ring.setAttribute("stroke-dashoffset", off.toFixed(1));

    el("qsStreak")!.textContent = String(computeStreak());

    const thisWeek = weekKey(TODAY);
    const thisWeekSum = records.filter((r) => weekKey(new Date(r.date)) === thisWeek).reduce((s, r) => s + r.count, 0);
    el("qsWeek")!.textContent = fmt(thisWeekSum);

    const badgeDefs = computeBadgeState();
    el("qsBadges")!.textContent = `${badgeDefs.filter((b) => b.on).length}/${badgeDefs.length}`;

    const weekTop = memberTotals("week").filter(([, v]) => v > 0);
    el("qsLeader")!.textContent = weekTop.length ? weekTop[0][0] : "-";

    renderPhotoGallery();
    renderActivityFeed();
    setupMiniMap();
    refreshMapStyles();
  }
  function renderBadges(container: HTMLElement) {
    const defs = computeBadgeState();
    container.innerHTML = defs
      .map((b) => {
        const tint = BADGE_TINT[b.id];
        const style = tint ? ` style="color:${tint};background:color-mix(in srgb, ${tint} 20%, var(--surface-2));"` : "";
        return `
      <div class="badge-chip ${b.on ? "" : "locked"}" title="${b.desc}">
        <div class="ic"${style}>${BADGE_ICONS[b.id] || ""}</div>
        <div class="nm">${b.name}</div>
      </div>`;
      })
      .join("");
  }
  function memberColor(name: string) {
    const idx = MEMBERS.indexOf(name);
    return MEMBER_PALETTE[(idx >= 0 ? idx : 0) % MEMBER_PALETTE.length];
  }
  function memberTotals(range: "week" | "month" | "all") {
    let filt = records;
    if (range === "week") {
      const wk = weekKey(TODAY);
      filt = records.filter((r) => weekKey(new Date(r.date)) === wk);
    } else if (range === "month") {
      const ym = TODAY.toISOString().slice(0, 7);
      filt = records.filter((r) => r.date.slice(0, 7) === ym);
    }
    const map: Record<string, number> = {};
    MEMBERS.forEach((m) => (map[m] = 0));
    filt.forEach((r) => (map[r.member] = (map[r.member] || 0) + r.count));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }
  function rankRowHtml(name: string, val: number, i: number, max: number) {
    const medalClass = i === 0 ? "m1" : i === 1 ? "m2" : i === 2 ? "m3" : "";
    const col = memberColor(name);
    return `<div class="rank-row"><div class="rank-medal ${medalClass}">${i + 1}</div>
      <div class="rank-name">${name}<div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((val / max) * 100)}%;background:linear-gradient(90deg,${col},color-mix(in srgb, ${col} 70%, black));"></div></div></div>
      <div class="rank-val num">${fmt(val)}</div></div>`;
  }
  function renderPhotoGallery() {
    const container = el("photoScroll");
    if (!container) return;
    container.innerHTML = PHOTOS.map((p) => {
      const d = DISTRICTS.find((x) => x.id === p.district);
      return `<div class="photo-card" data-district="${p.district}">
        <div class="pc-img-wrap">
          <img src="${p.src}" alt="${p.title}" loading="lazy">
          <div class="pc-scrim"><div class="pc-title">${p.title}</div><div class="pc-sub">${d ? d.name : ""}</div></div>
        </div>
        <div class="pc-caption">${p.caption}</div>
        <div class="pc-credit">📷 ${p.author}, ${p.license}（Wikimedia Commons）</div>
      </div>`;
    }).join("");
    container.querySelectorAll<HTMLElement>(".photo-card").forEach((card, i) => {
      card.addEventListener("click", () => {
        navTo("areas");
        (document.querySelector('[data-mode="map"]') as HTMLElement | null)?.click();
        setTimeout(() => zoomToDistrict(PHOTOS[i].district), 60);
      });
    });
  }
  function renderActivityFeed() {
    const recent = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);
    const container = el("activityFeed")!;
    if (recent.length === 0) {
      container.innerHTML = '<div class="empty-note">まだ記録がありません</div>';
      return;
    }
    container.innerHTML = recent
      .map(
        (r) => `
      <div class="feed-row">
        <div class="feed-dot" style="background:${memberColor(r.member)};"></div>
        <div class="feed-main">
          <div class="feed-title">${r.member}さんが${r.districtName.replace("地区", "")}・${r.areaName}へ配布</div>
          <div class="feed-sub">${jpDate(new Date(r.date))}${r.memo ? " ・ " + r.memo : ""}</div>
        </div>
        <div class="feed-count num">+${r.count}</div>
        <button class="feed-del" data-delete-id="${r.id}" aria-label="この記録を削除" title="この記録を削除">✕</button>
      </div>`
      )
      .join("");
    container.querySelectorAll<HTMLElement>("[data-delete-id]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteRecord(b.dataset.deleteId!));
    });
  }

  /* ---- render: record form ---- */
  function populateForm() {
    const mSel = el<HTMLSelectElement>("fMember")!;
    mSel.innerHTML = MEMBERS.map((m) => `<option value="${m}">${m}</option>`).join("");
    const dSel = el<HTMLSelectElement>("fDistrict")!;
    dSel.innerHTML = DISTRICTS.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");
    const dateEl = el<HTMLInputElement>("fDate")!;
    dateEl.value = dstr(TODAY);
    dateEl.max = dstr(TODAY);
    populateAreaSelect(DISTRICTS[0].id);
    renderMemoChips();
    renderRecentAreaChips();
  }
  function populateAreaSelect(districtId: string, keepAreaId?: string) {
    const d = DISTRICTS.find((x) => x.id === districtId)!;
    const sel = el<HTMLSelectElement>("fArea")!;
    const visible = d.areas.filter((a) => areaPct(a) < 100 || a.id === keepAreaId);
    const list = visible.length ? visible : d.areas;
    sel.innerHTML = list
      .map((a) => {
        const pct = areaPct(a);
        const tag = pct >= 100 ? "（完了）" : pct > 0 ? `（${pct}%）` : "";
        return `<option value="${a.id}">${a.name} ・${fmt(a.households)}世帯${tag}</option>`;
      })
      .join("");
    if (keepAreaId) sel.value = keepAreaId;
    updateAreaHint();
  }
  function updateAreaHint() {
    const a = AREA_BY_ID[el<HTMLSelectElement>("fArea")!.value];
    if (!a) {
      el("areaHint")!.textContent = "";
      updateImpactPreview(null);
      return;
    }
    const dist = distributedFor(a.id);
    el("areaHint")!.textContent = `このエリアの世帯数 ${fmt(a.households)} ／ 配布済み ${fmt(dist)}（${areaPct(a)}%）`;
    updateImpactPreview(a);
  }
  function updateImpactPreview(a: Area | null) {
    const wrap = el("impactPreview");
    if (!wrap) return;
    if (!a) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    const before = areaPct(a);
    let count = parseInt(el<HTMLInputElement>("fCount")!.value, 10);
    if (!count || count < 1) count = 0;
    const dist = distributedFor(a.id);
    const after = a.households <= 0 ? 0 : Math.min(100, Math.round(((dist + count) / a.households) * 100));
    el("ipVal")!.textContent = after > before ? `${before}% → ${after}%` : `${before}%`;
    el("ipBarBefore")!.style.width = before + "%";
    const gainEl = el("ipBarAfter")!;
    gainEl.style.left = before + "%";
    gainEl.style.width = Math.max(0, after - before) + "%";
  }
  function updateRecordHero() {
    const target = el("recordHeroSub");
    if (!target) return;
    const streak = computeStreak();
    const cs = cityStats();
    const remain = TOTAL_HOUSEHOLDS - cs.distributed;
    target.innerHTML =
      streak > 0
        ? `<b class="num">${streak}</b>週連続で配布中 ・ 残り<b class="num">${fmt(remain)}</b>世帯`
        : `残り<b class="num">${fmt(remain)}</b>世帯で新発田市を一巡できます`;
  }
  function renderMemoChips() {
    const chips = ["不在が多め", "再訪予定あり", "好意的な反応"];
    const wrap = el("memoChips")!;
    wrap.innerHTML = chips.map((c) => `<span class="qchip" data-memo="${c}">${c}</span>`).join("");
    wrap.querySelectorAll<HTMLElement>(".qchip").forEach((c) => {
      c.addEventListener("click", () => {
        const ta = el<HTMLTextAreaElement>("fMemo")!;
        ta.value = ta.value ? ta.value + " / " + c.dataset.memo : c.dataset.memo!;
      });
    });
  }
  function renderRecentAreaChips() {
    const recent = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    const seen = new Set<string>();
    const chips: TractRecord[] = [];
    for (const r of recent) {
      if (!seen.has(r.areaId)) {
        seen.add(r.areaId);
        chips.push(r);
      }
      if (chips.length >= 6) break;
    }
    const wrap = el("recentAreaChips")!;
    el("recentAreaEmpty")!.style.display = chips.length ? "none" : "block";
    wrap.innerHTML = chips.map((r) => `<span class="qchip" data-district="${r.districtId}" data-area="${r.areaId}">${r.areaName}</span>`).join("");
    wrap.querySelectorAll<HTMLElement>(".qchip").forEach((c) => {
      c.addEventListener("click", () => {
        el<HTMLSelectElement>("fDistrict")!.value = c.dataset.district!;
        populateAreaSelect(c.dataset.district!, c.dataset.area!);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }
  function showToast(msg: string, gold?: boolean) {
    const wrap = el("toastWrap")!;
    const t = document.createElement("div");
    t.className = "toast" + (gold ? " gold" : "");
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(-10px)";
      t.style.transition = "all .3s";
      setTimeout(() => t.remove(), 320);
    }, 2600);
  }
  let submitting = false;
  async function submitRecord() {
    if (submitting) return;
    const districtId = el<HTMLSelectElement>("fDistrict")!.value;
    const areaId = el<HTMLSelectElement>("fArea")!.value;
    const a = AREA_BY_ID[areaId];
    const date = el<HTMLInputElement>("fDate")!.value || dstr(TODAY);
    const member = el<HTMLSelectElement>("fMember")!.value;
    let count = parseInt(el<HTMLInputElement>("fCount")!.value, 10);
    if (!count || count < 1) count = 1;
    const memo = el<HTMLTextAreaElement>("fMemo")!.value.trim();
    const beforeBadges = computeBadgeState().filter((b) => b.on).map((b) => b.id);

    submitting = true;
    const btn = el<HTMLButtonElement>("submitRecord")!;
    btn.disabled = true;
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId, member, date, count, memo }),
      });
      if (!res.ok) {
        showToast("保存できませんでした。通信環境を確認してください");
        return;
      }
      const data = await res.json();
      records = data.records;

      const afterBadges = computeBadgeState().filter((b) => b.on).map((b) => b.id);
      const newlyUnlocked = afterBadges.filter((id) => !beforeBadges.includes(id));

      showToast(`${a.name}に${fmt(count)}世帯 記録しました`);
      if (newlyUnlocked.length) {
        const def = computeBadgeState().find((b) => b.id === newlyUnlocked[0]);
        setTimeout(() => showToast(`🎉 新しいバッジ「${def!.name}」を獲得！`, true), 500);
      }
      el<HTMLTextAreaElement>("fMemo")!.value = "";
      el<HTMLInputElement>("fCount")!.value = "10";
      populateAreaSelect(districtId);
      renderRecentAreaChips();
      renderAll();
    } catch {
      showToast("保存できませんでした。通信環境を確認してください");
    } finally {
      submitting = false;
      btn.disabled = false;
    }
  }
  let deletingId: string | null = null;
  function confirmDeleteRecord(id: string, reopenAreaId?: string) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    const ok = window.confirm(`${r.member}さんの記録(${r.districtName}・${r.areaName} +${fmt(r.count)}世帯)を削除しますか？\nこの操作は元に戻せません。`);
    if (ok) deleteRecord(id, reopenAreaId);
  }
  async function deleteRecord(id: string, reopenAreaId?: string) {
    if (deletingId) return;
    deletingId = id;
    try {
      const res = await fetch(`/api/records/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("削除できませんでした。通信環境を確認してください");
        return;
      }
      const data = await res.json();
      records = data.records;
      showToast("記録を削除しました");
      renderAll();
      if (reopenAreaId) openAreaDetail(reopenAreaId);
    } catch {
      showToast("削除できませんでした。通信環境を確認してください");
    } finally {
      deletingId = null;
    }
  }

  /* ---- render: areas (list) ---- */
  let areaListStatus = "all";
  let areaListDistrict = "all";
  function renderDistrictFilterRow() {
    const container = el("districtFilterRow")!;
    container.innerHTML = ['<button class="filter-chip on" data-d="all">すべての地区</button>']
      .concat(DISTRICTS.map((d) => `<button class="filter-chip" data-d="${d.id}">${d.short}</button>`))
      .join("");
    container.querySelectorAll<HTMLElement>(".filter-chip").forEach((c) => {
      c.addEventListener("click", () => {
        areaListDistrict = c.dataset.d!;
        container.querySelectorAll(".filter-chip").forEach((x) => x.classList.toggle("on", x === c));
        renderAreaList();
      });
    });
  }
  function renderAreaList() {
    const q = el<HTMLInputElement>("areaSearch")!.value.trim();
    let all: Area[] = [];
    DISTRICTS.forEach((d) => {
      if (areaListDistrict === "all" || areaListDistrict === d.id) d.areas.forEach((a) => all.push(a));
    });
    if (q) all = all.filter((a) => a.name.includes(q));
    if (areaListStatus !== "all") all = all.filter((a) => statusOf(areaPct(a)) === areaListStatus);
    all.sort((a, b) => areaPct(b) - areaPct(a) || b.households - a.households);
    const wrap = el("areaListWrap")!;
    if (all.length === 0) {
      wrap.innerHTML = '<div class="empty-note">該当するエリアがありません</div>';
      return;
    }
    wrap.innerHTML = all
      .slice(0, 400)
      .map((a) => {
        const pct = areaPct(a);
        return `<div class="arow" data-area="${a.id}">
        <div class="arow-sw" style="background:${progressColor(pct)};"></div>
        <div class="arow-main"><div class="arow-name">${a.name}</div><div class="arow-sub">${a.districtName} ・ ${fmt(a.households)}世帯</div></div>
        <div class="arow-pct num" style="color:${pct >= 100 ? "var(--accent-strong)" : "var(--text-muted)"}">${pct}%</div>
      </div>`;
      })
      .join("");
    wrap.querySelectorAll<HTMLElement>(".arow").forEach((r) => r.addEventListener("click", () => openAreaDetail(r.dataset.area!)));
  }

  /* ---- sheet ---- */
  function openAreaDetail(areaId: string) {
    const a = AREA_BY_ID[areaId];
    const pct = areaPct(a);
    const dist = distributedFor(a.id);
    const hist = records.filter((r) => r.areaId === areaId).sort((x, y) => y.date.localeCompare(x.date));
    const body = `
      <button class="sheet-close" data-close-sheet>✕</button>
      <div class="sheet-handle"></div>
      <h3 style="font-size:18px;">${a.name}</h3>
      <div class="hint" style="margin-top:2px;">${a.districtName}</div>
      <div class="detail-grid">
        <div class="detail-box"><div class="l">世帯数</div><div class="v num">${fmt(a.households)}</div></div>
        <div class="detail-box"><div class="l">配布済み</div><div class="v num">${fmt(dist)}（${pct}%）</div></div>
      </div>
      <div class="section-lbl">配布履歴（${hist.length}件）</div>
      <div style="margin-top:6px;">
        ${
          hist.length
            ? hist
                .slice(0, 10)
                .map(
                  (r) => `
          <div class="feed-row"><div class="feed-dot" style="background:${memberColor(r.member)};"></div>
            <div class="feed-main"><div class="feed-title">${r.member}さん</div>
            <div class="feed-sub">${jpDate(new Date(r.date))}${r.memo ? " ・ " + r.memo : ""}</div></div>
            <div class="feed-count num">+${r.count}</div>
            <button class="feed-del" data-delete-id="${r.id}" data-reopen-area="${areaId}" aria-label="この記録を削除" title="この記録を削除">✕</button></div>`
                )
                .join("")
            : '<div class="empty-note">まだ記録がありません</div>'
        }
      </div>
      <button class="btn-primary" style="margin-top:16px;" data-prefill-district="${a.districtId}" data-prefill-area="${a.id}">このエリアに記録を追加</button>
      <button class="btn-secondary" style="margin-top:10px;" data-route-area="${a.id}">🗺️ 配布ルートを作成</button>
    `;
    openSheet(body);
  }
  function prefillRecord(districtId: string, areaId: string) {
    navTo("record");
    el<HTMLSelectElement>("fDistrict")!.value = districtId;
    populateAreaSelect(districtId, areaId);
  }
  function openSheet(html: string) {
    el("sheetBody")!.innerHTML = html;
    el("overlay")!.classList.add("open");
    const sheet = el("sheetBody")!;
    sheet.querySelectorAll<HTMLElement>("[data-close-sheet]").forEach((b) => b.addEventListener("click", closeSheet));
    sheet.querySelectorAll<HTMLElement>("[data-prefill-district]").forEach((b) => {
      b.addEventListener("click", () => {
        closeSheet();
        prefillRecord(b.dataset.prefillDistrict!, b.dataset.prefillArea!);
      });
    });
    sheet.querySelectorAll<HTMLElement>("[data-delete-id]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteRecord(b.dataset.deleteId!, b.dataset.reopenArea));
    });
    sheet.querySelectorAll<HTMLElement>("[data-route-area]").forEach((b) => {
      b.addEventListener("click", () => {
        closeSheet();
        generateAndShowRoute(b.dataset.routeArea!);
      });
    });
  }
  function closeSheet() {
    el("overlay")!.classList.remove("open");
  }

  /* ---- render: ranking ---- */
  let rankRange: "week" | "month" | "all" = "week";
  function renderRankFull() {
    const arr = memberTotals(rankRange);
    const max = Math.max(1, arr[0] ? arr[0][1] : 1);
    el("rankFull")!.innerHTML = arr.map(([n, v], i) => rankRowHtml(n, v, i, max)).join("");
  }
  function renderBadgeGrid() {
    renderBadges(el("badgeGrid")!);
  }
  function renderDistrictProgressList() {
    const sorted = [...DISTRICTS].map((d) => ({ d, st: districtStats(d) })).sort((a, b) => b.st.pct - a.st.pct);
    el("districtProgressList")!.innerHTML = sorted
      .map(
        ({ d, st }) => `
      <div style="padding:8px 0;">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:5px;">
          <span>${d.name}</span><span class="num">${st.pct}%</span>
        </div>
        <div class="rank-bar-wrap" style="height:7px;"><div class="rank-bar" style="width:${st.pct}%;background:${progressColor(st.pct)};"></div></div>
      </div>`
      )
      .join("");
  }

  /* =====================================================================
     REAL MAP (Leaflet)
  ===================================================================== */
  const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
  const AREA_ZOOM = 15;
  let map: LType.Map | null = null;
  let districtLayer: LType.GeoJSON | null = null;
  let areaLayer: LType.GeoJSON | null = null;
  let nodataLayer: LType.GeoJSON | null = null;
  let routeLayer: LType.Polyline | null = null;
  let miniMap: LType.Map | null = null;
  let miniDistrictLayer: LType.GeoJSON | null = null;
  let mapSetupPromise: Promise<void> | null = null;
  let miniSetupPromise: Promise<void> | null = null;
  let Leaf: typeof LType;
  async function ensureLeaflet(): Promise<typeof LType> {
    if (!Leaf) Leaf = (await import("leaflet")).default;
    return Leaf;
  }

  function districtLabelHtml(d: District) {
    const st = districtStats(d);
    return `<div class="lmap-label"><b>${d.short}</b><span>${st.pct}%</span></div>`;
  }
  function areaLabelHtml(a: Area) {
    const pct = areaPct(a);
    return `<div class="lmap-label"><b>${a.name}</b><span>${pct}%</span><i>${fmt(a.households)}世帯</i></div>`;
  }
  function districtStyleFor(d: District): LType.PathOptions {
    const st = districtStats(d);
    return { fillColor: progressColor(st.pct), fillOpacity: 0.6, color: "#fff", weight: 1.2 };
  }
  function areaStyleFor(a: Area | undefined): LType.PathOptions {
    const pct = a ? areaPct(a) : 0;
    return { fillColor: progressColor(pct), fillOpacity: 0.55, color: "#fff", weight: 1 };
  }

  async function setupMainMap() {
    const container = el("realMapEl");
    if (!container || map) return;
    if (mapSetupPromise) return mapSetupPromise;
    mapSetupPromise = (async () => {
      const geo = await ensureGeoData();
      await ensureLeaflet();
      if (destroyed) return;
      map = Leaf.map(container, { zoomControl: false, minZoom: 11, maxZoom: 18 });
      Leaf.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
      const cityLayer = Leaf.geoJSON(geo.city, { style: { fill: false, color: cssVar("--border-strong"), weight: 2 }, interactive: false });
      cityLayer.addTo(map);
      map.fitBounds(cityLayer.getBounds(), { padding: [12, 12] });

      districtLayer = Leaf.geoJSON(geo.districts, {
        style: (feature) => districtStyleFor(DISTRICTS.find((x) => x.id === feature!.properties!.districtId)!),
        onEachFeature: (feature, layer) => {
          const d = DISTRICTS.find((x) => x.id === feature.properties!.districtId)!;
          layer.bindTooltip(districtLabelHtml(d), { permanent: true, direction: "center", className: "lmap-tooltip lmap-tooltip-district" });
          layer.on("click", () => zoomToDistrict(d.id));
        },
      });
      areaLayer = Leaf.geoJSON(geo.areas, {
        style: (feature) => areaStyleFor(AREA_BY_ID[feature!.properties!.areaId]),
        onEachFeature: (feature, layer) => {
          const a = AREA_BY_ID[feature.properties!.areaId];
          if (!a) return;
          layer.bindTooltip(areaLabelHtml(a), { permanent: true, direction: "center", className: "lmap-tooltip lmap-tooltip-area" });
          layer.on("click", () => openAreaDetail(a.id));
        },
      });
      nodataLayer = Leaf.geoJSON(geo.nodata, {
        style: { fillColor: cssVar("--border"), fillOpacity: 0.4, color: cssVar("--bg-soft"), weight: 1 },
        interactive: false,
      });

      map.on("zoomend", updateMapLayerVisibility);
      updateMapLayerVisibility();

      el("mapZoomIn")?.addEventListener("click", () => map?.zoomIn());
      el("mapZoomOut")?.addEventListener("click", () => map?.zoomOut());
      el("mapZoomFit")?.addEventListener("click", () => {
        if (map) map.fitBounds(cityLayer.getBounds(), { padding: [12, 12] });
      });
    })();
    return mapSetupPromise;
  }
  function updateMapLayerVisibility() {
    if (!map || !districtLayer || !areaLayer || !nodataLayer) return;
    const z = map.getZoom();
    if (z >= AREA_ZOOM) {
      if (map.hasLayer(districtLayer)) map.removeLayer(districtLayer);
      if (!map.hasLayer(areaLayer)) areaLayer.addTo(map);
      if (!map.hasLayer(nodataLayer)) nodataLayer.addTo(map);
    } else {
      if (map.hasLayer(areaLayer)) map.removeLayer(areaLayer);
      if (map.hasLayer(nodataLayer)) map.removeLayer(nodataLayer);
      if (!map.hasLayer(districtLayer)) districtLayer.addTo(map);
    }
  }
  async function setupMiniMap() {
    const container = el("miniMapEl");
    if (!container || miniMap) return;
    if (miniSetupPromise) return miniSetupPromise;
    miniSetupPromise = (async () => {
      const geo = await ensureGeoData();
      await ensureLeaflet();
      if (destroyed) return;
      miniMap = Leaf.map(container, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        attributionControl: false,
        keyboard: false,
      });
      const cityLayer = Leaf.geoJSON(geo.city, { style: { fill: false, color: cssVar("--border-strong"), weight: 1.3 }, interactive: false });
      cityLayer.addTo(miniMap);
      miniMap.invalidateSize();
      miniMap.fitBounds(cityLayer.getBounds(), { padding: [4, 4] });
      // Shibata's administrative area is long and thin (merged rural/coastal exclaves),
      // so fitting the full extent into a short preview box zooms out too far to read.
      // Favor legibility of the populated core over showing every remote corner.
      if (miniMap.getZoom() < 10) miniMap.setZoom(10);
      // No tile layer here on purpose: OSM street detail competes with the progress
      // colors and makes this at-a-glance widget harder to read, not easier.
      miniDistrictLayer = Leaf.geoJSON(geo.districts, {
        style: (feature) => ({ ...districtStyleFor(DISTRICTS.find((x) => x.id === feature!.properties!.districtId)!), fillOpacity: 0.85 }),
        onEachFeature: (feature, layer) => {
          const d = DISTRICTS.find((x) => x.id === feature.properties!.districtId)!;
          layer.on("click", () => {
            navTo("areas");
            setTimeout(() => zoomToDistrict(d.id), 60);
          });
        },
      }).addTo(miniMap);
    })();
    return miniSetupPromise;
  }
  function refreshMapStyles() {
    districtLayer?.eachLayer((layer) => {
      const gj = layer as LType.GeoJSON & { feature?: GeoJSON.Feature };
      const d = DISTRICTS.find((x) => x.id === gj.feature?.properties?.districtId);
      if (!d) return;
      (layer as LType.Path).setStyle(districtStyleFor(d));
      (layer as LType.Path & { setTooltipContent: (s: string) => void }).setTooltipContent(districtLabelHtml(d));
    });
    areaLayer?.eachLayer((layer) => {
      const gj = layer as LType.GeoJSON & { feature?: GeoJSON.Feature };
      const a = AREA_BY_ID[gj.feature?.properties?.areaId];
      if (!a) return;
      (layer as LType.Path).setStyle(areaStyleFor(a));
      (layer as LType.Path & { setTooltipContent: (s: string) => void }).setTooltipContent(areaLabelHtml(a));
    });
    miniDistrictLayer?.eachLayer((layer) => {
      const gj = layer as LType.GeoJSON & { feature?: GeoJSON.Feature };
      const d = DISTRICTS.find((x) => x.id === gj.feature?.properties?.districtId);
      if (!d) return;
      (layer as LType.Path).setStyle(districtStyleFor(d));
    });
  }
  async function zoomToDistrict(districtId: string) {
    await setupMainMap();
    const geo = await ensureGeoData();
    await ensureLeaflet();
    const feature = geo.districts.features.find((f) => f.properties!.districtId === districtId);
    if (!feature || !map) return;
    map.invalidateSize();
    map.fitBounds(Leaf.geoJSON(feature).getBounds(), { padding: [24, 24], maxZoom: 16 });
  }
  async function zoomToArea(areaId: string) {
    await setupMainMap();
    const geo = await ensureGeoData();
    await ensureLeaflet();
    const feature = geo.areas.features.find((f) => f.properties!.areaId === areaId);
    if (!feature || !map) return;
    map.invalidateSize();
    map.fitBounds(Leaf.geoJSON(feature).getBounds(), { padding: [24, 24], maxZoom: 17 });
  }
  async function generateAndShowRoute(areaId: string) {
    const a = AREA_BY_ID[areaId];
    if (!a) return;
    navTo("areas");
    const mapBtn = document.querySelector<HTMLElement>('#areaModeSeg button[data-mode="map"]');
    mapBtn?.click();
    await zoomToArea(areaId);
    if (routeLayer) {
      routeLayer.remove();
      routeLayer = null;
    }
    const directionsCard = el("routeDirectionsCard");
    if (directionsCard) directionsCard.style.display = "none";
    showToast(`${a.name}の配布ルートを作成中…（30秒ほどかかることがあります）`);
    try {
      const res = await fetch(`/api/route/${encodeURIComponent(areaId)}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.coords) || data.coords.length < 2) {
        showToast(data.error === "no street data found for this area" ? "このエリアの道路データが見つかりませんでした" : "ルートを作成できませんでした。しばらくしてからもう一度お試しください");
        return;
      }
      await ensureLeaflet();
      if (!map) return;
      const latlngs = (data.coords as [number, number][]).map(([lon, lat]) => [lat, lon] as [number, number]);
      routeLayer = Leaf.polyline(latlngs, { color: cssVar("--coral"), weight: 4, opacity: 0.9, lineJoin: "round" }).addTo(map);
      map.fitBounds(routeLayer.getBounds(), { padding: [24, 24] });
      const km = (data.distanceMeters / 1000).toFixed(1);
      showToast(`ルートを作成しました（約${km}km）`, true);
      renderRouteDirections(data.coords as [number, number][], data.distanceMeters as number);
    } catch {
      showToast("ルートを作成できませんでした。通信環境を確認してください");
    }
  }
  const turnLabel: Record<RouteTurn, string> = { start: "出発", straight: "直進", left: "左折", right: "右折", uturn: "Uターン" };
  const turnIcon: Record<RouteTurn, string> = { start: "🚩", straight: "↑", left: "↰", right: "↱", uturn: "↩" };
  function renderRouteDirections(coords: [number, number][], distanceMeters: number) {
    const card = el("routeDirectionsCard");
    if (!card) return;
    const steps = buildDirections(coords);
    card.style.display = "";
    el("routeDirectionsSummary")!.textContent = `総距離 約${(distanceMeters / 1000).toFixed(1)}km ・ ${steps.length}区間`;
    el("routeDirectionsList")!.innerHTML =
      steps
        .map(
          (s, i) => `
      <div class="route-step">
        <div class="route-step-icon">${turnIcon[s.turn]}</div>
        <div class="route-step-main">${i + 1}. ${turnLabel[s.turn]}${s.turn !== "start" ? "して進む" : ""}</div>
        <div class="route-step-dist">${fmt(s.distance)}m</div>
      </div>`
        )
        .join("") + `<div class="route-step-goal">🏁 出発地点に戻ってゴールです</div>`;
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function renderMapDistrictJump() {
    const container = el("mapDistrictJump");
    if (!container) return;
    container.innerHTML = DISTRICTS.map((d) => `<button class="map-jump-chip" data-district="${d.id}">${d.short}</button>`).join("");
    container.querySelectorAll<HTMLElement>(".map-jump-chip").forEach((c) => {
      c.addEventListener("click", () => zoomToDistrict(c.dataset.district!));
    });
  }

  /* ---- nav / wiring ---- */
  function navTo(name: string) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", (b as HTMLElement).dataset.nav === name));
    window.scrollTo({ top: 0 });
    if (name === "areas") {
      setupMainMap().then(() => map?.invalidateSize());
    }
  }
  function renderAll() {
    renderHome();
    renderMapDistrictJump();
    renderDistrictFilterRow();
    renderAreaList();
    renderRankFull();
    renderBadgeGrid();
    renderDistrictProgressList();
    updateAreaHint();
    updateRecordHero();
  }
  function wireEvents() {
    document.querySelectorAll<HTMLElement>("[data-nav]").forEach((b) => b.addEventListener("click", () => navTo(b.dataset.nav!)));
    el("overlay")!.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).id === "overlay") closeSheet();
    });

    el<HTMLSelectElement>("fDistrict")!.addEventListener("change", (e) => populateAreaSelect((e.target as HTMLSelectElement).value));
    el<HTMLSelectElement>("fArea")!.addEventListener("change", updateAreaHint);
    el("submitRecord")!.addEventListener("click", submitRecord);
    el("stepPlus")!.addEventListener("click", () => {
      const i = el<HTMLInputElement>("fCount")!;
      i.value = String(Math.max(1, (parseInt(i.value, 10) || 0) + 5));
      updateImpactPreview(AREA_BY_ID[el<HTMLSelectElement>("fArea")!.value]);
    });
    el("stepMinus")!.addEventListener("click", () => {
      const i = el<HTMLInputElement>("fCount")!;
      i.value = String(Math.max(1, (parseInt(i.value, 10) || 0) - 5));
      updateImpactPreview(AREA_BY_ID[el<HTMLSelectElement>("fArea")!.value]);
    });
    el("fCount")!.addEventListener("input", () => {
      updateImpactPreview(AREA_BY_ID[el<HTMLSelectElement>("fArea")!.value]);
    });
    el("fillRemaining")!.addEventListener("click", () => {
      const a = AREA_BY_ID[el<HTMLSelectElement>("fArea")!.value];
      if (!a) return;
      const remaining = a.households - distributedFor(a.id);
      el<HTMLInputElement>("fCount")!.value = String(Math.max(1, remaining));
      updateImpactPreview(a);
    });

    document.querySelectorAll<HTMLElement>("#areaModeSeg button").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#areaModeSeg button").forEach((x) => x.classList.toggle("active", x === b));
        el("areaMapPane")!.style.display = b.dataset.mode === "map" ? "block" : "none";
        el("areaListPane")!.style.display = b.dataset.mode === "list" ? "block" : "none";
        if (b.dataset.mode === "map") {
          setupMainMap().then(() => map?.invalidateSize());
        }
      });
    });
    el("areaSearch")!.addEventListener("input", renderAreaList);
    el("routeDirectionsClose")?.addEventListener("click", () => {
      el("routeDirectionsCard")!.style.display = "none";
    });
    document.querySelectorAll<HTMLElement>("#statusFilterRow .filter-chip").forEach((c) => {
      c.addEventListener("click", () => {
        areaListStatus = c.dataset.status!;
        document.querySelectorAll("#statusFilterRow .filter-chip").forEach((x) => x.classList.toggle("on", x === c));
        renderAreaList();
      });
    });
    document.querySelectorAll<HTMLElement>("#rankRangeSeg button").forEach((b) => {
      b.addEventListener("click", () => {
        rankRange = b.dataset.range as "week" | "month" | "all";
        document.querySelectorAll("#rankRangeSeg button").forEach((x) => x.classList.toggle("active", x === b));
        renderRankFull();
      });
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = () => {
      renderAll();
      refreshMapStyles();
    };
    mq.addEventListener("change", onThemeChange);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshRecords();
    });
    const pollId = window.setInterval(refreshRecords, 25000);

    return () => {
      mq.removeEventListener("change", onThemeChange);
      window.clearInterval(pollId);
    };
  }

  /* ---- init ---- */
  populateForm();
  const unwireExtra = wireEvents();
  renderAll();
  setupMiniMap();

  return () => {
    destroyed = true;
    unwireExtra?.();
    map?.remove();
    miniMap?.remove();
    map = null;
    miniMap = null;
  };
}
