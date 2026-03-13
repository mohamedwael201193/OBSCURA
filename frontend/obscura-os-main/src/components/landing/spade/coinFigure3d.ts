/** 3D coin geometry for topographic wireframe rendering (Spade-style) */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export const COIN = {
  radius: 1,
  height: 0.44,
  notchDepth: 0.26,
  notchWidth: 0.32,
};

const NOTCH_ANGLES = [0.15, 1.28, 2.48, 3.68, 4.88];
const FOCAL = 4.8;

function normAngle(a: number): number {
  let v = a % (Math.PI * 2);
  if (v < 0) v += Math.PI * 2;
  return v;
}

export function radiusAtAngle(theta: number): number {
  const { radius, notchDepth, notchWidth } = COIN;
  for (const center of NOTCH_ANGLES) {
    let d = Math.abs(normAngle(theta - center));
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < notchWidth) {
      const t = 1 - d / notchWidth;
      return radius * (1 - notchDepth * t * t);
    }
  }
  return radius;
}

/** True if point is inside the carved dollar on the top face */
export function inDollarCarve(x: number, z: number, y: number): boolean {
  const { height } = COIN;
  const topT = (y + height / 2) / height;
  if (topT < 0.5) return false;

  const fade = Math.min(1, (topT - 0.5) / 0.5);
  const sx = x / fade;
  const sz = z / fade;
  const ax = Math.abs(sx);
  const az = Math.abs(sz);

  // Spine
  if (ax < 0.075 && az < 0.58) return true;

  // Crossbar
  if (az < 0.055 && ax < 0.4 && ax > 0.04) return true;

  // Top S-curve
  if (sz > -0.02 && sz < 0.34) {
    const cx = sx >= 0 ? 0.32 : -0.32;
    const d = Math.hypot(sx - cx, sz - 0.15);
    if (d > 0.13 && d < 0.27 && ax > 0.06) return true;
  }

  // Bottom S-curve
  if (sz > -0.36 && sz < 0.06) {
    const cx = sx >= 0 ? -0.32 : 0.32;
    const d = Math.hypot(sx - cx, sz + 0.13);
    if (d > 0.13 && d < 0.27 && ax > 0.06) return true;
  }

  return false;
}

export function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

export function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

export function project(p: Vec3): Vec2 {
  const s = FOCAL / (FOCAL + p.z);
  return { x: p.x * s, y: p.y * s };
}

export function transformPoint(
  x: number,
  y: number,
  z: number,
  rotX: number,
  rotY: number,
  floatY: number,
): { screen: Vec2; depth: number } {
  let p: Vec3 = { x, y, z };
  p = rotateX(p, rotX);
  p = rotateY(p, rotY);
  p = { x: p.x, y: p.y + floatY, z: p.z };
  return { screen: project(p), depth: p.z };
}

export interface SliceLine {
  sy: number;
  x1: number;
  x2: number;
  depth: number;
  alpha: number;
}

interface ScreenPoint {
  sx: number;
  sy: number;
  depth: number;
  angle: number;
}

/**
 * Build horizontal contour lines for one Y slice.
 * Top slices split around the $ carve to create the embossed cutout look.
 */
export function buildSliceLines(
  sliceY: number,
  rotX: number,
  rotY: number,
  floatY: number,
  segments = 140,
): SliceLine[] {
  const points: ScreenPoint[] = [];

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = radiusAtAngle(theta);
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    if (inDollarCarve(x, z, sliceY)) continue;

    const { screen, depth } = transformPoint(x, sliceY, z, rotX, rotY, floatY);
    points.push({ sx: screen.x, sy: screen.y, depth, angle: theta });
  }

  if (points.length < 8) return [];

  points.sort((a, b) => a.angle - b.angle);

  const { height } = COIN;
  const layerT = (sliceY + height / 2) / height;
  const alpha = 0.3 + layerT * 0.55;

  // Group contiguous screen-Y rows into one horizontal segment
  const sy = points.reduce((s, p) => s + p.sy, 0) / points.length;
  const depth = points.reduce((s, p) => s + p.depth, 0) / points.length;
  const xMin = Math.min(...points.map((p) => p.sx));
  const xMax = Math.max(...points.map((p) => p.sx));

  const lines: SliceLine[] = [{ sy, x1: xMin, x2: xMax, depth, alpha }];

  // Split line around dollar gap on upper slices
  const topT = (sliceY + height / 2) / height;
  if (topT > 0.55) {
    const gapPoints: number[] = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = radiusAtAngle(theta) * 0.92;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      if (inDollarCarve(x, z, sliceY)) {
        const { screen } = transformPoint(x, sliceY, z, rotX, rotY, floatY);
        gapPoints.push(screen.x);
      }
    }

    if (gapPoints.length > 0) {
      const gx1 = Math.min(...gapPoints);
      const gx2 = Math.max(...gapPoints);
      lines.length = 0;
      if (xMin < gx1 - 0.01) {
        lines.push({ sy, x1: xMin, x2: gx1, depth, alpha });
      }
      if (gx2 < xMax - 0.01) {
        lines.push({ sy, x1: gx2, x2: xMax, depth, alpha });
      }
    }
  }

  return lines;
}

/** Extra interior lines tracing the $ symbol on upper slices */
export function buildDollarInteriorLines(
  sliceY: number,
  rotX: number,
  rotY: number,
  floatY: number,
): SliceLine[] {
  const { height } = COIN;
  const topT = (sliceY + height / 2) / height;
  if (topT < 0.72) return [];

  const lines: SliceLine[] = [];
  const alpha = 0.65 + topT * 0.2;

  // Sample horizontal spans inside the $ at this slice height
  const spans = [
    { z: 0, x1: -0.07, x2: 0.07 },
    { z: 0.12, x1: -0.35, x2: 0.35 },
    { z: -0.12, x1: -0.35, x2: 0.35 },
    { z: 0.28, x1: 0.05, x2: 0.38 },
    { z: 0.28, x1: -0.38, x2: -0.05 },
    { z: -0.28, x1: 0.05, x2: 0.38 },
    { z: -0.28, x1: -0.38, x2: -0.05 },
  ];

  for (const span of spans) {
    const yOff = (sliceY - height * 0.18) * 0.3;
    if (Math.abs(yOff) > 0.06) continue;

    const p1 = transformPoint(span.x1, sliceY, span.z, rotX, rotY, floatY);
    const p2 = transformPoint(span.x2, sliceY, span.z, rotX, rotY, floatY);

    lines.push({
      sy: (p1.screen.y + p2.screen.y) / 2,
      x1: p1.screen.x,
      x2: p2.screen.x,
      depth: (p1.depth + p2.depth) / 2,
      alpha,
    });
  }

  return lines;
}
