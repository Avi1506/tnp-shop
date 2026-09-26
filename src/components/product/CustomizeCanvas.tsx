"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import toast from "react-hot-toast";
import {
  Upload,
  Type,
  Trash2,
  RotateCcw,
  Loader2,
  ImagePlus,
} from "lucide-react";
import type { CustomizationConfig } from "@/db/schema";

const CANVAS_SIZE = 520;

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
  const guideRectRef = useRef<fabric.Rect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { addLine } = useCart();
  const router = useRouter();

  const printAreaBox = useCallback(() => {
    const pa = config.printArea;
    return {
      left: (pa.xPct / 100) * CANVAS_SIZE,
      top: (pa.yPct / 100) * CANVAS_SIZE,
      width: (pa.widthPct / 100) * CANVAS_SIZE,
      height: (pa.heightPct / 100) * CANVAS_SIZE,
    };
  }, [config.printArea]);

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

    fabric.FabricImage.fromURL(config.mockupImage || "/images/products/placeholder.png", {
      crossOrigin: "anonymous",
    }).then((img) => {
      const scale = Math.min(CANVAS_SIZE / (img.width ?? 1), CANVAS_SIZE / (img.height ?? 1));
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: CANVAS_SIZE / 2,
        top: CANVAS_SIZE / 2,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = img;

      // Draw the printable-area guide
      const pa = config.printArea;
      const rect = new fabric.Rect({
        left: (pa.xPct / 100) * CANVAS_SIZE,
        top: (pa.yPct / 100) * CANVAS_SIZE,
        width: (pa.widthPct / 100) * CANVAS_SIZE,
        height: (pa.heightPct / 100) * CANVAS_SIZE,
        fill: "transparent",
        stroke: "#B8912A",
        strokeDashArray: [6, 4],
        strokeWidth: 1.5,
        selectable: false,
        evented: false,
      });
      guideRectRef.current = rect;
      canvas.add(rect);
      canvas.renderAll();
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
  // Rule 1 & 2: Try direct-to-R2 presigned upload first. This bypasses Vercel
  // entirely — the file goes straight from the browser to Cloudflare R2, and
  // only the short public URL is saved in the database.
  // Falls back to the legacy /api/upload route when R2 is not configured.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let localUrl = "";
    try {
      // 1. Create local Object URL for instant local canvas preview (no network needed)
      localUrl = URL.createObjectURL(file);
      const canvas = fabricRef.current;
      if (canvas) {
        // If single image mode, remove existing custom images to cleanly replace design
        if (!config.fields.multipleImages) {
          const objects = canvas.getObjects();
          objects.forEach((obj) => {
            if ((obj as unknown as { isCustomImage?: boolean }).isCustomImage) {
              canvas.remove(obj);
            }
          });
        }

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

      // 2. Try presigned R2 direct upload first (Rule 1)
      let finalUrl = "";

      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          contentLength: file.size,
          folder: "customizations",
        }),
      });
      const urlData = await urlRes.json() as {
        fallbackToLegacy?: boolean;
        uploadUrl?: string;
        publicUrl?: string;
      };

      if (!urlData.fallbackToLegacy && urlData.uploadUrl && urlData.publicUrl) {
        // Direct upload: file goes straight to Cloudflare R2 (no Vercel processing)
        const putRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Direct upload to storage failed.");
        finalUrl = urlData.publicUrl;
      } else {
        // Fallback: legacy multipart upload through Vercel (works without R2)
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "customizations");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Failed to upload photo.");
        }
        finalUrl = data.url;
      }

      setUploadedUrls((prev) =>
        config.fields.multipleImages ? [...prev, finalUrl] : [finalUrl]
      );
      toast.success("Design updated! Drag, resize or rotate to fit perfectly.");
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
    canvas.renderAll();
    setUploadedUrls([]);
    setHasUploadedPhoto(false);
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
      fontSize: 28,
      width: box.width,
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
      if (o.selectable) canvas.remove(o);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    setUploadedUrls([]);
    setHasUploadedPhoto(false);
    setTextValue("");
    setApproved(false);
  }

  // ---- submit: render final preview, upload it, add to cart -------------
  async function handleAddToCart() {
    if (!approved) {
      toast.error("Please review and approve your customization first.");
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
      // Temporarily hide guide border to generate clean realistic finished preview
      if (guideRectRef.current) {
        guideRectRef.current.set({ opacity: 0 });
      }
      canvas.discardActiveObject();
      canvas.renderAll();

      const dataUrl = canvas.toDataURL({ format: "png", quality: 0.95, multiplier: 1.5 });

      // Restore guide border
      if (guideRectRef.current) {
        guideRectRef.current.set({ opacity: 1 });
      }
      canvas.renderAll();

      let previewImageUrl = dataUrl;

      try {
        const blob = await (await fetch(dataUrl)).blob();
        const fd = new FormData();
        fd.append("file", new File([blob], "preview.png", { type: "image/png" }));
        fd.append("folder", "previews");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) {
          previewImageUrl = data.url;
        }
      } catch {
        // Fallback to dataUrl on server error
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
    <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 w-full overflow-x-hidden">
      {/* Canvas */}
      <div className="w-full">
        <div className="w-full max-w-[520px] mx-auto rounded-2xl border border-border bg-offwhite p-2 sm:p-4 flex items-center justify-center overflow-hidden shadow-xs">
          <div className="relative w-full aspect-square flex items-center justify-center [&_.canvas-container]:!w-full [&_.canvas-container]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!max-w-full">
            <canvas ref={canvasElRef} className="rounded-lg shadow-inner touch-none" />
          </div>
        </div>
        <p className="text-[11px] sm:text-xs text-navy/60 mt-3 text-center px-2">
          The dashed box shows the printable area. Touch/drag, scale (corner handles) or rotate your photo and text to fit.
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
          <button
            onClick={handleDeleteSelected}
            disabled={!hasSelection}
            className="text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-border flex items-center gap-1.5 text-navy/80 hover:text-red hover:border-red/40 disabled:opacity-30 disabled:cursor-not-allowed transition bg-white shadow-xs"
          >
            <Trash2 size={14} /> Delete Selected
          </button>
          <button
            onClick={handleReset}
            className="text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-border flex items-center gap-1.5 text-navy/80 hover:text-red hover:border-red/40 transition bg-white shadow-xs"
          >
            <RotateCcw size={14} /> Reset All
          </button>
        </div>
      </div>

      {/* Controls */}
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
                  ? "Processing photo..."
                  : hasUploadedPhoto
                  ? "Click to Replace / Change Photo"
                  : "Click to upload JPG or PNG"}
              </span>
              <span className="text-[11px] text-navy/50">
                {hasUploadedPhoto ? "Uploading a new photo will replace the design" : "You can resize, rotate and reposition it"}
              </span>
            </button>

            {hasUploadedPhoto && (
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleFitImage}
                  className="flex-1 text-xs font-medium py-1.5 px-2.5 rounded-lg border border-border bg-white text-navy hover:border-gold transition"
                >
                  Fit in Area
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-medium py-1.5 px-2.5 rounded-lg border border-border bg-white text-navy/70 hover:text-red hover:border-red/40 transition"
                >
                  Remove Photo
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
                placeholder="e.g. Happy Birthday Rahul"
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
                <div className="flex items-center gap-3 flex-wrap">
                  {config.fields.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setTextColor(c);
                        applyStyleToSelection({ color: c });
                      }}
                      className={`h-8 w-8 rounded-full border-2 transition-transform active:scale-95 ${
                        textColor === c ? "border-gold scale-110 shadow-md" : "border-white"
                      }`}
                      style={{ backgroundColor: c, boxShadow: "0 0 0 1px #E9E4D8" }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {config.fields.sizeChoice && config.fields.sizes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">Select Size</p>
            <div className="flex flex-wrap gap-2">
              {config.fields.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`text-sm px-4 py-2.5 rounded-lg border transition active:scale-95 font-medium ${
                    size === s ? "bg-navy text-white border-navy" : "border-border text-navy hover:border-navy"
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
            <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">
              Special Instructions (optional)
            </p>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Anything else we should know?"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />
          </div>
        )}

        <label className="flex items-start gap-3 text-sm text-navy/80 cursor-pointer bg-offwhite p-3 rounded-xl border border-border">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
            className="mt-0.5 accent-gold h-4 w-4 shrink-0"
          />
          <span className="text-xs sm:text-sm">I have reviewed and approved my live customization preview.</span>
        </label>

        <button
          onClick={handleAddToCart}
          disabled={submitting || !approved}
          className="w-full bg-gold text-navy-dark font-semibold py-4 rounded-full hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-md active:scale-[0.99]"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? "Saving your design..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
