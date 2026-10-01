"use client";

import { useEffect, useRef } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";

type RendererLike = {
  domElement: HTMLCanvasElement;
  outputColorSpace: unknown;
  capabilities: { getMaxAnisotropy(): number };
  setClearColor(color: number, alpha: number): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  render(scene: unknown, camera: unknown): void;
  dispose(): void;
};

type Disposable = { dispose(): void };

type Props = {
  artworkUrl: string;
  template: PrintTemplate;
  view: MockupView;
  onUnavailable: () => void;
};

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export default function MugArtwork3DLayer({
  artworkUrl,
  template,
  view,
  onUnavailable,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const config = template.cylindrical3d;

    if (!host || !config || !canUseWebGL()) {
      onUnavailable();
      return;
    }

    let disposed = false;
    let renderer: RendererLike | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let textureRef: Disposable | null = null;
    let geometryRef: Disposable | null = null;
    let materialRef: Disposable | null = null;

    void import("three")
      .then((THREE) => {
        if (disposed) return;

        try {
          const scene = new THREE.Scene();

          // A transparent camera-facing 3D cylinder is calibrated to the real
          // mug photograph underneath. The mug itself is never regenerated.
          const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
          camera.position.set(0, 0.48, 4.65);
          camera.lookAt(0, 0, 0);

          const activeRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            premultipliedAlpha: true,
            powerPreference: "high-performance",
          }) as RendererLike;
          renderer = activeRenderer;

          activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
          activeRenderer.setClearColor(0x000000, 0);
          activeRenderer.domElement.style.display = "block";
          activeRenderer.domElement.style.width = "100%";
          activeRenderer.domElement.style.height = "100%";
          activeRenderer.domElement.style.pointerEvents = "none";
          host.replaceChildren(activeRenderer.domElement);

          const coverageDeg = Math.min(
            350,
            Math.max(180, config.wrapCoverageDeg || 270)
          );
          const thetaLength = THREE.MathUtils.degToRad(coverageDeg);
          const thetaOffset = THREE.MathUtils.degToRad(
            config.wrapOffsetDeg ?? 0
          );

          // Three CylinderGeometry starts at camera-facing +Z when theta=0.
          // The full Fabric wrap is therefore centered on the visible front.
          const thetaStart = -thetaLength / 2 + thetaOffset;

          const geometry = new THREE.CylinderGeometry(
            1,
            1,
            2.12,
            256,
            1,
            true,
            thetaStart,
            thetaLength
          );
          geometryRef = geometry;

          const loader = new THREE.TextureLoader();
          loader.setCrossOrigin("anonymous");
          loader.load(
            artworkUrl,
            (texture) => {
              if (disposed) {
                texture.dispose();
                return;
              }

              textureRef = texture;
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.anisotropy = Math.min(
                8,
                activeRenderer.capabilities.getMaxAnisotropy()
              );

              // Basic material intentionally preserves uploaded photo colours.
              // The actual ceramic highlights/shadows remain in the real photo.
              const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.985,
                side: THREE.FrontSide,
                depthWrite: false,
                alphaTest: 0.002,
              });
              materialRef = material;

              const printSurface = new THREE.Mesh(geometry, material);
              printSurface.rotation.y = THREE.MathUtils.degToRad(
                view.angleDeg ??
                  (view.id === "left" ? -65 : view.id === "right" ? 65 : 0)
              );
              scene.add(printSurface);

              const render = () => {
                if (disposed || !renderer) return;

                const rect = host.getBoundingClientRect();
                if (rect.width < 2 || rect.height < 2) return;

                renderer.setPixelRatio(
                  Math.min(window.devicePixelRatio || 1, 1.75)
                );
                renderer.setSize(rect.width, rect.height, false);
                camera.aspect = rect.width / rect.height;
                camera.updateProjectionMatrix();
                renderer.render(scene, camera);
              };

              resizeObserver = new ResizeObserver(render);
              resizeObserver.observe(host);
              render();
            },
            undefined,
            () => {
              if (!disposed) onUnavailable();
            }
          );
        } catch {
          onUnavailable();
        }
      })
      .catch(() => {
        if (!disposed) onUnavailable();
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      textureRef?.dispose();
      geometryRef?.dispose();
      materialRef?.dispose();

      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [artworkUrl, onUnavailable, template, view]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 h-full w-full"
      aria-label="True 3D cylindrical artwork surface"
    />
  );
}
