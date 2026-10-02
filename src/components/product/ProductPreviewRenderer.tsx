"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";
import { sourceStyle } from "@/lib/print-template";
import Cylindrical3DPreview from "@/components/product/Cylindrical3DPreview";

function shapedMaskStyle(template: PrintTemplate): CSSProperties {
  if (template.shape === "circle") {
    return { borderRadius: "50%", overflow: "hidden" };
  }

  if (template.shape === "heart") {
    return {
      clipPath:
        "polygon(50% 92%, 38% 82%, 26% 72%, 15% 60%, 8% 46%, 8% 30%, 15% 17%, 28% 10%, 40% 13%, 50% 25%, 60% 13%, 72% 10%, 85% 17%, 92% 30%, 92% 46%, 85% 60%, 74% 72%, 62% 82%)",
      overflow: "hidden",
    };
  }

  if (template.shape === "custom-mask" && template.maskUrl) {
    return {
      WebkitMaskImage: `url("${template.maskUrl}")`,
      maskImage: `url("${template.maskUrl}")`,
      WebkitMaskSize: "100% 100%",
      maskSize: "100% 100%",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      overflow: "hidden",
    };
  }

  return { overflow: "hidden" };
}

function FlatOrShapedPreview({
  artworkUrl,
  template,
  view,
  priority,
}: {
  artworkUrl: string | null;
  template: PrintTemplate;
  view: MockupView;
  priority: boolean;
}) {
  return (
    <>
      {view.mockupUrl ? (
        <Image
          src={view.mockupUrl}
          alt={view.name}
          fill
          className="object-contain"
          priority={priority}
        />
      ) : null}

      {artworkUrl ? (
        <div
          className="absolute"
          style={{
            left: `${view.printArea.xPct}%`,
            top: `${view.printArea.yPct}%`,
            width: `${view.printArea.widthPct}%`,
            height: `${view.printArea.heightPct}%`,
            transform: `rotate(${view.rotation ?? 0}deg)`,
            transformOrigin: "center",
            ...shapedMaskStyle(template),
          }}
        >
          <div className="relative h-full w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artworkUrl}
              alt="Your design preview"
              className="absolute max-w-none"
              style={{
                ...sourceStyle(view.source),
                objectFit: "fill",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function ProductPreviewRenderer({
  artworkUrl,
  template,
  view,
  priority = false,
}: {
  artworkUrl: string | null;
  template: PrintTemplate;
  view: MockupView;
  priority?: boolean;
}) {
  switch (template.printType) {
    case "cylindrical":
      return artworkUrl ? (
        <Cylindrical3DPreview
          artworkUrl={artworkUrl}
          template={template}
          view={view}
        />
      ) : view.mockupUrl ? (
        <Image
          src={view.mockupUrl}
          alt={view.name}
          fill
          className="object-contain"
          priority={priority}
        />
      ) : null;

    case "shaped":
    case "flat":
    default:
      return (
        <FlatOrShapedPreview
          artworkUrl={artworkUrl}
          template={template}
          view={view}
          priority={priority}
        />
      );
  }
}
