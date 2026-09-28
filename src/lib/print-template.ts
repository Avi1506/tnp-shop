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
  raw: Partial<PrintTemplate> | null | undefined,
  fallback?: {
    mockupImage?: string | null;
    printArea?: PercentBox;
    shape?: PrintShape;
    widthInches?: number;
    heightInches?: number;
  }
): PrintTemplate {
  const legacyWidth = raw?.widthInches ?? fallback?.widthInches ?? 8;
  const legacyHeight = raw?.heightInches ?? fallback?.heightInches ?? 8;
  const shape = raw?.shape ?? fallback?.shape ?? "rectangle";
  const legacyArea = raw?.printAreaOnMockup ?? fallback?.printArea ?? { xPct: 25, yPct: 22, widthPct: 50, heightPct: 45 };
  const legacyMockup = raw?.blankMockupUrl ?? fallback?.mockupImage ?? "";

  const physical = raw?.physical ?? {
    width: legacyWidth,
    height: legacyHeight,
    unit: "in" as const,
    dpi: 300,
  };

  const printType: PrintType =
    raw?.printType ??
    (shape === "heart" || shape === "custom-mask" ? "shaped" : "flat");

  const fallbackView: MockupView = {
    id: "front",
    name: "Front",
    mockupUrl: legacyMockup,
    printArea: legacyArea,
    source: FULL_SOURCE,
  };

  return {
    templateVersion: raw?.templateVersion ?? 1,
    printType,
    shape,
    physical: {
      width: Math.max(0.1, Number(physical.width) || legacyWidth),
      height: Math.max(0.1, Number(physical.height) || legacyHeight),
      unit: physical.unit === "cm" ? "cm" : "in",
      dpi: Math.min(600, Math.max(72, Number(physical.dpi) || 300)),
    },
    safeArea: raw?.safeArea ?? DEFAULT_SAFE,
    bleed: raw?.bleed ?? null,
    maskUrl: raw?.maskUrl ?? null,
    views: raw?.views?.length ? raw.views : [fallbackView],
    widthInches: raw?.widthInches,
    heightInches: raw?.heightInches,
    blankMockupUrl: raw?.blankMockupUrl,
    printAreaOnMockup: raw?.printAreaOnMockup,
  };
}

export function resolveProductTemplate(
  categoryTemplate: PrintTemplate | null | undefined,
  config: CustomizationConfig
): PrintTemplate {
  return normalizePrintTemplate(config.templateOverride ?? categoryTemplate, {
    mockupImage: config.mockupImage,
    printArea: config.printArea,
    shape: config.shape,
    widthInches: config.dimensions?.widthInches,
    heightInches: config.dimensions?.heightInches,
  });
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
      source: { xPct: 33.333, yPct: 0, widthPct: 33.334, heightPct: 100 },
    },
    {
      id: "left",
      name: "Left",
      mockupUrl,
      printArea,
      source: { xPct: 0, yPct: 0, widthPct: 33.334, heightPct: 100 },
    },
    {
      id: "right",
      name: "Right",
      mockupUrl,
      printArea,
      source: { xPct: 66.666, yPct: 0, widthPct: 33.334, heightPct: 100 },
    },
  ];
}
