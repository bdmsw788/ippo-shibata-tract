# Regenerates public/geo/geo.json from census small-area boundary data.
#
# Requires (not checked into the repo):
#   - shibata.topojson: small-area boundary topojson for Shibata city
#     (source: e-Stat / geoshape.ex.nii.ac.jp small-area boundary data,
#     "town" + "city" object layers), placed next to this script.
#   - pip install shapely
#
# Run from this directory: python3 build_geo.py
# Writes geo_new.json here; review it, then copy over public/geo/geo.json.
#
# Coordinates are plain WGS84 [lon, lat] degrees (what Leaflet's
# L.geoJSON() expects) -- do not reintroduce pixel-space projection here.
import json, re, math

# ---------- 1. decode topojson ----------
d = json.load(open("shibata.topojson"))
transform = d.get("transform")
arcs_raw = d["arcs"]

def decode_arc(arc):
    pts = []
    x = 0; y = 0
    for seg in arc:
        if transform:
            x += seg[0]; y += seg[1]
            lon = x * transform["scale"][0] + transform["translate"][0]
            lat = y * transform["scale"][1] + transform["translate"][1]
        else:
            lon, lat = seg[0], seg[1]
        pts.append((lon, lat))
    return pts

arcs = [decode_arc(a) for a in arcs_raw]

def arc_points(idx):
    return arcs[idx][:] if idx >= 0 else list(reversed(arcs[~idx]))

def ring_from_arcs(arc_idx_list):
    pts = []
    for k, idx in enumerate(arc_idx_list):
        seg = arc_points(idx)
        if k > 0 and pts and seg and pts[-1] == seg[0]:
            seg = seg[1:]
        pts.extend(seg)
    return pts

def rings_for_polygon(geom):
    return [ring_from_arcs(r) for r in geom["arcs"]]

def rings_list_for_geom(g):
    """Return list of polygons, each a list of rings (lon,lat tuples)."""
    if g["type"] == "Polygon":
        return [rings_for_polygon(g)]
    elif g["type"] == "MultiPolygon":
        out = []
        for poly_rings in g["arcs"]:
            out.append([ring_from_arcs(r) for r in poly_rings])
        return out
    return []

town = d["objects"]["town"]
by_key = {}
for g in town["geometries"]:
    props = g["properties"]
    key = props.get("KEY_CODE")
    polys = rings_list_for_geom(g)
    entry = by_key.setdefault(key, {"key": key, "sname": props.get("S_NAME"), "polys": []})
    entry["polys"].extend(polys)

print(f"decoded {len(by_key)} unique town KEY_CODEs from {len(town['geometries'])} fragments")

city_polys = []
for g in d["objects"]["city"]["geometries"]:
    city_polys.extend(rings_list_for_geom(g))

# ---------- 2. name matching (kanji numeral + alias + explicit district disambiguation) ----------
KANJI_NUM = {'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
def normalize_sname(sname):
    m = re.match(r'^(.*?)([一二三四五六七八九十])丁目$', sname)
    if m:
        base, kn = m.groups()
        return f"{base}{KANJI_NUM[kn]}丁目"
    return sname
def charfix(s):
    return s.replace('ケ','ヶ').replace('斉','斎').replace('舘','館')

ALIAS = {
    '下中': '下中(加治)', '館野小路': '館野小路(加治)', '下今泉': '下今泉(加治)',
    '湖南': '湖南(加治川)', '舟入': '舟入(字)', '中曽根': '中曽根(字)',
    '飯島': '飯島甲', '太斉': '太斎', '長者舘': '長者館', '竹ケ花': '竹ヶ花',
    '中田町3丁目': '中田町3丁目', '新栄町3丁目': '新栄町3丁目',
    '富塚': '富塚(字)', '中田': '中田(字)',
}
# names now resolved to real (formerly-nodata) areas; district context comes from app_area_district
NEWLY_RESOLVED = {'中田町3丁目','新栄町3丁目','富塚(字)','東赤谷','平山','小国谷','金沢'}
# names with genuinely no boundary in the census file at all (left out entirely, informational only)
NO_SHAPE_AT_ALL = {'東塚ノ目','中田(字)','大沢','真野代','下城','高田'}

# ---------- 3. load app area ids from data.ts ----------
html = open("../../../../ippo-shibata-tract/src/lib/data.ts", encoding="utf-8").read() if False else None
data_ts = open("/Users/seiji/ippo-shibata-tract/src/lib/data.ts", encoding="utf-8").read()
m = re.search(r'export const RAW_DISTRICTS: RawDistrict\[\] = \[(.*?)\n\];', data_ts, re.S)
block = m.group(1)
parts = re.split(r"\{id:'(\w+)'", block)
app_area_id = {}
app_area_district = {}
for i in range(1, len(parts), 2):
    did = parts[i]
    rest = parts[i+1]
    names = re.findall(r"\['([^']+)',\s*\d+\]", rest)
    for idx, nm in enumerate(names):
        app_area_id[nm] = f"{did}__{idx}"
        app_area_district[nm] = did
print("app areas loaded:", len(app_area_id))

matched_name = {}  # key -> app area NAME
unmatched = []
for key, entry in by_key.items():
    raw = entry["sname"]
    norm = charfix(normalize_sname(raw))
    cand = None
    for c in (normalize_sname(raw), norm, raw):
        if c in app_area_id:
            cand = c; break
    if cand is None:
        alias_key = ALIAS.get(normalize_sname(raw)) or ALIAS.get(norm) or ALIAS.get(raw)
        if alias_key and alias_key in app_area_id:
            cand = alias_key
    if cand is None:
        if raw in NO_SHAPE_AT_ALL or norm in NO_SHAPE_AT_ALL:
            continue  # genuinely no shape to attach; skip silently (informational only, no map polygon)
        unmatched.append(raw)
        continue
    matched_name[key] = cand

matched = {k: app_area_id[v] for k, v in matched_name.items()}  # key -> areaId ("district__index")
print("matched:", len(matched))
print("unmatched (will render as nodata):", unmatched)

# ---------- 4. Leaflet's L.geoJSON expects plain WGS84 [lon, lat] degrees, not projected pixels ----------
def project(lon, lat):
    return [round(lon, 6), round(lat, 6)]

from shapely.geometry import Polygon as ShpPolygon, MultiPolygon as ShpMultiPolygon

def simplify_polys(polys):
    """polys: list of [ [ring,...] ] (lon,lat tuples). Simplify with Douglas-Peucker, tolerance scaled to size."""
    shp_polys = []
    for rings in polys:
        if not rings:
            continue
        shell = rings[0]
        holes = rings[1:]
        try:
            p = ShpPolygon(shell, holes)
            if not p.is_valid:
                p = p.buffer(0)
            if not p.is_empty:
                shp_polys.append(p)
        except Exception:
            continue
    if not shp_polys:
        return polys
    geom = shp_polys[0] if len(shp_polys) == 1 else ShpMultiPolygon(shp_polys)
    area = geom.area
    tol = min(max((area ** 0.5) * 0.02, 0.00002), 0.0003)
    simplified = geom.simplify(tol, preserve_topology=True)
    if simplified.is_empty:
        simplified = geom
    out_polys = []
    parts = simplified.geoms if simplified.geom_type == "MultiPolygon" else [simplified]
    for p in parts:
        if p.is_empty:
            continue
        rings_out = [list(p.exterior.coords)] + [list(r.coords) for r in p.interiors]
        out_polys.append(rings_out)
    return out_polys if out_polys else polys

def polys_to_geojson_geom(polys):
    polys = simplify_polys(polys)
    coords = []
    for rings in polys:
        ring_coords = []
        for ring in rings:
            pts = [project(lon, lat) for lon, lat in ring]
            if pts and pts[0] != pts[-1]:
                pts.append(pts[0])
            ring_coords.append(pts)
        coords.append(ring_coords)
    if len(coords) == 1:
        return {"type": "Polygon", "coordinates": coords[0]}
    return {"type": "MultiPolygon", "coordinates": coords}

area_features = []
nodata_features = []
for key, entry in by_key.items():
    geom = polys_to_geojson_geom(entry["polys"])
    if key in matched:
        area_features.append({"type": "Feature", "properties": {"areaId": matched[key]}, "geometry": geom})
    elif entry["sname"] not in NO_SHAPE_AT_ALL:
        nodata_features.append({"type": "Feature", "properties": {}, "geometry": geom})

# districts: union by district id (via app_area_district using matched app names)
district_polys = {}
for key, entry in by_key.items():
    if key not in matched_name:
        continue
    did = app_area_district[matched_name[key]]
    district_polys.setdefault(did, []).extend(entry["polys"])

district_features = []
for did, polys in district_polys.items():
    district_features.append({"type": "Feature", "properties": {"districtId": did}, "geometry": polys_to_geojson_geom(polys)})

city_geom = polys_to_geojson_geom(city_polys)

out = {
    "areas": {"type": "FeatureCollection", "features": area_features},
    "nodata": {"type": "FeatureCollection", "features": nodata_features},
    "districts": {"type": "FeatureCollection", "features": district_features},
    "city": {"type": "Feature", "properties": {}, "geometry": city_geom},
}
json.dump(out, open("geo_new.json", "w"), ensure_ascii=False)
print("area_features:", len(area_features), "nodata_features:", len(nodata_features), "district_features:", len(district_features))
print("matched app areas (unique):", len(set(matched.values())))
