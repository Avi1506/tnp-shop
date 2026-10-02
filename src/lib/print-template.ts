import type {
  CustomizationConfig,
  MockupView,
  PercentBox,
  PrintShape,
  PrintTemplate,
  PrintType,
} from "@/db/schema";

const FULL_SOURCE: PercentBox = { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 };
const DEFAULT_SAFE = { topPct: 3, rightPct: 3, bottomPct: 3, leftPct: 3 };

export function inches(value: number, unit: "in" | "cm"): number {
  return unit === "cm" ? value / 2.54 : value;
}

export function outputPixels(template: PrintTemplate) {
  const widthPx = Math.max(1, Math.round(inches(template.physical.width, template.physical.unit) * template.physical.dpi));
  const heightPx = Math.max(1, Math.round(inches(template.physical.height, template.physical.unit) * template.physical.dpi));
  return { widthPx, heightPx };
}

export function normalizePrintTemplate(
  raw: Partial<PrintTemplate> | string | null | undefined,
  fallback?: {
    mockupImage?: string | null;
    printArea?: PercentBox;
    shape?: PrintShape;
    widthInches?: number;
    heightInches?: number;
  }
): PrintTemplate {
  const source: Partial<PrintTemplate> | null | undefined =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Partial<PrintTemplate>;
          } catch {
            return null;
          }
        })()
      : raw;

  const legacyWidth = source?.widthInches ?? fallback?.widthInches ?? 8;
  const legacyHeight = source?.heightInches ?? fallback?.heightInches ?? 8;
  const shape = source?.shape ?? fallback?.shape ?? "rectangle";
  const legacyArea = source?.printAreaOnMockup ?? fallback?.printArea ?? { xPct: 25, yPct: 22, widthPct: 50, heightPct: 45 };
  const legacyMockup = source?.blankMockupUrl ?? fallback?.mockupImage ?? "";

  const physical = source?.physical ?? {
    width: legacyWidth,
    height: legacyHeight,
    unit: "in" as const,
    dpi: 300,
  };

  const printType: PrintType =
    source?.printType ??
    (shape === "heart" || shape === "custom-mask" ? "shaped" : "flat");

  const fallbackView: MockupView = {
    id: "front",
    name: "Front",
    mockupUrl: legacyMockup,
    printArea: legacyArea,
    source: FULL_SOURCE,
  };

  return {
    templateVersion: source?.templateVersion ?? 1,
    printType,
    shape,
    physical: {
      width: Math.max(0.1, Number(physical.width) || legacyWidth),
      height: Math.max(0.1, Number(physical.height) || legacyHeight),
      unit: physical.unit === "cm" ? "cm" : "in",
      dpi: Math.min(600, Math.max(72, Number(physical.dpi) || 300)),
    },
    safeArea: source?.safeArea ?? DEFAULT_SAFE,
    bleed: source?.bleed ?? null,
    maskUrl: source?.maskUrl ?? null,
    views: source?.views?.length ? source.views : [fallbackView],
    cylindrical3d: source?.cylindrical3d ?? null,
    widthInches: source?.widthInches,
    heightInches: source?.heightInches,
    blankMockupUrl: source?.blankMockupUrl,
    printAreaOnMockup: source?.printAreaOnMockup,
  };
}

export function resolveProductTemplate(
  categoryTemplate: PrintTemplate | null | undefined,
  config: CustomizationConfig
): PrintTemplate {
  const hasOverride = Boolean(config.templateOverride);
  const resolved = normalizePrintTemplate(config.templateOverride ?? categoryTemplate, {
    mockupImage: config.mockupImage,
    printArea: config.printArea,
    shape: config.shape,
    widthInches: config.dimensions?.widthInches,
    heightInches: config.dimensions?.heightInches,
  });

  if (!hasOverride && config.mockupImage) {
    resolved.views = resolved.views.map((view) => ({
      ...view,
      mockupUrl: view.mockupUrl || config.mockupImage || "",
    }));
  }

  // Mug previews are intentionally photo-based. Keep the supplied blank mug
  // photography untouched and only calibrate the artwork band on top of it.
  // This is preview-only and never changes the flat print-ready artwork.
  if (
    resolved.printType === "cylindrical" &&
    resolved.cylindrical3d?.modelRef === "procedural:mug-v1"
  ) {
    const photoCalibration: Record<string, {
      printArea: PercentBox;
      curvatureStrength: number;
      perspectiveStrength: number;
      edgeFalloff: number;
      angleDeg: number;
    }> = {
      front: {
        printArea: { xPct: 28.2, yPct: 33.7, widthPct: 43.8, heightPct: 47.2 },
        curvatureStrength: 0.86,
        perspectiveStrength: 0,
        edgeFalloff: 0.18,
        angleDeg: 0,
      },
      left: {
        printArea: { xPct: 28.8, yPct: 33.8, widthPct: 42.8, heightPct: 47 },
        curvatureStrength: 0.9,
        perspectiveStrength: -0.06,
        edgeFalloff: 0.22,
        // Keep the physical end of a 270° print wrap behind the silhouette.
        // ±65° exposes the cut edge; ±42° shows the side without the seam.
        angleDeg: -42,
      },
      right: {
        printArea: { xPct: 29, yPct: 35, widthPct: 42, heightPct: 44 },
        curvatureStrength: 0.9,
        perspectiveStrength: 0.06,
        edgeFalloff: 0.22,
        angleDeg: 42,
      },
    };

    const mugMockups: Record<string, string> = {
      // Use the supplied real mug photos. Front/right keep the handle visible,
      // matching the physical-product reference instead of a handle-less cylinder.
      front: "/images/mockups/mug-left.jpg",
      left: "/images/mockups/mug-handle-left.jpg",
      right: "/images/mockups/mug-left.jpg",
    };

    resolved.views = resolved.views.map((view) => {
      const calibration = photoCalibration[view.id];
      return calibration
        ? {
            ...view,
            ...calibration,
            mockupUrl: mugMockups[view.id] ?? view.mockupUrl,
            blendMode: "normal" as const,
          }
        : view;
    });
  }

  return resolved;
}

export function bumpTemplateVersion(template: PrintTemplate): PrintTemplate {
  return { ...template, templateVersion: Math.max(1, template.templateVersion) + 1 };
}

export function sourceStyle(source: PercentBox) {
  const widthScale = 10000 / Math.max(1, source.widthPct);
  const heightScale = 10000 / Math.max(1, source.heightPct);
  return {
    width: `${widthScale}%`,
    height: `${heightScale}%`,
    left: `${-(source.xPct / Math.max(1, source.widthPct)) * 100}%`,
    top: `${-(source.yPct / Math.max(1, source.heightPct)) * 100}%`,
  };
}

export function defaultViews(printType: PrintType, mockupUrl = "", area?: PercentBox): MockupView[] {
  const printArea = area ?? { xPct: 28, yPct: 28, widthPct: 44, heightPct: 52 };
  if (printType !== "cylindrical") {
    return [{ id: "front", name: "Front", mockupUrl, printArea, source: FULL_SOURCE }];
  }

  return [
    {
      id: "front",
      name: "Front",
      mockupUrl,
      printArea,
      source: { xPct: 22.5, yPct: 0, widthPct: 55, heightPct: 100 },
      curvatureStrength: 1,
      perspectiveStrength: 0,
      edgeFalloff: 0.34,
      blendMode: "multiply",
      angleDeg: 0,
    },
    {
      id: "left",
      name: "Left",
      mockupUrl,
      printArea,
      source: { xPct: 0, yPct: 0, widthPct: 55, heightPct: 100 },
      curvatureStrength: 1,
      perspectiveStrength: -0.12,
      edgeFalloff: 0.38,
      blendMode: "multiply",
      angleDeg: -42,
    },
    {
      id: "right",
      name: "Right",
      mockupUrl,
      printArea,
      source: { xPct: 45, yPct: 0, widthPct: 55, heightPct: 100 },
      curvatureStrength: 1,
      perspectiveStrength: 0.12,
      edgeFalloff: 0.38,
      blendMode: "multiply",
      angleDeg: 42,
    },
  ];
}
