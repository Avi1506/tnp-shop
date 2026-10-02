"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import type { PrintTemplate } from "@/db/schema";
import PrintTemplateEditor from "@/components/admin/PrintTemplateEditor";
import { defaultViews, normalizePrintTemplate } from "@/lib/print-template";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  printTemplate: PrintTemplate | null;
};

function preset(kind: "mug" | "bottle" | "tshirt" | "oversized" | "cushion" | "heart"): PrintTemplate {
  const base = normalizePrintTemplate(null);
  if (kind === "mug") {
    return {
      ...base,
      templateVersion: 1,
      printType: "cylindrical",
      shape: "rectangle",
      physical: { width: 7.5, height: 3.5, unit: "in", dpi: 300 },
      cylindrical3d: {
        modelRef: "procedural:mug-v1",
        radius: 1.18,
        bodyHeight: 2.45,
        wrapCoverageDeg: 270,
        wrapOffsetDeg: 0,
        cameraDistance: 6.2,
        cameraPitchDeg: 5,
        baseColor: "#f7f7f4",
        roughness: 0.34,
        metalness: 0,
        handleSide: "right",
      },
      views: defaultViews("cylindrical", "/images/mockups/mug-front.jpg", {
        xPct: 30,
        yPct: 37,
        widthPct: 43,
        heightPct: 44,
      }).map((view) => ({
        ...view,
        curvatureStrength: 1.05,
        edgeFalloff: view.id === "front" ? 0.3 : 0.36,
        mockupUrl:
          view.id === "left"
            ? "/images/mockups/mug-handle-left.jpg"
            : view.id === "right"
            ? "/images/mockups/mug-left.jpg"
            : "/images/mockups/mug-front.jpg",
      })),
    };
  }
  if (kind === "bottle") {
    return {
      ...base,
      templateVersion: 1,
      printType: "cylindrical",
      shape: "rectangle",
      physical: { width: 8, height: 3.5, unit: "in", dpi: 300 },
      safeArea: { topPct: 10, rightPct: 3, bottomPct: 10, leftPct: 3 },
      cylindrical3d: {
        modelRef: "procedural:bottle-v1",
        radius: 0.92,
        bodyHeight: 3.35,
        wrapCoverageDeg: 300,
        wrapOffsetDeg: 0,
        cameraDistance: 6.4,
        cameraPitchDeg: 3,
        baseColor: "#ececec",
        roughness: 0.32,
        metalness: 0.42,
      },
      views: defaultViews("cylindrical", "", { xPct: 30, yPct: 30, widthPct: 40, heightPct: 40 }),
    };
  }
  if (kind === "tshirt" || kind === "oversized") {
    return {
      ...base,
      templateVersion: 1,
      printType: "flat",
      shape: "rectangle",
      physical: kind === "oversized"
        ? { width: 11.7, height: 16.5, unit: "in", dpi: 300 }
        : { width: 8.27, height: 11.69, unit: "in", dpi: 300 },
      views: defaultViews("flat", "", { xPct: 30, yPct: 22, widthPct: 40, heightPct: 52 }),
    };
  }
  if (kind === "heart") {
    return {
      ...base,
      templateVersion: 1,
      printType: "shaped",
      shape: "heart",
      physical: { width: 10, height: 10, unit: "in", dpi: 300 },
      views: defaultViews("shaped", "", { xPct: 18, yPct: 18, widthPct: 64, heightPct: 64 }),
    };
  }
  return {
    ...base,
    templateVersion: 1,
    printType: "flat",
    shape: "square",
    physical: { width: 12, height: 12, unit: "in", dpi: 300 },
    views: defaultViews("flat", "", { xPct: 20, yPct: 20, widthPct: 60, heightPct: 60 }),
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/categories")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setCategories(data.categories ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error ?? "Could not delete category.");
    toast.success("Category deleted.");
    void load();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Categories &amp; Print Templates</h1>
          <p className="mt-1 text-sm text-navy/60">
            Configure reusable print behaviour once, then apply it to products without code changes.
          </p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy-dark">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-navy/50">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Print Template</th>
              <th className="px-5 py-3">Sort</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center"><Loader2 size={18} className="inline animate-spin text-navy/40" /></td></tr>
            ) : categories.map((category) => {
              const template = category.printTemplate ? normalizePrintTemplate(category.printTemplate) : null;
              return (
                <tr key={category.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-navy">{category.name}</td>
                  <td className="px-5 py-3 text-navy/60">{category.slug}</td>
                  <td className="px-5 py-3">
                    {template ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-navy">
                        <Sparkles size={12} className="text-gold" />
                        {template.printType} · {template.physical.width}×{template.physical.height} {template.physical.unit} · {template.physical.dpi} DPI
                      </span>
                    ) : <span className="text-xs text-navy/40">No template</span>}
                  </td>
                  <td className="px-5 py-3 text-navy/60">{category.sortOrder}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setEditing(category)} className="text-navy/50 hover:text-gold"><Pencil size={15} /></button>
                      <button type="button" onClick={() => void remove(category.id)} className="text-navy/50 hover:text-red"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
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
  const [enabled, setEnabled] = useState(Boolean(category?.printTemplate));
  const [template, setTemplate] = useState<PrintTemplate>(
    normalizePrintTemplate(category?.printTemplate ?? preset("mug"))
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Name is required.");
    setSaving(true);
    try {
      const printTemplate = enabled
        ? {
            ...template,
            templateVersion: category?.printTemplate
              ? Math.max(1, normalizePrintTemplate(category.printTemplate).templateVersion) + 1
              : Math.max(1, template.templateVersion),
          }
        : null;

      const response = await fetch(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sortOrder, printTemplate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save category.");
      toast.success("Category saved.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">{category ? "Edit Category" : "Add Category"}</h2>
          <button type="button" onClick={onClose} className="text-navy/40 hover:text-navy"><X size={18} /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-navy/60">
            Category Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm normal-case text-navy outline-none focus:border-gold" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-navy/60">
            Sort Order
            <input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value) || 0)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm normal-case text-navy outline-none focus:border-gold" />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-navy/60">
            Description
            <textarea value={description ?? ""} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm normal-case text-navy outline-none focus:border-gold" />
          </label>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <label className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-navy">
            <span>
              Enable reusable print template
              <span className="block text-xs font-normal text-navy/50">Products can inherit this template and optionally override it.</span>
            </span>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-gold" />
          </label>

          {enabled && (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {([
                  ["mug", "Mug"],
                  ["bottle", "Bottle"],
                  ["tshirt", "T-Shirt A4"],
                  ["oversized", "Oversized A3"],
                  ["cushion", "Square Cushion"],
                  ["heart", "Heart Cushion"],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setTemplate(preset(key))} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-gold">
                    {label}
                  </button>
                ))}
              </div>
              <PrintTemplateEditor value={template} onChange={setTemplate} />
            </>
          )}
        </div>

        <button type="button" onClick={() => void save()} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 size={15} className="animate-spin" />} Save Category
        </button>
      </div>
    </div>
  );
}
