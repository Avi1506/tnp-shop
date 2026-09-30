"use client";

import { useState } from "react";
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
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const mockupUrl = resolvedMockupUrl(view);
  const useTrueCylinder =
    trueCylinder &&
    Boolean(template?.cylindrical3d) &&
    !webglUnavailable;

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
          {useTrueCylinder && template ? (
            <CylindricalTextureLayer
              artworkUrl={artworkUrl}
              template={template}
              view={view}
              onUnavailable={() => setWebglUnavailable(true)}
            />
          ) : (
            <CylindricalSurfacePreview artworkUrl={artworkUrl} view={view} />
          )}
        </div>
      ) : null}
    </>
  );
}
