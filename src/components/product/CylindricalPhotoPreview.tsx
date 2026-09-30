"use client";

import { useEffect, useRef } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";

type Point = { x: number; y: number };

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

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: [Point, Point, Point],
  destination: [Point, Point, Point]
) {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;

  const determinant =
    s0.x * (s1.y - s2.y) +
    s1.x * (s2.y - s0.y) +
    s2.x * (s0.y - s1.y);

  if (Math.abs(determinant) < 0.000001) return;

  const a =
    (d0.x * (s1.y - s2.y) +
      d1.x * (s2.y - s0.y) +
      d2.x * (s0.y - s1.y)) /
    determinant;
  const b =
    (d0.y * (s1.y - s2.y) +
      d1.y * (s2.y - s0.y) +
      d2.y * (s0.y - s1.y)) /
    determinant;
  const c =
    (d0.x * (s2.x - s1.x) +
      d1.x * (s0.x - s2.x) +
      d2.x * (s1.x - s0.x)) /
    determinant;
  const d =
    (d0.y * (s2.x - s1.x) +
      d1.y * (s0.x - s2.x) +
      d2.y * (s1.x - s0.x)) /
    determinant;
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    determinant;
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    determinant;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function viewCalibration(view: MockupView) {
  const id = view.id.toLowerCase();

  if (id === "left") {
    return {
      angleDeg: -65,
      topCurvePct: 1.15,
      bottomCurvePct: 0.85,
      verticalTiltPct: -0.45,
      edgeHeightLossPct: 2.1,
      edgeAlpha: 0.78,
    };
  }

  if (id === "right") {
    return {
      angleDeg: 65,
      topCurvePct: 1.05,
      bottomCurvePct: 0.9,
      verticalTiltPct: 0.45,
      edgeHeightLossPct: 2.1,
      edgeAlpha: 0.78,
    };
  }

  return {
    angleDeg: 0,
    topCurvePct: 0.95,
    bottomCurvePct: 0.75,
    verticalTiltPct: 0,
    edgeHeightLossPct: 1.6,
    edgeAlpha: 0.82,
  };
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

      const mockupScale = Math.min(
        rect.width / mockup.width,
        rect.height / mockup.height
      );
      const mockupWidth = mockup.width * mockupScale;
      const mockupHeight = mockup.height * mockupScale;
      const mockupX = (rect.width - mockupWidth) / 2;
      const mockupY = (rect.height - mockupHeight) / 2;

      // Base photography is never modified.
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

      const coverageDeg = clamp(
        template?.cylindrical3d?.wrapCoverageDeg ?? 270,
        220,
        355
      );
      const coverageRad = (coverageDeg * Math.PI) / 180;
      const calibration = viewCalibration(view);
      const sourceCenter = 0.5 + calibration.angleDeg / coverageDeg;

      const columns = 48;
      const rows = 14;
      const thetaMax = (84 * Math.PI) / 180;
      const sinThetaMax = Math.sin(thetaMax);

      const vertices: Array<Array<{
        source: Point;
        destination: Point;
        alpha: number;
        valid: boolean;
      }>> = [];

      for (let row = 0; row <= rows; row += 1) {
        const v = row / rows;
        const rowVertices = [];

        for (let column = 0; column <= columns; column += 1) {
          const visibleU = column / columns;
          const theta = (visibleU - 0.5) * 2 * thetaMax;
          const facing = Math.max(0, Math.cos(theta));
          const side = Math.sin(theta) / sinThetaMax;

          const sourceU = sourceCenter + theta / coverageRad;
          const valid = sourceU >= 0 && sourceU <= 1;

          const curve = 1 - facing;
          const topCurve =
            (calibration.topCurvePct / 100) * mockupHeight * curve;
          const bottomCurve =
            (calibration.bottomCurvePct / 100) * mockupHeight * curve;
          const heightLoss =
            (calibration.edgeHeightLossPct / 100) * mockupHeight * curve;
          const tilt =
            (calibration.verticalTiltPct / 100) * mockupHeight * side;

          const top = printY + topCurve + tilt + heightLoss * 0.5;
          const bottom =
            printY + printHeight - bottomCurve + tilt - heightLoss * 0.5;

          rowVertices.push({
            source: {
              x: clamp(sourceU, 0, 1) * artwork.width,
              y: v * artwork.height,
            },
            destination: {
              x: printX + ((side + 1) / 2) * printWidth,
              y: top + (bottom - top) * v,
            },
            alpha:
              calibration.edgeAlpha +
              (1 - calibration.edgeAlpha) * Math.pow(facing, 0.45),
            valid,
          });
        }

        vertices.push(rowVertices);
      }

      ctx.save();
      ctx.globalCompositeOperation = "multiply";

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const p00 = vertices[row][column];
          const p10 = vertices[row][column + 1];
          const p01 = vertices[row + 1][column];
          const p11 = vertices[row + 1][column + 1];

          if (!(p00.valid && p10.valid && p01.valid && p11.valid)) {
            continue;
          }

          const alpha =
            (p00.alpha + p10.alpha + p01.alpha + p11.alpha) / 4;
          ctx.globalAlpha = alpha;

          drawTexturedTriangle(
            ctx,
            artwork,
            [p00.source, p10.source, p11.source],
            [p00.destination, p10.destination, p11.destination]
          );
          drawTexturedTriangle(
            ctx,
            artwork,
            [p00.source, p11.source, p01.source],
            [p00.destination, p11.destination, p01.destination]
          );
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // A very soft photographic roll-off at the extreme tangents prevents the
      // print edge from reading like a pasted rectangular sticker.
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const tangentShade = ctx.createLinearGradient(
        printX,
        0,
        printX + printWidth,
        0
      );
      tangentShade.addColorStop(0, "rgba(30,30,30,0.18)");
      tangentShade.addColorStop(0.08, "rgba(30,30,30,0.05)");
      tangentShade.addColorStop(0.26, "rgba(255,255,255,0)");
      tangentShade.addColorStop(0.74, "rgba(255,255,255,0)");
      tangentShade.addColorStop(0.92, "rgba(30,30,30,0.05)");
      tangentShade.addColorStop(1, "rgba(30,30,30,0.18)");
      ctx.fillStyle = tangentShade;
      ctx.fillRect(printX, printY, printWidth, printHeight);
      ctx.restore();
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
  }, [artworkUrl, template, view]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label={`${view.name} calibrated mesh mug preview`}
    />
  );
}
