"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Loader2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  startingPrice: string;
  isActive: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  customizable: boolean;
  categoryId: string;
  categoryName: string | null;
  stock: number;
};

type Category = { id: string; name: string; slug: string };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);

  async function load() {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/categories")]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    setProducts(pData.products ?? []);
    setCategories(cData.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))));
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Deleted ${data.deleted} product(s)`);
    setSelected(new Set());
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-navy">Products</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 border border-border text-navy font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-offwhite"
          >
            <Upload size={15} /> Bulk Import CSV
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-lg hover:brightness-110"
          >
            <Plus size={16} /> Add Product
          </Link>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-4 bg-navy text-white rounded-xl px-5 py-3 mb-4">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <button onClick={() => setShowBulkEdit(true)} className="text-sm underline hover:no-underline">
            Bulk Edit
          </button>
          <button onClick={handleBulkDelete} className="text-sm underline hover:no-underline text-red-300">
            Bulk Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-white/60 hover:text-white">
            Clear selection
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy/50 uppercase tracking-wide">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selected.size === products.length}
                  onChange={toggleSelectAll}
                  className="accent-gold"
                />
              </th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-navy/40">
                  <Loader2 className="animate-spin inline" size={18} />
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-offwhite">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-gold"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-lg bg-offwhite overflow-hidden shrink-0">
                        <Image src={p.images?.[0] || "/images/products/placeholder.png"} alt={p.name} fill className="object-contain p-1" />
                      </div>
                      <span className="font-medium text-navy">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-navy/60">{p.categoryName}</td>
                  <td className="px-3 py-3 text-navy/60">{formatINR(p.startingPrice)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        p.isActive ? "bg-teal/10 text-teal" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-navy/50 hover:text-gold">
                        <Pencil size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-navy/40">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showBulkEdit && (
        <BulkEditModal
          categories={categories}
          ids={Array.from(selected)}
          onClose={() => setShowBulkEdit(false)}
          onSaved={() => {
            setShowBulkEdit(false);
            setSelected(new Set());
            load();
          }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function BulkEditModal({
  categories,
  ids,
  onClose,
  onSaved,
}: {
  categories: Category[];
  ids: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [customizable, setCustomizable] = useState<"" | "true" | "false">("");
  const [pricePercent, setPricePercent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (categoryId) updates.categoryId = categoryId;
    if (isActive) updates.isActive = isActive === "true";
    if (customizable) updates.customizable = customizable === "true";
    if (pricePercent) updates.pricePercent = parseFloat(pricePercent);

    const res = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", ids, updates }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Updated ${data.updated} product(s)`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-navy">Bulk Edit ({ids.length} products)</h2>
          <button onClick={onClose} className="text-navy/40 hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-navy/50 mb-4">Leave a field blank to leave it unchanged for all selected products.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Move to Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            >
              <option value="">— No change —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Active Status</label>
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value as "" | "true" | "false")}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            >
              <option value="">— No change —</option>
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Customizable</label>
            <select
              value={customizable}
              onChange={(e) => setCustomizable(e.target.value as "" | "true" | "false")}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            >
              <option value="">— No change —</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
              Adjust Starting Price (%)
            </label>
            <input
              type="number"
              placeholder="e.g. 10 for +10%, -5 for -5%"
              value={pricePercent}
              onChange={(e) => setPricePercent(e.target.value)}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Apply to {ids.length} products
        </button>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function handleImport() {
    if (!csv.trim()) {
      toast.error("Choose a CSV file or paste CSV content first");
      return;
    }
    setImporting(true);
    const res = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", csv }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setResult({ created: data.created, errors: data.errors ?? [] });
    toast.success(`Imported ${data.created} product(s)`);
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-navy">Bulk Import Products (CSV)</h2>
          <button onClick={onClose} className="text-navy/40 hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-navy/60 mb-4 leading-relaxed">
          CSV columns: <code className="bg-offwhite px-1 rounded">name, category, startingPrice,
          shortDescription, description, image, customizable, isActive</code>
          <br />
          <code className="bg-offwhite px-1 rounded">category</code> must match an existing category name or slug exactly.
        </p>
        <input type="file" accept=".csv" onChange={handleFile} className="text-sm mb-3" />
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder="...or paste CSV content here"
          className="w-full text-xs font-mono border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
        />

        {result && (
          <div className="mt-4 bg-offwhite rounded-lg p-3 text-xs">
            <p className="font-semibold text-teal mb-1">✓ {result.created} product(s) created</p>
            {result.errors.length > 0 && (
              <ul className="text-red space-y-0.5 mt-1">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full mt-4 bg-gold text-navy-dark font-semibold py-2.5 rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {importing && <Loader2 size={15} className="animate-spin" />}
          Import
        </button>
      </div>
    </div>
  );
}
