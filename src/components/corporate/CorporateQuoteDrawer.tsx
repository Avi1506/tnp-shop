"use client";

import { useState, useEffect } from "react";
import { X, Upload, CheckCircle2, MessageCircle, Loader2, Building2, Calendar, FileText, Send } from "lucide-react";
import toast from "react-hot-toast";
import { trackEvent } from "@/lib/analytics";

export const CORPORATE_CATEGORIES = [
  "Return Gifts",
  "Employee Kits",
  "Festival Hampers",
  "Logo Merchandise",
  "Event Giveaways",
  "Gift Combos",
] as const;

export const QUANTITY_TIERS = [
  { id: "25-50", label: "25 – 50 units", discount: "15% Off" },
  { id: "51-200", label: "51 – 200 units", discount: "20% Off" },
  { id: "201-500", label: "201 – 500 units", discount: "30% Off" },
  { id: "500+", label: "500+ units", discount: "Custom Enterprise Pricing" },
] as const;

export default function CorporateQuoteDrawer({
  isOpen,
  onClose,
  initialCategory,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}) {
  const [category, setCategory] = useState<string>(initialCategory || CORPORATE_CATEGORIES[0]);
  const [quantityTier, setQuantityTier] = useState<string>("51-200");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Minimum lead time: 4 days from today
  const minDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "corporate-logos");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setFileUrl(data.url);
      setFileName(file.name);
      toast.success("Logo attached successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone || !company) {
      toast.error("Please fill in all required contact fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          phone,
          productRequired: category,
          quantity: quantityTier,
          deliveryDate,
          message: notes,
          fileUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit quote request");

      trackEvent("b2b_lead_form_submitted", {
        category,
        quantityTier,
        company,
      });

      setSubmitted(true);
      toast.success("Quote request submitted successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Pre-filled WhatsApp message for fallback
  const whatsappText = encodeURIComponent(
    `Hello The Novelty Prints Team,\n\nI just submitted a corporate enquiry for:\n• Category: ${category}\n• Quantity: ${quantityTier} units\n• Target Date: ${deliveryDate || "Flexible"}\n• Company: ${company}\n• Contact: ${name} (${phone})\n\nLooking forward to your quote!`
  );
  const whatsappUrl = `https://wa.me/918923032312?text=${whatsappText}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-navy-dark/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-navy">Get a Custom B2B Quote</h2>
              <p className="text-xs text-navy/60">Bulk discounts, custom mockup &amp; priority production</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-navy/60 hover:text-navy hover:bg-offwhite transition touch-target-48"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex-1">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal/15 text-teal flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="font-display text-2xl font-bold text-navy">Quote Request Received!</h3>
              <p className="text-sm text-navy/70 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{name}</strong>. Our enterprise team is reviewing your requirements for{" "}
                <strong>{company}</strong> and will email you a tailored quote within 2–4 hours.
              </p>

              <div className="pt-6 border-t border-border space-y-3">
                <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  Need an urgent quotation or immediate sample?
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("primary_cta_clicked", { label: "whatsapp_b2b_fallback" })}
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm px-6 py-3.5 rounded-full hover:brightness-105 shadow-sm transition touch-target-48"
                >
                  <MessageCircle size={18} />
                  <span>Connect Instantly on WhatsApp</span>
                </a>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="text-xs text-navy/60 hover:text-navy underline"
                >
                  Close this drawer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Field 1: Target Product Category */}
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wide block mb-1.5">
                  1. Target Product Category <span className="text-red">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm border control-border rounded-xl px-3.5 py-3 outline-none focus:border-gold bg-white text-navy font-medium"
                >
                  {CORPORATE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Estimated Quantity Tier Radio Buttons */}
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wide block mb-2">
                  2. Estimated Quantity Tier <span className="text-red">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {QUANTITY_TIERS.map((tier) => {
                    const isSelected = quantityTier === tier.id;
                    return (
                      <label
                        key={tier.id}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between swatch-touch ${
                          isSelected
                            ? "border-gold bg-gold/5 ring-1 ring-gold"
                            : "border-border hover:border-gold/40 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="quantityTier"
                              value={tier.id}
                              checked={isSelected}
                              onChange={() => setQuantityTier(tier.id)}
                              className="accent-gold"
                            />
                            {tier.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-teal">{tier.discount}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Field 3: Delivery Date Picker */}
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wide block mb-1.5 flex items-center justify-between">
                  <span>3. Desired Delivery Date</span>
                  <span className="text-[11px] font-normal text-navy/50">Minimum 4 days lead time</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={minDeliveryDate}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-sm border control-border rounded-xl px-3.5 py-3 outline-none focus:border-gold bg-white text-navy"
                  />
                </div>
              </div>

              {/* Field 4: Logo / Artwork Upload Input */}
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wide block mb-1.5 flex items-center justify-between">
                  <span>4. Company Logo / Artwork (Optional)</span>
                  <span className="text-[11px] font-normal text-navy/50">.AI, .EPS, .SVG, .PDF, .PNG</span>
                </label>
                <div className="border-2 border-dashed control-border rounded-xl p-4 text-center hover:bg-offwhite transition relative">
                  <input
                    type="file"
                    accept=".ai,.eps,.svg,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gold py-1">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Uploading artwork...</span>
                    </div>
                  ) : fileName ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-teal font-medium py-1">
                      <CheckCircle2 size={16} />
                      <span className="truncate max-w-xs">{fileName}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-navy/60">
                      <Upload size={20} className="text-gold" />
                      <span className="text-xs font-semibold text-navy">Click or Drag &amp; Drop Logo / Design</span>
                      <span className="text-[10px] text-navy/40">Vector or high-res image for mockup generation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 5: Contact Details */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="text-xs font-bold text-navy uppercase tracking-wide block">
                  5. Contact &amp; Company Details <span className="text-red">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="Your Full Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-2 sm:col-span-1 text-sm border control-border rounded-xl px-3.5 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    required
                    placeholder="Company / Org Name *"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="col-span-2 sm:col-span-1 text-sm border control-border rounded-xl px-3.5 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Official Email Address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-2 sm:col-span-1 text-sm border control-border rounded-xl px-3.5 py-2.5 outline-none focus:border-gold"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Mobile / WhatsApp Number *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="col-span-2 sm:col-span-1 text-sm border control-border rounded-xl px-3.5 py-2.5 outline-none focus:border-gold"
                  />
                  <textarea
                    rows={2}
                    placeholder="Additional instructions or questions (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="col-span-2 text-sm border control-border rounded-xl px-3.5 py-2 outline-none focus:border-gold resize-none"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  onClick={() => trackEvent("primary_cta_clicked", { label: "submit_b2b_quote_drawer" })}
                  className="w-full btn-primary-cta font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition disabled:opacity-50 touch-target-48 btn-cta-mobile"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  <span>{submitting ? "Submitting Quote Request..." : "Request Official B2B Quote"}</span>
                  <Send size={16} />
                </button>
                <p className="text-[11px] text-center text-navy/50 mt-2">
                  100% free consultation. No obligation to purchase.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
