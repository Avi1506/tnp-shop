"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type { MockupView, PrintTemplate } from "@/db/schema";
import CylindricalSurfacePreview from "@/components/product/CylindricalSurfacePreview";
import CylindricalTextureLayer from "@/components/product/CylindricalTextureLayer";

function resolvedMockupUrl(view: MockupView) {
  if (
    view.id === "front" &&
    /\/images\/mockups\/mug-front\.jpg$/i.test(view.mockupUrl)
  ) {
    return "/images/mockups/mug-left.jpg";
  }
  return view.mockupUrl;
}

export default function CylindricalPhotoPreview({
  artworkUrl,
  view,
  template,
  priority = false,
  trueCylinder = false,
}: {
  artworkUrl: string | null;
  view: MockupView;
  template?: PrintTemplate;
  priority?: boolean;
  trueCylinder?: boolean;
}) {
  const [fallback, setFallback] = useState(false);
  const useFallback = useCallback(() => setFallback(true), []);
  const mockupUrl = resolvedMockupUrl(view);

  return (
    <>
      {mockupUrl ? (
        <Image
          src={mockupUrl}
          alt={view.name}
          fill
          className="object-contain"
          priority={priority}
        />
      ) : null}

      {artworkUrl ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${view.printArea.xPct}%`,
            top: `${view.printArea.yPct}%`,
            width: `${view.printArea.widthPct}%`,
            height: `${view.printArea.heightPct}%`,
            transform: `rotate(${view.rotation ?? 0}deg)`,
            transformOrigin: "center",
          }}
        >
          {trueCylinder && template && !fallback ? (
            <CylindricalTextureLayer
              artworkUrl={artworkUrl}
              template={template}
              view={view}
              onUnavailable={useFallback}
            />
          ) : (
            <CylindricalSurfacePreview artworkUrl={artworkUrl} view={view} />
          )}
        </div>
      ) : null}
    </>
  );
}
