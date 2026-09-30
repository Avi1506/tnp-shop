"use client";

import Image from "next/image";
import type { MockupView } from "@/db/schema";
import CylindricalSurfacePreview from "@/components/product/CylindricalSurfacePreview";

export default function CylindricalPhotoPreview({
  artworkUrl,
  view,
  priority = false,
}: {
  artworkUrl: string | null;
  view: MockupView;
  priority?: boolean;
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
          <CylindricalSurfacePreview artworkUrl={artworkUrl} view={view} />
        </div>
      ) : null}
    </>
  );
}
