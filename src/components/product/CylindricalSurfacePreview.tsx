"use client";

import { useEffect, useRef } from "react";
import type { MockupView } from "@/db/schema";
import {
  buildCylindricalSlices,
  cylindricalViewSettings,
} from "@/lib/cylindrical-preview";

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Could not load preview image: ${url}`));
    image.src = url;
  });
}

export default function CylindricalSurfacePreview({
  artworkUrl,
  view,
}: {
  artworkUrl: string;
  view: MockupView;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let artwork: HTMLImageElement | null = null;
    let mask: HTMLImageElement | null = null;

    const render = () => {
      if (cancelled || !artwork) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const sourceX = (artwork.width * view.source.xPct) / 100;
      const sourceY = (artwork.height * view.source.yPct) / 100;
      const sourceWidth = (artwork.width * view.source.widthPct) / 100;
      const sourceHeight = (artwork.height * view.source.heightPct) / 100;
      const settings = cylindricalViewSettings(view);
      const slices = buildCylindricalSlices(settings);

      context.save();
      context.beginPath();
      context.rect(0, 0, rect.width, rect.height);
      context.clip();

      for (const slice of slices) {
        const sx = sourceX + sourceWidth * slice.sourceStart;
        const sw = Math.max(
          1,
          sourceWidth * (slice.sourceEnd - slice.sourceStart) + 0.85
        );

        const dx = rect.width * slice.destStart;
        const dw = Math.max(
          0.75,
          rect.width * (slice.destEnd - slice.destStart) + 0.9
        );
        const dy = rect.height * slice.destTop;
        const dh = rect.height * slice.destHeight;

        context.globalAlpha = slice.alpha;
        context.drawImage(
          artwork,
          sx,
          sourceY,
          sw,
          sourceHeight,
          dx,
          dy,
          dw,
          dh
        );
      }

      context.globalAlpha = 1;

      // Preview-only cylindrical lighting. This changes the printed artwork
      // appearance, not the supplied blank mug photograph underneath it.
      const edgeShade = 0.22 * Math.min(1.2, settings.curvatureStrength);
      const highlight = 0.065 * Math.min(1.2, settings.curvatureStrength);
      const shade = context.createLinearGradient(0, 0, rect.width, 0);
      shade.addColorStop(0, `rgba(0,0,0,${edgeShade})`);
      shade.addColorStop(0.14, "rgba(0,0,0,0.08)");
      shade.addColorStop(0.34, "rgba(255,255,255,0.02)");
      shade.addColorStop(0.5, `rgba(255,255,255,${highlight})`);
      shade.addColorStop(0.66, "rgba(255,255,255,0.02)");
      shade.addColorStop(0.86, "rgba(0,0,0,0.08)");
      shade.addColorStop(1, `rgba(0,0,0,${edgeShade})`);

      context.globalCompositeOperation = "source-atop";
      context.fillStyle = shade;
      context.fillRect(0, 0, rect.width, rect.height);

      if (mask) {
        context.globalCompositeOperation = "destination-in";
        context.drawImage(mask, 0, 0, rect.width, rect.height);
      }

      context.restore();
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    };

    void Promise.all([
      loadImage(artworkUrl),
      view.surfaceMaskUrl
        ? loadImage(view.surfaceMaskUrl).catch(() => null)
        : Promise.resolve(null),
    ]).then(([loadedArtwork, loadedMask]) => {
      if (cancelled) return;
      artwork = loadedArtwork;
      mask = loadedMask;
      render();
    });

    const observer = new ResizeObserver(render);
    observer.observe(canvas);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [artworkUrl, view]);

  const settings = cylindricalViewSettings(view);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Curved product artwork preview"
      className="absolute inset-0 h-full w-full"
      style={{
        mixBlendMode:
          settings.blendMode === "multiply" ? "multiply" : "normal",
      }}
    />
  );
}
