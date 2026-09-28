"use client";

import dynamic from "next/dynamic";
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
      <CylindricalSurfacePreview
        artworkUrl={artworkUrl}
        view={view}
      />
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
