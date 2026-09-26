"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import toast from "react-hot-toast";
import {
  Upload,
  Type,
  Trash2,
  RotateCcw,
  Loader2,
  ImagePlus,
  Maximize2,
  Sparkles,
  Eye,
  Pencil,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { CustomizationConfig } from "@/db/schema";

const CANVAS_SIZE = 520;

// Angle options for products like mugs
type MockupAngle = {
  id: string;
  name: string;
  url: string;
  printArea: { xPct: number; yPct: number; widthPct: number; heightPct: number };
};

export default function CustomizeCanvas({
  productId,
  slug,
  name,
  price,
  config,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  config: CustomizationConfig;
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const guideRef = useRef<fabric.FabricObject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab state: "design" (edit canvas) vs "preview" (Zazzle realistic product preview)
  const [activeTab, setActiveTab] = useState<"design" | "preview">("design");

  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [font, setFont] = useState(config.fields.fonts[0] ?? "Poppins");
  const [textColor, setTextColor] = useState(config.fields.colors[0] ?? "#1B2A4A");
  const [size, setSize] = useState(config.fields.sizes[0] ?? "");
  const [instructions, setInstructions] = useState("");
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [hasUploadedPhoto, setHasUploadedPhoto] = useState(false);

  // Preview snapshot state
  const [designSnapshot, setDesignSnapshot] = useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<string>("front");

  const { addLine } = useCart();
  const router = useRouter();

  const isMug = name.toLowerCase().includes("mug") || name.toLowerCase().includes("cup");
  const shape = config.shape ?? "rectangle";
  const dimensions = config.dimensions ?? {
    widthInches: isMug ? 7.5 : 8,
    heightInches: isMug ? 3.5 : 8,
  };

  // Multiple angle mockups for mugs (Front, Left Handle, Right Handle)
  const angleMockups: MockupAngle[] = isMug
    ? [
        {
          id: "front",
          name: "Front View",
          url: "/images/mockups/mug-front.jpg",
          printArea: { xPct: 28, yPct: 28, widthPct: 44, heightPct: 52 },
        },
        {
          id: "handle-left",
          name: "Right Angle",
          url: "/images/mockups/mug-handle-left.jpg",
          printArea: { xPct: 36, yPct: 28, widthPct: 42, heightPct: 52 },
        },
        {
          id: "handle-right",
          name: "Left Angle",
          url: "/images/mockups/mug-handle-right.jpg",
          printArea: { xPct: 22, yPct: 28, widthPct: 42, heightPct: 52 },
        },
      ]
    : [
        {
          id: "front",
          name: "Front View",
          url: config.mockupImage || "/images/mockups/mug-front.jpg",
          printArea: config.printArea,
        },
      ];

  const currentAngleObj = angleMockups.find((a) => a.id === selectedAngle) || angleMockups[0];

  const printAreaBox = useCallback(() => {
    const pa = config.printArea;
    return {
      left: (pa.xPct / 100) * CANVAS_SIZE,
      top: (pa.yPct / 100) * CANVAS_SIZE,
      width: (pa.widthPct / 100) * CANVAS_SIZE,
      height: (pa.heightPct / 100) * CANVAS_SIZE,
    };
  }, [config.printArea]);

  // Helper: draw Zazzle-style "YOUR IMAGE HERE" placeholder on canvas
  const renderPlaceholder = useCallback((canvas: fabric.Canvas) => {
    canvas.getObjects().forEach((obj) => {
      if ((obj as unknown as { isPlaceholder?: boolean }).isPlaceholder) {
        canvas.remove(obj);
      }
    });

    const box = printAreaBox();
    const isCircle = shape === "circle";
    const radius = Math.min(box.width, box.height) / 2;

    const bg = isCircle
      ? new fabric.Circle({
          left: box.left + radius,
          top: box.top + radius,
          radius: radius - 4,
          originX: "center",
          originY: "center",
          fill: "rgba(255, 255, 255, 0.75)",
          stroke: "rgba(184, 145, 42, 0.7)",
          strokeDashArray: [6, 4],
          strokeWidth: 1.5,
          selectable: false,
          hoverCursor: "pointer",
        })
      : new fabric.Rect({
          left: box.left + 2,
          top: box.top + 2,
          width: box.width - 4,
          height: box.height - 4,
          rx: 8,
          ry: 8,
          fill: "rgba(255, 255, 255, 0.75)",
          stroke: "rgba(184, 145, 42, 0.7)",
          strokeDashArray: [6, 4],
          strokeWidth: 1.5,
          selectable: false,
          hoverCursor: "pointer",
        });

    const titleText = new fabric.FabricText("YOUR IMAGE HERE", {
      left: box.left + box.width / 2,
      top: box.top + box.height / 2 - 10,
      originX: "center",
      originY: "center",
      fontSize: Math.max(13, Math.min(18, box.width / 16)),
      fontWeight: "bold",
      fill: "#1B2A4A",
      fontFamily: "Poppins",
      selectable: false,
      hoverCursor: "pointer",
    });

    const subText = new fabric.FabricText("Click or tap to upload photo", {
      left: box.left + box.width / 2,
      top: box.top + box.height / 2 + 14,
      originX: "center",
      originY: "center",
      fontSize: Math.max(10, Math.min(12, box.width / 26)),
      fill: "#B8912A",
      fontFamily: "Poppins",
      selectable: false,
      hoverCursor: "pointer",
    });

    (bg as unknown as { isPlaceholder?: boolean }).isPlaceholder = true;
    (titleText as unknown as { isPlaceholder?: boolean }).isPlaceholder = true;
    (subText as unknown as { isPlaceholder?: boolean }).isPlaceholder = true;

    canvas.add(bg, titleText, subText);
    canvas.renderAll();
  }, [printAreaBox, shape]);

  // Load the product mockup background safely
  const loadBackgroundMockup = useCallback((canvas: fabric.Canvas, url: string) => {
    const imgObj = new window.Image();
    imgObj.crossOrigin = "anonymous";
    imgObj.onload = () => {
      const fbImg = new fabric.FabricImage(imgObj);
      const scale = Math.min(CANVAS_SIZE / (fbImg.width ?? 1), CANVAS_SIZE / (fbImg.height ?? 1));
      fbImg.set({
        scaleX: scale,
        scaleY: scale,
        left: CANVAS_SIZE / 2,
        top: CANVAS_SIZE / 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = fbImg;
      canvas.renderAll();
    };
    imgObj.onerror = () => {
      // Fallback to local default mockup if remote image fails
      const fallback = new window.Image();
      fallback.onload = () => {
        const fbImg = new fabric.FabricImage(fallback);
        const scale = Math.min(CANVAS_SIZE / (fbImg.width ?? 1), CANVAS_SIZE / (fbImg.height ?? 1));
        fbImg.set({
          scaleX: scale,
          scaleY: scale,
          left: CANVAS_SIZE / 2,
          top: CANVAS_SIZE / 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = fbImg;
        canvas.renderAll();
      };
      fallback.src = "/images/mockups/mug-front.jpg";
    };
    imgObj.src = url;
  }, []);

  // ---- init canvas -------------------------------------------------------
  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "#FAF9F6",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const bgUrl = config.mockupImage || "/images/mockups/mug-front.jpg";
    loadBackgroundMockup(canvas, bgUrl);

    // Draw the printable-area guide
    const pa = config.printArea;
    const isCircle = shape === "circle";
    let guide: fabric.FabricObject;

    if (isCircle) {
      const radius = Math.min((pa.widthPct / 100) * CANVAS_SIZE, (pa.heightPct / 100) * CANVAS_SIZE) / 2;
      guide = new fabric.Circle({
        left: (pa.xPct / 100) * CANVAS_SIZE + radius,
        top: (pa.yPct / 100) * CANVAS_SIZE + radius,
        radius: radius,
        originX: "center",
        originY: "center",
        fill: "transparent",
        stroke: "#B8912A",
        strokeDashArray: [6, 4],
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
      });
    } else {
      guide = new fabric.Rect({
        left: (pa.xPct / 100) * CANVAS_SIZE,
        top: (pa.yPct / 100) * CANVAS_SIZE,
        width: (pa.widthPct / 100) * CANVAS_SIZE,
        height: (pa.heightPct / 100) * CANVAS_SIZE,
        rx: 6,
        ry: 6,
        fill: "transparent",
        stroke: "#B8912A",
        strokeDashArray: [6, 4],
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
      });
    }

    guideRef.current = guide;
    canvas.add(guide);

    // Add "Your Image Here" placeholder if image uploads are enabled
    if (config.fields.imageUpload) {
      renderPlaceholder(canvas);
    }

    canvas.on("mouse:down", (opt) => {
      if (opt.target && (opt.target as unknown as { isPlaceholder?: boolean }).isPlaceholder) {
        fileInputRef.current?.click();
      }
    });

    const onSelection = () => setHasSelection(true);
    const onCleared = () => setHasSelection(false);
    canvas.on("selection:created", onSelection);
    canvas.on("selection:updated", onSelection);
    canvas.on("selection:cleared", onCleared);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- upload + place or replace photo -----------------------------------
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let localUrl = "";
    try {
      localUrl = URL.createObjectURL(file);
      const canvas = fabricRef.current;
      if (canvas) {
        // Remove existing placeholders & previous custom image if single image mode
        const objects = canvas.getObjects();
        objects.forEach((obj) => {
          const customObj = obj as unknown as { isPlaceholder?: boolean; isCustomImage?: boolean };
          if (customObj.isPlaceholder || (!config.fields.multipleImages && customObj.isCustomImage)) {
            canvas.remove(obj);
          }
        });

        const img = await fabric.FabricImage.fromURL(localUrl, { crossOrigin: "anonymous" });
        const box = printAreaBox();
        const scale = Math.min(box.width / (img.width ?? 1), box.height / (img.height ?? 1));
        img.set({
          left: box.left + box.width / 2,
          top: box.top + box.height / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          cornerColor: "#B8912A",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        (img as unknown as { isCustomImage?: boolean }).isCustomImage = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setHasUploadedPhoto(true);
      }

      // Upload file to Cloudflare R2 via server endpoint
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "customizations");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload photo.");
      }

      const finalUrl = data.url;
      setUploadedUrls((prev) =>
        config.fields.multipleImages ? [...prev, finalUrl] : [finalUrl]
      );
      toast.success("Photo placed! Drag, resize or rotate to fit.");
    } catch (err) {
      console.error("[upload error]", err);
      toast.error(
        err instanceof Error ? err.message : "Could not upload photo. Please try again."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Switch to Preview / Review mode (Zazzle Photo 5)
  function handleSwitchToPreview() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Temporarily hide guide border & placeholders
    if (guideRef.current) guideRef.current.set({ opacity: 0 });
    canvas.getObjects().forEach((obj) => {
      if ((obj as unknown as { isPlaceholder?: boolean }).isPlaceholder) {
        obj.set({ opacity: 0 });
      }
    });
    canvas.discardActiveObject();
    canvas.renderAll();

    // Snapshot of the design
    const snapshot = canvas.toDataURL({ format: "png", quality: 0.95, multiplier: 1.5 });

    // Restore guide & placeholders on design canvas
    if (guideRef.current) guideRef.current.set({ opacity: 1 });
    canvas.getObjects().forEach((obj) => {
      if ((obj as unknown as { isPlaceholder?: boolean }).isPlaceholder) {
        obj.set({ opacity: 1 });
      }
    });
    canvas.renderAll();

    setDesignSnapshot(snapshot);
    setActiveTab("preview");
  }

  // ---- fit/center active or custom image ----------------------------------
  function handleFitImage() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = printAreaBox();
    const active = canvas.getActiveObject() || canvas.getObjects().find((o) => (o as unknown as { isCustomImage?: boolean }).isCustomImage);
    if (active && (active.type === "image" || (active as unknown as { isCustomImage?: boolean }).isCustomImage)) {
      const scale = Math.min(box.width / (active.width ?? 1), box.height / (active.height ?? 1));
      active.set({
        left: box.left + box.width / 2,
        top: box.top + box.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        angle: 0,
      });
      canvas.setActiveObject(active);
      canvas.renderAll();
      toast.success("Photo fitted to print area");
    }
  }

  function handleFillArea() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = printAreaBox();
    const active = canvas.getActiveObject() || canvas.getObjects().find((o) => (o as unknown as { isCustomImage?: boolean }).isCustomImage);
    if (active && (active.type === "image" || (active as unknown as { isCustomImage?: boolean }).isCustomImage)) {
      const scale = Math.max(box.width / (active.width ?? 1), box.height / (active.height ?? 1));
      active.set({
        left: box.left + box.width / 2,
        top: box.top + box.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        angle: 0,
      });
      canvas.setActiveObject(active);
      canvas.renderAll();
      toast.success("Photo filled across print area");
    }
  }

  function handleRemovePhoto() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if ((obj as unknown as { isCustomImage?: boolean }).isCustomImage) {
        canvas.remove(obj);
      }
    });
    canvas.discardActiveObject();
    setUploadedUrls([]);
    setHasUploadedPhoto(false);

    renderPlaceholder(canvas);
    toast.success("Photo removed");
  }

  // ---- add / update text --------------------------------------------------
  function handleAddText() {
    if (!textValue.trim()) {
      toast.error("Type something first");
      return;
    }
    const canvas = fabricRef.current;
    if (!canvas) return;
    const box = printAreaBox();
    const textbox = new fabric.Textbox(textValue.slice(0, config.fields.maxTextLength), {
      left: box.left + box.width / 2,
      top: box.top + box.height / 2,
      originX: "center",
      originY: "center",
      fontFamily: font,
      fill: textColor,
      fontSize: 26,
      width: box.width * 0.9,
      textAlign: "center",
      cornerColor: "#B8912A",
      cornerStyle: "circle",
      transparentCorners: false,
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
  }

  function applyStyleToSelection(next: { font?: string; color?: string }) {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      if (next.font) obj.set("fontFamily", next.font);
      if (next.color) obj.set("fill", next.color);
      canvas?.renderAll();
    }
  }

  function handleDeleteSelected() {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && canvas) {
      if ((obj as unknown as { isCustomImage?: boolean }).isCustomImage) {
        setHasUploadedPhoto(false);
        setUploadedUrls([]);
        renderPlaceholder(canvas);
      }
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }

  function handleReset() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((o) => {
      if (o !== guideRef.current) canvas.remove(o);
    });
    canvas.discardActiveObject();
    setUploadedUrls([]);
    setHasUploadedPhoto(false);
    setTextValue("");
    setApproved(false);
    renderPlaceholder(canvas);
  }

  // ---- submit: render final preview, upload it, add to cart -------------
  async function handleAddToCart() {
    if (!approved) {
      toast.error("Please review and check the approval checkbox first.");
      return;
    }
    if (config.fields.sizeChoice && config.fields.sizes.length && !size) {
      toast.error("Please select a size.");
      return;
    }

    setSubmitting(true);
    try {
      const canvas = fabricRef.current;
      let finalSnapshot = designSnapshot;

      if (canvas) {
        if (guideRef.current) guideRef.current.set({ opacity: 0 });
        canvas.getObjects().forEach((obj) => {
          if ((obj as unknown as { isPlaceholder?: boolean }).isPlaceholder) {
            obj.set({ opacity: 0 });
          }
        });
        canvas.discardActiveObject();
        canvas.renderAll();
        finalSnapshot = canvas.toDataURL({ format: "png", quality: 0.95, multiplier: 1.5 });
      }

      let previewImageUrl = finalSnapshot || "/images/mockups/mug-front.jpg";

      if (finalSnapshot) {
        try {
          const blob = await (await fetch(finalSnapshot)).blob();
          const fd = new FormData();
          fd.append("file", new File([blob], "preview.png", { type: "image/png" }));
          fd.append("folder", "previews");
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (res.ok && data.url) {
            previewImageUrl = data.url;
          }
        } catch {
          // Fallback to dataUrl on upload error
        }
      }

      addLine({
        productId,
        slug,
        name,
        image: previewImageUrl,
        unitPrice: price,
        quantity: 1,
        customization: {
          uploadedImages: uploadedUrls,
          text: textValue || null,
          font: textValue ? font : null,
          textColor: textValue ? textColor : null,
          productColor: null,
          size: size || null,
          specialInstructions: instructions || null,
          previewImage: previewImageUrl,
          approved: true,
        },
      });
      toast.success("Added to cart!");
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* Zazzle-style Top Nav Bar: Design vs Preview */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2 bg-offwhite p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("design")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === "design"
                ? "bg-white text-navy shadow-xs border border-border"
                : "text-navy/60 hover:text-navy"
            }`}
          >
            <Pencil size={15} />
            <span>1. Design &amp; Edit</span>
          </button>
          <button
            type="button"
            onClick={handleSwitchToPreview}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === "preview"
                ? "bg-navy text-white shadow-xs"
                : "text-navy/60 hover:text-navy"
            }`}
          >
            <Eye size={15} />
            <span>2. Preview &amp; Review</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "design" ? (
            <button
              type="button"
              onClick={handleSwitchToPreview}
              className="flex items-center gap-2 bg-gold text-navy-dark text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full hover:brightness-110 shadow-sm transition active:scale-95"
            >
              <span>Review Mockup</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("design")}
              className="text-xs font-semibold text-navy/70 hover:text-navy underline flex items-center gap-1"
            >
              ← Edit Design
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DESIGN MODE */}
      <div className={activeTab === "design" ? "block" : "hidden"}>
        <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 w-full overflow-x-hidden">
          {/* Canvas Area */}
          <div className="w-full">
            {/* Dimensions Badge & Safe Area Banner */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-navy">
                <span className="inline-block w-2 h-2 rounded-full bg-teal animate-pulse" />
                Live Canvas Editor
              </div>
              <div className="text-[11px] font-semibold text-navy/80 bg-white px-3 py-1 rounded-full border border-border shadow-xs flex items-center gap-1">
                <Sparkles size={11} className="text-gold" />
                <span>
                  Print Area: {dimensions.widthInches}&quot; × {dimensions.heightInches}&quot; ({shape})
                </span>
              </div>
            </div>

            {/* Canvas Box with Zazzle-style Dimension Guides */}
            <div className="relative w-full max-w-[520px] mx-auto rounded-2xl border border-border bg-offwhite p-2 sm:p-4 flex flex-col items-center justify-center overflow-hidden shadow-xs">
              {/* Width dimension label (8.5 in / 7.5 in) */}
              <div className="w-full flex items-center justify-center gap-2 mb-1.5 text-[11px] font-semibold text-navy/60">
                <span className="h-px bg-border flex-1" />
                <span>↔ {dimensions.widthInches} in Width</span>
                <span className="h-px bg-border flex-1" />
              </div>

              <div className="relative w-full aspect-square flex items-center justify-center [&_.canvas-container]:!w-full [&_.canvas-container]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!max-w-full">
                <canvas ref={canvasElRef} className="rounded-lg shadow-inner touch-none" />
              </div>

              {/* Height dimension label */}
              <div className="w-full flex items-center justify-between mt-1.5 text-[11px] font-semibold text-navy/50 px-1">
                <span className="text-gold font-medium">● Safe Print Area (Dashed Box)</span>
                <span>↕ {dimensions.heightInches} in Height</span>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-navy/60 mt-3 text-center px-2">
              The dashed guide shows your exact printable area. Drag, scale (corner handles) or rotate your photo.
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4">
              <button
                onClick={handleDeleteSelected}
                disabled={!hasSelection}
                className="text-xs font-semibold py-2 px-3 rounded-xl border border-border flex items-center gap-1.5 text-navy/80 hover:text-red hover:border-red/40 disabled:opacity-30 disabled:cursor-not-allowed transition bg-white shadow-xs"
              >
                <Trash2 size={13} /> Delete Selected
              </button>
              <button
                onClick={handleReset}
                className="text-xs font-semibold py-2 px-3 rounded-xl border border-border flex items-center gap-1.5 text-navy/80 hover:text-red hover:border-red/40 transition bg-white shadow-xs"
              >
                <RotateCcw size={13} /> Reset All
              </button>
              <button
                onClick={handleSwitchToPreview}
                className="text-xs font-semibold py-2 px-3.5 rounded-xl bg-navy text-white hover:bg-navy-dark transition flex items-center gap-1.5 shadow-xs"
              >
                <Eye size={13} /> 👁️ View Mockup
              </button>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-6 bg-white p-4 sm:p-6 rounded-2xl border border-border md:border-0 md:p-0 md:bg-transparent">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-navy mb-1">{name}</h2>
              <p className="text-red font-bold text-lg">Starting ₹{price}</p>
            </div>

            {config.fields.imageUpload && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                    {hasUploadedPhoto ? "Your Uploaded Photo" : "Upload Your Photo"}
                  </p>
                  {hasUploadedPhoto && (
                    <span className="text-[11px] font-semibold text-teal">✓ Photo on canvas</span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`w-full border-2 border-dashed rounded-xl py-4 sm:py-5 flex flex-col items-center justify-center gap-1.5 transition active:scale-[0.99] disabled:opacity-60 ${
                    hasUploadedPhoto
                      ? "border-teal/60 bg-teal/5 text-navy"
                      : "border-gold/60 text-navy/70 hover:bg-offwhite"
                  }`}
                >
                  {uploading ? (
                    <Loader2 size={22} className="animate-spin text-gold" />
                  ) : (
                    <Upload size={22} className={hasUploadedPhoto ? "text-teal" : "text-gold"} />
                  )}
                  <span className="text-xs sm:text-sm font-semibold">
                    {uploading
                      ? "Uploading to cloud..."
                      : hasUploadedPhoto
                      ? "Click to Replace / Change Photo"
                      : "Click or tap to upload photo"}
                  </span>
                  <span className="text-[11px] text-navy/50">
                    {hasUploadedPhoto
                      ? "Uploading a new photo will replace the design"
                      : `Calibrated for ${dimensions.widthInches}" × ${dimensions.heightInches}" print`}
                  </span>
                </button>

                {hasUploadedPhoto && (
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={handleFitImage}
                      className="text-xs font-medium py-1.5 px-2 rounded-lg border border-border bg-white text-navy hover:border-gold transition flex items-center justify-center gap-1"
                    >
                      <Maximize2 size={12} /> Fit Area
                    </button>
                    <button
                      type="button"
                      onClick={handleFillArea}
                      className="text-xs font-medium py-1.5 px-2 rounded-lg border border-border bg-white text-navy hover:border-gold transition"
                    >
                      Fill Area
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs font-medium py-1.5 px-2 rounded-lg border border-border bg-white text-navy/70 hover:text-red hover:border-red/40 transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {config.fields.text && (
              <div>
                <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Type size={14} /> Add Custom Text
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    maxLength={config.fields.maxTextLength}
                    placeholder="e.g. Best Dad Ever"
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                  />
                  <button
                    onClick={handleAddText}
                    className="bg-navy text-white text-xs font-semibold px-4 rounded-lg hover:bg-navy-dark shrink-0 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ImagePlus size={14} /> Add Text
                  </button>
                </div>

                {config.fields.fontChoice && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-navy/50 mb-1.5">Select Font Style:</p>
                    <div className="flex flex-wrap gap-2">
                      {config.fields.fonts.map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setFont(f);
                            applyStyleToSelection({ font: f });
                          }}
                          className={`text-xs px-3.5 py-2 rounded-full border transition active:scale-95 ${
                            font === f ? "bg-navy text-white border-navy font-semibold" : "border-border text-navy hover:border-navy"
                          }`}
                          style={{ fontFamily: f }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config.fields.textColorChoice && (
                  <div>
                    <p className="text-[11px] font-medium text-navy/50 mb-1.5">Select Text Colour:</p>
                    <div className="flex items-center gap-2">
                      {config.fields.colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setTextColor(c);
                            applyStyleToSelection({ color: c });
                          }}
                          className={`h-7 w-7 rounded-full border-2 transition active:scale-95 ${
                            textColor === c ? "border-gold scale-110 shadow-xs" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSwitchToPreview}
              className="w-full bg-navy text-white font-semibold py-3.5 rounded-full hover:bg-navy-dark transition flex items-center justify-center gap-2 text-sm shadow-md"
            >
              <span>Next: Review &amp; Preview Mockup</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 2: ZAZZLE REALISTIC PREVIEW & REVIEW (Zazzle Photo 5) */}
      <div className={activeTab === "preview" ? "block" : "hidden"}>
        <div className="grid grid-cols-1 lg:grid-cols-[100px_1fr_380px] gap-6 items-start">
          {/* Angle Thumbnails (Left Column like Zazzle) */}
          <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {angleMockups.map((angle) => (
              <button
                key={angle.id}
                type="button"
                onClick={() => setSelectedAngle(angle.id)}
                className={`relative flex flex-col items-center p-1.5 rounded-xl border transition shrink-0 ${
                  selectedAngle === angle.id
                    ? "border-navy ring-2 ring-navy/20 bg-white"
                    : "border-border bg-offwhite hover:border-navy/40"
                }`}
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white">
                  <Image src={angle.url} alt={angle.name} fill className="object-contain p-1" />
                </div>
                <span className="text-[10px] font-semibold text-navy/70 mt-1">{angle.name}</span>
              </button>
            ))}
          </div>

          {/* Realistic Product Mockup with Design Overlay (Center Column) */}
          <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 flex flex-col items-center shadow-xs">
            <div className="relative w-full max-w-[480px] aspect-square rounded-xl overflow-hidden bg-offwhite flex items-center justify-center">
              {/* Blank Product Mockup Photo */}
              <Image
                src={currentAngleObj.url}
                alt={currentAngleObj.name}
                fill
                priority
                className="object-contain"
              />

              {/* Design Overlay */}
              {designSnapshot && (
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: `${currentAngleObj.printArea.xPct}%`,
                    top: `${currentAngleObj.printArea.yPct}%`,
                    width: `${currentAngleObj.printArea.widthPct}%`,
                    height: `${currentAngleObj.printArea.heightPct}%`,
                  }}
                >
                  <div className="relative w-full h-full mix-blend-multiply opacity-95">
                    {/* Render the design snapshot overlay */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={designSnapshot}
                      alt="Custom Design"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-navy/60">
              <span className="flex items-center gap-1 text-teal font-medium">
                <CheckCircle2 size={14} /> Photo calibrated
              </span>
              <span>•</span>
              <span>Angle: {currentAngleObj.name}</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveTab("design")}
                className="text-gold font-semibold hover:underline"
              >
                Adjust Position
              </button>
            </div>
          </div>

          {/* Review & Order Summary Sidebar (Right Column like Zazzle Photo 5) */}
          <div className="space-y-5 bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-xs">
            <div>
              <p className="text-xs font-semibold text-gold uppercase tracking-widest mb-1">Final Review</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">Let&apos;s make sure it&apos;s just right</h2>
              <p className="text-xs text-navy/60 mt-1">Review your design before continuing to cart.</p>
            </div>

            <div className="bg-offwhite rounded-xl p-4 border border-border space-y-2.5 text-xs text-navy/80">
              <p className="font-semibold text-navy uppercase text-[11px] tracking-wide">Things to check:</p>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-teal shrink-0 mt-0.5" />
                <span>Photo and custom text are aligned properly within print boundary</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-teal shrink-0 mt-0.5" />
                <span>Names, dates and spelling are accurate</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-teal shrink-0 mt-0.5" />
                <span>High quality print guaranteed ({dimensions.widthInches}&quot; × {dimensions.heightInches}&quot;)</span>
              </div>
            </div>

            {config.fields.sizeChoice && config.fields.sizes.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide block mb-1.5">
                  Select Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {config.fields.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                        size === s ? "bg-navy text-white border-navy" : "border-border text-navy"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {config.fields.specialInstructions && (
              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-1.5 block">
                  Special Notes for Print Team
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any extra instructions?"
                  className="w-full text-xs border border-border rounded-lg px-3 py-2 outline-none focus:border-gold resize-none"
                />
              </div>
            )}

            <div className="pt-3 border-t border-border flex items-baseline justify-between">
              <div>
                <span className="text-xs text-navy/50 block">Price per item</span>
                <span className="text-xl font-bold text-navy">₹{price}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-teal font-semibold">
                <ShieldCheck size={14} /> Quality Verified
              </div>
            </div>

            <label className="flex items-start gap-3 text-xs sm:text-sm text-navy/80 cursor-pointer bg-offwhite p-3 rounded-xl border border-border">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
                className="mt-0.5 accent-gold h-4 w-4 shrink-0"
              />
              <span className="text-xs">
                I have reviewed and approved my design mockup for production.
              </span>
            </label>

            <button
              onClick={handleAddToCart}
              disabled={submitting || !approved}
              className="w-full bg-gold text-navy-dark font-semibold py-4 rounded-full hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-md active:scale-[0.99]"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? "Adding to Cart..." : "Add to Cart"}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("design")}
              className="w-full text-center text-xs font-medium text-navy/60 hover:text-navy"
            >
              ← Need changes? Edit design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
