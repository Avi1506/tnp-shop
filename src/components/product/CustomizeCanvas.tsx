"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as fabric from "fabric";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  Eye,
  ImagePlus,
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
import { outputPixels, resolveProductTemplate, sourceStyle } from "@/lib/print-template";
import Cylindrical3DPreview from "@/components/product/Cylindrical3DPreview";
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

function previewMaskStyle(template: PrintTemplate): React.CSSProperties {
  if (template.shape === "circle") return { borderRadius: "50%", overflow: "hidden" };
  if (template.shape === "heart") {
    return {
      clipPath:
        "polygon(50% 92%, 38% 82%, 26% 72%, 15% 60%, 8% 46%, 8% 30%, 15% 17%, 28% 10%, 40% 13%, 50% 25%, 60% 13%, 72% 10%, 85% 17%, 92% 30%, 92% 46%, 85% 60%, 74% 72%, 62% 82%)",
      overflow: "hidden",
    };
  }
  if (template.shape === "custom-mask" && template.maskUrl) {
    return {
      WebkitMaskImage: `url("${template.maskUrl}")`,
      maskImage: `url("${template.maskUrl}")`,
      WebkitMaskSize: "100% 100%",
      maskSize: "100% 100%",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      overflow: "hidden",
    };
  }
  return { overflow: "hidden" };
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { addLine } = useCart();
  const router = useRouter();

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

      const localUrl = URL.createObjectURL(file);
      const image = await fabric.FabricImage.fromURL(localUrl, { crossOrigin: "anonymous" });
      URL.revokeObjectURL(localUrl);

      const canvas = fabricRef.current;
      if (!canvas) throw new Error("Editor is not ready.");

      if (!config.fields.multipleImages) {
        customerObjects(canvas)
          .filter((object) => (object as CustomFabricObject).isCustomImage)
          .forEach((object) => canvas.remove(object));
      }

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

      const url = await uploadFile(file, "customizations", setUploadProgress);
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

  function showPreview() {
    const data = captureArtwork(2);
    if (data) setArtworkSnapshot(data);
    setMode("preview");
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
    <div className="space-y-6">
      {mode === "design" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-navy/70">
              <span className="rounded-full border border-border bg-white px-3 py-1">
                {template.printType === "cylindrical" ? "Full Wrap" : "Print Area"}
              </span>
              <span className="rounded-full border border-border bg-white px-3 py-1">
                {template.physical.width} × {template.physical.height} {unitLabel}
              </span>
              <span className="rounded-full border border-border bg-white px-3 py-1">
                {template.physical.dpi} DPI · {output.widthPx} × {output.heightPx}px
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-white p-3 sm:p-5 shadow-xs">
              <div
                className="relative mx-auto overflow-hidden rounded-xl border border-border bg-[#FAF9F6] [&_.canvas-container]:!w-full [&_.canvas-container]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full"
                style={{ maxWidth: dimensions.width, aspectRatio: `${dimensions.width}/${dimensions.height}` }}
              >
                <canvas ref={canvasElRef} className="touch-none" />
              </div>
              {template.printType === "cylindrical" && (
                <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-medium text-navy/50">
                  <span>Left</span><span className="text-teal">Front</span><span>Right</span>
                </div>
              )}
            </div>

            {qualityWarnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {warning}
              </div>
            ))}

            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={removeSelected} disabled={!hasSelection} className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy disabled:opacity-30">
                <Trash2 size={13} className="inline mr-1" /> Delete
              </button>
              <button type="button" onClick={resetCanvas} className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy">
                <RotateCcw size={13} className="inline mr-1" /> Reset
              </button>
              <button type="button" onClick={showPreview} className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white">
                <Eye size={13} className="inline mr-1" /> Preview
              </button>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-xs">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy">{name}</h2>
              <p className="font-bold text-red">Starting ₹{price}</p>
            </div>

            {config.fields.imageUpload && (
              <div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full rounded-xl border-2 border-dashed border-gold/60 px-4 py-5 text-center text-sm font-semibold text-navy disabled:opacity-60">
                  {uploading ? <Loader2 size={20} className="mx-auto mb-1 animate-spin text-gold" /> : <Upload size={20} className="mx-auto mb-1 text-gold" />}
                  {hasUploadedPhoto ? "Replace Photo" : "Upload Photo"}
                  {uploading && <span className="mt-1 block text-[11px] text-navy/50">{uploadProgress}% uploaded</span>}
                </button>
                {hasUploadedPhoto && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={fillImage} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      Fill
                    </button>
                    <button type="button" onClick={fitImage} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      <Maximize2 size={12} className="inline mr-1" /> Fit
                    </button>
                    <button type="button" onClick={() => zoomImage(0.9)} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      Zoom −
                    </button>
                    <button type="button" onClick={() => zoomImage(1.1)} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      Zoom +
                    </button>
                    <button type="button" onClick={() => rotateImage(-15)} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      Rotate ↶
                    </button>
                    <button type="button" onClick={() => rotateImage(15)} className="rounded-lg border border-border py-2 text-xs font-semibold text-navy">
                      Rotate ↷
                    </button>
                  </div>
                )}
              </div>
            )}

            {config.fields.text && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy/60"><Type size={13} className="inline mr-1" /> Add Text</p>
                <div className="flex gap-2">
                  <input value={textValue} onChange={(event) => setTextValue(event.target.value)} maxLength={config.fields.maxTextLength} className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-gold" placeholder="Your text" />
                  <button type="button" onClick={addText} className="rounded-lg bg-navy px-3 text-xs font-semibold text-white"><ImagePlus size={14} /></button>
                </div>
                {config.fields.fontChoice && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {config.fields.fonts.map((option) => (
                      <button key={option} type="button" onClick={() => { setFont(option); updateSelectedText({ font: option }); }} className={`rounded-full border px-2.5 py-1 text-[11px] ${font === option ? "border-navy bg-navy text-white" : "border-border text-navy"}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {config.fields.textColorChoice && (
                  <div className="mt-3 flex gap-2">
                    {config.fields.colors.map((color) => (
                      <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => { setTextColor(color); updateSelectedText({ color }); }} className={`h-7 w-7 rounded-full border-2 ${textColor === color ? "border-gold" : "border-transparent"}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="button" onClick={showPreview} className="w-full rounded-full bg-navy py-3.5 text-sm font-semibold text-white">
              Preview
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[110px_minmax(0,1fr)_360px] gap-5 items-start">
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {template.views.map((view) => (
              <button key={view.id} type="button" onClick={() => setSelectedViewId(view.id)} className={`shrink-0 rounded-xl border p-1.5 ${selectedView?.id === view.id ? "border-navy ring-2 ring-navy/10" : "border-border"}`}>
                <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-offwhite">
                  {template.printType === "cylindrical" && artworkSnapshot ? (
                    <Cylindrical3DPreview
                      artworkUrl={artworkSnapshot}
                      template={template}
                      view={view}
                    />
                  ) : view.mockupUrl ? (
                    <Image src={view.mockupUrl} alt={view.name} fill className="object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-navy/40">No mockup</div>
                  )}
                </div>
                <span className="mt-1 block text-[10px] font-semibold text-navy">{view.name}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-xs">
            <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-xl bg-offwhite">
              {template.printType === "cylindrical" && selectedView && artworkSnapshot ? (
                <Cylindrical3DPreview
                  artworkUrl={artworkSnapshot}
                  template={template}
                  view={selectedView}
                />
              ) : (
                <>
                  {selectedView?.mockupUrl ? (
                    <Image
                      src={selectedView.mockupUrl}
                      alt={selectedView.name}
                      fill
                      className="object-contain"
                      priority
                    />
                  ) : null}
                  {selectedView && artworkSnapshot && (
                    <div
                      className="absolute"
                      style={{
                        left: `${selectedView.printArea.xPct}%`,
                        top: `${selectedView.printArea.yPct}%`,
                        width: `${selectedView.printArea.widthPct}%`,
                        height: `${selectedView.printArea.heightPct}%`,
                        transform: `rotate(${selectedView.rotation ?? 0}deg)`,
                        transformOrigin: "center",
                        ...previewMaskStyle(template),
                      }}
                    >
                      <div className="relative h-full w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={artworkSnapshot}
                          alt="Your design preview"
                          className="absolute max-w-none"
                          style={{
                            ...sourceStyle(selectedView.source),
                            objectFit: "fill",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-navy/60">
              {selectedView?.name} · {template.printType === "cylindrical" ? "3D wrap preview from your full flat artwork." : "preview from your saved design."}
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-xs">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Final Review</p>
              <h2 className="font-display text-xl font-semibold text-navy">Check your design</h2>
            </div>

            {config.fields.sizeChoice && config.fields.sizes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy/60">Size</p>
                <div className="flex flex-wrap gap-2">
                  {config.fields.sizes.map((option) => (
                    <button key={option} type="button" onClick={() => setSize(option)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${size === option ? "border-navy bg-navy text-white" : "border-border text-navy"}`}>{option}</button>
                  ))}
                </div>
              </div>
            )}

            {config.fields.specialInstructions && (
              <textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Special instructions (optional)" className="w-full resize-none rounded-lg border border-border px-3 py-2 text-xs outline-none focus:border-gold" />
            )}

            <div className="rounded-xl bg-offwhite p-3 text-xs text-navy/70">
              <p><CheckCircle2 size={13} className="inline mr-1 text-teal" /> Print output: {output.widthPx} × {output.heightPx}px at {template.physical.dpi} DPI</p>
              <p className="mt-1"><ShieldCheck size={13} className="inline mr-1 text-teal" /> Original upload + editable design state are saved with the order.</p>
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-border bg-offwhite p-3 text-xs text-navy/80">
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="mt-0.5 accent-gold" />
              I have reviewed and approved this design for production.
            </label>

            <button type="button" onClick={handleAddToCart} disabled={submitting || !approved || uploading} className="w-full rounded-full bg-gold py-4 font-semibold text-navy-dark disabled:opacity-50">
              {submitting ? <><Loader2 size={16} className="inline mr-2 animate-spin" />Saving design...</> : "Add to Cart"}
            </button>
            <button type="button" onClick={() => setMode("design")} className="w-full text-xs font-semibold text-navy/60">← Edit design</button>
          </div>
        </div>
      )}
    </div>
  );
}
