"use client";

import { useEffect, useRef } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
  priority: _priority = false,
}: {
  artworkUrl: string | null;
  view: MockupView;
  template?: PrintTemplate;
  priority?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mockupUrl = resolvedMockupUrl(view);
    if (!canvas || !mockupUrl) return;

    let cancelled = false;
    let mockup: HTMLImageElement | null = null;
    let artwork: HTMLImageElement | null = null;

    const render = () => {
      if (cancelled || !mockup) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Match the previous <Image object-contain> behaviour exactly.
      const mockupScale = Math.min(
        rect.width / mockup.width,
        rect.height / mockup.height
      );
      const mockupWidth = mockup.width * mockupScale;
      const mockupHeight = mockup.height * mockupScale;
      const mockupX = (rect.width - mockupWidth) / 2;
      const mockupY = (rect.height - mockupHeight) / 2;

      ctx.drawImage(mockup, mockupX, mockupY, mockupWidth, mockupHeight);

      if (!artwork) return;

      const printX =
        mockupX + (mockupWidth * view.printArea.xPct) / 100;
      const printY =
        mockupY + (mockupHeight * view.printArea.yPct) / 100;
      const printWidth =
        (mockupWidth * view.printArea.widthPct) / 100;
      const printHeight =
        (mockupHeight * view.printArea.heightPct) / 100;

      if (printWidth < 2 || printHeight < 2) return;

      const offscreen = document.createElement("canvas");
      const offDpr = Math.min(dpr, 2);
      offscreen.width = Math.max(1, Math.round(printWidth * offDpr));
      offscreen.height = Math.max(1, Math.round(printHeight * offDpr));

      const off = offscreen.getContext("2d");
      if (!off) return;

      off.setTransform(offDpr, 0, 0, offDpr, 0, 0);
      off.clearRect(0, 0, printWidth, printHeight);
      off.imageSmoothingEnabled = true;
      off.imageSmoothingQuality = "high";

      const coverageDeg = clamp(
        template?.cylindrical3d?.wrapCoverageDeg ?? 270,
        220,
        355
      );
      const coverageRad = (coverageDeg * Math.PI) / 180;
      const viewAngleDeg =
        view.angleDeg ??
        (view.id === "left" ? -65 : view.id === "right" ? 65 : 0);

      // One full flat wrap remains the source of truth. Each camera view just
      // moves the angular centre over that same source texture.
      const sourceCenter = 0.5 + viewAngleDeg / coverageDeg;
      const stripeCount = Math.max(
        220,
        Math.min(700, Math.round(printWidth * 2))
      );

      for (let index = 0; index < stripeCount; index += 1) {
        const x0 = index / stripeCount;
        const x1 = (index + 1) / stripeCount;
        const centreX = (x0 + x1) / 2;

        // Orthographic projection of a cylinder: screenX = sin(theta).
        // Invert it so equal destination columns sample increasingly wider
        // artwork sections toward the tangents — the wrap visibly turns away.
        const n0 = clamp(x0 * 2 - 1, -0.9998, 0.9998);
        const n1 = clamp(x1 * 2 - 1, -0.9998, 0.9998);
        const centreN = clamp(centreX * 2 - 1, -0.9998, 0.9998);

        const theta0 = Math.asin(n0);
        const theta1 = Math.asin(n1);
        const theta = Math.asin(centreN);

        let u0 = sourceCenter + theta0 / coverageRad;
        let u1 = sourceCenter + theta1 / coverageRad;

        if (u1 <= 0 || u0 >= 1) continue;

        u0 = clamp(u0, 0, 1);
        u1 = clamp(u1, 0, 1);
        if (u1 <= u0) continue;

        const sx = artwork.width * u0;
        const sw = Math.max(
          1,
          artwork.width * (u1 - u0) + 0.75
        );

        const dx = printWidth * x0;
        const dw = Math.max(
          0.8,
          printWidth * (x1 - x0) + 0.8
        );

        const facing = Math.max(0, Math.cos(theta));

        // Ceramic roll-off: Zazzle-like previews become noticeably darker
        // toward the tangents while retaining a soft highlight on the lit side.
        const highlight =
          0.10 * Math.exp(-Math.pow((centreN + 0.26) / 0.18, 2));
        const rightSideLoss = 0.08 * Math.max(0, centreN);
        const brightness = clamp(
          0.52 +
            0.48 * Math.pow(facing, 0.55) +
            highlight -
            rightSideLoss,
          0.45,
          1.08
        );

        // Ink is still visible near the tangent, but loses apparent area as
        // the surface rotates away from the viewer.
        const edgeAlpha = clamp(
          0.58 + 0.42 * Math.pow(facing, 0.28),
          0.58,
          1
        );

        off.globalAlpha = edgeAlpha;
        off.filter = `brightness(${Math.round(brightness * 100)}%)`;
        off.drawImage(
          artwork,
          sx,
          0,
          sw,
          artwork.height,
          dx,
          0,
          dw,
          printHeight
        );
      }

      off.filter = "none";
      off.globalAlpha = 1;

      // Multiply print into the ORIGINAL photograph. White artwork leaves the
      // ceramic photo untouched; colours inherit the mug's real highlights,
      // shadows and texture instead of covering them with a flat rectangle.
      ctx.save();
      ctx.globalCompositeOperation = "multiply";

      // Tiny tangent fade removes the hard vertical overlay boundary without
      // altering the supplied mug photograph itself.
      const mask = document.createElement("canvas");
      mask.width = offscreen.width;
      mask.height = offscreen.height;
      const maskCtx = mask.getContext("2d");
      if (maskCtx) {
        maskCtx.setTransform(offDpr, 0, 0, offDpr, 0, 0);
        maskCtx.drawImage(offscreen, 0, 0, printWidth, printHeight);
        maskCtx.globalCompositeOperation = "destination-in";
        const fade = maskCtx.createLinearGradient(0, 0, printWidth, 0);
        fade.addColorStop(0, "rgba(255,255,255,0.18)");
        fade.addColorStop(0.035, "rgba(255,255,255,0.78)");
        fade.addColorStop(0.085, "rgba(255,255,255,1)");
        fade.addColorStop(0.915, "rgba(255,255,255,1)");
        fade.addColorStop(0.965, "rgba(255,255,255,0.78)");
        fade.addColorStop(1, "rgba(255,255,255,0.18)");
        maskCtx.fillStyle = fade;
        maskCtx.fillRect(0, 0, printWidth, printHeight);

        ctx.drawImage(mask, printX, printY, printWidth, printHeight);
      } else {
        ctx.drawImage(
          offscreen,
          printX,
          printY,
          printWidth,
          printHeight
        );
      }

      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    };

    const promises: Promise<unknown>[] = [loadImage(mockupUrl).then((image) => {
      mockup = image;
    })];

    if (artworkUrl) {
      promises.push(
        loadImage(artworkUrl).then((image) => {
          artwork = image;
        })
      );
    }

    void Promise.all(promises).then(() => {
      if (!cancelled) render();
    });

    const observer = new ResizeObserver(render);
    observer.observe(canvas);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [artworkUrl, template, view]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label={`${view.name} cylindrical mug preview`}
    />
  );
}
