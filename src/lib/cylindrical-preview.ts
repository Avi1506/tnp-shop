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
  const sliceCount = Math.round(clamp(options.sliceCount ?? 128, 48, 220));

  const maxTheta = Math.min(
    Math.PI * 0.475,
    Math.max(0.001, curvature) * (Math.PI / 2) * 0.98
  );
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

    const perspectiveShift = perspective * side * 0.045;
    const perspectiveCompression =
      Math.pow(sideAbs, 1.35) * Math.abs(perspective) * 0.055;
    const cylindricalCompression =
      Math.pow(sideAbs, 1.7) * Math.min(1.25, curvature) * 0.085;

    const destHeight = Math.max(
      0.82,
      1 - perspectiveCompression - cylindricalCompression
    );
    const destTop = (1 - destHeight) / 2 + perspectiveShift;

    const edgeFade = smoothstep(0.52, 1, sideAbs);
    const alpha = clamp(
      1 - (edgeFalloff + Math.min(0.16, curvature * 0.12)) * edgeFade,
      0.55,
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
