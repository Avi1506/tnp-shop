"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
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
        <h1 className="text-2xl font-semibold text-navy">Categories</h1>
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
              <th className="px-5 py-3">Sort Order</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-navy/40">
                  <Loader2 className="animate-spin inline" size={18} />
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-offwhite">
                  <td className="px-5 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-5 py-3 text-navy/60">{c.slug}</td>
                  <td className="px-5 py-3 text-navy/60">{c.sortOrder}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(c)} className="text-navy/50 hover:text-gold">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-navy/50 hover:text-red">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-navy/40">
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
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const url = category ? `/api/admin/categories/${category.id}` : "/api/admin/categories";
    const method = category ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, sortOrder }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save");
      return;
    }
    toast.success("Saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-navy">{category ? "Edit Category" : "Add Category"}</h2>
          <button onClick={onClose} className="text-navy/40 hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Description</label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
            />
          </div>
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
