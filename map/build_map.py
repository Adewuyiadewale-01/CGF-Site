"""Build a dotted map of the CGF service area from real NSW LGA boundaries.

Source: LGAs_Sydney_and_surrounds.json (Geoscape / data.gov.au via UNSW City Data, CC BY 4.0).
Outputs:
  sydney-dots.svg  — one <circle> per land dot, grouped by region (ids usable for hover in the live site)
  regions.json     — label anchor (centroid of each region's dots) in SVG coordinates
"""
import json, math

REGIONS = {
    'sutherland': ('Sutherland Shire', {'SUTHERLAND SHIRE'}),
    'eastern': ('Eastern Suburbs', {'RANDWICK', 'WAVERLEY', 'WOOLLAHRA'}),
    'inner-west': ('Inner West', {'INNER WEST'}),
    'north-shore': ('North Shore', {'NORTH SYDNEY', 'WILLOUGHBY', 'LANE COVE', 'MOSMAN', 'KU-RING-GAI', 'HUNTERS HILL'}),
    'northern-beaches': ('Northern Beaches', {'NORTHERN BEACHES'}),
}
LON0, LON1, LAT0, LAT1 = 150.90, 151.36, -34.19, -33.56   # frame
STEP_LAT = 0.0058
KX = math.cos(math.radians(33.9))
STEP_LON = STEP_LAT / KX
W = 600
SCALE = W / ((LON1 - LON0) * KX)
H = round((LAT1 - LAT0) * SCALE)
HQ = (151.1172, -34.0446)  # Caringbah


def proj(lon, lat):
    return ((lon - LON0) * KX * SCALE, (LAT1 - lat) * SCALE)


d = json.load(open('lgas.json'))
polys = []  # (name, ring, bbox)
for f in d['features']:
    name = f['properties']['NSW_LGA__3']
    g = f['geometry']
    parts = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for part in parts:
        ring = part[0]
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        polys.append((name, ring, (min(xs), min(ys), max(xs), max(ys))))


def inside(x, y, ring):
    c = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]; xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def lga_at(lon, lat):
    for name, ring, (a, b, c2, e) in polys:
        if a <= lon <= c2 and b <= lat <= e and inside(lon, lat, ring):
            return name
    return None


region_of = {lga: key for key, (_, s) in REGIONS.items() for lga in s}
groups = {k: [] for k in REGIONS}; groups['other'] = []
row = 0
lat = LAT1
while lat >= LAT0:
    off = (STEP_LON / 2) if row % 2 else 0  # staggered rows read as a finer grid
    lon = LON0 + off
    while lon <= LON1:
        n = lga_at(lon, lat)
        if n and n != 'UNINCORPORATED':
            groups[region_of.get(n, 'other')].append(proj(lon, lat))
        lon += STEP_LON
    lat -= STEP_LAT; row += 1

out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
R = 2.1
out.append('<g id="other" fill="#EDEBE6" fill-opacity="0.16">' + ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{R}"/>' for x, y in groups['other']) + '</g>')
anchors = {}
for k, (label, _) in REGIONS.items():
    pts = groups[k]
    out.append(f'<g id="{k}" data-label="{label}" fill="#EDEBE6" fill-opacity="0.62">' + ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{R}"/>' for x, y in pts) + '</g>')
    anchors[k] = {'label': label, 'x': round(sum(p[0] for p in pts) / len(pts), 1), 'y': round(sum(p[1] for p in pts) / len(pts), 1), 'dots': len(pts)}
hx, hy = proj(*HQ)
anchors['hq'] = {'label': 'CGF HQ · Caringbah', 'x': round(hx, 1), 'y': round(hy, 1)}
out.append('</svg>')
open('sydney-dots.svg', 'w').write(''.join(out))
json.dump({'w': W, 'h': H, 'regions': anchors}, open('regions.json', 'w'), indent=1)
print(W, H, {k: len(v) for k, v in groups.items()})
print(json.dumps(anchors))
