"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { MockupView, PercentBox, PrintTemplate } from "@/db/schema";
import { defaultViews, normalizePrintTemplate } from "@/lib/print-template";
import { uploadFile } from "@/lib/client-upload";

type DragState = {
  mode: "move" | "resize";
  startX: number;
  startY: number;
  box: PercentBox;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PrintTemplateEditor({
  value,
  onChange,
}: {
  value: PrintTemplate;
  onChange: (template: PrintTemplate) => void;
}) {
  const template = normalizePrintTemplate(value);
  const [selectedViewId, setSelectedViewId] = useState(template.views[0]?.id ?? "front");
  const [uploading, setUploading] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const selectedView = template.views.find((view) => view.id === selectedViewId) ?? template.views[0];

  useEffect(() => {
    if (!template.views.some((view) => view.id === selectedViewId)) {
      setSelectedViewId(template.views[0]?.id ?? "front");
    }
  }, [selectedViewId, template.views]);

  function patch(patch: Partial<PrintTemplate>) {
    onChange({ ...template, ...patch });
  }

  function updateView(id: string, patchValue: Partial<MockupView>) {
    patch({
      views: template.views.map((view) => (view.id === id ? { ...view, ...patchValue } : view)),
    });
  }

  function setPrintType(printType: PrintTemplate["printType"]) {
    const first = template.views[0];
    const views =
      printType === "cylindrical"
        ? defaultViews(printType, first?.mockupUrl ?? "", first?.printArea)
        : [first ?? defaultViews(printType)[0]];
    patch({ printType, views });
    setSelectedViewId(views[0].id);
  }

  async function uploadMockup(file: File, viewId: string) {
    setUploading(viewId);
    try {
      const url = await uploadFile(file, "mockups");
      updateView(viewId, { mockupUrl: url });
      toast.success("Mockup uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mockup upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function uploadMask(file: File) {
    setUploading("mask");
    try {
      const url = await uploadFile(file, "mockups");
      patch({ maskUrl: url, shape: "custom-mask", printType: "shaped" });
      toast.success("Mask uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mask upload failed.");
    } finally {
      setUploading(null);
    }
  }

  function addView() {
    const id = `view-${template.views.length + 1}`;
    const next: MockupView = {
      id,
      name: `View ${template.views.length + 1}`,
      mockupUrl: selectedView?.mockupUrl ?? "",
      printArea: selectedView?.printArea ?? { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
      source: { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 },
    };
    patch({ views: [...template.views, next] });
    setSelectedViewId(id);
  }

  function removeView(id: string) {
    if (template.views.length <= 1) return;
    const next = template.views.filter((view) => view.id !== id);
    patch({ views: next });
    setSelectedViewId(next[0].id);
  }

  function beginDrag(event: React.PointerEvent, mode: DragState["mode"]) {
    if (!selectedView) return;
    event.preventDefault();
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      box: { ...selectedView.printArea },
    };
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", endDrag, { once: true });
  }

  function onDrag(event: PointerEvent) {
    const preview = previewRef.current;
    const drag = dragRef.current;
    if (!preview || !drag || !selectedView) return;
    const rect = preview.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;

    if (drag.mode === "move") {
      updateView(selectedView.id, {
        printArea: {
          ...drag.box,
          xPct: clamp(drag.box.xPct + dx, 0, 100 - drag.box.widthPct),
          yPct: clamp(drag.box.yPct + dy, 0, 100 - drag.box.heightPct),
        },
      });
    } else {
      updateView(selectedView.id, {
        printArea: {
          ...drag.box,
          widthPct: clamp(drag.box.widthPct + dx, 5, 100 - drag.box.xPct),
          heightPct: clamp(drag.box.heightPct + dy, 5, 100 - drag.box.yPct),
        },
      });
    }
  }

  function endDrag() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDrag);
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-offwhite p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-navy/60">
          Print Type
          <select value={template.printType} onChange={(event) => setPrintType(event.target.value as PrintTemplate["printType"])} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy">
            <option value="flat">Flat</option>
            <option value="cylindrical">Cylindrical / Wrap</option>
            <option value="shaped">Shaped</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-navy/60">
          Shape
          <select value={template.shape} onChange={(event) => patch({ shape: event.target.value as PrintTemplate["shape"] })} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy">
            <option value="rectangle">Rectangle</option>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
            <option value="heart">Heart</option>
            <option value="custom-mask">Custom Mask</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-navy/60">
          DPI / PPI
          <input type="number" min={72} max={600} value={template.physical.dpi} onChange={(event) => patch({ physical: { ...template.physical, dpi: clamp(safeNumber(event.target.value, 300), 72, 600) } })} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-navy/60">
          Print Width
          <input type="number" step="0.1" min="0.1" value={template.physical.width} onChange={(event) => patch({ physical: { ...template.physical, width: Math.max(0.1, safeNumber(event.target.value, template.physical.width)) } })} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy" />
        </label>
        <label className="text-xs font-semibold text-navy/60">
          Print Height
          <input type="number" step="0.1" min="0.1" value={template.physical.height} onChange={(event) => patch({ physical: { ...template.physical, height: Math.max(0.1, safeNumber(event.target.value, template.physical.height)) } })} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy" />
        </label>
        <label className="text-xs font-semibold text-navy/60">
          Unit
          <select value={template.physical.unit} onChange={(event) => patch({ physical: { ...template.physical, unit: event.target.value as "in" | "cm" } })} className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-navy">
            <option value="in">Inches</option>
            <option value="cm">Centimetres</option>
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy/60">Safe Margins (%)</p>
        <div className="grid grid-cols-4 gap-2">
          {(["topPct", "rightPct", "bottomPct", "leftPct"] as const).map((key) => (
            <label key={key} className="text-[10px] text-navy/50">
              {key.replace("Pct", "")}
              <input type="number" min={0} max={40} value={template.safeArea[key]} onChange={(event) => patch({ safeArea: { ...template.safeArea, [key]: clamp(safeNumber(event.target.value, 0), 0, 40) } })} className="mt-1 w-full rounded border border-border bg-white px-2 py-1.5 text-xs text-navy" />
            </label>
          ))}
        </div>
      </div>

      {(template.shape === "heart" || template.shape === "custom-mask") && (
        <div>
          <p className="mb-1 text-xs font-semibold text-navy/60">Shape Mask</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy">
              {uploading === "mask" ? <Loader2 size={13} className="inline animate-spin" /> : <Upload size={13} className="inline" />} Upload Mask
              <input type="file" accept="image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadMask(event.target.files[0])} />
            </label>
            {template.maskUrl && <span className="max-w-xs truncate text-[11px] text-navy/50">{template.maskUrl}</span>}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {template.views.map((view) => (
              <button key={view.id} type="button" onClick={() => setSelectedViewId(view.id)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${view.id === selectedView?.id ? "border-navy bg-navy text-white" : "border-border bg-white text-navy"}`}>
                {view.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={addView} className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-navy"><Plus size={12} className="inline" /> View</button>
        </div>

        {selectedView && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={selectedView.name} onChange={(event) => updateView(selectedView.id, { name: event.target.value })} className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy" />
              <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-navy">
                {uploading === selectedView.id ? <Loader2 size={13} className="inline animate-spin" /> : <Upload size={13} className="inline" />} Mockup
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadMockup(event.target.files[0], selectedView.id)} />
              </label>
              {template.views.length > 1 && <button type="button" onClick={() => removeView(selectedView.id)} className="rounded-lg border border-red/20 bg-white px-3 py-2 text-xs font-semibold text-red"><Trash2 size={13} /></button>}
            </div>

            <div ref={previewRef} className="relative mx-auto aspect-square w-full max-w-[420px] touch-none overflow-hidden rounded-xl border border-border bg-white">
              {selectedView.mockupUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedView.mockupUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-navy/40">Upload a blank mockup</div>
              )}
              <div
                onPointerDown={(event) => beginDrag(event, "move")}
                className="absolute cursor-move border-2 border-dashed border-gold bg-gold/10"
                style={{
                  left: `${selectedView.printArea.xPct}%`,
                  top: `${selectedView.printArea.yPct}%`,
                  width: `${selectedView.printArea.widthPct}%`,
                  height: `${selectedView.printArea.heightPct}%`,
                }}
              >
                <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-navy">PRINT AREA</span>
                <button type="button" aria-label="Resize print area" onPointerDown={(event) => { event.stopPropagation(); beginDrag(event, "resize"); }} className="absolute -bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-full border-2 border-white bg-gold shadow" />
              </div>
            </div>

            {template.printType === "cylindrical" && (
              <div>
                <p className="mb-2 text-xs font-semibold text-navy/60">Source wrap section for this view (%)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(["xPct", "yPct", "widthPct", "heightPct"] as const).map((key) => (
                    <label key={key} className="text-[10px] text-navy/50">
                      {key.replace("Pct", "")}
                      <input type="number" min={0} max={100} step="0.1" value={selectedView.source[key]} onChange={(event) => updateView(selectedView.id, { source: { ...selectedView.source, [key]: clamp(safeNumber(event.target.value, selectedView.source[key]), 0, 100) } })} className="mt-1 w-full rounded border border-border bg-white px-2 py-1.5 text-xs text-navy" />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
