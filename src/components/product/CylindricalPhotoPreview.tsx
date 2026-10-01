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

function viewPerspective(view: MockupView) {
  if (view.id === "left") return -0.018;
  if (view.id === "right") return 0.018;
  return 0;
}

export default function CylindricalPhotoPreview({
  artworkUrl,
  view,
  template: _template,
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
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scale = Math.min(
        rect.width / mockup.width,
        rect.height / mockup.height
      );
      const mockupWidth = mockup.width * scale;
      const mockupHeight = mockup.height * scale;
      const mockupX = (rect.width - mockupWidth) / 2;
      const mockupY = (rect.height - mockupHeight) / 2;

      ctx.drawImage(mockup, mockupX, mockupY, mockupWidth, mockupHeight);
      if (!artwork) return;

      const printX = mockupX + (mockupWidth * view.printArea.xPct) / 100;
      const printY = mockupY + (mockupHeight * view.printArea.yPct) / 100;
      const printWidth = (mockupWidth * view.printArea.widthPct) / 100;
      const printHeight = (mockupHeight * view.printArea.heightPct) / 100;

      if (printWidth < 2 || printHeight < 2) return;

      const sourceX = (artwork.width * view.source.xPct) / 100;
      const sourceY = (artwork.height * view.source.yPct) / 100;
      const sourceWidth = (artwork.width * view.source.widthPct) / 100;
      const sourceHeight = (artwork.height * view.source.heightPct) / 100;

      const strips = Math.max(220, Math.min(520, Math.round(printWidth * 1.6)));
      const thetaMax = (80 * Math.PI) / 180;
      const sinMax = Math.sin(thetaMax);
      const tilt = viewPerspective(view);

      ctx.save();
      ctx.globalCompositeOperation = "multiply";

      for (let index = 0; index < strips; index += 1) {
        const t0 = index / strips;
        const t1 = (index + 1) / strips;
        const tc = (t0 + t1) / 2;

        const theta0 = -thetaMax + t0 * thetaMax * 2;
        const theta1 = -thetaMax + t1 * thetaMax * 2;
        const theta = -thetaMax + tc * thetaMax * 2;

        const x0 = (Math.sin(theta0) / sinMax + 1) / 2;
        const x1 = (Math.sin(theta1) / sinMax + 1) / 2;

        const sx = sourceX + sourceWidth * t0;
        const sw = Math.max(1, sourceWidth * (t1 - t0) + 0.9);

        const dx = printX + printWidth * x0;
        const dw = Math.max(0.85, printWidth * (x1 - x0) + 1.1);

        const facing = Math.max(0, Math.cos(theta));
        const edge = 1 - facing;
        const heightLoss = printHeight * 0.035 * edge;
        const side = Math.sin(theta);
        const dy =
          printY +
          heightLoss / 2 +
          printHeight * tilt * side;
        const dh = printHeight - heightLoss;

        const brightness = clamp(
          0.58 + 0.44 * Math.pow(facing, 0.5),
          0.56,
          1
        );
        const alpha = clamp(
          0.7 + 0.3 * Math.pow(facing, 0.35),
          0.7,
          1
        );

        ctx.globalAlpha = alpha;
        ctx.filter = `brightness(${Math.round(brightness * 100)}%)`;
        ctx.drawImage(
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

      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    };

    const jobs: Promise<unknown>[] = [
      loadImage(mockupUrl).then((image) => {
        mockup = image;
      }),
    ];

    if (artworkUrl) {
      jobs.push(
        loadImage(artworkUrl).then((image) => {
          artwork = image;
        })
      );
    }

    void Promise.all(jobs).then(() => {
      if (!cancelled) render();
    });

    const observer = new ResizeObserver(render);
    observer.observe(canvas);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [artworkUrl, view]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label={`${view.name} cylindrical mug preview`}
    />
  );
}
