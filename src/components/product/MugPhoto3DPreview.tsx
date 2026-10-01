"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import type { MockupView, PrintTemplate } from "@/db/schema";
import CylindricalPhotoPreview from "@/components/product/CylindricalPhotoPreview";
import MugArtwork3DLayer from "@/components/product/MugArtwork3DLayer";

export default function MugPhoto3DPreview({
  artworkUrl,
  template,
  view,
  priority = false,
}: {
  artworkUrl: string;
  template: PrintTemplate;
  view: MockupView;
  priority?: boolean;
}) {
  const [fallback, setFallback] = useState(false);
  const useFallback = useCallback(() => setFallback(true), []);

  if (fallback) {
    return (
      <CylindricalPhotoPreview
        artworkUrl={artworkUrl}
        view={view}
        template={template}
        priority={priority}
      />
    );
  }

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

      <div
        className="absolute"
        style={{
          left: `${view.printArea.xPct}%`,
          top: `${view.printArea.yPct}%`,
          width: `${view.printArea.widthPct}%`,
          height: `${view.printArea.heightPct}%`,
        }}
      >
        <MugArtwork3DLayer
          artworkUrl={artworkUrl}
          template={template}
          view={view}
          onUnavailable={useFallback}
        />
      </div>
    </>
  );
}
