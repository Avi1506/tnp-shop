"use client";

import { useEffect, useRef } from "react";
import type { MockupView } from "@/db/schema";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function CylindricalSurfacePreview({
  artworkUrl,
  view,
  wrapCoverageDeg = 270,
}: {
  artworkUrl: string;
  view: MockupView;
  wrapCoverageDeg?: number;
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

      const coverageDeg = clamp(wrapCoverageDeg, 200, 355);
      const coverageRad = (coverageDeg * Math.PI) / 180;
      const viewAngleDeg =
        view.angleDeg ??
        (view.id === "left" ? -65 : view.id === "right" ? 65 : 0);

      // Same full flat wrap is used for every view. Rotating the mug shifts
      // the angular centre over that same source texture.
      const sourceCenter = 0.5 + viewAngleDeg / coverageDeg;

      const stripeCount = Math.max(180, Math.round(rect.width * 1.5));

      context.save();
      context.beginPath();
      context.rect(0, 0, rect.width, rect.height);
      context.clip();

      for (let index = 0; index < stripeCount; index += 1) {
        const x0 = index / stripeCount;
        const x1 = (index + 1) / stripeCount;

        // Inverse orthographic cylinder projection:
        // destination x = sin(theta), therefore theta = asin(x).
        const n0 = clamp(x0 * 2 - 1, -0.9998, 0.9998);
        const n1 = clamp(x1 * 2 - 1, -0.9998, 0.9998);
        const theta0 = Math.asin(n0);
        const theta1 = Math.asin(n1);

        let u0 = sourceCenter + theta0 / coverageRad;
        let u1 = sourceCenter + theta1 / coverageRad;

        if (u1 <= 0 || u0 >= 1) continue;

        u0 = clamp(u0, 0, 1);
        u1 = clamp(u1, 0, 1);
        if (u1 <= u0) continue;

        const sx = artwork.width * u0;
        const sw = Math.max(1, artwork.width * (u1 - u0) + 0.75);

        const dx = rect.width * x0;
        const dw = Math.max(
          0.8,
          rect.width * (x1 - x0) + 0.9
        );

        const centerN = clamp(((x0 + x1) * 0.5) * 2 - 1, -1, 1);
        const theta = Math.asin(centerN);
        const facing = Math.max(0, Math.cos(theta));

        // Ink remains visible toward the tangent, but the edge naturally
        // loses contrast as the ceramic surface turns away.
        const alpha = 0.28 + 0.72 * Math.pow(facing, 0.32);

        context.globalAlpha = alpha;
        context.drawImage(
          artwork,
          sx,
          0,
          sw,
          artwork.height,
          dx,
          0,
          dw,
          rect.height
        );
      }

      context.globalAlpha = 1;

      // Preserve the photographic mug lighting while adding a subtle
      // cylinder roll-off to the artwork itself.
      const shade = context.createLinearGradient(0, 0, rect.width, 0);
      shade.addColorStop(0, "rgba(0,0,0,0.30)");
      shade.addColorStop(0.10, "rgba(0,0,0,0.14)");
      shade.addColorStop(0.28, "rgba(0,0,0,0.035)");
      shade.addColorStop(0.50, "rgba(255,255,255,0.035)");
      shade.addColorStop(0.72, "rgba(0,0,0,0.04)");
      shade.addColorStop(0.90, "rgba(0,0,0,0.15)");
      shade.addColorStop(1, "rgba(0,0,0,0.32)");

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
  }, [artworkUrl, view, wrapCoverageDeg]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Calibrated cylindrical artwork preview"
      className="absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
