"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import toast from "react-hot-toast";
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Type,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export type QuickCustomizeProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  mockupImage: string;
  printArea?: { xPct: number; yPct: number; widthPct: number; heightPct: number };
  shape?: "rectangle" | "circle" | "square";
  dimensions?: { widthInches: number; heightInches: number };
};

const FONTS = ["Poppins", "Lora", "Pacifico", "Playfair Display"];
const COLORS = ["#1B2A4A", "#A63446", "#E65100", "#FFFFFF", "#000000"];

export default function QuickPersonalizationDrawer({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: QuickCustomizeProduct | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDpiStatus, setImageDpiStatus] = useState<"high" | "low" | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [text, setText] = useState("");
  const [font, setFont] = useState(FONTS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addLine } = useCart();
  const router = useRouter();

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen && product) {
      trackEvent("personalization_drawer_opened", { productId: product.id, slug: product.slug });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Capture the narrowed product so nested event handlers retain the null check.
  const activeProduct = product;
  const printArea = activeProduct.printArea || { xPct: 30, yPct: 35, widthPct: 40, heightPct: 40 };

  // Estimate print resolution from the physical print area (browser files do not
  // reliably expose embedded DPI metadata).
  function processFile(selectedFile: File) {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload a valid image (JPG, PNG, WebP)");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setImageDpiStatus(null);
    setImageDimensions(null);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Create an image object to calculate real pixel dimensions & DPI standard
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImageDimensions({ width: w, height: h });

      const requiredWidth = (activeProduct.dimensions?.widthInches || 6) * 300;
      const requiredHeight = (activeProduct.dimensions?.heightInches || 4) * 300;

      if (w >= requiredWidth && h >= requiredHeight) {
        setImageDpiStatus("high");
        toast.success("High print quality for the estimated print area");
      } else {
        setImageDpiStatus("low");
        toast("Note: Image resolution is below 300 DPI", { icon: "⚠️" });
        trackEvent("low_dpi_warning_triggered", {
          productId: activeProduct.id,
          width: w,
          height: h,
          requiredWidth,
          requiredHeight,
        });
      }
    };
    img.src = objectUrl;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  async function handleAddToCart() {
    if (!file && !text.trim()) {
      toast.error("Please upload a photo or add custom text before adding to cart.");
      return;
    }

    setSubmitting(true);
    let uploadedFileUrl: string | null = null;

    try {
      if (file) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "customizations");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || typeof data.url !== "string") {
          throw new Error(data.error || "Artwork upload failed. Please try again.");
        }
        uploadedFileUrl = data.url;
      }

      trackEvent("primary_cta_clicked", { label: "quick_personalization_add_to_cart" });

      addLine({
        productId: activeProduct.id,
        slug: activeProduct.slug,
        name: activeProduct.name,
        image: activeProduct.mockupImage,
        unitPrice: activeProduct.price,
        quantity: 1,
        customization: {
          uploadedImages: uploadedFileUrl ? [uploadedFileUrl] : [],
          text: text.trim() || null,
          font: text.trim() ? font : null,
          textColor: text.trim() ? color : null,
          productColor: null,
          size: null,
          specialInstructions: `Quick Personalization · DPI Quality: ${imageDpiStatus || "Standard"}`,
          previewImage: uploadedFileUrl || activeProduct.mockupImage,
          approved: true,
        },
      });

      toast.success("Personalized product added to cart!");
      onClose();
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-navy-dark/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div role="dialog" aria-modal="true" aria-labelledby="quick-personalize-title" onKeyDown={(e) => e.key === "Escape" && onClose()} className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
            <h2 id="quick-personalize-title" className="font-display text-lg font-bold text-navy">Quick Personalize</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-navy/60 hover:text-navy hover:bg-offwhite transition touch-target-48"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 space-y-6">
          {/* Live Product Preview Canvas */}
          <div className="bg-offwhite rounded-2xl p-4 border border-border flex flex-col items-center">
            <div className="relative w-full max-w-[340px] aspect-square rounded-xl overflow-hidden bg-white shadow-xs flex items-center justify-center">
              {/* Product Background Mockup */}
              <Image
                src={product.mockupImage}
                alt={product.name}
                fill
                className="object-contain p-3"
              />

              {/* Dynamic Print Overlay Layer */}
              <div
                className="absolute pointer-events-none transition-all flex flex-col items-center justify-center"
                style={{
                  left: `${printArea.xPct}%`,
                  top: `${printArea.yPct}%`,
                  width: `${printArea.widthPct}%`,
                  height: `${printArea.heightPct}%`,
                }}
              >
                {/* Uploaded Image Overlay */}
                {previewUrl ? (
                  <div className="relative w-full h-full mix-blend-multiply flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Uploaded Artwork"
                      className="w-full h-full object-contain filter drop-shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full border border-dashed border-navy/30 bg-white/60 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                    <Sparkles size={14} className="text-gold mb-0.5" />
                    <span className="text-[10px] font-bold text-navy/70 leading-tight">YOUR IMAGE HERE</span>
                  </div>
                )}

                {/* Custom Text Overlay */}
                {text.trim() && (
                  <div
                    className="absolute bottom-2 inset-x-1 text-center font-bold break-words px-1 drop-shadow-xs transition-all"
                    style={{
                      fontFamily: font,
                      color: color,
                      fontSize: text.length > 20 ? "11px" : "14px",
                    }}
                  >
                    {text}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full flex items-center justify-between mt-3 text-xs">
              <div>
                <p className="font-bold text-navy">{product.name}</p>
                <p className="text-red font-semibold">₹{product.price}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/products/${product.slug}/customize`);
                }}
                className="text-[11px] font-semibold text-gold hover:underline flex items-center gap-1"
              >
                <span>Open Full Studio</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Drag & Drop File Uploader */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy uppercase tracking-wide">
                1. Upload Photo or Logo
              </label>
              {imageDpiStatus === "high" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> High Print Quality (estimated at 300 DPI)
                </span>
              )}
              {imageDpiStatus === "low" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E65100] bg-[#FFF3E0] px-2 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> Low resolution — may print blurry
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                dragActive
                  ? "border-gold bg-gold/5"
                  : previewUrl
                  ? "border-teal/60 bg-teal/5"
                  : "control-border hover:border-gold hover:bg-offwhite"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
              />

              <Upload size={22} className={previewUrl ? "text-teal" : "text-gold"} />
              <div className="text-xs font-semibold text-navy">
                {file ? file.name : "Drag & Drop your photo here or Click to Browse"}
              </div>
              <p className="text-[11px] text-navy/50">
                {imageDimensions
                  ? `${imageDimensions.width} × ${imageDimensions.height} px · Automated DPI Check Applied`
                  : "JPG, PNG or WebP. Quality is estimated against the print area."}
              </p>
            </div>
          </div>

          {/* Live Personalization Text Controls */}
          <div>
            <label className="text-xs font-bold text-navy uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
              <Type size={14} className="text-gold" />
              <span>2. Add Custom Text (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Best Mom Ever, Happy Birthday..."
              maxLength={40}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-sm border control-border rounded-xl px-3.5 py-2.5 outline-none focus:border-gold"
            />

            {/* Font Style Selection Dropdown */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-navy/60 uppercase block mb-1">
                  Font Family
                </label>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="w-full text-xs border control-border rounded-lg px-2.5 py-2 outline-none focus:border-gold bg-white text-navy font-medium"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Color Swatches */}
              <div>
                <label className="text-[11px] font-semibold text-navy/60 uppercase block mb-1">
                  Font Colour
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition swatch-touch ${
                        color === c ? "border-gold scale-110 shadow-xs" : "border-border"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Add to Cart CTA */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              disabled={submitting || uploading}
              onClick={handleAddToCart}
              className="w-full btn-primary-cta font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition disabled:opacity-50 touch-target-48 btn-cta-mobile"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              <span>{submitting ? "Adding to Cart..." : "Add to Cart (₹" + product.price + ")"}</span>
            </button>
            <p className="text-[11px] text-center text-navy/50 mt-2">
              Free digital mockup review included with every order.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
