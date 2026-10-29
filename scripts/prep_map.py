#!/usr/bin/env python3
"""
Bikin data peta satu episode (src/videos/atlas-XX/map.json) dari:
  - geoBoundaries IDN ADM2 (batas kabupaten/kota, CC BY 4.0)  https://www.geoboundaries.org
  - Natural Earth 10m (pantai, provinsi, negara, jalan, kota, public domain)  https://www.naturalearthdata.com

Butuh Python 3 + shapely:  pip install shapely
File sumber di-download sekali ke folder .mapdata/ (±130 MB, di-.gitignore).

Contoh (ATLAS-01, Danau Toba):
  npm run map -- --out src/videos/atlas-01/map.json \
    --bbox 94.5 106.5 -6.5 7.5 --cen 98.85 2.6 --province "Sumatera Utara" \
    --water "Danau Toba" --feature lake="Danau Toba" --island island=Samosir:lake --axis lake

  --bbox lon0 lon1 lat0 lat1   area peta (satu pulau/kawasan, jangan terlalu besar)
  --cen lon lat                titik tengah dunia 3D (biasanya lokasi yang dibahas)
  --province NAMA              provinsi fokus (nama Natural Earth, misal "Jawa Timur", "Bali")
  --water ADM2                 kabupaten "air" di geoBoundaries yang sebenarnya danau (jadi cekungan air)
  --feature key=ADM2           simpan bentuk satu kabupaten/kota sebagai fitur bernama
  --island key=ADM2:fitur      bagian kabupaten yang ada di dalam fitur lain (pulau di tengah danau)
  --axis fitur                 hitung sumbu terpanjang fitur (buat garis ukur & tulisan di peta)
  --countries A,B              negara tetangga yang digambar gelap (default Malaysia,Singapore,Thailand,Timor-Leste,Papua New Guinea)
"""
import argparse, json, math, os, sys, urllib.request

try:
    from shapely.geometry import shape, box, Point, Polygon
    from shapely.ops import unary_union
except ImportError:
    sys.exit("Butuh shapely: pip install shapely")

CACHE = ".mapdata"
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
SRC = {
    "land": NE + "ne_10m_land.geojson",
    "minor": NE + "ne_10m_minor_islands.geojson",
    "admin1": NE + "ne_10m_admin_1_states_provinces.geojson",
    "admin0": NE + "ne_10m_admin_0_countries.geojson",
    "roads": NE + "ne_10m_roads.geojson",
    "places": NE + "ne_10m_populated_places_simple.geojson",
    "adm2": "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/IDN/ADM2/geoBoundaries-IDN-ADM2_simplified.geojson",
}


def feats(key):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + ".geojson")
    if not os.path.exists(path):
        print("download", SRC[key], flush=True)
        req = urllib.request.Request(SRC[key], headers={"User-Agent": "atlasnusia-reels"})
        with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
            f.write(r.read())
    return json.load(open(path))["features"]


def r4(x):
    return round(x, 4)


def polys(g, minarea=0.0006):
    ps = list(g.geoms) if hasattr(g, "geoms") else [g]
    out = []
    for p in ps:
        if p.geom_type != "Polygon" or p.area < minarea:
            continue
        out.append([[[r4(x), r4(y)] for x, y in p.exterior.coords]] + [[[r4(x), r4(y)] for x, y in r.coords] for r in p.interiors if Polygon(r).area > minarea / 4])
    return out


def lines_of(g):
    ls = list(g.geoms) if hasattr(g, "geoms") else [g]
    return [[[r4(x), r4(y)] for x, y in l.coords] for l in ls if l.geom_type == "LineString" and l.length > 0.01]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--bbox", nargs=4, type=float, required=True)
    ap.add_argument("--cen", nargs=2, type=float, required=True)
    ap.add_argument("--province", required=True)
    ap.add_argument("--water", action="append", default=[])
    ap.add_argument("--feature", action="append", default=[])
    ap.add_argument("--island", action="append", default=[])
    ap.add_argument("--axis", action="append", default=[])
    ap.add_argument("--countries", default="Malaysia,Singapore,Thailand,Timor-Leste,Papua New Guinea")
    a = ap.parse_args()
    lon0, lon1, lat0, lat1 = a.bbox
    BB = box(lon0, lat0, lon1, lat1)

    def simp(g, t=0.004):
        return g.simplify(t, preserve_topology=True).buffer(0)

    adm2 = [(f["properties"]["shapeName"], shape(f["geometry"]).buffer(0)) for f in feats("adm2")]
    adm2 = [(n, g) for n, g in adm2 if g.intersects(BB)]
    by = dict(adm2)
    for w in a.water:
        if w not in by:
            sys.exit(f"--water {w!r} nggak ada di geoBoundaries ADM2")
    water = unary_union([by[w] for w in a.water]) if a.water else None
    regs = [(n, g) for n, g in adm2 if n not in a.water]

    prov = [shape(f["geometry"]).buffer(0) for f in feats("admin1") if f["properties"].get("admin") == "Indonesia" and f["properties"].get("name") == a.province]
    if not prov:
        names = sorted({f["properties"].get("name") for f in feats("admin1") if f["properties"].get("admin") == "Indonesia"})
        sys.exit(f"Provinsi {a.province!r} nggak ketemu. Pilihan: {', '.join(names)}")
    provg = prov[0]
    in_focus = lambda g: g.representative_point().within(provg)
    f_regs = [(n, g) for n, g in regs if in_focus(g)]
    o_regs = [(n, g) for n, g in regs if not in_focus(g)]
    focus = simp(unary_union([g for _, g in f_regs]))
    rest = simp(unary_union([g for _, g in o_regs])).difference(focus.buffer(0.0005)).buffer(0)
    print(f"kabupaten/kota di bbox: {len(regs)}, di {a.province}: {len(f_regs)}")

    others = []
    wanted = set(s.strip() for s in a.countries.split(",") if s.strip())
    for f in feats("admin0"):
        if f["properties"]["ADMIN"] in wanted:
            g = shape(f["geometry"]).buffer(0).intersection(BB)
            if not g.is_empty:
                others.append(g)
    others = simp(unary_union(others), 0.01) if others else Polygon()

    def internal(group, land):
        b = unary_union([g.boundary for _, g in group]).difference(land.boundary.buffer(0.004)).simplify(0.003)
        return lines_of(b)

    landall = unary_union([g for _, g in regs] + ([water] if water else []))
    groups = {}
    provs = [(f["properties"]["name"], shape(f["geometry"]).buffer(0)) for f in feats("admin1") if f["properties"].get("admin") == "Indonesia"]
    for n, g in regs:
        pt = g.representative_point()
        pn = next((pn for pn, pg in provs if pt.within(pg)), min(provs, key=lambda x: x[1].distance(pt))[0])
        groups.setdefault(pn, []).append(g)
    pb = unary_union([unary_union(gs).boundary for gs in groups.values()]).difference(landall.boundary.buffer(0.006)).simplify(0.004)

    roads = []
    for f in feats("roads"):
        g = shape(f["geometry"])
        if not g.intersects(BB):
            continue
        g = g.intersection(BB).simplify(0.002)
        major = 1 if f["properties"]["type"] == "Major Highway" else 0
        for l in lines_of(g):
            roads.append([major, l])

    cities = []
    for f in feats("places"):
        p = f["properties"]
        x, y = f["geometry"]["coordinates"]
        if lon0 < x < lon1 and lat0 < y < lat1 and (p.get("adm0name") == "Indonesia" or p.get("scalerank", 10) <= 3):
            cities.append([round(x, 3), round(y, 3), p["name"], p.get("scalerank", 10), 1 if Point(x, y).within(focus) else 0])

    kab = []
    for n, g in regs:
        p = g.representative_point()
        kab.append([n, round(p.x, 3), round(p.y, 3), round(g.area, 4), 1 if in_focus(g) else 0])

    features, axes = {}, {}
    for spec in a.feature:
        k, n = spec.split("=", 1)
        if n not in by:
            sys.exit(f"--feature {n!r} nggak ada di geoBoundaries ADM2")
        features[k] = polys(simp(by[n], 0.0015), 0.0001)
    for spec in a.island:
        k, rest_ = spec.split("=", 1)
        n, host = rest_.split(":", 1)
        hg = unary_union([Polygon(p[0]) for p in features[host]])
        parts = list(by[n].geoms) if by[n].geom_type == "MultiPolygon" else [by[n]]
        features[k] = polys(simp(unary_union([p for p in parts if p.representative_point().within(hg)]), 0.0015), 0.0001)
    kx, ky = 111.32 * math.cos(math.radians(a.cen[1])), 110.6
    for k in a.axis:
        coords = max((p[0] for p in features[k]), key=len)
        best = (0, None)
        for i in range(0, len(coords), 2):
            for j in range(i + 1, len(coords), 2):
                d = ((coords[i][0] - coords[j][0]) * kx) ** 2 + ((coords[i][1] - coords[j][1]) * ky) ** 2
                if d > best[0]:
                    best = (d, (coords[i], coords[j]))
        axes[k] = [list(best[1][0]), list(best[1][1])]
        print(f"sumbu {k}: ±{math.sqrt(best[0]):.0f} km")

    data = {
        "bbox": [lon0, lon1, lat0, lat1],
        "cen": a.cen,
        "rest": polys(rest),
        "focus": polys(focus),
        "others": polys(others, 0.002),
        "water": polys(simp(water, 0.0015), 0.0001) if water else [],
        "regLines": internal(regs, landall),
        "provLines": lines_of(pb),
        "roads": roads,
        "cities": cities,
        "kab": kab,
        "features": features,
        "axes": axes,
    }
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump(data, open(a.out, "w"), separators=(",", ":"))
    print(f"→ {a.out} ({os.path.getsize(a.out) // 1024} KB)")


if __name__ == "__main__":
    main()
