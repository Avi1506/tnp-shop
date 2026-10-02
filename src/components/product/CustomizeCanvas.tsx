"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as fabric from "fabric";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Maximize2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  CartItemCustomization,
  CustomizationConfig,
  PrintTemplate,
  SavedDesignState,
} from "@/db/schema";
import { outputPixels, resolveProductTemplate } from "@/lib/print-template";
import ProductPreviewRenderer from "@/components/product/ProductPreviewRenderer";
import { uploadFile } from "@/lib/client-upload";
import { useCart } from "@/components/cart/CartContext";

type InitialCustomization = CartItemCustomization | null | undefined;

type CustomFabricObject = fabric.FabricObject & {
  isCustomImage?: boolean;
  isGuide?: boolean;
  uploadUrl?: string;
};

function editorSize(template: PrintTemplate) {
  const ratio = template.physical.width / template.physical.height;
  if (ratio >= 1) {
    return { width: 640, height: Math.max(260, Math.round(640 / ratio)) };
  }
  return { width: Math.max(280, Math.round(520 * ratio)), height: 520 };
}

function heartPath(width: number, height: number) {
  const path = new fabric.Path(
    "M 50 92 C 43 85 8 60 8 32 C 8 12 32 2 50 22 C 68 2 92 12 92 32 C 92 60 57 85 50 92 Z",
    {
      left: 0,
      top: 0,
      fill: "#000",
      scaleX: width / 100,
      scaleY: height / 100,
      absolutePositioned: true,
      selectable: false,
      evented: false,
    }
  );
  return path;
}

export default function CustomizeCanvas({
  productId,
  slug,
  name,
  price,
  config,
  categoryTemplate,
  initialCustomization,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  config: CustomizationConfig;
  categoryTemplate?: PrintTemplate | null;
  initialCustomization?: InitialCustomization;
}) {
  const template = useMemo(
    () => resolveProductTemplate(categoryTemplate, config),
    [categoryTemplate, config]
  );
  const dimensions = useMemo(() => editorSize(template), [template]);
  const output = useMemo(() => outputPixels(template), [template]);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const customizerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guideRefs = useRef<fabric.FabricObject[]>([]);
  const restoredRef = useRef(false);

  const [mode, setMode] = useState<"design" | "preview">("design");
  const [selectedViewId, setSelectedViewId] = useState(template.views[0]?.id ?? "front");
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(
    initialCustomization?.originalUploads ?? initialCustomization?.uploadedImages ?? []
  );
  const [textValue, setTextValue] = useState(initialCustomization?.text ?? "");
  const [font, setFont] = useState(initialCustomization?.font ?? config.fields.fonts[0] ?? "Poppins");
  const [textColor, setTextColor] = useState(
    initialCustomization?.textColor ?? config.fields.colors[0] ?? "#1B2A4A"
  );
  const [size, setSize] = useState(initialCustomization?.size ?? config.fields.sizes[0] ?? "");
  const [instructions, setInstructions] = useState(initialCustomization?.specialInstructions ?? "");
  const [approved, setApproved] = useState(initialCustomization?.approved ?? false);
  const [hasSelection, setHasSelection] = useState(false);
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState(uploadedUrls.length > 0);
  const [artworkSnapshot, setArtworkSnapshot] = useState<string | null>(
    initialCustomization?.previewImageUrl ?? initialCustomization?.previewImage ?? null
  );
  const [qualityWarnings, setQualityWarnings] = useState<string[]>(
    initialCustomization?.qualityWarnings ?? []
  );
  const [editorScale, setEditorScale] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { addLine } = useCart();
  const router = useRouter();

  useEffect(() => {
    const viewport = editorViewportRef.current;
    if (!viewport) return;

    const update = () => {
      const width = viewport.clientWidth;
      if (!width) return;
      setEditorScale(Math.min(1, width / dimensions.width));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [dimensions.width]);

  const getSafeArea = useCallback(() => {
    const { safeArea } = template;
    const left = (dimensions.width * safeArea.leftPct) / 100;
    const top = (dimensions.height * safeArea.topPct) / 100;
    const right = (dimensions.width * safeArea.rightPct) / 100;
    const bottom = (dimensions.height * safeArea.bottomPct) / 100;
    return {
      left,
      top,
      width: Math.max(1, dimensions.width - left - right),
      height: Math.max(1, dimensions.height - top - bottom),
    };
  }, [dimensions, template]);

  const applyCanvasMask = useCallback(async (canvas: fabric.Canvas) => {
    if (template.shape === "circle") {
      const radius = Math.min(dimensions.width, dimensions.height) / 2;
      canvas.clipPath = new fabric.Circle({
        left: dimensions.width / 2,
        top: dimensions.height / 2,
        radius,
        originX: "center",
        originY: "center",
        absolutePositioned: true,
        selectable: false,
        evented: false,
      });
      canvas.requestRenderAll();
      return;
    }

    if (template.shape === "heart") {
      canvas.clipPath = heartPath(dimensions.width, dimensions.height);
      canvas.requestRenderAll();
      return;
    }

    if (template.shape === "custom-mask" && template.maskUrl) {
      try {
        const mask = await fabric.FabricImage.fromURL(template.maskUrl, {
          crossOrigin: "anonymous",
        });
        mask.set({
          left: 0,
          top: 0,
          scaleX: dimensions.width / Math.max(1, mask.width ?? 1),
          scaleY: dimensions.height / Math.max(1, mask.height ?? 1),
          absolutePositioned: true,
          selectable: false,
          evented: false,
        });
        canvas.clipPath = mask;
        canvas.requestRenderAll();
      } catch {
        setQualityWarnings((warnings) => [
          ...warnings.filter((warning) => !warning.includes("mask")),
          "Custom mask could not be loaded; verify the template mask URL.",
        ]);
      }
    }
  }, [dimensions, template]);

  const addGuides = useCallback((canvas: fabric.Canvas) => {
    const safe = getSafeArea();
    const guide = new fabric.Rect({
      left: safe.left,
      top: safe.top,
      width: safe.width,
      height: safe.height,
      fill: "transparent",
      stroke: "#2A9D8F",
      strokeDashArray: [6, 4],
      strokeWidth: 1.5,
      selectable: false,
      evented: false,
    }) as CustomFabricObject;
    guide.isGuide = true;
    guideRefs.current = [guide];
    canvas.add(guide);

    if (template.printType === "cylindrical") {
      const divider1 = new fabric.Line(
        [dimensions.width / 3, 0, dimensions.width / 3, dimensions.height],
        { stroke: "rgba(27,42,74,.18)", strokeDashArray: [4, 4], selectable: false, evented: false }
      ) as CustomFabricObject;
      const divider2 = new fabric.Line(
        [(dimensions.width * 2) / 3, 0, (dimensions.width * 2) / 3, dimensions.height],
        { stroke: "rgba(27,42,74,.18)", strokeDashArray: [4, 4], selectable: false, evented: false }
      ) as CustomFabricObject;
      divider1.isGuide = true;
      divider2.isGuide = true;
      guideRefs.current.push(divider1, divider2);
      canvas.add(divider1, divider2);
    }
  }, [dimensions, getSafeArea, template.printType]);

  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: "#FAF9F6",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;
    addGuides(canvas);
    void applyCanvasMask(canvas);

    const saved = initialCustomization?.designState;
    if (saved?.fabric && !restoredRef.current) {
      restoredRef.current = true;
      void canvas.loadFromJSON(saved.fabric).then(() => {
        guideRefs.current = canvas
          .getObjects()
          .filter((object) => Boolean((object as CustomFabricObject).isGuide));
        canvas.requestRenderAll();
      });
    }

    const selected = () => setHasSelection(true);
    const cleared = () => setHasSelection(false);
    canvas.on("selection:created", selected);
    canvas.on("selection:updated", selected);
    canvas.on("selection:cleared", cleared);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [addGuides, applyCanvasMask, dimensions, initialCustomization]);

  function customerObjects(canvas: fabric.Canvas) {
    return canvas.getObjects().filter((object) => !(object as CustomFabricObject).isGuide);
  }

  function setGuidesVisible(visible: boolean) {
    guideRefs.current.forEach((guide) => guide.set({ opacity: visible ? 1 : 0 }));
  }

  function captureArtwork(multiplier = 2) {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    setGuidesVisible(false);
    canvas.discardActiveObject();
    const oldBackground = canvas.backgroundColor;
    canvas.backgroundColor = "transparent";
    canvas.requestRenderAll();
    const data = canvas.toDataURL({ format: "png", multiplier });
    canvas.backgroundColor = oldBackground;
    setGuidesVisible(true);
    canvas.requestRenderAll();
    return data;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Please upload a JPG, PNG or WebP image.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Image must be 10 MB or smaller.");
      }

      const bitmap = await createImageBitmap(file);
      const nextWarnings: string[] = [];
      if (bitmap.width < output.widthPx || bitmap.height < output.heightPx) {
        nextWarnings.push(
          `Image resolution is ${bitmap.width}×${bitmap.height}px; full-size ${template.physical.dpi} DPI output is ${output.widthPx}×${output.heightPx}px. Printing may look soft if enlarged.`
        );
      }
      bitmap.close();
      setQualityWarnings(nextWarnings);

      const url = await uploadFile(file, "customizations", setUploadProgress);

      const localUrl = URL.createObjectURL(file);
      const image = await fabric.FabricImage.fromURL(localUrl);
      URL.revokeObjectURL(localUrl);

      const canvas = fabricRef.current;
      if (!canvas) throw new Error("Editor is not ready.");

      if (!config.fields.multipleImages) {
        customerObjects(canvas)
          .filter((object) => (object as CustomFabricObject).isCustomImage)
          .forEach((object) => canvas.remove(object));
      }

      const safe = getSafeArea();
      const scale =
        template.printType === "cylindrical"
          ? Math.max(
              safe.width / Math.max(1, image.width ?? 1),
              safe.height / Math.max(1, image.height ?? 1)
            )
          : Math.min(
              safe.width / Math.max(1, image.width ?? 1),
              safe.height / Math.max(1, image.height ?? 1)
            );
      image.set({
        left: safe.left + safe.width / 2,
        top: safe.top + safe.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        cornerColor: "#B8912A",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      const customImage = image as CustomFabricObject;
      customImage.isCustomImage = true;
      canvas.add(customImage);
      canvas.setActiveObject(customImage);
      canvas.requestRenderAll();
      setHasUploadedPhoto(true);

      customImage.uploadUrl = url;
      setUploadedUrls((current) =>
        config.fields.multipleImages ? [...current, url] : [url]
      );
      toast.success("Photo uploaded. Adjust it until it looks right.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function activeImage() {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const active = canvas.getActiveObject() as CustomFabricObject | undefined;
    if (active?.isCustomImage) return active;
    return customerObjects(canvas).find((object) => (object as CustomFabricObject).isCustomImage) ?? null;
  }

  function fitImage() {
    const canvas = fabricRef.current;
    const image = activeImage();
    if (!canvas || !image) return;
    const safe = getSafeArea();
    const scale = Math.min(
      safe.width / Math.max(1, image.width ?? 1),
      safe.height / Math.max(1, image.height ?? 1)
    );
    image.set({
      left: safe.left + safe.width / 2,
      top: safe.top + safe.height / 2,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale,
    });
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
  }

  function fillImage() {
    const canvas = fabricRef.current;
    const image = activeImage();
    if (!canvas || !image) return;
    const safe = getSafeArea();
    const scale = Math.max(
      safe.width / Math.max(1, image.width ?? 1),
      safe.height / Math.max(1, image.height ?? 1)
    );
    image.set({
      left: safe.left + safe.width / 2,
      top: safe.top + safe.height / 2,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale,
    });
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
  }

  function zoomImage(factor: number) {
    const canvas = fabricRef.current;
    const image = activeImage();
    if (!canvas || !image) return;
    image.set({
      scaleX: Math.max(0.05, (image.scaleX ?? 1) * factor),
      scaleY: Math.max(0.05, (image.scaleY ?? 1) * factor),
    });
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
  }

  function rotateImage(delta: number) {
    const canvas = fabricRef.current;
    const image = activeImage();
    if (!canvas || !image) return;
    image.rotate((image.angle ?? 0) + delta);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
  }

  function removeSelected() {
    const canvas = fabricRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object || (object as CustomFabricObject).isGuide) return;
    canvas.remove(object);
    canvas.discardActiveObject();
    setHasUploadedPhoto(customerObjects(canvas).some((item) => (item as CustomFabricObject).isCustomImage));
    canvas.requestRenderAll();
  }

  function resetCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    customerObjects(canvas).forEach((object) => canvas.remove(object));
    setUploadedUrls([]);
    setHasUploadedPhoto(false);
    setTextValue("");
    setApproved(false);
    setArtworkSnapshot(null);
    setQualityWarnings([]);
    canvas.requestRenderAll();
  }

  function addText() {
    if (!textValue.trim()) {
      toast.error("Type your text first.");
      return;
    }
    const canvas = fabricRef.current;
    if (!canvas) return;
    const safe = getSafeArea();
    const textbox = new fabric.Textbox(
      textValue.slice(0, config.fields.maxTextLength),
      {
        left: safe.left + safe.width / 2,
        top: safe.top + safe.height / 2,
        originX: "center",
        originY: "center",
        width: Math.min(300, safe.width * 0.7),
        fontFamily: font,
        fill: textColor,
        fontSize: 28,
        textAlign: "center",
        cornerColor: "#B8912A",
        cornerStyle: "circle",
        transparentCorners: false,
      }
    );
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
  }

  function updateSelectedText(next: { font?: string; color?: string }) {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "textbox") return;
    if (next.font) active.set("fontFamily", next.font);
    if (next.color) active.set("fill", next.color);
    canvas.requestRenderAll();
  }

  function scrollCustomizerIntoView() {
    requestAnimationFrame(() => {
      customizerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function showPreview() {
    const data = captureArtwork(2);
    if (data) setArtworkSnapshot(data);
    setMode("preview");
    scrollCustomizerIntoView();
  }

  function showDesign() {
    setMode("design");
    scrollCustomizerIntoView();
  }

  async function dataUrlToFile(dataUrl: string, filename: string) {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: "image/png" });
  }

  async function handleAddToCart() {
    if (!approved) {
      toast.error("Please approve the preview first.");
      return;
    }
    if (config.fields.sizeChoice && config.fields.sizes.length && !size) {
      toast.error("Please select a size.");
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas) return;
    setSubmitting(true);

    try {
      const previewData = captureArtwork(2);
      if (!previewData) throw new Error("Could not create preview.");

      const multiplier = output.widthPx / dimensions.width;
      const printData = captureArtwork(multiplier);
      if (!printData) throw new Error("Could not create print artwork.");

      const [previewImageUrl, printReadyArtworkUrl] = await Promise.all([
        uploadFile(await dataUrlToFile(previewData, "preview.png"), "previews"),
        uploadFile(await dataUrlToFile(printData, "print-ready.png"), "print-ready"),
      ]);

      const fabricJson = canvas.toObject(["isCustomImage", "isGuide", "uploadUrl"]) as Record<string, unknown>;
      const serializedObjects = Array.isArray(fabricJson.objects)
        ? (fabricJson.objects as Record<string, unknown>[])
        : [];
      serializedObjects.forEach((object) => {
        if (object.isCustomImage && typeof object.uploadUrl === "string") {
          object.src = object.uploadUrl;
        }
      });

      const designState: SavedDesignState = {
        version: 1,
        fabric: fabricJson as Record<string, unknown>,
        canvas: { width: dimensions.width, height: dimensions.height },
        template: {
          id: `${productId}:${template.templateVersion}`,
          version: template.templateVersion,
          printType: template.printType,
          shape: template.shape,
        },
        selectedVariant: {
          size: size || null,
          productColor: null,
        },
      };

      addLine({
        productId,
        slug,
        name,
        image: previewImageUrl,
        unitPrice: price,
        quantity: 1,
        customization: {
          uploadedImages: uploadedUrls,
          originalUploads: uploadedUrls,
          text: textValue || null,
          font: textValue ? font : null,
          textColor: textValue ? textColor : null,
          productColor: null,
          size: size || null,
          specialInstructions: instructions || null,
          previewImage: previewImageUrl,
          previewImageUrl,
          printReadyArtworkUrl,
          designState,
          templateId: designState.template.id,
          templateVersion: template.templateVersion,
          printOutput: {
            width: template.physical.width,
            height: template.physical.height,
            unit: template.physical.unit,
            dpi: template.physical.dpi,
            widthPx: output.widthPx,
            heightPx: output.heightPx,
          },
          qualityWarnings,
          approved: true,
        },
      });

      toast.success("Added to cart.");
      router.push("/cart");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your design.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedView = template.views.find((view) => view.id === selectedViewId) ?? template.views[0];
  const unitLabel = template.physical.unit === "cm" ? "cm" : "in";

  return (
    <div ref={customizerRef} className="mx-auto max-w-[1440px] scroll-mt-20 space-y-4 pb-24 lg:pb-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
            Customize
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-xl font-semibold text-navy sm:text-2xl">
              {name}
            </h2>
            <span className="text-sm font-bold text-red">₹{price}</span>
          </div>
          <p className="mt-1 text-xs text-navy/55">
            {template.printType === "cylindrical"
              ? "Design one full wrap. Front, Left and Right previews use the same artwork."
              : "Add your photo or text, adjust it, then review the product preview."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span
            className={`rounded-full px-3 py-1.5 ${
              mode === "design"
                ? "bg-navy text-white"
                : "bg-offwhite text-navy/55"
            }`}
          >
            1 · Design
          </span>
          <span className="h-px w-5 bg-border" />
          <span
            className={`rounded-full px-3 py-1.5 ${
              mode === "preview"
                ? "bg-navy text-white"
                : "bg-offwhite text-navy/55"
            }`}
          >
            2 · Preview
          </span>
          <span className="h-px w-5 bg-border" />
          <span className="rounded-full bg-offwhite px-3 py-1.5 text-navy/55">
            3 · Cart
          </span>
        </div>
      </div>

      {mode === "design" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <section className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal">
                    Design area
                  </p>
                  <h3 className="mt-0.5 font-display text-lg font-semibold text-navy">
                    Arrange your artwork
                  </h3>
                  <p className="mt-0.5 text-xs text-navy/50">
                    Dashed line = recommended safe print area.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-navy/65">
                  <span className="rounded-full border border-border bg-offwhite px-2.5 py-1">
                    {template.printType === "cylindrical" ? "Full wrap" : "Print area"}
                  </span>
                  <span className="rounded-full border border-border bg-offwhite px-2.5 py-1">
                    {template.physical.width} × {template.physical.height} {unitLabel}
                  </span>
                  <span className="rounded-full border border-border bg-offwhite px-2.5 py-1">
                    {output.widthPx} × {output.heightPx}px
                  </span>
                </div>
              </div>

              <div className="bg-[#F7F6F2] p-3 sm:p-6">
                <div
                  ref={editorViewportRef}
                  className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                  style={{
                    maxWidth: dimensions.width,
                    height: Math.max(1, dimensions.height * editorScale),
                  }}
                >
                  <div
                    className="absolute left-1/2 top-0"
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      transform: `translateX(-50%) scale(${editorScale})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <canvas ref={canvasElRef} className="touch-none" />
                  </div>
                </div>

                {template.printType === "cylindrical" && (
                  <div className="mx-auto mt-2 grid max-w-[640px] grid-cols-3 text-center text-[10px] font-semibold text-navy/40">
                    <span>Left wrap</span>
                    <span className="text-teal">Front</span>
                    <span>Right wrap</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-white px-3 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {hasUploadedPhoto && (
                    <>
                      <button
                        type="button"
                        onClick={fillImage}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        Fill area
                      </button>
                      <button
                        type="button"
                        onClick={fitImage}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        <Maximize2 size={13} className="mr-1 inline" />
                        Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => zoomImage(0.9)}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        Zoom −
                      </button>
                      <button
                        type="button"
                        onClick={() => zoomImage(1.1)}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        Zoom +
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateImage(-15)}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        Rotate ↶
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateImage(15)}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                      >
                        Rotate ↷
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={removeSelected}
                    disabled={!hasSelection}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite disabled:opacity-30"
                  >
                    <Trash2 size={13} className="mr-1 inline" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={resetCanvas}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-offwhite"
                  >
                    <RotateCcw size={13} className="mr-1 inline" />
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {qualityWarnings.map((warning) => (
              <div
                key={warning}
                className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900"
              >
                {warning}
              </div>
            ))}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {config.fields.imageUpload && (
              <section className="rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <Upload size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Your photo / artwork</h3>
                    <p className="text-[11px] text-navy/50">
                      JPG, PNG or WebP · up to 10 MB
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-2xl border-2 border-dashed border-gold/55 bg-gold/[0.04] px-4 py-5 text-center text-sm font-bold text-navy transition hover:bg-gold/[0.08] disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 size={21} className="mx-auto mb-2 animate-spin text-gold" />
                  ) : (
                    <Upload size={21} className="mx-auto mb-2 text-gold" />
                  )}
                  {hasUploadedPhoto ? "Replace artwork" : "Upload artwork"}
                  <span className="mt-1 block text-[11px] font-normal text-navy/45">
                    {uploading
                      ? `${uploadProgress}% uploaded`
                      : "You can reposition it in the design area"}
                  </span>
                </button>
              </section>
            )}

            {config.fields.text && (
              <section
                id="customizer-text-tool"
                className="rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Type size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">Add text</h3>
                    <p className="text-[11px] text-navy/50">
                      Add a name, message or short line
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={textValue}
                    onChange={(event) => setTextValue(event.target.value)}
                    maxLength={config.fields.maxTextLength}
                    className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-gold"
                    placeholder="Type your text"
                  />
                  <button
                    type="button"
                    onClick={addText}
                    className="rounded-xl bg-navy px-4 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>

                {config.fields.fontChoice && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                      Font
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.fields.fonts.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setFont(option);
                            updateSelectedText({ font: option });
                          }}
                          className={`rounded-full border px-2.5 py-1.5 text-[11px] ${
                            font === option
                              ? "border-navy bg-navy text-white"
                              : "border-border text-navy"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config.fields.textColorChoice && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                      Text colour
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {config.fields.colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Use ${color}`}
                          onClick={() => {
                            setTextColor(color);
                            updateSelectedText({ color });
                          }}
                          className={`h-8 w-8 rounded-full border-2 ${
                            textColor === color
                              ? "border-gold ring-2 ring-gold/20"
                              : "border-white ring-1 ring-border"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-border bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-teal" />
                <div className="text-[11px] leading-relaxed text-navy/55">
                  <p className="font-semibold text-navy">Print-safe workflow</p>
                  <p className="mt-0.5">
                    Original upload and editable design state are kept with your order.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={showPreview}
                className="mt-4 w-full rounded-full bg-navy py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy/90"
              >
                <Eye size={15} className="mr-2 inline" />
                Preview on product
              </button>
            </section>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
          <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-xs">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal">
                  Product preview
                </p>
                <h3 className="mt-0.5 font-display text-lg font-semibold text-navy">
                  Check every visible side
                </h3>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {template.views.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setSelectedViewId(view.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      selectedView?.id === view.id
                        ? "border-navy bg-navy text-white"
                        : "border-border bg-white text-navy hover:bg-offwhite"
                    }`}
                  >
                    {view.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 bg-[#F7F6F2] p-3 sm:p-5 lg:grid-cols-[92px_minmax(0,1fr)]">
              <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col">
                {template.views.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setSelectedViewId(view.id)}
                    className={`shrink-0 rounded-2xl border bg-white p-1.5 transition ${
                      selectedView?.id === view.id
                        ? "border-navy ring-2 ring-navy/10"
                        : "border-border"
                    }`}
                  >
                    <div className="relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-offwhite">
                      {artworkSnapshot || view.mockupUrl ? (
                        <ProductPreviewRenderer
                          artworkUrl={artworkSnapshot}
                          template={template}
                          view={view}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-navy/40">
                          {view.name}
                        </div>
                      )}
                    </div>
                    <span className="mt-1 block text-[10px] font-bold text-navy">
                      {view.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="order-1 flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white lg:order-2 lg:min-h-[560px]">
                <div className="relative aspect-square w-full max-w-[620px]">
                  {selectedView ? (
                    <ProductPreviewRenderer
                      artworkUrl={artworkSnapshot}
                      template={template}
                      view={selectedView}
                      priority
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-navy/50 sm:px-5">
              <span>
                {selectedView?.name} ·{" "}
                {template.printType === "cylindrical"
                  ? "3D UV product preview"
                  : "Product preview"}
              </span>
              <button
                type="button"
                onClick={showDesign}
                className="font-bold text-navy"
              >
                ← Edit design
              </button>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                Final review
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-navy">
                Ready to order?
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-navy/50">
                Check the artwork position on every available view before approval.
              </p>

              {config.fields.sizeChoice && config.fields.sizes.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                    Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.fields.sizes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSize(option)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                          size === option
                            ? "border-navy bg-navy text-white"
                            : "border-border text-navy"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.fields.specialInstructions && (
                <div className="mt-4">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-navy/45">
                    Special instructions
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Optional note for production"
                    className="w-full resize-none rounded-xl border border-border px-3 py-2.5 text-xs outline-none focus:border-gold"
                  />
                </div>
              )}

              <div className="mt-4 rounded-xl bg-offwhite p-3 text-[11px] leading-relaxed text-navy/65">
                <p>
                  <CheckCircle2 size={13} className="mr-1 inline text-teal" />
                  Print file: {output.widthPx} × {output.heightPx}px at{" "}
                  {template.physical.dpi} DPI
                </p>
                <p className="mt-1">
                  <ShieldCheck size={13} className="mr-1 inline text-teal" />
                  Original upload + editable design state saved with order
                </p>
              </div>

              <label className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-white p-3 text-xs leading-relaxed text-navy/80">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(event) => setApproved(event.target.checked)}
                  className="mt-0.5 accent-gold"
                />
                <span>I have reviewed and approved this design for production.</span>
              </label>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={submitting || !approved || uploading}
                className="mt-4 w-full rounded-full bg-gold py-4 font-bold text-navy-dark shadow-sm transition hover:brightness-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 inline animate-spin" />
                    Saving design...
                  </>
                ) : (
                  "Add to Cart"
                )}
              </button>

              <button
                type="button"
                onClick={showDesign}
                className="mt-3 w-full py-2 text-xs font-bold text-navy/55"
              >
                ← Back to editing
              </button>
            </section>
          </aside>
        </div>
      )}

      {mode === "design" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-3 py-2 shadow-[0_-8px_30px_rgba(27,42,74,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!config.fields.imageUpload || uploading}
              className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[10px] font-bold text-navy disabled:opacity-35"
            >
              <Upload size={18} className="mb-0.5" />
              Photo
            </button>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("customizer-text-tool")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              disabled={!config.fields.text}
              className="flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[10px] font-bold text-navy disabled:opacity-35"
            >
              <Type size={18} className="mb-0.5" />
              Text
            </button>
            <button
              type="button"
              onClick={showPreview}
              className="flex flex-col items-center justify-center rounded-xl bg-navy px-2 py-2 text-[10px] font-bold text-white"
            >
              <Eye size={18} className="mb-0.5" />
              Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
