"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Upload, Sparkles, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import type { PrintTemplate } from "@/db/schema";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  printTemplate: PrintTemplate | null;
};

const PRESETS: Record<string, PrintTemplate> = {
  mug: {
    shape: "rectangle",
    widthInches: 7.5,
    heightInches: 3.5,
    blankMockupUrl: "https://pub-58068b913fb2422c82982c94cf89d0b6.r2.dev/mockups/mug-front.jpg",
    printAreaOnMockup: { xPct: 20, yPct: 22, widthPct: 60, heightPct: 56 },
  },
  tshirt: {
    shape: "rectangle",
    widthInches: 10,
    heightInches: 12,
    blankMockupUrl: "",
    printAreaOnMockup: { xPct: 30, yPct: 25, widthPct: 40, heightPct: 50 },
  },
  clock: {
    shape: "circle",
    widthInches: 8,
    heightInches: 8,
    blankMockupUrl: "",
    printAreaOnMockup: { xPct: 20, yPct: 20, widthPct: 60, heightPct: 60 },
  },
  cushion: {
    shape: "square",
    widthInches: 12,
    heightInches: 12,
    blankMockupUrl: "",
    printAreaOnMockup: { xPct: 20, yPct: 20, widthPct: 60, heightPct: 60 },
  },
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null | "new">(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success("Category deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Categories &amp; Print Templates</h1>
          <p className="text-sm text-navy/60 mt-1">
            Configure default print dimensions, shapes and blank mockups for each product type.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-110"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy/50 uppercase tracking-wide">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Custom Print Template</th>
              <th className="px-5 py-3">Sort Order</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-navy/40">
                  <Loader2 className="animate-spin inline" size={18} />
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-offwhite">
                  <td className="px-5 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-5 py-3 text-navy/60">{c.slug}</td>
                  <td className="px-5 py-3">
                    {c.printTemplate ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/10 text-navy-dark border border-gold/30">
                        <Sparkles size={12} className="text-gold" />
                        {c.printTemplate.widthInches}&quot; × {c.printTemplate.heightInches}&quot; ({c.printTemplate.shape})
                      </span>
                    ) : (
                      <span className="text-xs text-navy/40">Standard</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-navy/60">{c.sortOrder}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(c)} className="text-navy/50 hover:text-gold" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-navy/50 hover:text-red" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-navy/40">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [enableTemplate, setEnableTemplate] = useState(!!category?.printTemplate);
  const [shape, setShape] = useState<"rectangle" | "circle" | "square">(
    category?.printTemplate?.shape ?? "rectangle"
  );
  const [widthInches, setWidthInches] = useState<number>(category?.printTemplate?.widthInches ?? 7.5);
  const [heightInches, setHeightInches] = useState<number>(category?.printTemplate?.heightInches ?? 3.5);
  const [blankMockupUrl, setBlankMockupUrl] = useState<string>(category?.printTemplate?.blankMockupUrl ?? "");
  const [xPct, setXPct] = useState<number>(category?.printTemplate?.printAreaOnMockup?.xPct ?? 20);
  const [yPct, setYPct] = useState<number>(category?.printTemplate?.printAreaOnMockup?.yPct ?? 22);
  const [widthPct, setWidthPct] = useState<number>(category?.printTemplate?.printAreaOnMockup?.widthPct ?? 60);
  const [heightPct, setHeightPct] = useState<number>(category?.printTemplate?.printAreaOnMockup?.heightPct ?? 56);
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [saving, setSaving] = useState(false);

  function applyPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key];
    setEnableTemplate(true);
    setShape(p.shape);
    setWidthInches(p.widthInches);
    setHeightInches(p.heightInches);
    setBlankMockupUrl(p.blankMockupUrl);
    setXPct(p.printAreaOnMockup.xPct);
    setYPct(p.printAreaOnMockup.yPct);
    setWidthPct(p.printAreaOnMockup.widthPct);
    setHeightPct(p.printAreaOnMockup.heightPct);
    toast.success(`Loaded ${key.toUpperCase()} preset!`);
  }

  async function handleMockupUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMockup(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "mockups");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setBlankMockupUrl(data.url);
      toast.success("Blank mockup uploaded to cloud!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload mockup");
    } finally {
      setUploadingMockup(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const printTemplate: PrintTemplate | null = enableTemplate
      ? {
          shape,
          widthInches: Number(widthInches) || 1,
          heightInches: shape === "circle" || shape === "square" ? Number(widthInches) || 1 : Number(heightInches) || 1,
          blankMockupUrl,
          printAreaOnMockup: {
            xPct: Number(xPct) || 0,
            yPct: Number(yPct) || 0,
            widthPct: Number(widthPct) || 100,
            heightPct: Number(heightPct) || 100,
          },
        }
      : null;

    const url = category ? `/api/admin/categories/${category.id}` : "/api/admin/categories";
    const method = category ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, sortOrder, printTemplate }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save");
      return;
    }
    toast.success("Category saved!");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-navy text-lg">{category ? "Edit Category" : "Add Category"}</h2>
          <button onClick={onClose} className="text-navy/40 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Category Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mugs, Bottles & Drinkware"
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Description</label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description for customer catalog"
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* PRINT TEMPLATE SECTION */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-navy flex items-center gap-1.5">
                  <Sparkles size={15} className="text-gold" /> Customizable Print Template
                </h3>
                <p className="text-xs text-navy/50">
                  Sets default physical dimensions and blank mockup for customizer.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableTemplate}
                onChange={(e) => setEnableTemplate(e.target.checked)}
                className="h-4 w-4 accent-gold cursor-pointer"
              />
            </div>

            {enableTemplate && (
              <div className="space-y-4 bg-offwhite p-4 rounded-xl border border-border mt-3">
                {/* Presets */}
                <div>
                  <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1.5">
                    Quick Presets:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("mug")}
                      className="text-xs px-2.5 py-1 rounded-md bg-white border border-border text-navy hover:border-gold hover:text-gold font-medium"
                    >
                      ☕ Mug (7.5&quot; × 3.5&quot;)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("tshirt")}
                      className="text-xs px-2.5 py-1 rounded-md bg-white border border-border text-navy hover:border-gold hover:text-gold font-medium"
                    >
                      👕 T-Shirt (10&quot; × 12&quot;)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("clock")}
                      className="text-xs px-2.5 py-1 rounded-md bg-white border border-border text-navy hover:border-gold hover:text-gold font-medium"
                    >
                      ⏰ Clock / Circle (8&quot; × 8&quot;)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("cushion")}
                      className="text-xs px-2.5 py-1 rounded-md bg-white border border-border text-navy hover:border-gold hover:text-gold font-medium"
                    >
                      🛋️ Cushion / Square (12&quot; × 12&quot;)
                    </button>
                  </div>
                </div>

                {/* Shape & Dimensions */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                      Shape
                    </label>
                    <select
                      value={shape}
                      onChange={(e) => setShape(e.target.value as "rectangle" | "circle" | "square")}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-gold bg-white"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="circle">Circle / Round</option>
                      <option value="square">Square</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                      Width (inches)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={widthInches}
                      onChange={(e) => setWidthInches(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-gold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                      Height (inches)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={shape === "circle" || shape === "square"}
                      value={shape === "circle" || shape === "square" ? widthInches : heightInches}
                      onChange={(e) => setHeightInches(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-gold bg-white disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Blank Mockup Image */}
                <div>
                  <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                    Blank Product Photo (Mockup)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={blankMockupUrl}
                      onChange={(e) => setBlankMockupUrl(e.target.value)}
                      placeholder="https://... or upload photo"
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 outline-none focus:border-gold bg-white"
                    />
                    <label className="cursor-pointer bg-white border border-border hover:border-gold px-3 py-2 rounded-lg text-xs font-semibold text-navy flex items-center gap-1.5 shrink-0">
                      {uploadingMockup ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} className="text-gold" />
                      )}
                      <span>Upload Mockup</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMockupUpload}
                        disabled={uploadingMockup}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {blankMockupUrl && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-navy/60">
                      <ImageIcon size={14} className="text-gold" />
                      <span className="truncate max-w-sm">{blankMockupUrl}</span>
                    </div>
                  )}
                </div>

                {/* Print Area Percentage Coordinates */}
                <div>
                  <label className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                    Print Area on Mockup (% Coordinates)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-navy/50 block">Left X%</span>
                      <input
                        type="number"
                        value={xPct}
                        onChange={(e) => setXPct(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-border rounded px-2 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-navy/50 block">Top Y%</span>
                      <input
                        type="number"
                        value={yPct}
                        onChange={(e) => setYPct(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-border rounded px-2 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-navy/50 block">Width%</span>
                      <input
                        type="number"
                        value={widthPct}
                        onChange={(e) => setWidthPct(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-border rounded px-2 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-navy/50 block">Height%</span>
                      <input
                        type="number"
                        value={heightPct}
                        onChange={(e) => setHeightPct(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-border rounded px-2 py-1.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || uploadingMockup}
          className="w-full mt-6 bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save Category
        </button>
      </div>
    </div>
  );
}
