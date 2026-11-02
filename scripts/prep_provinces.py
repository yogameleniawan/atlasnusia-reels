# Peta 38 provinsi untuk scene Ajak (src/atlas/progress.tsx) & aplikasi peta Atlasnusia.
# Pakai data .mapdata/ yang di-download prep_map.py (jalankan npm run map sekali dulu).
#   python3 scripts/prep_provinces.py   → src/atlas/indonesia.json
# Natural Earth baru punya 33 provinsi: Papua pecahan & Kalimantan Utara disusun dari daftar kabupaten ADM2.
import json, os
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union
M=os.path.join(os.path.dirname(__file__),'..','.mapdata')+'/'
A=json.load(open(M+'admin1.geojson'))['features']
P=[(f['properties']['name'],shape(f['geometry']).buffer(0)) for f in A if f['properties'].get('admin')=='Indonesia']
D=json.load(open(M+'adm2.geojson'))['features']
SPLIT={
 'Papua Selatan':['Merauke','Boven Digoel','Mappi','Asmat'],
 'Papua Tengah':['Nabire','Paniai','Mimika','Puncak Jaya','Puncak','Dogiyai','Intan Jaya','Deiyai'],
 'Papua Pegunungan':['Jayawijaya','Lanny Jaya','Mamberamo Tengah','Nduga','Pegunungan Bintang','Tolikara','Yahukimo','Yalimo'],
 'Papua Barat Daya':['Kota Sorong','Sorong','Sorong Selatan','Raja Ampat','Tambrauw','Maybrat'],
 'Kalimantan Utara':['Bulungan','Malinau','Nunukan','Tana Tidung','Kota Tarakan'],
}
PAPUA=['Jayapura','Kota Jayapura','Keerom','Sarmi','Mamberamo Raya','Biak Numfor','Supiori','Kepulauan Yapen','Waropen']
PB=['Manokwari','Manokwari Selatan','Pegunungan Arfak','Teluk Bintuni','Teluk Wondama','Fakfak','Kaimana']
RENAME={'Jakarta Raya':'DKI Jakarta','Yogyakarta':'DI Yogyakarta','Bangka-Belitung':'Kepulauan Bangka Belitung'}
byname={}
for k,v in SPLIT.items():
    for n in v: byname[n]=k
for n in PAPUA: byname[n]='Papua'
for n in PB: byname[n]='Papua Barat'
groups={}
for f in D:
    n=f['properties']['shapeName']; g=shape(f['geometry']).buffer(0)
    if n=='Danau Toba': continue
    prov=byname.get(n)
    if not prov:
        pt=g.representative_point()
        hit=[pn for pn,pg in P if pt.within(pg)]
        prov=hit[0] if hit else min(P,key=lambda x:x[1].distance(pt))[0]
        prov=RENAME.get(prov,prov)
    groups.setdefault(prov,[]).append(g)
for k in SPLIT: assert k in groups, k
print(len(groups), sorted(groups))
L0,L1,T0=94.6,141.2,6.3; S=1000/(L1-L0)
def proj(x,y): return (round((x-L0)*S,1), round((T0-y)*S,1))
out={}
for k,gs in groups.items():
    u=unary_union(gs).buffer(0).simplify(0.018,preserve_topology=True)
    ps=list(u.geoms) if hasattr(u,'geoms') else [u]
    ps=[p for p in ps if p.geom_type=='Polygon' and p.area>0.0035] or [max(ps,key=lambda p:p.area)]
    d=''
    for p in ps:
        c=[proj(x,y) for x,y in p.exterior.coords]
        d+='M'+'L'.join(f'{a} {b}' for a,b in c)+'Z'
    big=max(ps,key=lambda p:p.area); rp=big.representative_point()
    cx,cy=proj(rp.x,rp.y)
    bx=[proj(*xy) for xy in [(u.bounds[0],u.bounds[3]),(u.bounds[2],u.bounds[1])]]
    out[k]={'d':d,'c':[cx,cy],'b':[bx[0][0],bx[0][1],bx[1][0],bx[1][1]]}
H=round((T0-(-11.2))*S,1)
json.dump({'w':1000,'h':H,'p':out},open(os.path.join(os.path.dirname(__file__),'..','src','atlas','indonesia.json'),'w'),separators=(',',':'))
print('H',H,'KB',os.path.getsize(os.path.join(os.path.dirname(__file__),'..','src','atlas','indonesia.json'))//1024)
