"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useState } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";
import CylindricalSurfacePreview from "@/components/product/CylindricalSurfacePreview";

const Cylindrical3DScene = dynamic(
  () => import("@/components/product/Cylindrical3DScene"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-xs text-navy/45">
        Loading 3D preview…
      </div>
    ),
  }
);

export default function Cylindrical3DPreview({
  artworkUrl,
  template,
  view,
}: {
  artworkUrl: string;
  template: PrintTemplate;
  view: MockupView;
}) {
  const [fallback, setFallback] = useState(false);
  const useFallback = useCallback(() => setFallback(true), []);

  if (!template.cylindrical3d || fallback) {
    return (
      <>
        {view.mockupUrl ? (
          <Image src={view.mockupUrl} alt={view.name} fill className="object-contain" />
        ) : null}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${view.printArea.xPct}%`,
            top: `${view.printArea.yPct}%`,
            width: `${view.printArea.widthPct}%`,
            height: `${view.printArea.heightPct}%`,
            transform: `rotate(${view.rotation ?? 0}deg)`,
          }}
        >
          <CylindricalSurfacePreview
            artworkUrl={artworkUrl}
            view={view}
            wrapCoverageDeg={template.cylindrical3d?.wrapCoverageDeg ?? 270}
          />
        </div>
        <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-1 text-[9px] text-navy/65">
          2D preview · 3D unavailable
        </span>
      </>
    );
  }

  return (
    <Cylindrical3DScene
      artworkUrl={artworkUrl}
      template={template}
      view={view}
      onUnavailable={useFallback}
    />
  );
}
