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

type TextureLike = {
  colorSpace: unknown;
  wrapS: unknown;
  wrapT: unknown;
  anisotropy: number;
  dispose(): void;
};

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

export default function CylindricalTextureLayer({
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
    let loadedTexture: TextureLike | null = null;

    void import("three")
      .then((THREE) => {
        if (disposed) return;

        try {
          const scene = new THREE.Scene();

          const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
          camera.position.set(0, 0, 5);
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

          // Full 360° UV cylinder. The texture seam sits on the rear (-Z),
          // so the center of the flat wrap (u=0.5) faces the customer (+Z).
          // Front / Left / Right rotate this same wrapped texture.
          const thetaOffset = THREE.MathUtils.degToRad(
            config.wrapOffsetDeg ?? 0
          );
          const geometry = new THREE.CylinderGeometry(
            1,
            1,
            2.45,
            256,
            1,
            true,
            -Math.PI + thetaOffset,
            Math.PI * 2
          );

          const textureLoader = new THREE.TextureLoader();
          textureLoader.setCrossOrigin("anonymous");
          textureLoader.load(
            artworkUrl,
            (texture: TextureLike) => {
              if (disposed) {
                texture.dispose();
                geometry.dispose();
                return;
              }

              loadedTexture = texture;
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.anisotropy = Math.min(
                8,
                activeRenderer.capabilities.getMaxAnisotropy()
              );

              // Preserve the supplied artwork colours. Ceramic lighting comes
              // from the unchanged real mug photograph underneath this layer.
              const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1,
                side: THREE.FrontSide,
                depthWrite: false,
              });

              const cylinder = new THREE.Mesh(geometry, material);
              const viewAngle =
                view.id === "left" ? -90 : view.id === "right" ? 90 : 0;
              cylinder.rotation.y = THREE.MathUtils.degToRad(viewAngle);
              scene.add(cylinder);

              const render = () => {
                if (disposed || !renderer) return;
                const rect = host.getBoundingClientRect();
                if (rect.width < 2 || rect.height < 2) return;

                renderer.setPixelRatio(
                  Math.min(window.devicePixelRatio || 1, 1.5)
                );
                renderer.setSize(rect.width, rect.height, false);

                const aspect = rect.width / rect.height;
                const halfHeight = 1.25;
                const halfWidth = halfHeight * aspect;

                camera.left = -halfWidth;
                camera.right = halfWidth;
                camera.top = halfHeight;
                camera.bottom = -halfHeight;
                camera.updateProjectionMatrix();

                renderer.render(scene, camera);
              };

              resizeObserver = new ResizeObserver(render);
              resizeObserver.observe(host);
              render();
            },
            undefined,
            () => {
              geometry.dispose();
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
      loadedTexture?.dispose();
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
      style={{ mixBlendMode: "multiply" }}
      aria-label="True cylindrical artwork texture"
    />
  );
}
