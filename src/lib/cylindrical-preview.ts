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
  const t = clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1
  );
  return t * t * (3 - 2 * t);
}

export function buildCylindricalSlices(
  options: CylindricalMappingOptions = {}
): CylindricalSlice[] {
  const curvature = clamp(options.curvatureStrength ?? 1, 0, 1.5);
  const perspective = clamp(options.perspectiveStrength ?? 0, -1, 1);
  const edgeFalloff = clamp(options.edgeFalloff ?? 0.32, 0, 1);
  const sliceCount = Math.round(clamp(options.sliceCount ?? 160, 64, 240));

  const maxTheta =
    curvature < 0.01
      ? 0
      : Math.min(
          Math.PI * 0.493,
          Math.max(Math.PI * 0.39, curvature * (Math.PI / 2) * 0.98)
        );
  const denom = Math.sin(maxTheta || 1);

  const project = (u: number) => {
    if (maxTheta < 0.001) return u;
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

    const perspectiveShift = perspective * side * 0.04;
    const perspectiveCompression =
      Math.pow(sideAbs, 1.5) * Math.abs(perspective) * 0.045;

    // Keep the print height nearly constant like a real cylinder. Only angled
    // views get a small vertical perspective compression.
    const destHeight = Math.max(0.9, 1 - perspectiveCompression);
    const destTop = (1 - destHeight) / 2 + perspectiveShift;

    // Make the artwork visibly turn away at the cylinder edges. This removes
    // the hard rectangular "sticker" edge while preserving the flat wrap data.
    const edgeFade = smoothstep(0.62, 1, sideAbs);
    const alpha = clamp(
      1 - (0.72 + edgeFalloff * 0.25) * edgeFade,
      0.08,
      1
    );

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
