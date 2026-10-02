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

    const activeHost = host;
    const activeConfig = config;

    let disposed = false;
    let renderer: RendererLike | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let textureRef: TextureLike | null = null;

    void import("three")
      .then((THREE) => {
        if (disposed) return;

        try {
          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0xf4f4f1);

          const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

          const activeRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }) as RendererLike;
          renderer = activeRenderer;
          activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
          activeRenderer.shadowMap.enabled = true;
          activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
          activeRenderer.domElement.style.display = "block";
          activeRenderer.domElement.style.width = "100%";
          activeRenderer.domElement.style.height = "100%";
          activeHost.replaceChildren(activeRenderer.domElement);

          // Soft studio lighting similar to a product-photography light tent.
          scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d0c8, 2.15));

          const key = new THREE.DirectionalLight(0xffffff, 3.2);
          key.position.set(4.5, 6.5, 7);
          key.castShadow = true;
          key.shadow.mapSize.set(1024, 1024);
          scene.add(key);

          const fill = new THREE.DirectionalLight(0xf8fbff, 1.25);
          fill.position.set(-5, 3, 4);
          scene.add(fill);

          const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
          rimLight.position.set(1, 4, -5);
          scene.add(rimLight);

          const product = new THREE.Group();
          scene.add(product);

          const configuredRadius = Math.max(0.55, activeConfig.radius || 0.98);
          const radius =
            activeConfig.modelRef === "procedural:mug-v1"
              ? 1
              : configuredRadius;
          const bodyHeight =
            activeConfig.modelRef === "procedural:mug-v1"
              ? 2.32
              : Math.max(1.4, activeConfig.bodyHeight || 2.55);
          const baseColor = new THREE.Color(activeConfig.baseColor ?? "#fbfbf8");
          const roughness = Math.min(1, Math.max(0.12, activeConfig.roughness ?? 0.28));
          const metalness = Math.min(1, Math.max(0, activeConfig.metalness ?? 0));

          const ceramic = new THREE.MeshPhysicalMaterial({
            color: baseColor,
            roughness,
            metalness,
            clearcoat: activeConfig.modelRef === "procedural:mug-v1" ? 0.3 : 0.08,
            clearcoatRoughness: 0.22,
          });

          let printableRadius = radius * 1.008;
          let printableHeight = bodyHeight * 0.78;
          let printableCenterY = 0;
          let floorY = -bodyHeight / 2;

          if (activeConfig.modelRef === "procedural:bottle-v1") {
            const straightHeight = bodyHeight * 0.72;
            const shoulderHeight = bodyHeight * 0.17;
            const neckHeight = bodyHeight * 0.11;

            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(radius, radius * 0.985, straightHeight, 160, 1, false),
              ceramic
            );
            body.position.y = -bodyHeight * 0.14;
            body.castShadow = true;
            body.receiveShadow = true;
            product.add(body);

            const shoulder = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.57,
                radius,
                shoulderHeight,
                160,
                1,
                false
              ),
              ceramic
            );
            shoulder.position.y =
              straightHeight / 2 - bodyHeight * 0.14 + shoulderHeight / 2;
            shoulder.castShadow = true;
            product.add(shoulder);

            const neck = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.57,
                radius * 0.57,
                neckHeight,
                96,
                1,
                false
              ),
              ceramic
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
                radius * 0.61,
                radius * 0.61,
                bodyHeight * 0.06,
                96
              ),
              new THREE.MeshStandardMaterial({
                color: 0x242424,
                roughness: 0.42,
                metalness: 0.08,
              })
            );
            cap.position.y =
              straightHeight / 2 -
              bodyHeight * 0.14 +
              shoulderHeight +
              neckHeight +
              bodyHeight * 0.03;
            cap.castShadow = true;
            product.add(cap);

            printableHeight = straightHeight * 0.94;
            printableCenterY = -bodyHeight * 0.14;
            printableRadius = radius * 1.008;
            floorY = -bodyHeight * 0.5;
          } else {
            // Slight taper makes the mug read as ceramic rather than a generic tube.
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 1.0,
                radius * 0.965,
                bodyHeight,
                192,
                1,
                true
              ),
              ceramic
            );
            body.castShadow = true;
            body.receiveShadow = true;
            product.add(body);

            const bottom = new THREE.Mesh(
              new THREE.CircleGeometry(radius * 0.965, 160),
              ceramic
            );
            bottom.rotation.x = -Math.PI / 2;
            bottom.position.y = -bodyHeight / 2;
            bottom.receiveShadow = true;
            product.add(bottom);

            const rim = new THREE.Mesh(
              new THREE.RingGeometry(
                radius * 0.90,
                radius * 0.995,
                160
              ),
              ceramic
            );
            // A real mug lip is a thin horizontal annulus, not a raised torus.
            // This removes the detached "lid/head" appearance.
            rim.rotation.x = -Math.PI / 2;
            rim.position.y = bodyHeight / 2 + 0.002;
            rim.castShadow = true;
            rim.receiveShadow = true;
            product.add(rim);

            // Darker recessed inner surface gives the top opening real depth.
            const innerDepth = bodyHeight * 0.04;
            const innerMaterial = new THREE.MeshStandardMaterial({
              color: 0xc9cac6,
              roughness: 0.9,
              metalness: 0,
              side: THREE.DoubleSide,
            });

            const innerWall = new THREE.Mesh(
              new THREE.CylinderGeometry(
                radius * 0.90,
                radius * 0.90,
                innerDepth,
                160,
                1,
                true
              ),
              innerMaterial
            );
            innerWall.position.y =
              bodyHeight / 2 - innerDepth / 2 - 0.006;
            product.add(innerWall);

            const inside = new THREE.Mesh(
              new THREE.CircleGeometry(radius * 0.895, 160),
              new THREE.MeshBasicMaterial({
                color: 0xa7a9a6,
                side: THREE.DoubleSide,
              })
            );
            inside.rotation.x = -Math.PI / 2;
            inside.position.y = bodyHeight / 2 - innerDepth - 0.008;
            product.add(inside);

            // Handle lies in the camera-facing XY plane and is physically part
            // of the same rotating product group.
            const handleCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(radius * 0.91, bodyHeight * 0.28, -0.025),
              new THREE.Vector3(radius * 1.34, bodyHeight * 0.30, -0.02),
              new THREE.Vector3(radius * 1.58, bodyHeight * 0.17, -0.015),
              new THREE.Vector3(radius * 1.62, 0, -0.01),
              new THREE.Vector3(radius * 1.58, -bodyHeight * 0.17, -0.015),
              new THREE.Vector3(radius * 1.34, -bodyHeight * 0.30, -0.02),
              new THREE.Vector3(radius * 0.91, -bodyHeight * 0.28, -0.025),
            ]);
            const handle = new THREE.Mesh(
              new THREE.TubeGeometry(
                handleCurve,
                96,
                radius * 0.10,
                20,
                false
              ),
              ceramic
            );
            handle.castShadow = true;
            handle.receiveShadow = true;
            product.add(handle);

            printableHeight = bodyHeight * 0.80;
            printableCenterY = -bodyHeight * 0.015;
            printableRadius = radius * 1.022;
          }

          const coverageDeg = Math.min(
            350,
            Math.max(180, activeConfig.wrapCoverageDeg || 270)
          );
          const thetaLength = THREE.MathUtils.degToRad(coverageDeg);
          const thetaOffset = THREE.MathUtils.degToRad(
            activeConfig.wrapOffsetDeg ?? 0
          );
          const thetaStart = -thetaLength / 2 + thetaOffset;

          if (activeConfig.modelRef === "procedural:mug-v1") {
            // Preserve the real print proportion (e.g. 7.5 × 3.5 in) on the
            // physical cylinder. arcLength / printHeight must equal artwork
            // width / height, otherwise the customer artwork is stretched.
            const physicalAspect =
              Math.max(0.1, template.physical.width) /
              Math.max(0.1, template.physical.height);
            const aspectCorrectHeight =
              (radius * thetaLength) / Math.max(0.1, physicalAspect);
            printableHeight = Math.min(
              bodyHeight * 0.91,
              Math.max(bodyHeight * 0.72, aspectCorrectHeight)
            );
            // Shift the print slightly upward: slim white lip at the top,
            // slightly more ceramic visible at the base, matching the reference mug.
            printableCenterY = bodyHeight * 0.008;
          }

          const textureLoader = new THREE.TextureLoader();
          textureLoader.setCrossOrigin("anonymous");
          textureLoader.load(
            artworkUrl,
            (texture: TextureLike) => {
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

              const printSurface = new THREE.Mesh(
                new THREE.CylinderGeometry(
                  printableRadius,
                  printableRadius,
                  printableHeight,
                  256,
                  1,
                  true,
                  thetaStart,
                  thetaLength
                ),
                new THREE.MeshPhysicalMaterial({
                  map: texture,
                  transparent: true,
                  alphaTest: 0.002,
                  roughness: Math.min(0.72, roughness + 0.08),
                  metalness,
                  clearcoat: activeConfig.modelRef === "procedural:mug-v1" ? 0.12 : 0.04,
                  clearcoatRoughness: 0.3,
                  polygonOffset: true,
                  polygonOffsetFactor: -2,
                  polygonOffsetUnits: -2,
                })
              );
              printSurface.position.y = printableCenterY;
              product.add(printSurface);

              render();
            },
            undefined,
            () => {
              if (!disposed) onUnavailable();
            }
          );

          const configuredAngle =
            view.angleDeg ??
            (view.id === "left" ? -58 : view.id === "right" ? 58 : 0);
          // Product rotation is opposite the camera-view naming convention:
          // a Left view must bring the LEFT portion of the wrap toward camera.
          product.rotation.y = -THREE.MathUtils.degToRad(configuredAngle);

          const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 14),
            new THREE.ShadowMaterial({
              color: 0x000000,
              opacity: 0.11,
            })
          );
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = floorY;
          floor.position.z = -0.25;
          floor.receiveShadow = true;
          scene.add(floor);

          function render() {
            if (disposed || !renderer) return;

            const rect = activeHost.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;

            const thumbnail = rect.width <= 140 || rect.height <= 140;
            renderer.setPixelRatio(
              thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 1.6)
            );
            renderer.setSize(rect.width, rect.height, false);

            camera.aspect = rect.width / rect.height;

            const bounds = new THREE.Box3().setFromObject(product);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());

            const verticalFov = THREE.MathUtils.degToRad(camera.fov);
            const horizontalFov =
              2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

            const distanceForHeight =
              size.y / Math.max(0.01, 2 * Math.tan(verticalFov / 2));
            const distanceForWidth =
              size.x / Math.max(0.01, 2 * Math.tan(horizontalFov / 2));

            const depthAllowance = size.z * 0.5;
            const fitDistance =
              (Math.max(distanceForHeight, distanceForWidth) + depthAllowance) *
              (thumbnail ? 1.24 : 1.22);
            const configuredDistance = Math.max(0, activeConfig.cameraDistance ?? 0);
            const distance = Math.max(
              thumbnail ? 4.2 : 4.8,
              Math.min(configuredDistance || fitDistance, fitDistance * 1.16),
              fitDistance
            );

            const pitch = THREE.MathUtils.degToRad(
              activeConfig.modelRef === "procedural:mug-v1"
                ? 12
                : activeConfig.cameraPitchDeg ?? 5
            );
            camera.position.set(
              center.x,
              center.y + Math.sin(pitch) * distance,
              center.z + Math.cos(pitch) * distance
            );
            camera.lookAt(
              center.x,
              center.y + bodyHeight * 0.01,
              center.z
            );
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
          }

          resizeObserver = new ResizeObserver(render);
          resizeObserver.observe(activeHost);
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
      textureRef?.dispose();

      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [artworkUrl, onUnavailable, template, view]);

  return <div ref={hostRef} className="h-full w-full" />;
}
