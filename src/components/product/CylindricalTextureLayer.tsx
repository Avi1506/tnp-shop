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

          scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.7));

          const key = new THREE.DirectionalLight(0xffffff, 1.45);
          key.position.set(-3, 4, 5);
          scene.add(key);

          const fill = new THREE.DirectionalLight(0xffffff, 0.45);
          fill.position.set(4, 1, 3);
          scene.add(fill);

          const coverageDeg = Math.min(
            355,
            Math.max(180, config.wrapCoverageDeg || 270)
          );
          const thetaLength = THREE.MathUtils.degToRad(coverageDeg);
          const thetaOffset = THREE.MathUtils.degToRad(
            config.wrapOffsetDeg ?? 0
          );
          const thetaStart = -thetaLength / 2 + thetaOffset;

          const geometry = new THREE.CylinderGeometry(
            1,
            1,
            2.45,
            192,
            1,
            true,
            thetaStart,
            thetaLength
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

              const material = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                opacity: 0.98,
                side: THREE.FrontSide,
                depthWrite: false,
              });

              const cylinder = new THREE.Mesh(geometry, material);
              cylinder.rotation.y = THREE.MathUtils.degToRad(
                view.angleDeg ??
                  (view.id === "left"
                    ? -62
                    : view.id === "right"
                      ? 62
                      : 0)
              );
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
