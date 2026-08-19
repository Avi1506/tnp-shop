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

  const { addLine } = useCart();
  const router = useRouter();

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

  const printAreaBox = useCallback(() => {
    const pa = config.printArea;
    return {
      left: (pa.xPct / 100) * CANVAS_SIZE,
      top: (pa.yPct / 100) * CANVAS_SIZE,
      width: (pa.widthPct / 100) * CANVAS_SIZE,
      height: (pa.heightPct / 100) * CANVAS_SIZE,
    };
  }, [config.printArea]);

  // ---- upload + place photo ---------------------------------------------
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "customizations");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const canvas = fabricRef.current;
      if (canvas) {
        const img = await fabric.FabricImage.fromURL(data.url, { crossOrigin: "anonymous" });
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
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      setUploadedUrls((prev) => (config.fields.multipleImages ? [...prev, data.url] : [data.url]));
      toast.success("Photo added — drag, resize or rotate it to fit.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", new File([blob], "preview.png", { type: "image/png" }));
      fd.append("folder", "previews");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your preview");

      addLine({
        productId,
        slug,
        name,
        image: data.url,
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
          previewImage: data.url,
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
    <div className="grid md:grid-cols-[1fr_380px] gap-10">
      {/* Canvas */}
      <div>
        <div className="rounded-2xl border border-border bg-offwhite p-4 flex items-center justify-center">
          <canvas ref={canvasElRef} className="rounded-lg shadow-inner" />
        </div>
        <p className="text-xs text-navy/50 mt-3 text-center">
          The dashed box shows the printable area. Drag, resize (corner handles) or rotate your photo and text
          to fit.
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={handleDeleteSelected}
            disabled={!hasSelection}
            className="text-xs font-semibold flex items-center gap-1.5 text-navy/70 hover:text-red disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} /> Delete Selected
          </button>
          <button
            onClick={handleReset}
            className="text-xs font-semibold flex items-center gap-1.5 text-navy/70 hover:text-red"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy mb-1">{name}</h2>
          <p className="text-red font-bold">Starting ₹{price}</p>
        </div>

        {config.fields.imageUpload && (
          <div>
            <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">
              Upload Your Photo
            </p>
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
              className="w-full border-2 border-dashed border-gold/60 rounded-xl py-6 flex flex-col items-center gap-2 text-navy/70 hover:bg-offwhite transition disabled:opacity-60"
            >
              {uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
              <span className="text-xs font-medium">
                {uploading ? "Uploading..." : "Click to upload JPG or PNG"}
              </span>
            </button>
          </div>
        )}

        {config.fields.text && (
          <div>
            <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Type size={13} /> Add Text
            </p>
            <div className="flex gap-2 mb-2">
              <input
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                maxLength={config.fields.maxTextLength}
                placeholder="e.g. Happy Birthday Rahul"
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <button
                onClick={handleAddText}
                className="bg-navy text-white text-xs font-semibold px-4 rounded-lg hover:bg-navy-dark shrink-0"
              >
                <ImagePlus size={14} className="inline mr-1" /> Add
              </button>
            </div>

            {config.fields.fontChoice && (
              <div className="flex flex-wrap gap-2 mb-2">
                {config.fields.fonts.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFont(f);
                      applyStyleToSelection({ font: f });
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      font === f ? "bg-navy text-white border-navy" : "border-border text-navy"
                    }`}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {config.fields.textColorChoice && (
              <div className="flex items-center gap-2">
                {config.fields.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setTextColor(c);
                      applyStyleToSelection({ color: c });
                    }}
                    className={`h-6 w-6 rounded-full border-2 ${textColor === c ? "border-gold" : "border-white"}`}
                    style={{ backgroundColor: c, boxShadow: "0 0 0 1px #E9E4D8" }}
                    aria-label={c}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {config.fields.sizeChoice && config.fields.sizes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {config.fields.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`text-sm px-4 py-2 rounded-lg border transition ${
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

        <label className="flex items-start gap-2.5 text-sm text-navy/80 cursor-pointer">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
            className="mt-0.5 accent-gold h-4 w-4"
          />
          I have reviewed and approved my customization.
        </label>

        <button
          onClick={handleAddToCart}
          disabled={submitting || !approved}
          className="w-full bg-gold text-navy-dark font-semibold py-3.5 rounded-full hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Saving your design..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
