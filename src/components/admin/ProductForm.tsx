"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { CustomizationConfig } from "@/db/schema";

type Category = { id: string; name: string };

type ProductData = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  images: string[];
  startingPrice: string;
  isQuoteOnly: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  customizable: boolean;
  customization: CustomizationConfig | null;
};

const DEFAULT_CUSTOMIZATION: CustomizationConfig = {
  mockupImage: "",
  printArea: { xPct: 25, yPct: 22, widthPct: 50, heightPct: 45 },
  fields: {
    imageUpload: true,
    multipleImages: false,
    text: true,
    maxTextLength: 40,
    fontChoice: true,
    fonts: ["Poppins", "Lora"],
    textColorChoice: true,
    colors: ["#1B2A4A", "#A63446", "#B8912A", "#FFFFFF", "#000000"],
    productColorChoice: false,
    sizeChoice: false,
    sizes: [],
    specialInstructions: true,
  },
};

export default function ProductForm({
  initial,
  categories,
}: {
  initial?: Partial<ProductData>;
  categories: Category[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductData>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    images: initial?.images ?? [],
    startingPrice: initial?.startingPrice ?? "",
    isQuoteOnly: initial?.isQuoteOnly ?? false,
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    isBestseller: initial?.isBestseller ?? false,
    customizable: initial?.customizable ?? false,
    customization: initial?.customization ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (form.customizable && !form.customization) {
      setForm((f) => ({ ...f, customization: DEFAULT_CUSTOMIZATION }));
    }
  }, [form.customizable, form.customization]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "products");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, data.url] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.categoryId || !form.startingPrice) {
      toast.error("Name, category and starting price are required.");
      return;
    }
    setSaving(true);
    const url = initial?.id ? `/api/admin/products/${initial.id}` : "/api/admin/products";
    const method = initial?.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save");
      return;
    }
    toast.success("Product saved");
    router.push("/admin/products");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/products/${initial.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Product deleted");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <section className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-navy">Basic Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Product Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Category</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Starting Price (₹)</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.startingPrice}
              onChange={(e) => setForm((f) => ({ ...f, startingPrice: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Short Description</label>
            <input
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Full Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-navy">Images</h2>
        <div className="flex flex-wrap gap-3">
          {form.images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-offwhite border border-border">
              <Image src={img} alt="" fill className="object-contain p-1" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 text-red"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-gold text-navy/40 hover:text-gold">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-navy">Visibility &amp; Flags</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "isActive", label: "Active (visible on site)" },
            { key: "isFeatured", label: "Featured" },
            { key: "isBestseller", label: "Bestseller" },
            { key: "isQuoteOnly", label: "Custom Quote only (bulk item)" },
          ].map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={form[f.key as keyof ProductData] as boolean}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                className="accent-gold h-4 w-4"
              />
              {f.label}
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-navy">Customization</h2>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.customizable}
              onChange={(e) => setForm((f) => ({ ...f, customizable: e.target.checked }))}
              className="accent-gold h-4 w-4"
            />
            Enable live customization for this product
          </label>
        </div>

        {form.customizable && form.customization && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Mockup Image URL (used as canvas background — usually the first product image above)
              </label>
              <input
                value={form.customization.mockupImage ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customization: f.customization && { ...f.customization, mockupImage: e.target.value },
                  }))
                }
                placeholder={form.images[0] ?? "/images/products/placeholder.png"}
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2 block">
                Printable Area (% of image)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(["xPct", "yPct", "widthPct", "heightPct"] as const).map((key) => (
                  <div key={key}>
                    <span className="text-[10px] text-navy/50 uppercase">{key.replace("Pct", "")}</span>
                    <input
                      type="number"
                      value={form.customization!.printArea[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          customization: f.customization && {
                            ...f.customization,
                            printArea: { ...f.customization.printArea, [key]: parseFloat(e.target.value) || 0 },
                          },
                        }))
                      }
                      className="w-full text-sm border border-border rounded-lg px-2 py-2 outline-none focus:border-gold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "imageUpload", label: "Allow photo upload" },
                { key: "text", label: "Allow custom text" },
                { key: "fontChoice", label: "Font choice" },
                { key: "textColorChoice", label: "Text colour choice" },
                { key: "sizeChoice", label: "Size selector (apparel)" },
                { key: "specialInstructions", label: "Special instructions box" },
              ].map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-navy">
                  <input
                    type="checkbox"
                    checked={Boolean(form.customization!.fields[f.key as keyof typeof form.customization.fields])}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customization: prev.customization && {
                          ...prev.customization,
                          fields: { ...prev.customization.fields, [f.key]: e.target.checked },
                        },
                      }))
                    }
                    className="accent-gold h-4 w-4"
                  />
                  {f.label}
                </label>
              ))}
            </div>

            {form.customization.fields.sizeChoice && (
              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  Sizes (comma-separated)
                </label>
                <input
                  value={form.customization.fields.sizes.join(", ")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      customization: f.customization && {
                        ...f.customization,
                        fields: {
                          ...f.customization.fields,
                          sizes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        },
                      },
                    }))
                  }
                  placeholder="S, M, L, XL, XXL"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                />
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-gold text-navy-dark font-semibold px-6 py-3 rounded-full hover:brightness-110 transition flex items-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Product
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-red font-semibold text-sm hover:underline"
          >
            Delete Product
          </button>
        )}
      </div>
    </form>
  );
}
