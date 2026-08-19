"use client";

import { useState } from "react";
import { MessageCircle, MapPin, Loader2 } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (!res.ok) {
      toast.error("Something went wrong — please try again or WhatsApp us.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="container-page py-10 md:py-16 max-w-4xl">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Get In Touch</p>
      <h1 className="font-display text-3xl font-semibold text-navy mb-10">Contact Us</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-5">
          <a href="https://wa.me/918923032312" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-offwhite border border-border rounded-2xl p-5 hover:border-gold transition">
            <div className="h-11 w-11 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-xs text-navy/50 uppercase tracking-wide">WhatsApp</p>
              <p className="font-semibold text-navy">89230 32312</p>
            </div>
          </a>
          <a href="https://instagram.com/thenoveltyprints" target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-offwhite border border-border rounded-2xl p-5 hover:border-gold transition">
            <div className="h-11 w-11 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
              <InstagramIcon size={18} />
            </div>
            <div>
              <p className="text-xs text-navy/50 uppercase tracking-wide">Instagram</p>
              <p className="font-semibold text-navy">@thenoveltyprints</p>
            </div>
          </a>
          <div className="flex items-center gap-4 bg-offwhite border border-border rounded-2xl p-5">
            <div className="h-11 w-11 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-xs text-navy/50 uppercase tracking-wide">Location</p>
              <p className="font-semibold text-navy">Greater Noida West · Pan India Delivery</p>
            </div>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="bg-offwhite border border-border rounded-2xl p-6 text-center">
              <p className="text-teal font-semibold">Message sent — we&apos;ll get back to you soon!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Your Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
              <input required type="email" placeholder="Your Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
              <textarea required rows={5} placeholder="Your Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none" />
              <button type="submit" disabled={sending} className="bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy-dark transition flex items-center gap-2 disabled:opacity-60">
                {sending && <Loader2 size={15} className="animate-spin" />}
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
