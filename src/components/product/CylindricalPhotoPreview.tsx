"use client";

import Image from "next/image";
import type { MockupView } from "@/db/schema";
import CylindricalSurfacePreview from "@/components/product/CylindricalSurfacePreview";

function resolvedMockupUrl(view: MockupView) {
  // The supplied no-handle photograph is useful as a rear/side view, but it
  // makes the primary customer preview read like a plain cylinder. Keep the
  // exact supplied photo assets and use the handle-right shot for Front.
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
  priority = false,
}: {
  artworkUrl: string | null;
  view: MockupView;
  priority?: boolean;
}) {
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
          <CylindricalSurfacePreview artworkUrl={artworkUrl} view={view} />
        </div>
      ) : null}
    </>
  );
}
