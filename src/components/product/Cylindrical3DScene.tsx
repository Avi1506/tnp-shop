"use client";

import { useEffect, useRef } from "react";
import type { MockupView, PrintTemplate } from "@/db/schema";

type RendererLike = {
  domElement: HTMLCanvasElement;
  outputColorSpace: unknown;
  shadowMap: { enabled: boolean; type: unknown };
  capabilities: { getMaxAnisotropy(): number };
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

export default function Cylindrical3DScene({
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

    void import("three")
      .then((THREE) => {
        if (disposed) return;

        try {
          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0xf5f5f2);

          const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
          const distance = Math.max(5.8, config.cameraDistance ?? 7.2);
          const pitch = THREE.MathUtils.degToRad(config.cameraPitchDeg ?? 5);
          camera.position.set(0, Math.sin(pitch) * distance * 0.18, distance);
          camera.lookAt(0, 0, 0);

          const activeRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }) as RendererLike;
          renderer = activeRenderer;
          activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
          activeRenderer.shadowMap.enabled = true;
          activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
          host.replaceChildren(activeRenderer.domElement);

          const ambient = new THREE.HemisphereLight(0xffffff, 0xc8c4bb, 2.25);
          scene.add(ambient);

          const key = new THREE.DirectionalLight(0xffffff, 3.8);
          key.position.set(4, 6, 7);
          key.castShadow = true;
          key.shadow.mapSize.set(1024, 1024);
          scene.add(key);

          const fill = new THREE.DirectionalLight(0xffffff, 1.5);
          fill.position.set(-5, 2, 3);
          scene.add(fill);

          const product = new THREE.Group();
          scene.add(product);

          const radius = Math.max(0.55, config.radius || 1.18);
          const bodyHeight = Math.max(1.2, config.bodyHeight || 2.45);
          const baseColor = new THREE.Color(config.baseColor ?? "#f7f7f4");
          const roughness = Math.min(1, Math.max(0.05, config.roughness ?? 0.34));
          const metalness = Math.min(1, Math.max(0, config.metalness ?? 0));

          const baseMaterial = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness,
            metalness,
          });

          const printableRadius = radius;
          let printableBodyHeight = bodyHeight * 0.76;
          let printableCenterY = 0;

          if (config.modelRef === "procedural:bottle-v1") {
            const straightHeight = bodyHeight * 0.72;
            const shoulderHeight = bodyHeight * 0.16;
            const neckHeight = bodyHeight * 0.12;

            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(radius, radius, straightHeight, 96, 1, false),
              baseMaterial
            );
            body.position.y = -bodyHeight * 0.14;
            body.castShadow = true;
            body.receiveShadow = true;
            product.add(body);

            const shoulder = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.58,
                radius,
                shoulderHeight,
                96,
                1,
                false
              ),
              baseMaterial
            );
            shoulder.position.y = straightHeight / 2 - bodyHeight * 0.14 + shoulderHeight / 2;
            shoulder.castShadow = true;
            product.add(shoulder);

            const neck = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.58,
                radius * 0.58,
                neckHeight,
                64,
                1,
                false
              ),
              baseMaterial
            );
            neck.position.y =
              straightHeight / 2 -
              bodyHeight * 0.14 +
              shoulderHeight +
              neckHeight / 2;
            neck.castShadow = true;
            product.add(neck);

            const cap = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.62,
                radius * 0.62,
                bodyHeight * 0.055,
                64
              ),
              new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.5,
                metalness: 0.05,
              })
            );
            cap.position.y =
              straightHeight / 2 -
              bodyHeight * 0.14 +
              shoulderHeight +
              neckHeight +
              bodyHeight * 0.0275;
            cap.castShadow = true;
            product.add(cap);

            printableBodyHeight = straightHeight;
            printableCenterY = -bodyHeight * 0.14;
          } else {
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius,
                radius,
                bodyHeight,
                128,
                1,
                true
              ),
              baseMaterial
            );
            body.castShadow = true;
            body.receiveShadow = true;
            product.add(body);

            const bottom = new THREE.Mesh(
              new THREE.CircleGeometry(radius, 96),
              baseMaterial
            );
            bottom.rotation.x = -Math.PI / 2;
            bottom.position.y = -bodyHeight / 2;
            product.add(bottom);

            const inside = new THREE.Mesh(
              new THREE.CircleGeometry(radius * 0.9, 96),
              new THREE.MeshStandardMaterial({
                color: 0xdad9d5,
                roughness: 0.72,
              })
            );
            inside.rotation.x = -Math.PI / 2;
            inside.position.y = bodyHeight / 2 - 0.025;
            product.add(inside);

            const rim = new THREE.Mesh(
              new THREE.TorusGeometry(radius, radius * 0.055, 18, 128),
              baseMaterial
            );
            rim.rotation.x = Math.PI / 2;
            rim.position.y = bodyHeight / 2;
            rim.castShadow = true;
            product.add(rim);

            const handleSign = config.handleSide === "left" ? -1 : 1;
            const handle = new THREE.Mesh(
              new THREE.TorusGeometry(
                radius * 0.52,
                radius * 0.12,
                20,
                80
              ),
              baseMaterial
            );
            handle.rotation.y = Math.PI / 2;
            handle.scale.y = 1.28;
            handle.position.set(handleSign * radius * 1.12, 0, 0);
            handle.castShadow = true;
            product.add(handle);
          }

          const topMargin = Math.min(
            0.45,
            Math.max(0, template.safeArea.topPct / 100)
          );
          const bottomMargin = Math.min(
            0.45,
            Math.max(0, template.safeArea.bottomPct / 100)
          );
          const printableHeight = Math.max(
            printableBodyHeight * 0.1,
            printableBodyHeight * (1 - topMargin - bottomMargin)
          );
          const marginOffset =
            ((bottomMargin - topMargin) * printableBodyHeight) / 2;
          const printY = printableCenterY + marginOffset;

          const textureLoader = new THREE.TextureLoader();
          textureLoader.setCrossOrigin("anonymous");
          textureLoader.load(
            artworkUrl,
            (texture: TextureLike) => {
              if (disposed) {
                texture.dispose();
                return;
              }

              texture.colorSpace = THREE.SRGBColorSpace;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.anisotropy = Math.min(
                8,
                renderer?.capabilities.getMaxAnisotropy() ?? 1
              );

              const coverageDeg = Math.min(
                355,
                Math.max(30, config.wrapCoverageDeg || 270)
              );
              const thetaLength = THREE.MathUtils.degToRad(coverageDeg);
              const thetaOffset = THREE.MathUtils.degToRad(
                config.wrapOffsetDeg ?? 0
              );
              // Three.js CylinderGeometry starts at +Z and advances toward +X.
              // Center the printable arc on the camera-facing +Z side.
              const thetaStart = -thetaLength / 2 + thetaOffset;

              const printSurface = new THREE.Mesh(
                new THREE.CylinderGeometry(
                  printableRadius * 1.006,
                  printableRadius * 1.006,
                  printableHeight,
                  160,
                  1,
                  true,
                  thetaStart,
                  thetaLength
                ),
                new THREE.MeshStandardMaterial({
                  map: texture,
                  transparent: true,
                  roughness: Math.min(0.75, roughness + 0.06),
                  metalness,
                  depthWrite: true,
                  polygonOffset: true,
                  polygonOffsetFactor: -2,
                  polygonOffsetUnits: -2,
                })
              );
              printSurface.position.y = printY;
              printSurface.castShadow = false;
              printSurface.receiveShadow = false;
              product.add(printSurface);

              render();
            },
            undefined,
            () => {
              if (!disposed) onUnavailable();
            }
          );

          const angle = THREE.MathUtils.degToRad(
            view.angleDeg ??
              (view.id === "left" ? -65 : view.id === "right" ? 65 : 0)
          );
          product.rotation.y = angle;

          const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.ShadowMaterial({
              color: 0x000000,
              opacity: 0.12,
            })
          );
          floor.rotation.x = -Math.PI / 2;
          floor.position.y =
            config.modelRef === "procedural:bottle-v1"
              ? -bodyHeight * 0.5
              : -bodyHeight / 2;
          floor.position.z = -0.15;
          floor.receiveShadow = true;
          scene.add(floor);

          const render = () => {
            if (disposed || !renderer) return;
            const rect = host.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            renderer.setPixelRatio(dpr);
            renderer.setSize(rect.width, rect.height, false);
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
          };

          resizeObserver = new ResizeObserver(render);
          resizeObserver.observe(host);
          render();
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
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [artworkUrl, onUnavailable, template, view]);

  return <div ref={hostRef} className="h-full w-full" />;
}
