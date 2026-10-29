import React, { createContext, useContext, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useT } from "./voice";
import { CamInfo, CamKey, cameraFor, K, LL, MapData, Poly, Ring, TH, world } from "./map";
import { C, clamp, lerp, ss } from "./tokens";

/**
 * Lempeng peta Atlasnusia: peta gading bergaya peta jalan (jalan emas, batas provinsi & kabupaten putus-putus),
 * tebal TH, tepi emas menyala, di atas lantai gelap bergaris lintang-bujur asli. Provinsi fokus bisa terangkat,
 * daratan lain bisa diredupkan, dan peta muncul lewat sapuan dari satu ujung ke ujung lain.
 *
 * Semua dihitung dari waktu desain (useT), jadi kamera, lempeng, dan overlay 2D selalu sinkron.
 */
export type MapLook = {
  camera: CamKey[];
  /** sapuan muncul: dari titik a ke b, selesai di detik t1 */
  sweep: { a: LL; b: LL; t0: number; t1: number };
  /** tinggi angkat provinsi fokus (satuan dunia, ±1.1) */
  lift: (t: number) => number;
  /** redupkan daratan non-fokus 0..1 */
  dim: (t: number) => number;
  /** kotak detail tajam (lon0, lon1, lat0, lat1), di sekitar lokasi zoom */
  detail: [number, number, number, number];
};

type Ctx = { data: MapData; look: MapLook; t: number; cam: CamInfo; lift: number };
const MapCtx = createContext<Ctx | null>(null);
export const useMap = () => {
  const c = useContext(MapCtx);
  if (!c) throw new Error("useMap harus di dalam <MapWorld>");
  return c;
};

export const MapWorld: React.FC<{ data: MapData; look: MapLook; children?: React.ReactNode }> = ({ data, look, children }) => {
  const t = useT();
  const cam = cameraFor(look.camera, t, data.cen);
  const lift = look.lift(t);
  const value = { data, look, t, cam, lift };
  return (
    <MapCtx.Provider value={value}>
      <MapCanvas />
      {children}
    </MapCtx.Provider>
  );
};

/* ------------------------------------------------------------------ */

function sheet(data: MapData, box: [number, number, number, number], ppd: number, scale: number) {
  const [lon0, lon1, lat0, lat1] = box;
  const cv = document.createElement("canvas");
  cv.width = Math.round((lon1 - lon0) * ppd);
  cv.height = Math.round((lat1 - lat0) * ppd);
  const c = cv.getContext("2d")!;
  const X = (lo: number) => (lo - lon0) * ppd,
    Y = (la: number) => (lat1 - la) * ppd;
  c.fillStyle = C.paper;
  c.fillRect(0, 0, cv.width, cv.height);
  c.lineJoin = "round";
  c.lineCap = "round";
  const stroke = (lines: Ring[], w: number, col: string, dash: number[] = []) => {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.setLineDash(dash);
    c.beginPath();
    lines.forEach((l) => l.forEach(([lo, la], i) => (i ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la)))));
    c.stroke();
  };
  stroke(data.regLines, 1.3 * scale, "#beb196", [5 * scale, 4 * scale]);
  stroke(data.provLines, 4.4 * scale, "#fbf8f1");
  stroke(data.provLines, 2.0 * scale, "#8f7d5c", [10 * scale, 6 * scale]);
  const minor = data.roads.filter((r) => !r[0]).map((r) => r[1]),
    major = data.roads.filter((r) => r[0]).map((r) => r[1]);
  stroke(minor, 5 * scale, "#d6bf96");
  stroke(major, 7 * scale, "#b98f4b");
  stroke(minor, 3 * scale, "#faf1dc");
  stroke(major, 4.4 * scale, "#e8cf93");
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

function build(data: MapData, look: MapLook, canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1080, 1920, false);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.onyx);
  const [C0, C1] = data.cen;
  const W = world(data.cen);
  const [LON0, LON1, LAT0, LAT1] = data.bbox;

  const { a, b } = look.sweep;
  const dir = W(b[0], b[1]).sub(W(a[0], a[1])).setY(0).normalize();
  const sweepFrom = W(a[0], a[1]).dot(dir) - 4,
    sweepTo = W(b[0], b[1]).dot(dir) + 4;
  const clip = new THREE.Plane(dir.clone().negate(), sweepTo);
  const clips = [clip];

  // lantai: graticule lintang-bujur asli, garis 1° + silang emas, garis tipis tiap 0,25°
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uC: { value: new THREE.Vector3() }, uR: { value: 120 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW; uniform vec3 uC; uniform float uR;
      float ln(vec2 p, float s){ vec2 g = abs(fract(p/s-0.5)-0.5)/fwidth(p/s); return 1.0 - min(min(g.x,g.y),1.0); }
      void main(){
        vec2 d = vec2(vW.x/${K}.0 + ${C0.toFixed(4)}, -vW.z/${K}.0 + ${C1.toFixed(4)});
        float major = ln(d, 1.0), minor = ln(d, 0.25);
        vec2 q = abs(fract(d-0.5)-0.5);
        float cross = (1.0 - smoothstep(0.004, 0.012, min(q.x,q.y))) * (1.0 - smoothstep(0.05, 0.08, max(q.x,q.y)));
        float fade = 1.0 - smoothstep(uR*0.2, uR, distance(vW.xz, uC.xz));
        float al = (major*0.16 + minor*0.05 + cross*0.85) * fade;
        gl_FragColor = vec4(vec3(0.85,0.71,0.47), al);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -1.4;
  scene.add(grid);

  const texA = sheet(data, data.bbox, 220, 1.0),
    texB = sheet(data, look.detail, 1000, 1.6);
  const DB = look.detail;
  const mapMat = () =>
    new THREE.ShaderMaterial({
      clipping: true,
      clippingPlanes: clips,
      uniforms: {
        uA: { value: texA },
        uB: { value: texB },
        uDim: { value: 0 },
        uBoxA: { value: new THREE.Vector4(LON0, LON1, LAT0, LAT1) },
        uBoxB: { value: new THREE.Vector4(DB[0], DB[1], DB[2], DB[3]) },
      },
      vertexShader: `#include <clipping_planes_pars_vertex>
        varying vec3 vW;
        void main(){ vec4 mvPosition = modelViewMatrix*vec4(position,1.); vW=(modelMatrix*vec4(position,1.)).xyz;
          gl_Position = projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: `#include <clipping_planes_pars_fragment>
        uniform sampler2D uA, uB; uniform vec4 uBoxA, uBoxB; uniform float uDim; varying vec3 vW;
        void main(){
          #include <clipping_planes_fragment>
          float lon = vW.x/${K}.0 + ${C0.toFixed(4)}, lat = -vW.z/${K}.0 + ${C1.toFixed(4)};
          vec2 a = vec2((lon-uBoxA.x)/(uBoxA.y-uBoxA.x), (lat-uBoxA.z)/(uBoxA.w-uBoxA.z));
          vec2 b = vec2((lon-uBoxB.x)/(uBoxB.y-uBoxB.x), (lat-uBoxB.z)/(uBoxB.w-uBoxB.z));
          vec3 col = texture2D(uA, a).rgb;
          float e = min(min(b.x,1.-b.x), min(b.y,1.-b.y));
          col = mix(col, texture2D(uB, b).rgb, smoothstep(0.0, 0.04, e));
          col = mix(col, vec3(0.17,0.155,0.13), uDim);
          gl_FragColor = vec4(col,1.);
        }`,
    });

  const toShapes = (polys: Poly[]) =>
    polys.map((rings) => {
      const sh = new THREE.Shape(rings[0].map(([lo, la]) => new THREE.Vector2((lo - C0) * K, (la - C1) * K)));
      rings.slice(1).forEach((r) => sh.holes.push(new THREE.Path(r.map(([lo, la]) => new THREE.Vector2((lo - C0) * K, (la - C1) * K)))));
      return sh;
    });
  const slab = (polys: Poly[], depth: number) => {
    const g = new THREE.ExtrudeGeometry(toShapes(polys), { depth, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    return g;
  };
  const lineGeo = (lines: Ring[], y: number) => {
    const arr: number[] = [];
    lines.forEach((l) => {
      for (let i = 0; i < l.length - 1; i++) {
        const p = W(l[i][0], l[i][1], y),
          q = W(l[i + 1][0], l[i + 1][1], y);
        arr.push(p.x, p.y, p.z, q.x, q.y, q.z);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    return g;
  };
  const rings = (polys: Poly[]) => polys.flatMap((r) => r);
  const side = (c: string) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92, clippingPlanes: clips });
  const lm = (c: string, o: number) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, clippingPlanes: clips });

  const topRest = mapMat(),
    topFocus = mapMat();
  scene.add(new THREE.Mesh(slab(data.rest, TH), [topRest, side("#a8834a")]));
  scene.add(new THREE.Mesh(slab(data.others, TH * 0.6), [new THREE.MeshBasicMaterial({ color: "#1b1915", clippingPlanes: clips }), side("#3c3324")]));
  const focusG = new THREE.Group();
  scene.add(focusG);
  focusG.add(new THREE.Mesh(slab(data.focus, TH), [topFocus, side("#c49b58")]));
  if (data.water.length) {
    const water = data.water.map((p) => [p[0], ...p.slice(1).filter((r) => r.length > 60)]);
    focusG.add(new THREE.Mesh(slab(water, TH - 0.07), [new THREE.MeshBasicMaterial({ color: C.water, clippingPlanes: clips }), side("#7fa29d")]));
  }
  const coast = lm("#f3dfae", 0.95);
  scene.add(new THREE.LineSegments(lineGeo(rings(data.rest), TH + 0.01), coast));
  focusG.add(new THREE.LineSegments(lineGeo(rings(data.focus).concat(rings(data.water)), TH + 0.01), coast));
  scene.add(new THREE.LineSegments(lineGeo(rings(data.others), TH * 0.6 + 0.01), lm("#6b5a3c", 0.6)));

  return { renderer, scene, clip, sweepFrom, sweepTo, gridMat, topRest, topFocus, focusG };
}

const MapCanvas: React.FC = () => {
  const { data, look, t, cam, lift } = useMap();
  const ref = useRef<HTMLCanvasElement>(null);
  const S = useRef<ReturnType<typeof build> | null>(null);
  // dibangun sekali per data/look
  useLayoutEffect(() => {
    if (!ref.current) return;
    S.current = build(data, look, ref.current);
    return () => {
      S.current?.renderer.dispose();
      S.current = null;
    };
  }, [data, look]);
  useLayoutEffect(() => {
    const s = S.current;
    if (!s) return;
    const { t0, t1 } = look.sweep;
    s.clip.constant = lerp(s.sweepFrom, s.sweepTo, ss(clamp((t - t0) / (t1 - t0))));
    s.focusG.position.y = lift;
    s.topRest.uniforms.uDim.value = look.dim(t);
    s.gridMat.uniforms.uC.value.copy(cam.tgt);
    s.gridMat.uniforms.uR.value = cam.dist * 1.7;
    s.renderer.render(s.scene, cam.cam);
  });
  return <canvas ref={ref} width={1080} height={1920} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />;
};
