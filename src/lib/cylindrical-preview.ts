import type { MockupView } from "@/db/schema";

export type CylindricalSlice = {
  sourceStart: number;
  sourceEnd: number;
  destStart: number;
  destEnd: number;
  destTop: number;
  destHeight: number;
  alpha: number;
};

export type CylindricalMappingOptions = {
  curvatureStrength?: number;
  perspectiveStrength?: number;
  edgeFalloff?: number;
  sliceCount?: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Maps an unwarped horizontal artwork window onto a projected cylinder.
 *
 * Source positions remain linear because the full flat wrap is the single
 * source of truth. Destination positions use a sine projection so the center
 * stays visually broad while the far edges compress as they curve away.
 */
export function buildCylindricalSlices(
  options: CylindricalMappingOptions = {}
): CylindricalSlice[] {
  const curvature = clamp(options.curvatureStrength ?? 1, 0, 1.5);
  const perspective = clamp(options.perspectiveStrength ?? 0, -1, 1);
  const edgeFalloff = clamp(options.edgeFalloff ?? 0.32, 0, 1);
  const sliceCount = Math.round(clamp(options.sliceCount ?? 96, 24, 180));

  // 1.0 maps to roughly +/-83deg of the visible cylinder. Staying below 90deg
  // avoids zero-width edge slices while still producing convincing wrap-away.
  const maxTheta = curvature * (Math.PI / 2) * 0.92;
  const denom = Math.sin(maxTheta);

  const project = (u: number) => {
    if (curvature < 0.001 || Math.abs(denom) < 0.0001) return u;
    const theta = (u - 0.5) * 2 * maxTheta;
    return (Math.sin(theta) / denom + 1) / 2;
  };

  const slices: CylindricalSlice[] = [];

  for (let index = 0; index < sliceCount; index += 1) {
    const sourceStart = index / sliceCount;
    const sourceEnd = (index + 1) / sliceCount;
    const center = (sourceStart + sourceEnd) / 2;
    const side = (center - 0.5) * 2;
    const sideAbs = Math.abs(side);

    const destStart = project(sourceStart);
    const destEnd = project(sourceEnd);

    // Perspective is intentionally preview-only. It lets an angled mockup
    // shift the projected band without changing the underlying flat artwork.
    const perspectiveShift = perspective * side * 0.055;
    const perspectiveCompression = sideAbs * Math.abs(perspective) * 0.06;
    const curvatureCompression = sideAbs * curvature * 0.012;
    const destHeight = Math.max(
      0.82,
      1 - perspectiveCompression - curvatureCompression
    );
    const destTop = (1 - destHeight) / 2 + perspectiveShift;

    const edgeFade = smoothstep(0.58, 1, sideAbs);
    const alpha = clamp(1 - edgeFalloff * edgeFade, 0.08, 1);

    slices.push({
      sourceStart,
      sourceEnd,
      destStart,
      destEnd,
      destTop,
      destHeight,
      alpha,
    });
  }

  return slices;
}

export function cylindricalViewSettings(view: MockupView) {
  return {
    curvatureStrength: clamp(view.curvatureStrength ?? 1, 0, 1.5),
    perspectiveStrength: clamp(
      view.perspectiveStrength ?? view.transform?.perspective ?? 0,
      -1,
      1
    ),
    edgeFalloff: clamp(view.edgeFalloff ?? 0.32, 0, 1),
    blendMode: view.blendMode ?? "multiply",
  } as const;
}
